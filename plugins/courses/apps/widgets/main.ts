import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Widgets from "./Widgets.svelte";

mount(Widgets, { target: document.getElementById("app")! });
