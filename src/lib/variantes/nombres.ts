// Nombres de las variantes «¿Y si…?» (spec 006): el de por defecto, lo que se
// permite escribir en el nombre y en el porqué, y sus ids (va-xxxx).

import { aleatorio } from "../modelo/ids";

export const LARGO_NOMBRE = 120;
export const LARGO_PORQUE = 500;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Saltos de línea, caracteres de control y los que dan la vuelta al texto (bidi) */
const RAROS = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/** «¿Y si…? 21 oct, 18:20», con « (2)», « (3)»… si ya existe (RF-2) */
export function nombrePorDefecto(fecha: Date, usados: Iterable<string>): string {
  const hora = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
  return nombreUnico(`¿Y si…? ${fecha.getDate()} ${MESES[fecha.getMonth()]}, ${hora}`, usados);
}

/** El nombre, o con « (2)», « (3)»… si ya lo tiene otra (también «Otra versión de…», RF-3) */
export function nombreUnico(base: string, usados: Iterable<string>): string {
  const ya = new Set(usados);
  if (!ya.has(base)) return base;
  for (let n = 2; ; n++) if (!ya.has(`${base} (${n})`)) return `${base} (${n})`;
}

function limpiar(texto: string, largo: number): { texto: string; recortado: boolean } {
  const limpio = texto.replace(RAROS, " ").trim();
  return limpio.length > largo ? { texto: limpio.slice(0, largo), recortado: true } : { texto: limpio, recortado: false };
}

/** El nombre tal como se guarda (RF-2b); vacío si no queda nada */
export function limpiarNombre(texto: string): { nombre: string; recortado: boolean } {
  const r = limpiar(texto, LARGO_NOMBRE);
  return { nombre: r.texto, recortado: r.recortado };
}

/** El porqué de descartar tal como se guarda (RF-41) */
export function limpiarPorque(texto: string): { texto: string; recortado: boolean } {
  return limpiar(texto, LARGO_PORQUE);
}

/** Id de una variante: va- y cuatro letras o cifras; no es un tipo de pieza */
export function nuevoIdVariante(usados: { has(id: string): boolean }): string {
  let largo = 4;
  for (let intento = 0; ; intento++) {
    if (intento > 0 && intento % 50 === 0) largo++;
    const id = `va-${aleatorio(largo)}`;
    if (!usados.has(id)) return id;
  }
}

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha de las propiedades de una variante: «2026-10-21 18:20:05» */
export function fechaVariante(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

/** «21 oct, 18:45» a partir de la fecha de las propiedades («2026-10-21 18:45:12»); "" si no hay */
export function fechaCorta(texto: string): string {
  const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(texto);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? ""}, ${m[4]}:${m[5]}` : "";
}
