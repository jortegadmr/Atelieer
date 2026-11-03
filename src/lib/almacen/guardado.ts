// Guardado automático (spec 5.6): cada cambio pide guardar su pieza; al medio
// segundo sin cambios se escribe la última versión de cada una. Si falla, se
// dice y se reintenta. Una nota que cambió fuera no se pisa ni se reintenta:
// se queda lo de fuera y se dice (spec 002, RNF integridad).

import type { Pieza } from "../modelo/tipos";
import { CambioFuera, type Almacen } from "./almacen";

const REINTENTO_MS = 3000;

export class Guardado {
  private pendientes = new Map<string, Pieza>();
  /**
   * La nota de cada pieza tal como estaba cuando el autor empezó a cambiarla:
   * se escribe solo si sigue así. Lo releído después no la cambia.
   */
  private bases = new Map<string, string | undefined>();
  /** Piezas del lote que se está escribiendo ahora mismo */
  private enVuelo = new Set<string>();
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private escribiendo: Promise<void> = Promise.resolve();
  /** Hora (ms) del último guardado que acabó bien */
  ultimo: number | null = null;
  error: string | null = null;
  /** Lo que no se guardó porque cambió fuera; se va al volver a cambiar esas piezas o al cerrarlo */
  aviso: string | null = null;
  private piezasDelAviso = new Set<string>();

  constructor(
    private readonly almacen: Almacen,
    private readonly carpeta: string,
    private readonly retrasoMs = 500,
    private readonly alCambiar: () => void = () => undefined,
    /** Notas que no se escribieron porque cambiaron fuera: hay que releerlas */
    private readonly alPisar: (rutas: string[]) => void = () => undefined,
  ) {}

  get pendiente(): boolean {
    return this.pendientes.size > 0;
  }

  pedir(p: Pieza): void {
    // La base es la de la primera petición; si la pieza se está escribiendo,
    // se pone al día al acabar esa escritura
    if (!this.bases.has(p.id)) this.bases.set(p.id, this.almacen.conocidoDe(this.carpeta, p));
    this.pendientes.set(p.id, p);
    if (this.piezasDelAviso.delete(p.id) && !this.piezasDelAviso.size) this.aviso = null;
    this.programar(this.retrasoMs);
    this.alCambiar();
  }

  /** La pieza se ha borrado: lo pendiente de ella ya no se escribe (tampoco si está en el lote) */
  olvidar(id: string): boolean {
    const habia = this.pendientes.delete(id) || this.enVuelo.has(id);
    this.enVuelo.delete(id);
    this.bases.delete(id);
    return habia;
  }

  /** Lo propio de esta pieza aún sin escribir no se escribe: acaba de llegar lo de fuera */
  soltar(id: string, mensaje: string): void {
    if (!this.olvidar(id)) return;
    this.avisar(mensaje, [id]);
    this.alCambiar();
  }

  quitarAviso(): void {
    this.aviso = null;
    this.piezasDelAviso.clear();
    this.alCambiar();
  }

  private avisar(mensaje: string, ids: string[]) {
    this.aviso = mensaje;
    this.piezasDelAviso = new Set(ids);
  }

  private programar(ms: number) {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      void this.vaciar();
    }, ms);
  }

  /** Escribe ya todo lo pendiente */
  vaciar(): Promise<void> {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.escribiendo = this.escribiendo.then(() => this.escribir());
    return this.escribiendo;
  }

  private async escribir(): Promise<void> {
    if (!this.pendientes.size) return;
    const lote = [...this.pendientes.values()];
    this.pendientes.clear();
    this.enVuelo = new Set(lote.map((p) => p.id));
    const fallidas: Pieza[] = [];
    const pisadas: { id: string; error: CambioFuera }[] = [];
    let mensaje: string | null = null;
    for (const p of lote) {
      // Soltada u olvidada mientras se escribía otra del lote
      if (!this.enVuelo.has(p.id)) continue;
      const base = this.bases.get(p.id);
      try {
        const { contenido } = await this.almacen.guardar(this.carpeta, p, { base });
        // Lo pedido mientras tanto parte de lo que se acaba de escribir
        if (this.pendientes.has(p.id)) this.bases.set(p.id, contenido);
        else this.bases.delete(p.id);
      } catch (e) {
        if (e instanceof CambioFuera) {
          pisadas.push({ id: p.id, error: e });
          this.pendientes.delete(p.id);
          this.bases.delete(p.id);
        } else if (this.enVuelo.has(p.id)) {
          fallidas.push(p);
          mensaje = (e as Error).message;
        }
      }
    }
    // Lo que se pidió mientras tanto manda sobre lo que falló; lo soltado no vuelve
    for (const p of fallidas) if (this.enVuelo.has(p.id) && !this.pendientes.has(p.id)) this.pendientes.set(p.id, p);
    this.enVuelo.clear();
    if (fallidas.length) {
      this.error = `No se pudo guardar (${mensaje}). Se reintenta solo.`;
      this.programar(REINTENTO_MS);
    } else {
      this.error = null;
      this.ultimo = Date.now();
    }
    if (pisadas.length) {
      this.avisar(
        pisadas.map((x) => x.error.message).join(" · "),
        pisadas.map((x) => x.id),
      );
      this.alPisar(pisadas.map((x) => x.error.ruta));
    }
    this.alCambiar();
  }
}
