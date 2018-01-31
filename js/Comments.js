var m = require("mithril");

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
        if (t.key == "PRIMARY") {
          // Full primary key index scan on InnoDB is a full table scan.
          t.fts = true;
        } else {
          t.fullIndexScan = true;
        }
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
        } else if (t.accessType == "index_merge") {
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

    var ftsTables = vnode.state.tables.filter(function(o) {
      if (o.fts) {
        return true;
      }
    });
    var fisTables = vnode.state.tables.filter(function(o) {
      if (o.fullIndexScan) {
        return true;
      }
    });
    var miscTables = vnode.state.tables.filter(function(o) {
      if (o.comment) {
        return true;
      }
    });

    var ftsSection = m("p", "No.");
    if (ftsTables.length > 0) {
      ftsSection = [
        m("p", m("strong.mea-highlight", "Yes.")),
        m("p", "The following tables are being accessed with a full table scan. MySQL is reading all of the rows in these tables."),
        m("ul", [
          ftsTables.map(function(o) {
            var rowsTag = "strong";
            if (o.rows > 10000) {
              rowsTag = "strong.mea-highlight";
            }
            return m("li", "Table ", m("strong", o.name), " with ", m(rowsTag, o.rows), " rows examined per scan.")
          })
        ])
      ];
    }

    var fisSection = m("p", "No.");
    if (fisTables.length > 0) {
      fisSection = [
        m("p", m("strong.mea-highlight", "Yes.")),
        m("p", "The following tables are being accessed with a full index scan. MySQL is reading an entire index for these tables."),
        m("ul", [
          fisTables.map(function(o) {
            return m("li", "Table ", m("strong", o.name), " with index ", m("strong", o.key))
          })
        ])
      ];
    }

    var miscSection = m("p", "No.");
    if (miscTables.length > 0) {
      miscSection = [
        m("p", m("strong.mea-highlight", "Yes.")),
        m("ul", [
          miscTables.map(function(o) {
            return m("li",
              "Table ", m("strong", o.name), ": ",
              o.comment);
          })
        ])
      ];
    }

    return m("div",
      m("h3.mea-comments-heading", "Comments"),
      m("h4.mea-comment-question", "Are there any full table scans?"),
      ftsSection,
      m("h4.mea-comment-question", "Are there any full index scans?"),
      fisSection,
      m("h4.mea-comment-question", "Is there anything else interesting?"),
      miscSection
    )
  }.bind(this);
}

module.exports = Comments;
