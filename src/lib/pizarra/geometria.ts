// Geometría del lienzo (spec 012, RF-6, RF-7, RF-11): dónde empieza y acaba una
// flecha, dónde cae un elemento nuevo y a qué elemento se llega con el puntero.
// Todo en coordenadas del lienzo, no de la pantalla.

import { TAMANO_ELEMENTO as T } from "./encuadre";
import { LIENZO, type Elemento, type Pizarra } from "./tipos";

export interface Punto {
  x: number;
  y: number;
}

export const centro = (e: Punto): Punto => ({ x: e.x + T.ancho / 2, y: e.y + T.alto / 2 });

/** Donde la recta que va del centro de `e` hacia `hacia` sale del rectángulo de `e` */
export function salida(e: Punto, hacia: Punto): Punto {
  const c = centro(e);
  const dx = hacia.x - c.x;
  const dy = hacia.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const k = Math.min(dx === 0 ? Infinity : T.ancho / 2 / Math.abs(dx), dy === 0 ? Infinity : T.alto / 2 / Math.abs(dy));
  return { x: c.x + dx * k, y: c.y + dy * k };
}

/** El trazo de una flecha de `a` a `b`: de borde a borde, con su punto medio para la etiqueta */
export function trazoFlecha(a: Punto, b: Punto): { desde: Punto; hasta: Punto; medio: Punto } {
  const desde = salida(a, centro(b));
  const hasta = salida(b, centro(a));
  return { desde, hasta, medio: { x: (desde.x + hasta.x) / 2, y: (desde.y + hasta.y) / 2 } };
}

const DESPLAZO = 28;

/**
 * Un sitio cerca de `deseado` que no tape justo a otro elemento: se corre en
 * diagonal hasta encontrar hueco, sin salirse del lienzo.
 */
export function sitioLibre(p: Pizarra, deseado: Punto): Punto {
  const dentro = (v: number) => Math.min(LIENZO, Math.max(-LIENZO, v));
  let s = { x: dentro(deseado.x), y: dentro(deseado.y) };
  const ocupado = (q: Punto) => p.elementos.some((e) => Math.abs(e.x - q.x) < 14 && Math.abs(e.y - q.y) < 14);
  for (let i = 0; i < 50 && ocupado(s); i++) s = { x: dentro(s.x + DESPLAZO), y: dentro(s.y + DESPLAZO) };
  return s;
}

/** Los elementos cuyo rectángulo contiene el punto, el de más arriba primero (último del apilado) */
export function elementoEn(p: Pizarra, punto: Punto): Elemento | null {
  for (let i = p.elementos.length - 1; i >= 0; i--) {
    const e = p.elementos[i];
    if (punto.x >= e.x && punto.x <= e.x + T.ancho && punto.y >= e.y && punto.y <= e.y + T.alto) return e;
  }
  return null;
}

/** De un punto de la pantalla al lienzo, con el encuadre de ahora */
export function aLienzo(pantalla: Punto, enc: { x: number; y: number; zoom: number }): Punto {
  return { x: (pantalla.x - enc.x) / enc.zoom, y: (pantalla.y - enc.y) / enc.zoom };
}
