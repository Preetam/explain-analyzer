var m = require("mithril");
var BigOFactor = require("./BigOFactor");

// Table is a table accessed by the query.
var Table = function(name, rows, accessType, key, possibleKeys, keyLength, ref, filtered) {
  this.name = name;
  this.rows = rows;
  this.newRows = rows;
  this.key = key;
  this.possibleKeys = possibleKeys;
  this.keyLength = keyLength;
  this.ref = ref;
  this.filtered = filtered;
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
      m("h4", "Estimation (experimental!)"),
      m("table.pure-table", [
        m("thead",
          m("tr", [
            m("th", "Table"),
            m("th", "Row count"),
            m("th", "Estimated row count or scale factor"),
          ])
        ), // thead
        m("tbody",
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
        ) // tbody
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
      t.comment = "";
      switch (t.accessType) {
      case "ALL":
        t.fts = true;
        break;
      case "index":
        t.fullIndexScan = true;
        break;
      case "range":
        t.comment = "A range of rows are accessed using an index.";
        break;
      case "ref":
        t.comment = "Matching rows are being accessed.";
        break;
      case "eq_ref":
        t.comment = "At most one row is accessed from this table using an index.";
        break;
      case "const":
        t.comment = "This table is read once at the beginning of the query and is effectively a constant.";
        break;
      case "index_merge":
        t.comment = "MySQL is using multiple indexes."
      }

      if (t.key) {
        if (t.key == "PRIMARY") {
          t.comment += " MySQL is using the PRIMARY KEY.";
        } if (t.accessType == "index_merge") {
          t.comment += " The indexes and merge type are " + t.key + ".";
          if (t.key.match(/^intersect/i)) {
            t.comment += " Looks like the merge type is 'intersect'. This may be slow with complicated WHERE clauses!";
          }
        } else {
          t.comment += " MySQL is using the '" + t.key + "' index.";
        }
      }
    })
  }.bind(this);

  this.view = function(vnode) {
    var factor = 1;
    return m("div",
      m("h4", "Comments"),
      m("h5", "Full table scans"),
      m("p", "The following tables are being accessed with a full table scan, which means MySQL has to read the entire table."),
      m("ul", [
        vnode.state.tables.filter(function(o) {
          if (o.fts) {
            return true;
          }
        }).map(function(o) {
          return m("li", "Table ", m("strong", o.name))
        })
      ]),
      m("h5", "Full index scans"),
      m("p", "The following tables are being accessed with a full index scan, which means MySQL has to read an entire index on a table."),
      m("ul", [
        vnode.state.tables.filter(function(o) {
          if (o.fullIndexScan) {
            return true;
          }
        }).map(function(o) {
          return m("li", "Table ", m("strong", o.name), " with index ", m("strong", o.key))
        })
      ]),
      m("h5", "Misc"),
      m("ul", [
        vnode.state.tables.filter(function(o) {
          if (o.comment) {
            return true;
          }
          return false;
        }).map(function(o) {
          return m("li",
            "Table ", m("strong", o.name), ":",
            o.comment);
        })
      ])
    )
  }.bind(this);
}

var ExplainTable = function(tables) {
  this.oninit = function(vnode) {
    vnode.state.tables = tables;
  }
  this.view = function(vnode) {
    return m("table.pure-table", [
      m("thead",
        m("tr", [
          m("th", "Table"),
          m("th", "Access type"),
          m("th", "Possible indexes"),
          m("th", "Index"),
          m("th", "Index key length"),
          m("th", "Ref"),
          m("th", "Rows examined per scan"),
          m("th", "Filtered"),
          m("th", "Scalability"),
        ])
      ), // thead
      m("tbody",
        vnode.state.tables.map(function(o) {
          return m("tr",
            m("td", o.name),
            m("td", o.accessType),
            m("td", o.possibleKeys ? o.possibleKeys.join(", ") : ""),
            m("td", o.key || ""),
            m("td", o.keyLength || ""),
            m("td", (o.ref || []).join(", ")),
            m("td", o.rows),
            m("td", o.filtered),
            m("td", "O(" + o.scalability + ")")
          )
        })
      ) // tbody
    ])
  }
}

var Analysis = function(explain) {
  this.explain = explain;
  this.oninit = function(vnode) {
    vnode.state.tables = [];
    this.explain.tables.map(function(o) {
      var rows = o.rows_examined_per_scan || o.rows;
      vnode.state.tables.push(
        new Table(
            o.table_name,
            rows,
            o.access_type,
            o.key,
            o.possible_keys,
            o.key_length,
            o.ref,
            o.filtered)
      )
    })
    vnode.state.explainTable = new ExplainTable(vnode.state.tables);
    vnode.state.tablesScalability = new TablesScalability(vnode.state.tables);
    vnode.state.commentary = new Comments(vnode.state.tables);
  }.bind(this);
  this.view = function(vnode) {
    return m("div", [
      m("h3", "Analysis"),
      m(vnode.state.explainTable),
      m(vnode.state.commentary),
      m(vnode.state.tablesScalability)
    ])
  }.bind(this);
}

module.exports = Analysis;
