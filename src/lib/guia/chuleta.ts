// La guía de escritura a mano (spec 019): las reglas de guia.md agrupadas y
// filtradas, y los apartados «§N» de la chuleta de escritura del vault, que
// solo se lee.

import { unir, type Fs } from "../almacen/fs";
import { clave } from "../wiki/md";
import { PIEZAS_GUIA, type PiezaGuia, type Regla } from "./guia-md";

/** La chuleta, relativa al vault (prd, G7) */
export const RUTA_CHULETA = "Guia/Chuleta de escritura.md";

export interface GrupoReglas {
  pieza: PiezaGuia;
  reglas: Regla[];
}

/** Las reglas por pieza, en el orden de PIEZAS_GUIA y sin grupos vacíos; filtra por texto, id o fuente (RF-6, RF-7) */
export function agruparReglas(reglas: Regla[], q = ""): GrupoReglas[] {
  const b = clave(q);
  const pasa = (r: Regla) => !b || [r.id, r.texto, r.fuente, r.pieza].some((x) => clave(x).includes(b));
  return PIEZAS_GUIA.map((pieza) => ({ pieza, reglas: reglas.filter((r) => r.pieza === pieza && pasa(r)) })).filter((g) => g.reglas.length > 0);
}

export type TrozoFuente = { tipo: "texto"; texto: string } | { tipo: "apartado"; texto: string; numero: string };

/** «§18 · F1.6» → el «§18» como enlace a su apartado y el resto como texto (RF-8) */
export function trozosFuente(fuente: string): TrozoFuente[] {
  const trozos: TrozoFuente[] = [];
  let i = 0;
  for (const m of fuente.matchAll(/§\s*(\d+(?:\.\d+)*)/g)) {
    if (m.index > i) trozos.push({ tipo: "texto", texto: fuente.slice(i, m.index) });
    trozos.push({ tipo: "apartado", texto: m[0], numero: m[1]! });
    i = m.index + m[0].length;
  }
  if (i < fuente.length) trozos.push({ tipo: "texto", texto: fuente.slice(i) });
  return trozos;
}

const TITULO = /^(#{1,6})\s+(.*)$/;

/** El número con que empieza un título: «§18 …», «18. …», «18) …», «18.1 …» (RF-9) */
function numeroDeTitulo(t: string): string | null {
  const s = t.replace(/^[*_\s]+/, "");
  // «18.1 Título» también: con punto dentro no se confunde con un año ni una cifra suelta
  const m = /^§\s*(\d+(?:\.\d+)*)/.exec(s) ?? /^(\d+(?:\.\d+)*)[.)](?!\d)/.exec(s) ?? /^(\d+(?:\.\d+)+)\s/.exec(s);
  return m ? m[1]! : null;
}

export interface Apartado {
  titulo: string;
  /** El texto bajo el título, sin él */
  cuerpo: string;
}

/**
 * El apartado «§N» de la chuleta: el título que empieza por ese número, hasta el
 * siguiente título de su nivel o superior. null si no está (RF-9). Dentro de un
 * bloque de código (``` o ~~~) y del frontmatter ningún título cuenta.
 */
export function apartadoDe(texto: string, numero: string): Apartado | null {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n");
  /** La valla que abrió el bloque de código, o "" fuera de él */
  let valla = "";
  let desde = -1;
  let nivel = 0;
  let titulo = "";
  let i = 0;
  if (lineas[0]?.trim() === "---") {
    const fin = lineas.findIndex((l, k) => k > 0 && l.trim() === "---");
    if (fin > 0) i = fin + 1;
  }
  for (; i < lineas.length; i++) {
    const l = lineas[i]!;
    const v = /^\s{0,3}(`{3,}|~{3,})/.exec(l)?.[1];
    if (v) {
      // Se cierra con una valla del mismo signo y al menos igual de larga
      if (!valla) valla = v;
      else if (v[0] === valla[0] && v.length >= valla.length) valla = "";
      continue;
    }
    if (valla) continue;
    const m = TITULO.exec(l);
    if (!m) continue;
    const n = m[1]!.length;
    if (desde >= 0) {
      if (n <= nivel) return { titulo, cuerpo: lineas.slice(desde + 1, i).join("\n").trim() };
      continue;
    }
    if (numeroDeTitulo(m[2]!) === numero) {
      desde = i;
      nivel = n;
      titulo = m[2]!.replace(/\s+#+\s*$/, "").trim();
    }
  }
  return desde >= 0 ? { titulo, cuerpo: lineas.slice(desde + 1).join("\n").trim() } : null;
}

/** Lee la chuleta del vault, o null si no está o no se puede leer. Nunca escribe (RF-12) */
export async function leerChuleta(fs: Fs, vault: string): Promise<string | null> {
  const ruta = unir(vault, RUTA_CHULETA);
  try {
    return (await fs.existe(ruta)) ? await fs.leer(ruta) : null;
  } catch {
    return null;
  }
}
