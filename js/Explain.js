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

Explain.parse = function(explain, o) {
  traverse(o, function(k, v) {
    if (k == "table") {
      explain.tables.push(v);
    }
  });
}

module.exports = Explain;
