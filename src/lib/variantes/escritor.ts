// Guarda la variante abierta (spec 006, RF-9): cada cambio pide guardar y, al
// medio segundo sin cambios, se escribe la nota entera por AlmacenVariantes
// (el único camino). Si la nota cambió fuera, no se pisa: se dice y se avisa.
// Tiene la misma cara que el guardado de la serie, para el pie del panel.

import { CambioFuera } from "../almacen/almacen";
import type { GuardadoVisible } from "../app/sesion";
import { escribirPieza } from "../modelo/ficheros";
import type { Pieza } from "../modelo/tipos";
import type { AlmacenVariantes } from "./almacen-variantes";
import { escribirVariante } from "./formato";
import type { DatosVariante, PiezaVariante } from "./tipos";

const REINTENTO_MS = 3000;

/** Cómo quedó la última escritura: guardada, cambió fuera (se queda lo de fuera) o falló (se reintenta) */
export type ResultadoEscritura = "bien" | "fuera" | "error";

/** Las piezas son valores: el texto de cada una se escribe una sola vez */
const textos = new WeakMap<Pieza, string>();
function textoDe(p: Pieza): string {
  let t = textos.get(p);
  if (t === undefined) {
    t = escribirPieza(p);
    textos.set(p, t);
  }
  return t;
}

export class EscritorVariante implements GuardadoVisible {
  ultimo: number | null = null;
  error: string | null = null;
  aviso: string | null = null;
  private pedido = false;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private escribiendo: Promise<void> = Promise.resolve();
  private resultado: ResultadoEscritura = "bien";

  constructor(
    private readonly variantes: AlmacenVariantes,
    private readonly datos: () => DatosVariante,
    private readonly titulo: (id: string, p: PiezaVariante) => string,
    private readonly alCambiar: () => void,
    /** La nota cambió fuera de Atelier: hay que volver a leerla */
    private readonly alCambioFuera: () => void,
    private readonly retrasoMs = 500,
  ) {}

  get pendiente(): boolean {
    return this.pedido;
  }

  pedir(): void {
    this.pedido = true;
    this.programar(this.retrasoMs);
    this.alCambiar();
  }

  quitarAviso(): void {
    this.aviso = null;
    this.alCambiar();
  }

  private programar(ms: number) {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      void this.vaciar();
    }, ms);
  }

  /** Escribe ya lo pendiente y dice cómo quedó */
  vaciar(): Promise<ResultadoEscritura> {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.escribiendo = this.escribiendo.then(() => this.escribir());
    return this.escribiendo.then(() => this.resultado);
  }

  /** Deja de escribir (la variante se cerró sin guardar lo pendiente: ya se guardó o cambió fuera) */
  parar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.pedido = false;
  }

  private async escribir(): Promise<void> {
    if (!this.pedido) return;
    this.pedido = false;
    const v = this.datos();
    // Una variante que nunca cambió nada no deja nota (RF-26)
    if (!v.piezas.size && !this.variantes.lista.has(v.id)) return;
    try {
      await this.variantes.guardar(v.id, escribirVariante(v, { titulo: this.titulo, texto: textoDe }));
      this.error = null;
      this.resultado = "bien";
      this.ultimo = Date.now();
    } catch (e) {
      if (e instanceof CambioFuera) {
        this.aviso = "La variante cambió fuera de Atelier (otro equipo o a mano): se queda lo de fuera y se vuelve a abrir.";
        this.resultado = "fuera";
        this.alCambioFuera();
      } else {
        this.error = `No se pudo guardar la variante (${(e as Error).message}). Se reintenta sola.`;
        this.resultado = "error";
        this.pedido = true;
        this.programar(REINTENTO_MS);
      }
    }
    this.alCambiar();
  }
}
