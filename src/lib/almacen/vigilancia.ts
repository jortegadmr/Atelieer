// Vigilar la carpeta de la serie y recargar lo que cambie desde fuera (spec
// 11.2): Obsidian, el Bloc de notas o Proton trayendo lo del otro equipo.
// Usa el aviso del sistema y, por si no llega (pasa en carpetas en la nube),
// un repaso de fechas cada 10 s. Lo que escribe la propia app no cuenta.

import type { Modelo } from "../modelo/modelo";
import { CARPETA, type TipoPieza } from "../modelo/vocabulario";
import { esFicheroDePieza, type Almacen, type ProblemaFichero } from "./almacen";
import { esConflicto, nombreOriginal } from "./conflictos";
import { carpetaDe, nombreDe, normalizar, unir } from "./fs";
import { CARPETA_VARIANTES } from "../variantes/almacen-variantes";
import { CARPETA_PIZARRA, FICHERO_PIZARRA } from "./almacen-pizarra";
import { CARPETA_GUION } from "./almacen-guion";

export interface CambioExterno {
  ruta: string;
  que: "nuevo" | "cambiado" | "borrado" | "conflicto";
}

const NOMBRE_GUION = /^ev-[a-z0-9]{4,}\.md$/;

const TIPO_DE_CARPETA = new Map<string, TipoPieza>(Object.entries(CARPETA).map(([tipo, c]) => [c, tipo as TipoPieza]));

/** Cuántas escrituras propias recientes se recuerdan por fichero */
const RECUERDO = 3;

export class Vigilancia {
  private fechas = new Map<string, number>();
  /** Contenidos que escribió la app en cada ruta (null = lo borró ella) */
  private propias = new Map<string, (string | null)[]>();
  private pararNativa: (() => void) | null = null;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private cola: Promise<void> = Promise.resolve();
  private readonly raiz: string;

  constructor(
    private readonly almacen: Almacen,
    carpeta: string,
    private readonly alCambiar: (cambios: CambioExterno[]) => unknown,
    private readonly intervaloMs = 10_000,
    /** Lo de _variantes/ (spec 006): no son piezas, van aparte */
    private readonly alCambiarVariantes: (cambios: CambioExterno[]) => unknown = () => undefined,
    /** Lo de _pizarra/ (spec 012): tampoco son piezas */
    private readonly alCambiarPizarra: (cambios: CambioExterno[]) => unknown = () => undefined,
    /** Lo de _guion/ (spec 013): los guiones de las escenas, tampoco son piezas */
    private readonly alCambiarGuion: (cambios: CambioExterno[]) => unknown = () => undefined,
  ) {
    this.raiz = almacen.rutaSerie(carpeta);
  }

  async iniciar(): Promise<void> {
    this.almacen.alEscribir = (ruta, contenido) => this.anotarPropia(ruta, contenido);
    this.fechas = await this.escanear();
    const fs = this.almacen.fs;
    if (fs.vigilar) {
      try {
        this.pararNativa = await fs.vigilar(this.raiz, (rutas) => this.encolar(() => this.revisar(rutas)));
      } catch {
        // Sin aviso del sistema: queda el repaso de fechas
      }
    }
    this.temporizador = setInterval(() => this.encolar(() => this.repasar()), this.intervaloMs);
  }

  detener(): void {
    this.pararNativa?.();
    this.pararNativa = null;
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
    if (this.almacen.alEscribir) this.almacen.alEscribir = null;
  }

  /** La app va a escribir (o borrar, con null) este fichero */
  anotarPropia(ruta: string, contenido: string | null): void {
    const l = this.propias.get(ruta) ?? [];
    l.push(contenido);
    if (l.length > RECUERDO) l.shift();
    this.propias.set(ruta, l);
  }

  /**
   * Relee ya estas rutas, sin mirar fechas ni escrituras propias: son notas que
   * no se pudieron guardar porque cambiaron fuera (spec 002, RNF integridad).
   */
  releerYa(rutas: string[]): Promise<void> {
    this.encolar(async () => {
      const cambios: CambioExterno[] = [];
      for (const r of new Set(rutas.map(normalizar))) {
        if (!this.relevante(r)) continue;
        const fecha = await this.almacen.fs.fecha(r);
        if (fecha === null) {
          this.fechas.delete(r);
          cambios.push({ ruta: r, que: "borrado" });
        } else {
          this.fechas.set(r, fecha);
          cambios.push({ ruta: r, que: "cambiado" });
        }
      }
      await this.repartir(cambios);
    });
    return this.cola;
  }

  private encolar(trabajo: () => Promise<void>) {
    this.cola = this.cola.then(trabajo).catch(() => undefined);
  }

  private get dirVariantes(): string {
    return unir(this.raiz, CARPETA_VARIANTES);
  }

  private get dirPizarra(): string {
    return unir(this.raiz, CARPETA_PIZARRA);
  }

  private get dirGuion(): string {
    return unir(this.raiz, CARPETA_GUION);
  }

