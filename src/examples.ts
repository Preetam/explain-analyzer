export const MYSQL_EXAMPLE = `{
  "query_block": {
    "select_id": 1,
    "cost_info": { "query_cost": "0.45" },
    "table": {
      "table_name": "test",
      "access_type": "ALL",
      "rows_examined_per_scan": 2,
      "rows_produced_per_join": 2,
      "filtered": "100.00",
      "cost_info": {
        "read_cost": "0.25",
        "eval_cost": "0.20",
        "prefix_cost": "0.45",
        "data_read_per_join": "16"
      },
      "used_columns": ["id"]
    }
  }
}`;

export const POSTGRES_EXAMPLE = `[
  {
    "Plan": {
      "Node Type": "Seq Scan",
      "Relation Name": "test",
      "Alias": "test",
      "Startup Cost": 0.0,
      "Total Cost": 1.02,
      "Plan Rows": 2,
      "Plan Width": 4
    }
  }
]`;

export const POSTGRES_ANALYZE_EXAMPLE = `[
  {
    "Plan": {
      "Node Type": "Index Scan",
      "Parallel Aware": false,
      "Async Capable": false,
      "Scan Direction": "Forward",
      "Index Name": "items_pkey",
      "Relation Name": "items",
      "Alias": "items",
      "Startup Cost": 0.42,
      "Total Cost": 3847.78,
      "Plan Rows": 1,
      "Plan Width": 130,
      "Actual Startup Time": 1638.425,
      "Actual Total Time": 1638.673,
      "Actual Rows": 1,
      "Actual Loops": 1,
      "Index Cond": "(id = '00000000-0000-0000-0000-000000000000'::uuid)",
      "Rows Removed by Index Recheck": 0
    },
    "Planning Time": 0.218,
    "Execution Time": 1638.689
  }
]`;
