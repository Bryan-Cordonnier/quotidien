import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Notes from "./Notes.svelte";

mount(Notes, { target: document.getElementById("app")! });
