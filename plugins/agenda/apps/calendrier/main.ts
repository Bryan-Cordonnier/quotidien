import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Calendrier from "./Calendrier.svelte";

mount(Calendrier, { target: document.getElementById("app")! });