import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Situation from "./Situation.svelte";

mount(Situation, { target: document.getElementById("app")! });
