// Las variantes «¿Y si…?» (spec 006): un conjunto de cambios sobre piezas de
// la serie, con nombre, guardado aparte en appDatos/<serie>/_variantes/.

import type { Pieza } from "../modelo/tipos";
import type { TipoPieza } from "../modelo/vocabulario";

export type EstadoVariante = "aparcada" | "aplicada" | "descartada";

export const ESTADOS_VARIANTE: readonly EstadoVariante[] = ["aparcada", "aplicada", "descartada"];

/** Una pieza que la variante cambia, crea o manda a la papelera */
export interface PiezaVariante {
  tipo: TipoPieza;
  /** La nota de la pieza en la serie (escribirPieza, sin wiki_mtime) cuando la variante la tocó; null = nueva */
  base: string | null;
  /** Cómo quedaría; null = a la papelera */
  pieza: Pieza | null;
}

export interface DatosVariante {
  id: string;
  nombre: string;
  estado: EstadoVariante;
  /** Fechas como «2026-10-21 18:20:05»; "" si no toca */
  creada: string;
  cambiada: string;
  aplicada: string;
  descartada: string;
  porque: string;
  /** Pieza desde la que se pulsó «Probar otra versión» (RF-3), o "" */
  origen: string;
  /** Pieza elegida al aparcarla (RF-5), o "" */
  elegida: string;
  piezas: Map<string, PiezaVariante>;
  /** Orden de las escenas de un episodio (o de la bandeja de una temporada) la primera vez que la variante lo tocó */
  sitios: Map<string, string[]>;
  /** Campos que pisan lo que cambió en la serie, con el valor de la serie (RF-30c) */
  pisa: Map<string, Record<string, unknown>>;
  /** Nombre de ficha elegido al pasar a borrador dentro de la variante */
  fichas: Map<string, string>;
}

/** Lo que se lee de una variante sin analizar sus bloques (al abrir la serie) */
export type CabeceraVariante = Omit<DatosVariante, "piezas"> & { piezas: string[] };

/** Lo que un paso de deshacer de la variante cambió de sus datos (solo las entradas tocadas) */
export interface MetaPaso {
  antes: ParteVariante;
  despues: ParteVariante;
}

export interface ParteVariante {
  piezas: Map<string, PiezaVariante | undefined>;
  sitios: Map<string, string[] | undefined>;
  pisa: Map<string, Record<string, unknown> | undefined>;
  fichas: Map<string, string | undefined>;
}

export type Choque =
  | { clase: "pieza"; id: string; soloSerie: string[]; dosLados: string[]; porDentro: boolean; yaNoEsta: boolean; yaExiste: boolean }
  | { clase: "sitio"; contenedor: string; yaNoEsta: boolean }
  | { clase: "referencia"; id: string; apunta: string };

/** Una variante vacía, recién creada */
export function variante(id: string, nombre: string, ahora: string, origen = ""): DatosVariante {
  return {
    id,
    nombre,
    estado: "aparcada",
    creada: ahora,
    cambiada: ahora,
    aplicada: "",
    descartada: "",
    porque: "",
    origen,
    elegida: origen,
    piezas: new Map(),
    sitios: new Map(),
    pisa: new Map(),
    fichas: new Map(),
  };
}
