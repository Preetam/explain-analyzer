import m from "mithril";
import type { Finding, Severity } from "../explain/types";
import { sortBySeverity } from "../explain/findings";

interface Attrs {
  findings: Finding[];
}

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "mea-finding-critical",
  warning: "mea-finding-warning",
  info: "mea-finding-info",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Note",
};

export const Comments: m.Component<Attrs> = {
  view({ attrs }) {
    const ranked = sortBySeverity(attrs.findings);

    if (ranked.length === 0) {
      return m("div.mea-comments", [
        m("h3.mea-comments-heading", "Findings"),
        m("p.mea-comments-empty", "No concerns found. The plan looks healthy."),
      ]);
    }

    return m("div.mea-comments", [
      m("h3.mea-comments-heading", "Findings"),
      m(
        "ul.mea-findings",
        ranked.map((f) =>
          m(`li.mea-finding.${SEVERITY_CLASS[f.severity]}`, [
            m("span.mea-finding-badge", SEVERITY_LABEL[f.severity]),
            m("div.mea-finding-body", [
              m("div.mea-finding-title", f.title),
              m("div.mea-finding-detail", f.detail),
            ]),
          ])
        )
      ),
    ]);
  },
};
