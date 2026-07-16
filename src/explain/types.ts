export type Dialect = "mysql" | "postgres";

export type Scalability = "1" | "log n" | "n" | "?";

export type Severity = "critical" | "warning" | "info";

/** Normalized row used by the analysis UI for both dialects. */
export interface NormalizedTable {
  name: string;
  accessType: string;
  rows: number;
  key: string | null;
  possibleKeys: string[] | null;
  keyLength: string | number | null;
  ref: string[] | null;
  filtered: string | number | null;
  scalability: Scalability;
  fullTableScan: boolean;
  fullIndexScan: boolean;
  comment: string;
  /** Actual execution time in ms, when EXPLAIN ANALYZE was used. */
  actualTimeMs: number | null;
  /** Rows discarded by a post-scan filter, when reported. */
  rowsRemovedByFilter: number | null;
}

/** A structured note about a plan, ranked by severity. */
export interface Finding {
  severity: Severity;
  /** Short headline, e.g. "Full table scan on `users`". */
  title: string;
  /** Longer explanation with actionable detail. */
  detail: string;
  /** Table this finding is about, if any. */
  table?: string;
}

export interface ParsedExplain {
  dialect: Dialect;
  tables: NormalizedTable[];
  /** Plan-level notes not tied to a single table (joins, sorts, parallelism). */
  findings: Finding[];
  raw: unknown;
}
