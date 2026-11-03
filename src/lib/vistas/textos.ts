// Textos cortos que repiten varias vistas.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Arco, ParCarga, Posicion } from "../modelo/tipos";
import { etiqueta, TIPO_ARCO } from "../modelo/vocabulario";

/** "T01 · E02", "T02" o "" (como "T1 · E01" en la maqueta, con los códigos de la Guía §6) */
export function donde(m: Modelo, pos: Pick<Posicion, "temporada" | "episodio">): string {
  if (pos.episodio) {
    const cod = c.codigo(m, pos.episodio);
    if (cod) return `${cod.slice(0, 3)} · ${cod.slice(3)}`;
  }
  return c.codigo(m, pos.temporada);
}

export const mayus = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Línea pequeña de un arco en las listas: "Tramo de El eco · T01", "Trama de serie"… */
export function subtituloArco(m: Modelo, a: Arco): string {
  const padre = a.tramo_de ? m.arcos.get(a.tramo_de) : undefined;
  const temp = a.nivel === "temporada" ? c.codigo(m, a.temporada) : "";
  if (padre) return `Tramo de ${padre.titulo || "sin título"}${temp ? ` · ${temp}` : ""}`;
  const tipo = a.tipo_arco === "trama" ? "Trama" : `Arco de ${etiqueta(TIPO_ARCO, a.tipo_arco)}`;
  if (a.nivel === "serie") return a.tipo_arco === "trama" ? `${tipo} de serie` : tipo;
  return `${tipo} de temporada${temp ? ` · ${temp}` : ""}`;
}

/** Nombre limpio de un enlace: "[[Telmo]]" → "Telmo" */
export function sinCorchetes(enlace: string): string {
  return enlace.replace(/^\s*\[\[|\]\]\s*$/g, "").trim();
}

/** "Telmo, Nando" → ["[[Telmo]]", "[[Nando]]"] */
export function aEnlaces(texto: string): string[] {
  return texto
    .split(/[,;]| y /)
    .map((x) => sinCorchetes(x))
    .filter(Boolean)
    .map((x) => `[[${x}]]`);
}

/** Un valor de la carga: "+", "−" o "?" sin decidir */
export const signoCarga = (v: string) => (v === "+" ? "+" : v === "-" ? "−" : "?");

/** «+ → −», como en la tarjeta del visor; "" si no hay ninguno de los dos */
export function textoCarga(carga: ParCarga): string {
  return carga[0] || carga[1] ? `${signoCarga(carga[0])} → ${signoCarga(carga[1])}` : "";
}
