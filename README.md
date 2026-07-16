# explain-analyzer

Web-based analyzer for **MySQL** and **PostgreSQL** JSON `EXPLAIN` output.

Use it locally with `npm run dev`, or from GitHub Pages after deploying `dist/`.

### Features

- Table representation of MySQL / PostgreSQL JSON explain output
- Comments about explain interpretation (full table scans, index usage, etc.)
- Experimental scalability analysis
- Automatic dialect detection

### Try it

Paste either:

**MySQL** — `EXPLAIN FORMAT=JSON ...`

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

**PostgreSQL** — `EXPLAIN (FORMAT JSON) ...`

```json
[
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
]
```

### Develop

```bash
npm install
npm run dev      # local server
npm test         # vitest
npm run build    # output in dist/
```

### Deploy

Build, then publish the `dist/` directory (for example with a `gh-pages` branch).

```bash
npm run build
# deploy contents of dist/
```

### License

BSD 2-Clause (see [LICENSE](LICENSE))
