var m = require("mithril");
var BigOFactor = require("./BigOFactor");

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
      m("h3", "Estimation (experimental!)"),
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

module.exports = TablesScalability;
