// Lector de appDatos/guia.md (spec 6.1, plan 3.5): una tabla Markdown de
// reglas y, aparte, la de magia, que solo se carga con `magia: true`. Una fila
// mal escrita se salta con un aviso; el resto se lee.

import { parse } from "yaml";

export const PIEZAS_GUIA = [
  "serie",
  "arco de trama",
  "arco de personaje",
  "arco de relación",
  "subtrama",
  "temporada",
  "episodio",
  "evento",
  "secreto",
] as const;
export type PiezaGuia = (typeof PIEZAS_GUIA)[number];

export interface Regla {
  id: string;
  pieza: PiezaGuia;
  texto: string;
  fuente: string;
  /** Id de la comprobación que la vigila ("C03"), o "" */
  comprobacion: string;
  /** De la sección Magia */
  magia: boolean;
}

export interface Guia {
  reglas: Regla[];
  magia: boolean;
  /** Filas que no se pudieron leer */
  avisos: string[];
}

/** Celdas de una fila de tabla; "\|" es una barra dentro de una celda */
function celdas(linea: string): string[] {
  const marca = "\u0000";
  const t = linea.trim().replace(/\\\|/g, marca).replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((c) => c.split(marca).join("|").trim());
}

export function leerGuia(texto: string): Guia {
  const md = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  let magia = false;
  let cuerpo = md;
  const fm = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    try {
      const datos = parse(fm[1]);
      magia = datos?.magia === true;
    } catch {
      // Propiedades rotas: se sigue sin magia
    }
    cuerpo = md.slice(fm[0].length);
  }

  const reglas: Regla[] = [];
  const avisos: string[] = [];
  // Ids ya leídos, en mayúsculas: una regla repetida se salta (spec 004, RF-20)
  const vistos = new Set<string>();
  let seccion: "reglas" | "magia" | null = null;
  let cabecera = false;

  for (const linea of cuerpo.split("\n")) {
    const titulo = linea.match(/^##\s+(.*)$/);
    if (titulo) {
      const nombre = titulo[1].trim().toLowerCase();
      seccion = nombre.startsWith("magia") ? "magia" : nombre.startsWith("reglas") ? "reglas" : null;
      cabecera = false;
      continue;
    }
    if (!seccion || !linea.trim().startsWith("|")) continue;
    const c = celdas(linea);
    if (!cabecera) {
      // La primera fila es la cabecera; la segunda, la de guiones
      if (c[0]?.toLowerCase() === "id") cabecera = true;
      continue;
    }
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    if (seccion === "magia" && !magia) continue;

    const [id, pieza, textoRegla, fuente, comprobacion = ""] = c;
    if (c.length < 4 || c.length > 5) {
      avisos.push(`Fila «${linea.trim()}»: tiene ${c.length} columnas y deben ser 5 (id, pieza, texto, fuente, comprobación).`);
      continue;
    }
    if (!id || !textoRegla) {
      avisos.push(`Fila «${linea.trim()}»: falta el id o el texto.`);
      continue;
    }
    if (!(PIEZAS_GUIA as readonly string[]).includes(pieza)) {
      avisos.push(`Regla ${id}: la pieza «${pieza}» no existe (valen: ${PIEZAS_GUIA.join(", ")}).`);
      continue;
    }
    const idRegla = id.toUpperCase();
    if (vistos.has(idRegla)) {
      avisos.push(`Regla ${idRegla} repetida: se usa la primera.`);
      continue;
    }
    vistos.add(idRegla);
    reglas.push({ id: idRegla, pieza: pieza as PiezaGuia, texto: textoRegla, fuente, comprobacion: comprobacion.toUpperCase(), magia: seccion === "magia" });
  }
  return { reglas, magia, avisos };
}
