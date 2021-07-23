var m = require("mithril");
var Explain = require("./Explain");
var Analysis = require("./Analysis");
var ErrorMessage = require("./ErrorMessage");

var App = {
  oninit: function (vnode) {
    var planID = m.route.param("key");
    vnode.state.explain = new Explain();
    if (planID) {
      vnode.state.loading = true;
      Explain.load(vnode.state.explain, planID)
        .then(function () {
          Explain.parse(vnode.state.explain);
          vnode.state.analysis = new Analysis(vnode.state.explain);
          vnode.state.loading = false;
          vnode.state.initialFieldData = JSON.stringify(
            vnode.state.explain.data,
            null,
            " "
          );
          vnode.state.fieldData = vnode.state.initialFieldData;
        })
        .catch(function (e) {
          vnode.state.loading = false;
          vnode.state.loadError = e;
        });
      console.log("fetching plan", planID);
    }
    vnode.state.analysis = "div";

    vnode.state.analyze = function () {
      try {
        var data = JSON.parse(this.fieldData);
        this.explain.data = data;
        Explain.parse(this.explain);
        this.analysis = new Analysis(this.explain);
        vnode.state.unanalyzedChanges = false;
      } catch (e) {
        this.analysis = new ErrorMessage("Error parsing explain JSON", "" + e);
      }
      return false;
    }.bind(vnode.state);
  },
  view: function (vnode) {
    if (vnode.state.loading) {
      return m("div", "Loading...");
    }
    if (vnode.state.loadError) {
      return m("div", "Something went wrong: " + vnode.state.loadError);
    }
    var explainTextareaParams = {
      className: "explain-input pure-input-2-3",
      placeholder: "MySQL JSON Explain { . . . }",
      oninput: function () {
        vnode.state.initialFieldData = null;
        vnode.state.fieldData = this.value;
        vnode.state.unanalyzedChanges = true;
      },
    };
    if (vnode.state.initialFieldData) {
      explainTextareaParams.value = vnode.state.initialFieldData;
    }
    return m("div", [
      m(
        "form",
        {
          className: "pure-form pure-form-stacked",
        },
        m(
          "fieldset.pure-group",
          m("textarea", explainTextareaParams),
          m(
            "span",
            {
              class: "pure-form-message mea-explain-input-message",
            },
            "Paste the output of EXPLAIN FORMAT=JSON ..."
          )
        ),
        m(
          "fieldset.pure-group",
          m("button.pure-button", { onclick: vnode.state.analyze }, "Analyze")
        )
      ),
      m("div", [m(vnode.state.analysis)]),
    ]);
  },
};

m.route(document.getElementById("app"), "/explain/", {
  "/explain/": App,
  "/explain/:key": App,
});
