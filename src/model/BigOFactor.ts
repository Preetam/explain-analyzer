import type { Scalability } from "../explain/types";

type FactorFunc = (newSize: number, oldSize: number) => number;

const constFactor: FactorFunc = () => 1;
const linearFactor: FactorFunc = (a, b) => (b === 0 ? 1 : a / b);
// 100 is arbitrary — softens log curve for small tables.
const logFactor: FactorFunc = (a, b) => Math.log(a + 100) / Math.log(b + 100);

export class BigOFactor {
  bigO: Scalability;
  size: number;
  private factorFunc: FactorFunc;

  constructor(bigO: Scalability, size: number) {
    this.bigO = bigO;
    this.size = size;
    switch (bigO) {
      case "1":
        this.factorFunc = constFactor;
        break;
      case "log n":
        this.factorFunc = logFactor;
        break;
      case "n":
        this.factorFunc = linearFactor;
        break;
      default:
        this.factorFunc = constFactor;
    }
  }

  factor(newSize: number): number {
    return this.factorFunc(newSize, this.size);
  }
}
