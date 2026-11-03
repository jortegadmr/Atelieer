// Una serie abierta: su modelo, la vigilancia de la carpeta y el aviso de
// uso. Las vistas escuchan `alCambiar` para redibujar.

import { CambioFuera, ErrorVueltaAtras, type Almacen, type DatosSerie, type ProblemaFichero } from "../almacen/almacen";
import { AvisoUso } from "../almacen/aviso-uso";
import { carpetaDe, unir } from "../almacen/fs";
import { revisarFichas, type EstadoFicha } from "../wiki/desfase";
import { Wiki, type TipoFicha } from "../wiki/fichas";
import { comprobarPasar, pasarAWiki, type ResultadoPasar } from "../wiki/pasar";
import { nombreFicha, ponerEstadoFicha, rutaFicha } from "../wiki/estado-ficha";
import { escribirFicha, guardarApartado, leerFicha, type FichaLeida, type OpcionesEscribir, type ResultadoGuardar } from "../wiki/editar-ficha";
import { anadirAlternativa, filaAlternativa, quitarAlternativa } from "../wiki/alternativas";
import { anotarLog } from "../wiki/log";
import { codigoEnLinea } from "../wiki/md";
import { DEJADO_ASI, entradaDejadoAsi, esEstadoAntiguo, normalizarEstado, propuesta, textoEstado } from "../wiki/equivalencias";
import { conEstado, estadoDe, olvidarCrudos, tieneFicha, valorEnWiki, type ConEstado } from "../modelo/estados";
import type { Estado, Madurez } from "../modelo/vocabulario";
import { crearFicha } from "../wiki/plantillas";
import { Guardado } from "../almacen/guardado";
import { AlmacenGuion } from "../almacen/almacen-guion";
import { AlmacenPizarra } from "../almacen/almacen-pizarra";
import { Instantaneas } from "../almacen/instantaneas";
import { GuardadoGuion } from "../guion/guardado";
import { esIdEscena } from "../guion/tipos";
import { GuardadoPizarra } from "../pizarra/guardado";
import { comprobar, idBase, type Aviso, type Resultado } from "../comprobaciones";
import { GUIA_INICIAL } from "../guia/guia-inicial";
import { leerGuia, type Guia } from "../guia/guia-md";
import { recargar, Vigilancia, type CambioExterno } from "../almacen/vigilancia";
import { Historial, type Cambiada } from "../modelo/deshacer";
import { Modelo, type Cambio } from "../modelo/modelo";
import { borrarPieza, editar } from "../modelo/operaciones";
import type { Arco, Evento, Pieza } from "../modelo/tipos";
import { AVISO_EPISODIO_CANON, AVISO_ESCENA_CANON } from "../vistas/actos";
import { antesDelPaso, copiaModelo } from "../consecuencias/copia";
import { Comparacion, type Origen } from "../consecuencias/comparacion";
import { cambioVolver } from "../consecuencias/volver";
import { efectos, type Efectos } from "../consecuencias/efectos";
import { AlmacenVariantes } from "../variantes/almacen-variantes";
import type { MarcaVariante } from "../variantes/formato";
import { fechaVariante, limpiarPorque } from "../variantes/nombres";
import type { CabeceraVariante, Choque, DatosVariante, MetaPaso } from "../variantes/tipos";
import { planAplicar, type PlanAplicar } from "../variantes/aplicar";
import { choques, choquesEnDisco } from "../variantes/choques";

const clonar = (p: Pieza | undefined): Pieza | null => (p ? structuredClone(p) : null);

const conEstadoDe = (p: Pieza | undefined): p is ConEstado & Pieza => !!p && "madurez" in p;

/** Lo que se compara para saber si una pieza canon se ha cambiado (silenciar avisos no cuenta) */
const firma = (p: Pieza) => JSON.stringify({ ...p, avisos_silenciados: undefined });
/** Para deshacer: la fecha de la ficha la pone al día la app fuera del Ctrl Z (spec 009, RF-39c) */
const firmaSinFecha = (p: Pieza) => JSON.stringify({ ...p, avisos_silenciados: undefined, wiki_mtime: undefined });
/** La pieza que vuelve con Ctrl Z conserva la fecha de su ficha de ahora, si es la misma ficha (RF-39c) */
function conFechaDeAhora(ahora: Pieza | undefined, p: Pieza): Pieza {
  if (!ahora || !("wiki_mtime" in ahora) || !("wiki_mtime" in p) || ahora.wiki !== p.wiki || ahora.wiki_mtime === p.wiki_mtime) return p;
  return { ...p, wiki_mtime: ahora.wiki_mtime } as Pieza;
}

/** Pone en `r` las claves de `m` que difieren de `b`; las que `m` quitó, las quita */
function tocadas(r: Record<string, unknown>, m: Record<string, unknown>, b: Record<string, unknown>) {
  for (const k of new Set([...Object.keys(m), ...Object.keys(b)])) {
    if (JSON.stringify(m[k]) === JSON.stringify(b[k])) continue;
    if (Object.hasOwn(m, k)) r[k] = structuredClone(m[k]);
    else delete r[k];
  }
}

/**
 * Junta un cambio hecho sobre `base` con lo que la pieza tiene ahora: se queda
 * con lo de ahora salvo los campos que el cambio tocó. Lo que la app no
 * entiende (`extra`) se junta subclave a subclave (spec 010, «Lo sabe desde»).
 */
export function juntar(base: Pieza | null, mio: Pieza, ahora: Pieza | undefined): Pieza | null {
  // Borrada mientras tanto: no vuelve
  if (base && !ahora) return null;
  if (!base || !ahora || JSON.stringify(ahora) === JSON.stringify(base)) return mio;
  const r = structuredClone(ahora) as unknown as Record<string, unknown>;
  const [m, b] = [mio as unknown as Record<string, unknown>, base as unknown as Record<string, unknown>];
  const { extra: mExtra, ...mResto } = m;
  const { extra: bExtra, ...bResto } = b;
  tocadas(r, mResto, bResto);
  const extra = { ...(r.extra as Record<string, unknown>) };
  tocadas(extra, mExtra as Record<string, unknown>, bExtra as Record<string, unknown>);
  r.extra = extra;
  return r as unknown as Pieza;
}

export const AVISO_BLOQUEADA = "Está en canon: desbloquéala para cambiarla (sería un retcon).";
/** La pestaña Ficha con la pieza canon bloqueada (spec 009, RF-41) */
export const AVISO_FICHA_CANON = "Canon: desbloquéala para editar su ficha";

/** Escena o tramo descartado */
const descartada = (p: Pieza | undefined) => conEstadoDe(p) && estadoDe(p) === "descartado";
export { AVISO_EPISODIO_CANON, AVISO_ESCENA_CANON };

/** Opciones de `aplicar` */
export interface OpcionesAplicar {
  /** Quién hace el cambio, para «Si lo dejas así…» (spec 005). Por defecto, el autor */
  origen?: Origen;
  /** Sin olvidar los valores escritos a mano: las piezas quedan tal cual (spec 005, «Volver a como estaba») */
  exacto?: boolean;
  /** Entero o nada: si algo cambió fuera, o una ficha no se puede poner al día, no se aplica nada (spec 005, RF-20) */
  entero?: boolean;
  /** Vale aunque la edición esté bloqueada: Ctrl I y su «Deshacer» (spec 006, RF-8b, RF-15) */
  enLectura?: boolean;
}

/** La cara del guardado que enseña el pie del panel (el de la serie o el de una variante, spec 006) */
export interface GuardadoVisible {
  readonly pendiente: boolean;
  ultimo: number | null;
  error: string | null;
  aviso: string | null;
  quitarAviso(): void;
  vaciar(): Promise<unknown>;
}

/** Lo que pasa al aplicar una variante (spec 006, RF-32 a RF-39) */
export type ResultadoAplicar =
  | { hecho: true; piezas: number; avisos?: string[] }
  | { hecho: false; motivo: "choques" | "canon" | "wiki" | "instantanea" | "disco" | "ocupado" | "estado"; avisos: string[]; choques?: Choque[]; canon?: string[] };

export interface ResultadoEstado {
  hecho: boolean;
  /** Resultado de pasar a la wiki, si hizo falta (p. ej. nombre repetido) */
  pasar?: ResultadoPasar;
  /** Lo que el autor tiene que saber: la wiki no se actualizó, está bloqueada… */
  avisos: string[];
}

export class Sesion {
  readonly modelo: Modelo;
  problemas: ProblemaFichero[];
  conflictos: string[];
  readonly guardado: Guardado;
  /** Errores al borrar (al guardar, los dice `guardado.error`) */
  errorBorrar: string | null = null;
  /** Reglas de appDatos/guia.md; null si no existe */
  guia: Guia | null = null;
  private memo: { version: number; r: Resultado } | null = null;
  /** Deshacer y rehacer de esta serie, mientras esté abierta */
  readonly historial = new Historial();
  readonly instantaneas: Instantaneas;
  /** Las variantes «¿Y si…?» de la serie (spec 006); una variante usa el de su serie: un solo camino de escritura */
  variantes: AlmacenVariantes;
  /** La pizarra de la serie (spec 012): su almacén y su guardado diferido */
  readonly pizarra: AlmacenPizarra;
  readonly guardadoPizarra: GuardadoPizarra;
  /** Los guiones de las escenas (spec 013): su almacén y su guardado diferido por escena */
  readonly guion: AlmacenGuion;
  readonly guardadoGuion: GuardadoGuion;
  /** Hora del último guardado de guion que ya entró en una instantánea automática */
  private horaCopiaGuion = 0;
  /** Lo que cambió en _guion/ fuera de Atelier (la vigilancia); la interfaz del guion lo escucha */
  alCambiarGuion: ((cambios: CambioExterno[]) => void) | null = null;
  /** Los guiones de estas escenas se movieron (borrar, deshacer, rehacer): lo que los lee los descarta */
  alMoverGuiones: ((ids: string[]) => void) | null = null;
  /** Lo que cambió en _pizarra/ fuera de Atelier (la vigilancia); la interfaz de la pizarra lo escucha */
  alCambiarPizarra: ((cambios: CambioExterno[]) => void) | null = null;
  /** Variantes que cambiaron fuera de Atelier (la vigilancia); la de la variante abierta lo escucha */
  alCambiarVariantes: ((ids: string[]) => void) | null = null;
  /** Versión del modelo en la última instantánea automática */
  private versionCopia = -1;
  private temporizadorCopias: ReturnType<typeof setInterval> | null = null;
  errorCopia: string | null = null;
  /** Personajes, lugares y épocas de la wiki de la serie */
  wiki: Wiki;
  /** Estado de las fichas de las piezas ya pasadas (T8.5) */
  fichas = new Map<string, EstadoFicha>();
  private temporizadorWiki: ReturnType<typeof setInterval> | null = null;
  private oyentes = new Set<() => void>();
  private vigilancia: Vigilancia | null = null;
  /** Piezas canon desbloqueadas a propósito; duran hasta cerrar la serie (spec 001, RF-30) */
  private desbloqueadas = new Set<string>();
  /** Avisos de la última vez que se aplicó un cambio (bloqueo, wiki sin actualizar) */
  avisosCambio: string[] = [];
  /**
   * Lo que el autor no puede cambiar ahora y por qué: «Ver ahora» con una variante
   * abierta, o aplicando una (spec 006, RF-15). No es el bloqueo de canon: Ctrl I,
   * la revisión de fichas y la vigilancia siguen.
   */
  edicionBloqueada: string | null = null;
  /** La pestaña Ficha deja aquí cómo guardar lo que tiene sin guardar: se llama antes de que la app escriba en una ficha (spec 009, RF-38) */
  fichaPendiente: (() => Promise<void>) | null = null;
  /** Cuántas veces ha escrito la app en cada ficha (ruta): la pestaña la vuelve a leer y no lo toma por un cambio de fuera */
  readonly fichasEscritas = new Map<string, number>();
  /** Desde que se abrió la serie: fichas ya copiadas (RF-39) y apartados ya apuntados en el Log (RF-39b) */
  private fichasCopiadas = new Set<string>();
  private apartadosApuntados = new Set<string>();

