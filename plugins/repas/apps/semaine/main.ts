import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Semaine from "./Semaine.svelte";

mount(Semaine, { target: document.getElementById("app")! });
