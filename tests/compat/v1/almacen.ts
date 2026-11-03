// Copia congelada de la etiqueta v1.0 (spec 006, T6). No se toca (solo las rutas de import, a esta carpeta): sirve para probar que la v1.0 no ve ni toca _variantes/.
// Almacén: la carpeta appDatos en disco (spec 11, plan 3.3). Lista series,
// abre una, guarda cada pieza en <id>.md (M1) y manda lo borrado a
// _papelera/. Un fichero roto no tumba la serie: se aparta y se enseña.

import { crearPieza, ErrorFormato, escribirPieza, leerPieza } from "./ficheros";
import { nuevoId } from "./ids";
import type { Arco, Episodio, Evento, Pieza, Punto, Secreto, Serie, Temporada } from "./tipos";
import { CARPETA, type TipoPieza } from "./vocabulario";
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

function sello(fecha: Date): string {
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
      serie = leerPieza(await this.fs.leer(unir(ruta, "serie.md")), "serie") as Serie;
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
    return leerPieza(await this.fs.leer(ruta), tipo, nombre);
  }

  /** Guarda la pieza en su fichero; devuelve la ruta y el texto escrito */
  async guardar(carpeta: string, pieza: Pieza): Promise<{ ruta: string; contenido: string }> {
    const ruta = this.rutaPieza(carpeta, pieza);
    const contenido = escribirPieza(pieza);
    this.alEscribir?.(ruta, contenido);
    await escribirSeguro(this.fs, ruta, contenido);
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
    return destino;
  }
}
