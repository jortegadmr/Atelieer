// Los guiones de una serie en disco (spec 013): appDatos/<serie>/_guion/<id de
// la escena>.md, uno por escena. La v1.0 no mira esa carpeta (solo las de cada
// tipo de pieza). Es el único camino para escribirlos: en cola por escena y
// sin pisar lo cambiado fuera. Sigue a AlmacenPizarra (spec 012), pero por escena.

import { escribirGuion, leerGuion } from "../guion/formato";
import { medir } from "../guion/paginas";
import { esIdEscena, vacio, type Guion } from "../guion/tipos";
import { CambioFuera, sello, type Almacen } from "./almacen";
import { BorradaFuera } from "./almacen-pizarra";
import { esConflicto } from "./conflictos";
import { escribirSeguro, unir } from "./fs";

export const CARPETA_GUION = "_guion";

/** Un fichero de guion de más de esto (en caracteres) no se lee: se avisa y se ignora */
export const MAX_FICHERO_GUION = 2_000_000;

export interface CargaGuion {
  guion: Guion;
  avisos: string[];
  /** Una versión más nueva, un guion pasado de tope o un fichero ignorado: solo se mira */
  soloLectura: boolean;
  /** Había fichero en disco */
  existe: boolean;
}

export interface Ignorado {
  nombre: string;
  motivo: string;
}

export interface ListadoGuion {
  /** Ids con guion cuya escena existe (o todos, si no se dijo cuáles existen) */
  guiones: string[];
  /** Ids con guion cuya escena ya no existe: se conservan y se avisa */
  huerfanos: string[];
  /** Ficheros que no son guiones (conflictos de sincronización, nombres raros): se avisa y no se tocan */
  ignorados: Ignorado[];
}

const NOMBRE_GUION = /^(ev-[a-z0-9]{4,})\.md$/;

export class AlmacenGuion {
  /** Por escena: lo último leído o escrito; null = no había fichero */
  private conocido = new Map<string, string | null>();
  private colas = new Map<string, Promise<unknown>>();

  constructor(
    private readonly almacen: Almacen,
    private readonly carpeta: string,
  ) {}

  get dir(): string {
    return unir(this.almacen.rutaSerie(this.carpeta), CARPETA_GUION);
  }

  /** Solo con un id válido: ningún texto llega a una ruta */
  ruta(id: string): string {
    if (!esIdEscena(id)) throw new Error(`«${String(id).slice(0, 40)}» no es el id de una escena`);
    return unir(this.dir, `${id}.md`);
  }

  private get papelera(): string {
    return unir(this.almacen.rutaSerie(this.carpeta), "_papelera", CARPETA_GUION);
  }

  async existe(id: string): Promise<boolean> {
    return this.almacen.fs.existe(this.ruta(id));
  }

  /** El fichero tal cual está en disco (para copiarlo a la papelera), o null si no existe */
  async leerCrudo(id: string): Promise<string | null> {
    const ruta = this.ruta(id);
    return (await this.almacen.fs.existe(ruta)) ? this.almacen.fs.leer(ruta) : null;
  }

  /** Sin fichero, un guion vacío y no se crea nada */
  async cargar(id: string): Promise<CargaGuion> {
    const ruta = this.ruta(id);
    const fs = this.almacen.fs;
    if (!(await fs.existe(ruta))) {
      this.conocido.set(id, null);
      return { guion: vacio(id), avisos: [], soloLectura: false, existe: false };
    }
    const texto = await fs.leer(ruta);
    if (texto.length > MAX_FICHERO_GUION) {
      this.conocido.set(id, texto);
      return { guion: vacio(id), avisos: ["Este fichero de guion es enorme (más de 2 MB): se ignora y no se puede editar."], soloLectura: true, existe: true };
    }
    const r = leerGuion(texto);
    if ("ilegible" in r) {
      const destino = await this.apartar(id);
      this.conocido.set(id, null);
      return { guion: vacio(id), avisos: [`${r.ilegible} Se apartó a «${destino}» y se empieza con un guion vacío.`], soloLectura: false, existe: false };
    }
    this.conocido.set(id, texto);
    const avisos = [...r.avisos];
    let soloLectura = r.soloLectura;
    if (!soloLectura && medir(r.guion.texto).superaTope) {
      soloLectura = true;
      avisos.push("Este guion pasa del tope de páginas: se abre en solo lectura.");
    }
    return { guion: { ...r.guion, escena: r.guion.escena || id }, avisos, soloLectura, existe: true };
  }

