var o = require("mithril/ospec/ospec")

var Explain = require("../Explain")

o.spec("Explain", function() {
  o("parses a JSON explain", function() {
    var explain = new Explain();
    Explain.parse(explain, {
      "query_block": {
        "grouping_operation": {
          "nested_loop": [
            {
              "table": {
                "access_type": "ALL",
                "rows_examined_per_scan": 1609,
                "table_name": "table_a"
              }
            },
            {
              "table": {
                "access_type": "ref",
                "rows_examined_per_scan": 1,
                "rows_produced_per_join": 257,
                "table_name": "table_b"
              }
            }
          ]
        },
        "select_id": 1
      }
    })

    o(explain.tables.length).equals(2)
  })
})
