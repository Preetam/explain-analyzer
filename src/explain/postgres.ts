import type { NormalizedTable, Scalability } from "./types";

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
  Plans?: PostgresPlanNode[];
}

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

function fromNode(node: PostgresPlanNode): NormalizedTable | null {
  const relation = node["Relation Name"];
  if (!relation) {
    return null;
  }

  const accessType = node["Node Type"] ?? "?";
  const hasIndexCond = !!node["Index Cond"];

  return annotate(
    {
      name: relation,
      accessType,
      rows: rowsFor(node),
      key: node["Index Name"] ?? null,
      possibleKeys: null,
      keyLength: null,
      ref: null,
      filtered: null,
      scalability: scalabilityFor(accessType, hasIndexCond),
      fullTableScan: false,
      fullIndexScan: false,
      comment: "",
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

function rootPlans(data: unknown): PostgresPlanNode[] {
  if (Array.isArray(data)) {
    return data.flatMap((entry) => {
      if (entry && typeof entry === "object" && "Plan" in entry) {
        return [(entry as { Plan: PostgresPlanNode }).Plan];
      }
      return [];
    });
  }
  if (data && typeof data === "object" && "Plan" in data) {
    return [(data as { Plan: PostgresPlanNode }).Plan];
  }
  return [];
}

export function parsePostgres(data: unknown): NormalizedTable[] {
  const tables: NormalizedTable[] = [];
  for (const plan of rootPlans(data)) {
    walk(plan, tables);
  }
  return tables;
}

export function isPostgresExplain(data: unknown): boolean {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    return !!first && typeof first === "object" && "Plan" in first;
  }
  return !!data && typeof data === "object" && "Plan" in data;
}
