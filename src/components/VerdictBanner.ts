import m from "mithril";
import type { Verdict } from "../explain/verdict";

interface Attrs {
  verdict: Verdict;
}

const SEVERITY_CLASS: Record<Verdict["severity"], string> = {
  critical: "mea-verdict-critical",
  warning: "mea-verdict-warning",
  info: "mea-verdict-info",
  ok: "mea-verdict-ok",
};

const SEVERITY_LABEL: Record<Verdict["severity"], string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Notes",
  ok: "Healthy",
};

export const VerdictBanner: m.Component<Attrs> = {
  view({ attrs }) {
    const { verdict } = attrs;
    return m(`div.mea-verdict.${SEVERITY_CLASS[verdict.severity]}`, [
      m("span.mea-verdict-badge", SEVERITY_LABEL[verdict.severity]),
      m("div.mea-verdict-text", [
        m("h2.mea-verdict-headline", verdict.headline),
        m("p.mea-verdict-detail", verdict.detail),
      ]),
    ]);
  },
};
