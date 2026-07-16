import m from "mithril";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("#app not found");
}

m.mount(root, App);
