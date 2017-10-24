var m = require("mithril");
var BigOFactor = require("./BigOFactor");

var Table = function(name, rows, accessType) {
  this.name = name;
  this.rows = rows;
  this.newRows = rows;
  var t = this;
  this.setNewRows = function() {
    if (this.value == "") {
      t.newRows = 0;
      return;
    }
    t.newRows = parseInt(this.value);
  }
  this.accessType = accessType;

  switch (accessType) {
  case "ALL":
    this.scalability = "n";
    break;
  case "ref":
    this.scalability = "log n";
    break;
  case "const":
    this.scalability = "1";
    break;
  }
}

var TablesScalability = function(tables) {
  this.oninit = function(vnode) {
    vnode.state.tables = tables;
    vnode.state.tables.forEach(function(t) {
      t.bigO = new BigOFactor(t.scalability, t.rows);
    })
  }.bind(this);
  this.view = function(vnode) {
    var factor = 1;
    return m("div",
      m("h4", "Estimation"),
      m("table", [
        m("tr", [
          m("th", "Table"),
          m("th", "Row count"),
          m("th", "Estimated row count"),
        ]),
        vnode.state.tables.map(function(o) {
          factor *= o.bigO.factor(o.newRows);
          return m("tr",
            m("td", o.name),
            m("td", o.rows),
            m("td", m("input", {value: o.newRows, oninput: o.setNewRows})),
          )
        })
      ]),
      m("p",
        "Latency scale factor: ",
        m("strong", factor.toFixed(2), "x")
      )
    )
  }.bind(this);
}

var Analysis = function(explain) {
  this.explain = explain;
  this.oninit = function(vnode) {
    vnode.state.tables = [];
    this.explain.tables.map(function(o) {
      vnode.state.tables.push(
        new Table(o.table_name, o.rows_examined_per_scan, o.access_type)
      )
    })
    vnode.state.tablesScalability = new TablesScalability(vnode.state.tables);
  }.bind(this);
  this.view = function(vnode) {
    return m("div", vnode.state.tables.map(function(o) {
      return m("div", [
        "Table: ", m("strong", o.name),
        ", Access type: ", m("strong", o.accessType),
        ", Rows examined: ", m("strong", o.rows),
        ", Scalability: ", m("strong", o.scalability)
      ])
    }),
    m(vnode.state.tablesScalability)
    )
  }.bind(this);
}

module.exports = Analysis;
