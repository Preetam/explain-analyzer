import m from "mithril";

interface Attrs {
  heading: string;
  body: string;
}

export const ErrorMessage: m.Component<Attrs> = {
  view({ attrs }) {
    return m("div.error-message", [m("h2", attrs.heading), m("p", attrs.body)]);
  },
};