  /** El fichero ilegible se queda junto al guion con su fecha: nunca se borra */
  private async apartar(id: string): Promise<string> {
    const fs = this.almacen.fs;
    const base = `${id} rota ${sello(this.almacen.reloj())}`;
    let nombre = `${base}.md`;
    for (let n = 2; await fs.existe(unir(this.dir, nombre)); n++) nombre = `${base} (${n}).md`;
    this.almacen.alEscribir?.(this.ruta(id), null);
    await fs.renombrar(this.ruta(id), unir(this.dir, nombre));
    return nombre;
  }

  /** Vuelve a leer del disco (tras un cambio por fuera) y pone lo conocido al día */
  async releer(id: string): Promise<CargaGuion> {
    await this.esperar(id);
    return this.cargar(id);
  }

  /** ¿El disco ya no es lo último leído o escrito? */
  async comprobarFuera(id: string): Promise<boolean> {
    await this.esperar(id);
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    const actual = (await fs.existe(ruta)) ? await fs.leer(ruta) : null;
    return actual !== (this.conocido.get(id) ?? null);
  }

  private async esperar(id: string): Promise<void> {
    await (this.colas.get(id) ?? Promise.resolve()).catch(() => undefined);
  }

  /**
   * Escribe el guion (en cola por escena). Si el disco ya no tiene lo último
   * leído o escrito, cambió fuera: lanza CambioFuera y no escribe. Si lo que
   * falta es el fichero, avisa una vez y el siguiente guardado escribe.
   */
  guardar(id: string, g: Guion): Promise<void> {
    try {
      this.ruta(id);
    } catch (e) {
      return Promise.reject(e);
    }
    const esta = this.esperar(id).then(() => this.escribir(id, g));
    this.colas.set(id, esta);
    return esta;
  }

  private async escribir(id: string, g: Guion): Promise<void> {
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    const actual = (await fs.existe(ruta)) ? await fs.leer(ruta) : null;
    const conocido = this.conocido.get(id) ?? null;
    if (actual !== conocido) {
      if (actual === null) {
        this.conocido.set(id, null);
        throw new BorradaFuera(ruta);
      }
      throw new CambioFuera(ruta);
    }
    // Un guion vacío que nunca se escribió no deja rastro
    if (actual === null && !/\S/.test(g.texto) && !Object.keys(g.extra).length) return;
    const texto = escribirGuion({ ...g, escena: g.escena || id });
    if (texto === actual) return;
    await fs.crearDir(this.dir);
    this.almacen.alEscribir?.(ruta, texto);
    await escribirSeguro(fs, ruta, texto);
    this.conocido.set(id, texto);
  }

  /** Para «Quedarme con la mía» y similares: tras decidir, lo conocido pasa a ser lo del disco */
  async adoptarDelDisco(id: string): Promise<void> {
    await this.esperar(id);
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    this.conocido.set(id, (await fs.existe(ruta)) ? await fs.leer(ruta) : null);
  }

  /** Un nombre libre en la papelera: `<base>.md`, `<base> (2).md`… */
  private async nombreLibre(base: string): Promise<string> {
    const fs = this.almacen.fs;
    let nombre = `${base}.md`;
    for (let n = 2; await fs.existe(unir(this.papelera, nombre)); n++) nombre = `${base} (${n}).md`;
    return nombre;
  }

