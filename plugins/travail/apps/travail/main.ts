import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Travail from "./Travail.svelte";

mount(Travail, { target: document.getElementById("app")! });