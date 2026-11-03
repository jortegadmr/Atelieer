// Crear en cada nivel (spec 002): la barra «Nuevo…», la ventana «Nueva pieza»
// y la captura rápida de ideas. Usa las operaciones de la v1: lo creado son
// piezas de la v1 en estado idea, y la sesión las aplica como cualquier cambio.

import type { Cambio, Modelo } from "../modelo/modelo";
import { crearArco, crearEvento, crearSecreto, crearTemporada, crearTramo, insertarEpisodio } from "../modelo/operaciones";
import * as c from "../modelo/consultas";
import type { Pieza } from "../modelo/tipos";
import type { TipoArco } from "../modelo/vocabulario";
import { crearEscena, type ActoVisor } from "./actos";
import { nivelValido, type Nivel } from "./visor";

export type QueCrear = "temporada" | "trama" | "secreto" | "idea" | "episodio" | "trama-temporada" | "evento";

export interface OpcionNuevo {
  que: QueCrear;
  nombre: string;
  /** Por qué no se puede crear ahora (canon bloqueado, RF-33) */
  bloqueo?: string;
}

export const AVISO_CANON = "Es canon: desbloquéala para añadir";

const NOMBRE: Record<QueCrear, string> = {
  temporada: "Temporada",
  trama: "Trama",
  secreto: "Secreto",
  idea: "Idea",
  episodio: "Episodio",
  "trama-temporada": "Trama de temporada",
  evento: "Escena",
};

/** Lo que se puede crear en el nivel (RF-26) y si el canon lo impide (RF-33, RF-34) */
export function opcionesNuevo(_m: Modelo, n: Nivel, bloqueada: (id: string) => boolean): OpcionNuevo[] {
  const lista: QueCrear[] =
    n.tipo === "serie" ? ["temporada", "trama", "secreto", "idea"] : n.tipo === "temporada" ? ["episodio", "trama-temporada", "secreto", "idea"] : ["evento", "idea"];
  return lista.map((que) => {
    const o: OpcionNuevo = { que, nombre: NOMBRE[que] };
    // Crear dentro de una pieza canon bloqueada la cambia por dentro
    if (que === "episodio" && n.tipo !== "serie" && bloqueada(n.temporada)) o.bloqueo = AVISO_CANON;
    if (que === "evento" && n.tipo === "episodio" && bloqueada(n.episodio)) o.bloqueo = AVISO_CANON;
    return o;
  });
}

export interface DatosNueva {
  titulo?: string;
  /** Trama, personaje o relación (RF-29) */
  tipoArco?: TipoArco;
  /** Tramo en la temporada actual de esta trama de serie (RF-30) */
  tramoDe?: string;
  /** Acto de la escena; "" = Sin acto (spec 003, RF-36) */
  acto?: ActoVisor;
}

/** Crea la pieza en estado idea donde toca según el nivel (RF-31, RF-32) */
export function crearPieza(m: Modelo, n: Nivel, que: Exclude<QueCrear, "idea">, datos: DatosNueva = {}): { pieza: Pieza; cambio: Cambio } {
  const titulo = (datos.titulo ?? "").trim();
  const temporada = n.tipo === "serie" ? "" : n.temporada;
  const exige = (x: string, que: string) => {
    if (!x) throw new Error(`Para crear ${que} hace falta estar en su nivel.`);
    return x;
  };
  switch (que) {
    case "temporada":
      return crearTemporada(m, { titulo, madurez: "idea" });
    case "trama":
      return crearArco(m, { titulo, madurez: "idea", nivel: "serie", tipo_arco: datos.tipoArco ?? "trama" });
    case "trama-temporada": {
      const t = exige(temporada, "una trama de temporada");
      if (datos.tramoDe) {
        const r = crearTramo(m, datos.tramoDe, t);
        // La pieza es la misma que va en el cambio: el título elegido manda
        if (titulo) (r.pieza as { titulo: string }).titulo = titulo;
        return r;
      }
      return crearArco(m, { titulo, madurez: "idea", nivel: "temporada", temporada: t, tipo_arco: datos.tipoArco ?? "trama", tipo_trama: "B" });
    }
    case "secreto":
      return crearSecreto(m, { titulo, madurez: "idea" });
    case "episodio": {
      const t = exige(temporada, "un episodio");
      return insertarEpisodio(m, t, c.episodiosDeTemporada(m, t).length, { titulo, madurez: "idea" });
    }
    case "evento": {
      if (n.tipo !== "episodio") throw new Error("Para crear una escena hace falta estar en un episodio.");
      // Al final de su acto, con el episodio numerado por actos (spec 003, RF-37)
      return crearEscena(m, n.episodio, datos.acto ?? "", { titulo, madurez: "idea" });
    }
  }
}

export const MAXIMO_IDEA = 300;
// Saltos de línea, tabuladores y demás caracteres de control (también U+2028 y U+2029)
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/gu;

/**
 * El título de una idea tal cual, con los saltos y los controles cambiados por
 * espacios (RF-45) y como mucho 300 caracteres visibles, sin partir un emoji
 * ni una letra con acento combinado (RF-46). Vacío o solo espacios: null (RF-41).
 */
export function limpiarIdea(texto: string): { titulo: string; recortada: boolean } | null {
  const limpio = texto.replace(CONTROL, " ").trim();
  if (!limpio) return null;
  const letras = Array.from(new Intl.Segmenter("es", { granularity: "grapheme" }).segment(limpio), (s) => s.segment);
  if (letras.length <= MAXIMO_IDEA) return { titulo: limpio, recortada: false };
  return { titulo: letras.slice(0, MAXIMO_IDEA).join("").trimEnd(), recortada: true };
}

export type DestinoIdea = { temporada: string; episodio: string; donde: string } | { error: string };

/** Dónde va una idea según el nivel en el momento de guardarla (RF-39, RF-40) */
export function destinoIdea(m: Modelo, nivel: Nivel, bloqueada: (id: string) => boolean): DestinoIdea {
  // Si la pieza del nivel ya no está, vale el primer nivel válido (caso límite)
  const n = nivelValido(m, nivel);
  const bandeja = (t: string): DestinoIdea => ({ temporada: t, episodio: "", donde: `Idea en la bandeja de ${c.codigo(m, t)}` });
  if (n.tipo === "episodio") {
    if (bloqueada(n.episodio)) return bandeja(n.temporada);
    return { temporada: n.temporada, episodio: n.episodio, donde: `Idea al final de ${c.codigo(m, n.episodio)}` };
  }
  if (n.tipo === "temporada") return bandeja(n.temporada);
  const ts = c.temporadasEnOrden(m);
  const t = ts.find((x) => x.estado === "en marcha") ?? ts.at(-1);
  return t ? bandeja(t.id) : { error: "Crea primero una temporada" };
}

/** La idea como evento de la v1 en estado idea, al final de su sitio (RF-38) */
export function crearIdea(
  m: Modelo,
  nivel: Nivel,
  texto: string,
  bloqueada: (id: string) => boolean,
): { pieza: Pieza; cambio: Cambio; donde: string; recortada: boolean } | { error: string } | null {
  const limpia = limpiarIdea(texto);
  if (!limpia) return null;
  const destino = destinoIdea(m, nivel, bloqueada);
  if ("error" in destino) return destino;
  const { pieza, cambio } = crearEvento(m, { titulo: limpia.titulo, madurez: "idea", temporada: destino.temporada, episodio: destino.episodio });
  return { pieza, cambio, donde: destino.donde, recortada: limpia.recortada };
}