  /**
   * Una copia en _papelera/_guion/ (RF-30): `<id> copia <sello>.md`, sin pisar
   * otra. Copia lo que se le pasa (el texto de la memoria justo antes de
   * aplicar el cambio, o el fichero crudo del disco), no lo que haya en disco.
   */
  async copiaAPapelera(id: string, contenido: Guion | string): Promise<string> {
    this.ruta(id);
    const fs = this.almacen.fs;
    await fs.crearDir(this.papelera);
    const nombre = await this.nombreLibre(`${id} copia ${sello(this.almacen.reloj())}`);
    await escribirSeguro(fs, unir(this.papelera, nombre), typeof contenido === "string" ? contenido : escribirGuion({ ...contenido, escena: contenido.escena || id }));
    return nombre;
  }

  /** Al borrar una escena (RF-34): el guion va a la papelera, sin borrar nada. false si no había */
  async moverAPapelera(id: string): Promise<boolean> {
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    await this.esperar(id);
    if (!(await fs.existe(ruta))) return false;
    await fs.crearDir(this.papelera);
    const nombre = await this.nombreLibre(`${id} ${sello(this.almacen.reloj())}`);
    this.almacen.alEscribir?.(ruta, null);
    await fs.renombrar(ruta, unir(this.papelera, nombre));
    this.conocido.set(id, null);
    return true;
  }

  /** Al deshacer el borrado: el más reciente de la papelera vuelve a su sitio. false si no había o ya hay uno */
  async devolverDePapelera(id: string): Promise<boolean> {
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    await this.esperar(id);
    if (await fs.existe(ruta)) return false;
    if (!(await fs.existe(this.papelera))) return false;
    const propio = new RegExp(`^${id} \\d{4}-\\d{2}-\\d{2} \\d{2}-\\d{2}-\\d{2}(?: \\(\\d+\\))?\\.md$`);
    // Por fecha y, a igual fecha, por el (n) del nombre: «x.md» < «x (2).md» < «x (3).md»
    const orden = (n: string) => [n.slice(id.length + 1, id.length + 20), Number(/\((\d+)\)\.md$/.exec(n)?.[1] ?? 1)] as const;
    const hay = (await fs.listar(this.papelera))
      .filter((e) => !e.esDir && propio.test(e.nombre))
      .map((e) => e.nombre)
      .sort((a, b) => orden(a)[0].localeCompare(orden(b)[0]) || orden(a)[1] - orden(b)[1]);
    const ultimo = hay[hay.length - 1];
    if (!ultimo) return false;
    await fs.crearDir(this.dir);
    this.almacen.alEscribir?.(ruta, null);
    await fs.renombrar(unir(this.papelera, ultimo), ruta);
    // Lo conocido es lo que ya hay: si no, el primer guardado lo tomaría por un cambio de fuera
    this.conocido.set(id, await fs.leer(ruta));
    return true;
  }

  /**
   * Qué hay en la carpeta (RF-29). `escenas` son los ids que existen: los demás
   * guiones son huérfanos (se conservan). Lo que no es un guion se avisa y no se
   * toca ni se cuenta; los `.tmp` de una escritura cortada se ignoran sin ruido.
   */
  async listar(escenas?: Set<string>): Promise<ListadoGuion> {
    const r: ListadoGuion = { guiones: [], huerfanos: [], ignorados: [] };
    const fs = this.almacen.fs;
    if (!(await fs.existe(this.dir))) return r;
    for (const e of (await fs.listar(this.dir)).sort((a, b) => a.nombre.localeCompare(b.nombre))) {
      if (e.esDir || e.nombre.endsWith(".tmp")) continue;
      const m = NOMBRE_GUION.exec(e.nombre);
      if (esConflicto(e.nombre)) r.ignorados.push({ nombre: e.nombre, motivo: "Es una copia de conflicto de sincronización: no se toca." });
      else if (!m) r.ignorados.push({ nombre: e.nombre, motivo: "No es un guion de ninguna escena: no se toca." });
      else if (escenas && !escenas.has(m[1]!)) r.huerfanos.push(m[1]!);
      else r.guiones.push(m[1]!);
    }
    return r;
  }
}
