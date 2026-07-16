import { sortBySeverity } from "./findings";
import type { Dialect, Finding, NormalizedTable, Severity } from "./types";

function engineName(dialect: Dialect): string {
  return dialect === "mysql" ? "MySQL" : "PostgreSQL";
}

export interface Verdict {
  severity: Severity | "ok";
  headline: string;
  detail: string;
}

/** A one- or two-sentence summary that leads the analysis. */
export function buildVerdict(
  dialect: Dialect,
  tables: NormalizedTable[],
  findings: Finding[]
): Verdict {
  if (findings.length === 0) {
    return {
      severity: "ok",
      headline: "Plan looks healthy",
      detail: `No full scans, slow lookups, or wasteful filters detected across ${tables.length} table${
        tables.length === 1 ? "" : "s"
      }.`,
    };
  }

  const ranked = sortBySeverity(findings);
  const top = ranked[0];
  const criticals = ranked.filter((f) => f.severity === "critical");
  const warnings = ranked.filter((f) => f.severity === "warning");

  if (top.severity === "critical") {
    const headline = criticals.length === 1
      ? top.title
      : `${criticals.length} critical issues (worst: ${top.title})`;
    return {
      severity: "critical",
      headline,
      detail:
        `${engineName(dialect)} plan has ${criticals.length} critical issue${
          criticals.length === 1 ? "" : "s"
        } and ${warnings.length} warning${warnings.length === 1 ? "" : "s"}. ` +
        "Address the critical items first — they usually dominate query cost.",
    };
  }

  if (top.severity === "warning") {
    return {
      severity: "warning",
      headline: `${warnings.length} warning${warnings.length === 1 ? "" : "s"} to review`,
      detail:
        `No critical issues, but ${warnings.length} item${
          warnings.length === 1 ? "" : "s"
        } worth a look. The most important is: ${top.title}.`,
    };
  }

  return {
    severity: "info",
    headline: "Plan is fine, with notes",
    detail: `No scans or lookups of concern. ${ranked.length} informational note${
      ranked.length === 1 ? "" : "s"
    } below.`,
  };
}
