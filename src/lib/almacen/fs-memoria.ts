// Disco en memoria para las pruebas. Puede simular fallos (`fallo`), contar
// operaciones (`alOperar`) y avisar de cambios como el sistema
// (`vigilanciaNativa`).

import { carpetaDe, nombreDe, normalizar, type EntradaDir, type Fs } from "./fs";

type Operacion = "leer" | "escribir" | "renombrar" | "borrar" | "listar" | "crearDir";

interface Fichero {
  datos: string | Uint8Array;
  fecha: number;
}

export class FsMemoria implements Fs {
  private ficheros = new Map<string, Fichero>();
  private carpetas = new Set<string>();
  private vigilantes = new Set<{ raiz: string; fn: (rutas: string[]) => void }>();
  private ultimaFecha = 0;

  /** Devuelve "a medias" o "entero" para fallar en esa operación */
  fallo: ((op: Operacion, ruta: string) => "a medias" | "entero" | null) | null = null;
  alOperar: ((op: Operacion, ruta: string) => void) | null = null;
  /** false = como una carpeta en la nube donde el aviso del sistema no llega */
  vigilanciaNativa = true;
  /** Reloj de las fechas de modificación; las pruebas pueden fijarlo */
  reloj: () => number = () => Date.now();

  private ahora(): number {
    this.ultimaFecha = Math.max(this.reloj(), this.ultimaFecha + 1);
    return this.ultimaFecha;
  }

  private operar(op: Operacion, ruta: string): "a medias" | null {
    this.alOperar?.(op, ruta);
    const f = this.fallo?.(op, ruta);
    if (f === "entero") throw new Error(`Fallo simulado al ${op} ${ruta}`);
    return f === "a medias" ? "a medias" : null;
  }

  private avisar(ruta: string) {
    if (!this.vigilanciaNativa) return;
    for (const v of this.vigilantes) {
      if (ruta.startsWith(v.raiz + "/")) v.fn([ruta]);
    }
  }

  private registrarCarpetas(ruta: string) {
    let c = carpetaDe(ruta);
    while (c && !this.carpetas.has(c)) {
      this.carpetas.add(c);
      c = carpetaDe(c);
    }
  }

  private guardar(ruta: string, datos: string | Uint8Array) {
    ruta = normalizar(ruta);
    if (this.operar("escribir", ruta) === "a medias") {
      const mitad = typeof datos === "string" ? datos.slice(0, datos.length / 2) : datos.slice(0, datos.length / 2);
      this.registrarCarpetas(ruta);
      this.ficheros.set(ruta, { datos: mitad, fecha: this.ahora() });
      throw new Error(`Fallo simulado a medias al escribir ${ruta}`);
    }
    this.registrarCarpetas(ruta);
    this.ficheros.set(ruta, { datos, fecha: this.ahora() });
    this.avisar(ruta);
  }

  private sacar(ruta: string): Fichero {
    const f = this.ficheros.get(normalizar(ruta));
    if (!f) throw new Error(`No existe ${ruta}`);
    return f;
  }

  async leer(ruta: string): Promise<string> {
    this.operar("leer", ruta);
    const d = this.sacar(ruta).datos;
    return typeof d === "string" ? d : new TextDecoder().decode(d);
  }

  async escribir(ruta: string, contenido: string): Promise<void> {
    this.guardar(ruta, contenido);
  }

  async leerBytes(ruta: string): Promise<Uint8Array> {
    this.operar("leer", ruta);
    const d = this.sacar(ruta).datos;
    return typeof d === "string" ? new TextEncoder().encode(d) : d;
  }

  async escribirBytes(ruta: string, datos: Uint8Array): Promise<void> {
    this.guardar(ruta, datos);
  }

  async renombrar(de: string, a: string): Promise<void> {
    de = normalizar(de);
    a = normalizar(a);
    this.operar("renombrar", de);
    const f = this.sacar(de);
    this.ficheros.delete(de);
    this.registrarCarpetas(a);
    this.ficheros.set(a, { datos: f.datos, fecha: this.ahora() });
    this.avisar(de);
    this.avisar(a);
  }

  async borrar(ruta: string): Promise<void> {
    ruta = normalizar(ruta);
    this.operar("borrar", ruta);
    this.sacar(ruta);
    this.ficheros.delete(ruta);
    this.avisar(ruta);
  }

  async existe(ruta: string): Promise<boolean> {
    ruta = normalizar(ruta);
    return this.ficheros.has(ruta) || this.carpetas.has(ruta);
  }

  async listar(ruta: string): Promise<EntradaDir[]> {
    ruta = normalizar(ruta).replace(/\/$/, "");
    this.operar("listar", ruta);
    if (!this.carpetas.has(ruta)) throw new Error(`No existe la carpeta ${ruta}`);
    const r: EntradaDir[] = [];
    for (const c of this.carpetas) if (carpetaDe(c) === ruta) r.push({ nombre: nombreDe(c), esDir: true });
    for (const f of this.ficheros.keys()) if (carpetaDe(f) === ruta) r.push({ nombre: nombreDe(f), esDir: false });
    return r;
  }

  async crearDir(ruta: string): Promise<void> {
    ruta = normalizar(ruta).replace(/\/$/, "");
    this.operar("crearDir", ruta);
    this.registrarCarpetas(ruta + "/x");
  }

  async fecha(ruta: string): Promise<number | null> {
    return this.ficheros.get(normalizar(ruta))?.fecha ?? null;
  }

  async vigilar(ruta: string, alCambiar: (rutas: string[]) => void): Promise<() => void> {
    const v = { raiz: normalizar(ruta).replace(/\/$/, ""), fn: alCambiar };
    this.vigilantes.add(v);
    return () => this.vigilantes.delete(v);
  }

  /** Cambio hecho "desde fuera" (otro programa, Proton), para las pruebas */
  async cambiarDesdeFuera(ruta: string, contenido: string): Promise<void> {
    const f = this.fallo;
    this.fallo = null;
    try {
      this.guardar(ruta, contenido);
    } finally {
      this.fallo = f;
    }
  }

  /** Todas las rutas de fichero, para comparar estados en las pruebas */
  rutas(): string[] {
    return [...this.ficheros.keys()].sort();
  }
}
