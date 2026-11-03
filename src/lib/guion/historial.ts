// Deshacer y rehacer del editor de guion (spec 013, RF-5). Uno por escena, en
// memoria y aparte del de las piezas y el de la pizarra. Cada paso guarda el
// documento de antes y el de después (son inmutables) con el cursor de cada uno.
// Escribir seguido se junta en un paso mientras no haya una pausa de 1 s.

import type { Documento, Pos } from "./documento";

export interface Estado {
  doc: Documento;
  pos: Pos;
}

interface Paso {
  antes: Estado;
  despues: Estado;
  clave?: string;
  hora: number;
}

export const MAXIMO_PASOS = 200;
/** Escribir con la misma clave y menos de esto entre pulsaciones se junta */
export const PAUSA_MS = 1000;

export class HistorialGuion {
  private hechos: Paso[] = [];
  private deshechos: Paso[] = [];
  /** El último paso aún se puede ampliar: no se ha deshecho ni rehecho nada desde él */
  private abierto = false;

  constructor(private readonly reloj: () => number = () => Date.now()) {}

  get puedeDeshacer(): boolean {
    return this.hechos.length > 0;
  }

  get puedeRehacer(): boolean {
    return this.deshechos.length > 0;
  }

  /** Anota un cambio. Con `clave` (p. ej. «escribir»), pulsaciones seguidas se juntan */
  hacer(antes: Estado, despues: Estado, clave?: string): void {
    if (antes.doc === despues.doc) return;
    const ahora = this.reloj();
    const ultimo = this.hechos[this.hechos.length - 1];
    this.deshechos = [];
    if (this.abierto && ultimo && clave && ultimo.clave === clave && ahora - ultimo.hora < PAUSA_MS) {
      ultimo.despues = despues;
      ultimo.hora = ahora;
      return;
    }
    this.hechos.push({ antes, despues, clave, hora: ahora });
    if (this.hechos.length > MAXIMO_PASOS) this.hechos.shift();
    this.abierto = true;
  }

  /** El estado al que volver, o null si no hay nada que deshacer */
  deshacer(): Estado | null {
    const paso = this.hechos.pop();
    if (!paso) return null;
    this.deshechos.push(paso);
    this.abierto = false;
    return paso.antes;
  }

  rehacer(): Estado | null {
    const paso = this.deshechos.pop();
    if (!paso) return null;
    this.hechos.push(paso);
    this.abierto = false;
    return paso.despues;
  }

  /** El texto cambió por otro lado (cambio por fuera, usar la de fuera): lo anterior ya no vale */
  vaciar(): void {
    this.hechos = [];
    this.deshechos = [];
    this.abierto = false;
  }
}
