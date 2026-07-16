import m from "mithril";
import { dialectLabel, type ParsedExplain } from "../explain";
import { Table } from "../model/Table";
import { Comments } from "./Comments";
import { ExplainTable } from "./ExplainTable";
import { TablesScalability } from "./TablesScalability";

interface Attrs {
  explain: ParsedExplain;
}

interface State {
  explain: ParsedExplain | null;
  tables: Table[];
}

function syncTables(state: State, explain: ParsedExplain) {
  if (state.explain === explain) {
    return;
  }
  state.explain = explain;
  state.tables = explain.tables.map((t) => new Table(t));
}

export const Analysis: m.Component<Attrs, State> = {
  oninit({ attrs, state }) {
    state.explain = null;
    state.tables = [];
    syncTables(state, attrs.explain);
  },
  onbeforeupdate({ attrs, state }) {
    syncTables(state, attrs.explain);
  },
  view({ attrs, state }) {
    return m("div", [
      m("h2.mea-analysis-heading", [
        "Analysis",
        m("span.mea-dialect", dialectLabel(attrs.explain.dialect)),
      ]),
      m(ExplainTable, { tables: state.tables }),
      m(Comments, { tables: state.tables, dialect: attrs.explain.dialect }),
      m(TablesScalability, { tables: state.tables }),
    ]);
  },
};
