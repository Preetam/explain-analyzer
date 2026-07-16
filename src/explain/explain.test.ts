import { describe, expect, it } from "vitest";
import { parseExplain } from "./index";

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
});

describe("parseExplain errors", () => {
  it("rejects unrecognized JSON", () => {
    expect(() => parseExplain({ foo: 1 })).toThrow(/Unrecognized explain JSON/);
  });
});
