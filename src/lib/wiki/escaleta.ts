// La escaleta de un episodio en su ficha de la wiki (spec 003, RF-39): las
// tablas «Escena» y «Acto» que escribe pasar a la wiki. Se leen para avisar
// si el orden o los actos ya no coinciden; la ficha nunca se toca.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import { celdas, clave, esSeparador } from "./md";

export interface EscaletaLeida {
  /** Títulos de la tabla Escena, por orden */
  titulos: string[];
  /** «ESC01, ESC03» de Teaser, Acto 1, Acto 2 y Acto 3; sin tabla Acto, null */
  actos: [string, string, string, string] | null;
}

const ACTOS = ["teaser", "1", "2", "3"] as const;
export const codigoEscena = (i: number) => `ESC${String(i + 1).padStart(2, "0")}`;

/** Lo que pasar a la wiki escribe hoy para el episodio (sin las descartadas) */
export function escaletaDe(m: Modelo, ep: string): EscaletaLeida {
  const evs = c.eventosDeEpisodio(m, ep).filter((x) => x.madurez !== "descartado");
  const codigos = (acto: string) =>
    evs
      .map((x, i) => (x.acto === acto ? codigoEscena(i) : ""))
      .filter(Boolean)
      .join(", ");
  return { titulos: evs.map((x) => x.titulo), actos: ACTOS.map(codigos) as EscaletaLeida["actos"] };
}

// Las barras escapadas (\|) de un título no parten la celda
const ESCAPADA = "\u0000";

/** Filas de la primera tabla cuya cabecera empieza por `primera` */
function filas(cuerpo: string, primera: string): string[][] | null {
  const lineas = cuerpo.replace(/\r\n?/g, "\n").split("\n");
  const i = lineas.findIndex((l) => l.trim().startsWith("|") && clave(celdas(l)[0] ?? "") === clave(primera));
  if (i < 0 || !esSeparador(lineas[i + 1] ?? "")) return null;
  const r: string[][] = [];
  for (let j = i + 2; j < lineas.length && lineas[j].trim().startsWith("|"); j++) {
    r.push(celdas(lineas[j].replace(/\\\|/g, ESCAPADA)).map((x) => x.replaceAll(ESCAPADA, "|")));
  }
  return r;
}

const normal = (s: string) => s.replace(/\s+/g, " ").trim();
const codigos = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)
    .join(", ");

/** Lee la escaleta del cuerpo de la ficha; null si no tiene la tabla Escena */
export function leerEscaleta(cuerpo: string): EscaletaLeida | null {
  const escenas = filas(cuerpo, "Escena");
  if (!escenas) return null;
  // Las filas de plantilla sin título (| ESC01 | | | A | | idea |) no cuentan
  const titulos = escenas.map((f) => normal(f[2] ?? "")).filter(Boolean);
  const actos = filas(cuerpo, "Acto");
  const deActo = (n: number) => codigos(actos?.[n]?.[1] ?? "");
  return { titulos, actos: actos ? [deActo(0), deActo(1), deActo(2), deActo(3)] : null };
}

/** El orden y los actos del episodio coinciden con la escaleta leída de su ficha */
export function escaletaAlDia(m: Modelo, ep: string, leida: EscaletaLeida): boolean {
  const ahora = escaletaDe(m, ep);
  // Como al leer: una escena sin título no deja fila que se distinga de la plantilla
  const titulos = ahora.titulos.map(normal).filter(Boolean);
  if (titulos.length !== leida.titulos.length || titulos.some((t, i) => t !== leida.titulos[i])) return false;
  return !leida.actos || ahora.actos!.every((x, i) => x === leida.actos![i]);
}
