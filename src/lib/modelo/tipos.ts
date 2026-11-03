// Las siete piezas (spec 4.2, plan 3.4). En el fichero todos los campos son
// opcionales; en memoria cada pieza llega completa, con los vacíos rellenos
// (ver ficheros.ts). Las relaciones van por id (D4).

import type {
  Acto,
  Carga,
  ClasePista,
  ClasePunto,
  EstadoEscritura,
  EstadoTemporada,
  Madurez,
  MadurezMesa,
  Modo,
  NivelArco,
  NivelSecreto,
  Papel,
  PegamentoPor,
  TipoArco,
  TipoPieza,
  TipoTrama,
} from "./vocabulario";

/** Carga o valor inicial y final. "" = sin decidir. */
export type ParCarga = [Carga | "", Carga | ""];

/** Lugar en el orden de emisión. Episodio vacío = toda la temporada. */
export interface Posicion {
  temporada: string;
  episodio: string;
}

/** Lo que tienen todas las piezas */
export interface PiezaBase {
  id: string;
  tipo: TipoPieza;
  /** Campos del fichero que el programa no conoce: se conservan al guardar */
  extra: Record<string, unknown>;
  /** Texto libre debajo de las propiedades */
  texto: string;
  /**
   * Valor original de un campo que no se entiende (un estado como «en pausa»,
   * un acto como «prólogo»): se enseña como el valor por defecto y, mientras
   * el campo no cambie, se vuelve a escribir tal cual.
   */
  crudos?: Record<string, unknown>;
}

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export interface RutasWiki {
  raiz: string;
  personajes: string;
  lugares: string;
  eras: string;
  timeline: string;
  narrativa: string;
  log: string;
}

export interface Serie extends PiezaBase {
  tipo: "serie";
  titulo: string;
  premisa: string;
  logline: { protagonista: string; objetivo: string; problema: string; accion: string; catalizador: string };
  pregunta_oro: string;
  final_decidido: string;
  preguntas_filosoficas: string[];
  tema: string;
  dinamica: string;
  preguntas: Pregunta[];
  /** Orden de emisión (M2) */
  temporadas: string[];
  /** Orden de los arcos en las listas (como M2; no está en el plan 3.4) */
  arcos: string[];
  /** Relativas al vault (M3) */
  wiki: RutasWiki;
  /** D5 */
  olvido_fraccion: number;
  avisos_silenciados: string[];
}

export interface Punto extends PiezaBase {
  tipo: "punto";
  clase: ClasePunto;
  posicion: Posicion;
  que_pasa: string;
}

export interface MomentoEstructura {
  texto: string;
  episodio: string;
}

/** Campos de enlace con la wiki de temporada, episodio, arco y secreto */
export interface EnlaceWiki {
  /** "[[T01 - Cerrar la emisora]]" tras pasarla */
  wiki: string;
  wiki_mtime: string;
}

export interface Temporada extends PiezaBase, EnlaceWiki {
  tipo: "temporada";
  titulo: string;
  madurez: Madurez;
  /** Spec 001: propuesta o aparcado, aparte (la v1.0 lo ve como idea) */
  madurez_mesa: MadurezMesa | "";
  motivo_descarte: string;
  estado: EstadoTemporada;
  logline: string;
  pregunta_dramatica: string;
  tema: string;
  partida: string;
  estructura: {
    detonante: MomentoEstructura;
    punto_medio: MomentoEstructura;
    crisis: MomentoEstructura;
    climax: MomentoEstructura;
  };
  llegada: string;
  cierre: string;
  /** Los 8 pasos del Story Circle (§12) */
  story_circle: string[];
  carga: ParCarga;
  /** Trama principal (D7) */
  principal: string;
  /** Orden de los episodios (M2) */
  episodios: string[];
  /** Ancho de una temporada sin episodios aún */
  episodios_previstos: number;
  avisos_silenciados: string[];
}

