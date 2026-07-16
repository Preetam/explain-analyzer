import m from "mithril";
import { BigOFactor } from "../model/BigOFactor";
import type { Table } from "../model/Table";

interface Attrs {
  tables: Table[];
}

export const TablesScalability: m.Component<Attrs> = {
  view({ attrs }) {
    let factor = 1;
    const bigOs = new Map<Table, BigOFactor>();

    for (const t of attrs.tables) {
      if (t.scalability !== "?") {
        bigOs.set(t, new BigOFactor(t.scalability, t.rows));
      }
    }

    return m("div", [
      m("h3", "What-if row scaling (experimental)"),
      m(
        "p.mea-scalability-explainer",
        "Estimate how query latency would change if a table grew. Enter a hypothetical row count for each table; the factor below compares the estimated cost at the new size to the current cost. O(n) tables scale linearly, O(log n) tables barely move."
      ),
      m("table.pure-table.pure-table-striped", [
        m(
          "thead",
          m("tr", [
            m("th", "Table"),
            m("th", "Current rows"),
            m("th", "Hypothetical rows"),
          ])
        ),
        m(
          "tbody",
          attrs.tables.map((o) => {
            const bigO = bigOs.get(o);
            if (bigO) {
              factor *= bigO.factor(o.newRows);
            }
            return m("tr", [
              m("td", o.name),
              m("td", o.rows.toLocaleString()),
              m("td", [
                m("input", {
                  value: o.newRows,
                  disabled: !bigO,
                  oninput: (e: Event) => {
                    o.setNewRows((e.target as HTMLInputElement).value);
                  },
                }),
              ]),
            ]);
          })
        ),
      ]),
      m("p", [
        "Estimated latency change: ",
        m("strong", "~", factor.toFixed(2), "x"),
        " relative to current row counts.",
      ]),
    ]);
  },
};