  /** Si la edición está bloqueada, lo dice y da true */
  protected rechazarEdicion(): boolean {
    if (!this.edicionBloqueada) return false;
    this.avisosCambio = [this.edicionBloqueada];
    this.avisar();
    return true;
  }
  /** «Si lo dejas así…» (spec 005): cómo estaba la serie al abrir la pieza elegida */
  comparacion: Comparacion | null = null;
  /** La última creación, mientras nada más haya cambiado: su punto de partida es el de antes de crear (RF-23) */
  private ultimaCreacion: { ids: string[]; version: number; piezas: readonly Cambiada[]; avisos: Aviso[] | null } | null = null;

  protected constructor(
    readonly almacen: Almacen,
    readonly carpeta: string,
    datos: DatosSerie,
    /** "Está abierta en … desde las …", o null */
    readonly avisoUso: string | null,
    private readonly aviso: AvisoUso | null,
  ) {
    this.modelo = new Modelo(datos);
    this.problemas = datos.problemas;
    this.conflictos = datos.conflictos;
    this.modelo.alCambiar(() => this.avisar());
    this.guardado = new Guardado(
      almacen,
      carpeta,
      500,
      () => this.avisar(),
      (rutas) => void this.releer(rutas),
    );
    this.instantaneas = new Instantaneas(almacen, carpeta);
    this.variantes = new AlmacenVariantes(almacen, carpeta);
    this.pizarra = new AlmacenPizarra(almacen, carpeta);
    this.guardadoPizarra = new GuardadoPizarra(this.pizarra);
    this.guion = new AlmacenGuion(almacen, carpeta);
    this.guardadoGuion = new GuardadoGuion(this.guion);
    this.wiki = new Wiki(almacen.fs, this.vault, this.modelo.serie.wiki);
  }

  /** La carpeta del vault (Vault): la que contiene appDatos */
  get vault(): string {
    return carpetaDe(this.almacen.raiz);
  }

  /** La carpeta de la serie, relativa al vault ("appDatos/_prueba") */
  get carpetaEnVault(): string {
    return this.ruta.slice(this.vault.length + 1);
  }

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /** Vuelve a leer la wiki (por si cambiaron las rutas o se creó una ficha) */
  async leerWiki(): Promise<void> {
    this.wiki = new Wiki(this.almacen.fs, this.vault, this.modelo.serie.wiki);
    try {
      await this.wiki.cargar();
    } catch {
      // Sin wiki legible: los nombres se quedan como texto
    }
    await this.revisarFichas();
  }

  /** Vuelve a leer la wiki sin revisar fichas ni escribir ni avisar: para vistas que solo miran (spec 014) */
  async leerWikiSoloLectura(): Promise<void> {
    const wiki = new Wiki(this.almacen.fs, this.vault, this.modelo.serie.wiki);
    try {
      await wiki.cargar();
    } catch {
      // Sin wiki legible: los nombres se quedan como texto
    }
    this.wiki = wiki;
  }

  /**
   * Revisa las fichas de las piezas ya pasadas: si la ficha dice canon, la
   * pieza pasa a canon (regla 9: solo el autor lo pone, en la wiki).
   */
  async revisarFichas(): Promise<void> {
    // Aplicando una variante (o volviendo entero), espera a la próxima vuelta (spec 006)
    if (this.enteroEnMarcha) return;
    try {
      const estados = await revisarFichas(this.almacen.fs, this.vault, this.modelo);
      this.fichas = new Map(estados.map((e) => [e.id, e]));
      const aCanon = estados.filter((e) => e.canon).map((e) => this.modelo.pieza(e.id)).filter((p) => p && "madurez" in p && p.madurez !== "canon");
      if (aCanon.length) {
        await this.aplicar(
          {
            guardar: aCanon.map((p) => ({ ...structuredClone(p!), madurez: "canon" }) as Pieza),
            borrar: [],
          },
          false,
          undefined,
          { origen: "canon-wiki" },
        );
      }
    } catch {
      // Si no se puede leer la wiki, se deja como estaba
    }
    this.avisar();
  }

  /** Crear ficha (T8.3): solo cuando el autor lo pulsa */
  async crearFicha(tipo: TipoFicha, nombre: string, motivo?: string) {
    if (this.edicionBloqueada) throw new Error(this.edicionBloqueada);
    const r = await crearFicha(this.almacen.fs, this.vault, this.modelo.serie.wiki, tipo, nombre, { fecha: this.hoy(), origen: this.carpetaEnVault, motivo });
    await this.leerWiki();
    return r;
  }

  /** Pasar a la wiki (T8.4); si sale bien, la pieza queda enlazada a su ficha */
  async pasar(piezaId: string, nombre?: string): Promise<ResultadoPasar> {
    if (this.edicionBloqueada) throw new Error(this.edicionBloqueada);
    await this.guardado.vaciar();
    const r = await pasarAWiki(this.almacen.fs, this.vault, this.modelo, piezaId, { fecha: this.hoy(), carpetaSerie: this.carpetaEnVault, nombre });
    if (r.pieza) await this.aplicar({ guardar: [r.pieza], borrar: [] });
    await this.leerWiki();
    return r;
  }

  /** La ficha de la pieza como está en la wiki, o null si no tiene o no está (spec 009, RF-43) */
  async leerFichaDe(id: string): Promise<FichaLeida | null> {
    const p = this.modelo.pieza(id);
    if (!p || !tieneFicha(p.tipo)) return null;
    try {
      return await leerFicha(this.almacen.fs, this.vault, this.modelo.serie.wiki, { tipo: p.tipo, wiki: String((p as { wiki?: unknown }).wiki ?? "") });
    } catch {
      return null;
    }
  }

  /** Guarda un apartado de la ficha (spec 009, RF-37 a RF-42): no es un paso de Ctrl Z */
  async guardarApartado(id: string, leida: FichaLeida, i: number, nuevo: string): Promise<ResultadoGuardar> {
    if (this.estaBloqueada(id)) return { ok: false, motivo: "no se guarda", mensaje: AVISO_FICHA_CANON };
    const clave = `${leida.ruta}|${leida.apartados[i]?.titulo ?? ""}`;
    const log = !this.apartadosApuntados.has(clave);
    const r = await this.escribirEnFicha(id, (op) => guardarApartado(this.almacen.fs, this.vault, this.modelo.serie.wiki, leida, i, nuevo, { ...op, log }), false);
    if (r.ok && r.escrita) this.apartadosApuntados.add(clave);
    return r;
  }

  /**
   * El único camino para escribir en una ficha (spec 009: apartados, alternativas,
   * estados antiguos). Guarda antes lo pendiente de la pestaña (`pendiente`),
   * copia la ficha la primera vez y pone al día su fecha en la pieza (RF-39c).
   * El canon bloqueado lo comprueba quien llama.
   */
  async escribirEnFicha(id: string, escribir: (op: OpcionesEscribir) => Promise<ResultadoGuardar>, pendiente = true): Promise<ResultadoGuardar> {
    if (this.edicionBloqueada) return { ok: false, motivo: "no se guarda", mensaje: this.edicionBloqueada };
    return this.escribirFichaYa(id, escribir, pendiente);
  }

  /** `escribirEnFicha` sin mirar la edición bloqueada: lo que hace la app mientras aplica una variante (RF-51) */
  private async escribirFichaYa(id: string, escribir: (op: OpcionesEscribir) => Promise<ResultadoGuardar>, pendiente: boolean): Promise<ResultadoGuardar> {
    const p = this.modelo.pieza(id);
    const wiki = p && tieneFicha(p.tipo) ? String((p as { wiki?: unknown }).wiki ?? "").trim() : "";
    const ruta = p && tieneFicha(p.tipo) && wiki ? rutaFicha(this.modelo.serie.wiki, { tipo: p.tipo, wiki }) : null;
    if (!p || !tieneFicha(p.tipo) || !ruta) return { ok: false, motivo: "no está", mensaje: "Esta pieza no tiene ficha en la wiki de la serie." };
    if (pendiente) await this.fichaPendiente?.();
    // Si el autor ya la había cambiado en Obsidian, la marca se queda (como al cambiar el estado)
    const ahora = this.modelo.pieza(id);
    const fecha = ahora && "wiki_mtime" in ahora ? String(ahora.wiki_mtime ?? "") : "";
    const marcada = !!this.fichas.get(id)?.cambio || (await this.cambioEnWiki(p.tipo, wiki, fecha));
    const d = new Date();
    const hora = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join("-");
    const r = await escribir({ fecha: this.hoy(), hora, copia: this.fichasCopiadas.has(ruta) ? null : unir(this.ruta, "_fichas") });
    if (!r.ok || !r.escrita) return r;
    this.fichasCopiadas.add(ruta);
    if (!marcada) this.ponerFechaFicha(id, new Date(r.leida.fecha ?? 0).toISOString());
    this.contarEscrita(ruta);
    return r;
  }

  /** La fecha de la ficha en la pieza: sin Ctrl Z, sin bloqueo de canon y sin «Si lo dejas así…» (RF-39c) */
  private ponerFechaFicha(id: string, mtime: string): void {
    const p = this.modelo.pieza(id);
    if (!p || !("wiki_mtime" in p) || p.wiki_mtime === mtime) return;
    const nueva = { ...p, wiki_mtime: mtime } as Pieza;
    this.modelo.poner(nueva);
    this.persistir({ guardar: [nueva], borrar: [] });
  }

  /** La app escribió en esta ficha: la pestaña la vuelve a leer */
  private contarEscrita(ruta: string): void {
    this.fichasEscritas.set(ruta, (this.fichasEscritas.get(ruta) ?? 0) + 1);
    this.avisar();
  }

  /** Canon y sin desbloquear: no se edita, no se mueve ni cambia de estado (spec 001, RF-29) */
  estaBloqueada(id: string): boolean {
    const p = this.modelo.pieza(id);
    return conEstadoDe(p) && estadoDe(p) === "canon" && !this.desbloqueadas.has(id);
  }

  /** El autor acepta el retcon: la pieza se puede cambiar hasta cerrar la serie (RF-30) */
  desbloquear(id: string): void {
    if (this.rechazarEdicion()) return;
    this.desbloqueadas.add(id);
    this.avisar();
  }

  /**
   * Cambia el estado de una pieza (spec 001, modo mixto). Pasar a borrador o a
   * canon una pieza que aún no tiene ficha la crea en el mismo paso (RF-18,
   * RF-23); si no se puede, la pieza no cambia (RF-19). La ficha, si la hay,
   * se pone al día en `aplicar` (RF-25).
   */
  async cambiarEstado(id: string, estado: Estado, opciones: { motivo?: string; nombre?: string; sinJuntar?: boolean } = {}): Promise<ResultadoEstado> {
    const trabajo = this.cambiarEstadoYa(id, estado, opciones);
    this.estadoEnCurso = trabajo.catch(() => undefined);
    return trabajo;
  }

