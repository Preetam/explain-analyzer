import m from "mithril";
import { dialectLabel, type ParsedExplain } from "../explain";
import { buildVerdict } from "../explain/verdict";
import { Table } from "../model/Table";
import { Comments } from "./Comments";
import { ExplainTable } from "./ExplainTable";
import { TablesScalability } from "./TablesScalability";
import { VerdictBanner } from "./VerdictBanner";

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
    const verdict = buildVerdict(
      attrs.explain.dialect,
      attrs.explain.tables,
      attrs.explain.findings
    );
    return m("div", [
      m("h2.mea-analysis-heading", [
        "Analysis",
        m("span.mea-dialect", dialectLabel(attrs.explain.dialect)),
      ]),
      m(VerdictBanner, { verdict }),
      m(ExplainTable, {
        tables: state.tables,
        dialect: attrs.explain.dialect,
      }),
      m(Comments, { findings: attrs.explain.findings }),
      m(TablesScalability, { tables: state.tables }),
    ]);
  },
};
