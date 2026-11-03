// Deshacer y rehacer (spec 5.6, T7.3). Cada paso guarda el antes y el después
// de las piezas que tocó (null = no existía). Escribir seguido en una misma
// pieza cuenta como un solo paso. La pila es de la serie abierta y dura lo que
// dura la sesión.

import type { Cambio } from "./modelo";
import type { Pieza } from "./tipos";
import type { MetaPaso } from "../variantes/tipos";

export interface Cambiada {
  id: string;
  antes: Pieza | null;
  despues: Pieza | null;
}

interface Paso {
  piezas: Cambiada[];
  clave?: string;
  hora: number;
  /** La pieza que el paso cambió de sitio (canon bloqueado, RF-29) */
  mueve?: string;
  /** Entero o nada al deshacer y rehacer («Volver a como estaba», spec 005, RF-19, RF-20) */
  entero?: boolean;
  /** Lo que el paso cambió de los datos de la variante abierta (spec 006): base, sitios, pisa… */
  meta?: MetaPaso;
  /** El paso aplicó esta variante a la serie (spec 006, RF-38) */
  variante?: { id: string; cambiada: string };
}

/** Ediciones de la misma pieza con menos de esto entre ellas se juntan */
const JUNTAR_MS = 1500;
const MAXIMO = 200;

export class Historial {
  private hechos: Paso[] = [];
  private deshechos: Paso[] = [];
  /** El último paso aún se puede ampliar (no se ha deshecho ni rehecho nada desde él) */
  private abierto = false;

  /**
   * Lo que tenía que haber en el modelo para aplicar el último paso deshecho o
   * rehecho (null = no existía). Lo que cambió después no se toca (spec 002).
   */
  esperado = new Map<string, Pieza | null>();
  /** El último paso deshecho o rehecho va entero o nada (spec 005) */
  entero = false;
  /** Los datos de la variante del último paso deshecho o rehecho, hacia donde va (spec 006) */
  ultimoMeta: MetaPaso["antes"] | null = null;
  /** La variante que aplicó el último paso deshecho o rehecho, si la hay (spec 006, RF-38) */
  ultimaVariante: { id: string; cambiada: string } | null = null;

  constructor(private readonly reloj: () => number = () => Date.now()) {}

  get puedeDeshacer(): boolean {
    return this.hechos.length > 0;
  }

  get puedeRehacer(): boolean {
    return this.deshechos.length > 0;
  }

  hacer(piezas: Cambiada[], clave?: string, mueve?: string, entero = false, meta?: MetaPaso, variante?: { id: string; cambiada: string }): void {
    if (!piezas.length) return;
    const ahora = this.reloj();
    const ultimo = this.hechos[this.hechos.length - 1];
    this.deshechos = [];
    if (this.abierto && ultimo && !ultimo.entero && !entero && clave && ultimo.clave === clave && ahora - ultimo.hora < JUNTAR_MS) {
      for (const p of piezas) {
        const ya = ultimo.piezas.find((x) => x.id === p.id);
        if (ya) ya.despues = p.despues;
        else ultimo.piezas.push(p);
      }
      ultimo.hora = ahora;
      ultimo.mueve ??= mueve;
      if (meta) ultimo.meta = ultimo.meta ? juntarMeta(ultimo.meta, meta) : meta;
      return;
    }
    this.hechos.push({ piezas, clave, hora: ahora, mueve, ...(entero ? { entero } : {}), ...(meta ? { meta } : {}), ...(variante ? { variante } : {}) });
    if (this.hechos.length > MAXIMO) this.hechos.shift();
    this.abierto = true;
  }

  /** Las piezas del último paso hecho, o null (spec 005: punto de partida al crear) */
  ultimoPaso(): readonly Cambiada[] | null {
    return this.hechos[this.hechos.length - 1]?.piezas ?? null;
  }

  /** El último paso hecho creó esta pieza (spec 002: Deshacer de la idea capturada) */
  ultimoCrea(id: string): boolean {
    const ultimo = this.hechos[this.hechos.length - 1];
    return !!ultimo && ultimo.piezas.some((p) => p.id === id && p.antes === null && p.despues !== null);
  }

  deshacer(): Cambio | null {
    const paso = this.hechos.pop();
    if (!paso) return null;
    this.deshechos.push(paso);
    this.abierto = false;
    this.entero = !!paso.entero;
    this.ultimoMeta = paso.meta?.antes ?? null;
    this.ultimaVariante = paso.variante ?? null;
    this.esperado = new Map(paso.piezas.map((p) => [p.id, p.despues ? structuredClone(p.despues) : null]));
    return aplicarHacia(paso, "antes");
  }

  rehacer(): Cambio | null {
    const paso = this.deshechos.pop();
    if (!paso) return null;
    this.hechos.push(paso);
    this.abierto = false;
    this.entero = !!paso.entero;
    this.ultimoMeta = paso.meta?.despues ?? null;
    this.ultimaVariante = paso.variante ?? null;
    this.esperado = new Map(paso.piezas.map((p) => [p.id, p.antes ? structuredClone(p.antes) : null]));
    return aplicarHacia(paso, "despues");
  }
}

/** Dos pasos que se juntan: de cada entrada, el antes del primero y el después del último */
function juntarMeta(viejo: MetaPaso, nuevo: MetaPaso): MetaPaso {
  const r: MetaPaso = structuredClone(viejo);
  for (const k of ["piezas", "sitios", "pisa", "fichas"] as const) {
    const antes = r.antes[k] as Map<string, unknown>;
    const despues = r.despues[k] as Map<string, unknown>;
    for (const [id, x] of nuevo.antes[k] as Map<string, unknown>) if (!antes.has(id)) antes.set(id, x);
    for (const [id, x] of nuevo.despues[k] as Map<string, unknown>) despues.set(id, x);
  }
  return r;
}

function aplicarHacia(paso: Paso, lado: "antes" | "despues"): Cambio {
  const otro = lado === "antes" ? "despues" : "antes";
  const cambio: Cambio = { guardar: [], borrar: [], ...(paso.mueve ? { mueve: paso.mueve } : {}) };
  for (const p of paso.piezas) {
    const destino = p[lado];
    if (destino) cambio.guardar.push(structuredClone(destino));
    else if (p[otro]) cambio.borrar.push(structuredClone(p[otro]!));
  }
  return cambio;
}
