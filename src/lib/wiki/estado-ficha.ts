// Estado de la ficha en la wiki (spec 001, RF-25 a RF-27 y RF-33): cuando una
// pieza ya pasada cambia de estado, su ficha también. Solo se toca la línea
// `estado_canon` de las propiedades; nada se crea ni se borra. Se apunta en el
// Log. Nunca se escribe fuera de la carpeta de narrativa de la serie.

import { escribirSeguro, unir, type Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";
import type { Madurez } from "../modelo/vocabulario";
import { esEstadoAntiguo, normalizarEstado, textoEstado } from "./equivalencias";
import { anotarLog } from "./log";
import { enUnaLinea, separar } from "./md";

const SUBCARPETA = { temporada: "Temporadas", episodio: "Episodios", arco: "Arcos", secreto: "Secretos" } as const;
export type TipoFicha = keyof typeof SUBCARPETA;

export type ResultadoFicha =
  | {
      ok: true;
      ruta: string;
      /** Fecha de la ficha tras escribirla (ISO), para `wiki_mtime` */
      mtime: string;
      /** Si se ha escrito (o ya decía ese estado) */
      escrita: boolean;
      /** `estado_canon` de antes, tal cual (spec 009, RF-55c) */
      antes?: unknown;
      aviso?: string;
    }
  | { ok: false; ruta: string | null; motivo: "enlace no válido" | "no está" | "cambió mientras tanto" | "no se pudo escribir"; mensaje: string };

/** Nombre de la ficha sin [[ ]] */
export function nombreFicha(wiki: string): string {
  return wiki.replace(/^\s*\[\[|\]\]\s*$/g, "").trim();
}

/**
 * Ruta de la ficha, relativa al vault, o null si el enlace no es el nombre de
 * una nota (lleva carpetas, `..` o una unidad) o no hay narrativa configurada.
 */
export function rutaFicha(rutas: RutasWiki, p: { tipo: TipoFicha; wiki: string }): string | null {
  const narrativa = rutas.narrativa.replace(/\/+$/, "");
  const nombre = nombreFicha(p.wiki);
  if (!narrativa || !nombre || /[\\/:]/.test(nombre) || nombre === "." || nombre === "..") return null;
  return `${narrativa}/${SUBCARPETA[p.tipo]}/${nombre}.md`;
}

/** El texto de la nota con `estado_canon: valor`; el resto, intacto */
export function cambiarEstadoCanon(texto: string, valor: Madurez): string {
  const bom = texto.startsWith("﻿") ? "﻿" : "";
  const cuerpo = texto.slice(bom.length);
  const fin = cuerpo.includes("\r\n") ? "\r\n" : "\n";
  const lineas = cuerpo.split(fin);
  if (lineas[0]?.trimEnd() !== "---") return `${bom}---${fin}estado_canon: ${valor}${fin}---${fin}${cuerpo}`;
  const cierre = lineas.findIndex((l, i) => i > 0 && l.trimEnd() === "---");
  if (cierre < 0) return `${bom}---${fin}estado_canon: ${valor}${fin}---${fin}${cuerpo}`;
  for (let i = 1; i < cierre; i++) {
    const m = lineas[i].match(/^estado_canon\s*:\s*(.*)$/);
    if (!m) continue;
    // Una lista en bloque (spec 009, RF-55): sus líneas se van con ella
    let hasta = i + 1;
    while (hasta < cierre && /^\s+\S|^-(\s|$)/.test(lineas[hasta])) hasta++;
    lineas.splice(i + 1, hasta - i - 1);
    const resto = m[1].match(/^(["']?)[^"'#]*?\1(\s*#.*)?\s*$/);
    const comillas = resto?.[1] ?? "";
    const comentario = resto?.[2] ?? "";
    lineas[i] = `estado_canon: ${comillas}${valor}${comillas}${comentario}`;
    return bom + lineas.join(fin);
  }
  lineas.splice(cierre, 0, `estado_canon: ${valor}`);
  return bom + lineas.join(fin);
}

export async function ponerEstadoFicha(
  fs: Fs,
  vault: string,
  rutas: RutasWiki,
  p: { tipo: TipoFicha; wiki: string },
  valor: Madurez,
  opciones: { fecha: string },
): Promise<ResultadoFicha> {
  const ruta = rutaFicha(rutas, p);
  if (!ruta) {
    return { ok: false, ruta: null, motivo: "enlace no válido", mensaje: `El enlace «${p.wiki}» no es una ficha de la wiki de la serie: no se ha tocado ninguna nota.` };
  }
  const abs = unir(vault, ruta);
  const mtime = async () => new Date((await fs.fecha(abs)) ?? 0).toISOString();
  let texto = "";
  try {
    if (!(await fs.existe(abs))) {
      return { ok: false, ruta, motivo: "no está", mensaje: `La ficha ya no está en ${ruta}: la wiki no se ha actualizado.` };
    }
    const antes = await fs.fecha(abs);
    texto = await fs.leer(abs);
    // «Canon» ya es canon: lo que escribió el autor se queda (spec 009, RF-53)
    const actual = separar(texto).propiedades.estado_canon;
    if (typeof actual === "string" && normalizarEstado(actual) === valor) return { ok: true, ruta, mtime: await mtime(), escrita: false, antes: actual };
    const nuevo = cambiarEstadoCanon(texto, valor);
    if (nuevo === texto) return { ok: true, ruta, mtime: await mtime(), escrita: false, antes: actual };
    if ((await fs.fecha(abs)) !== antes) {
      return { ok: false, ruta, motivo: "cambió mientras tanto", mensaje: `La ficha ${ruta} cambió mientras tanto (¿Obsidian o el otro equipo?): no se ha tocado. Vuelve a intentarlo.` };
    }
    await escribirSeguro(fs, abs, nuevo);
  } catch (e) {
    return { ok: false, ruta, motivo: "no se pudo escribir", mensaje: `No se pudo cambiar la ficha ${ruta}: ${(e as Error).message}` };
  }
  const antes = separar(texto).propiedades.estado_canon;
  const hecho: ResultadoFicha = { ok: true, ruta, mtime: await mtime(), escrita: true, antes };
  // Un estado antiguo: el Log dice qué había (RF-55c)
  // En una línea y corto: un bloque YAML no mete líneas en el Log
  const viejo = enUnaLinea(textoEstado(antes));
  const de = esEstadoAntiguo(antes) ? `${viejo.length > 60 ? `${viejo.slice(0, 59)}…` : viejo} → ` : "";
  try {
    await anotarLog(fs, vault, rutas, opciones.fecha, `Estado de [[${nombreFicha(p.wiki)}]]: ${de}${valor}`, `Cambiado desde Atelier: \`estado_canon: ${valor}\`.`);
  } catch (e) {
    hecho.aviso = `La ficha cambió, pero no se pudo apuntar en el Log: ${(e as Error).message}`;
  }
  return hecho;
}
