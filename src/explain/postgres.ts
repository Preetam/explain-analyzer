import { tableFindings, formatters } from "./findings";
import type { Finding, NormalizedTable, Scalability } from "./types";

interface PostgresPlanNode {
  "Node Type"?: string;
  "Relation Name"?: string;
  Alias?: string;
  "Index Name"?: string;
  "Index Cond"?: string;
  Filter?: string;
  "Plan Rows"?: number;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Actual Startup Time"?: number;
  "Actual Total Time"?: number;
  "Join Type"?: string;
  "Parent Relationship"?: string;
  "Merge Cond"?: string;
  "Hash Cond"?: string;
  "Sort Key"?: string[];
  "Workers Planned"?: number;
  "Workers Launched"?: number;
  "Rows Removed by Filter"?: number;
  "Rows Removed by Index Recheck"?: number;
  Plans?: PostgresPlanNode[];
}

interface PostgresExplainEntry {
  Plan?: PostgresPlanNode;
  "Planning Time"?: number;
  "Execution Time"?: number;
}

const { formatMs, formatRows } = formatters;

const LARGE_SORT_ROWS = 100_000;

// Matches a function call like lower(...) or split_part(...), as opposed to
// plain parenthesized column references.
const FUNCTION_CALL = /[a-z_]+\(/i;

function scalabilityFor(nodeType: string, hasIndexCond: boolean): Scalability {
  switch (nodeType) {
    case "Seq Scan":
      return "n";
    case "Index Scan":
    case "Index Only Scan":
      return hasIndexCond ? "log n" : "n";
    case "Bitmap Heap Scan":
    case "Bitmap Index Scan":
      return "log n";
    case "Tid Scan":
    case "Result":
      return "1";
    default:
      return "?";
  }
}

function annotate(table: NormalizedTable, node: PostgresPlanNode): NormalizedTable {
  const t = { ...table };
  const nodeType = node["Node Type"] ?? "";

  switch (nodeType) {
    case "Seq Scan":
      t.fullTableScan = true;
      t.comment = "PostgreSQL is reading all rows from this table (sequential scan).";
      break;
    case "Index Scan":
      if (node["Index Cond"]) {
        t.comment = "Matching rows are accessed via an index scan.";
      } else {
        t.fullIndexScan = true;
        t.comment = "PostgreSQL is scanning an entire index.";
      }
      break;
    case "Index Only Scan":
      if (node["Index Cond"]) {
        t.comment =
          "Matching rows are answered from the index alone (index-only scan).";
      } else {
        t.fullIndexScan = true;
        t.comment = "PostgreSQL is scanning an entire index (index-only scan).";
      }
      break;
    case "Bitmap Heap Scan":
      t.comment =
        "Rows are fetched from the heap using a bitmap built from index scans.";
      break;
    case "Bitmap Index Scan":
      t.comment = "An index is scanned to build a bitmap of matching rows.";
      break;
    case "Tid Scan":
      t.comment = "Rows are fetched directly by tuple ID.";
      break;
  }

  if (t.key) {
    t.comment += ` Using index '${t.key}'.`;
  }
  if (node.Filter) {
    t.comment += " A filter is applied after the scan.";
  }
  if (typeof node["Actual Total Time"] === "number") {
    t.comment += ` Actual time ${formatMs(node["Actual Total Time"])}.`;
  }

  t.comment = t.comment.trim();
  return t;
}

function rowsFor(node: PostgresPlanNode): number {
  if (typeof node["Actual Rows"] === "number") {
    const loops = node["Actual Loops"] ?? 1;
    return Math.round(node["Actual Rows"] * loops);
  }
  return node["Plan Rows"] ?? 0;
}

// A Bitmap Heap Scan's index lives on its child Bitmap Index Scan node(s)
// (possibly under BitmapAnd/BitmapOr), so collect them from the subtree.
function childIndexNames(node: PostgresPlanNode): string[] {
  const names: string[] = [];
  for (const child of node.Plans ?? []) {
    if (child["Node Type"] === "Bitmap Index Scan" && child["Index Name"]) {
      names.push(child["Index Name"]);
    }
    names.push(...childIndexNames(child));
  }
  return names;
}

function fromNode(node: PostgresPlanNode): NormalizedTable | null {
  const relation = node["Relation Name"];
  if (!relation) {
    return null;
  }

  const accessType = node["Node Type"] ?? "?";
  const hasIndexCond = !!node["Index Cond"];

  let key = node["Index Name"] ?? null;
  if (!key && accessType === "Bitmap Heap Scan") {
    const names = childIndexNames(node);
    key = names.length > 0 ? names.join(", ") : null;
  }

  return annotate(
    {
      name: relation,
      accessType,
      rows: rowsFor(node),
      key,
      possibleKeys: null,
      keyLength: null,
      ref: null,
      filtered: null,
      scalability: scalabilityFor(accessType, hasIndexCond),
      fullTableScan: false,
      fullIndexScan: false,
      comment: "",
      actualTimeMs:
        typeof node["Actual Total Time"] === "number"
          ? node["Actual Total Time"]
          : null,
      rowsRemovedByFilter:
        typeof node["Rows Removed by Filter"] === "number"
          ? node["Rows Removed by Filter"]
          : null,
    },
    node
  );
}

function walk(node: PostgresPlanNode, out: NormalizedTable[]) {
  const table = fromNode(node);
  if (table) {
    out.push(table);
  }
  for (const child of node.Plans ?? []) {
    walk(child, out);
  }
}

function collectPlanFindings(node: PostgresPlanNode, out: Finding[]) {
  const nodeType = node["Node Type"] ?? "";
  const rows = rowsFor(node);
  const actualTime = node["Actual Total Time"];

  switch (nodeType) {
    case "Sort": {
      if (rows >= LARGE_SORT_ROWS) {
        const keys = node["Sort Key"]?.join(", ");
        out.push({
          severity: "warning",
          title: `Large sort of ~${formatRows(rows)} rows`,
          detail:
            `A sort of ~${formatRows(rows)} rows${
              keys ? ` on (${keys})` : ""
            }. ` +
            "Large sorts can spill to disk. An index matching the sort key, or a smaller pre-filtered input, can avoid it.",
        });
      }
      break;
    }
    case "Merge Join": {
      const cond = node["Merge Cond"] ?? "";
      if (FUNCTION_CALL.test(cond)) {
        out.push({
          severity: "warning",
          title: "Merge join on computed expressions",
          detail:
            `A merge join on computed expressions (${cond}). ` +
            "Both inputs must be sorted on the expression; an expression index could avoid these sorts.",
        });
      }
      break;
    }
    case "Hash Join": {
      const cond = node["Hash Cond"] ?? "";
      if (FUNCTION_CALL.test(cond)) {
        out.push({
          severity: "info",
          title: "Hash join on computed expressions",
          detail:
            `A hash join on computed expressions (${cond}). ` +
            "The expression is evaluated for every row — a generated column or expression index could make it a plain column comparison.",
        });
      }
      break;
    }
    case "Gather":
    case "Gather Merge": {
      const workers = node["Workers Launched"] ?? node["Workers Planned"];
      if (workers) {
        out.push({
          severity: "info",
          title: `Parallel query with ${workers} worker${workers === 1 ? "" : "s"}`,
          detail:
            `The query runs in parallel with ${workers} worker${
              workers === 1 ? "" : "s"
            }. ` +
            "Parallelism can hide serial bottlenecks; check whether the outer node is doing most of the work.",
        });
      }
      break;
    }
    case "Nested Loop": {
      const inner = (node.Plans ?? []).find(
        (p) => p["Parent Relationship"] === "Inner"
      );
      if (inner && inner["Node Type"] === "Seq Scan") {
        out.push({
          severity: "warning",
          title: `Nested loop with inner sequential scan on \`${inner["Relation Name"] ?? "?"}\``,
          detail:
            `A nested loop repeatedly runs a sequential scan on \`${inner["Relation Name"] ?? "?"}\`. ` +
            "This multiplies the scan cost by the outer row count. An index on the inner table's join column usually turns this into cheap lookups.",
          table: inner["Relation Name"],
        });
      }
      break;
    }
  }

  // Keep the slow-selective-lookup and wasteful-filter checks on scan nodes
  // consistent with the shared tableFindings() output, but only emit them here
  // if they wouldn't already be emitted via tableFindings() to avoid dupes.
  // (tableFindings covers scan nodes; plan-level findings cover non-scan nodes.)
  void actualTime;

  for (const child of node.Plans ?? []) {
    collectPlanFindings(child, out);
  }
}

function explainEntries(data: unknown): PostgresExplainEntry[] {
  if (Array.isArray(data)) {
    return data.filter(
      (entry): entry is PostgresExplainEntry =>
        !!entry && typeof entry === "object"
    );
  }
  if (data && typeof data === "object") {
    return [data as PostgresExplainEntry];
  }
  return [];
}

function rootPlans(data: unknown): PostgresPlanNode[] {
  return explainEntries(data).flatMap((entry) =>
    entry.Plan ? [entry.Plan] : []
  );
}

export function parsePostgres(data: unknown): NormalizedTable[] {
  const tables: NormalizedTable[] = [];
  for (const plan of rootPlans(data)) {
    walk(plan, tables);
  }
  return tables;
}

export function postgresFindings(data: unknown): Finding[] {
  const findings: Finding[] = [];

  const entries = explainEntries(data);
  for (const entry of entries) {
    if (typeof entry["Execution Time"] === "number") {
      findings.push({
        severity: "info",
        title: `EXPLAIN ANALYZE: ${formatMs(entry["Execution Time"])} total`,
        detail: `EXPLAIN ANALYZE reported ${formatMs(
          entry["Execution Time"]
        )} total execution time.`,
      });
    }
    if (entry.Plan) {
      collectPlanFindings(entry.Plan, findings);
    }
  }

  // Scan-level findings (full scans, slow lookups, wasteful filters).
  const tables: NormalizedTable[] = [];
  for (const plan of rootPlans(data)) {
    walk(plan, tables);
  }
  for (const t of tables) {
    findings.push(...tableFindings(t));
  }

  return findings;
}

export function isPostgresExplain(data: unknown): boolean {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    return !!first && typeof first === "object" && "Plan" in first;
  }
  return !!data && typeof data === "object" && "Plan" in data;
}
