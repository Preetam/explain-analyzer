var factor = function(n) {
  return this.factorFunc(n, this.size);
}

var constFactorFunc = function(a, b) {
  return 1;
}

var linearFactorFunc = function(a, b) {
  return a/b;
}

var logFactorFunc = function(a, b) {
  return Math.log(a+1) / Math.log(b+1);
}

var BigOFactor = function(bigO, size) {
  this.bigO = bigO;
  this.size = size;
  switch (bigO) {
  case "1":
    this.factorFunc = constFactorFunc;
    break;
  case "log n":
    this.factorFunc = logFactorFunc;
    break;
  case "n":
    this.factorFunc = linearFactorFunc;
    break;
  }
  this.factor = factor.bind(this);
}

module.exports = BigOFactor;
