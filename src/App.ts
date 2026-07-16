import m from "mithril";
import { parseExplain, type ParsedExplain } from "./explain";
import { Analysis } from "./components/Analysis";
import { ErrorMessage } from "./components/ErrorMessage";
import {
  MYSQL_EXAMPLE,
  POSTGRES_EXAMPLE,
  POSTGRES_ANALYZE_EXAMPLE,
} from "./examples";

interface State {
  fieldData: string;
  explain: ParsedExplain | null;
  error: { heading: string; body: string } | null;
  analyze: (e?: Event) => void;
  loadExample: (data: string) => void;
}

const PLACEHOLDER = `{
  "query_block": { ... }
}

— or —

[
  {
    "Plan": {
      "Node Type": "Seq Scan",
      ...
    }
  }
]`;

export const App: m.Component<Record<string, never>, State> = {
  oninit({ state }) {
    state.fieldData = "";
    state.explain = null;
    state.error = null;

    state.analyze = function (this: State, e?: Event) {
      e?.preventDefault();
      try {
        const data = JSON.parse(this.fieldData);
        this.explain = parseExplain(data);
        this.error = null;
      } catch (err) {
        this.explain = null;
        this.error = {
          heading: "Error parsing explain JSON",
          body: err instanceof Error ? err.message : String(err),
        };
      }
    }.bind(state);

    state.loadExample = function (this: State, data: string) {
      this.fieldData = data;
      this.analyze();
    }.bind(state);
  },

  view({ state }) {
    return m("div", [
      m("form.pure-form.pure-form-stacked", { onsubmit: state.analyze }, [
        m("fieldset.pure-group", [
          m("textarea.explain-input.pure-input-2-3", {
            placeholder: PLACEHOLDER,
            value: state.fieldData,
            oninput: (e: Event) => {
              state.fieldData = (e.target as HTMLTextAreaElement).value;
            },
          }),
          m(
            "span.pure-form-message.mea-explain-input-message",
            "Paste MySQL EXPLAIN FORMAT=JSON or PostgreSQL EXPLAIN (FORMAT JSON) output"
          ),
        ]),
        m("fieldset.pure-group.mea-examples", [
          m(
            "button.pure-button.pure-button-primary",
            { type: "submit" },
            "Analyze"
          ),
          m("span.mea-examples-label", "Try:"),
          m(
            "button.pure-button.mea-example-btn",
            {
              type: "button",
              onclick: () => state.loadExample(MYSQL_EXAMPLE),
            },
            "MySQL"
          ),
          m(
            "button.pure-button.mea-example-btn",
            {
              type: "button",
              onclick: () => state.loadExample(POSTGRES_EXAMPLE),
            },
            "PostgreSQL"
          ),
          m(
            "button.pure-button.mea-example-btn",
            {
              type: "button",
              onclick: () => state.loadExample(POSTGRES_ANALYZE_EXAMPLE),
            },
            "PostgreSQL ANALYZE"
          ),
        ]),
      ]),
      state.error
        ? m(ErrorMessage, {
            heading: state.error.heading,
            body: state.error.body,
          })
        : null,
      state.explain ? m(Analysis, { explain: state.explain }) : null,
    ]);
  },
};
