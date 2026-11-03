// Arrastrar eventos entre la bandeja y las celdas de la rejilla (T5.4). Se
// usa el arrastre de HTML; para que funcione en Windows, la ventana lleva
// `dragDropEnabled: false` (si no, WebView2 se lo queda).

import { moverEvento } from "../../lib/modelo/operaciones";
import type { Sesion } from "../../lib/app/sesion";

const TIPO = "application/x-atelier-evento";
let arrastrado: string | null = null;

export function empezarArrastre(e: DragEvent, eventoId: string) {
  arrastrado = eventoId;
  e.dataTransfer?.setData(TIPO, eventoId);
  e.dataTransfer?.setData("text/plain", eventoId);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

export function acabarArrastre() {
  arrastrado = null;
}

/** ¿Se está arrastrando un evento? (en dragover no se puede leer el dato) */
export function hayEvento(e: DragEvent): boolean {
  return arrastrado !== null || !!e.dataTransfer?.types.includes(TIPO);
}

/** Suelta el evento arrastrado en un episodio ("" = bandeja), en la posición `indice` de la celda */
export async function soltarEvento(e: DragEvent, sesion: Sesion, episodio: string, indice?: number) {
  e.preventDefault();
  e.stopPropagation();
  const id = e.dataTransfer?.getData(TIPO) || arrastrado;
  arrastrado = null;
  if (!id) return;
  await sesion.aplicar(moverEvento(sesion.modelo, id, episodio, indice));
}
