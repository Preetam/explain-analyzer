import type { NormalizedTable, Scalability } from "../explain/types";

/** Mutable analysis row wrapping a normalized explain table. */
export class Table {
  name: string;
  rows: number;
  newRows: number;
  accessType: string;
  key: string | null;
  possibleKeys: string[] | null;
  keyLength: string | number | null;
  ref: string[] | null;
  filtered: string | number | null;
  scalability: Scalability;
  fullTableScan: boolean;
  fullIndexScan: boolean;
  comment: string;
  actualTimeMs: number | null;
  rowsRemovedByFilter: number | null;

  constructor(normalized: NormalizedTable) {
    this.name = normalized.name;
    this.rows = normalized.rows;
    this.newRows = normalized.rows;
    this.accessType = normalized.accessType;
    this.key = normalized.key;
    this.possibleKeys = normalized.possibleKeys;
    this.keyLength = normalized.keyLength;
    this.ref = normalized.ref;
    this.filtered = normalized.filtered;
    this.scalability = normalized.scalability;
    this.fullTableScan = normalized.fullTableScan;
    this.fullIndexScan = normalized.fullIndexScan;
    this.comment = normalized.comment;
    this.actualTimeMs = normalized.actualTimeMs;
    this.rowsRemovedByFilter = normalized.rowsRemovedByFilter;
  }

  setNewRows = (value: string) => {
    if (value === "") {
      this.newRows = 0;
      return;
    }
    this.newRows = parseInt(value, 10) || 0;
  };
}
