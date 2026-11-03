// Las variantes de una serie en disco (spec 006): appDatos/<serie>/_variantes/.
// La v1.0 no mira esa carpeta (solo las de cada tipo de pieza). Al abrir la
// serie se leen solo sus propiedades; el resto, al pedirlo. Es el único camino
// para escribir una variante: en cola por variante y sin pisar lo cambiado fuera.

import { CambioFuera, sello, type Almacen } from "../almacen/almacen";
import { esConflicto, nombreOriginal } from "../almacen/conflictos";
import { carpetaDe, escribirSeguro, nombreDe, normalizar, unir } from "../almacen/fs";
import type { CambioExterno } from "../almacen/vigilancia";
import { cambiarCabecera, esIdVariante, leerCabecera, leerVariante, type MarcaVariante } from "./formato";
import type { CabeceraVariante, DatosVariante } from "./tipos";

export const CARPETA_VARIANTES = "_variantes";

/** Una nota de _variantes/ que no se puede usar, con su motivo */
export interface VarianteApartada {
  ruta: string;
  mensaje: string;
}

export class AlmacenVariantes {
  /** Las que se leen bien, por id */
  readonly lista = new Map<string, CabeceraVariante>();
  readonly apartadas = new Map<string, VarianteApartada>();
  /** Ids con un conflicto de Proton sin resolver: no se abren ni se aplican */
  readonly enConflicto = new Set<string>();
  /** Lo último leído o escrito de cada una; si el disco ya no lo tiene, cambió fuera */
  private textos = new Map<string, string>();
  private colas = new Map<string, Promise<unknown>>();

  constructor(
    private readonly almacen: Almacen,
    private readonly carpeta: string,
  ) {}

  get dir(): string {
    return unir(this.almacen.rutaSerie(this.carpeta), CARPETA_VARIANTES);
  }

  ruta(id: string): string {
    if (!esIdVariante(id)) throw new Error(`«${id}» no es una variante.`);
    return unir(this.dir, `${id}.md`);
  }

  /** Ids ocupados (también los de las notas apartadas), para no repetir */
  get usados(): Set<string> {
    const ids = new Set(this.lista.keys());
    for (const r of this.apartadas.keys()) ids.add(nombreDe(r).replace(/\.md$/, ""));
    return ids;
  }

  /** Lee las propiedades de todas (al abrir la serie) */
  async cargar(): Promise<void> {
    this.lista.clear();
    this.apartadas.clear();
    this.enConflicto.clear();
    const fs = this.almacen.fs;
    if (!(await fs.existe(this.dir))) return;
    const entradas = (await fs.listar(this.dir)).filter((e) => !e.esDir && e.nombre.endsWith(".md") && !e.nombre.startsWith("."));
    await Promise.all(entradas.map((e) => this.leerUna(unir(this.dir, e.nombre))));
  }

  private async leerUna(ruta: string): Promise<string | null> {
    const nombre = nombreDe(ruta);
    if (esConflicto(nombre)) {
      const id = nombreOriginal(nombre).replace(/\.md$/, "");
      if (esIdVariante(id)) this.enConflicto.add(id);
      return id;
    }
    const id = nombre.replace(/\.md$/, "");
    this.apartadas.delete(ruta);
    try {
      const texto = await this.almacen.fs.leer(ruta);
      const c = leerCabecera(texto, nombre);
      this.lista.set(id, c);
      if (!this.textos.has(id)) this.textos.set(id, texto);
    } catch (e) {
      this.lista.delete(id);
      this.apartadas.set(ruta, { ruta, mensaje: (e as Error).message });
    }
    return id;
  }

  /** La variante entera (al abrirla, pedir sus choques o aplicarla) */
  async leer(id: string): Promise<DatosVariante> {
    if (this.enConflicto.has(id)) throw new Error("Tiene un conflicto de sincronización sin resolver: resuélvelo antes de abrirla.");
    const ruta = this.ruta(id);
    const texto = await this.almacen.fs.leer(ruta);
    const v = leerVariante(texto, `${id}.md`);
    this.textos.set(id, texto);
    this.lista.set(id, { ...v, piezas: [...v.piezas.keys()] });
    return v;
  }

