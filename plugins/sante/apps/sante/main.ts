import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Sante from "./Sante.svelte";

mount(Sante, { target: document.getElementById("app")! });
