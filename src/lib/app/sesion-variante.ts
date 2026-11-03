// Una variante «¿Y si…?» abierta (spec 006): una sesión con su propio modelo
// («Cómo quedaría»), su deshacer y su «Si lo dejas así…». Lo que el autor
// cambia va a la variante, nunca a las notas de la serie, a la wiki ni al Log.
// Lo que la variante no toca sigue a la serie.

import { copiaModelo } from "../consecuencias/copia";
import type { Cambio, Modelo } from "../modelo/modelo";
import type { Evento, Pieza } from "../modelo/tipos";
import { conEstado, estadoDe, olvidarCrudos, tieneFicha, type ConEstado } from "../modelo/estados";
import type { Estado, Madurez } from "../modelo/vocabulario";
import type { TipoFicha } from "../wiki/fichas";
import type { ResultadoPasar } from "../wiki/pasar";
import { choques, contenedorDe, ordenEn } from "../variantes/choques";
import { diferencias, type Diferencias } from "../variantes/diferencias";
import { EscritorVariante } from "../variantes/escritor";
import { fechaVariante } from "../variantes/nombres";
import { notaNormal } from "../variantes/normal";
import { modeloQuedaria, sacarDeVariante, seguirSerie } from "../variantes/quedaria";
import { quitar, type Quitar } from "../variantes/quitar";
import { limpiarPisa, traerPieza, traerSitio } from "../variantes/traer";
import type { Choque, DatosVariante, MetaPaso, ParteVariante, PiezaVariante } from "../variantes/tipos";
import { Sesion, type GuardadoVisible, type OpcionesAplicar, type ResultadoEstado } from "./sesion";
import type { FichaLeida, ResultadoGuardar } from "../wiki/editar-ficha";

/** Lo que no es de piezas espera a salir de la variante (RF-12) */
export const SAL_DE_LA_VARIANTE = (para: string) => `Sal de la variante para ${para}.`;
const FICHA_AL_APLICAR = "La ficha se crea en la wiki al aplicar la variante.";
/** Con una variante abierta, la ficha se ve y no se edita (spec 009, RF-42, RF-51) */
export const WIKI_AL_APLICAR = "La wiki solo cambia al aplicar la variante.";

const parteVacia = (): ParteVariante => ({ piezas: new Map(), sitios: new Map(), pisa: new Map(), fichas: new Map() });

export class SesionVariante extends Sesion {
  /** Tras aparcar, aplicar o descartar: ya no cambia nada */
  cerrada = false;
  readonly escritor: EscritorVariante;
  /** La serie la última vez que se siguió (para ver qué cambió) */
  private serieAntes: Modelo;
  private versionSerie: number;
  private quitarOyente: () => void;
  /** «Quitar» y «Traer»: retocan lo que haría el cambio con los datos de la variante */
  private parteManual: ((p: ParteVariante) => ParteVariante) | null = null;
  /** Lo que el cambio en curso hace con los datos de la variante (lo aplica `persistir`) */
  private parteEnCurso: ParteVariante | null = null;

  private constructor(
    readonly serie: Sesion,
    readonly datos: DatosVariante,
    quedaria: Modelo,
  ) {
    super(
      serie.almacen,
      serie.carpeta,
      {
        carpeta: serie.carpeta,
        ruta: serie.ruta,
        serie: quedaria.serie,
        puntos: [...quedaria.puntos.values()],
        temporadas: [...quedaria.temporadas.values()],
        episodios: [...quedaria.episodios.values()],
        arcos: [...quedaria.arcos.values()],
        eventos: [...quedaria.eventos.values()],
        secretos: [...quedaria.secretos.values()],
        problemas: serie.problemas,
        conflictos: serie.conflictos,
      },
      null,
      null,
    );
    this.serieAntes = copiaModelo(serie.modelo);
    this.versionSerie = serie.modelo.version;
    this.compartir();
    this.variantes = serie.variantes;
    this.escritor = new EscritorVariante(
      serie.variantes,
      () => this.datos,
      (id, p) => this.tituloDe(id, p),
      () => this.avisar(),
      () => this.alCambioFuera?.(),
    );
    this.quitarOyente = serie.alCambiar(() => this.seguir());
  }

