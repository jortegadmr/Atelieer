import { mount } from "svelte";
import "./estilo/tokens.css";
import "./estilo/componentes.css";
import "./vistas/comunes/madurez.css";
import App from "./App.svelte";

const app = mount(App, { target: document.getElementById("app")! });

export default app;
