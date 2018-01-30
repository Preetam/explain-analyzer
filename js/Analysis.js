var m = require("mithril");
var Table = require("./Table");
var ExplainTable = require("./ExplainTable");
var Comments = require("./Comments");
var TablesScalability = require("./TablesScalability");

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
      m("h2.mea-analysis-heading", "Analysis"),
      m(vnode.state.explainTable),
      m(vnode.state.commentary),
      m(vnode.state.tablesScalability)
    ])
  }.bind(this);
}

module.exports = Analysis;