  /** ¿Es un fichero que interesa? Piezas, serie.md, variantes, la pizarra, los guiones y conflictos */
  private relevante(ruta: string): boolean {
    const nombre = nombreDe(ruta);
    const carpeta = carpetaDe(ruta);
    if (carpeta === this.raiz) return nombre === "serie.md";
    if (carpeta === this.dirVariantes) return nombre.endsWith(".md") && !nombre.startsWith(".");
    // De la pizarra solo importa ella y sus conflictos de Proton
    if (carpeta === this.dirPizarra) return nombre === FICHERO_PIZARRA || (esConflicto(nombre) && nombreOriginal(nombre) === FICHERO_PIZARRA);
    // De los guiones, los <id>.md y sus conflictos de Proton; lo demás se ignora
    if (carpeta === this.dirGuion) return NOMBRE_GUION.test(nombre) || (esConflicto(nombre) && NOMBRE_GUION.test(nombreOriginal(nombre)));
    if (carpetaDe(carpeta) !== this.raiz || !TIPO_DE_CARPETA.has(nombreDe(carpeta))) return false;
    return esFicheroDePieza(nombre) || esConflicto(nombre);
  }

  private async escanear(): Promise<Map<string, number>> {
    const fs = this.almacen.fs;
    const fechas = new Map<string, number>();
    const rutas = [unir(this.raiz, "serie.md")];
    await Promise.all(
      [...Object.values(CARPETA), CARPETA_VARIANTES, CARPETA_PIZARRA, CARPETA_GUION].map(async (c) => {
        const dir = unir(this.raiz, c);
        if (!(await fs.existe(dir))) return;
        for (const e of await fs.listar(dir)) if (!e.esDir) rutas.push(unir(dir, e.nombre));
      }),
    );
    await Promise.all(
      rutas.filter((r) => this.relevante(r)).map(async (r) => {
        const f = await fs.fecha(r);
        if (f !== null) fechas.set(r, f);
      }),
    );
    return fechas;
  }

  /** Repaso de fechas: lo nuevo, lo cambiado y lo que falta */
  async repasar(): Promise<void> {
    const ahora = await this.escanear();
    const rutas = new Set<string>();
    for (const [r, f] of ahora) if (this.fechas.get(r) !== f) rutas.add(r);
    for (const r of this.fechas.keys()) if (!ahora.has(r)) rutas.add(r);
    if (rutas.size) await this.revisar([...rutas]);
  }

  private async revisar(rutas: string[]): Promise<void> {
    const fs = this.almacen.fs;
    const cambios: CambioExterno[] = [];
    for (const r of new Set(rutas.map(normalizar))) {
      if (!this.relevante(r)) continue;
      const fecha = await fs.fecha(r);
      const antes = this.fechas.get(r);
      const propias = this.propias.get(r) ?? [];
      if (fecha === null) {
        if (antes === undefined) continue;
        this.fechas.delete(r);
        if (!propias.includes(null)) cambios.push({ ruta: r, que: "borrado" });
        continue;
      }
      if (antes === fecha) continue;
      this.fechas.set(r, fecha);
      if (esConflicto(nombreDe(r))) {
        if (antes === undefined) cambios.push({ ruta: r, que: "conflicto" });
        continue;
      }
      if (propias.length) {
        const contenido = await fs.leer(r).catch(() => null);
        if (contenido !== null && propias.includes(contenido)) continue;
      }
      cambios.push({ ruta: r, que: antes === undefined ? "nuevo" : "cambiado" });
    }
    await this.repartir(cambios);
  }

  /** Lo de _variantes/, _pizarra/ y _guion/ a sus oyentes; lo demás, al de las piezas */
  private async repartir(cambios: CambioExterno[]): Promise<void> {
    const deVariantes = cambios.filter((c) => carpetaDe(c.ruta) === this.dirVariantes);
    const dePizarra = cambios.filter((c) => carpetaDe(c.ruta) === this.dirPizarra);
    const deGuion = cambios.filter((c) => carpetaDe(c.ruta) === this.dirGuion);
    const aparte = new Set([this.dirVariantes, this.dirPizarra, this.dirGuion]);
    const resto = cambios.filter((c) => !aparte.has(carpetaDe(c.ruta)));
    if (deVariantes.length) await this.alCambiarVariantes(deVariantes);
    if (dePizarra.length) await this.alCambiarPizarra(dePizarra);
    if (deGuion.length) await this.alCambiarGuion(deGuion);
    if (resto.length) await this.alCambiar(resto);
  }
}

export interface ResultadoRecarga {
  recargadas: string[];
  problemas: ProblemaFichero[];
  conflictos: string[];
}

/** Aplica al modelo los cambios de fuera: relee, añade o quita piezas */
export async function recargar(almacen: Almacen, modelo: Modelo, cambios: CambioExterno[]): Promise<ResultadoRecarga> {
  const r: ResultadoRecarga = { recargadas: [], problemas: [], conflictos: [] };
  for (const c of cambios) {
    if (c.que === "conflicto") {
      r.conflictos.push(c.ruta);
      continue;
    }
    const nombre = nombreDe(c.ruta);
    const tipo: TipoPieza | undefined = nombre === "serie.md" ? "serie" : TIPO_DE_CARPETA.get(nombreDe(carpetaDe(c.ruta)));
    if (!tipo) continue;
    if (c.que === "borrado") {
      // Borrada fuera: ya no hay nota que proteger; volver a crearla (deshacer) vale
      almacen.olvidarConocido(c.ruta);
      if (tipo !== "serie") {
        const id = nombre.replace(/\.md$/, "");
        if (modelo.quitar(id)) r.recargadas.push(id);
      }
      continue;
    }
    try {
      const pieza = await almacen.leerPiezaEn(c.ruta, tipo);
      modelo.poner(pieza);
      r.recargadas.push(pieza.id);
    } catch (e) {
      r.problemas.push({ ruta: c.ruta, mensaje: (e as Error).message });
    }
  }
  return r;
}
