import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Concocter from "./Concocter.svelte";

mount(Concocter, { target: document.getElementById("app")! });
