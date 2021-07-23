# explain-analyzer [![CircleCI](https://circleci.com/gh/Preetam/explain-analyzer.svg?style=svg)](https://circleci.com/gh/Preetam/explain-analyzer)

This is a web-based MySQL explain analyzer.

You can use it here: https://preetam.github.io/explain-analyzer/#!/explain/

Try it with

```json
{
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
}
```

### Features

- Table representation of MySQL JSON explain output
- Comments about explain interpretation
- Experimental scalability analysis
- Explain saving and permalinks

### Screenshot

![screenshot](https://user-images.githubusercontent.com/379404/35567762-2fd826b2-0594-11e8-8c8b-cb8951924459.png)

### License

BSD 2-Clause (see [LICENSE](LICENSE))