  /** La nota de la variante cambió fuera mientras estaba abierta (el estado la vuelve a abrir) */
  alCambioFuera: (() => void) | null = null;

  /** Abre una variante sobre la serie: vacía antes el guardado de la serie (las bases salen de lo guardado) */
  static async abrirSobre(serie: Sesion, v: DatosVariante): Promise<SesionVariante> {
    await serie.guardado.vaciar();
    // El deshacer empieza vacío: el de la serie se queda en la serie (RF-5, RF-10)
    return new SesionVariante(serie, v, modeloQuedaria(serie.modelo, v));
  }

  override get guardadoVisible(): GuardadoVisible {
    return this.escritor;
  }

  /** Wiki, fichas, guía, problemas y conflictos son los de la serie */
  private compartir() {
    this.wiki = this.serie.wiki;
    this.fichas = this.serie.fichas;
    this.guia = this.serie.guia;
    this.problemas = this.serie.problemas;
    this.conflictos = this.serie.conflictos;
  }

  /** La serie avisó: lo que cambió y la variante no toca pasa a «Cómo quedaría» */
  private seguir() {
    if (this.cerrada) return;
    this.compartir();
    if (this.serie.modelo.version !== this.versionSerie) {
      const ids = seguirSerie(this.modelo, this.serie.modelo, this.serieAntes, this.datos);
      this.serieAntes = copiaModelo(this.serie.modelo);
      this.versionSerie = this.serie.modelo.version;
      if (ids.length) this.comparacion?.anotar(ids, "fuera");
    }
    this.avisar();
  }

  private tituloDe(id: string, p: PiezaVariante): string {
    const pieza = p.pieza ?? this.serie.modelo.pieza(id);
    const titulo = pieza && "titulo" in pieza ? pieza.titulo.trim() : "";
    const codigo = this.modelo.indice().codigos.get(id) ?? this.serie.modelo.indice().codigos.get(id) ?? "";
    return [codigo, titulo || id].filter(Boolean).join(" · ");
  }

  private memoDiferencias: { variante: number; serie: number; cambiada: string; guia: unknown; d: Diferencias } | null = null;

  /** Lo que distingue «Cómo quedaría» de «Ahora» (RF-17 a RF-21), una vez por versión de los dos modelos */
  diferencias(): Diferencias {
    const x = this.memoDiferencias;
    if (x && x.variante === this.modelo.version && x.serie === this.serie.modelo.version && x.cambiada === this.datos.cambiada && x.guia === this.guia) return x.d;
    const d = diferencias(this.serie.modelo, this.modelo, this.serie.resultado(), this.resultado(), new Set(this.datos.piezas.keys()), this.guia, this.datos.pisa);
    this.memoDiferencias = { variante: this.modelo.version, serie: this.serie.modelo.version, cambiada: this.datos.cambiada, guia: this.guia, d };
    return d;
  }

  private memoChoques: { variante: number; serie: number; cambiada: string; c: Choque[] } | null = null;

  /** Choques con la serie de ahora (RF-28), una vez por versión de los dos modelos */
  choques(): Choque[] {
    const x = this.memoChoques;
    if (x && x.variante === this.modelo.version && x.serie === this.serie.modelo.version && x.cambiada === this.datos.cambiada) return x.c;
    const c = choques(this.datos, this.serie.modelo, this.modelo);
    this.memoChoques = { variante: this.modelo.version, serie: this.serie.modelo.version, cambiada: this.datos.cambiada, c };
    return c;
  }

  /** Canon en la serie: en la variante se puede probar, pero al aplicar habrá que desbloquearla (RF-11) */
  canonEnSerie(id: string): boolean {
    return this.serie.estaBloqueada(id);
  }

