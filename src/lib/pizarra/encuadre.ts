// El encuadre del lienzo (spec 012, RF-11): cuánto está desplazado y acercado.
// Un punto del lienzo (px, py) se ve en la pantalla en (px·zoom + x, py·zoom + y).

import { ZOOM_MAX, ZOOM_MIN, type Pizarra } from "./tipos";

export interface Encuadre {
  x: number;
  y: number;
  zoom: number;
}

export const ENCUADRE_INICIAL: Encuadre = { x: 0, y: 0, zoom: 1 };

/** Lo que mide un elemento para encajar (nota y tarjeta tienen el mismo tamaño base) */
export const TAMANO_ELEMENTO = { ancho: 220, alto: 140 } as const;

const MARGEN = 40;

const limitarZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

/** Cambia el zoom por `factor` dejando quieto el punto de la pantalla bajo `foco` */
export function acercar(e: Encuadre, factor: number, foco: { x: number; y: number }): Encuadre {
  const zoom = limitarZoom(e.zoom * factor);
  const k = zoom / e.zoom;
  return { x: foco.x - (foco.x - e.x) * k, y: foco.y - (foco.y - e.y) * k, zoom };
}

export function mover(e: Encuadre, dx: number, dy: number): Encuadre {
  return { ...e, x: e.x + dx, y: e.y + dy };
}

/**
 * Lo deja todo a la vista: centrado y con el zoom que quepa, sin agrandar más
 * de 1 y sin bajar del mínimo. Sin elementos devuelve el mismo encuadre.
 */
export function encajar(p: Pizarra, pantalla: { ancho: number; alto: number }, actual: Encuadre): Encuadre {
  if (!p.elementos.length) return actual;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const e of p.elementos) {
    x0 = Math.min(x0, e.x);
    y0 = Math.min(y0, e.y);
    x1 = Math.max(x1, e.x + TAMANO_ELEMENTO.ancho);
    y1 = Math.max(y1, e.y + TAMANO_ELEMENTO.alto);
  }
  const ancho = x1 - x0;
  const alto = y1 - y0;
  const util = { ancho: Math.max(1, pantalla.ancho - 2 * MARGEN), alto: Math.max(1, pantalla.alto - 2 * MARGEN) };
  const zoom = limitarZoom(Math.min(1, util.ancho / ancho, util.alto / alto));
  return { zoom, x: pantalla.ancho / 2 - ((x0 + x1) / 2) * zoom, y: pantalla.alto / 2 - ((y0 + y1) / 2) * zoom };
}
