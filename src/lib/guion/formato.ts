// El guion de una escena en disco (spec 013, RF-27, RF-31, RNF-3, RNF-12): una
// nota Markdown con una cabecera mínima y el texto del guion tal cual. Leer es
// tolerante; escribir es idempotente. Control, bidi y blancos se conservan.

import { parse, stringify } from "yaml";
import { TOPE_BYTES, VERSION_GUION, type Guion } from "./tipos";

export type LecturaGuion = { guion: Guion; avisos: string[]; soloLectura: boolean } | { ilegible: string };

const RESERVADAS = new Set(["atelier_guion", "escena", "__proto__"]);

function bytes(texto: string): number {
  if (texto.length * 3 <= TOPE_BYTES) return texto.length;
  return new TextEncoder().encode(texto).length;
}

export function leerGuion(crudo: string): LecturaGuion {
  const avisos: string[] = [];
  const bom = crudo.charCodeAt(0) === 0xfeff;
  let texto = bom ? crudo.slice(1) : crudo;

  const primero = texto.indexOf("\n");
  const finDeLinea: "\n" | "\r\n" = primero > 0 && texto[primero - 1] === "\r" ? "\r\n" : "\n";
  const crlf = (texto.match(/\r\n/g) ?? []).length;
  const lf = (texto.match(/\n/g) ?? []).length;
  if (crlf > 0 && crlf < lf) avisos.push("Los finales de línea estaban mezclados: se han unificado al guardar.");
  texto = texto.replace(/\r\n/g, "\n");

  let version = VERSION_GUION;
  let escena = "";
  const extra: Record<string, unknown> = {};
  let cuerpo = texto;

  if (/^---[ \t]*\n/.test(texto)) {
    const resto = texto.slice(texto.indexOf("\n") + 1);
    const lineas = resto.split("\n");
    let cierre = -1;
    let desde = 0;
    for (let i = 0; i < lineas.length; i++) {
      if (/^---[ \t]*$/.test(lineas[i]!) && (i < lineas.length - 1 || lineas[i]!.length > 0)) {
        cierre = i;
        break;
      }
      desde += lineas[i]!.length + 1;
    }
    if (cierre === -1) return { ilegible: "La cabecera del guion no se cierra." };
    let datos: unknown;
    try {
      datos = parse(resto.slice(0, Math.max(0, desde - 1)));
    } catch {
      return { ilegible: "La cabecera del guion no se entiende." };
    }
    if (datos !== null && datos !== undefined && (typeof datos !== "object" || Array.isArray(datos))) return { ilegible: "La cabecera del guion no es una lista de campos." };
    const d = (datos ?? {}) as Record<string, unknown>;
    if (Object.hasOwn(d, "atelier_guion")) {
      const v = d["atelier_guion"];
      if (typeof v === "number" && Number.isInteger(v) && v >= 1) version = v;
      else avisos.push("La versión del formato no es válida: se trata como la 1.");
    } else avisos.push("El guion no lleva cabecera de Atelier: se le pondrá al guardar.");
    if (typeof d["escena"] === "string") escena = d["escena"];
    for (const k of Object.keys(d)) if (!RESERVADAS.has(k)) extra[k] = d[k];
    cuerpo = lineas.slice(cierre + 1).join("\n");
  } else {
    avisos.push("El guion no lleva cabecera de Atelier: se le pondrá al guardar.");
  }

  let soloLectura = false;
  if (version > VERSION_GUION) {
    soloLectura = true;
    avisos.push(`Este guion lo escribió una versión más nueva de Atelier (formato ${version}): se abre solo para leer.`);
  }
  if (bytes(cuerpo) > TOPE_BYTES) {
    soloLectura = true;
    avisos.push("Este guion pasa del tope de 1 MB: se abre solo para leer.");
  }
  return { guion: { escena, version, texto: cuerpo, extra, finDeLinea, bom }, avisos, soloLectura };
}

export function escribirGuion(g: Guion): string {
  const cabeza: Record<string, unknown> = { atelier_guion: Math.max(g.version, VERSION_GUION) };
  if (g.escena) cabeza["escena"] = g.escena;
  for (const k of Object.keys(g.extra)) if (!RESERVADAS.has(k) && Object.hasOwn(g.extra, k)) cabeza[k] = g.extra[k];
  const fuera = `---\n${stringify(cabeza)}---\n${g.texto}`;
  const t = g.finDeLinea === "\r\n" ? fuera.replace(/\n/g, "\r\n") : fuera;
  return g.bom ? `\uFEFF${t}` : t;
}
