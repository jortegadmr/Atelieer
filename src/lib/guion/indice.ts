// Índice de páginas del guion (spec 013, RF-23, RF-24, RNF-4): cuántas páginas
// y minutos tiene cada escena, y las sumas por episodio, temporada y serie. Es
// solo memoria y se puede tirar: se reconstruye leyendo _guion/. Las escenas se
// leen en segundo plano, de cuatro en cuatro, y mientras tanto el total dice
// «calculando». Una escena sin guion no suma ni se estima: se cuenta como falta.
// Leer aquí NO toca lo «conocido» del almacén (eso es de quien edita).

import type { AlmacenGuion } from "../almacen/almacen-guion";
import { MAX_FICHERO_GUION } from "../almacen/almacen-guion";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import { leerGuion } from "./formato";
import { medir, type Medida } from "./paginas";
import { esIdEscena } from "./tipos";

export type Ambito = { que: "episodio"; id: string } | { que: "temporada"; id: string } | { que: "serie" };

export interface Resumen {
  /** Escenas que cuentan (las descartadas no) */
  escenas: number;
  /** Las que tienen guion */
  conGuion: number;
  paginas: number;
  segundos: number;
  /** Aún se están leyendo escenas: las cifras pueden subir */
  calculando: boolean;
}

/** null = sin guion (no suma); una Medida = lo que se leyó */
type Entrada = Medida | null;

const MAX_LECTURAS = 4;

export class IndiceGuion {
  private cache = new Map<string, Entrada>();
  private generacion = 0;
  private enMarcha = 0;
  private enVuelo = new Set<string>();
  private cola: string[] = [];
  /** Cuántas veces cambió cada escena: una lectura que empezó antes de un cambio no vale */
  private versiones = new Map<string, number>();
  private esperando: Array<() => void> = [];
  /** La interfaz se entera cuando hay cifras nuevas */
  alCambiar: () => void = () => undefined;

  constructor(
    private readonly guion: AlmacenGuion,
    private readonly modelo: () => Modelo,
    private readonly lecturas = MAX_LECTURAS,
  ) {}

  /** Lecturas del disco hechas a la vez, como mucho (para el test) */
  maximoSimultaneas = 0;

  get calculando(): boolean {
    return this.cola.length > 0 || this.enMarcha > 0;
  }

  /** Lo medido de una escena: undefined = aún sin leer; null = sin guion */
  medidaDe(id: string): Entrada | undefined {
    return this.cache.get(id);
  }

  /** Pide medir lo que falte de las escenas que cuentan; devuelve cuando todo está leído */
  calcular(): Promise<void> {
    const gen = this.generacion;
    for (const ev of this.escenas()) if (!this.cache.has(ev.id) && !this.enVuelo.has(ev.id) && !this.cola.includes(ev.id)) this.cola.push(ev.id);
    const fin = new Promise<void>((res) => {
      if (!this.calculando) res();
      else this.esperando.push(res);
    });
    this.bombear(gen);
    return fin;
  }

  /** Lo que se escribe en pantalla: se mide al momento, sin esperar al disco */
  ponerTexto(id: string, texto: string): void {
    this.tocar(id);
    this.cache.set(id, /\S/.test(texto) ? medir(texto) : null);
    this.alCambiar();
  }

  /** Algo cambió en esas escenas (fuera de Atelier, mover, borrar): se vuelven a leer. Sin ids, todas (restaurar) */
  invalidar(ids?: string[]): void {
    if (!ids) {
      for (const id of this.cache.keys()) this.tocar(id);
      this.cache.clear();
    } else {
      for (const id of ids) {
        this.tocar(id);
        this.cache.delete(id);
      }
    }
    this.alCambiar();
    void this.calcular();
  }

  /** Para `Sesion.alCambiarGuion`: el id sale del nombre del fichero */
  invalidarRutas(rutas: string[]): void {
    const ids = rutas.map((r) => /([^/\\]+)\.md$/.exec(r)?.[1]).filter((id): id is string => !!id && esIdEscena(id));
    if (ids.length) this.invalidar(ids);
  }

  /** Cambio de serie: lo que está leyéndose se tira y no escribe nada */
  cancelar(): void {
    this.generacion++;
    this.cola = [];
    this.enMarcha = 0;
    this.enVuelo.clear();
    this.cache.clear();
    this.versiones.clear();
    this.liberar();
  }

  resumen(ambito: Ambito): Resumen {
    const m = this.modelo();
    const idx = m.indice();
    let evs: Evento[];
    if (ambito.que === "episodio") evs = idx.porEpisodio.get(ambito.id) ?? [];
    else if (ambito.que === "temporada") evs = this.deTemporada(m, ambito.id);
    else evs = idx.temporadas.flatMap((t) => this.deTemporada(m, t));
    return this.sumar(evs.filter(cuenta));
  }

  // --- por dentro ---

  private deTemporada(m: Modelo, t: string): Evento[] {
    const idx = m.indice();
    // La bandeja cuenta en temporada y serie, no en episodio
    return [...(idx.episodiosDe.get(t) ?? []).flatMap((e) => idx.porEpisodio.get(e) ?? []), ...(idx.bandeja.get(t) ?? [])];
  }

  private escenas(): Evento[] {
    return [...this.modelo().eventos.values()].filter((e) => esIdEscena(e.id) && cuenta(e));
  }

  private sumar(evs: Evento[]): Resumen {
    let conGuion = 0;
    let paginas = 0;
    let segundos = 0;
    let sinLeer = false;
    for (const ev of evs) {
      const e = this.cache.get(ev.id);
      if (e === undefined) sinLeer = true;
      else if (e) {
        conGuion++;
        paginas += e.paginas;
        segundos += e.segundos;
      }
    }
    return { escenas: evs.length, conGuion, paginas, segundos, calculando: sinLeer || this.calculando };
  }

  private bombear(gen: number): void {
    while (this.enMarcha < this.lecturas && this.cola.length) {
      const id = this.cola.shift()!;
      const version = this.versiones.get(id) ?? 0;
      this.enMarcha++;
      this.enVuelo.add(id);
      this.maximoSimultaneas = Math.max(this.maximoSimultaneas, this.enMarcha);
      void this.leer(id).then((e) => {
        if (gen !== this.generacion) return;
        this.enVuelo.delete(id);
        this.enMarcha--;
        // Si se cambió de serie o se invalidó mientras se leía, esto ya no vale
        if ((this.versiones.get(id) ?? 0) === version) this.cache.set(id, e);
        this.alCambiar();
        this.bombear(gen);
        if (!this.calculando) this.liberar();
      });
    }
  }

  private tocar(id: string): void {
    this.versiones.set(id, (this.versiones.get(id) ?? 0) + 1);
  }

  private liberar(): void {
    const fin = this.esperando;
    this.esperando = [];
    for (const f of fin) f();
  }

  private async leer(id: string): Promise<Entrada> {
    try {
      const crudo = await this.guion.leerCrudo(id);
      if (crudo === null || crudo.length > MAX_FICHERO_GUION) return null;
      const r = leerGuion(crudo);
      if ("ilegible" in r || !/\S/.test(r.guion.texto)) return null;
      return medir(r.guion.texto);
    } catch {
      return null;
    }
  }
}

/** Las descartadas no suman (RF-21): están aparte */
function cuenta(ev: Evento): boolean {
  return estadoDe(ev) !== "descartado";
}
