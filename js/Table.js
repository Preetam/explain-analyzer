// Table is a table accessed by the query.
var Table = function(name, rows, accessType, key, possibleKeys, keyLength, ref, filtered) {
  this.name = name;
  this.rows = rows;
  this.newRows = rows;
  this.key = key;
  this.possibleKeys = possibleKeys;
  this.keyLength = keyLength;
  this.ref = ref;
  this.filtered = filtered;
  var t = this;
  this.setNewRows = function() {
    if (this.value == "") {
      t.newRows = 0;
      return;
    }
    t.newRows = parseInt(this.value);
  }
  this.accessType = accessType;

  switch (accessType) {
  case "ALL":
    this.scalability = "n";
    break;
  case "index":
    this.scalability = "n";
    break;
  case "ref":
    this.scalability = "log n";
    break;
  case "eq_ref":
    this.scalability = "log n";
    break;
  case "const":
    this.scalability = "1";
    break;
  default:
    this.scalability = "?";
  }
}

module.exports = Table;
