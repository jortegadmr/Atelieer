// Modelo en memoria de una serie abierta (spec 4.3): las piezas por id y un
// índice de relaciones que se rehace solo cuando algo cambia. Las piezas se
// tratan como valores: para editar una, se copia, se cambia y se pone (poner).
// Así deshacer (T7.3) puede guardar el antes y el después.

import { codigosDeSerie, ordenEpisodios, ordenTemporadas } from "./codigos";
import { crearPieza } from "./ficheros";
import { nuevoId } from "./ids";
import type { Arco, Episodio, Evento, Pieza, PiezaDe, Punto, Secreto, Serie, Temporada } from "./tipos";
import type { TipoPieza } from "./vocabulario";

export interface DatosModelo {
  serie: Serie;
  puntos: Punto[];
  temporadas: Temporada[];
  episodios: Episodio[];
  arcos: Arco[];
  eventos: Evento[];
  secretos: Secreto[];
}

/** Lo que una operación deja por escribir en disco */
export interface Cambio {
  guardar: Pieza[];
  borrar: Pieza[];
  /** La pieza que cambia de sitio, si el cambio es moverla (canon bloqueado, RF-29) */
  mueve?: string;
}

export interface PosEpisodio {
  /** Índice de su temporada en la serie */
  iT: number;
  /** Índice dentro de su temporada */
  iE: number;
  /** Índice en la secuencia de episodios de toda la serie */
  global: number;
}

export interface Indice {
  temporadas: string[];
  posTemporada: Map<string, number>;
  episodiosDe: Map<string, string[]>;
  /** Todos los episodios de la serie, en orden de emisión */
  episodios: string[];
  posEpisodio: Map<string, PosEpisodio>;
  /** Eventos colocados en cada episodio, por orden */
  porEpisodio: Map<string, Evento[]>;
  /** Eventos sin episodio de cada temporada, por orden */
  bandeja: Map<string, Evento[]>;
  /** Eventos de cada arco: los colocados por emisión y después los de la bandeja */
  porArco: Map<string, Evento[]>;
  tramos: Map<string, Arco[]>;
  codigos: Map<string, string>;
}

const porOrden = (a: Evento, b: Evento) => a.orden - b.orden || a.id.localeCompare(b.id);

export class Modelo {
  serie: Serie;
  readonly puntos = new Map<string, Punto>();
  readonly temporadas = new Map<string, Temporada>();
  readonly episodios = new Map<string, Episodio>();
  readonly arcos = new Map<string, Arco>();
  readonly eventos = new Map<string, Evento>();
  readonly secretos = new Map<string, Secreto>();

  /** Sube con cada cambio; las vistas lo usan para saber cuándo redibujar */
  version = 0;
  private cache: { version: number; indice: Indice } | null = null;
  private oyentes = new Set<() => void>();

  constructor(d: DatosModelo) {
    this.serie = d.serie;
    for (const p of [...d.puntos, ...d.temporadas, ...d.episodios, ...d.arcos, ...d.eventos, ...d.secretos]) {
      this.mapaDe(p.tipo)!.set(p.id, p as never);
    }
  }

  private mapaDe(tipo: TipoPieza): Map<string, Pieza> | null {
    switch (tipo) {
      case "punto":
        return this.puntos;
      case "temporada":
        return this.temporadas;
      case "episodio":
        return this.episodios;
      case "arco":
        return this.arcos;
      case "evento":
        return this.eventos;
      case "secreto":
        return this.secretos;
      case "serie":
        return null;
    }
  }

  pieza(id: string): Pieza | undefined {
    if (id === this.serie.id) return this.serie;
    for (const m of [this.eventos, this.episodios, this.arcos, this.temporadas, this.secretos, this.puntos]) {
      const p = m.get(id);
      if (p) return p;
    }
    return undefined;
  }

  *todas(): Iterable<Pieza> {
    yield this.serie;
    for (const m of [this.puntos, this.temporadas, this.episodios, this.arcos, this.eventos, this.secretos]) {
      yield* m.values();
    }
  }

  nuevoId(tipo: TipoPieza): string {
    return nuevoId(tipo, { has: (id) => this.pieza(id) !== undefined });
  }

  /** Avisa cada vez que cambia algo; devuelve la función para dejar de oír */
  alCambiar(fn: () => void): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  private cambiado() {
    this.version++;
    for (const fn of this.oyentes) fn();
  }

  /** Pone (añade o sustituye) una pieza; devuelve la que había */
  poner(p: Pieza): Pieza | undefined {
    let antes: Pieza | undefined;
    if (p.tipo === "serie") {
      antes = this.serie;
      this.serie = p;
    } else {
      const mapa = this.mapaDe(p.tipo)!;
      antes = mapa.get(p.id);
      mapa.set(p.id, p);
    }
    this.cambiado();
    return antes;
  }

