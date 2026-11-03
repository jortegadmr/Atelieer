// La pizarra de una serie en disco (spec 012): appDatos/<serie>/_pizarra/pizarra.md.
// La v1.0 no mira esa carpeta (solo las de cada tipo de pieza). Es el único
// camino para escribirla: en cola y sin pisar lo cambiado fuera.

import { escribirPizarra, leerPizarra } from "../pizarra/formato";
import { vacia, type Pizarra } from "../pizarra/tipos";
import { CambioFuera, sello, type Almacen } from "./almacen";
import { escribirSeguro, unir } from "./fs";

export const CARPETA_PIZARRA = "_pizarra";
export const FICHERO_PIZARRA = "pizarra.md";

export interface CargaPizarra {
  pizarra: Pizarra;
  avisos: string[];
  /** Una versión más nueva, o una pizarra que no se puede escribir: solo se mira */
  soloLectura: boolean;
}

/** El fichero se borró fuera de Atelier (un CambioFuera): no hay nada que releer, solo avisar */
export class BorradaFuera extends CambioFuera {}

export class AlmacenPizarra {
  /** Lo último leído o escrito; null = no había fichero. Si el disco ya no lo tiene, cambió fuera */
  private conocido: string | null = null;
  private cola: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly almacen: Almacen,
    private readonly carpeta: string,
  ) {}

  get dir(): string {
    return unir(this.almacen.rutaSerie(this.carpeta), CARPETA_PIZARRA);
  }

  get ruta(): string {
    return unir(this.dir, FICHERO_PIZARRA);
  }

  /** Sin fichero, una pizarra vacía y no se crea nada (RF-1) */
  async cargar(): Promise<CargaPizarra> {
    const fs = this.almacen.fs;
    if (!(await fs.existe(this.ruta))) {
      this.conocido = null;
      return { pizarra: vacia(), avisos: [], soloLectura: false };
    }
    const texto = await fs.leer(this.ruta);
    const r = leerPizarra(texto);
    if ("ilegible" in r) {
      const destino = await this.apartar();
      this.conocido = null;
      return { pizarra: vacia(), avisos: [`${r.ilegible} Se apartó a «${destino}» y se empieza con una pizarra vacía.`], soloLectura: false };
    }
    this.conocido = texto;
    return { pizarra: r.pizarra, avisos: r.avisos, soloLectura: r.soloLectura };
  }

  /**
   * Lee la pizarra sin tocar nada: ni renombra un fichero ilegible ni cambia lo
   * conocido (spec 012, RF-30). Para llevarla a la sala, donde leer no puede escribir.
   */
  async leerSinEscribir(): Promise<{ pizarra: Pizarra } | { nolee: string }> {
    const fs = this.almacen.fs;
    try {
      if (!(await fs.existe(this.ruta))) return { pizarra: vacia() };
      const r = leerPizarra(await fs.leer(this.ruta));
      return "ilegible" in r ? { nolee: r.ilegible } : { pizarra: r.pizarra };
    } catch (e) {
      return { nolee: (e as Error).message || "error desconocido" };
    }
  }

  /** El fichero ilegible se queda junto a la pizarra con su fecha: nunca se borra */
  private async apartar(): Promise<string> {
    const fs = this.almacen.fs;
    const base = `pizarra rota ${sello(this.almacen.reloj())}`;
    let nombre = `${base}.md`;
    for (let n = 2; await fs.existe(unir(this.dir, nombre)); n++) nombre = `${base} (${n}).md`;
    this.almacen.alEscribir?.(this.ruta, null);
    await fs.renombrar(this.ruta, unir(this.dir, nombre));
    return nombre;
  }

  /** Vuelve a leer del disco (tras un cambio por fuera) y pone lo conocido al día */
  async releer(): Promise<CargaPizarra> {
    await this.cola.catch(() => undefined);
    return this.cargar();
  }

  /** ¿Está el fichero de la pizarra en el disco? */
  async existe(): Promise<boolean> {
    return this.almacen.fs.existe(this.ruta);
  }

  /** ¿El disco ya no es lo último leído o escrito? (al volver a la ventana, la vigilancia) */
  async comprobarFuera(): Promise<boolean> {
    await this.cola.catch(() => undefined);
    const fs = this.almacen.fs;
    const actual = (await fs.existe(this.ruta)) ? await fs.leer(this.ruta) : null;
    return actual !== this.conocido;
  }

  /**
   * Antes de quitar algo con contenido (RNF-2): la pizarra de antes a
   * _papelera/_pizarra/, con el sello y sin pisar otra. Devuelve el nombre.
   */
  async copiaAPapelera(antes: Pizarra): Promise<string> {
    const fs = this.almacen.fs;
    const dir = unir(this.almacen.rutaSerie(this.carpeta), "_papelera", CARPETA_PIZARRA);
    await fs.crearDir(dir);
    const base = sello(this.almacen.reloj());
    let nombre = `${base}.md`;
    for (let n = 2; await fs.existe(unir(dir, nombre)); n++) nombre = `${base} (${n}).md`;
    await escribirSeguro(fs, unir(dir, nombre), escribirPizarra(antes));
    return nombre;
  }

  /**
   * Escribe la pizarra (en cola: dos guardados no se cruzan). Si el disco ya no
   * tiene lo último leído o escrito, cambió fuera: lanza CambioFuera y no escribe.
   * Si lo que falta es el fichero, avisa una vez y el siguiente guardado escribe.
   */
  guardar(p: Pizarra): Promise<void> {
    const esta = this.cola.catch(() => undefined).then(() => this.escribir(p));
    this.cola = esta;
    return esta;
  }

  private async escribir(p: Pizarra): Promise<void> {
    const fs = this.almacen.fs;
    const actual = (await fs.existe(this.ruta)) ? await fs.leer(this.ruta) : null;
    if (actual !== this.conocido) {
      // Borrada por fuera: se avisa esta vez y la próxima ya se escribe
      if (actual === null) {
        this.conocido = null;
        throw new BorradaFuera(this.ruta);
      }
      throw new CambioFuera(this.ruta);
    }
    // Una pizarra vacía que nunca se escribió no deja rastro
    if (actual === null && !p.elementos.length && !p.flechas.length && !Object.keys(p.extra).length) return;
    const texto = escribirPizarra(p, actual ?? undefined);
    if (texto === actual) return;
    await fs.crearDir(this.dir);
    this.almacen.alEscribir?.(this.ruta, texto);
    await escribirSeguro(fs, this.ruta, texto);
    this.conocido = texto;
  }
}
