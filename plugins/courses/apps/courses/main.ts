import "@etabli/sdk/base.css";
import "@etabli/ui/kit.css";
import { mount } from "svelte";
import Courses from "./Courses.svelte";

mount(Courses, { target: document.getElementById("app")! });