  /** Quita una pieza; devuelve la que había */
  quitar(id: string): Pieza | undefined {
    const p = this.pieza(id);
    if (!p || p.tipo === "serie") return undefined;
    this.mapaDe(p.tipo)!.delete(id);
    this.cambiado();
    return p;
  }

  /** Una pieza nueva de ese tipo con id libre, sin ponerla todavía */
  nueva<T extends Exclude<TipoPieza, "serie">>(tipo: T, datos: Partial<PiezaDe<T>> = {}): PiezaDe<T> {
    return crearPieza(tipo, { ...datos, id: this.nuevoId(tipo) } as Partial<PiezaDe<T>> & { id: string });
  }

  /**
   * Inserta un episodio en la posición `indice` de su temporada (M2: se escribe él y su temporada).
   * Ojo: pone las piezas aquí mismo, sin pasar por `Sesion.aplicar` (ni deshacer ni la
   * comparación de «Si lo dejas así…»). Desde la interfaz, usa `operaciones.insertarEpisodio`.
   */
  insertarEpisodio(temporadaId: string, indice: number, datos: Partial<Episodio> = {}): { episodio: Episodio; cambio: Cambio } {
    const temporada = this.temporadas.get(temporadaId);
    if (!temporada) throw new Error(`No existe la temporada ${temporadaId}`);
    const episodio = this.nueva("episodio", { ...datos, temporada: temporadaId });
    const orden = ordenEpisodios(temporada, [...this.episodios.values()]);
    orden.splice(Math.max(0, Math.min(indice, orden.length)), 0, episodio.id);
    const nuevaTemporada: Temporada = { ...structuredClone(temporada), episodios: orden };
    this.poner(episodio);
    this.poner(nuevaTemporada);
    return { episodio, cambio: { guardar: [episodio, nuevaTemporada], borrar: [] } };
  }

  /** Índice de relaciones, rehecho solo si algo cambió desde la última vez */
  indice(): Indice {
    if (this.cache && this.cache.version === this.version) return this.cache.indice;
    const indice = this.construirIndice();
    this.cache = { version: this.version, indice };
    return indice;
  }

  private construirIndice(): Indice {
    const listaT = [...this.temporadas.values()];
    const listaE = [...this.episodios.values()];
    const temporadas = ordenTemporadas(this.serie, listaT);
    const posTemporada = new Map(temporadas.map((id, i) => [id, i]));
    const episodiosDe = new Map<string, string[]>();
    const episodios: string[] = [];
    const posEpisodio = new Map<string, PosEpisodio>();
    temporadas.forEach((idT, iT) => {
      const eps = ordenEpisodios(this.temporadas.get(idT)!, listaE);
      episodiosDe.set(idT, eps);
      eps.forEach((idE, iE) => {
        posEpisodio.set(idE, { iT, iE, global: episodios.length });
        episodios.push(idE);
      });
    });

    const porEpisodio = new Map<string, Evento[]>();
    const bandeja = new Map<string, Evento[]>();
    for (const ev of this.eventos.values()) {
      if (ev.episodio && posEpisodio.has(ev.episodio)) {
        const l = porEpisodio.get(ev.episodio) ?? [];
        l.push(ev);
        porEpisodio.set(ev.episodio, l);
      } else {
        const l = bandeja.get(ev.temporada) ?? [];
        l.push(ev);
        bandeja.set(ev.temporada, l);
      }
    }
    for (const l of porEpisodio.values()) l.sort(porOrden);
    for (const l of bandeja.values()) l.sort(porOrden);

    const porArco = new Map<string, Evento[]>();
    const anotar = (ev: Evento) => {
      for (const { arco } of ev.arcos) {
        const l = porArco.get(arco) ?? [];
        if (!l.includes(ev)) l.push(ev);
        porArco.set(arco, l);
      }
    };
    for (const idE of episodios) for (const ev of porEpisodio.get(idE) ?? []) anotar(ev);
    for (const idT of temporadas) for (const ev of bandeja.get(idT) ?? []) anotar(ev);
    for (const [idT, l] of bandeja) if (!posTemporada.has(idT)) l.forEach(anotar);

    const tramos = new Map<string, Arco[]>();
    for (const a of this.arcos.values()) {
      if (!a.tramo_de) continue;
      const l = tramos.get(a.tramo_de) ?? [];
      l.push(a);
      tramos.set(a.tramo_de, l);
    }

    const codigos = codigosDeSerie(this.serie, listaT, listaE);
    return { temporadas, posTemporada, episodiosDe, episodios, posEpisodio, porEpisodio, bandeja, porArco, tramos, codigos };
  }
}
