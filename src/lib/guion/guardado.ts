// Guardado diferido de los guiones (spec 013, RF-27, RF-28): como el de la
// pizarra, pero por escena. Cada cambio pide guardar y, a los 600 ms sin más
// cambios de esa escena, se escribe su última versión. Un guardado cada vez y en
// orden. Si falla, se dice y lo pendiente se conserva para reintentar con el
// siguiente cambio o con el botón. Lo cambiado fuera NO se pisa y tampoco se
// descarta: la versión local se queda intacta, el guardado de esa escena se
// bloquea y el autor elige entre tres caminos (cada uno con copia en la papelera).

import { CambioFuera } from "../almacen/almacen";
import type { AlmacenGuion, CargaGuion } from "../almacen/almacen-guion";
import { BorradaFuera } from "../almacen/almacen-pizarra";
import type { Guion } from "./tipos";

export interface CambioPorFuera {
  /** Lo que hay en pantalla (y se conserva intacto hasta que el autor elija) */
  local: Guion;
}

export class GuardadoGuion {
  private pendientes = new Map<string, Guion>();
  private enVuelo = new Set<string>();
  private temporizadores = new Map<string, ReturnType<typeof setTimeout>>();
  private escribiendo: Promise<void> = Promise.resolve();
  /** Por qué falló el último guardado de cada escena; lo pendiente se conserva */
  readonly errores = new Map<string, string>();
  /** Escenas cuyo fichero cambió fuera: no se escriben hasta que el autor elija */
  readonly cambiadas = new Map<string, CambioPorFuera>();
  /** Escenas cuyo fichero se borró fuera: se vuelve a escribir con el siguiente cambio */
  readonly borradas = new Set<string>();
  /** Lo que había en pantalla cuando se borró el fichero fuera: se escribe al salir o cerrar, nunca se pierde */
  private textoBorrada = new Map<string, Guion>();
  /** Hora (ms) del último guardado bueno de cada escena */
  readonly ultimo = new Map<string, number>();
  /** La interfaz se entera de cada cambio de estado */
  alCambiar: () => void = () => undefined;
  /** Una escena se releyó del disco por decisión del autor: aquí llega, para sustituir a la de pantalla */
  alFuera: (id: string, carga: CargaGuion) => void = () => undefined;

  constructor(
    private readonly disco: AlmacenGuion,
    private readonly retrasoMs = 600,
  ) {}

  get hayPendiente(): boolean {
    return this.pendientes.size > 0 || this.enVuelo.size > 0;
  }

  hayPendienteDe(id: string): boolean {
    return this.pendientes.has(id) || this.enVuelo.has(id);
  }

  /** El guion de una escena ha cambiado: se guardará cuando pase el retraso sin más cambios */
  cambiar(id: string, g: Guion): void {
    if (this.cambiadas.has(id)) {
      // Bloqueada: se sigue conservando lo último que escribe el autor, sin escribir nada
      this.cambiadas.set(id, { local: g });
      this.alCambiar();
      return;
    }
    this.pendientes.set(id, g);
    this.borradas.delete(id);
    this.textoBorrada.delete(id);
    this.programar(id);
    this.alCambiar();
  }

  /** Guarda ya lo pendiente (salir de la vista o de la escena, cerrar, restaurar) y espera a que acabe */
  async vaciar(id?: string): Promise<void> {
    for (const i of id ? [id] : [...this.temporizadores.keys()]) this.quitarTemporizador(i);
    // Una escena cuyo fichero se borró fuera se recrea al salir: el texto del autor no se pierde
    for (const i of id ? [id] : [...this.textoBorrada.keys()]) {
      const g = this.textoBorrada.get(i);
      if (g && !this.pendientes.has(i)) this.pendientes.set(i, g);
      this.textoBorrada.delete(i);
    }
    await this.lote(id);
  }

  /** Reintento a mano tras un fallo */
  reintentar(id?: string): Promise<void> {
    return this.vaciar(id);
  }

  /** Lo pendiente ya no se escribe: el guion de pantalla ha cambiado de manos (otra serie) */
  descartar(id?: string): void {
    const ids = id ? [id] : [...this.pendientes.keys(), ...this.errores.keys(), ...this.cambiadas.keys(), ...this.borradas];
    for (const i of ids) {
      this.quitarTemporizador(i);
      this.pendientes.delete(i);
      this.errores.delete(i);
      this.cambiadas.delete(i);
      this.borradas.delete(i);
      this.textoBorrada.delete(i);
    }
    this.alCambiar();
  }

