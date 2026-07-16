import m from "mithril";
import type { Dialect } from "../explain/types";
import type { Table } from "../model/Table";

interface Attrs {
  tables: Table[];
  dialect: Dialect;
}

interface Column {
  key: string;
  label: string;
  render: (t: Table) => m.Children;
  /** Highlight cells that warrant attention. */
  warn?: (t: Table) => boolean;
}

const columnsFor = (dialect: Dialect): Column[] => {
  const cols: Column[] = [
    {
      key: "name",
      label: "Table",
      render: (t) => t.name,
    },
    {
      key: "accessType",
      label: "Access type",
      render: (t) => t.accessType,
      warn: (t) => t.fullTableScan || t.fullIndexScan,
    },
  ];

  if (dialect === "mysql") {
    cols.push(
      {
        key: "possibleKeys",
        label: "Possible indexes",
        render: (t) => (t.possibleKeys ? t.possibleKeys.join(", ") : ""),
      },
      {
        key: "key",
        label: "Index",
        render: (t) => t.key || "",
      },
      {
        key: "keyLength",
        label: "Index key length",
        render: (t) => t.keyLength ?? "",
      },
      {
        key: "ref",
        label: "Ref",
        render: (t) => (t.ref || []).join(", "),
      }
    );
  } else {
    cols.push({
      key: "key",
      label: "Index",
      render: (t) => t.key || "",
    });
  }

  cols.push({
    key: "rows",
    label: "Rows examined per scan",
    render: (t) => t.rows.toLocaleString(),
    warn: (t) => t.rows > 100_000,
  });

  if (dialect === "mysql") {
    cols.push({
      key: "filtered",
      label: "Filtered",
      render: (t) => t.filtered ?? "",
    });
  }

  // Actual time and rows removed appear only when EXPLAIN ANALYZE was used
  // (Postgres) — we detect by presence on any row.
  const anyActualTime = true; // column is harmless if empty
  void anyActualTime;

  cols.push({
    key: "actualTimeMs",
    label: "Actual time",
    render: (t) => (t.actualTimeMs != null ? `${t.actualTimeMs.toFixed(1)}ms` : "—"),
    warn: (t) => t.actualTimeMs != null && t.actualTimeMs >= 100,
  });

  cols.push({
    key: "scalability",
    label: "Scalability",
    render: (t) => "O(" + t.scalability + ")",
    warn: (t) => t.scalability === "n",
  });

  return cols;
};

export const ExplainTable: m.Component<Attrs> = {
  view({ attrs }) {
    const cols = columnsFor(attrs.dialect);
    const hasActualTime = attrs.tables.some((t) => t.actualTimeMs != null);
    const hasRowsRemoved = attrs.tables.some((t) => t.rowsRemovedByFilter != null);

    const visibleCols = cols.filter((c) => {
      if (c.key === "actualTimeMs" && !hasActualTime) return false;
      // rowsRemoved column is added separately below if present
      return true;
    });

    if (hasRowsRemoved) {
      // Insert a Rows removed column before scalability
      const scalIdx = visibleCols.findIndex((c) => c.key === "scalability");
      visibleCols.splice(scalIdx, 0, {
        key: "rowsRemovedByFilter",
        label: "Rows removed by filter",
        render: (t) =>
          t.rowsRemovedByFilter != null
            ? t.rowsRemovedByFilter.toLocaleString()
            : "—",
        warn: (t) =>
          t.rowsRemovedByFilter != null &&
          t.rows > 0 &&
          t.rowsRemovedByFilter / t.rows >= 10,
      });
    }

    return m("div", [
      m("h4", "Explain table"),
      m(
        "p",
        "Normalized view of table/relation access from the JSON explain output."
      ),
      m(
        "table",
        { class: "pure-table pure-table-striped mea-explain-table" },
        [
          m(
            "thead",
            m("tr", visibleCols.map((c) => m("th", c.label)))
          ),
          m(
            "tbody",
            attrs.tables.map((o) =>
              m(
                "tr",
                visibleCols.map((c) =>
                  m(
                    "td",
                    { class: c.warn && c.warn(o) ? "mea-cell-warn" : "" },
                    c.render(o)
                  )
                )
              )
            )
          ),
        ]
      ),
    ]);
  },
};
