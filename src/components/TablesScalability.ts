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
      m("h3", "Estimation (experimental!)"),
      m("table.pure-table", [
        m(
          "thead",
          m("tr", [
            m("th", "Table"),
            m("th", "Row count"),
            m("th", "Estimated row count or scale factor"),
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
              m("td", o.rows),
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
      m("p", ["Latency scale factor: ", m("strong", "~", factor.toFixed(2), "x")]),
    ]);
  },
};