  override estaBloqueada(): boolean {
    return false;
  }

  /**
   * Un cambio en la variante: al modelo y al deshacer de la variante, y a sus
   * datos (que se guardan en su nota). Nada va a las notas de la serie, a la
   * wiki ni al Log; no hay bloqueo de canon (RF-8, RF-11).
   */
  override async aplicar(cambio: Cambio, registrar = true, clave?: string, opciones: OpcionesAplicar = {}): Promise<boolean> {
    if (this.cerrada) return false;
    // Mientras se aplica la variante, nada la cambia (lo que se escribe es lo de antes)
    if ((opciones.origen ?? "autor") === "autor" && !opciones.enLectura && this.rechazarEdicion()) return false;
    this.avisosCambio = [];
    if (registrar && !opciones.exacto) cambio = { ...cambio, guardar: cambio.guardar.map((p) => olvidarCrudos(this.modelo.pieza(p.id), p)) };
    // Al deshacer o rehacer (sin registrar), los datos de la variante salen del paso: base, sitios…
    const delPaso = registrar ? null : this.historial.ultimoMeta;
    this.historial.ultimoMeta = null;
    const despues = delPaso ? this.soloDe(delPaso, cambio) : (this.parteManual?.(this.parteTras(cambio)) ?? this.parteTras(cambio));
    const meta: MetaPaso = { antes: this.parteActual(despues), despues };
    this.parteEnCurso = despues;
    try {
      this.ponerCambio(cambio, registrar, clave, { origen: opciones.origen, entero: opciones.entero, meta: registrar ? meta : undefined });
    } finally {
      this.parteEnCurso = null;
    }
    return true;
  }

  /** Lo que tienen ahora los datos de la variante en las mismas entradas */
  private parteActual(de: ParteVariante): ParteVariante {
    const r = parteVacia();
    for (const id of de.piezas.keys()) r.piezas.set(id, this.datos.piezas.get(id));
    for (const id of de.sitios.keys()) r.sitios.set(id, this.datos.sitios.get(id));
    for (const id of de.pisa.keys()) r.pisa.set(id, this.datos.pisa.get(id));
    for (const id of de.fichas.keys()) r.fichas.set(id, this.datos.fichas.get(id));
    return r;
  }

  /** Cómo quedan los datos de la variante tras el cambio (se calcula antes de ponerlo) */
  private parteTras(cambio: Cambio): ParteVariante {
    const r = parteVacia();
    const serie = this.serie.modelo;
    const contenedores = new Set<string>();
    const entrada = (p: Pieza, pieza: Pieza | null) => {
      const ya = this.datos.piezas.get(p.id);
      const enSerie = serie.pieza(p.id);
      const base = ya ? ya.base : enSerie ? notaNormal(enSerie) : null;
      // Igual que en la serie (o nueva que se va): sale de la variante
      const igual = base === null ? pieza === null : pieza !== null && notaNormal(pieza) === base;
      r.piezas.set(p.id, igual ? undefined : { tipo: p.tipo, base, pieza });
      if (p.tipo !== "evento") return;
      const antes = this.modelo.eventos.get(p.id);
      const ahora = pieza as Evento | null;
      const cambiaSitio = !antes || !ahora || antes.episodio !== ahora.episodio || antes.orden !== ahora.orden || antes.acto !== ahora.acto || antes.temporada !== ahora.temporada;
      if (!cambiaSitio) return;
      if (antes) contenedores.add(contenedorDe(this.modelo, antes));
      if (ahora) contenedores.add(contenedorDe(this.modelo, ahora));
    };
    for (const p of cambio.guardar) entrada(p, p);
    for (const p of cambio.borrar) entrada(p, null);
    // «Pisa lo de ahora» deja de valer si el campo ya no pisa nada (RF-30c)
    for (const [id, x] of r.piezas) {
      const antes = this.datos.pisa.get(id);
      if (!antes) continue;
      const despues = x ? limpiarPisa(antes, x.pieza, serie.pieza(id)) : undefined;
      if (JSON.stringify(despues) !== JSON.stringify(antes)) r.pisa.set(id, despues);
    }
    // El orden de la serie de cada contenedor tocado, la primera vez
    for (const c of contenedores) {
      if (this.datos.sitios.has(c)) continue;
      const orden = ordenEn(serie, c);
      if (orden) r.sitios.set(c, orden);
    }
    // Un contenedor sin escenas de la variante deja de vigilarse
    const piezas = new Map(this.datos.piezas);
    for (const [id, x] of r.piezas) {
      if (x) piezas.set(id, x);
      else piezas.delete(id);
    }
    const usados = new Set<string>();
    for (const [id, x] of piezas) {
      if (x.tipo !== "evento") continue;
      if (x.pieza) usados.add(contenedorDe(this.modelo, x.pieza as Evento));
      const enSerie = serie.eventos.get(id);
      if (enSerie) usados.add(contenedorDe(serie, enSerie));
    }
    for (const c of [...this.datos.sitios.keys(), ...r.sitios.keys()]) if (!usados.has(c)) r.sitios.set(c, undefined);
    return r;
  }

