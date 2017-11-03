var m = require("mithril");
var BigOFactor = require("./BigOFactor");

var Table = function(name, rows, accessType, key) {
  this.name = name;
  this.rows = rows;
  this.newRows = rows;
  this.key = key;
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
  case "index":
    this.scalability = "n";
    break;
  case "ref":
    this.scalability = "log n";
    break;
  case "eq_ref":
    this.scalability = "log n";
    break;
  case "const":
    this.scalability = "1";
    break;
  default:
    this.scalability = "?";
  }
}

var TablesScalability = function(tables) {
  this.oninit = function(vnode) {
    vnode.state.tables = tables;
    vnode.state.tables.forEach(function(t) {
      if (t.scalability != "?") {
        t.bigO = new BigOFactor(t.scalability, t.rows);
      }
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
          var disabled = false;
          if (o.bigO) {
            factor *= o.bigO.factor(o.newRows);
          } else {
            disabled = true;
          }
          return m("tr",
            m("td", o.name),
            m("td", o.rows),
            m("td", m("input", {value: o.newRows, oninput: o.setNewRows, disabled: disabled}))
          )
        })
      ]),
      m("p",
        "Latency scale factor: ",
        m("strong", "~", factor.toFixed(2), "x")
      )
    )
  }.bind(this);
}

var Comments = function(tables) {
  this.oninit = function(vnode) {
    vnode.state.tables = tables;
    vnode.state.tables.forEach(function(t) {
      switch (t.accessType) {
      case "ALL":
        t.comment = "There is a full scan on this table.";
        break;
      case "index":
        t.comment = "There is a full index scan on this table.";
        break;
      case "range":
        t.comment = "This table is accessed using a range read.";
        break;
      case "ref":
        t.comment = "Rows are being accessed from this table using an index.";
        break;
      case "eq_ref":
        t.comment = "At most one row is being accessed from this table using an index.";
        break;
      case "const":
        t.comment = "This table is being read once at the beginning of the query and is effectively a constant.";
      }

      if (t.key) {
        if (t.key == "PRIMARY") {
          t.comment += " The primary key is being used.";
        } else {
          t.comment += " The index '" + t.key + "' is being used.";
        }
      }
    })
  }.bind(this);

  this.view = function(vnode) {
    var factor = 1;
    return m("div",
      m("h4", "Comments"),
      m("ul", [
        vnode.state.tables.filter(function(o) {
          if (o.comment) {
            return true;
          }
          return false;
        }).map(function(o) {
          return m("li",
            m("strong", o.name),
            ": ",
            o.comment);
        })
      ])
    )
  }.bind(this);
}

var Analysis = function(explain) {
  this.explain = explain;
  this.oninit = function(vnode) {
    vnode.state.tables = [];
    this.explain.tables.map(function(o) {
      var rows = o.rows_examined_per_scan || o.rows;
      vnode.state.tables.push(
        new Table(o.table_name, rows, o.access_type, o.key)
      )
    })
    vnode.state.tablesScalability = new TablesScalability(vnode.state.tables);
    vnode.state.commentary = new Comments(vnode.state.tables);
  }.bind(this);
  this.view = function(vnode) {
    return m("div", [
      m("table", [
        m("tr", [
          m("th", "Table"),
          m("th", "Access type"),
          m("th", "Index"),
          m("th", "Rows examined per scan"),
          m("th", "Scalability"),
        ]),
        vnode.state.tables.map(function(o) {
          return m("tr",
            m("td", o.name),
            m("td", o.accessType),
            m("td", o.key || "N/A"),
            m("td", o.rows),
            m("td", "O(" + o.scalability + ")")
          )
        })
      ]),
      m(vnode.state.tablesScalability),
      m(vnode.state.commentary)
    ])
  }.bind(this);
}

module.exports = Analysis;
