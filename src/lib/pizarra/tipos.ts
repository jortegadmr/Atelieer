// Lo que hay en la pizarra de una serie (spec 012): notas, tarjetas de piezas y
// flechas. No es una pieza de la serie: no entra en el Modelo. Todo es de solo
// lectura por convención; las operaciones devuelven una pizarra nueva.

export const VERSION = 1;

/** Los seis colores de las notas; el nombre es lo que lee un lector de pantalla */
export const COLORES = [
  { id: "ambar", nombre: "Ámbar" },
  { id: "rosa", nombre: "Rosa" },
  { id: "verde", nombre: "Verde" },
  { id: "azul", nombre: "Azul" },
  { id: "lila", nombre: "Lila" },
  { id: "gris", nombre: "Gris" },
] as const;

export type ColorNota = (typeof COLORES)[number]["id"];

export const esColor = (c: unknown): c is ColorNota => COLORES.some((x) => x.id === c);

/** Topes (spec 012, RF-3, RF-7, RF-15), en grafemas los de texto */
export const MAX_NOTA = 5000;
export const MAX_ETIQUETA = 60;
export const MAX_ELEMENTOS = 200;
export const MAX_FLECHAS = 400;

/** El lienzo llega a ±LIENZO px en cada eje (RF-11) */
export const LIENZO = 20000;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;

/** Campos que la app no entiende: se conservan y se reescriben tal cual (RNF-4) */
export type Extra = Record<string, unknown>;

export interface Nota {
  tipo: "nota";
  id: string;
  texto: string;
  color: ColorNota;
  x: number;
  y: number;
  extra: Extra;
}

export interface Tarjeta {
  tipo: "tarjeta";
  id: string;
  /** El id de la pieza: la tarjeta la sigue por él, no por el título */
  pieza: string;
  /** El id de la nota de la que nació por «Pasar a idea» */
  origen?: string;
  x: number;
  y: number;
  extra: Extra;
}

export type Elemento = Nota | Tarjeta;

export interface Flecha {
  id: string;
  de: string;
  a: string;
  etiqueta: string;
  extra: Extra;
}

export interface Pizarra {
  version: number;
  /** El orden es el apilado: el último se pinta encima (RNF-10) */
  elementos: Elemento[];
  flechas: Flecha[];
  extra: Extra;
}

export const vacia = (): Pizarra => ({ version: VERSION, elementos: [], flechas: [], extra: {} });