  /** Apunta en la variante lo que acaba de poner `ponerCambio` y pide guardarla */
  override async guardarApartado(_id: string, _leida: FichaLeida, _i: number, _nuevo: string): Promise<ResultadoGuardar> {
    return { ok: false, motivo: "no se guarda", mensaje: WIKI_AL_APLICAR };
  }

  override async escribirEnFicha(): Promise<ResultadoGuardar> {
    return { ok: false, motivo: "no se guarda", mensaje: WIKI_AL_APLICAR };
  }

  /** Un estado antiguo se confirma fuera de la variante (spec 009, RF-55b) */
  override async confirmarEquivalencia(_id: string, _valor: Madurez, _motivo?: string): Promise<ResultadoEstado> {
    return { hecho: false, avisos: [SAL_DE_LA_VARIANTE("cambiar la wiki")] };
  }

  /** Las alternativas descartadas se apuntan al aplicar (spec 009, RF-51) */
  protected override async alternativasAlCambiar(): Promise<string[]> {
    return [];
  }

  protected override persistir(): void {
    const parte = this.parteEnCurso;
    if (!parte) return;
    const salen: string[] = [];
    for (const [id, x] of parte.piezas) {
      if (x) this.datos.piezas.set(id, x);
      else {
        this.datos.piezas.delete(id);
        salen.push(id);
      }
    }
    for (const [id, x] of parte.sitios) {
      if (x) this.datos.sitios.set(id, x);
      else this.datos.sitios.delete(id);
    }
    for (const [id, x] of parte.pisa) {
      if (x) this.datos.pisa.set(id, x);
      else this.datos.pisa.delete(id);
    }
    for (const [id, x] of parte.fichas) {
      if (x !== undefined) this.datos.fichas.set(id, x);
      else this.datos.fichas.delete(id);
    }
    // Lo que sale de la variante enseña lo de la serie de ahora, no lo de cuando entró
    sacarDeVariante(this.modelo, this.serie.modelo, salen);
    this.datos.cambiada = fechaVariante(new Date());
    this.escritor.pedir();
  }

  // --- Quitar de la variante (RF-24, RF-24b) ---

  /** Qué se quitaría con esta pieza (para confirmar si son más) */
  quitar(id: string): Quitar {
    return quitar(this.datos, id, this.modelo, this.serie.modelo);
  }

