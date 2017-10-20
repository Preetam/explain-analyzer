var m = require("mithril")
var Explain = require("./Explain")
var Analysis = require("./Analysis")

var App = {
  oninit: function(vnode) {
    vnode.state.explain = new Explain();
    vnode.state.processInput = function() {
      Explain.parse(vnode.state.explain, JSON.parse(this.value));
    }
  },
  view: function(vnode) {
    return m("div", [
      m("textarea.explain-input", {
        placeholder: "MySQL JSON Explain",
        oninput: vnode.state.processInput
      }),
      m("div", [
        m("h2", "Analysis"),
        m(new Analysis(vnode.state.explain))
      ])
    ])
  }
}

m.mount(document.getElementById("app"), App)
