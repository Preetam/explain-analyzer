import m from "mithril";
import type { Dialect } from "../explain/types";
import type { Table } from "../model/Table";

interface Attrs {
  tables: Table[];
  dialect: Dialect;
}

function engineName(dialect: Dialect): string {
  return dialect === "mysql" ? "MySQL" : "PostgreSQL";
}

export const Comments: m.Component<Attrs> = {
  view({ attrs }) {
    const { tables, dialect } = attrs;
    const engine = engineName(dialect);

    const ftsTables = tables.filter((o) => o.fullTableScan);
    const fisTables = tables.filter((o) => o.fullIndexScan);
    const miscTables = tables.filter((o) => o.comment);

    const ftsSection =
      ftsTables.length === 0
        ? m("p", "No.")
        : [
            m("p", m("strong.mea-highlight", "Yes.")),
            m(
              "p",
              `The following tables are being accessed with a full table scan. ${engine} is reading all of the rows in these tables.`
            ),
            m(
              "ul",
              ftsTables.map((o) => {
                const rowsTag = o.rows > 10000 ? "strong.mea-highlight" : "strong";
                return m("li", [
                  "Table ",
                  m("strong", o.name),
                  " with ",
                  m(rowsTag, o.rows),
                  " rows examined per scan.",
                ]);
              })
            ),
          ];

    const fisSection =
      fisTables.length === 0
        ? m("p", "No.")
        : [
            m("p", m("strong.mea-highlight", "Yes.")),
            m(
              "p",
              `The following tables are being accessed with a full index scan. ${engine} is reading an entire index for these tables.`
            ),
            m(
              "ul",
              fisTables.map((o) =>
                m("li", [
                  "Table ",
                  m("strong", o.name),
                  " with index ",
                  m("strong", o.key || "(unknown)"),
                ])
              )
            ),
          ];

    const miscSection =
      miscTables.length === 0
        ? m("p", "No.")
        : [
            m("p", m("strong.mea-highlight", "Yes.")),
            m(
              "ul",
              miscTables.map((o) =>
                m("li", ["Table ", m("strong", o.name), ": ", o.comment])
              )
            ),
          ];

    return m("div", [
      m("h3.mea-comments-heading", "Comments"),
      m("h4.mea-comment-question", "Are there any full table scans?"),
      ftsSection,
      m("h4.mea-comment-question", "Are there any full index scans?"),
      fisSection,
      m("h4.mea-comment-question", "Is there anything else interesting?"),
      miscSection,
    ]);
  },
};
