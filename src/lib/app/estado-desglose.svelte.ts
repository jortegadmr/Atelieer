// El desglose del guion en el estado de la app (spec 014): lo que se lee del
// disco, los filtros y la vista elegida, y las dos cosas que escriben —«Añadir a
// la escena» y la duración objetivo—. Mientras se está en otra vista no se
// recalcula nada. Lo que se elige (filtros, columnas…) dura hasta cerrar la serie.

import { cambioAnadir, type Lista } from "../desglose/cuadre";
import { COLUMNAS, sinFiltros, type Agrupar, type CacheAnalisis, type ColumnaDesglose, type Filtros } from "../desglose/desglose";
import { leerTextos } from "../desglose/lectura";
import { guardarObjetivo, leerObjetivo, objetivoVacio, type LecturaObjetivo, type Objetivo } from "../desglose/objetivo";
import { esIdEscena } from "../guion/tipos";
import { AVISO_BLOQUEADA, type Sesion } from "./sesion";

export interface AnfitrionDesglose {
  readonly sesionSerie: Sesion | null;
  /** Con una variante abierta no es null */
  readonly variante: unknown;
}

export type SubvistaDesglose = "escenas" | "personajes" | "lugares" | "serie" | "cuadre";

export interface Resultado {
  hecho: boolean;
  mensaje: string;
}

export class EstadoDesglose {
  /** El guion de cada escena (null = sin guion); null mientras no se haya leído */
  textos = $state.raw<Map<string, string | null> | null>(null);
  cargando = $state(false);
  hechas = $state(0);
  total = $state(0);
  error = $state<string | null>(null);

  filtros = $state<Filtros>(sinFiltros());
  agrupar = $state<Agrupar>("locacion");
  columnas = $state<ColumnaDesglose[]>(COLUMNAS.map((c) => c.id));
  subvista = $state<SubvistaDesglose>("escenas");

  objetivo = $state.raw<LecturaObjetivo | null>(null);

  /** Lo que se dijo al autor (lo lee un lector de pantalla) */
  anuncio = $state("");

  readonly cache: CacheAnalisis = new Map();
  private gen = 0;

  constructor(private readonly anfitrion: AnfitrionDesglose) {}

  /** Hay una variante abierta: se lee la serie principal y no se ofrece añadir (RF-19) */
  get conVariante(): boolean {
    return !!this.anfitrion.variante;
  }

  /** Lee los guiones y la duración objetivo. Se puede repetir: lo último que se pidió gana */
  async cargar(): Promise<void> {
    const s = this.anfitrion.sesionSerie;
    if (!s) return;
    const gen = ++this.gen;
    this.cargando = true;
    this.error = null;
    this.hechas = 0;
    try {
      await s.leerWikiSoloLectura();
      const ids = [...s.modelo.eventos.values()].filter((e) => esIdEscena(e.id)).map((e) => e.id);
      this.total = ids.length;
      const textos = await leerTextos(s.guion, ids, {
        alAvanzar: (h, t) => {
          if (gen === this.gen) (this.hechas = h), (this.total = t);
        },
        cancelado: () => gen !== this.gen,
      });
      const objetivo = await leerObjetivo(s.almacen.fs, s.almacen.rutaSerie(s.carpeta));
      if (gen !== this.gen) return;
      this.textos = textos;
      this.objetivo = objetivo;
    } catch (e) {
      if (gen === this.gen) this.error = `No se pudo leer el desglose: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      if (gen === this.gen) this.cargando = false;
    }
  }

  /** Otra serie, o ninguna: todo vuelve a empezar */
  reiniciar(): void {
    this.gen++;
    this.textos = null;
    this.objetivo = null;
    this.cargando = false;
    this.error = null;
    this.hechas = 0;
    this.total = 0;
    this.filtros = sinFiltros();
    this.agrupar = "locacion";
    this.columnas = COLUMNAS.map((c) => c.id);
    this.subvista = "escenas";
    this.anuncio = "";
    this.cache.clear();
  }

  // --- Filtros

  /** Pone o quita un valor de una lista del filtro */
  alternar<K extends "locaciones" | "personajes" | "ie" | "momentos" | "estados">(que: K, valor: Filtros[K][number]): void {
    const lista = this.filtros[que] as Array<Filtros[K][number]>;
    this.filtros = { ...this.filtros, [que]: lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor] };
  }

  quitarFiltros(): void {
    this.filtros = sinFiltros();
    this.anuncio = "Filtros quitados.";
  }

  // --- Lo que escribe

  /** «Añadir a la escena» (spec 014, RF-17): por el camino de siempre, un solo paso del deshacer */
  async anadir(id: string, items: Partial<Lista>): Promise<Resultado> {
    const s = this.anfitrion.sesionSerie;
    if (!s) return { hecho: false, mensaje: "No hay serie abierta." };
    if (this.conVariante) return { hecho: false, mensaje: "Con una variante abierta no se añade nada a las escenas." };
    if (s.estaBloqueada(id)) return { hecho: false, mensaje: AVISO_BLOQUEADA };
    const cambio = cambioAnadir(s.modelo, id, items);
    if (!cambio) return { hecho: true, mensaje: "La escena ya lo tenía." };
    const hecho = await s.aplicar(cambio, true);
    const mensaje = hecho ? "Añadido a la escena. Ctrl Z lo deshace." : "No se pudo añadir a la escena.";
    this.anuncio = mensaje;
    return { hecho, mensaje };
  }

  /** Guarda la duración objetivo (spec 014, RF-12) y vuelve a leerla si algo cambió fuera */
  async guardarObjetivo(nuevo: Objetivo): Promise<Resultado> {
    const s = this.anfitrion.sesionSerie;
    const leido = this.objetivo;
    if (!s || !leido) return { hecho: false, mensaje: "No hay serie abierta." };
    if (this.conVariante) return { hecho: false, mensaje: "Con una variante abierta no se cambia la duración objetivo." };
    const ruta = s.almacen.rutaSerie(s.carpeta);
    try {
      const r = await guardarObjetivo(s.almacen.fs, ruta, nuevo, leido);
      // Si mientras tanto se cambió de serie, lo escrito ya está en disco pero esta vista no es la suya
      if (s !== this.anfitrion.sesionSerie) return { hecho: r.hecho, mensaje: r.hecho ? "Duración objetivo guardada." : "No se guardó." };
      if (r.hecho) {
        this.objetivo = { objetivo: nuevo, crudo: r.crudo, avisos: leido.avisos, soloLectura: false };
        this.anuncio = "Duración objetivo guardada.";
        return { hecho: true, mensaje: this.anuncio };
      }
      if (r.motivo === "fuera") {
        this.objetivo = await leerObjetivo(s.almacen.fs, ruta);
        return { hecho: false, mensaje: "La duración objetivo cambió fuera de Atelier. Se ha vuelto a leer: revísala y guarda otra vez." };
      }
      if (r.motivo === "solo-lectura") return { hecho: false, mensaje: "Este fichero se escribió con otra versión de Atelier o no se entiende: solo se mira." };
      return { hecho: false, mensaje: "La duración tiene que ser un número de minutos mayor que cero." };
    } catch (e) {
      return { hecho: false, mensaje: `No se pudo guardar la duración objetivo: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  objetivoActual(): Objetivo {
    return this.objetivo?.objetivo ?? objetivoVacio();
  }
}