export interface Episodio extends PiezaBase, EnlaceWiki {
  tipo: "episodio";
  temporada: string;
  titulo: string;
  /** Spec 001: la v1.0 no tiene estado en los episodios; lo ignora y lo conserva */
  madurez: Madurez;
  madurez_mesa: MadurezMesa | "";
  motivo_descarte: string;
  idea_central: string;
  protagonista: string;
  deseo: string;
  fuerza_antagonica: string;
  conflicto: string;
  accion: string;
  contexto: string;
  gancho: string;
  carga: ParCarga;
  estado: EstadoEscritura;
  /** D9 */
  actos: { teaser: string; inicio: string; desarrollo: string; desenlace: string };
  /** D8: vacío = calculada */
  dominante_manual: string;
  avisos_silenciados: string[];
}

export interface BeatArco {
  temporada: string;
  episodio: string;
  texto: string;
}

export interface Siembra {
  siembra: string;
  donde: string;
  recogida: string;
  donde_recogida: string;
}

export interface EstadoPersonaje {
  temporada: string;
  inicio: string;
  fin: string;
}

export interface Arco extends PiezaBase, EnlaceWiki {
  tipo: "arco";
  titulo: string;
  madurez: Madurez;
  madurez_mesa: MadurezMesa | "";
  tipo_arco: TipoArco;
  nivel: NivelArco;
  /** Solo si nivel = temporada */
  temporada: string;
  tipo_trama: TipoTrama;
  /** 1-6 */
  color: number;
  /** Id del arco de serie del que este es tramo */
  tramo_de: string;
  inicio: Posicion;
  fin: Posicion;
  /** Planteamiento, complicación, punto medio, crisis, resolución */
  beats: BeatArco[];
  // trama y relación
  protagonistas: string[];
  quiere: string;
  impide: string;
  gana: string;
  pierde: string;
  bomba: string;
  bomba_vence: Posicion;
  cambia: string;
  pegamento: { por: PegamentoPor | ""; texto: string };
  // personaje
  personaje: string;
  necesita: string;
  herida: string;
  mentira: string;
  estados: EstadoPersonaje[];
  // todos
  /** D10 */
  siembras: Siembra[];
  motivo_descarte: string;
  avisos_silenciados: string[];
}

export interface ArcoEnEvento {
  arco: string;
  papel: Papel;
}

export interface Evento extends PiezaBase {
  tipo: "evento";
  titulo: string;
  madurez: Madurez;
  madurez_mesa: MadurezMesa | "";
  temporada: string;
  /** Vacío = bandeja de su temporada */
  episodio: string;
  orden: number;
  acto: Acto | "";
  arcos: ArcoEnEvento[];
  personajes: string[];
  lugares: string[];
  /** Época del mundo; vacío = presente */
  mundo: string;
  modo: Modo;
  valor: string;
  cambio: ParCarga;
  gana: string;
  pierde: string;
  relleno: { avanza: boolean; revela: boolean };
  eliminacion: string;
  motivo_descarte: string;
  avisos_silenciados: string[];
}

export interface Pista {
  episodio: string;
  evento: string;
  texto: string;
  clase: ClasePista;
}

export interface PistaFalsa {
  episodio: string;
  evento: string;
  texto: string;
  conclusion: string;
}

export interface Secreto extends PiezaBase, EnlaceWiki {
  tipo: "secreto";
  /** Sin spoiler */
  titulo: string;
  madurez: Madurez;
  madurez_mesa: MadurezMesa | "";
  nivel: NivelSecreto;
  /** Solo autor (regla 10) */
  verdad: string;
  cree_audiencia: string;
  conocen: string[];
  revelado_en: { episodio: string; evento: string };
  pistas: Pista[];
  falsas: PistaFalsa[];
  motivo_descarte: string;
  avisos_silenciados: string[];
}

export type Pieza = Serie | Punto | Temporada | Episodio | Arco | Evento | Secreto;

export type PiezaDe<T extends TipoPieza> = Extract<Pieza, { tipo: T }>;
