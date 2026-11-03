// Estados antiguos de la wiki (spec 009, RF-53, RF-54): lo que dice
// `estado_canon` en una ficha y no es uno de los cuatro de la regla 9, con la
// equivalencia que se propone. Nada cambia sin que el autor lo confirme.

import type { Madurez } from "../modelo/vocabulario";
import { clave } from "./md";

const REGLA_9 = new Set<string>(["idea", "borrador", "canon", "descartado"]);

/** Para comparar: sin mayúsculas ni acentos y con los espacios juntados */
export const normalizarEstado = (v: string) => clave(v).replace(/\s+/g, " ");

const TABLA: [Madurez, string[]][] = [
  ["canon", ["aprobado", "final", "definitivo", "cerrado"]],
  ["borrador", ["en desarrollo", "en curso", "en revision", "revision", "pendiente", "wip"]],
  ["idea", ["boceto", "semilla", "propuesta", "esbozo", "aparcado", "aparcada"]],
  ["descartado", ["descartada", "eliminado", "archivado", "obsoleto"]],
];
const EQUIVALE = new Map(TABLA.flatMap(([estado, valores]) => valores.map((v) => [v, estado] as const)));

/** Vacío no es antiguo; un valor que no es texto (lista, número), sí */
export function esEstadoAntiguo(valor: unknown): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor !== "string") return true;
  const v = normalizarEstado(valor);
  return !!v && !REGLA_9.has(v);
}

/** Lo que se propone (RF-54); null si no hay equivalencia o no es texto */
export function propuesta(valor: unknown): Madurez | null {
  return typeof valor === "string" ? (EQUIVALE.get(normalizarEstado(valor)) ?? null) : null;
}

/** «Dejarlo así» (RF-56): la entrada en `avisos_silenciados` de la pieza */
export const DEJADO_ASI = "ficha:";
export const entradaDejadoAsi = (valor: unknown) => `${DEJADO_ASI}${normalizarEstado(textoEstado(valor))}`;

/** El valor para enseñarlo o apuntarlo: una lista, separada por comas */
export function textoEstado(valor: unknown): string {
  if (valor === undefined || valor === null) return "";
  if (Array.isArray(valor)) return valor.map(textoEstado).join(", ");
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor).trim();
}
