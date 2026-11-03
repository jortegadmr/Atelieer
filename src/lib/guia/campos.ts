// Qué reglas de la guía van junto a cada campo (spec 004, tabla «Campos y
// reglas»). La tabla vive aquí y no en guia.md: una columna más haría que la
// v1.0 se saltara las filas. El texto de cada regla sigue saliendo de la guía.

import type { Modelo } from "../modelo/modelo";
import type { Pieza } from "../modelo/tipos";
import type { TipoArco } from "../modelo/vocabulario";
import type { QueCrear } from "../vistas/crear";
import type { Guia, PiezaGuia, Regla } from "./guia-md";
import { piezasArco, reglasDe } from "./marcas";

export interface ReglaCampo {
  id: string;
  /** Pieza de la guía que se espera: si el autor la cambia, no sale aquí (RF-4) */
  pieza: PiezaGuia;
  /** Cuándo aplica, si no siempre */
  si?: (p: Pieza) => boolean;
}

const r = (id: string, pieza: PiezaGuia, si?: (p: Pieza) => boolean): ReglaCampo => ({ id, pieza, si });

const tramaDeSerie = (p: Pieza) => p.tipo === "arco" && p.tipo_trama === "A" && p.nivel === "serie";
const deTemporada = (p: Pieza) => p.tipo === "arco" && p.nivel === "temporada";

export const CAMPOS = {
  // Sin reglas: solo para llevar el foco desde Serie y el paso a paso (spec 019, RF-1)
  "serie.titulo": [] as ReglaCampo[],
  "serie.premisa": [] as ReglaCampo[],
  "serie.logline": [r("G05", "serie")],
  "serie.pregunta": [r("G03", "serie")],
  "serie.final": [r("G02", "serie")],
  "serie.filosoficas": [r("G04", "serie")],
  "serie.dinamica": [r("G06", "serie")],

  "arco.quiere": [r("G07", "arco de trama"), r("G21", "arco de personaje")],
  "arco.necesita": [r("G22", "arco de personaje")],
  "arco.gana": [r("G08", "arco de trama"), r("G09", "arco de trama")],
  "arco.cambia": [
    r("G11", "arco de trama"),
    r("G23", "arco de personaje"),
    r("G24", "arco de personaje"),
    r("G26", "arco de relación"),
    r("G27", "arco de relación"),
    r("G28", "arco de relación"),
  ],
  "arco.bomba": [r("G10", "arco de trama"), r("G20", "subtrama")],
  "arco.protagonistas": [r("G16", "subtrama")],
  "arco.pegamento": [r("G19", "subtrama")],
  "arco.estados": [r("G25", "arco de personaje")],
  "arco.nivel": [r("G12", "arco de trama", tramaDeSerie), r("G13", "arco de trama", deTemporada)],
  "arco.inicio": [r("G15", "arco de trama"), r("G17", "subtrama")],
  "arco.fin": [r("G12", "arco de trama", tramaDeSerie), r("G13", "arco de trama", deTemporada), r("G15", "arco de trama"), r("G17", "subtrama")],

  "temporada.pregunta": [r("G33", "temporada")],
  "temporada.principal": [r("G35", "temporada")],
  "temporada.carga": [r("G34", "temporada")],
  "temporada.story_circle": [r("G29", "temporada")],
  "temporada.crisis": [r("G30", "temporada")],
  "temporada.climax": [r("G31", "temporada")],
  "temporada.llegada": [r("G32", "temporada")],
  "temporada.cierre": [r("G33", "temporada")],

  "episodio.idea": [r("G36", "episodio")],
  "episodio.motor": [r("G37", "episodio")],
  "episodio.carga": [r("G38", "episodio")],
  "episodio.desenlace": [r("G39", "episodio")],
  "episodio.gancho": [r("G40", "episodio")],

  "evento.valor": [r("G42", "evento")],
  "evento.gana": [r("G41", "evento")],
  "evento.relleno": [r("G43", "evento")],
  "evento.cuando": [r("G45", "evento")],
  "evento.descripcion": [r("G44", "evento"), r("M01", "evento")],

  "secreto.verdad": [r("G49", "secreto")],
  "secreto.revela": [r("G46", "secreto")],
  "secreto.pistas": [r("G47", "secreto"), r("M02", "secreto")],
  "secreto.conocen": [r("G48", "secreto")],
} satisfies Record<string, ReglaCampo[]>;

export type ClaveCampo = keyof typeof CAMPOS;

/** Las reglas de la guía que van junto a ese campo de esa pieza, en el orden de la tabla (RF-1 a RF-5, RF-8) */
export function reglasDeCampo(guia: Guia, p: Pieza, clave: ClaveCampo): Regla[] {
  const aplican = reglasDe(guia, p);
  const lista: ReglaCampo[] = CAMPOS[clave];
  return lista.flatMap((rc) => {
    const regla = aplican.find((x) => x.id === rc.id);
    return regla && regla.pieza === rc.pieza && (!rc.si || rc.si(p)) ? [regla] : [];
  });
}

export interface ReglasNueva {
  propias: Regla[];
  /** Las de subtrama, si la pieza puede serlo pero aún no lo es (RF-22) */
  subtrama: Regla[];
}

const DE_TIPO: Partial<Record<QueCrear, PiezaGuia>> = { temporada: "temporada", episodio: "episodio", evento: "evento", secreto: "secreto" };

/** Lo que pedirán las guías a la pieza de la ventana «Nueva pieza» (RF-21 a RF-24) */
export function reglasNueva(guia: Guia, m: Modelo, d: { que: QueCrear; tipoArco: TipoArco; tramoDe?: string }): ReglasNueva {
  const de = (tipos: PiezaGuia[]) => guia.reglas.filter((x) => tipos.includes(x.pieza));
  const tipo = DE_TIPO[d.que];
  if (tipo) return { propias: de([tipo]), subtrama: [] };
  if (d.que !== "trama" && d.que !== "trama-temporada") return { propias: [], subtrama: [] };
  // Un tramo es como su trama madre; una trama de temporada nace B
  const madre = d.que === "trama-temporada" && d.tramoDe ? m.arcos.get(d.tramoDe) : undefined;
  const tipoArco = madre?.tipo_arco ?? d.tipoArco;
  const tipoTrama = madre?.tipo_trama ?? (d.que === "trama-temporada" ? "B" : "A");
  const tipos = piezasArco(tipoArco, tipoTrama);
  const propio = tipos.filter((t) => t !== "subtrama");
  if (tipos.includes("subtrama")) return { propias: [...de(propio), ...de(["subtrama"])], subtrama: [] };
  // Una trama de serie nace A, pero el autor puede hacerla B o C
  return { propias: de(propio), subtrama: d.que === "trama" && tipoArco !== "personaje" ? de(["subtrama"]) : [] };
}