  /**
   * Escribe la nota (en cola: dos guardados de la misma variante no se pisan).
   * Si el disco ya no tiene lo último leído o escrito, cambió fuera: lanza
   * CambioFuera y no escribe.
   */
  guardar(id: string, texto: string): Promise<void> {
    const anterior = this.colas.get(id) ?? Promise.resolve();
    const esta = anterior.catch(() => undefined).then(() => this.escribir(id, texto));
    this.colas.set(id, esta);
    return esta;
  }

  private async escribir(id: string, texto: string): Promise<void> {
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    const conocido = this.textos.get(id);
    const actual = (await fs.existe(ruta)) ? await fs.leer(ruta) : null;
    if (actual !== (conocido ?? null)) throw new CambioFuera(ruta);
    const c = leerCabecera(texto, `${id}.md`);
    await fs.crearDir(this.dir);
    this.almacen.alEscribir?.(ruta, texto);
    await escribirSeguro(fs, ruta, texto);
    this.textos.set(id, texto);
    this.lista.set(id, c);
  }

  /**
   * Cambia el estado de la nota tal y como está en el disco ahora (en la misma
   * cola que guardar). `marca` recibe lo leído y dice qué cambiar, o null si nada.
   */
  marcar(id: string, marca: (c: CabeceraVariante) => MarcaVariante | null): Promise<CabeceraVariante> {
    const anterior = this.colas.get(id) ?? Promise.resolve();
    const esta = anterior
      .catch(() => undefined)
      .then(async () => {
        const fs = this.almacen.fs;
        const ruta = this.ruta(id);
        const texto = await fs.leer(ruta);
        const c = leerCabecera(texto, `${id}.md`);
        this.textos.set(id, texto);
        this.lista.set(id, c);
        const cambios = marca(c);
        if (!cambios) return c;
        const nuevo = cambiarCabecera(texto, `${id}.md`, cambios);
        this.almacen.alEscribir?.(ruta, nuevo);
        await escribirSeguro(fs, ruta, nuevo);
        const hecho = leerCabecera(nuevo, `${id}.md`);
        this.textos.set(id, nuevo);
        this.lista.set(id, hecho);
        return hecho;
      });
    this.colas.set(id, esta);
    return esta;
  }

  /** Una variante sin cambios no deja rastro: a la papelera de la serie, nunca borrada (RF-26) */
  async aPapelera(id: string): Promise<void> {
    await (this.colas.get(id) ?? Promise.resolve()).catch(() => undefined);
    const fs = this.almacen.fs;
    const ruta = this.ruta(id);
    this.lista.delete(id);
    this.textos.delete(id);
    if (!(await fs.existe(ruta))) return;
    const papelera = unir(this.almacen.rutaSerie(this.carpeta), "_papelera");
    await fs.crearDir(papelera);
    const base = `${sello(this.almacen.reloj())} ${id}`;
    let destino = unir(papelera, `${base}.md`);
    for (let n = 2; await fs.existe(destino); n++) destino = unir(papelera, `${base} (${n}).md`);
    this.almacen.alEscribir?.(ruta, null);
    await fs.renombrar(ruta, destino);
  }

  /** ¿Es una ruta de _variantes/? */
  esDeVariantes(ruta: string): boolean {
    return carpetaDe(normalizar(ruta)) === this.dir;
  }

  /**
   * Lo que la vigilancia ve cambiar en _variantes/ (lo propio ya no llega).
   * Pone al día la lista y devuelve los ids que cambiaron fuera.
   */
  async releer(cambios: CambioExterno[]): Promise<string[]> {
    const ids: string[] = [];
    for (const c of cambios) {
      const nombre = nombreDe(c.ruta);
      if (!nombre.endsWith(".md")) continue;
      if (c.que === "borrado") {
        const id = nombre.replace(/\.md$/, "");
        if (esConflicto(nombre)) this.enConflicto.delete(nombreOriginal(nombre).replace(/\.md$/, ""));
        else {
          this.lista.delete(id);
          this.apartadas.delete(c.ruta);
        }
        ids.push(id);
        continue;
      }
      const id = await this.leerUna(c.ruta);
      if (id) ids.push(id);
    }
    return ids;
  }
}
