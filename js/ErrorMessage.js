var m = require("mithril");

var ErrorMessage = function(heading, body) {
  this.view = function(vnode) {
    return m("div.error-message", [
      m("h2", heading),
      m("p", body)
    ])
  }
}

module.exports = ErrorMessage;
