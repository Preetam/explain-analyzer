var m = require("mithril");

var ExplainTable = function(tables) {
  this.oninit = function(vnode) {
    vnode.state.tables = tables;
  }
  this.view = function(vnode) {
    return m("div", [
      m("h4", "Explain table"),
      m("p", "This is the table you would see if you ran EXPLAIN without FORMAT=JSON."),
      m("table",
        {
          class: "pure-table mea-explain-table"
        }, [
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
      ]) // table
    ]) // div
  }
}

module.exports = ExplainTable;
