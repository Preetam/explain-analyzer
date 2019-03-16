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

  let isPostgres = false;
  // Check if this is a PostgreSQL explain
  if (explain.data[0].Plan) {
    isPostgres = true;
    console.log("got a postgres explain");
    traverse(explain.data, function(k, v) {
      if (k == "Plan") {
        if (v["Relation Name"]) {
          explain.tables.push({
            table_name: v["Relation Name"],
            access_type: v["Node Type"],
            rows: v["Plan Rows"]
          });
        }
      }
      if (k == "Plans") {
        for (var i in v) {
          let plan = v[i];
          if (plan["Relation Name"]) {
            explain.tables.push({
              table_name: plan["Relation Name"],
              access_type: plan["Node Type"],
              rows: plan["Plan Rows"]
            });
          }
        }
      }
    });
  } else {
    traverse(explain.data, function(k, v) {
      if (k == "table") {
        explain.tables.push(v);
      }
    });
  }

  console.log(explain.tables);
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

// fullTableScans returns an array of tables that have full table scans.
Explain.fullTableScans = function() {

}

module.exports = Explain;
