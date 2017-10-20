var m = require("mithril");

var Analysis = function(explain) {
  this.explain = explain;
  this.view = function() {
    return m("div", this.explain.tables.map(function(o) {
      var scalability = "?";
      switch (o.access_type) {
        case "ALL":
          scalability = "O(n)";
          break;
        case "ref":
          scalability = "O(log n)"
          break;
      }
      return m("div", [
        "Table: ", m("strong", o.table_name),
        ", Access type: ", m("strong", o.access_type),
        ", Rows examined: ", m("strong", o.rows_examined_per_scan),
        ", Scalability: ", m("strong", scalability)
      ])
    }))
  }.bind(this);
}

module.exports = Analysis;
