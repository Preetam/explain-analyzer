import { describe, expect, it } from "vitest";
import { parseExplain } from "./index";
import { buildVerdict } from "./verdict";
import { sortBySeverity } from "./findings";

describe("parseExplain MySQL", () => {
  it("parses nested-loop tables", () => {
    const explain = parseExplain({
      query_block: {
        grouping_operation: {
          nested_loop: [
            {
              table: {
                access_type: "ALL",
                rows_examined_per_scan: 1609,
                table_name: "table_a",
              },
            },
            {
              table: {
                access_type: "ref",
                rows_examined_per_scan: 1,
                rows_produced_per_join: 257,
                table_name: "table_b",
                key: "idx_b",
              },
            },
          ],
        },
        select_id: 1,
      },
    });

    expect(explain.dialect).toBe("mysql");
    expect(explain.tables).toHaveLength(2);
    expect(explain.tables[0].name).toBe("table_a");
    expect(explain.tables[0].fullTableScan).toBe(true);
    expect(explain.tables[0].scalability).toBe("n");
    expect(explain.tables[1].name).toBe("table_b");
    expect(explain.tables[1].key).toBe("idx_b");
    expect(explain.tables[1].scalability).toBe("log n");
  });

  it("handles legacy rows field", () => {
    const explain = parseExplain({
      query_block: {
        table: {
          access_type: "ALL",
          rows: 42,
          table_name: "t",
        },
      },
    });

    expect(explain.tables).toHaveLength(1);
    expect(explain.tables[0].rows).toBe(42);
  });

  it("treats PRIMARY index scan as full table scan", () => {
    const explain = parseExplain({
      query_block: {
        table: {
          table_name: "t",
          access_type: "index",
          key: "PRIMARY",
          rows_examined_per_scan: 100,
        },
      },
    });

    expect(explain.tables[0].fullTableScan).toBe(true);
  });

  it("emits a warning finding for a full table scan", () => {
    const explain = parseExplain({
      query_block: {
        table: {
          table_name: "t",
          access_type: "ALL",
          rows_examined_per_scan: 1609,
        },
      },
    });

    expect(explain.findings).toHaveLength(1);
    expect(explain.findings[0].severity).toBe("warning");
    expect(explain.findings[0].title).toContain("Full table scan");
    expect(explain.findings[0].table).toBe("t");
  });

  it("emits a critical finding for a large full table scan", () => {
    const explain = parseExplain({
      query_block: {
        table: {
          table_name: "big",
          access_type: "ALL",
          rows_examined_per_scan: 500_000,
        },
      },
    });

    expect(explain.findings[0].severity).toBe("critical");
  });
});