  /**
   * Deja esas piezas como están ahora en la serie, en un paso de deshacer de la
   * variante. `recortes`: contenedores que se quedan, sin esas entradas en su lista
   */
  async quitarYa(ids: string[], recortes: Map<string, string[]> = new Map()): Promise<boolean> {
    ids = ids.filter((id) => this.datos.piezas.has(id));
    if (!ids.length) return false;
    // Cada una, como está en la serie de ahora; la nueva, fuera
    const cambio: Cambio = { guardar: [], borrar: [] };
    for (const id of ids) {
      const enSerie = this.serie.modelo.pieza(id);
      const aqui = this.modelo.pieza(id);
      if (enSerie) cambio.guardar.push(enSerie);
      else if (aqui) cambio.borrar.push(aqui);
    }
    for (const [id, sin] of recortes) {
      const aqui = this.modelo.pieza(id);
      if (!aqui || ids.includes(id)) continue;
      const p = structuredClone(aqui) as Pieza & { temporadas?: string[]; episodios?: string[] };
      if (p.tipo === "serie") p.temporadas = p.temporadas!.filter((x) => !sin.includes(x));
      else if (p.tipo === "temporada") p.episodios = p.episodios!.filter((x) => !sin.includes(x));
      cambio.guardar.push(p);
    }
    // Salen de la variante aunque la serie haya cambiado desde su base (no es «igual que la base»)
    this.parteManual = (p) => {
      for (const id of ids) {
        p.piezas.set(id, undefined);
        if (this.datos.pisa.has(id)) p.pisa.set(id, undefined);
        if (this.datos.fichas.has(id)) p.fichas.set(id, undefined);
      }
      return p;
    };
    try {
      return await this.aplicar(cambio, true, undefined, { exacto: true });
    } finally {
      this.parteManual = null;
    }
  }

  // --- Traer lo de ahora (RF-30 a RF-31) ---

  /** ¿Se puede traer lo de ahora en este choque? (no si lo que choca ya no existe, RF-31) */
  sePuedeTraer(ch: Choque): boolean {
    if (ch.clase === "pieza") return !ch.yaNoEsta && !ch.yaExiste && this.datos.piezas.has(ch.id) && !!this.serie.modelo.pieza(ch.id);
    return ch.clase === "sitio" && !ch.yaNoEsta;
  }

  /** Pone al día con la serie una pieza o un sitio que chocan, en un paso de deshacer de la variante */
  async traer(ch: Choque): Promise<boolean> {
    if (!this.sePuedeTraer(ch)) return false;
    let cambio: Cambio;
    if (ch.clase === "pieza") {
      const e = this.datos.piezas.get(ch.id)!;
      const t = traerPieza(e, ch.id, this.serie.modelo.pieza(ch.id)!);
      const pisa = { ...(this.datos.pisa.get(ch.id) ?? {}), ...t.pisa };
      const sigue = !!Object.keys(pisa).length || t.pieza === null || notaNormal(t.pieza) !== t.base;
      cambio = { guardar: t.pieza ? [t.pieza] : [], borrar: [] };
      this.parteManual = (p) => {
        p.piezas.set(ch.id, sigue ? { tipo: e.tipo, base: t.base, pieza: t.pieza } : undefined);
        p.pisa.set(ch.id, sigue && Object.keys(pisa).length ? pisa : undefined);
        return p;
      };
    } else if (ch.clase === "sitio") {
      const orden = ordenEn(this.serie.modelo, ch.contenedor)!;
      cambio = { guardar: traerSitio(ch.contenedor, this.serie.modelo, this.modelo, new Set(this.datos.piezas.keys())), borrar: [] };
      this.parteManual = (p) => {
        p.sitios.set(ch.contenedor, orden);
        return p;
      };
    } else return false;
    try {
      return await this.aplicar(cambio, true, undefined, { exacto: true });
    } finally {
      this.parteManual = null;
    }
  }

  // --- Lo que en la variante es distinto (spec 006, RF-8, RF-12) ---

