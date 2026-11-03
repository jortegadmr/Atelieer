// Deshacer y rehacer de la pizarra (spec 012, RF-10). Aparte del de las piezas:
// cada paso guarda la pizarra de antes y la de después (son inmutables). Un
// movimiento completo es un paso (la interfaz llama al soltar) y escribir texto
// seguido en una misma nota se junta. Vive en memoria.

import type { Pizarra } from "./tipos";

interface Paso {
  antes: Pizarra;
  despues: Pizarra;
  clave?: string;
  hora: number;
}

export const MAXIMO_PASOS = 200;
/** Ediciones con la misma clave y menos de esto entre ellas se juntan */
const JUNTAR_MS = 1500;

export class HistorialPizarra {
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

  hacer(antes: Pizarra, despues: Pizarra, clave?: string): void {
    if (antes === despues) return;
    const ahora = this.reloj();
    const ultimo = this.hechos[this.hechos.length - 1];
    this.deshechos = [];
    if (this.abierto && ultimo && clave && ultimo.clave === clave && ahora - ultimo.hora < JUNTAR_MS) {
      ultimo.despues = despues;
      ultimo.hora = ahora;
      return;
    }
    this.hechos.push({ antes, despues, clave, hora: ahora });
    if (this.hechos.length > MAXIMO_PASOS) this.hechos.shift();
    this.abierto = true;
  }

  /**
   * La pizarra cambió sin ser un paso (subir una nota, quitar una vacía): el último
   * paso acaba ahí, para que rehacer no devuelva lo de antes. Si lo único que hizo
   * ese paso fue crear lo que se quita, el paso desaparece.
   */
  seguir(actual: Pizarra, nueva: Pizarra): void {
    const ultimo = this.hechos[this.hechos.length - 1];
    if (!ultimo || ultimo.despues !== actual) return;
    const a = ultimo.antes;
    const igual = a.flechas.length === nueva.flechas.length && a.elementos.length === nueva.elementos.length && a.elementos.every((e, i) => e === nueva.elementos[i]) && a.flechas.every((f, i) => f === nueva.flechas[i]);
    if (igual) {
      this.hechos.pop();
      this.abierto = false;
    } else ultimo.despues = nueva;
  }

  /** La pizarra a la que volver, o null si no hay nada que deshacer */
  deshacer(): Pizarra | null {
    const paso = this.hechos.pop();
    if (!paso) return null;
    this.deshechos.push(paso);
    this.abierto = false;
    return paso.antes;
  }

  rehacer(): Pizarra | null {
    const paso = this.deshechos.pop();
    if (!paso) return null;
    this.hechos.push(paso);
    this.abierto = false;
    return paso.despues;
  }

  vaciar(): void {
    this.hechos = [];
    this.deshechos = [];
    this.abierto = false;
  }
}
