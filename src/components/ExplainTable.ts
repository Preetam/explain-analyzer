import m from "mithril";
import type { Table } from "../model/Table";

interface Attrs {
  tables: Table[];
}

export const ExplainTable: m.Component<Attrs> = {
  view({ attrs }) {
    return m("div", [
      m("h4", "Explain table"),
      m(
        "p",
        "Normalized view of table/relation access from the JSON explain output."
      ),
      m(
        "table",
        { class: "pure-table mea-explain-table" },
        [
          m(
            "thead",
            m("tr", [
              m("th", "Table"),
              m("th", "Access type"),
              m("th", "Possible indexes"),
              m("th", "Index"),
              m("th", "Index key length"),
              m("th", "Ref"),
              m("th", "Rows examined per scan"),
              m("th", "Filtered"),
              m("th", "Scalability"),
            ])
          ),
          m(
            "tbody",
            attrs.tables.map((o) =>
              m("tr", [
                m("td", o.name),
                m("td", o.accessType),
                m("td", o.possibleKeys ? o.possibleKeys.join(", ") : ""),
                m("td", o.key || ""),
                m("td", o.keyLength ?? ""),
                m("td", (o.ref || []).join(", ")),
                m("td", o.rows),
                m("td", o.filtered ?? ""),
                m("td", "O(" + o.scalability + ")"),
              ])
            )
          ),
        ]
      ),
    ]);
  },
};