  /** El cambio de estado de la mesa, con sus filas de alternativas: Ctrl Z y Ctrl Y esperan a que acabe (revisión) */
  private estadoEnCurso: Promise<unknown> = Promise.resolve();

  private async cambiarEstadoYa(id: string, estado: Estado, opciones: { motivo?: string; nombre?: string; sinJuntar?: boolean }): Promise<ResultadoEstado> {
    if (this.edicionBloqueada) return { hecho: false, avisos: [this.edicionBloqueada] };
    const p = this.modelo.pieza(id);
    if (!conEstadoDe(p)) return { hecho: false, avisos: ["Esa pieza no tiene estado."] };
    if (this.estaBloqueada(id)) return { hecho: false, avisos: [AVISO_BLOQUEADA] };
    let pieza: ConEstado = p;
    let pasar: ResultadoPasar | undefined;
    if ((estado === "borrador" || estado === "canon") && tieneFicha(p.tipo) && !("wiki" in p && p.wiki.trim())) {
      await this.guardado.vaciar();
      try {
        pasar = await pasarAWiki(this.almacen.fs, this.vault, this.modelo, id, { fecha: this.hoy(), carpetaSerie: this.carpetaEnVault, nombre: opciones.nombre });
      } catch (e) {
        return { hecho: false, avisos: [(e as Error).message] };
      }
      if (!pasar.pieza) return { hecho: false, pasar, avisos: [] };
      pieza = pasar.pieza as ConEstado;
    }
    const antes = new Map([[id, this.modelo.pieza(id)]]);
    // Sin juntar: paso propio, aunque haya otro cambio de estado de hace un momento (spec 009, RF-55)
    await this.aplicar({ guardar: [conEstado(pieza, estado, opciones.motivo)], borrar: [] }, true, opciones.sinJuntar ? undefined : `estado ${id}`);
    const avisos = [...this.avisosCambio];
    if (pasar) await this.leerWiki();
    const ahora = this.modelo.pieza(id);
    const hecho = conEstadoDe(ahora) && estadoDe(ahora) === estado;
    if (hecho) {
      const alternativas = await this.alternativasAlCambiar(antes);
      if (alternativas.length) {
        avisos.push(...alternativas);
        this.avisosCambio.push(...alternativas);
        this.avisar();
      }
    }
    return { hecho, pasar, avisos };
  }

  /**
   * El estado antiguo de la ficha de una pieza (spec 009, RF-53, RF-54), con lo
   * que se propone; null si la ficha dice uno de la regla 9 o si el autor lo
   * dejó así con ese mismo valor (RF-56).
   */
  estadoAntiguo(id: string): { valor: unknown; texto: string; propuesta: Madurez | null } | null {
    const valor = this.fichas.get(id)?.estadoWiki;
    if (!esEstadoAntiguo(valor)) return null;
    if (this.dejadoAsi(id) === normalizarEstado(textoEstado(valor))) return null;
    return { valor, texto: textoEstado(valor), propuesta: propuesta(valor) };
  }

  /** El valor que el autor dejó así en la pieza (normalizado), o null (RF-56) */
  dejadoAsi(id: string): string | null {
    const p = this.modelo.pieza(id);
    const entrada = p && "avisos_silenciados" in p ? p.avisos_silenciados.find((x) => x.startsWith(DEJADO_ASI)) : undefined;
    return entrada === undefined ? null : entrada.slice(DEJADO_ASI.length);
  }

  /**
   * «Dejarlo así» (RF-56): no toca la ficha; apunta en la pieza un «Lo sé» de
   * ese valor (constitución 3). Paso propio de Ctrl Z. No pasa por `loSe`: su
   * `idBase` recortaría la última letra del valor.
   */
  dejarAsi(id: string, valor: unknown): Promise<boolean> {
    return this.ponerDejadoAsi(id, entradaDejadoAsi(valor));
  }

  /** Quita el «Dejarlo así»: la ficha vuelve a avisar (RF-56) */
  quitarDejarAsi(id: string): Promise<boolean> {
    return this.ponerDejadoAsi(id, null);
  }

  private ponerDejadoAsi(id: string, entrada: string | null): Promise<boolean> {
    const cambio = editar(this.modelo, id, (p) => {
      if (!("avisos_silenciados" in p)) return;
      p.avisos_silenciados = p.avisos_silenciados.filter((x) => !x.startsWith(DEJADO_ASI));
      if (entrada) p.avisos_silenciados.push(entrada);
    });
    return this.aplicar(cambio, true);
  }

  /**
   * Confirma la equivalencia de un estado antiguo (RF-55): la ficha pasa a ese
   * valor (el Log dice el de antes) y la pieza queda en el estado que le
   * corresponde. Si la pieza cambia, es un paso propio de Ctrl Z; si ya estaba
   * (con «idea», también propuesta o aparcado), solo cambia la ficha, sin paso.
   * Nada lo llama solo (RF-57).
   */
  async confirmarEquivalencia(id: string, valor: Madurez, motivo?: string): Promise<ResultadoEstado> {
    if (this.edicionBloqueada) return { hecho: false, avisos: [this.edicionBloqueada] };
    const p = this.modelo.pieza(id);
    if (!conEstadoDe(p)) return { hecho: false, avisos: ["Esa pieza no tiene estado."] };
    // Canon bloqueado: no sale de canon sin desbloquear (RF-55b)
    if (this.estaBloqueada(id) && valor !== "canon") return { hecho: false, avisos: [AVISO_BLOQUEADA] };
    if (valorEnWiki(estadoDe(p)) !== valor) return this.cambiarEstado(id, valor, { motivo, sinJuntar: true });
    const wiki = "wiki" in p ? String(p.wiki ?? "").trim() : "";
    if (!tieneFicha(p.tipo) || !wiki || !rutaFicha(this.modelo.serie.wiki, { tipo: p.tipo, wiki })) {
      return { hecho: false, avisos: ["Esta pieza no tiene ficha en la wiki de la serie."] };
    }
    await this.fichaPendiente?.();
    const fecha = "wiki_mtime" in p ? String(p.wiki_mtime ?? "") : "";
    const marcada = !!this.fichas.get(id)?.cambio || (await this.cambioEnWiki(p.tipo, wiki, fecha));
    const r = await ponerEstadoFicha(this.almacen.fs, this.vault, this.modelo.serie.wiki, { tipo: p.tipo, wiki }, valor, { fecha: this.hoy() });
    if (!r.ok) return { hecho: false, avisos: [r.mensaje] };
    if (r.escrita) {
      if (!marcada) this.ponerFechaFicha(id, r.mtime);
      this.contarEscrita(r.ruta);
    }
    const ficha = this.fichas.get(id);
    if (ficha) this.fichas.set(id, { ...ficha, existe: true, canon: valor === "canon", cambio: marcada, estadoWiki: valor });
    this.avisar();
    return { hecho: true, avisos: r.aviso ? [r.aviso] : [] };
  }

  /**
   * Un cambio que mueve, borra o cambia una pieza bloqueada no se aplica: ni
   * siquiera a medias (RF-29). Renumerar un evento canon porque otro se pone a
   * su lado no es cambiarlo. En un episodio bloqueado no entra, no sale ni se
   * reordena ninguna escena (spec 003, RF-23, RF-24); editar su texto sí vale.
   */
  private bloqueadaQueToca(cambio: Cambio): { id: string; aviso?: string } | null {
    const igual = (p: Pieza) => {
      const actual = this.modelo.pieza(p.id);
      if (!actual) return false;
      if (p.tipo === "evento" && actual.tipo === "evento") return firma({ ...actual, orden: 0 }) === firma({ ...p, orden: 0 });
      return firma(actual) === firma(p);
    };
    if (cambio.mueve && this.estaBloqueada(cambio.mueve)) return { id: cambio.mueve, aviso: this.modelo.eventos.has(cambio.mueve) ? AVISO_ESCENA_CANON : undefined };
    const episodio = this.episodioBloqueadoQueToca(cambio);
    if (episodio) return { id: episodio, aviso: AVISO_EPISODIO_CANON };
    const id = cambio.borrar.find((p) => this.estaBloqueada(p.id))?.id ?? cambio.guardar.find((p) => this.estaBloqueada(p.id) && !igual(p))?.id;
    return id ? { id } : null;
  }

  /** Episodio bloqueado en el que el cambio mete, saca, borra o reordena una escena */
  private episodioBloqueadoQueToca(cambio: Cambio): string | null {
    const bloqueado = (ep: string | undefined) => !!ep && this.estaBloqueada(ep);
    // Si el episodio mismo se borra, lo dice su propio bloqueo
    const borrados = new Set(cambio.borrar.map((p) => p.id));
    for (const p of cambio.guardar) {
      if (p.tipo !== "evento") continue;
      const antes = this.modelo.eventos.get(p.id);
      const estructura = !antes || antes.episodio !== p.episodio || antes.orden !== p.orden || antes.acto !== p.acto;
      if (!estructura) continue;
      if (bloqueado(p.episodio) && !borrados.has(p.episodio)) return p.episodio;
      if (antes && antes.episodio !== p.episodio && bloqueado(antes.episodio) && !borrados.has(antes.episodio)) return antes.episodio;
    }
    for (const p of cambio.borrar) {
      if (p.tipo !== "evento") continue;
      const ep = this.modelo.eventos.get(p.id)?.episodio ?? p.episodio;
      if (bloqueado(ep) && !borrados.has(ep)) return ep;
    }
    return null;
  }

  /** Piezas del cambio cuya ficha tiene que cambiar de estado */
  private fichasACambiar(cambio: Cambio): Pieza[] {
    return cambio.guardar.filter((p) => {
      const antes = this.modelo.pieza(p.id);
      if (!conEstadoDe(p) || !conEstadoDe(antes) || !tieneFicha(p.tipo)) return false;
      const enlace = ("wiki" in p && p.wiki.trim()) || ("wiki" in antes && antes.wiki.trim());
      return !!enlace && valorEnWiki(estadoDe(p)) !== valorEnWiki(estadoDe(antes));
    });
  }

