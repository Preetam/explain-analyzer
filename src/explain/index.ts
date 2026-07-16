import { isMysqlExplain, parseMysql } from "./mysql";
import { isPostgresExplain, parsePostgres } from "./postgres";
import type { ParsedExplain } from "./types";

export type { Dialect, NormalizedTable, ParsedExplain, Scalability } from "./types";

export class ExplainParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplainParseError";
  }
}

export function parseExplain(data: unknown): ParsedExplain {
  if (isMysqlExplain(data)) {
    return { dialect: "mysql", tables: parseMysql(data), raw: data };
  }
  if (isPostgresExplain(data)) {
    return { dialect: "postgres", tables: parsePostgres(data), raw: data };
  }
  throw new ExplainParseError(
    "Unrecognized explain JSON. Expected MySQL (query_block) or PostgreSQL (Plan) output."
  );
}

export function dialectLabel(dialect: ParsedExplain["dialect"]): string {
  return dialect === "mysql" ? "MySQL" : "PostgreSQL";
}
