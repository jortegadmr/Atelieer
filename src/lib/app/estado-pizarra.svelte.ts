// La pizarra en el estado de la app (spec 012): la que se ve, su deshacer, su
// encuadre y lo que hay que decir al autor. Escribir va por `guardadoPizarra` de
// la sesión (en cola, sin pisar lo cambiado fuera). Con una variante abierta
// (spec 006) la pizarra es de solo lectura y se resuelve contra la serie
// principal. Ni el historial ni el encuadre se guardan: viven en memoria.

import type { CargaPizarra } from "../almacen/almacen-pizarra";
import type { CambioExterno } from "../almacen/vigilancia";
import { ENCUADRE_INICIAL, TAMANO_ELEMENTO, type Encuadre } from "../pizarra/encuadre";
import { HistorialPizarra } from "../pizarra/historial";
import * as op from "../pizarra/operaciones";
import { estadoTarjeta, type VistaTarjeta } from "../pizarra/resolver";
import { vacia, type ColorNota, type Pizarra, type Tarjeta } from "../pizarra/tipos";
import type { Sesion } from "./sesion";

/** Lo que la pizarra necesita de la app que la contiene */
export interface AnfitrionPizarra {
  readonly sesionSerie: Sesion | null;
  /** Con una variante abierta no es null */
  readonly variante: unknown;
}

export type Fallo = { error: string };

export class EstadoPizarra {
  pizarra = $state.raw<Pizarra>(vacia());
  /** Ya se leyó del disco la de esta serie */
  cargada = $state(false);
  /** Por qué no se pudo leer la pizarra; la vista lo dice y deja reintentar */
  errorCarga = $state<string | null>(null);
  /** La lectura en curso: entrar en la vista dos veces seguidas no lee dos veces */
  private abriendo: Promise<void> | null = null;
  /** Una versión más nueva del formato: solo se mira */
  private soloLecturaFormato = $state(false);
  /** Lo que se dijo al leerla o al cambiar fuera */
  avisos = $state.raw<string[]>([]);
  /** El elemento o la flecha seleccionados */
  seleccion = $state<string | null>(null);
  encuadre = $state.raw<Encuadre>(ENCUADRE_INICIAL);
  /** Sube con cada cambio del guardado: la interfaz lo lee para redibujar su estado */
  private version = $state(0);

  private readonly historial = new HistorialPizarra();
  private sesion: Sesion | null = null;
  private quitarVentana: (() => void) | null = null;
  /** Hay un «quitar» a medias (copiando): otro no entra */
  private quitando = false;

  constructor(private readonly anfitrion: AnfitrionPizarra) {}

  get soloLectura(): boolean {
    return !!this.anfitrion.variante || this.soloLecturaFormato || !this.cargada || !this.sesion;
  }

  get puedeDeshacer(): boolean {
    void this.version;
    return this.puede && this.historial.puedeDeshacer;
  }

  get puedeRehacer(): boolean {
    void this.version;
    return this.puede && this.historial.puedeRehacer;
  }

  /** Por qué falló el último guardado; lo pendiente se conserva */
  get error(): string | null {
    void this.version;
    return this.sesion?.guardadoPizarra.error ?? null;
  }

  /** Lo que cambió fuera y se dijo (o se borró fuera) */
  get avisoGuardado(): string | null {
    void this.version;
    return this.sesion?.guardadoPizarra.aviso ?? null;
  }

  get hayPendiente(): boolean {
    void this.version;
    return this.sesion?.guardadoPizarra.hayPendiente ?? false;
  }

