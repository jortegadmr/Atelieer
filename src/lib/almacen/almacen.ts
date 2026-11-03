// Almacén: la carpeta appDatos en disco (spec 11, plan 3.3). Lista series,
// abre una, guarda cada pieza en <id>.md (M1) y manda lo borrado a
// _papelera/. Un fichero roto no tumba la serie: se aparta y se enseña.

import { crearPieza, ErrorFormato, escribirPieza, leerPieza } from "../modelo/ficheros";
import { nuevoId } from "../modelo/ids";
import type { Arco, Episodio, Evento, Pieza, Punto, Secreto, Serie, Temporada } from "../modelo/tipos";
import { CARPETA, type TipoPieza } from "../modelo/vocabulario";
import { esConflicto } from "./conflictos";
import { escribirSeguro, normalizar, unir, type Fs } from "./fs";

export interface ProblemaFichero {
  ruta: string;
  mensaje: string;
}

export interface SerieEnLista {
  /** Nombre de la carpeta dentro de appDatos */
  carpeta: string;
  ruta: string;
  titulo: string;
  /** Si serie.md no se puede leer */
  problema?: string;
}

export interface DatosSerie {
  carpeta: string;
  ruta: string;
  serie: Serie;
  puntos: Punto[];
  temporadas: Temporada[];
  episodios: Episodio[];
  arcos: Arco[];
  eventos: Evento[];
  secretos: Secreto[];
  /** Ficheros que no se pudieron leer */
  problemas: ProblemaFichero[];
  /** Ficheros "(# Edit conflict … #)" de Proton (T1.6) */
  conflictos: string[];
}

/**
 * La nota cambió (o desapareció) fuera de Atelier desde que se leyó o se
 * escribió: no se pisa (spec 002, RNF integridad; constitución 2).
 */
export class CambioFuera extends Error {
  constructor(readonly ruta: string) {
    super(`«${ruta.slice(ruta.lastIndexOf("/") + 1)}» cambió fuera de Atelier: se queda lo de fuera; vuelve a hacer el cambio`);
    this.name = "CambioFuera";
  }
}

const TIPOS_EN_CARPETA = Object.keys(CARPETA) as Exclude<TipoPieza, "serie">[];
const LISTA_DE: Record<Exclude<TipoPieza, "serie">, keyof DatosSerie> = {
  punto: "puntos",
  temporada: "temporadas",
  episodio: "episodios",
  arco: "arcos",
  evento: "eventos",
  secreto: "secretos",
};

