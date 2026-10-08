import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Liste from "./Liste.svelte";

mount(Liste, { target: document.getElementById("app")! });