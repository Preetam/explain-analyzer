export type Dialect = "mysql" | "postgres";

export type Scalability = "1" | "log n" | "n" | "?";

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
}

export interface ParsedExplain {
  dialect: Dialect;
  tables: NormalizedTable[];
  raw: unknown;
}
