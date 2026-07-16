import type { NormalizedTable, Scalability } from "./types";

interface MysqlTableNode {
  table_name?: string;
  access_type?: string;
  rows_examined_per_scan?: number;
  rows?: number;
  key?: string | null;
  possible_keys?: string[] | null;
  key_length?: string | number | null;
  ref?: string[] | null;
  filtered?: string | number | null;
}

function scalabilityFor(accessType: string): Scalability {
  switch (accessType) {
    case "ALL":
    case "index":
      return "n";
    case "ref":
    case "eq_ref":
    case "range":
      return "log n";
    case "const":
    case "system":
      return "1";
    default:
      return "?";
  }
}

function annotate(table: NormalizedTable): NormalizedTable {
  const t = { ...table };

  switch (t.accessType) {
    case "ALL":
      t.fullTableScan = true;
      break;
    case "index":
      if (t.key === "PRIMARY") {
        // Full primary key index scan on InnoDB is a full table scan.
        t.fullTableScan = true;
      } else {
        t.fullIndexScan = true;
      }
      break;
    case "range":
      t.comment = "A range of rows are accessed using an index.";
      break;
    case "ref":
      t.comment = "Matching rows are being accessed.";
      break;
    case "eq_ref":
      t.comment =
        "At most one row is accessed from this table using an index.";
      break;
    case "const":
    case "system":
      t.comment =
        "This table is read once at the beginning of the query and is effectively a constant.";
      break;
    case "index_merge":
      t.comment = "MySQL is using multiple indexes.";
      break;
  }

  if (t.key) {
    if (t.key === "PRIMARY") {
      t.comment += " MySQL is using the PRIMARY KEY.";
    } else if (t.accessType === "index_merge") {
      t.comment += ` The indexes and merge type are ${t.key}.`;
      if (/^intersect/i.test(t.key)) {
        t.comment +=
          " Looks like the merge type is 'intersect'. This may be slow with complicated WHERE clauses!";
      }
    } else {
      t.comment += ` MySQL is using the '${t.key}' index.`;
    }
  }

  t.comment = t.comment.trim();
  return t;
}

function fromNode(node: MysqlTableNode): NormalizedTable {
  const accessType = node.access_type ?? "?";
  const rows = node.rows_examined_per_scan ?? node.rows ?? 0;

  return annotate({
    name: node.table_name ?? "(unknown)",
    accessType,
    rows,
    key: node.key ?? null,
    possibleKeys: node.possible_keys ?? null,
    keyLength: node.key_length ?? null,
    ref: node.ref ?? null,
    filtered: node.filtered ?? null,
    scalability: scalabilityFor(accessType),
    fullTableScan: false,
    fullIndexScan: false,
    comment: "",
  });
}

function traverse(value: unknown, visit: (key: string, v: unknown) => void) {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      traverse(item, visit);
    }
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    visit(key, child);
    traverse(child, visit);
  }
}

export function parseMysql(data: unknown): NormalizedTable[] {
  const tables: NormalizedTable[] = [];
  traverse(data, (key, value) => {
    if (key === "table" && value && typeof value === "object") {
      tables.push(fromNode(value as MysqlTableNode));
    }
  });
  return tables;
}

export function isMysqlExplain(data: unknown): boolean {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "query_block" in data
  );
}
