import { getContext, setContext } from "svelte";
import type { EstadoApp } from "./estado.svelte";

const CLAVE = Symbol("estado");

export function darEstado(e: EstadoApp) {
  setContext(CLAVE, e);
}

export function usarEstado(): EstadoApp {
  return getContext<EstadoApp>(CLAVE);
}
