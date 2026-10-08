import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Resume from "./Resume.svelte";

mount(Resume, { target: document.getElementById("app")! });