  /**
   * Pone al día la ficha de cada pieza que cambia de estado, antes que la mesa (RF-25 a RF-27).
   * Entero (spec 005, RF-20): comprueba que están todas antes de escribir
   * ninguna; si una falla a medias, o `sigue()` deja de valer, las ya escritas
   * vuelven a su estado y no se aplica nada (null).
   */
  private async sincronizarFichas(cambio: Cambio, cuales: Pieza[], entero?: { sigue: () => boolean; nada: string }): Promise<Cambio | null> {
    const guardar = [...cambio.guardar];
    const texto = (x: unknown) => (typeof x === "string" ? x.trim() : "");
    const enlace = (p: Pieza) => texto((p as { wiki?: unknown }).wiki) || texto((this.modelo.pieza(p.id) as { wiki?: unknown } | undefined)?.wiki);
    if (entero) {
      for (const p of cuales) {
        if (!conEstadoDe(p) || !tieneFicha(p.tipo)) continue;
        const ruta = rutaFicha(this.modelo.serie.wiki, { tipo: p.tipo, wiki: enlace(p) });
        const esta = !!ruta && (await this.almacen.fs.existe(unir(this.vault, ruta)).catch(() => false));
        if (!esta) {
          this.avisosCambio.push(`La ficha «${nombreFicha(enlace(p))}» no está en la wiki de la serie: ${entero.nada}.`);
          return null;
        }
      }
    }
    // Entero: lo escrito, para devolverlo si algo falla después
    const escritas: { id: string; tipo: Parameters<typeof rutaFicha>[1]["tipo"]; wiki: string; valor: ReturnType<typeof valorEnWiki>; ficha?: EstadoFicha }[] = [];
    const devolverEscritas = async () => {
      for (const x of escritas.reverse()) {
        const r = await ponerEstadoFicha(this.almacen.fs, this.vault, this.modelo.serie.wiki, { tipo: x.tipo, wiki: x.wiki }, x.valor, { fecha: this.hoy() });
        // La pestaña Ficha abierta sobre ella la vuelve a leer (revisión)
        if (r.ok && r.escrita) this.contarEscrita(r.ruta);
        if (x.ficha) this.fichas.set(x.id, x.ficha);
      }
      if (escritas.length) this.avisosCambio.push("Las fichas que ya habían cambiado han vuelto a su estado (el Log lo apunta).");
    };
    for (const p of cuales) {
      if (!conEstadoDe(p) || !tieneFicha(p.tipo)) continue;
      const antes = this.modelo.pieza(p.id) as Pieza & { wiki?: string };
      const wiki = enlace(p);
      const valor = valorEnWiki(estadoDe(p));
      const antesCambio = await this.cambioEnWiki(p.tipo, wiki, "wiki_mtime" in antes ? String(antes.wiki_mtime ?? "") : "");
      const r = await ponerEstadoFicha(this.almacen.fs, this.vault, this.modelo.serie.wiki, { tipo: p.tipo, wiki }, valor, { fecha: this.hoy() });
      if (!r.ok && entero) {
        this.avisosCambio.push(`${r.mensaje} Por eso ${entero.nada}.`);
        await devolverEscritas();
        return null;
      }
      if (r.ok && r.escrita) this.contarEscrita(r.ruta);
      if (r.ok && entero && r.escrita && conEstadoDe(antes)) escritas.push({ id: p.id, tipo: p.tipo, wiki, valor: valorEnWiki(estadoDe(antes)), ficha: this.fichas.get(p.id) });
      if (!r.ok) {
        this.avisosCambio.push(r.mensaje);
        // Si la ficha sigue ahí diciendo canon, la mesa no baja de canon: la
        // próxima revisión de fichas la volvería a subir sin avisar
        const sigueCanon = conEstadoDe(antes) && estadoDe(antes) === "canon" && (r.motivo === "cambió mientras tanto" || r.motivo === "no se pudo escribir");
        if (sigueCanon) guardar.splice(guardar.indexOf(p), 1);
        continue;
      }
      if (r.aviso) this.avisosCambio.push(r.aviso);
      // Si el autor ya la había cambiado en la wiki, la marca se queda: hay
      // texto suyo que aún no ha revisado (aunque la revisión de fichas no
      // haya pasado todavía)
      const ficha = this.fichas.get(p.id);
      const cambio = !!ficha?.cambio || antesCambio;
      const i = guardar.indexOf(p);
      if ("wiki_mtime" in p && p.wiki && !cambio) guardar[i] = { ...p, wiki_mtime: r.mtime } as Pieza;
      if (ficha) this.fichas.set(p.id, { ...ficha, existe: true, canon: valor === "canon", cambio, estadoWiki: r.escrita ? valor : r.antes });
    }
    if (entero && !entero.sigue()) {
      this.avisosCambio.push(`Algo cambió mientras tanto: ${entero.nada}. Vuelve a probar.`);
      await devolverEscritas();
      return null;
    }
    return { guardar, borrar: cambio.borrar };
  }

  /**
   * «Alternativas descartadas» (spec 009, RF-45 a RF-52): compara el descarte
   * de las escenas y los tramos de `antes` con el modelo de ahora y pone o
   * quita sus filas en la ficha de cada arco. Solo desde la lista cerrada de
   * RF-45. Lo que no se puede escribir no deshace nada: vuelve como aviso.
   */
  protected async alternativasAlCambiar(antes: ReadonlyMap<string, Pieza | undefined>, pendiente = true): Promise<string[]> {
    const avisos: string[] = [];
    const ops = new Map<string, { poner: boolean; titulo: string; porque: string; otra: boolean }[]>();
    for (const [id, a] of antes) {
      const p = this.modelo.pieza(id);
      if (!p || !this.esAlternativa(p) || descartada(a) === descartada(p)) continue;
      const poner = descartada(p);
      // La fila es la de la pieza descartada: la de ahora al descartar; al recuperar, la de justo antes
      // (deshacer devuelve también el porqué de antes del descarte)
      const fuente = poner || !a || !this.esAlternativa(a) ? p : a;
      const fila = filaAlternativa(fuente.titulo, fuente.motivo_descarte);
      for (const arco of this.arcosDeAlternativa(fuente)) {
        const otra = !poner && this.otraLaDa(arco, fila, p.id);
        const hay = ops.get(arco) ?? [];
        // Dos piezas que dan la misma fila en un solo paso: una vez (revisión)
        if (hay.some((c) => c.poner === poner && filaAlternativa(c.titulo, c.porque) === fila)) continue;
        ops.set(arco, [...hay, { poner, titulo: fuente.titulo, porque: fuente.motivo_descarte, otra }]);
      }
    }
    // Lo que hay que escribir se decide ya; se escribe en cola, detrás de lo
    // anterior, para que un Ctrl Z rápido no se cruce con la fila (revisión)
    const hecho = this.colaAlternativas.then(() => this.escribirAlternativas(ops, pendiente, avisos));
    this.colaAlternativas = hecho.catch(() => undefined);
    return hecho;
  }

  private colaAlternativas: Promise<unknown> = Promise.resolve();

