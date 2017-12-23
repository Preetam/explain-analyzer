var m = require("mithril");

var Explain = function() {
  this.tables = [];
}

function traverse(o, func) {
  for (var i in o) {
    func.apply(this, [i, o[i]]);
    if (o[i] !== null && typeof(o[i]) == "object") {
      traverse(o[i], func);
    }
  }
}

Explain.parse = function(explain) {
  explain.tables = [];
  traverse(explain.data, function(k, v) {
    if (k == "table") {
      explain.tables.push(v);
    }
  });
}

Explain.load = function(explain, id) {
  return m.request({
    method: "GET",
    url: "https://explains.infinitynorm.com/api/v1/explains/" + id
  }).then(function(result) {
    explain.data = result.explain;
  })
}

Explain.save = function(explain) {
  return m.request({
    method: "POST",
    url: "https://explains.infinitynorm.com/api/v1/explains",
    data: explain.data
  }).then(function(result) {
    explain.id = result.object;
  })
}

module.exports = Explain;
