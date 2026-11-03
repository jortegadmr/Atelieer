// Personajes, lugares y épocas de la wiki de la serie (spec 10.1, T8.1, M11).
// Se leen de sus carpetas (con sus aliases) y las épocas, además, de la
// columna "Era" de la tabla "Eras" de la Timeline. No viven en la app.

import { nombreDe, unir, type Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";
import { clave, claveLimpia, filasDeTabla, nombreLimpio, separar, util } from "./md";

export type TipoFicha = "personaje" | "lugar" | "era";

export interface Motor {
  quiere: string;
  necesita: string;
  herida: string;
  mentira: string;
}

export interface Ficha {
  nombre: string;
  tipo: TipoFicha;
  /** Relativa al vault, con .md */
  ruta: string;
  aliases: string[];
  resumen: string;
  /** Para las épocas, su "Desde" en la Timeline ("hace mil años") */
  detalle: string;
  motor: Motor;
}

/** Una época de la línea de la historia (spec 009), en el orden de RF-4 */
export interface Epoca {
  /** Nombre limpio: el de la ficha si la hay, si no el de la fila */
  nombre: string;
  /** Claves de su nombre y de sus alias */
  claves: Set<string>;
  /** Relativa al vault: la ficha o, si no tiene, la Timeline */
  ruta: string;
  /** La fila «Presente» de la Timeline */
  presente: boolean;
}

const PRESENTE = claveLimpia("Presente");

const MOTOR_VACIO: Motor = { quiere: "", necesita: "", herida: "", mentira: "" };

/** El motor, de la tabla "Motor interno" de la ficha */
export function leerMotor(cuerpo: string): Motor {
  const m = { ...MOTOR_VACIO };
  for (const [campo, valor] of filasDeTabla(cuerpo, "Campo")) {
    const c = clave(campo);
    const v = util(valor);
    if (c.startsWith("quiere")) m.quiere = v;
    else if (c.startsWith("necesita")) m.necesita = v;
    else if (c.startsWith("herida")) m.herida = v;
    else if (c.startsWith("mentira")) m.mentira = v;
  }
  return m;
}

export class Wiki {
  private fichas: Ficha[] = [];
  private porClave = new Map<string, Ficha>();
  private ordenEpocas: Epoca[] = [];
  private clavesPresente = new Set<string>([PRESENTE]);
  private static lecturas = 0;
  /** Distinto en cada lectura, también entre instancias: un arrastre que empezó con otra lectura no mueve (spec 009) */
  lectura = 0;
  /** Relativa al vault, si la nota de la Timeline existe (RF-11) */
  rutaTimeline: string | null = null;

  constructor(
    private readonly fs: Fs,
    /** Carpeta del vault (Vault), con / */
    readonly vault: string,
    readonly rutas: RutasWiki,
  ) {}

  get nombreVault(): string {
    return nombreDe(this.vault);
  }

  /** Ruta absoluta de una ruta relativa al vault */
  absoluta(rel: string): string {
    return unir(this.vault, rel);
  }

  private async leerCarpeta(rel: string, tipo: TipoFicha): Promise<Ficha[]> {
    if (!rel) return [];
    const dir = this.absoluta(rel);
    const r: Ficha[] = [];
    const recorrer = async (abs: string, relDir: string) => {
      if (!(await this.fs.existe(abs))) return;
      for (const e of await this.fs.listar(abs)) {
        if (e.nombre.startsWith(".")) continue;
        if (e.esDir) {
          await recorrer(unir(abs, e.nombre), `${relDir}/${e.nombre}`);
          continue;
        }
        if (!e.nombre.endsWith(".md")) continue;
        try {
          const { propiedades, cuerpo } = separar(await this.fs.leer(unir(abs, e.nombre)));
          const aliases = Array.isArray(propiedades.aliases) ? propiedades.aliases.map(String) : [];
          const resumen = util(cuerpo.match(/^>\s*\*\*Resumen[^*]*:\*\*\s*(.*)$/m)?.[1]);
          r.push({ nombre: e.nombre.replace(/\.md$/, ""), tipo, ruta: `${relDir}/${e.nombre}`, aliases, resumen, detalle: "", motor: tipo === "personaje" ? leerMotor(cuerpo) : { ...MOTOR_VACIO } });
        } catch {
          // Una ficha que no se puede leer se salta
        }
      }
    };
    await recorrer(dir, rel.replace(/\/+$/, ""));
    return r;
  }

  private async leerTimeline(): Promise<Ficha[]> {
    const rel = this.rutas.timeline;
    if (!rel || !(await this.fs.existe(this.absoluta(rel)))) return [];
    const { cuerpo } = separar(await this.fs.leer(this.absoluta(rel)));
    return filasDeTabla(cuerpo, "Era")
      .filter((f) => util(f[0]))
      .map((f) => ({ nombre: nombreLimpio(f[0]), tipo: "era" as const, ruta: rel, aliases: [], resumen: util(f[3]), detalle: util(f[1]), motor: { ...MOTOR_VACIO } }));
  }

  async cargar(): Promise<void> {
    const [personajes, lugares, eras, timeline] = await Promise.all([
      this.leerCarpeta(this.rutas.personajes, "personaje"),
      this.leerCarpeta(this.rutas.lugares, "lugar"),
      this.leerCarpeta(this.rutas.eras, "era"),
      this.leerTimeline(),
    ]);
    const rel = this.rutas.timeline;
    this.rutaTimeline = rel && (await this.fs.existe(this.absoluta(rel))) ? rel : null;
    this.ponerEpocas(eras, timeline);
    // Una época con ficha propia gana a su fila de la Timeline, pero toma de ella el "Desde"
    const deTimeline = new Map(timeline.map((f) => [clave(f.nombre), f]));
    for (const e of eras) {
      const t = deTimeline.get(clave(e.nombre));
      if (t) {
        e.detalle = t.detalle;
        deTimeline.delete(clave(e.nombre));
      }
    }
    this.fichas = [...personajes, ...lugares, ...eras, ...deTimeline.values()];
    this.porClave = new Map();
    for (const f of this.fichas) {
      for (const n of [f.nombre, ...f.aliases]) if (!this.porClave.has(clave(n))) this.porClave.set(clave(n), f);
    }
    this.lectura = ++Wiki.lecturas;
  }

  /**
   * Épocas en orden (RF-4, RF-5): filas de la Timeline (la de «Presente» marca
   * su sitio) y detrás las fichas sin fila, por nombre. Mismo nombre o alias, una.
   */
  private ponerEpocas(eras: Ficha[], timeline: Ficha[]): void {
    const r: Epoca[] = [];
    const porClave = new Map<string, Epoca>();
    const juntar = (e: Epoca, claves: string[]) => {
      for (const c of claves) {
        e.claves.add(c);
        if (!porClave.has(c)) porClave.set(c, e);
      }
    };
    for (const f of timeline) {
      const c = claveLimpia(f.nombre);
      if (porClave.has(c)) continue;
      const e: Epoca = { nombre: f.nombre, claves: new Set(), ruta: f.ruta, presente: c === PRESENTE };
      juntar(e, [c]);
      r.push(e);
    }
    const presente = new Set([PRESENTE]);
    const sinFila: Epoca[] = [];
    for (const f of [...eras].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) {
      const claves = [f.nombre, ...f.aliases].map(claveLimpia).filter(Boolean);
      if (claves.includes(PRESENTE)) {
        for (const c of claves) presente.add(c);
        const fila = porClave.get(PRESENTE);
        if (fila) juntar(fila, claves);
        continue;
      }
      const e = claves.map((c) => porClave.get(c)).find(Boolean);
      if (e) {
        if (!this.esFicha(e)) Object.assign(e, { nombre: nombreLimpio(f.nombre), ruta: f.ruta });
        juntar(e, claves);
        continue;
      }
      const nueva: Epoca = { nombre: nombreLimpio(f.nombre), claves: new Set(), ruta: f.ruta, presente: false };
      juntar(nueva, claves);
      sinFila.push(nueva);
    }
    this.ordenEpocas = [...r, ...sinFila];
    this.clavesPresente = presente;
  }

  private esFicha(e: Epoca): boolean {
    return e.ruta !== this.rutas.timeline;
  }

  epocas(): Epoca[] {
    return this.ordenEpocas;
  }

  /** La época de una escena es el presente: vacía, «Presente» o un alias suyo */
  esPresente(epoca: string): boolean {
    const c = claveLimpia(epoca);
    return !c || this.clavesPresente.has(c);
  }

  de(tipo: TipoFicha): Ficha[] {
    return this.fichas.filter((f) => f.tipo === tipo).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  buscar(nombre: string): Ficha | null {
    return this.porClave.get(clave(nombre)) ?? null;
  }

  sugerir(texto: string, tipos: TipoFicha[], maximo = 8): Ficha[] {
    const q = clave(texto);
    if (!q) return [];
    const r = this.fichas.filter((f) => tipos.includes(f.tipo) && [f.nombre, ...f.aliases].some((n) => clave(n).startsWith(q)));
    return r.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).slice(0, maximo);
  }

  /**
   * Para el selector de referencias del guion (spec 013, RF-11): con texto
   * vacío, las primeras; con texto, las que lo contienen en el nombre o en un
   * alias, sin tildes ni mayúsculas, las que empiezan por él primero.
   */
  listar(tipos: TipoFicha[], consulta: string, maximo = 8): Ficha[] {
    const q = clave(consulta);
    const alfabetico = (a: Ficha, b: Ficha) => a.nombre.localeCompare(b.nombre, "es");
    const de = this.fichas.filter((f) => tipos.includes(f.tipo));
    if (!q) return de.sort(alfabetico).slice(0, maximo);
    const claves = (f: Ficha) => [f.nombre, ...f.aliases].map(clave);
    const r = de.filter((f) => claves(f).some((n) => n.includes(q)));
    const empieza = (f: Ficha) => (claves(f).some((n) => n.startsWith(q)) ? 0 : 1);
    return r.sort((a, b) => empieza(a) - empieza(b) || alfabetico(a, b)).slice(0, maximo);
  }

  /** obsidian://open?vault=Vault&file=<ruta sin .md>; "" si la ruta sale del vault (spec 009, RF-43) */
  urlObsidian(f: Ficha | string): string {
    const ruta = (typeof f === "string" ? f : f.ruta).replace(/\.md$/, "");
    if (!ruta || ruta.split(/[\\/]/).some((t) => t === "..")) return "";
    return `obsidian://open?vault=${encodeURIComponent(this.nombreVault)}&file=${encodeURIComponent(ruta)}`;
  }
}
