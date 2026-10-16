import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Recettes from "./Recettes.svelte";

mount(Recettes, { target: document.getElementById("app")! });
