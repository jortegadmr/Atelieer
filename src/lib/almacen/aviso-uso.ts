// Aviso de uso (spec 11.2, M6). Al abrir una serie se escribe .abierta con el
// nombre del equipo y la hora, y se refresca cada minuto. Si al abrir en el
// otro equipo existe y se refrescó hace menos de 3 min, se avisa. Al cerrar,
// se borra.

import { parse, stringify } from "yaml";
import { unir, type Fs } from "./fs";

const REFRESCO_MS = 60_000;
const RECIENTE_MS = 3 * 60_000;

interface Datos {
  equipo: string;
  desde: string;
  refresco: string;
}

const dos = (n: number) => String(n).padStart(2, "0");

export class AvisoUso {
  private readonly ruta: string;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private desde: string | null = null;

  constructor(
    private readonly fs: Fs,
    rutaSerie: string,
    private readonly equipo: string,
  ) {
    this.ruta = unir(rutaSerie, ".abierta");
  }

  private async leer(): Promise<Datos | null> {
    try {
      if (!(await this.fs.existe(this.ruta))) return null;
      const d = parse(await this.fs.leer(this.ruta));
      if (!d || typeof d.equipo !== "string" || typeof d.desde !== "string") return null;
      return { equipo: d.equipo, desde: d.desde, refresco: typeof d.refresco === "string" ? d.refresco : d.desde };
    } catch {
      return null;
    }
  }

  private async escribir(): Promise<void> {
    const ahora = new Date().toISOString();
    this.desde ??= ahora;
    await this.fs.escribir(this.ruta, stringify({ equipo: this.equipo, desde: this.desde, refresco: ahora }));
  }

  /** "Está abierta en <equipo> desde las 18:20", o null si no hay que avisar */
  async comprobar(): Promise<string | null> {
    const d = await this.leer();
    if (!d || d.equipo === this.equipo) return null;
    const refresco = Date.parse(d.refresco);
    if (Number.isNaN(refresco) || Date.now() - refresco >= RECIENTE_MS) return null;
    const desde = new Date(d.desde);
    return `Está abierta en ${d.equipo} desde las ${dos(desde.getHours())}:${dos(desde.getMinutes())}`;
  }

  async abrir(): Promise<void> {
    await this.escribir();
    this.temporizador = setInterval(() => {
      this.escribir().catch(() => undefined);
    }, REFRESCO_MS);
  }

  /** Deja de refrescar sin borrar (para las pruebas y si la app se cuelga) */
  detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  async cerrar(): Promise<void> {
    this.detener();
    const d = await this.leer();
    if (d && d.equipo !== this.equipo) return;
    try {
      if (await this.fs.existe(this.ruta)) await this.fs.borrar(this.ruta);
    } catch {
      // Si no se puede borrar, en 3 min deja de contar
    }
  }
}
