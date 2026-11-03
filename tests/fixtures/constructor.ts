// Crea series mínimas en memoria para las pruebas.

import { crearPieza } from "../../src/lib/modelo/ficheros";
import { Modelo } from "../../src/lib/modelo/modelo";
import type { Arco, Episodio, Evento, Punto, Secreto, Serie, Temporada } from "../../src/lib/modelo/tipos";
import type { Papel } from "../../src/lib/modelo/vocabulario";

export class Constructor {
  private n = 0;
  serie: Serie = crearPieza("serie", { id: "se-prueba", titulo: "Prueba" });
  temporadas: Temporada[] = [];
  episodios: Episodio[] = [];
  arcos: Arco[] = [];
  eventos: Evento[] = [];
  secretos: Secreto[] = [];
  puntos: Punto[] = [];

  private id(prefijo: string) {
    return `${prefijo}-${++this.n}`;
  }

  /** Crea una temporada con `episodios` episodios; devuelve su id y los de sus episodios */
  temporada(datos: Partial<Temporada> = {}, episodios = 0): { id: string; eps: string[] } {
    const t = crearPieza("temporada", { ...datos, id: datos.id ?? this.id("te") });
    this.temporadas.push(t);
    this.serie.temporadas.push(t.id);
    const eps = Array.from({ length: episodios }, () => this.episodio(t.id));
    return { id: t.id, eps };
  }

  episodio(temporada: string, datos: Partial<Episodio> = {}): string {
    const e = crearPieza("episodio", { ...datos, id: datos.id ?? this.id("ep"), temporada });
    this.episodios.push(e);
    this.temporadas.find((t) => t.id === temporada)!.episodios.push(e.id);
    return e.id;
  }

  arco(datos: Partial<Arco> = {}): string {
    const a = crearPieza("arco", { ...datos, id: datos.id ?? this.id("ar") });
    this.arcos.push(a);
    this.serie.arcos.push(a.id);
    return a.id;
  }

  /**
   * Evento en un episodio (o en la bandeja de `temporada` si no lleva episodio).
   * `arcos` como pares [id, papel].
   */
  evento(datos: Partial<Omit<Evento, "arcos">> & { arcos?: [string, Papel][] } = {}): string {
    const { arcos = [], ...resto } = datos;
    const ep = resto.episodio ? this.episodios.find((e) => e.id === resto.episodio) : undefined;
    const enCelda = this.eventos.filter((e) => e.episodio && e.episodio === resto.episodio);
    const e = crearPieza("evento", {
      orden: enCelda.length + 1,
      ...resto,
      id: resto.id ?? this.id("ev"),
      temporada: resto.temporada ?? ep?.temporada ?? "",
      arcos: arcos.map(([arco, papel]) => ({ arco, papel })),
    });
    this.eventos.push(e);
    return e.id;
  }

  secreto(datos: Partial<Secreto> = {}): string {
    const s = crearPieza("secreto", { ...datos, id: datos.id ?? this.id("sc") });
    this.secretos.push(s);
    return s.id;
  }

  modelo(): Modelo {
    return new Modelo({
      serie: this.serie,
      puntos: this.puntos,
      temporadas: this.temporadas,
      episodios: this.episodios,
      arcos: this.arcos,
      eventos: this.eventos,
      secretos: this.secretos,
    });
  }
}
