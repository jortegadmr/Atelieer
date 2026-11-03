// Copia congelada de la etiqueta v1.0 (spec 001, T4). No se toca: sirve para probar que la v1.0 sigue leyendo lo que escribe la v2.
// Valores comunes con la wiki (spec 4.1, plan 3.4). Cada lista existe una sola
// vez aquí, con su etiqueta en español para la interfaz. En los ficheros se
// guarda el valor; en pantalla se ve la etiqueta.

export interface Lista<V extends string = string> {
  valores: readonly V[];
  etiquetas: Record<V, string>;
}

export const LISTAS: Lista[] = [];
const etiquetasDe = new Map<readonly string[], Record<string, string>>();

function lista<const V extends string>(valores: readonly V[], etiquetas: Record<V, string>): readonly V[] {
  Object.freeze(valores);
  etiquetasDe.set(valores, etiquetas);
  LISTAS.push({ valores, etiquetas });
  return valores;
}

export function etiqueta<V extends string>(valores: readonly V[], valor: V): string {
  return etiquetasDe.get(valores)?.[valor] ?? valor;
}

export function esValor<V extends string>(valores: readonly V[], valor: unknown): valor is V {
  return typeof valor === "string" && (valores as readonly string[]).includes(valor);
}

export const TIPO_PIEZA = lista(["serie", "punto", "temporada", "episodio", "arco", "evento", "secreto"], {
  serie: "serie",
  punto: "punto clave",
  temporada: "temporada",
  episodio: "episodio",
  arco: "arco",
  evento: "evento",
  secreto: "secreto",
});
export type TipoPieza = (typeof TIPO_PIEZA)[number];

/** estado_canon de la regla 9 */
export const MADUREZ = lista(["idea", "borrador", "canon", "descartado"], {
  idea: "idea",
  borrador: "borrador",
  canon: "canon",
  descartado: "descartado",
});
export type Madurez = (typeof MADUREZ)[number];

/** Tramo de escritura del estado de la Guía §6 */
export const ESTADO_ESCRITURA = lista(["idea", "escaleta", "guion"], {
  idea: "idea",
  escaleta: "escaleta",
  guion: "guion",
});
export type EstadoEscritura = (typeof ESTADO_ESCRITURA)[number];

export const ESTADO_TEMPORADA = lista(["prevista", "en marcha", "cerrada"], {
  prevista: "prevista",
  "en marcha": "en marcha",
  cerrada: "cerrada",
});
export type EstadoTemporada = (typeof ESTADO_TEMPORADA)[number];

export const TIPO_ARCO = lista(["trama", "personaje", "relacion"], {
  trama: "trama",
  personaje: "personaje",
  relacion: "relación",
});
export type TipoArco = (typeof TIPO_ARCO)[number];

export const TIPO_TRAMA = lista(["A", "B", "C"], {
  A: "principal",
  B: "secundaria",
  C: "de respiro",
});
export type TipoTrama = (typeof TIPO_TRAMA)[number];

export const NIVEL_ARCO = lista(["serie", "temporada"], {
  serie: "de serie",
  temporada: "de temporada",
});
export type NivelArco = (typeof NIVEL_ARCO)[number];

/** Beats de la plantilla Arco, en orden */
export const BEATS = lista(["planteamiento", "complicacion", "punto_medio", "crisis", "resolucion"], {
  planteamiento: "planteamiento",
  complicacion: "complicación",
  punto_medio: "punto medio",
  crisis: "crisis",
  resolucion: "resolución",
});
export type Beat = (typeof BEATS)[number];

export const NIVEL_SECRETO = lista(["menor", "mayor", "central"], {
  menor: "menor",
  mayor: "mayor",
  central: "central",
});
export type NivelSecreto = (typeof NIVEL_SECRETO)[number];

export const CLASE_PISTA = lista(["obvia", "sutil"], { obvia: "obvia", sutil: "sutil" });
export type ClasePista = (typeof CLASE_PISTA)[number];

/** Papel de un evento en un arco */
export const PAPEL = lista(["abre", "avanza", "gira", "cierra"], {
  abre: "abre",
  avanza: "avanza",
  gira: "gira",
  cierra: "cierra",
});
export type Papel = (typeof PAPEL)[number];

/** Cómo se cuenta un evento (regla 13) */
export const MODO = lista(["escena", "flashback", "leyenda"], {
  escena: "en escena",
  flashback: "flashback",
  leyenda: "leyenda contada",
});
export type Modo = (typeof MODO)[number];

/** Acto del evento (D9) */
export const ACTO = lista(["teaser", "1", "2", "3"], {
  teaser: "teaser",
  "1": "inicio",
  "2": "desarrollo",
  "3": "desenlace",
});
export type Acto = (typeof ACTO)[number];

export const CLASE_PUNTO = lista(["inicio", "detonante", "giro", "crisis", "climax", "fin", "otro"], {
  inicio: "inicio",
  detonante: "detonante",
  giro: "giro",
  crisis: "crisis",
  climax: "clímax",
  fin: "fin",
  otro: "otro",
});
export type ClasePunto = (typeof CLASE_PUNTO)[number];

/** Carga o valor: + y − (§12, Escena 1.3). En el fichero va "-". */
export const CARGA = lista(["+", "-"], { "+": "+", "-": "−" });
export type Carga = (typeof CARGA)[number];

export const PEGAMENTO_POR = lista(["trama", "tema"], { trama: "por trama", tema: "por tema" });
export type PegamentoPor = (typeof PEGAMENTO_POR)[number];

/** Carpeta de cada tipo de pieza dentro de una serie (spec 11.1) */
export const CARPETA: Record<Exclude<TipoPieza, "serie">, string> = {
  punto: "puntos",
  temporada: "temporadas",
  episodio: "episodios",
  arco: "arcos",
  evento: "eventos",
  secreto: "secretos",
};

/** Prefijo del id de cada tipo de pieza */
export const PREFIJO: Record<TipoPieza, string> = {
  serie: "se",
  punto: "pt",
  temporada: "te",
  episodio: "ep",
  arco: "ar",
  evento: "ev",
  secreto: "sc",
};

/** Las 10-11 preguntas de §2 §29, en este orden (la última es la de bonus) */
export const PREGUNTAS_SERIE = [
  "Protagonista",
  "Dónde",
  "Antagonista",
  "Conflicto",
  "Acción principal",
  "Objetivo",
  "Riesgos",
  "Punto de crisis",
  "Cómo se resuelve el clímax",
  "Cómo cambia el protagonista",
  "Mensaje",
] as const;
