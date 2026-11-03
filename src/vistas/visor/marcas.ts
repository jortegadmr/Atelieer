// Las marcas de «Si lo dejas así…» en el visor (spec 005, RF-27, RF-28): las
// calcula el visor una vez y las leen sus columnas, también las de los actos y
// la bandeja. Sin la pestaña abierta, null: el visor se ve como siempre.

import { getContext, setContext } from "svelte";
import type { MarcasVisor } from "../../lib/consecuencias/visor";

const CLAVE = Symbol("marcas-visor");

export const ponerMarcas = (f: () => MarcasVisor | null) => setContext(CLAVE, f);

export const usarMarcas = (): (() => MarcasVisor | null) => getContext<(() => MarcasVisor | null) | undefined>(CLAVE) ?? (() => null);
