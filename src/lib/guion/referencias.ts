// Referencias a fichas de la wiki dentro del guion (spec 013, RF-11 a RF-19).
// En disco son enlaces de Obsidian: [[Vera]], [[Vera|la Gaviota]] y, si dos
// fichas se llaman igual, [[01_Wiki/Personajes/Vera|Vera]]. Se resuelven SOLO
// contra las fichas que la app ya leyó: nunca se arma una ruta ni una dirección
// con el texto del autor (RF-17).

import type { Ficha } from "../wiki/fichas";
import { clave } from "../wiki/md";

export type Ref = { t: "ref"; nombre: string; alias?: string; ruta?: string; crudo: string };
export type Segmento = { t: "texto"; s: string } | Ref;

const MAX_REF = 300;

function leerRef(contenido: string, crudo: string): Ref | null {
  if (!contenido.trim()) return null;
  const barra = contenido.indexOf("|");
  const destino = (barra === -1 ? contenido : contenido.slice(0, barra)).split("#")[0]!.trim();
  const alias = barra === -1 ? undefined : contenido.slice(barra + 1).trim() || undefined;
  if (!destino) return null;
  if (destino.includes("/") || destino.includes("\\")) {
    const ruta = destino.replace(/\\/g, "/").replace(/\.md$/i, "");
    const nombre = ruta.slice(ruta.lastIndexOf("/") + 1).trim();
    if (!nombre) return null;
    return { t: "ref", nombre, alias, ruta, crudo };
  }
  return { t: "ref", nombre: destino, alias, crudo };
}

/** Parte un texto en trozos de texto y referencias; `[[` sin cerrar, o con salto dentro, es texto */
export function partir(texto: string): Segmento[] {
  const r: Segmento[] = [];
  let desde = 0;
  let i = 0;
  const volcar = (hasta: number) => {
    if (hasta > desde) r.push({ t: "texto", s: texto.slice(desde, hasta) });
  };
  while (i < texto.length) {
    const abre = texto.indexOf("[[", i);
    if (abre === -1) break;
    const cierra = texto.indexOf("]]", abre + 2);
    if (cierra === -1) break;
    const dentro = texto.slice(abre + 2, cierra);
    const ref = dentro.length <= MAX_REF && !/[\n\r]|\[\[/.test(dentro) ? leerRef(dentro, texto.slice(abre, cierra + 2)) : null;
    if (!ref) {
      i = abre + 2;
      continue;
    }
    volcar(abre);
    r.push(ref);
    desde = i = cierra + 2;
  }
  volcar(texto.length);
  return r;
}

export function unir(segmentos: Segmento[]): string {
  return segmentos.map((s) => (s.t === "texto" ? s.s : s.crudo)).join("");
}

const sinMd = (r: string) => r.replace(/\.md$/i, "").toLowerCase();

/** Las fichas a las que puede apuntar una referencia: una, varias (ambigua) o ninguna */
export function candidatas(ref: Ref, fichas: Ficha[]): Ficha[] {
  if (ref.ruta) {
    // Una ruta que sale de la wiki o es relativa no apunta a nada (RF-17)
    if (ref.ruta.split("/").some((t) => t === ".." || t === ".")) return [];
    const exacta = fichas.filter((f) => sinMd(f.ruta) === ref.ruta!.toLowerCase());
    if (exacta.length) return exacta;
  }
  const q = clave(ref.nombre);
  return q ? fichas.filter((f) => [f.nombre, ...f.aliases].some((n) => clave(n) === q)) : [];
}

/** La ficha de una referencia; null si no hay ninguna o si es ambigua */
export function resolver(ref: Ref, fichas: Ficha[]): Ficha | null {
  const c = candidatas(ref, fichas);
  return c.length === 1 ? c[0]! : null;
}

/**
 * Lo que se escribe para una ficha elegida: el nombre, o la ruta si otra ficha
 * se llama o tiene un alias igual (para que la referencia no sea ambigua).
 */
export function construir(ficha: Ficha, fichas: Ficha[], alias?: string): string {
  const q = clave(ficha.nombre);
  const repetida = fichas.some((f) => f !== ficha && [f.nombre, ...f.aliases].some((n) => clave(n) === q));
  const a = alias && clave(alias) !== q ? alias : undefined;
  if (repetida) return `[[${ficha.ruta.replace(/\.md$/i, "")}|${a ?? ficha.nombre}]]`;
  return a ? `[[${ficha.nombre}|${a}]]` : `[[${ficha.nombre}]]`;
}

const EXTENSION = /\s*\((?:V\.?\s?O\.?|O\.?\s?S\.?|O\.?\s?C\.?|CONT["']?D\.?|CONT\.?)\)\s*$/i;

/** Un personaje por su nombre normalizado: sin extensiones (V.O.), tildes ni caja (RF-19) */
export function agrupar(nombre: string): string {
  let t = nombre.trim();
  for (let antes = ""; antes !== t; ) {
    antes = t;
    t = t.replace(EXTENSION, "").trim();
  }
  return clave(t.replace(/\s+/g, " "));
}