describe("parseExplain PostgreSQL", () => {
  it("parses a seq scan plan array", () => {
    const explain = parseExplain([
      {
        Plan: {
          "Node Type": "Seq Scan",
          "Relation Name": "users",
          Alias: "users",
          "Plan Rows": 50,
          "Plan Width": 812,
        },
      },
    ]);

    expect(explain.dialect).toBe("postgres");
    expect(explain.tables).toHaveLength(1);
    expect(explain.tables[0].name).toBe("users");
    expect(explain.tables[0].accessType).toBe("Seq Scan");
    expect(explain.tables[0].fullTableScan).toBe(true);
    expect(explain.tables[0].scalability).toBe("n");
    expect(explain.tables[0].rows).toBe(50);
  });

  it("walks nested plans and prefers actual rows", () => {
    const explain = parseExplain([
      {
        Plan: {
          "Node Type": "Nested Loop",
          "Plan Rows": 10,
          Plans: [
            {
              "Node Type": "Seq Scan",
              "Relation Name": "orders",
              "Plan Rows": 1000,
              "Actual Rows": 8,
              "Actual Loops": 1,
            },
            {
              "Node Type": "Index Scan",
              "Relation Name": "customers",
              "Index Name": "customers_pkey",
              "Index Cond": "(id = orders.customer_id)",
              "Plan Rows": 1,
              "Actual Rows": 1,
              "Actual Loops": 8,
            },
          ],
        },
      },
    ]);

    expect(explain.tables).toHaveLength(2);
    expect(explain.tables[0].name).toBe("orders");
    expect(explain.tables[0].rows).toBe(8);
    expect(explain.tables[1].name).toBe("customers");
    expect(explain.tables[1].rows).toBe(8);
    expect(explain.tables[1].key).toBe("customers_pkey");
    expect(explain.tables[1].scalability).toBe("log n");
    expect(explain.tables[1].fullTableScan).toBe(false);
  });

  it("inherits index name from child bitmap index scans", () => {
    const explain = parseExplain({
      Plan: {
        "Node Type": "Bitmap Heap Scan",
        "Relation Name": "accounts",
        "Plan Rows": 37471,
        "Recheck Cond": "(workspace_id = ANY (...))",
        Plans: [
          {
            "Node Type": "Bitmap Index Scan",
            "Index Name": "accounts_workspace_idx",
            "Plan Rows": 37659,
            "Index Cond": "(workspace_id = ANY (...))",
          },
        ],
      },
    });

    expect(explain.tables).toHaveLength(1);
    expect(explain.tables[0].key).toBe("accounts_workspace_idx");
    expect(explain.tables[0].comment).toContain("accounts_workspace_idx");
  });

  it("collects plan-level findings for large sorts and expression joins", () => {
    const explain = parseExplain([
      {
        Plan: {
          "Node Type": "Gather Merge",
          "Plan Rows": 74942,
          "Workers Planned": 2,
          Plans: [
            {
              "Node Type": "Sort",
              "Plan Rows": 1093119,
              "Sort Key": ["c.workspace_id", "(lower(c.email))"],
              Plans: [
                {
                  "Node Type": "Merge Join",
                  "Merge Cond":
                    "((c.workspace_id = a.workspace_id) AND ((lower(split_part(c.email, '@'::text, 2))) = (lower(a.domain))))",
                  "Plan Rows": 2335497,
                  Plans: [
                    {
                      "Node Type": "Seq Scan",
                      "Relation Name": "contacts",
                      "Plan Rows": 1093119,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    const titles = explain.findings.map((f) => f.title);
    const has = (re: RegExp) => titles.some((t) => re.test(t));
    expect(has(/parallel query with 2 workers/i)).toBe(true);
    expect(has(/large sort of ~1,093,119 rows/i)).toBe(true);
    expect(has(/merge join on computed expressions/i)).toBe(true);
    expect(has(/full table scan on `contacts`/i)).toBe(true);
  });

  it("skips small sorts and plain-column joins", () => {
    const explain = parseExplain({
      Plan: {
        "Node Type": "Merge Join",
        "Merge Cond": "(a.id = b.a_id)",
        "Plan Rows": 100,
        Plans: [
          {
            "Node Type": "Sort",
            "Plan Rows": 100,
            "Sort Key": ["a.id"],
            Plans: [
              {
                "Node Type": "Seq Scan",
                "Relation Name": "a",
                "Plan Rows": 100,
              },
            ],
          },
        ],
      },
    });

    // Only the small seq scan finding (warning) — no large sort or expression join.
    expect(explain.findings).toHaveLength(1);
    expect(explain.findings[0].title).toMatch(/full table scan on `a`/i);
  });

  it("flags index scan without cond as full index scan", () => {
    const explain = parseExplain({
      Plan: {
        "Node Type": "Index Scan",
        "Relation Name": "t",
        "Index Name": "t_idx",
        "Plan Rows": 100,
      },
    });

    expect(explain.tables[0].fullIndexScan).toBe(true);
    expect(explain.tables[0].scalability).toBe("n");
  });

  it("flags a selective but slow index lookup from EXPLAIN ANALYZE", () => {
    const explain = parseExplain([
      {
        Plan: {
          "Node Type": "Index Scan",
          "Index Name": "account_profiles_pk",
          "Relation Name": "account_profiles",
          "Plan Rows": 1,
          "Actual Startup Time": 1638.425,
          "Actual Total Time": 1638.673,
          "Actual Rows": 1,
          "Actual Loops": 1,
          "Index Cond":
            "(account_fs_id = '019b498e-1eab-778c-ad66-67b901709f73'::uuid)",
        },
        "Planning Time": 0.218,
        "Execution Time": 1638.689,
      },
    ]);

    expect(explain.tables[0].rows).toBe(1);
    expect(explain.tables[0].key).toBe("account_profiles_pk");
    expect(explain.tables[0].scalability).toBe("log n");
    expect(explain.tables[0].actualTimeMs).toBeCloseTo(1638.673);
    expect(explain.tables[0].comment).toContain("Actual time 1.64s");

    const titles = explain.findings.map((f) => f.title);
    const has = (re: RegExp) => titles.some((t) => re.test(t));
    expect(has(/1\.64s total/i)).toBe(true);
    expect(has(/slow selective lookup on `account_profiles`/i)).toBe(true);
    const slow = explain.findings.find((f) =>
      /slow selective lookup/i.test(f.title)
    );
    expect(slow?.detail).toMatch(/I\/O, cache/);
  });

  it("does not flag a fast selective index lookup", () => {
    const explain = parseExplain({
      Plan: {
        "Node Type": "Index Scan",
        "Index Name": "t_pkey",
        "Relation Name": "t",
        "Actual Total Time": 0.05,
        "Actual Rows": 1,
        "Actual Loops": 1,
        "Index Cond": "(id = 1)",
      },
    });

    expect(explain.findings).toHaveLength(0);
  });

  it("flags a wasteful filter on a seq scan", () => {
    const explain = parseExplain({
      Plan: {
        "Node Type": "Seq Scan",
        "Relation Name": "events",
        "Plan Rows": 100,
        "Actual Rows": 100,
        "Actual Loops": 1,
        "Rows Removed by Filter": 5000,
        Filter: "(kind = 'click')",
      },
    });

    const wasteful = explain.findings.find((f) =>
      /wasteful filter/i.test(f.title)
    );
    expect(wasteful).toBeDefined();
    expect(wasteful?.severity).toBe("warning");
  });
});

describe("verdict", () => {
  it("reports a healthy plan when there are no findings", () => {
    const explain = parseExplain({
      Plan: {
        "Node Type": "Index Scan",
        "Relation Name": "t",
        "Index Name": "t_pkey",
        "Actual Total Time": 0.05,
        "Actual Rows": 1,
        "Actual Loops": 1,
        "Index Cond": "(id = 1)",
      },
    });

    const verdict = buildVerdict(
      explain.dialect,
      explain.tables,
      explain.findings
    );
    expect(verdict.severity).toBe("ok");
    expect(verdict.headline).toMatch(/healthy/i);
  });

  it("leads with critical when a critical finding exists", () => {
    const explain = parseExplain({
      query_block: {
        table: {
          table_name: "big",
          access_type: "ALL",
          rows_examined_per_scan: 500_000,
        },
      },
    });

    const verdict = buildVerdict(
      explain.dialect,
      explain.tables,
      explain.findings
    );
    expect(verdict.severity).toBe("critical");
    expect(verdict.headline).toContain("Full table scan");
  });

  it("ranks findings by severity (critical before warning)", () => {
    const explain = parseExplain([
      {
        Plan: {
          "Node Type": "Nested Loop",
          "Plan Rows": 10,
          Plans: [
            {
              "Node Type": "Seq Scan",
              "Relation Name": "big",
              "Plan Rows": 500_000,
            },
            {
              "Node Type": "Index Scan",
              "Relation Name": "small",
              "Index Name": "small_pkey",
              "Index Cond": "(id = 1)",
              "Plan Rows": 1,
            },
          ],
        },
      },
    ]);

    const ranked = sortBySeverity(explain.findings);
    expect(ranked[0].severity).toBe("critical");
  });
});

describe("parseExplain errors", () => {
  it("rejects unrecognized JSON", () => {
    expect(() => parseExplain({ foo: 1 })).toThrow(/Unrecognized explain JSON/);
  });
});