  /**
   * Antes de descartar o cerrar: la versión local de lo cambiado por fuera y lo que
   * no llegó a escribirse (por un fallo) va a la papelera del guion. Devuelve cuántas.
   */
  async salvarLocales(id?: string): Promise<number> {
    const ids = new Set<string>(id ? [id] : [...this.cambiadas.keys(), ...this.errores.keys(), ...this.textoBorrada.keys()]);
    let n = 0;
    for (const i of ids) {
      const g = this.cambiadas.get(i)?.local ?? this.pendientes.get(i) ?? this.textoBorrada.get(i);
      if (!g) continue;
      await this.disco.copiaAPapelera(i, g);
      n++;
    }
    return n;
  }

  /** Lo escrito en pantalla mientras se releía el fichero de fuera: se conserva y se deja elegir */
  marcarCambioFuera(id: string, local: Guion): void {
    this.quitarTemporizador(id);
    this.pendientes.delete(id);
    this.errores.delete(id);
    this.cambiadas.set(id, { local });
    this.alCambiar();
  }

  // --- Los tres caminos ante un cambio por fuera (RF-28); el tercero, copiar, no cambia nada ---

  /** «Quedarme con la mía»: la del disco va antes a la papelera y se escribe la local */
  async quedarmeConLaMia(id: string): Promise<void> {
    if (!this.cambiadas.has(id)) return;
    const crudo = await this.disco.leerCrudo(id);
    if (crudo !== null) await this.disco.copiaAPapelera(id, crudo);
    await this.disco.adoptarDelDisco(id);
    // Lo tecleado mientras tanto también cuenta: se toma lo último
    const local = this.cambiadas.get(id)?.local;
    this.cambiadas.delete(id);
    if (local) this.pendientes.set(id, local);
    this.quitarTemporizador(id);
    await this.lote(id);
    this.alCambiar();
  }

  /** «Usar la de fuera»: la local va antes a la papelera y se carga la del disco */
  async usarLaDeFuera(id: string): Promise<void> {
    if (!this.cambiadas.has(id)) return;
    const copiada = this.cambiadas.get(id)!.local;
    await this.disco.copiaAPapelera(id, copiada);
    const carga = await this.disco.releer(id);
    // Si el autor siguió tecleando mientras tanto, lo último también se guarda aparte
    const ultima = this.cambiadas.get(id)?.local;
    if (ultima && ultima !== copiada) await this.disco.copiaAPapelera(id, ultima);
    this.cambiadas.delete(id);
    this.pendientes.delete(id);
    this.errores.delete(id);
    this.quitarTemporizador(id);
    this.alFuera(id, carga);
    this.alCambiar();
  }

  private programar(id: string): void {
    this.quitarTemporizador(id);
    this.temporizadores.set(
      id,
      setTimeout(() => {
        this.temporizadores.delete(id);
        void this.lote(id);
      }, this.retrasoMs),
    );
  }

  private quitarTemporizador(id: string): void {
    const t = this.temporizadores.get(id);
    if (t) clearTimeout(t);
    this.temporizadores.delete(id);
  }

  /** Un guardado detrás de otro: nunca dos a la vez */
  private lote(id?: string): Promise<void> {
    const esta = this.escribiendo.catch(() => undefined).then(() => this.escribirTodo(id));
    this.escribiendo = esta;
    return esta;
  }

  private async escribirTodo(solo?: string): Promise<void> {
    for (const id of solo ? [solo] : [...this.pendientes.keys()]) await this.escribir(id);
  }

  private async escribir(id: string): Promise<void> {
    const g = this.pendientes.get(id);
    if (!g) return;
    this.pendientes.delete(id);
    this.enVuelo.add(id);
    this.alCambiar();
    try {
      await this.disco.guardar(id, g);
      this.errores.delete(id);
      this.borradas.delete(id);
      this.ultimo.set(id, Date.now());
    } catch (e) {
      if (e instanceof BorradaFuera) {
        // Se ve lo que hay en pantalla; el siguiente cambio la recrea. Lo pendiente más nuevo la recrea ya.
        this.errores.delete(id);
        this.borradas.add(id);
        this.textoBorrada.set(id, this.pendientes.get(id) ?? g);
        this.pendientes.delete(id);
      } else if (e instanceof CambioFuera) {
        // Nada se descarta: lo local queda intacto y esta escena no se escribe hasta que se elija
        this.quitarTemporizador(id);
        const masNuevo = this.pendientes.get(id) ?? g;
        this.pendientes.delete(id);
        this.errores.delete(id);
        this.cambiadas.set(id, { local: masNuevo });
      } else {
        this.errores.set(id, (e as Error).message);
        // Si entretanto llegó un cambio más nuevo, ese es el que vale
        if (!this.pendientes.has(id)) this.pendientes.set(id, g);
      }
    } finally {
      this.enVuelo.delete(id);
      this.alCambiar();
    }
  }
}
