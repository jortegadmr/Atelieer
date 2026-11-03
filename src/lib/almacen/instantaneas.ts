// Instantáneas de una serie (spec 7, T7.5): un zip con sus piezas en
// <serie>/_instantaneas/. Automáticas ("2026-10-19 18-20 auto.zip", se guardan
// las 20 últimas) y nombradas ("2026-10-19 18-20 - antes de apagar la torre.zip",
// se guardan todas). Restaurar hace antes una automática y manda a la
// papelera lo que no estaba en la copia.

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { CARPETA } from "../modelo/vocabulario";
import { esFicheroDePieza, type Almacen } from "./almacen";
import { CARPETA_GUION } from "./almacen-guion";
import { CARPETA_PIZARRA, FICHERO_PIZARRA } from "./almacen-pizarra";
import { escribirBytesSeguro, escribirSeguro, unir } from "./fs";

const MAX_AUTOMATICAS = 20;

export interface Instantanea {
  nombre: string;
  ruta: string;
  auto: boolean;
  /** El nombre puesto a mano (vacío en las automáticas) */
  titulo: string;
  /** "2026-10-19 18-20" */
  fecha: string;
}

const dos = (n: number) => String(n).padStart(2, "0");
const minuto = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}-${dos(d.getMinutes())}`;
const segundo = (d: Date) => `${minuto(d)}-${dos(d.getSeconds())}`;

const PATRON = /^(\d{4}-\d\d-\d\d \d\d-\d\d)(?: auto| - (.+?))(?: \((\d+)\))?\.zip$/;

export class Instantaneas {
  constructor(
    private readonly almacen: Almacen,
    private readonly carpeta: string,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  private get raizSerie() {
    return this.almacen.rutaSerie(this.carpeta);
  }

  private get dir() {
    return unir(this.raizSerie, "_instantaneas");
  }

  private get fs() {
    return this.almacen.fs;
  }

  /** Rutas relativas de los ficheros de la serie que entran en una copia */
  private async ficheros(): Promise<string[]> {
    const r: string[] = [];
    if (await this.fs.existe(unir(this.raizSerie, "serie.md"))) r.push("serie.md");
    for (const c of Object.values(CARPETA)) {
      const dir = unir(this.raizSerie, c);
      if (!(await this.fs.existe(dir))) continue;
      for (const e of await this.fs.listar(dir)) if (!e.esDir && esFicheroDePieza(e.nombre)) r.push(`${c}/${e.nombre}`);
    }
    return r.sort();
  }

  /**
   * Lo que entra en una copia: las piezas y, si existen, la pizarra (spec 012,
   * RNF-9) y los guiones (spec 013, RNF-5). `ficheros()` sigue siendo solo de piezas: es lo que restaurar manda
   * a la papelera si la copia no lo tenía, y la pizarra no se toca.
   */
  private async ficherosDeCopia(): Promise<string[]> {
    const r = await this.ficheros();
    const pizarra = `${CARPETA_PIZARRA}/${FICHERO_PIZARRA}`;
    if (await this.fs.existe(unir(this.raizSerie, pizarra))) r.push(pizarra);
    // Y los guiones de las escenas (spec 013, RNF-5): solo los <id>.md, no los conflictos ni lo raro
    const guiones = unir(this.raizSerie, CARPETA_GUION);
    if (await this.fs.existe(guiones)) for (const e of await this.fs.listar(guiones)) if (!e.esDir && /^ev-[a-z0-9]{4,}\.md$/.test(e.nombre)) r.push(`${CARPETA_GUION}/${e.nombre}`);
    return r.sort();
  }

  async listar(): Promise<Instantanea[]> {
    if (!(await this.fs.existe(this.dir))) return [];
    const r: (Instantanea & { hora: number })[] = [];
    for (const e of await this.fs.listar(this.dir)) {
      const m = !e.esDir && e.nombre.match(PATRON);
      if (!m) continue;
      const ruta = unir(this.dir, e.nombre);
      r.push({ nombre: e.nombre, ruta, auto: !m[2], titulo: m[2] ?? "", fecha: m[1], hora: (await this.fs.fecha(ruta)) ?? 0 });
    }
    // Por la fecha del nombre y, dentro del mismo minuto, por la hora del fichero
    return r
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora - a.hora || b.nombre.localeCompare(a.nombre))
      .map(({ hora: _hora, ...x }) => x);
  }

  /** Crea una instantánea; sin nombre, es automática */
  async crear(nombre = ""): Promise<Instantanea> {
    const limpio = nombre.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
    const base = limpio ? `${minuto(this.reloj())} - ${limpio}` : `${minuto(this.reloj())} auto`;
    await this.fs.crearDir(this.dir);
    let nombreZip = `${base}.zip`;
    for (let n = 2; await this.fs.existe(unir(this.dir, nombreZip)); n++) nombreZip = `${base} (${n}).zip`;

    const datos: Record<string, Uint8Array> = {};
    for (const rel of await this.ficherosDeCopia()) datos[rel] = strToU8(await this.fs.leer(unir(this.raizSerie, rel)));
    await escribirBytesSeguro(this.fs, unir(this.dir, nombreZip), zipSync(datos, { level: 6 }));
    if (!limpio) await this.podar();
    return (await this.listar()).find((x) => x.nombre === nombreZip)!;
  }

  /** Deja solo las 20 automáticas más recientes */
  private async podar(): Promise<void> {
    const autos = (await this.listar()).filter((x) => x.auto);
    for (const viejo of autos.slice(MAX_AUTOMATICAS)) await this.fs.borrar(viejo.ruta);
  }

  /** Rutas relativas que guarda una instantánea */
  async contenido(nombre: string): Promise<string[]> {
    return Object.keys(unzipSync(await this.fs.leerBytes(unir(this.dir, nombre))));
  }

  /**
   * Deja la serie como estaba en la instantánea: antes hace una automática;
   * escribe lo que guarda la copia y manda a la papelera lo que no estaba en ella.
   */
  async restaurar(nombre: string): Promise<void> {
    const zip = unzipSync(await this.fs.leerBytes(unir(this.dir, nombre)));
    await this.crear();
    const enCopia = new Set(Object.keys(zip));
    const papelera = unir(this.raizSerie, "_papelera");
    for (const rel of await this.ficheros()) {
      if (enCopia.has(rel)) continue;
      await this.fs.crearDir(papelera);
      const nombreFichero = rel.slice(rel.lastIndexOf("/") + 1);
      let destino = unir(papelera, `${segundo(this.reloj())} ${nombreFichero}`);
      for (let n = 2; await this.fs.existe(destino); n++) destino = unir(papelera, `${segundo(this.reloj())} ${nombreFichero.replace(/\.md$/, "")} (${n}).md`);
      this.almacen.alEscribir?.(unir(this.raizSerie, rel), null);
      await this.fs.renombrar(unir(this.raizSerie, rel), destino);
    }
    for (const [rel, bytes] of Object.entries(zip)) {
      // Un zip manipulado no escribe fuera de la serie
      if (rel.startsWith("/") || rel.includes("\\") || rel.split("/").some((t) => t === ".." || t === ".")) continue;
      const ruta = unir(this.raizSerie, rel);
      const texto = strFromU8(bytes);
      await this.fs.crearDir(ruta.slice(0, ruta.lastIndexOf("/")));
      this.almacen.alEscribir?.(ruta, texto);
      await escribirSeguro(this.fs, ruta, texto);
    }
  }
}
