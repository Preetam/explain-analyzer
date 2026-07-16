import type { Finding, NormalizedTable, Severity } from "./types";

const LARGE_TABLE_ROWS = 10_000;
const VERY_LARGE_TABLE_ROWS = 100_000;
const SLOW_LOOKUP_MS = 100;
const SLOW_LOOKUP_MAX_ROWS = 10;
const HIGH_FILTER_RATIO = 10;

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(1)}ms`;
}

function formatRows(n: number): string {
  return n.toLocaleString();
}

/** Findings tied to a single normalized table (scan-level concerns). */
export function tableFindings(t: NormalizedTable): Finding[] {
  const findings: Finding[] = [];

  if (t.fullTableScan) {
    const severity: Severity =
      t.rows >= VERY_LARGE_TABLE_ROWS ? "critical" : "warning";
    findings.push({
      severity,
      title: `Full table scan on \`${t.name}\``,
      detail:
        `The planner reads every row in \`${t.name}\` (~${formatRows(
          t.rows
        )} rows). ` +
        "A sequential scan over a large table is usually the dominant cost; " +
        "an index that narrows the scan or a filter pushed into an index can avoid it.",
      table: t.name,
    });
  }

  if (t.fullIndexScan) {
    findings.push({
      severity: "warning",
      title: `Full index scan on \`${t.name}\``,
      detail:
        `The planner reads an entire index on \`${t.name}\`${
          t.key ? ` (\`${t.key}\`)` : ""
        }. ` +
        "This is cheaper than a full table scan but still linear in the index size; " +
        "check whether a more selective predicate or a covering index can turn it into a point lookup.",
      table: t.name,
    });
  }

  if (
    typeof t.actualTimeMs === "number" &&
    t.actualTimeMs >= SLOW_LOOKUP_MS &&
    t.rows <= SLOW_LOOKUP_MAX_ROWS &&
    !t.fullTableScan &&
    !t.fullIndexScan
  ) {
    findings.push({
      severity: "warning",
      title: `Slow selective lookup on \`${t.name}\``,
      detail:
        `A selective scan on \`${t.name}\` returned ${formatRows(
          t.rows
        )} row(s) but took ${formatMs(
          t.actualTimeMs
        )}. ` +
        "The plan shape looks fine — check I/O, cache, index/table bloat, or waiting on locks.",
      table: t.name,
    });
  }

  if (
    typeof t.rowsRemovedByFilter === "number" &&
    t.rows > 0 &&
    t.rowsRemovedByFilter / t.rows >= HIGH_FILTER_RATIO
  ) {
    findings.push({
      severity: "warning",
      title: `Wasteful filter on \`${t.name}\``,
      detail:
        `A scan on \`${t.name}\` discarded ${formatRows(
          t.rowsRemovedByFilter
        )} rows via Filter and kept ${formatRows(
          t.rows
        )}. ` +
        "A matching index could avoid reading most of those rows.",
      table: t.name,
    });
  }

  return findings;
}

/** Severity rank, for ordering (higher = worse). */
export function severityRank(s: Severity): number {
  switch (s) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
  }
}

export function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

export const thresholds = {
  LARGE_TABLE_ROWS,
  VERY_LARGE_TABLE_ROWS,
  SLOW_LOOKUP_MS,
  SLOW_LOOKUP_MAX_ROWS,
  HIGH_FILTER_RATIO,
};

export const formatters = {
  formatMs,
  formatRows,
};