/** Nombre de carpeta a partir del título: sin acentos ni espacios */
export function carpetaParaTitulo(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha y hora para nombres de fichero de la papelera («2026-10-21 18-20-05») */
export function sello(fecha: Date): string {
  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ` +
    `${dos(fecha.getHours())}-${dos(fecha.getMinutes())}-${dos(fecha.getSeconds())}`
  );
}

/** ¿Se lee como pieza? Solo .md que no empiecen por _ o . ni sean conflictos */
export function esFicheroDePieza(nombre: string): boolean {
  return nombre.endsWith(".md") && !nombre.startsWith("_") && !nombre.startsWith(".") && !esConflicto(nombre);
}

export class Almacen {
  /** Reloj para los nombres de la papelera; las pruebas lo fijan */
  reloj: () => Date = () => new Date();
  /** Se llama justo antes de escribir (contenido) o borrar (null) un fichero: la vigilancia lo usa */
  alEscribir: ((ruta: string, contenido: string | null) => void) | null = null;
  /** Último contenido leído o escrito de cada nota (para no pisar lo de fuera) */
  private conocido = new Map<string, string>();
  readonly raiz: string;

  constructor(
    readonly fs: Fs,
    raiz: string,
  ) {
    this.raiz = normalizar(raiz).replace(/\/$/, "");
  }

  rutaSerie(carpeta: string): string {
    return unir(this.raiz, carpeta);
  }

  rutaPieza(carpeta: string, pieza: Pick<Pieza, "tipo" | "id">): string {
    if (pieza.tipo === "serie") return unir(this.raiz, carpeta, "serie.md");
    return unir(this.raiz, carpeta, CARPETA[pieza.tipo], `${pieza.id}.md`);
  }

  async listarSeries(): Promise<SerieEnLista[]> {
    const entradas = await this.fs.listar(this.raiz);
    const series: SerieEnLista[] = [];
    await Promise.all(
      entradas
        .filter((e) => e.esDir && !e.nombre.startsWith("."))
        .map(async (e) => {
          const ruta = unir(this.raiz, e.nombre);
          const rutaSerie = unir(ruta, "serie.md");
          if (!(await this.fs.existe(rutaSerie))) return;
          try {
            const s = leerPieza(await this.fs.leer(rutaSerie), "serie") as Serie;
            series.push({ carpeta: e.nombre, ruta, titulo: s.titulo || e.nombre });
          } catch (err) {
            series.push({ carpeta: e.nombre, ruta, titulo: e.nombre, problema: (err as Error).message });
          }
        }),
    );
    return series.sort((a, b) => a.carpeta.localeCompare(b.carpeta));
  }

  async crearSerie(carpeta: string, datos: Partial<Serie> = {}): Promise<Serie> {
    const ruta = this.rutaSerie(carpeta);
    if (await this.fs.existe(unir(ruta, "serie.md"))) throw new Error(`La serie «${carpeta}» ya existe.`);
    for (const c of Object.values(CARPETA)) await this.fs.crearDir(unir(ruta, c));
    const serie = crearPieza("serie", { ...datos, id: datos.id ?? nuevoId("serie", new Set()) });
    await this.guardar(carpeta, serie);
    return serie;
  }

  async abrirSerie(carpeta: string): Promise<DatosSerie> {
    const ruta = this.rutaSerie(carpeta);
    let serie: Serie;
    try {
      const texto = await this.fs.leer(unir(ruta, "serie.md"));
      serie = leerPieza(texto, "serie") as Serie;
      this.conocido.set(unir(ruta, "serie.md"), texto);
    } catch (e) {
      const motivo = e instanceof ErrorFormato ? e.message : "no se puede leer";
      throw new Error(`No se puede abrir la serie: serie.md ${motivo}`);
    }

    const datos: DatosSerie = {
      carpeta,
      ruta,
      serie,
      puntos: [],
      temporadas: [],
      episodios: [],
      arcos: [],
      eventos: [],
      secretos: [],
      problemas: [],
      conflictos: [],
    };

    const lecturas = await Promise.all(TIPOS_EN_CARPETA.map((tipo) => this.leerCarpeta(ruta, tipo)));
    const ids = new Set<string>([serie.id]);
    for (const { tipo, piezas, problemas, conflictos } of lecturas) {
      datos.problemas.push(...problemas);
      datos.conflictos.push(...conflictos);
      const lista = datos[LISTA_DE[tipo]] as Pieza[];
      for (const { pieza, ruta: r } of piezas) {
        if (ids.has(pieza.id)) {
          datos.problemas.push({ ruta: r, mensaje: `Id repetido (${pieza.id}): se ha dejado fuera esta copia.` });
          continue;
        }
        ids.add(pieza.id);
        lista.push(pieza);
      }
    }
    return datos;
  }

  /** Lee las piezas de una carpeta, en orden de nombre de fichero */
  private async leerCarpeta(rutaSerie: string, tipo: Exclude<TipoPieza, "serie">) {
    const dir = unir(rutaSerie, CARPETA[tipo]);
    const piezas: { pieza: Pieza; ruta: string }[] = [];
    const problemas: ProblemaFichero[] = [];
    const conflictos: string[] = [];
    if (!(await this.fs.existe(dir))) return { tipo, piezas, problemas, conflictos };

    const entradas = (await this.fs.listar(dir)).filter((e) => !e.esDir).sort((a, b) => a.nombre.localeCompare(b.nombre));
    for (const e of entradas) if (esConflicto(e.nombre)) conflictos.push(unir(dir, e.nombre));

    const leidas = await Promise.all(
      entradas
        .filter((e) => esFicheroDePieza(e.nombre))
        .map(async (e) => {
          const ruta = unir(dir, e.nombre);
          try {
            const pieza = await this.leerPiezaEn(ruta, tipo);
            return { pieza, ruta };
          } catch (err) {
            return { problema: { ruta, mensaje: (err as Error).message } };
          }
        }),
    );
    for (const l of leidas) {
      if ("problema" in l && l.problema) problemas.push(l.problema);
      else if ("pieza" in l && l.pieza) piezas.push({ pieza: l.pieza, ruta: l.ruta });
    }
    return { tipo, piezas, problemas, conflictos };
  }

  /** Lee un fichero suelto (para recargar lo que cambie desde fuera) */
  async leerPiezaEn(ruta: string, tipo: TipoPieza): Promise<Pieza> {
    const nombre = ruta.slice(ruta.lastIndexOf("/") + 1).replace(/\.md$/, "");
    const texto = await this.fs.leer(ruta);
    const pieza = leerPieza(texto, tipo, nombre);
    this.conocido.set(normalizar(ruta), texto);
    return pieza;
  }

  /** Lo último leído o escrito de la nota de esta pieza (undefined si nunca se leyó) */
  conocidoDe(carpeta: string, pieza: Pick<Pieza, "tipo" | "id">): string | undefined {
    return this.conocido.get(this.rutaPieza(carpeta, pieza));
  }

  /** La nota se borró fuera: ya no hay nada que proteger en esa ruta */
  olvidarConocido(ruta: string): void {
    this.conocido.delete(normalizar(ruta));
  }

  /** Rutas de estas piezas cuya nota ya no es la que se leyó o escribió (cambió fuera) */
  async cambiadasFuera(carpeta: string, piezas: Pick<Pieza, "tipo" | "id">[]): Promise<string[]> {
    const rutas = await Promise.all(
      piezas.map(async (p) => {
        const ruta = this.rutaPieza(carpeta, p);
        // Lo conocido, antes de leer: si la vigilancia relee la nota mientras tanto, sigue contando
        const conocido = this.conocido.get(ruta);
        if (conocido === undefined) return null;
        const actual = (await this.fs.existe(ruta)) ? await this.fs.leer(ruta) : null;
        return actual !== conocido ? ruta : null;
      }),
    );
    return rutas.filter((r): r is string => r !== null);
  }

  /**
   * Guarda la pieza en su fichero; devuelve la ruta y el texto escrito. Si la
   * nota ya no es `base` (la que había cuando el autor hizo el cambio; por
   * defecto, la última conocida), no escribe: lanza CambioFuera.
   */
  async guardar(carpeta: string, pieza: Pieza, opciones: { base?: string } = {}): Promise<{ ruta: string; contenido: string }> {
    const ruta = this.rutaPieza(carpeta, pieza);
    const contenido = escribirPieza(pieza);
    const base = "base" in opciones ? opciones.base : this.conocido.get(ruta);
    if (base !== undefined) {
      const actual = (await this.fs.existe(ruta)) ? await this.fs.leer(ruta) : null;
      if (actual !== base) throw new CambioFuera(ruta);
    }
    this.alEscribir?.(ruta, contenido);
    await escribirSeguro(this.fs, ruta, contenido);
    this.conocido.set(ruta, contenido);
    return { ruta, contenido };
  }

  /**
   * Mueve el fichero de la pieza a _papelera/ con la fecha delante; devuelve su
   * nueva ruta, o null si la pieza no llegó a guardarse.
   */
  async borrar(carpeta: string, pieza: Pieza): Promise<string | null> {
    if (pieza.tipo === "serie") throw new Error("Una serie no se borra desde la app.");
    const origen = this.rutaPieza(carpeta, pieza);
    if (!(await this.fs.existe(origen))) return null;
    const papelera = unir(this.rutaSerie(carpeta), "_papelera");
    await this.fs.crearDir(papelera);
    const base = `${sello(this.reloj())} ${pieza.id}`;
    let destino = unir(papelera, `${base}.md`);
    for (let n = 2; await this.fs.existe(destino); n++) destino = unir(papelera, `${base} (${n}).md`);
    this.alEscribir?.(origen, null);
    await this.fs.renombrar(origen, destino);
    this.conocido.delete(origen);
    return destino;
  }

  /** La ruta de la nota de una pieza, comprobando que queda dentro de la carpeta de la serie */
  private rutaDentro(carpeta: string, pieza: Pick<Pieza, "tipo" | "id">): string {
    const ruta = this.rutaPieza(carpeta, pieza);
    const serie = this.rutaSerie(carpeta);
    if (!ruta.startsWith(`${serie}/`) || ruta.split("/").some((x) => x === ".." || x === ".")) throw new Error(`«${pieza.id}» no es una pieza de esta serie.`);
    return ruta;
  }

  /**
   * Escribe todas estas notas y manda a la papelera estas otras, todo o nada
   * (spec 006, RF-37). Antes lee el texto de cada una: si al ir a escribirla ya
   * no es ese (cambió fuera), o algo falla, devuelve lo escrito a su texto de
   * antes, saca de la papelera lo que mandó allí, manda a la papelera lo que
   * creó, y lanza el error. Devuelve dónde quedó en la papelera cada borrada y
   * cómo deshacerlo todo después (si lo que viene detrás, la wiki, falla).
   */
  async escribirTodo(carpeta: string, guardar: Pieza[], borrar: Pieza[]): Promise<{ papelera: Map<string, string>; deshacer: () => Promise<void> }> {
    const leer = async (ruta: string) => ((await this.fs.existe(ruta)) ? await this.fs.leer(ruta) : null);
    const antes = new Map<string, string | null>();
    for (const p of [...guardar, ...borrar]) {
      const ruta = this.rutaDentro(carpeta, p);
      if (!antes.has(ruta)) antes.set(ruta, await leer(ruta));
    }
    const escritas: { pieza: Pieza; ruta: string }[] = [];
    const movidas: { id: string; origen: string; destino: string }[] = [];
    // Deshace lo hecho, al revés: lo último, lo primero
    const volver = async () => {
      while (movidas.length) {
        const m = movidas.pop()!;
        this.alEscribir?.(m.destino, null);
        await this.fs.renombrar(m.destino, m.origen);
        const texto = antes.get(m.origen);
        if (texto) this.conocido.set(m.origen, texto);
      }
      while (escritas.length) {
        const x = escritas.pop()!;
        const texto = antes.get(x.ruta);
        if (texto === null || texto === undefined) await this.borrar(carpeta, x.pieza);
        else {
          this.alEscribir?.(x.ruta, texto);
          await escribirSeguro(this.fs, x.ruta, texto);
          this.conocido.set(x.ruta, texto);
        }
      }
    };
    try {
      for (const p of guardar) {
        const ruta = this.rutaDentro(carpeta, p);
        if ((await leer(ruta)) !== antes.get(ruta)) throw new CambioFuera(ruta);
        const contenido = escribirPieza(p);
        this.alEscribir?.(ruta, contenido);
        await escribirSeguro(this.fs, ruta, contenido);
        this.conocido.set(ruta, contenido);
        escritas.push({ pieza: p, ruta });
      }
      for (const p of borrar) {
        const ruta = this.rutaDentro(carpeta, p);
        if ((await leer(ruta)) !== antes.get(ruta)) throw new CambioFuera(ruta);
        const destino = await this.borrar(carpeta, p);
        if (destino) movidas.push({ id: p.id, origen: ruta, destino });
      }
    } catch (e) {
      try {
        await volver();
      } catch (e2) {
        throw new ErrorVueltaAtras((e as Error).message, (e2 as Error).message);
      }
      throw e;
    }
    const papelera = new Map(movidas.map((m) => [m.id, m.destino]));
    return {
      papelera,
      deshacer: async () => {
        try {
          await volver();
        } catch (e2) {
          throw new ErrorVueltaAtras("la wiki", (e2 as Error).message);
        }
      },
    };
  }
}

/** Algo falló al escribir todo y, al devolverlo, también: hay notas a medias (la instantánea de antes las recupera) */
export class ErrorVueltaAtras extends Error {
  constructor(
    readonly primero: string,
    readonly alVolver: string,
  ) {
    super(`No se pudo escribir (${primero}) y tampoco devolver lo ya escrito (${alVolver}).`);
    this.name = "ErrorVueltaAtras";
  }
}
