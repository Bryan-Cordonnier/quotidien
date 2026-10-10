import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import HorsBudget from "./HorsBudget.svelte";

mount(HorsBudget, { target: document.getElementById("app")! });