  /** Cambiar el estado sin tocar la wiki: pasar a borrador o a canon crea la ficha al aplicar */
  override async cambiarEstado(id: string, estado: Estado, opciones: { motivo?: string; nombre?: string } = {}): Promise<ResultadoEstado> {
    const p = this.modelo.pieza(id);
    if (!p || !("madurez" in p)) return { hecho: false, avisos: ["Esa pieza no tiene estado."] };
    if (!(await this.aplicar({ guardar: [conEstado(p as ConEstado, estado, opciones.motivo)], borrar: [] }, true, `estado ${id}`))) return { hecho: false, avisos: [...this.avisosCambio] };
    const avisos: string[] = [];
    if ((estado === "borrador" || estado === "canon") && this.necesitaFicha(id)) {
      if (opciones.nombre?.trim()) this.ponerNombreFicha(id, opciones.nombre);
      avisos.push(FICHA_AL_APLICAR);
    }
    const ahora = this.modelo.pieza(id);
    return { hecho: !!ahora && "madurez" in ahora && estadoDe(ahora as ConEstado) === estado, avisos };
  }

  /** «Pasar a la wiki» en la variante: se apunta el nombre y la ficha se crea al aplicar */
  override async pasar(piezaId: string, nombre?: string): Promise<ResultadoPasar> {
    const p = this.modelo.pieza(piezaId);
    if (p && "madurez" in p && !["borrador", "canon"].includes(estadoDe(p as ConEstado))) await this.cambiarEstado(piezaId, "borrador", { nombre });
    else if (nombre?.trim()) this.ponerNombreFicha(piezaId, nombre);
    this.avisosCambio = [FICHA_AL_APLICAR];
    this.avisar();
    return { estado: "creada", nombre: this.datos.fichas.get(piezaId) ?? "", ruta: "", repetidas: [], pieza: null, sinFicha: [] };
  }

  private necesitaFicha(id: string): boolean {
    const p = this.modelo.pieza(id);
    return !!p && tieneFicha(p.tipo) && !(("wiki" in p && typeof p.wiki === "string" && p.wiki.trim()) as boolean);
  }

  private ponerNombreFicha(id: string, nombre: string) {
    this.datos.fichas.set(id, nombre.trim());
    this.escritor.pedir();
  }

  /** La wiki y la guía son las de la serie: se leen allí (así la revisión de fichas no mete nada en la variante) */
  override async leerWiki(): Promise<void> {
    await this.serie.leerWiki();
    this.compartir();
    this.avisar();
  }

  override async revisarFichas(): Promise<void> {
    await this.serie.revisarFichas();
  }

  override async leerGuia(): Promise<void> {
    if (!this.serie) return; // durante el constructor de la base
    await this.serie.leerGuia();
    this.compartir();
    this.avisar();
  }

  override async crearFicha(_tipo: TipoFicha, _nombre: string, _motivo?: string): Promise<never> {
    throw new Error(SAL_DE_LA_VARIANTE("crear fichas en la wiki"));
  }

  override async crearGuia(): Promise<void> {
    this.avisosCambio = [SAL_DE_LA_VARIANTE("crear guia.md")];
    this.avisar();
  }

  /** En la variante el canon ya se puede probar: se desbloquea en la serie al aplicar (RF-11, RF-34) */
  override desbloquear(): void {}

  override async copiaAutomatica(): Promise<void> {}

  /** En la variante no hay fichas: deshacer no tiene nada que decir de la wiki */
  protected override avisosAlVolver(): string[] {
    return [];
  }

  /** Del paso que se deshace, solo lo de sus piezas que de verdad vuelven (lo cambiado después se salta) */
  private soloDe(parte: ParteVariante, cambio: Cambio): ParteVariante {
    const ids = new Set([...cambio.guardar, ...cambio.borrar].map((p) => p.id));
    return { ...parte, piezas: new Map([...parte.piezas].filter(([id]) => ids.has(id))) };
  }

  /**
   * Cierra la variante tras escribir lo pendiente. Si no se pudo escribir, ya no
   * se reintenta: quien la cierra mira antes `escritor.vaciar()` (aparcar, descartar).
   */
  override async cerrar(): Promise<void> {
    if (this.cerrada) return;
    await this.escritor.vaciar();
    this.escritor.parar();
    this.cerrada = true;
    this.quitarOyente();
    await super.cerrar();
  }
}
