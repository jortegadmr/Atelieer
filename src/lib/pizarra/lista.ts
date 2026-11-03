// Los textos de «Ver como lista» y de los anuncios a un lector de pantalla (spec
// 012, RF-12). Aquí solo hay frases: la interfaz las pone en su región de estado.

import { cortarGrafemas } from "./texto";
import { ETIQUETA_TIPO, type VistaTarjeta } from "./resolver";
import { COLORES, type Elemento, type Flecha } from "./tipos";

const nombreColor = (id: string) => (COLORES.find((c) => c.id === id)?.nombre ?? id).toLowerCase();

/** Cómo se nombra un elemento dentro de una frase: la nota por su primera línea, la tarjeta por su pieza */
export function nombreElemento(e: Elemento | undefined, v?: VistaTarjeta): string {
  if (!e) return "un elemento que ya no está";
  if (e.tipo === "nota") {
    const linea = e.texto.split("\n").find((l) => l.trim())?.trim() ?? "";
    return linea ? `la nota «${cortarGrafemas(linea, 30).texto}»` : "una nota vacía";
  }
  return `la tarjeta «${v?.titulo ?? "pieza"}»`;
}

/** La fila de un elemento en la lista: qué es y qué lleva */
export function filaElemento(e: Elemento, v?: VistaTarjeta): string {
  if (e.tipo === "nota") {
    const linea = e.texto.split("\n").find((l) => l.trim())?.trim() ?? "";
    return linea ? `Nota ${nombreColor(e.color)}: «${cortarGrafemas(linea, 80).texto}»` : `Nota ${nombreColor(e.color)} vacía`;
  }
  if (!v || v.estado === "ausente") return `Tarjeta: ${v?.titulo ?? "(pieza no encontrada)"}`;
  const tipo = v.tipo ? ETIQUETA_TIPO[v.tipo] : "Pieza";
  return `Tarjeta de ${tipo.toLowerCase()}${v.detalle ? ` · ${v.detalle}` : ""}: ${v.titulo}${v.estado === "descartada" ? " (descartada)" : ""}`;
}

/** La fila de una flecha: de dónde a dónde, con su etiqueta si la tiene */
export function filaFlecha(f: Flecha, de: string, a: string): string {
  return `De ${de} a ${a}${f.etiqueta ? ` · «${f.etiqueta}»` : ""}`;
}

export const anuncios = {
  movido: (e: Elemento) => (e.tipo === "tarjeta" ? "Tarjeta movida" : "Nota movida"),
  notaCreada: () => "Nota creada",
  tarjetaAnadida: () => "Tarjeta añadida",
  flechaCreada: (de: string, a: string) => `Flecha creada de ${de} a ${a}`,
  etiquetada: (etiqueta: string) => (etiqueta ? `Etiqueta «${etiqueta}»` : "Etiqueta quitada"),
  coloreada: (color: string) => `Color ${nombreColor(color)}`,
  /** Lo que se quitó y cuántas flechas se fueron con ello (RF-8) */
  quitado: (que: "nota" | "tarjeta" | "flecha", flechas: number) => {
    const base = que === "nota" ? "Nota quitada" : que === "tarjeta" ? "Tarjeta quitada" : "Flecha quitada";
    return flechas ? `${base}. ${flechas === 1 ? "Se quitó 1 flecha" : `Se quitaron ${flechas} flechas`}.` : `${base}.`;
  },
} as const;