  /** Se carga al entrar en la vista; si ya está cargada la de esta serie, no hace nada */
  abrir(): Promise<void> {
    const s = this.anfitrion.sesionSerie;
    if (!s) return Promise.resolve();
    if (this.cargada && this.sesion === s) return Promise.resolve();
    if (this.abriendo && this.sesion === s) return this.abriendo;
    this.enganchar(s);
    this.errorCarga = null;
    const esta = (async () => {
      try {
        const c = await s.pizarra.cargar();
        // Si entretanto se cambió de serie, lo leído ya no es de aquí
        if (this.sesion !== s) return;
        this.aplicarCarga(c);
        this.cargada = true;
      } catch (e) {
        if (this.sesion === s) this.errorCarga = (e as Error).message || "error desconocido";
      } finally {
        if (this.sesion === s) this.abriendo = null;
      }
    })();
    this.abriendo = esta;
    return esta;
  }

  /** Al salir de la vista se guarda lo pendiente */
  async alSalir(): Promise<void> {
    await this.sesion?.guardadoPizarra.vaciar();
  }

  /** Otra serie, o ninguna: todo vuelve a empezar */
  reiniciar(): void {
    this.desenganchar();
    this.abriendo = null;
    this.errorCarga = null;
    this.pizarra = vacia();
    this.cargada = false;
    this.soloLecturaFormato = false;
    this.avisos = [];
    this.seleccion = null;
    this.encuadre = ENCUADRE_INICIAL;
    this.historial.vaciar();
  }

  /** Reintento a mano tras un fallo de guardado */
  async reintentar(): Promise<void> {
    await this.sesion?.guardadoPizarra.reintentar();
  }

