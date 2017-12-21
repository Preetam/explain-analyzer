var m = require("mithril")
var Explain = require("./Explain")
var Analysis = require("./Analysis")

var App = {
  oninit: function(vnode) {
    vnode.state.analysis = "div";
    vnode.state.explain = new Explain();
    vnode.state.processInput = function() {
      Explain.parse(vnode.state.explain, JSON.parse(this.value));
      vnode.state.analysis = new Analysis(vnode.state.explain);
    }
  },
  view: function(vnode) {
    return m("div", [
      m("form",
        {
          className: "pure-form pure-form-stacked",
        },
        m("fieldset.pure-group",
        m("textarea", {
          className: "explain-input pure-input-2-3",
          placeholder: "MySQL JSON Explain { . . . }",
          oninput: vnode.state.processInput
        }),
        m("span.pure-form-message", "Paste the output of EXPLAIN FORMAT=JSON ...")
      )),
      m("div", [
        m("h2", "Analysis"),
        m(vnode.state.analysis)
      ])
    ])
  }
}

m.mount(document.getElementById("app"), App)
