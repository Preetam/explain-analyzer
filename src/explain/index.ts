import { isMysqlExplain, mysqlFindings, parseMysql } from "./mysql";
import {
  isPostgresExplain,
  parsePostgres,
  postgresFindings,
} from "./postgres";
import type { ParsedExplain } from "./types";

export type {
  Dialect,
  Finding,
  NormalizedTable,
  ParsedExplain,
  Scalability,
  Severity,
} from "./types";
export { buildVerdict, type Verdict } from "./verdict";
export { sortBySeverity, severityRank } from "./findings";

export class ExplainParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplainParseError";
  }
}

export function parseExplain(data: unknown): ParsedExplain {
  if (isMysqlExplain(data)) {
    const tables = parseMysql(data);
    return {
      dialect: "mysql",
      tables,
      findings: mysqlFindings(tables),
      raw: data,
    };
  }
  if (isPostgresExplain(data)) {
    const tables = parsePostgres(data);
    return {
      dialect: "postgres",
      tables,
      findings: postgresFindings(data),
      raw: data,
    };
  }
  throw new ExplainParseError(
    "Unrecognized explain JSON. Expected MySQL (query_block) or PostgreSQL (Plan) output."
  );
}

export function dialectLabel(dialect: ParsedExplain["dialect"]): string {
  return dialect === "mysql" ? "MySQL" : "PostgreSQL";
}
