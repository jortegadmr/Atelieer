// Guardado diferido de la pizarra (spec 012, RF-13): cada cambio pide guardar y,
// a los 600 ms sin más cambios, se escribe la última versión. Un guardado cada
// vez y en orden. Si falla, se dice y lo pendiente se conserva para reintentar
// con el siguiente cambio o con el botón. Lo cambiado fuera no se pisa.

import { CambioFuera } from "../almacen/almacen";
import { BorradaFuera, type AlmacenPizarra, type CargaPizarra } from "../almacen/almacen-pizarra";
import type { Pizarra } from "./tipos";

export class GuardadoPizarra {
  private pendiente: Pizarra | null = null;
  private enVuelo = false;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private escribiendo: Promise<void> = Promise.resolve();
  /** Hora (ms) del último guardado que acabó bien */
  ultimo: number | null = null;
  /** Por qué falló el último guardado; lo pendiente se conserva */
  error: string | null = null;
  /** Lo que cambió fuera de Atelier y se dijo al autor; se va al descartar o al cambiar algo */
  aviso: string | null = null;
  /** La interfaz se entera de cada cambio de estado */
  alCambiar: () => void = () => undefined;
  /** El disco cambió fuera: aquí llega la pizarra releída, que sustituye a la de pantalla */
  alFuera: (carga: CargaPizarra) => void = () => undefined;

  constructor(
    private readonly disco: AlmacenPizarra,
    private readonly retrasoMs = 600,
  ) {}

  get hayPendiente(): boolean {
    return this.pendiente !== null || this.enVuelo;
  }

  /** La pizarra ha cambiado: se guardará cuando pase el retraso sin más cambios */
  cambiar(p: Pizarra): void {
    this.pendiente = p;
    this.aviso = null;
    this.programar();
    this.alCambiar();
  }

  /** Guarda ya lo pendiente (salir de la vista, cerrar, restaurar) y espera a que acabe */
  async vaciar(): Promise<void> {
    this.quitarTemporizador();
    await this.lote();
  }

  /** Reintento a mano tras un fallo */
  reintentar(): Promise<void> {
    return this.vaciar();
  }

  /** Lo pendiente ya no se escribe: la pizarra de pantalla ha cambiado de manos (otra serie, relectura) */
  descartar(): void {
    this.quitarTemporizador();
    this.pendiente = null;
    this.error = null;
    this.aviso = null;
    this.alCambiar();
  }

  private programar(): void {
    this.quitarTemporizador();
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      void this.lote();
    }, this.retrasoMs);
  }

  private quitarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  /** Un guardado detrás de otro: nunca dos a la vez */
  private lote(): Promise<void> {
    const esta = this.escribiendo.catch(() => undefined).then(() => this.escribir());
    this.escribiendo = esta;
    return esta;
  }

  private async escribir(): Promise<void> {
    const p = this.pendiente;
    if (!p) return;
    this.pendiente = null;
    this.enVuelo = true;
    this.alCambiar();
    try {
      await this.disco.guardar(p);
      this.error = null;
      this.ultimo = Date.now();
    } catch (e) {
      if (e instanceof BorradaFuera) {
        // Se ve lo que hay en pantalla; no se resucita sola, el siguiente cambio la escribe.
        // Un cambio más nuevo que llegó mientras se escribía se queda pendiente: ya la recrea.
        this.error = null;
        this.aviso = "La pizarra se borró fuera de Atelier. Lo que ves se vuelve a guardar con tu siguiente cambio.";
      } else if (e instanceof CambioFuera) {
        this.quitarTemporizador();
        this.pendiente = null;
        this.error = null;
        this.aviso = "La pizarra cambió fuera de Atelier: se ha vuelto a leer y se descartaron tus últimos cambios.";
        try {
          const carga = await this.disco.releer();
          // Algo pudo cambiar mientras se releía: sobre lo viejo no se escribe
          this.quitarTemporizador();
          this.pendiente = null;
          this.alFuera(carga);
        } catch (e2) {
          this.error = `No se pudo volver a leer la pizarra: ${(e2 as Error).message}`;
        }
      } else {
        this.error = (e as Error).message;
        // Si entretanto llegó un cambio más nuevo, ese es el que vale
        this.pendiente ??= p;
      }
    } finally {
      this.enVuelo = false;
      this.alCambiar();
    }
  }
}