  private enganchar(s: Sesion): void {
    this.desenganchar();
    this.sesion = s;
    s.guardadoPizarra.alCambiar = () => this.version++;
    s.guardadoPizarra.alFuera = (c) => this.recargar(c);
    s.alCambiarPizarra = (cambios) => void this.alCambiarFuera(cambios);
    // Al volver a la ventana se mira si cambió el disco (RNF-3)
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const volver = () => void this.alVolverALaVentana();
      const visible = () => {
        if (document.visibilityState === "visible") volver();
      };
      window.addEventListener("focus", volver);
      document.addEventListener("visibilitychange", visible);
      this.quitarVentana = () => {
        window.removeEventListener("focus", volver);
        document.removeEventListener("visibilitychange", visible);
      };
    }
  }

  private desenganchar(): void {
    this.quitarVentana?.();
    this.quitarVentana = null;
    const s = this.sesion;
    if (s) {
      s.guardadoPizarra.alCambiar = () => undefined;
      s.guardadoPizarra.alFuera = () => undefined;
      s.alCambiarPizarra = null;
    }
    this.sesion = null;
  }

  private aplicarCarga(c: CargaPizarra): void {
    this.pizarra = c.pizarra;
    this.soloLecturaFormato = c.soloLectura;
    this.avisos = c.avisos;
    if (this.seleccion && !this.existe(this.seleccion)) this.seleccion = null;
  }

  private existe(id: string): boolean {
    return this.pizarra.elementos.some((e) => e.id === id) || this.pizarra.flechas.some((f) => f.id === id);
  }

  /** Lo releído del disco sustituye a lo de pantalla, y con ello el deshacer deja de valer */
  private recargar(c: CargaPizarra): void {
    this.aplicarCarga(c);
    this.historial.vaciar();
    this.version++;
  }

  /**
   * Lo que cambió en _pizarra/ fuera de Atelier (RNF-3). Lo que vale es el disco,
   * no el tipo de aviso: si ya es lo último leído o escrito (el eco de un guardado
   * propio, un aviso repetido) no se hace nada; si cambió, se relee y lo pendiente
   * se descarta; si falta el fichero, lo de pantalla se queda.
   */
  async alCambiarFuera(cambios: CambioExterno[]): Promise<void> {
    const s = this.sesion;
    if (!s || !this.cargada) return;
    if (cambios.every((c) => c.que === "conflicto")) {
      this.avisos = [...this.avisos, "Hay un conflicto de sincronización junto a la pizarra: resuélvelo en la carpeta _pizarra."];
      return;
    }
    if (!(await s.pizarra.comprobarFuera())) return;
    s.guardadoPizarra.descartar();
    if (!(await s.pizarra.existe())) {
      // Lo que se ve se queda; el siguiente cambio la vuelve a escribir
      await s.pizarra.releer();
      this.avisos = [...this.avisos, "La pizarra se borró fuera de Atelier. Lo que ves se vuelve a guardar con tu siguiente cambio."];
      return;
    }
    const c = await s.pizarra.releer();
    // Lo tecleado mientras se releía iba sobre lo viejo: no se escribe encima de lo de fuera
    s.guardadoPizarra.descartar();
    this.recargar(c);
    this.avisos = [...c.avisos, "La pizarra cambió fuera de Atelier: se ha vuelto a leer y se descartaron los cambios sin guardar."];
  }

  /** Al volver a la ventana: lo mismo que un cambio de fuera, si el disco ya no es lo conocido */
  async alVolverALaVentana(): Promise<void> {
    const s = this.sesion;
    if (!s || !this.cargada) return;
    await this.alCambiarFuera([{ ruta: s.pizarra.ruta, que: "cambiado" }]);
  }

  /** La tarjeta como está su pieza en la serie principal, también con una variante abierta */
  tarjeta(t: Pick<Tarjeta, "pieza">): VistaTarjeta {
    const m = this.anfitrion.sesionSerie?.modelo;
    if (!m) return { pieza: t.pieza, tipo: null, titulo: "(pieza no encontrada)", detalle: "", estado: "ausente" };
    return estadoTarjeta(m, t);
  }

  // ---- Cambios ----

  private get puede(): boolean {
    return !this.soloLectura;
  }

  /** Pone la pizarra nueva: un paso de deshacer (salvo `paso = false`) y a guardar */
  private poner(nueva: Pizarra, clave?: string, paso = true): void {
    if (nueva === this.pizarra) return;
    if (paso) this.historial.hacer(this.pizarra, nueva, clave);
    else this.historial.seguir(this.pizarra, nueva);
    this.pizarra = nueva;
    this.sesion?.guardadoPizarra.cambiar(nueva);
    this.version++;
  }

  private static readonly SOLO_LECTURA: Fallo = { error: "La pizarra está en solo lectura." };

  crearNota(sitio: op.Sitio): { id: string } | Fallo {
    if (!this.puede) return EstadoPizarra.SOLO_LECTURA;
    const r = op.crearNota(this.pizarra, sitio);
    if ("error" in r) return r;
    this.poner(r.pizarra);
    this.seleccion = r.id;
    return { id: r.id };
  }

  /** Devuelve true si el texto se cortó en el tope */
  editarNota(id: string, texto: string): boolean {
    if (!this.puede) return false;
    const r = op.editarNota(this.pizarra, id, texto);
    this.poner(r.pizarra, `texto:${id}`);
    return r.recortado;
  }

  colorear(id: string, color: ColorNota): void {
    if (this.puede) this.poner(op.colorearNota(this.pizarra, id, color));
  }

  /** Un movimiento completo (al soltar) es un paso */
  mover(id: string, x: number, y: number): void {
    if (this.puede) this.poner(op.moverElemento(this.pizarra, id, x, y));
  }

  /** Tocar un elemento lo sube; no es un paso de deshacer */
  subir(id: string): void {
    if (this.puede) this.poner(op.subir(this.pizarra, id), undefined, false);
  }

  /** Una nota que se queda vacía al salir del campo se quita sola, sin copia ni paso */
  quitarNotaVacia(id: string): boolean {
    if (!this.puede) return false;
    const nueva = op.quitarNotaVacia(this.pizarra, id);
    if (nueva === this.pizarra) return false;
    this.poner(nueva, undefined, false);
    if (this.seleccion === id) this.seleccion = null;
    return true;
  }

  anadirTarjeta(pieza: string, sitio: op.Sitio, origen?: string): { id: string } | Fallo {
    if (!this.puede) return EstadoPizarra.SOLO_LECTURA;
    const r = op.anadirTarjeta(this.pizarra, pieza, sitio, origen);
    if ("error" in r) return r;
    this.poner(r.pizarra);
    this.seleccion = r.id;
    return { id: r.id };
  }

  /** La tarjeta de una idea nacida de una nota, a su derecha y unida a ella: un solo paso (spec 012, RF-18) */
  anadirTarjetaUnida(notaId: string, pieza: string): { id: string } | Fallo {
    if (!this.puede) return EstadoPizarra.SOLO_LECTURA;
    const nota = this.pizarra.elementos.find((e) => e.id === notaId);
    if (!nota) return { error: "La nota ya no está en la pizarra." };
    const t = op.anadirTarjeta(this.pizarra, pieza, { x: nota.x + TAMANO_ELEMENTO.ancho + 40, y: nota.y }, notaId);
    if ("error" in t) return t;
    const f = op.unir(t.pizarra, notaId, t.id);
    if ("error" in f) return f;
    this.poner(f.pizarra);
    this.seleccion = t.id;
    return { id: t.id };
  }

  unir(de: string, a: string, etiqueta = ""): { id: string } | Fallo {
    if (!this.puede) return EstadoPizarra.SOLO_LECTURA;
    const r = op.unir(this.pizarra, de, a, etiqueta);
    if ("error" in r) return r;
    this.poner(r.pizarra);
    return { id: r.id };
  }

  /**
   * Quita un elemento (con sus flechas) o una flecha. Si lleva algo del autor,
   * antes se deja la pizarra de antes en _papelera/_pizarra/ (RNF-2): si la copia
   * falla no se quita nada. Una nota vacía sin flechas se quita sin copia.
   */
  async quitar(id: string): Promise<{ flechasQuitadas: number; copia: boolean } | Fallo> {
    if (!this.puede) return EstadoPizarra.SOLO_LECTURA;
    if (this.quitando) return { error: "Ya se está quitando algo." };
    const antes = this.pizarra;
    const el = antes.elementos.find((x) => x.id === id);
    const flecha = antes.flechas.find((x) => x.id === id);
    if (!el && !flecha) return { error: "Eso ya no está en la pizarra." };
    const conFlechas = !!el && antes.flechas.some((f) => f.de === id || f.a === id);
    const copia = !!flecha || (!!el && (el.tipo === "tarjeta" || el.texto.trim() !== "" || conFlechas));
    this.quitando = true;
    try {
      if (copia) {
        try {
          await this.sesion!.pizarra.copiaAPapelera(antes);
        } catch (e) {
          return { error: `No se pudo dejar la copia en la papelera, así que no se quitó nada: ${(e as Error).message}` };
        }
      }
      // Mientras se copiaba pudo cambiar o salirse de la vista: se quita sobre lo de ahora
      if (!this.puede) return EstadoPizarra.SOLO_LECTURA;
      const q = flecha ? { pizarra: op.quitarFlecha(this.pizarra, id), flechasQuitadas: 0 } : op.quitarElemento(this.pizarra, id);
      this.poner(q.pizarra);
      if (this.seleccion === id) this.seleccion = null;
      return { flechasQuitadas: q.flechasQuitadas, copia };
    } finally {
      this.quitando = false;
    }
  }

  /** Devuelve true si la etiqueta se cortó en el tope */
  etiquetar(id: string, etiqueta: string): boolean {
    if (!this.puede) return false;
    const r = op.etiquetar(this.pizarra, id, etiqueta);
    this.poner(r.pizarra, `etiqueta:${id}`);
    return r.recortado;
  }

  deshacer(): boolean {
    return this.puede && this.volver(this.historial.deshacer());
  }

  rehacer(): boolean {
    return this.puede && this.volver(this.historial.rehacer());
  }

  private volver(p: Pizarra | null): boolean {
    if (!p || !this.puede) return false;
    this.pizarra = p;
    this.sesion?.guardadoPizarra.cambiar(p);
    if (this.seleccion && !this.existe(this.seleccion)) this.seleccion = null;
    this.version++;
    return true;
  }
}