  private async escribirAlternativas(
    ops: Map<string, { poner: boolean; titulo: string; porque: string; otra: boolean }[]>,
    pendiente: boolean,
    avisos: string[],
  ): Promise<string[]> {
    for (const [id, cambios] of ops) {
      const arco = this.modelo.arcos.get(id)!;
      const nombre = arco.titulo.trim() || "Sin título";
      // Solo arcos cuya ficha existe (RF-45)
      const ruta = arco.wiki.trim() ? rutaFicha(this.modelo.serie.wiki, { tipo: "arco", wiki: arco.wiki }) : null;
      if (!ruta || !(await this.almacen.fs.existe(unir(this.vault, ruta)).catch(() => false))) continue;
      if (this.estaBloqueada(id)) {
        avisos.push(`El arco «${nombre}» es canon: desbloquéalo para apuntar la alternativa.`);
        continue;
      }
      let filas: { fila: string; puesta: boolean }[] = [];
      let quedan: string[] = [];
      const r = await this.escribirFichaYa(
        id,
        async (op) => {
          // Se lee aquí, con lo pendiente de la pestaña ya guardado (RF-38)
          const leida = await leerFicha(this.almacen.fs, this.vault, this.modelo.serie.wiki, { tipo: "arco", wiki: arco.wiki });
          if (!leida) return { ok: false, motivo: "no está", mensaje: "La ficha ya no está en la wiki." };
          let texto = leida.texto;
          filas = [];
          quedan = [];
          for (const c of cambios) {
            const fila = filaAlternativa(c.titulo, c.porque);
            if (c.poner) {
              const nuevo = anadirAlternativa(texto, c.titulo, c.porque);
              if (nuevo !== null) [texto, filas] = [nuevo, [...filas, { fila, puesta: true }]];
              continue;
            }
            const q = quitarAlternativa(texto, c.titulo, c.porque, c.otra);
            if (q.quitada) [texto, filas] = [q.texto, [...filas, { fila, puesta: false }]];
            else quedan.push(`En la ficha de «${nombre}» se queda la fila ${fila}: ${c.otra ? "otra pieza descartada del arco la da también" : "no está tal cual (se editó o cambió el título o el porqué)"}.`);
          }
          return escribirFicha(this.almacen.fs, this.vault, leida, texto, op);
        },
        pendiente,
      );
      if (!r.ok) {
        avisos.push(`No se ha apuntado la alternativa en la ficha de «${nombre}»: ${r.mensaje}`);
        continue;
      }
      avisos.push(...quedan);
      // Cada fila, en el Log (RF-50)
      const nota = r.leida.ruta.replace(/^.*\//, "").replace(/\.md$/, "");
      try {
        for (const f of r.escrita ? filas : []) {
          await anotarLog(this.almacen.fs, this.vault, this.modelo.serie.wiki, this.hoy(), `Alternativa ${f.puesta ? "descartada" : "recuperada"}: [[${nota}]]`, `Fila ${f.puesta ? "añadida" : "quitada"} desde Atelier: ${codigoEnLinea(f.fila)}.`);
        }
      } catch (e) {
        avisos.push(`No se pudo apuntar en el Log la alternativa de «${nombre}» (${(e as Error).message}).`);
      }
    }
    return avisos;
  }

  /** Cómo están ahora las piezas que toca un cambio, para `alternativasAlCambiar` */
  private antesDe(cambio: Cambio): Map<string, Pieza | undefined> {
    return new Map([...cambio.guardar, ...cambio.borrar].map((p) => [p.id, this.modelo.pieza(p.id)]));
  }

  /** El cambio descarta o recupera una escena o un tramo de un arco con ficha: hay filas que poner o quitar */
  private cambiaAlternativas(cambio: Cambio): boolean {
    return cambio.guardar.some(
      (p) => this.esAlternativa(p) && descartada(p) !== descartada(this.modelo.pieza(p.id)) && this.arcosDeAlternativa(p).some((id) => !!this.modelo.arcos.get(id)?.wiki.trim()),
    );
  }

  /** Las escenas y los tramos dan alternativas */
  private esAlternativa(p: Pieza): p is Evento | Arco {
    return p.tipo === "evento" || (p.tipo === "arco" && !!p.tramo_de.trim());
  }

  /** Los arcos a cuya ficha va: los de la escena (el de serie, si es un tramo) o el de serie del tramo (RF-45) */
  private arcosDeAlternativa(p: Evento | Arco): string[] {
    const deSerie = (id: string) => {
      const a = this.modelo.arcos.get(id);
      return a?.tramo_de.trim() ? this.modelo.arcos.get(a.tramo_de)?.id : a?.id;
    };
    const ids = p.tipo === "evento" ? p.arcos.map((a) => deSerie(a.arco)) : [this.modelo.arcos.get(p.tramo_de)?.id];
    return [...new Set(ids.filter((id): id is string => !!id))];
  }

  /** Otra escena o tramo descartado del arco da la misma fila (RF-48) */
  private otraLaDa(arco: string, fila: string, excepto: string): boolean {
    return [...this.modelo.eventos.values(), ...this.modelo.arcos.values()].some(
      (p) => p.id !== excepto && this.esAlternativa(p) && descartada(p) && filaAlternativa(p.titulo, p.motivo_descarte) === fila && this.arcosDeAlternativa(p).includes(arco),
    );
  }

  /** La ficha se modificó después de la última vez que Atelier la escribió (como en `revisarFichas`) */
  private async cambioEnWiki(tipo: Parameters<typeof rutaFicha>[1]["tipo"], wiki: string, wikiMtime: string): Promise<boolean> {
    const ruta = rutaFicha(this.modelo.serie.wiki, { tipo, wiki });
    const pasada = Date.parse(wikiMtime);
    if (!ruta || !Number.isFinite(pasada)) return false;
    try {
      const fecha = await this.almacen.fs.fecha(unir(this.vault, ruta));
      return fecha !== null && fecha !== undefined && fecha > pasada + 2000;
    } catch {
      return false;
    }
  }

  /** Instantánea automática si hubo cambios desde la anterior (spec 7) */
  async copiaAutomatica(): Promise<void> {
    // Escribir guiones no sube la versión del modelo: también cuenta el último guardado de un guion
    const guionNuevo = Math.max(0, ...this.guardadoGuion.ultimo.values()) > this.horaCopiaGuion;
    if ((this.versionCopia === this.modelo.version && !guionNuevo) || this.enteroEnMarcha) return;
    try {
      await this.guardado.vaciar();
      await this.guardadoGuion.vaciar();
      this.horaCopiaGuion = Math.max(0, ...this.guardadoGuion.ultimo.values());
      await this.instantaneas.crear();
      this.versionCopia = this.modelo.version;
      this.errorCopia = null;
    } catch (e) {
      this.errorCopia = `No se pudo hacer la instantánea: ${(e as Error).message}`;
    }
    this.avisar();
  }

  static async abrir(almacen: Almacen, carpeta: string, equipo: string): Promise<Sesion> {
    const datos = await almacen.abrirSerie(carpeta);
    const aviso = new AvisoUso(almacen.fs, almacen.rutaSerie(carpeta), equipo);
    const mensaje = await aviso.comprobar();
    await aviso.abrir();
    const s = new Sesion(almacen, carpeta, datos, mensaje, aviso);
    await s.leerGuia();
    await s.variantes.cargar();
    s.vigilancia = new Vigilancia(
      almacen,
      carpeta,
      (cambios) => s.aplicarCambios(cambios),
      undefined,
      (cambios) => s.releerVariantes(cambios),
      (cambios) => s.releerPizarra(cambios),
      (cambios) => s.releerGuion(cambios),
    );
    await s.vigilancia.iniciar();
    // Una instantánea al abrir y cada 30 min si hubo cambios
    await s.copiaAutomatica();
    await s.leerWiki();
    s.temporizadorWiki = setInterval(() => void s.revisarFichas(), 60_000);
    s.temporizadorCopias = setInterval(() => void s.copiaAutomatica(), 30 * 60_000);
    return s;
  }

  get ruta(): string {
    return this.almacen.rutaSerie(this.carpeta);
  }

  alCambiar(fn: () => void): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  protected avisar() {
    for (const fn of this.oyentes) fn();
  }

  /** Vuelve a leer ya estas notas de la serie (lo que la vigilancia vería en su próximo repaso) */
  async releer(rutas: string[]): Promise<void> {
    await this.vigilancia?.releerYa(rutas);
  }

  private async aplicarCambios(cambios: Parameters<typeof recargar>[2]) {
    const antes = this.comparacion ? copiaModelo(this.modelo) : null;
    const r = await recargar(this.almacen, this.modelo, cambios);
    // Solo lo que de verdad cambió cuenta como de fuera: releer lo mismo no (spec 005, RF-22)
    if (antes && this.comparacion) {
      const distinta = (id: string) => JSON.stringify(antes.pieza(id) ?? null) !== JSON.stringify(this.modelo.pieza(id) ?? null);
      this.comparacion.anotar(r.recargadas.filter(distinta), "fuera");
      this.comprobarAbierta();
    }
    // Lo propio aún sin escribir no pisa lo que acaba de llegar de fuera (spec 002, RNF integridad)
    for (const id of r.recargadas) {
      const p = this.modelo.pieza(id);
      const nombre = p && "titulo" in p && p.titulo.trim() ? p.titulo.trim() : id;
      this.guardado.soltar(id, `«${nombre}» cambió fuera de Atelier: se queda lo de fuera; vuelve a hacer el cambio`);
    }
    const tocadas = new Set(cambios.map((c) => c.ruta));
    // Lo que se ha releído bien deja de ser un problema; lo que falla, lo es
    this.problemas = [...this.problemas.filter((p) => !tocadas.has(p.ruta)), ...r.problemas];
    for (const c of r.conflictos) if (!this.conflictos.includes(c)) this.conflictos = [...this.conflictos, c];
    this.avisar();
  }

  /** Lo que cambió en _variantes/ fuera de Atelier (spec 006) */
  private async releerVariantes(cambios: Parameters<typeof recargar>[2]) {
    const ids = await this.variantes.releer(cambios);
    for (const c of cambios) if (c.que === "conflicto" && !this.conflictos.includes(c.ruta)) this.conflictos = [...this.conflictos, c.ruta];
    if (ids.length) this.alCambiarVariantes?.(ids);
    this.avisar();
  }

  /** Lo que cambió en _pizarra/ fuera de Atelier (spec 012): un conflicto se apunta; la interfaz decide qué releer */
  private releerPizarra(cambios: CambioExterno[]) {
    for (const c of cambios) if (c.que === "conflicto" && !this.conflictos.includes(c.ruta)) this.conflictos = [...this.conflictos, c.ruta];
    this.alCambiarPizarra?.(cambios);
    this.avisar();
  }

  /** Lo que cambió en _guion/ fuera de Atelier (spec 013): un conflicto se apunta; la interfaz decide qué releer */
  private releerGuion(cambios: CambioExterno[]) {
    for (const c of cambios) if (c.que === "conflicto" && !this.conflictos.includes(c.ruta)) this.conflictos = [...this.conflictos, c.ruta];
    this.alCambiarGuion?.(cambios);
    this.avisar();
  }

  get rutaGuia(): string {
    return unir(this.almacen.raiz, "guia.md");
  }

  /** Lee (o vuelve a leer) appDatos/guia.md */
  async leerGuia(): Promise<void> {
    const fs = this.almacen.fs;
    try {
      this.guia = (await fs.existe(this.rutaGuia)) ? leerGuia(await fs.leer(this.rutaGuia)) : null;
    } catch (e) {
      this.guia = { reglas: [], magia: false, avisos: [`No se puede leer guia.md: ${(e as Error).message}`] };
    }
    this.avisar();
  }

  /** Crea appDatos/guia.md con el primer juego de reglas, si no existe */
  async crearGuia(): Promise<void> {
    const fs = this.almacen.fs;
    if (!(await fs.existe(this.rutaGuia))) await fs.escribir(this.rutaGuia, GUIA_INICIAL);
    await this.leerGuia();
  }

  /**
   * Empieza «Si lo dejas así…» con la pieza abierta (spec 005, RF-23 a RF-25).
   * Si se acaba de crear y nada más ha cambiado, compara desde antes de crearla.
   */
  empezarComparacion(piezaId: string | null): void {
    const creada = this.ultimaCreacion;
    this.ultimaCreacion = null;
    if (!piezaId || !this.modelo.pieza(piezaId)) {
      this.comparacion = null;
      return;
    }
    if (creada && creada.ids.includes(piezaId) && creada.version === this.modelo.version) {
      const base = antesDelPaso(this.modelo, creada.piezas);
      this.comparacion = new Comparacion(piezaId, base, creada.avisos ?? comprobar(base).avisos);
      this.comparacion.anotar(
        creada.piezas.map((p) => p.id),
        "autor",
      );
      return;
    }
    this.comparacion = new Comparacion(piezaId, copiaModelo(this.modelo), this.resultado().avisos);
  }

  /** Si la pieza abierta ya no existe, la comparación acaba (RF-26) */
  private comprobarAbierta(): void {
    if (this.comparacion && !this.modelo.pieza(this.comparacion.piezaId)) this.comparacion = null;
  }

  /** Avisos de las comprobaciones; se recalculan solo si algo cambió */
  private memoEfectos: { version: number; comp: Comparacion; bloqueos: number; guia: Guia | null; e: Efectos } | null = null;

  /** Lo que enseña «Si lo dejas así…», una vez por versión del modelo (spec 005); null sin comparación */
  efectos(): Efectos | null {
    const comp = this.comparacion;
    if (!comp) return null;
    const x = this.memoEfectos;
    const bloqueos = this.desbloqueadas.size;
    // La guía releída cambia las reglas bajo cada aviso y «Ir al campo»
    if (x && x.version === this.modelo.version && x.comp === comp && x.bloqueos === bloqueos && x.guia === this.guia) return x.e;
    const e = efectos(comp, this.modelo, this.resultado(), this.guia, (id) => this.estaBloqueada(id));
    this.memoEfectos = { version: this.modelo.version, comp, bloqueos, guia: this.guia, e };
    return e;
  }

  resultado(): Resultado {
    if (!this.memo || this.memo.version !== this.modelo.version) {
      this.memo = { version: this.modelo.version, r: comprobar(this.modelo) };
    }
    return this.memo.r;
  }

  /**
   * "Lo sé": silencia ese aviso en esa pieza, o lo vuelve a activar con todas
   * sus variantes (C01, C01a, C01b…). Es un paso de deshacer propio, sin juntarse
   * con lo escrito justo antes (spec 004, RF-18).
   */
  loSe(a: Aviso, silenciar: boolean): void {
    const id = idBase(a.id);
    const cambio = editar(this.modelo, a.pieza, (p) => {
      if (!("avisos_silenciados" in p)) return;
      p.avisos_silenciados = p.avisos_silenciados.filter((x) => idBase(x) !== id);
      if (silenciar) p.avisos_silenciados.push(id);
    });
    void this.aplicar(cambio, true);
  }

  /** Si el cambio toca canon bloqueado, lo dice y da true: no se aplica */
  private rechazarBloqueo(cambio: Cambio): boolean {
    const bloqueo = this.bloqueadaQueToca(cambio);
    if (!bloqueo) return false;
    // Si la que impide el cambio es otra (un evento canon de un arco que se borra), se dice cuál
    const bloqueada = bloqueo.id;
    const p = this.modelo.pieza(bloqueada);
    const otra = cambio.mueve !== bloqueada && !(cambio.guardar.length + cambio.borrar.length === 1 && [...cambio.guardar, ...cambio.borrar][0].id === bloqueada);
    this.avisosCambio.push(bloqueo.aviso ?? (otra && p && "titulo" in p ? `«${p.titulo.trim() || "Sin título"}» está en canon y este cambio la toca: desbloquéala antes (sería un retcon).` : AVISO_BLOQUEADA));
    this.avisar();
    return true;
  }

  /**
   * Aplica un cambio: lo pone en el modelo, guarda solo (medio segundo después)
   * lo editado y manda a la papelera lo borrado.
   */
  async aplicar(cambio: Cambio, registrar = true, clave?: string, opciones: OpcionesAplicar = {}): Promise<boolean> {
    // Lo del autor, no con la edición bloqueada (spec 006, RF-15); lo de fuera y Ctrl I, sí
    if ((opciones.origen ?? "autor") === "autor" && !opciones.enLectura && this.rechazarEdicion()) return false;
    // Sin esperas si no hay fichas que tocar: el modelo cambia al momento (al escribir)
    this.avisosCambio = [];
    // Lo que el autor cambia deja de escribir su valor a mano (deshacer, no: lo devuelve)
    if (registrar && !opciones.exacto) cambio = { ...cambio, guardar: cambio.guardar.map((p) => olvidarCrudos(this.modelo.pieza(p.id), p)) };
    if (this.rechazarBloqueo(cambio)) return false;
    // Lo pendiente de la pestaña Ficha, antes de que la app escriba el estado en una ficha (spec 009, RF-38)
    if (this.fichaPendiente && this.fichasACambiar(cambio).length) await this.fichaPendiente();
    // Crear con la nota de la serie o de la temporada cambiada fuera: no se crea nada (spec 002, RNF integridad).
    // Mover escenas, igual: o se escriben todas las renumeradas o ninguna (spec 003)
    const existentes = cambio.guardar.filter((p) => this.modelo.pieza(p.id));
    const entero = !!opciones.entero;
    const crea = !entero && registrar && existentes.length < cambio.guardar.length;
    const mueve = !entero && !!cambio.mueve && existentes.length >= 2;
    // Entero (spec 005): lo que se guarda y lo que se borra, todo como cuando se
    // calculó el cambio, y nada canon bloqueado mientras tanto
    const vistas = new Map([...cambio.guardar, ...cambio.borrar].map((p) => [p.id, this.modelo.pieza(p.id)]));
    const sigueIgual = () => [...vistas].every(([id, p]) => this.modelo.pieza(id) === p) && !this.bloqueadaQueToca(cambio);
    // Volver lo registra; su Ctrl Z / Ctrl Y, no
    const nada = registrar ? "no se ha devuelto nada" : "no se ha cambiado nada";
    if (entero) {
      await this.guardado.vaciar();
      const tocadas = [...existentes, ...cambio.borrar.filter((p) => this.modelo.pieza(p.id))];
      const fuera = tocadas.length ? await this.almacen.cambiadasFuera(this.carpeta, tocadas) : [];
      // Lo que vuelve a existir no puede pisar una nota que ya esté en su sitio (la sacó el autor a mano)
      for (const p of cambio.guardar) {
        if (this.modelo.pieza(p.id)) continue;
        const ruta = this.almacen.rutaPieza(this.carpeta, p);
        if (await this.almacen.fs.existe(ruta).catch(() => false)) fuera.push(ruta);
      }
      if (fuera.length) {
        const nombre = fuera[0].slice(fuera[0].lastIndexOf("/") + 1);
        this.avisosCambio.push(`«${nombre}» cambió fuera de Atelier: ${nada}; se queda lo de fuera.`);
        this.avisar();
        void this.releer(fuera);
        return false;
      }
      // Cambió mientras se comprobaba el disco. Si lo releyó la vigilancia, ya está
      // en el modelo; si fue en Atelier, no es de fuera: en ningún caso se relee nada
      if (!sigueIgual()) {
        const releida = [...vistas.keys()].find((id) => this.modelo.pieza(id) !== vistas.get(id) && this.comparacion?.deFuera.has(id));
        const p = releida ? this.modelo.pieza(releida) : undefined;
        if (releida) this.avisosCambio.push(`«${(p && "titulo" in p && p.titulo.trim()) || releida}» cambió fuera de Atelier: ${nada}; se queda lo de fuera.`);
        else if (!this.rechazarBloqueo(cambio)) this.avisosCambio.push(`Algo cambió mientras tanto: ${nada}. Vuelve a probar.`);
        this.avisar();
        return false;
      }
    }
    if (crea || mueve) {
      const vistas = existentes.map((p) => this.modelo.pieza(p.id));
      // Lo propio que se está escribiendo no se toma por un cambio de fuera
      await this.guardado.vaciar();
      let fuera = existentes.length ? await this.almacen.cambiadasFuera(this.carpeta, existentes) : [];
      // Releída mientras tanto (la vigilancia): el movimiento se calculó sobre la vieja
      if (!fuera.length) fuera = existentes.filter((p, i) => this.modelo.pieza(p.id) !== vistas[i]).map((p) => this.almacen.rutaPieza(this.carpeta, p));
      if (fuera.length) {
        const nombre = fuera[0].slice(fuera[0].lastIndexOf("/") + 1);
        this.avisosCambio.push(`«${nombre}» cambió fuera de Atelier: no se ha ${crea ? "creado" : "movido"} nada; se queda lo de fuera.`);
        this.avisar();
        void this.releer(fuera);
        return false;
      }
    }
    const fichas = this.fichasACambiar(cambio);
    if (fichas.length && entero) {
      // Entero: si alguna ficha no se puede poner al día, o algo cambia mientras, no se aplica nada
      const conFichas = await this.sincronizarFichas(cambio, fichas, { sigue: sigueIgual, nada });
      if (!conFichas) {
        this.avisar();
        return false;
      }
      cambio = conFichas;
    } else if (fichas.length) {
      const base = new Map(cambio.guardar.map((p) => [p.id, clonar(this.modelo.pieza(p.id))]));
      cambio = (await this.sincronizarFichas(cambio, fichas))!;
      // Lo que se editó mientras se escribía la ficha no se pisa: se junta
      const guardar = cambio.guardar.map((p) => juntar(base.get(p.id) ?? null, p, this.modelo.pieza(p.id)));
      cambio = { ...cambio, guardar: guardar.filter((p): p is Pieza => p !== null) };
    }
    if (this.avisosCambio.length) this.avisar();
    this.ponerCambio(cambio, registrar, clave, { origen: opciones.origen, entero });
    // Un movimiento (o un cambio entero) se escribe ya: deja menos tiempo para que algo cambie fuera a medias
    if (mueve || entero) await this.guardado.vaciar();
    const borradasBien: string[] = [];
    for (const p of cambio.borrar) {
      try {
        await this.almacen.borrar(this.carpeta, p);
        borradasBien.push(p.id);
      } catch (e) {
        this.errorBorrar = `No se pudo mandar a la papelera ${p.id}: ${(e as Error).message}`;
        this.avisar();
      }
    }
    // El guion viaja con su escena (spec 013, RF-34): después de que la pieza haya salido bien
    await this.moverGuiones(
      borradasBien,
      cambio.guardar.filter((p) => !existentes.includes(p)).map((p) => p.id),
    );
    return true;
  }

  /**
   * Los guiones siguen a sus escenas (spec 013, RF-34): los de las escenas que se
   * borran van a la papelera y los de las que vuelven (deshacer un borrado,
   * rehacer una creación) vuelven de ella. Solo la sesión principal; una variante
   * no pasa por aquí. Si moverlo falla, el cambio se mantiene y se avisa.
   */
  protected async moverGuiones(borradas: string[], devueltas: string[]): Promise<void> {
    const fallos: string[] = [];
    for (const id of borradas.filter(esIdEscena)) {
      try {
        // Lo pendiente se escribe antes de moverlo: no se pierde ni se recrea después
        await this.guardadoGuion.vaciar(id);
        // Lo que el autor tenía en pantalla y no llegó al disco queda aparte antes de soltarlo
        await this.guardadoGuion.salvarLocales(id);
        await this.guion.moverAPapelera(id);
        this.guardadoGuion.descartar(id);
      } catch (e) {
        fallos.push(`${id} (${(e as Error).message})`);
      }
    }
    for (const id of devueltas.filter(esIdEscena)) {
      try {
        await this.guion.devolverDePapelera(id);
      } catch (e) {
        fallos.push(`${id} (${(e as Error).message})`);
      }
    }
    if (fallos.length) {
      this.avisosCambio.push(`El cambio está hecho, pero no se pudo mover el guion de ${fallos.join(", ")}: se queda en _guion/ y se avisa como guion sin escena.`);
      this.avisar();
    }
    if (borradas.length || devueltas.length) this.alMoverGuiones?.([...borradas, ...devueltas].filter(esIdEscena));
  }

  /**
   * Pone un cambio ya decidido: el paso de deshacer, el modelo, lo que hay que
   * guardar y «Si lo dejas así…». Es lo común a la serie y a una variante
   * (spec 006), que solo cambian dónde se guarda (`persistir`).
   */
  protected ponerCambio(
    cambio: Cambio,
    registrar: boolean,
    clave: string | undefined,
    opciones: { origen?: Origen; entero?: boolean; meta?: MetaPaso; variante?: { id: string; cambiada: string }; yaEscrito?: boolean },
  ): void {
    const entero = !!opciones.entero;
    // Avisos de antes del cambio, si ya estaban calculados (punto de partida al crear)
    const avisosAntes = this.memo?.version === this.modelo.version ? this.memo.r.avisos : null;
    let creadas: string[] = [];
    if (registrar) {
      const piezas: Cambiada[] = [
        ...cambio.guardar.map((p) => ({ id: p.id, antes: clonar(this.modelo.pieza(p.id)), despues: structuredClone(p) })),
        ...cambio.borrar.map((p) => ({ id: p.id, antes: structuredClone(p), despues: null })),
      ];
      this.historial.hacer(piezas, clave, cambio.mueve, entero, opciones.meta, opciones.variante);
      creadas = piezas.filter((p) => !p.antes).map((p) => p.id);
    }
    for (const p of cambio.borrar) this.modelo.quitar(p.id);
    for (const p of cambio.guardar) this.modelo.poner(p);
    // Lo que ya está en disco (aplicar una variante, spec 006) no se vuelve a pedir
    if (!opciones.yaEscrito) this.persistir(cambio);
    // «Si lo dejas así…»: quién ha cambiado qué, y la última creación (spec 005)
    this.comparacion?.anotar(
      [...cambio.guardar, ...cambio.borrar].map((p) => p.id),
      opciones.origen ?? "autor",
    );
    this.comprobarAbierta();
    const paso = creadas.length ? this.historial.ultimoPaso() : null;
    this.ultimaCreacion = paso && !entero ? { ids: creadas, version: this.modelo.version, piezas: paso, avisos: avisosAntes } : null;
  }

  /** Dónde se guarda lo que `ponerCambio` acaba de poner: en la serie, sus notas (la papelera va aparte, en `aplicar`) */
  protected persistir(cambio: Cambio): void {
    for (const p of cambio.borrar) this.guardado.olvidar(p.id);
    for (const p of cambio.guardar) this.guardado.pedir(p);
  }

  /** Lo que enseña el pie del panel: el guardado de la serie (o el de la variante, spec 006) */
  get guardadoVisible(): GuardadoVisible {
    return this.guardado;
  }

  // --- Aplicar una variante «¿Y si…?» (spec 006, RF-32 a RF-40) ---

  /** Las piezas canon bloqueado de la serie que el cambio toca (RF-34): renumerar no cuenta */
  private canonQueToca(cambio: Cambio): string[] {
    const ids = new Set<string>();
    for (const p of cambio.guardar) {
      const b = this.bloqueadaQueToca({ guardar: [p], borrar: [] });
      if (b) ids.add(b.id);
    }
    for (const p of cambio.borrar) {
      const b = this.bloqueadaQueToca({ guardar: [], borrar: [p] });
      if (b) ids.add(b.id);
    }
    return [...ids];
  }

  /** Lo que la wiki impide (RF-34b): una ficha nueva con nombre repetido, una ficha enlazada que no está */
  private async wikiImpide(plan: PlanAplicar, quedaria: Modelo): Promise<string[]> {
    const avisos: string[] = [];
    for (const f of plan.crearFichas) {
      try {
        const r = await comprobarPasar(this.almacen.fs, this.vault, quedaria, f.id, { nombre: f.nombre });
        if (r.estado === "nombre repetido") avisos.push(`Ya hay otra nota llamada «${r.nombre}» en el vault: elige otro nombre al pasarla a la wiki en la variante.`);
      } catch (e) {
        avisos.push((e as Error).message);
      }
    }
    for (const p of this.fichasACambiar(plan.cambio)) {
      const enlace = ((p as { wiki?: string }).wiki ?? "").trim() || (((this.modelo.pieza(p.id) as { wiki?: string } | undefined)?.wiki ?? "").trim());
      const ruta = rutaFicha(this.modelo.serie.wiki, { tipo: p.tipo as Parameters<typeof rutaFicha>[1]["tipo"], wiki: enlace });
      const esta = !!ruta && (await this.almacen.fs.existe(unir(this.vault, ruta)).catch(() => false));
      if (!esta) avisos.push(`La ficha «${nombreFicha(enlace)}» no está en la wiki de la serie.`);
    }
    return avisos;
  }

  /** Los choques leyendo el disco (lo que la vigilancia aún no vio) y los de sitio y referencia (RF-33) */
  private async choquesAhora(v: DatosVariante, quedaria: Modelo): Promise<Choque[]> {
    const enDisco = await choquesEnDisco(v, async (tipo, id) => {
      const ruta = this.almacen.rutaPieza(this.carpeta, { tipo, id });
      return (await this.almacen.fs.existe(ruta)) ? this.almacen.fs.leer(ruta) : null;
    });
    return [...enDisco, ...choques(v, this.modelo, quedaria).filter((c) => c.clase !== "pieza")];
  }

  /**
   * Aplica una variante a la serie, entera o nada, en un solo paso de deshacer
   * (RF-32 a RF-40). Antes de escribir comprueba choques, canon y wiki, y hace
   * una instantánea. Mientras dura, el autor no puede cambiar nada.
   */
  async aplicarVariante(v: DatosVariante, quedaria: Modelo, opciones: { desbloquear?: boolean } = {}): Promise<ResultadoAplicar> {
    if (this.enteroEnMarcha) return { hecho: false, motivo: "ocupado", avisos: ["Se está aplicando otra cosa: espera un momento."] };
    // Solo una aparcada (la de disco: una aplicada o descartada no se aplica otra vez)
    const enLista = this.variantes.lista.get(v.id);
    if (v.estado !== "aparcada" || (enLista && enLista.estado !== "aparcada")) return { hecho: false, motivo: "estado", avisos: ["Solo se aplican las variantes aparcadas."] };
    this.enteroEnMarcha = true;
    const bloqueoAntes = this.edicionBloqueada;
    this.edicionBloqueada = `Aplicando «${v.nombre}»…`;
    this.avisar();
    try {
      await this.guardado.vaciar();
      let ch = await this.choquesAhora(v, quedaria);
      if (ch.length) return { hecho: false, motivo: "choques", avisos: ["La serie cambió después algo que la variante también toca."], choques: ch };
      const plan = planAplicar(v, this.modelo);
      const canon = this.canonQueToca(plan.cambio);
      if (canon.length && !opciones.desbloquear) {
        const nombres = canon.map((id) => {
          const p = this.modelo.pieza(id);
          return `«${(p && "titulo" in p && p.titulo.trim()) || id}»`;
        });
        return { hecho: false, motivo: "canon", avisos: [`Cambia ${canon.length === 1 ? "una pieza canon bloqueada" : `${canon.length} piezas canon bloqueadas`}: ${nombres.join(", ")}.`], canon };
      }
      const impide = await this.wikiImpide(plan, quedaria);
      if (impide.length) return { hecho: false, motivo: "wiki", avisos: impide };
      try {
        await this.instantaneas.crear();
      } catch (e) {
        return { hecho: false, motivo: "instantanea", avisos: [`No se pudo hacer la instantánea de antes: no se aplica nada. (${(e as Error).message})`] };
      }
      // Lo que cambió mientras se hacía la instantánea también cuenta
      ch = await this.choquesAhora(v, quedaria);
      if (ch.length) return { hecho: false, motivo: "choques", avisos: ["Algo cambió mientras tanto: no se ha aplicado nada."], choques: ch };
      let escrito: Awaited<ReturnType<Almacen["escribirTodo"]>>;
      try {
        escrito = await this.almacen.escribirTodo(this.carpeta, plan.cambio.guardar, plan.cambio.borrar);
      } catch (e) {
        const aviso =
          e instanceof ErrorVueltaAtras
            ? `${e.message} La instantánea de antes de aplicar lo recupera.`
            : e instanceof CambioFuera
              ? `${e.message.replace(": se queda lo de fuera; vuelve a hacer el cambio", "")}: no se ha aplicado nada.`
              : `No se pudo aplicar (${(e as Error).message}): no se ha cambiado nada.`;
        return { hecho: false, motivo: "disco", avisos: [aviso] };
      }
      // El canon se desbloquea solo con las notas ya escritas; si la wiki falla, vuelve a bloquearse
      for (const id of canon) this.desbloqueadas.add(id);
      // Con las notas escritas, la wiki (RF-37b): primero las fichas nuevas, luego el estado de las enlazadas
      const wiki = await this.wikiAlAplicar(plan, quedaria);
      if (!wiki.ok) {
        for (const id of canon) this.desbloqueadas.delete(id);
        try {
          await escrito.deshacer();
        } catch (e) {
          return { hecho: false, motivo: "wiki", avisos: [...wiki.avisos, `${(e as Error).message} La instantánea de antes de aplicar lo recupera.`] };
        }
        return { hecho: false, motivo: "wiki", avisos: [...wiki.avisos, "Las notas de la serie han vuelto a como estaban: no se ha aplicado nada."] };
      }
      // Ya en disco: al modelo y al deshacer, en un solo paso (entero, exacto, con la marca de la variante)
      const antes = this.antesDe(wiki.cambio);
      this.ponerCambio(wiki.cambio, true, `variante ${v.id}`, { entero: true, yaEscrito: true, variante: { id: v.id, cambiada: v.cambiada } });
      // Las escenas que la variante borra se llevan su guion (spec 013, RF-34)
      await this.moverGuiones(plan.cambio.borrar.map((p) => p.id), []);
      if (plan.crearFichas.length) await this.leerWiki();
      // Las alternativas, después de las notas y del estado de las fichas: una fila que falla no deshace nada (RF-51)
      wiki.avisos.push(...(await this.alternativasAlCambiar(antes, false)));
      // La variante queda aplicada, con su fecha; con ella siguen las bases de lo que cambió (RF-39)
      await this.marcarVariante(v.id, v.nombre, () => ({ estado: "aplicada", aplicada: fechaVariante(new Date()) }));
      return wiki.avisos.length ? { hecho: true, piezas: v.piezas.size, avisos: wiki.avisos } : { hecho: true, piezas: v.piezas.size };
    } finally {
      this.edicionBloqueada = bloqueoAntes;
      this.enteroEnMarcha = false;
      this.avisar();
    }
  }

  /**
   * La wiki al aplicar (RF-37b), con las notas ya escritas: crea las fichas de lo
   * que pasa a borrador o a canon sin ficha (con su Log), vuelve a escribir esas
   * notas con el enlace y pone al día el estado de las fichas enlazadas. Si algo
   * falla, los estados de las fichas vuelven y se dice lo que queda en la wiki.
   */
  private async wikiAlAplicar(plan: PlanAplicar, quedaria: Modelo): Promise<{ ok: true; cambio: Cambio; avisos: string[] } | { ok: false; avisos: string[] }> {
    const guardar = [...plan.cambio.guardar];
    const creadas: string[] = [];
    const quedan = () => (creadas.length ? [`La ficha ${creadas.map((n) => `«${n}»`).join(", ")} se queda en la wiki (Atelier nunca borra notas) y el Log no se deshace.`] : []);
    let segunda: Awaited<ReturnType<Almacen["escribirTodo"]>> | null = null;
    try {
      for (const f of plan.crearFichas) {
        const r = await pasarAWiki(this.almacen.fs, this.vault, quedaria, f.id, { fecha: this.hoy(), carpetaSerie: this.carpetaEnVault, nombre: f.nombre });
        if (!r.pieza) return { ok: false, avisos: [`No se pudo crear la ficha «${r.nombre}» (${r.estado}).`, ...quedan()] };
        if (r.estado === "creada") creadas.push(r.nombre);
        const i = guardar.findIndex((p) => p.id === f.id);
        const enlazada = r.pieza as Pieza & { wiki: string; wiki_mtime: string };
        guardar[i] = { ...guardar[i], wiki: enlazada.wiki, wiki_mtime: enlazada.wiki_mtime } as Pieza;
      }
      // Las que ahora llevan el enlace a su ficha se vuelven a escribir, en el mismo paso
      const conEnlace = guardar.filter((p, i) => p !== plan.cambio.guardar[i]);
      if (conEnlace.length) segunda = await this.almacen.escribirTodo(this.carpeta, conEnlace, []);
    } catch (e) {
      return { ok: false, avisos: [(e as Error).message, ...quedan()] };
    }
    const cambio: Cambio = { guardar, borrar: plan.cambio.borrar };
    const fichas = this.fichasACambiar(cambio);
    if (fichas.length) {
      const antesDeFichas = this.avisosCambio.length;
      const conFichas = await this.sincronizarFichas(cambio, fichas, { sigue: () => true, nada: "no se ha aplicado nada" });
      const avisos = this.avisosCambio.slice(antesDeFichas);
      if (!conFichas) {
        await segunda?.deshacer().catch(() => undefined);
        return { ok: false, avisos: [...avisos, ...quedan()] };
      }
      // La fecha de la ficha que acaba de escribir Atelier va en la nota (wiki_mtime)
      const cambiadas = conFichas.guardar.filter((p, i) => p !== cambio.guardar[i]);
      if (cambiadas.length) {
        try {
          await this.almacen.escribirTodo(this.carpeta, cambiadas, []);
        } catch {
          // Sin la fecha nueva, la próxima revisión de fichas avisará de un desfase: no impide aplicar
        }
      }
      return { ok: true, cambio: conFichas, avisos };
    }
    return { ok: true, cambio, avisos: [] };
  }

  /** Copia la pieza, le aplica `fn` y la guarda */
  editar<T extends Pieza>(id: string, fn: (p: T) => void): void {
    void this.aplicar(editar(this.modelo, id, fn as (p: Pieza) => void), true, `editar ${id}`);
  }

  /**
   * Un cambio entero en marcha («Volver a como estaba», o su Ctrl Z / Ctrl Y):
   * mientras tanto no se lanza otro, ni se deshace ni se rehace nada (spec 005, RF-20)
   */
  private enteroEnMarcha = false;

  get volviendo(): boolean {
    return this.enteroEnMarcha;
  }

  // Un paso que no se puede aplicar (toca canon bloqueado) vuelve a su sitio
  async deshacer(): Promise<void> {
    if (this.enteroEnMarcha || this.rechazarEdicion()) return;
    await this.estadoEnCurso;
    if (this.enteroEnMarcha) return;
    const cambio = this.historial.deshacer();
    if (!cambio) return;
    const variante = this.historial.ultimaVariante;
    if (!(await this.volverEnMarcha(cambio))) this.historial.rehacer();
    else if (variante) await this.volverVariante(variante, true);
  }

  async rehacer(): Promise<void> {
    if (this.enteroEnMarcha || this.rechazarEdicion()) return;
    await this.estadoEnCurso;
    if (this.enteroEnMarcha) return;
    const cambio = this.historial.rehacer();
    if (!cambio) return;
    const variante = this.historial.ultimaVariante;
    if (!(await this.volverEnMarcha(cambio))) this.historial.deshacer();
    else if (variante) await this.volverVariante(variante, false);
  }

  /** La interfaz se entera de que una variante cambió de estado al deshacer o rehacer su «Aplicar» */
  alVolverVariante: ((paso: { id: string; cambiada: string }, deshecho: boolean) => void) | null = null;
  /** Si no se pudo escribir el estado de una variante, cuándo se vuelve a intentar */
  reintentoMarcaMs = 3000;
  private reintentosMarca = new Set<ReturnType<typeof setTimeout>>();

  /**
   * Deshacer un «Aplicar» deja la variante aparcada; rehacerlo, aplicada, salvo
   * que la variante haya cambiado desde entonces: se queda aparcada y se dice (RF-38).
   */
  private async volverVariante(paso: { id: string; cambiada: string }, deshecho: boolean): Promise<void> {
    let cambiada: string | null = null;
    const c = await this.marcarVariante(paso.id, this.variantes.lista.get(paso.id)?.nombre ?? paso.id, (x) => {
      if (deshecho) return x.estado === "aplicada" ? { estado: "aparcada", aplicada: "" } : null;
      // Una descartada después de deshacer se queda descartada
      if (x.estado === "descartada") return null;
      if (x.cambiada !== paso.cambiada) {
        cambiada = x.nombre;
        return x.estado === "aplicada" ? { estado: "aparcada", aplicada: "" } : null;
      }
      return { estado: "aplicada", aplicada: fechaVariante(new Date()) };
    });
    if (cambiada !== null) {
      this.avisosCambio.push(`La variante «${cambiada}» ha cambiado desde que se aplicó: queda aparcada.`);
      this.avisar();
    }
    if (c) this.alVolverVariante?.(paso, deshecho);
  }

  /** Apunta en la nota de la variante su estado; si no se puede, lo dice y lo reintenta solo */
  private async marcarVariante(id: string, nombre: string, marca: (c: CabeceraVariante) => MarcaVariante | null): Promise<CabeceraVariante | null> {
    try {
      return await this.variantes.marcar(id, marca);
    } catch (e) {
      this.avisosCambio.push(`No se pudo apuntar el estado de la variante «${nombre}» (${(e as Error).message}). Se reintenta solo.`);
      this.avisar();
      const t = setTimeout(() => {
        this.reintentosMarca.delete(t);
        void this.marcarVariante(id, nombre, marca);
      }, this.reintentoMarcaMs);
      this.reintentosMarca.add(t);
      return null;
    }
  }

  /** «Descartar variante» (RF-41): una aparcada pasa a descartada con su fecha y su porqué; no se borra nada */
  descartarVariante(id: string, porque: string): Promise<CabeceraVariante> {
    return this.variantes.marcar(id, (c) =>
      c.estado === "aparcada" ? { estado: "descartada", descartada: fechaVariante(new Date()), porque: limpiarPorque(porque).texto } : null,
    );
  }

  /** «Recuperar» (RF-43): una descartada vuelve a aparcadas con sus cambios (y sus choques, si los hay) */
  recuperarVariante(id: string): Promise<CabeceraVariante> {
    return this.variantes.marcar(id, (c) => (c.estado === "descartada" ? { estado: "aparcada", descartada: "", porque: "" } : null));
  }

  /** Aplica un paso; si es entero, con el cerrojo cogido */
  private async volverEnMarcha(cambio: Cambio): Promise<boolean> {
    if (!this.historial.entero) return this.volver(cambio);
    this.enteroEnMarcha = true;
    try {
      return await this.volver(cambio);
    } finally {
      this.enteroEnMarcha = false;
    }
  }

  /**
   * Deshace la creación de una pieza (Deshacer de la idea, spec 002 RF-43): si
   * es lo último que se hizo, como Ctrl Z; si no, solo ella va a la papelera.
   */
  async deshacerCreacion(id: string): Promise<void> {
    if (!this.modelo.pieza(id)) return;
    // Con la edición bloqueada (spec 006, RF-8b): la idea de Ctrl I vuelve a la papelera igual
    if (this.edicionBloqueada) {
      await this.aplicar(borrarPieza(this.modelo, id), true, undefined, { enLectura: true });
      return;
    }
    if (this.historial.ultimoCrea(id)) await this.deshacer();
    else await this.aplicar(borrarPieza(this.modelo, id));
  }

  /**
   * Deshacer no toca la wiki más allá del estado de la ficha y de las
   * alternativas descartadas: se dice (caso límite de la spec 001, spec 009 RF-49)
   */
  protected avisosAlVolver(cambio: Cambio): string[] {
    const enlace = (p: Pieza | undefined) => (p && tieneFicha(p.tipo) ? (p as { wiki: string }).wiki.trim() : "");
    const sinEnlace = cambio.guardar.filter((p) => tieneFicha(p.tipo) && !enlace(p) && !!enlace(this.modelo.pieza(p.id)));
    const alternativas = this.cambiaAlternativas(cambio) ? "Las alternativas descartadas de los arcos vuelven a como estaban" : "";
    if (sinEnlace.length) {
      const nombres = sinEnlace.map((p) => `«${nombreFicha(enlace(this.modelo.pieza(p.id)))}»`).join(", ");
      return [`La ficha ${nombres} se queda en la wiki (Atelier nunca borra notas) y el Log no se deshace.`, ...(alternativas ? [`${alternativas}.`] : [])];
    }
    if (this.fichasACambiar(cambio).length) return [`La ficha vuelve a su estado${alternativas ? " y las alternativas descartadas de los arcos, a como estaban" : ""}, pero el Log no se deshace.`];
    return alternativas ? [`${alternativas}, pero el Log no se deshace.`] : [];
  }

  /** Aplica un paso de deshacer o rehacer; lo que vuelve a existir deja su copia en la papelera (spec 007) */
  private async volver(cambio: Cambio): Promise<boolean> {
    // Lo que cambió después (fuera de Atelier, desde la wiki) no se restaura: se pisaría (spec 002)
    const esperado = this.historial.esperado;
    const sigue = (id: string) => {
      if (!esperado.has(id)) return true;
      const ahora = this.modelo.pieza(id);
      const antes = esperado.get(id) ?? null;
      return ahora && antes ? firmaSinFecha(ahora) === firmaSinFecha(antes) : !ahora && !antes;
    };
    cambio = { ...cambio, guardar: cambio.guardar.map((p) => conFechaDeAhora(this.modelo.pieza(p.id), p)) };
    const saltadas = [...cambio.guardar, ...cambio.borrar].filter((p) => !sigue(p.id));
    // «Volver a como estaba» se deshace y se rehace entero o nada: el paso se queda en su pila (spec 005, RF-20)
    if (this.historial.entero) {
      if (saltadas.length) {
        // Con el nombre que tiene ahora, el que ve el autor
        const nombres = saltadas
          .map((p) => this.modelo.pieza(p.id) ?? p)
          .map((p) => `«${("titulo" in p && p.titulo.trim()) || p.id}»`)
          .join(", ");
        this.avisosCambio = [`${nombres} cambió después fuera de Atelier: no se ha cambiado nada.`];
        this.avisar();
        return false;
      }
      return this.aplicarPaso(cambio, true);
    }
    if (saltadas.length) {
      cambio = { ...cambio, guardar: cambio.guardar.filter((p) => sigue(p.id)), borrar: cambio.borrar.filter((p) => sigue(p.id)) };
      const nombres = saltadas.map((p) => `«${("titulo" in p && p.titulo.trim()) || p.id}»`).join(", ");
      const aviso = `${nombres} cambió después fuera de Atelier: esa parte no se deshace.`;
      if (!cambio.guardar.length && !cambio.borrar.length) {
        this.avisosCambio = [aviso];
        this.avisar();
        return true;
      }
      const hecho = await this.aplicarPaso(cambio);
      if (hecho) this.avisosCambio.push(aviso);
      return hecho;
    }
    return this.aplicarPaso(cambio);
  }

  private async aplicarPaso(cambio: Cambio, entero = false): Promise<boolean> {
    const avisos = this.avisosAlVolver(cambio);
    const antes = this.antesDe(cambio);
    if (!(await this.aplicar(cambio, false, undefined, { entero }))) return false;
    // La ficha del arco sigue al descarte, como sigue al estado (RF-49)
    this.avisosCambio.push(...avisos, ...(await this.alternativasAlCambiar(antes)));
    this.avisar();
    return true;
  }

  /**
   * «Volver a como estaba» (spec 005, RF-18 a RF-21): deja la abierta, y lo que
   * cambió con ella, exactamente como en el punto de partida, en un solo paso.
   * Entero o nada. Devuelve cuántas piezas ha devuelto y si la abierta era
   * nueva (ha vuelto a la papelera), o null si no ha devuelto nada.
   */
  async volverAComoEstaba(): Promise<{ devueltas: number; eraNueva: boolean; titulo: string } | null> {
    // Pulsado otra vez mientras trabaja (doble clic, Intro dos veces): no hace nada
    if (this.enteroEnMarcha || this.rechazarEdicion()) return null;
    this.enteroEnMarcha = true;
    try {
      return await this.volverYa();
    } finally {
      this.enteroEnMarcha = false;
    }
  }

  private async volverYa(): Promise<{ devueltas: number; eraNueva: boolean; titulo: string } | null> {
    const comp = this.comparacion;
    if (!comp) return null;
    const r = cambioVolver(comp, this.modelo, (id) => this.estaBloqueada(id));
    if ("error" in r) {
      this.avisosCambio = [r.error];
      this.avisar();
      return null;
    }
    if (!r.devueltas) return null;
    const abierta = this.modelo.pieza(comp.piezaId);
    const titulo = (abierta && "titulo" in abierta && abierta.titulo.trim()) || "Sin título";
    const eraNueva = !comp.base.pieza(comp.piezaId);
    const avisos = this.avisosAlVolver(r.cambio);
    const antes = this.antesDe(r.cambio);
    if (!(await this.aplicar(r.cambio, true, undefined, { exacto: true, entero: true }))) return null;
    avisos.push(...(await this.alternativasAlCambiar(antes)));
    this.avisosCambio.push(...avisos, r.devueltas === 1 ? "Devuelta 1 pieza." : `Devueltas ${r.devueltas} piezas.`);
    if (eraNueva) this.avisosCambio.push(`«${titulo}» ha vuelto a la papelera; Ctrl Z la recupera.`);
    this.avisar();
    return { devueltas: r.devueltas, eraNueva, titulo };
  }

  async cerrar(): Promise<void> {
    this.desbloqueadas.clear();
    for (const t of this.reintentosMarca) clearTimeout(t);
    this.reintentosMarca.clear();
    if (this.temporizadorCopias) clearInterval(this.temporizadorCopias);
    if (this.temporizadorWiki) clearInterval(this.temporizadorWiki);
    this.temporizadorWiki = null;
    this.temporizadorCopias = null;
    await this.guardado.vaciar();
    await this.guardadoPizarra.vaciar().catch(() => undefined);
    await this.guardadoGuion.vaciar().catch(() => undefined);
    await this.guardadoGuion.salvarLocales().catch(() => undefined);
    this.vigilancia?.detener();
    this.vigilancia = null;
    await this.aviso?.cerrar();
  }
}
