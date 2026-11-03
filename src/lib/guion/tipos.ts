// El guion de una escena (spec 013): un dato de la serie, no una pieza. Vive en
// una nota por escena, dentro de la mesa de borradores, en una carpeta con guion
// bajo que la v1.0 no recorre.

import { FORMA_ESCENA } from "../modelo/viene-de";

/** Versión del formato que escribe esta app; una mayor se abre en solo lectura */
export const VERSION_GUION = 1;

/** Más de esto en un fichero de guion no se edita (RNF-12) */
export const TOPE_BYTES = 1_048_576;
export const TOPE_PAGINAS = 500;

/** Cambios de más de esto de una vez piden copia previa (RF-30) */
export const TOPE_BORRADO = 500;

export type TipoLinea = "encabezado" | "accion" | "personaje" | "parentesis" | "dialogo" | "transicion" | "blanco";

/**
 * Medidas del formato estándar de guion: Courier 12 (10 caracteres por pulgada,
 * 6 líneas por pulgada) sobre Letter. Única fuente de verdad: `medir` y la
 * interfaz (que genera de aquí sus anchos en `ch`) las leen de aquí.
 */
export const MEDIDAS = {
  lineasPagina: 55,
  segundosPagina: 60,
  ancho: { encabezado: 60, accion: 60, personaje: 35, parentesis: 25, dialogo: 35, transicion: 60, blanco: 60 } as Record<TipoLinea, number>,
  sangria: { encabezado: 0, accion: 0, personaje: 22, parentesis: 16, dialogo: 10, transicion: 0, blanco: 0 } as Record<TipoLinea, number>,
} as const;

export interface Guion {
  /** Id de la escena a la que pertenece (de la cabecera); "" si el fichero no lo dice */
  escena: string;
  version: number;
  /** El texto del guion, con saltos de línea \n (el estilo del fichero va aparte) */
  texto: string;
  /** Campos de la cabecera que la app no entiende: se conservan */
  extra: Record<string, unknown>;
  finDeLinea: "\n" | "\r\n";
  /** El fichero llevaba marca de orden de bytes */
  bom: boolean;
}

export function vacio(escena = ""): Guion {
  return { escena, version: VERSION_GUION, texto: "", extra: {}, finDeLinea: "\n", bom: false };
}

/** ¿Es un id que se puede usar para construir la ruta de un guion? */
export const esIdEscena = (id: unknown): id is string => typeof id === "string" && FORMA_ESCENA.test(id);

/** «Con guion»: hay algún carácter que no es un blanco */
export const conGuion = (g: Pick<Guion, "texto">): boolean => /\S/.test(g.texto);
