// Escribir en una ficha desde Atelier (spec 009, RF-38, RF-39, RF-39b, RF-43).
// Tres defensas: comparar el texto entero antes de escribir (si cambió fuera,
// no se escribe), una copia de cómo estaba y la escritura segura. Solo dentro
// de la narrativa de la serie (`rutaFicha`).

import { escribirSeguro, nombreDe, unir, type Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";
import { cambiarApartado, partirApartados, porQueNoSeGuarda, type Apartado } from "./apartados";
import { rutaFicha, type TipoFicha } from "./estado-ficha";
import { textoEstado } from "./equivalencias";
import { anotarLog } from "./log";
import { separar } from "./md";

export interface FichaLeida {
  /** Relativa al vault */
  ruta: string;
  texto: string;
  fecha: number | null;
  apartados: Apartado[];
  /** `estado_canon` de sus propiedades como texto (una lista, separada por comas), o "" */
  estadoWiki: string;
}

export type ResultadoGuardar =
  | { ok: true; leida: FichaLeida; escrita: boolean; aviso?: string }
  | { ok: false; motivo: "cambió fuera" | "no está" | "no se pudo escribir" | "no se guarda"; mensaje: string };

export interface OpcionesEscribir {
  /** AAAA-MM-DD, para el Log y la copia */
  fecha: string;
  /** HH-MM-SS, para la copia */
  hora: string;
  /** Carpeta de las copias (`appDatos/<serie>/_fichas`), o null si esta ficha ya se copió */
  copia: string | null;
}

/** El nombre de la nota, sin `.md` */
const nombreNota = (ruta: string) => nombreDe(ruta).replace(/\.md$/, "");

export const CAMBIO_FUERA = "La ficha cambió en Obsidian. No se ha guardado.";

function leida(ruta: string, texto: string, fecha: number | null): FichaLeida {
  return { ruta, texto, fecha, apartados: partirApartados(texto), estadoWiki: textoEstado(separar(texto).propiedades.estado_canon) };
}

/** La ficha de la pieza, o null si el enlace no es una ficha de la narrativa o no está */
export async function leerFicha(fs: Fs, vault: string, rutas: RutasWiki, p: { tipo: TipoFicha; wiki: string }): Promise<FichaLeida | null> {
  const ruta = rutaFicha(rutas, p);
  if (!ruta) return null;
  const abs = unir(vault, ruta);
  if (!(await fs.existe(abs))) return null;
  return leida(ruta, await fs.leer(abs), await fs.fecha(abs));
}

/** Guarda `texto` de antes en la carpeta de copias, sin pisar otra con el mismo nombre */
async function copiar(fs: Fs, carpeta: string, base: string, texto: string): Promise<void> {
  await fs.crearDir(carpeta);
  for (let n = 1; ; n++) {
    const ruta = unir(carpeta, `${base}${n > 1 ? ` (${n})` : ""}.md.bak`);
    if (await fs.existe(ruta)) continue;
    await escribirSeguro(fs, ruta, texto);
    return;
  }
}

/**
 * El único camino para escribir en una ficha: comprueba que el disco tiene aún
 * el texto leído (la fecha sola no cuenta: la nube la mueve), copia si toca y
 * escribe. `nuevo` es el texto entero de la nota.
 */
export async function escribirFicha(fs: Fs, vault: string, antes: FichaLeida, nuevo: string, op: OpcionesEscribir): Promise<ResultadoGuardar> {
  const abs = unir(vault, antes.ruta);
  try {
    if (!(await fs.existe(abs))) return { ok: false, motivo: "no está", mensaje: `La ficha ya no está en ${antes.ruta}. No se ha guardado.` };
    if ((await fs.leer(abs)) !== antes.texto) return { ok: false, motivo: "cambió fuera", mensaje: CAMBIO_FUERA };
    if (nuevo === antes.texto) return { ok: true, leida: antes, escrita: false };
    if (op.copia) await copiar(fs, op.copia, `${op.fecha} ${op.hora} ${nombreNota(antes.ruta)}`, antes.texto);
    // Otra vez justo antes de escribir: Obsidian pudo guardar mientras se hacía la copia
    if ((await fs.leer(abs)) !== antes.texto) return { ok: false, motivo: "cambió fuera", mensaje: CAMBIO_FUERA };
    await escribirSeguro(fs, abs, nuevo);
    return { ok: true, leida: leida(antes.ruta, nuevo, await fs.fecha(abs)), escrita: true };
  } catch (e) {
    return { ok: false, motivo: "no se pudo escribir", mensaje: `No se pudo guardar la ficha ${antes.ruta}: ${(e as Error).message}` };
  }
}

/** Cambia el apartado `i` (RF-37) y, con `log`, apunta «Editada desde Atelier» (RF-39b) */
export async function guardarApartado(
  fs: Fs,
  vault: string,
  rutas: RutasWiki,
  antes: FichaLeida,
  i: number,
  nuevo: string,
  op: OpcionesEscribir & { log: boolean },
): Promise<ResultadoGuardar> {
  const no = porQueNoSeGuarda(antes.texto, i, nuevo);
  if (no) return { ok: false, motivo: "no se guarda", mensaje: no };
  const apartado = antes.apartados[i];
  if (!apartado) return { ok: false, motivo: "cambió fuera", mensaje: CAMBIO_FUERA };
  const r = await escribirFicha(fs, vault, antes, cambiarApartado(antes.texto, i, nuevo), op);
  if (!r.ok || !r.escrita || !op.log) return r;
  try {
    await anotarLog(fs, vault, rutas, op.fecha, `Editada desde Atelier: [[${nombreNota(antes.ruta)}]]`, `Apartado «${apartado.titulo}».`);
  } catch (e) {
    return { ...r, aviso: `La ficha se guardó, pero no se pudo apuntar en el Log: ${(e as Error).message}` };
  }
  return r;
}
