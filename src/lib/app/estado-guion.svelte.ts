// El guion en el estado de la app (spec 013): el episodio (o la bandeja) en
// pantalla, un bloque por escena con su documento, su cursor y su deshacer, y lo
// que hay que decir al autor. Escribir va por `guardadoGuion` de la sesión (por
// escena, en cola, sin pisar ni descartar lo cambiado fuera). Con una variante
// abierta (spec 006) todo es de solo lectura y las escenas salen de la serie
// principal. El historial vive en memoria; nada del tipo pendiente va a disco.

import type { CargaGuion } from "../almacen/almacen-guion";
import type { CambioExterno } from "../almacen/vigilancia";
import { codigosDeEscenas, type CodigoEscena } from "../guion/codigos";
import { aTexto, desdeTexto, pideCopiaPrevia, type Documento, type PegadoPermitido, type Pos, type Resultado } from "../guion/documento";
import { HistorialGuion } from "../guion/historial";
import { IndiceGuion, type Ambito, type Resumen } from "../guion/indice";
import { cambiosDeTipo } from "../guion/lineas";
import { formatoMedida, medir } from "../guion/paginas";
import { esIdEscena, type Guion } from "../guion/tipos";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import type { Nivel } from "../vistas/visor";
import type { Sesion } from "./sesion";

/** Lo que el guion necesita de la app que lo contiene */
export interface AnfitrionGuion {
  readonly sesionSerie: Sesion | null;
  /** Con una variante abierta no es null */
  readonly variante: unknown;
  readonly nivel: Nivel;
  readonly temporadaActual: string | null;
}

/** Qué hay en pantalla: los actos de un episodio o la bandeja de una temporada */
export type DocumentoEnPantalla = { tipo: "episodio"; id: string } | { tipo: "bandeja"; temporada: string };

export interface Bloque {
  id: string;
  doc: Documento;
  pos: Pos | null;
  /** Lo que no es texto del guion (versión, campos de cabecera, fin de línea, BOM): se conserva al escribir */
  base: Guion;
  /** Una versión más nueva del formato, un guion pasado de tope o un fichero ignorado: solo se mira */
  soloLectura: boolean;
  avisos: string[];
  /** El texto es solo el encabezado propuesto (RF-7): no se ha guardado ni cuenta hasta que el autor escriba */
  propuesta?: boolean;
  /** El texto que se propuso, para reconocerlo si se deshace todo hasta él */
  textoPropuesto?: string;
}

export interface Huerfano {
  id: string;
}

export class EstadoGuion {
  /** El documento en pantalla; null = aún no se ha elegido */
  enPantalla = $state.raw<DocumentoEnPantalla | null>(null);
  bloques = $state.raw<Record<string, Bloque>>({});
  /** La escena con el foco o la última tocada */
  escenaActual = $state<string | null>(null);
  /** Una escena a la que llegar al abrir la vista (desde el desglose, spec 014); la vista lo borra al llegar */
  pendienteIr = $state<string | null>(null);
  /** Lo que se dijo al autor y lo lee un lector de pantalla (role="status") */
  anuncio = $state("");
  /** Avisos de la carpeta: guiones sin escena y ficheros que no son guiones */
  huerfanos = $state.raw<string[]>([]);
  ignorados = $state.raw<Array<{ nombre: string; motivo: string }>>([]);
  /** Por qué no se pudo leer una escena */
  errorCarga = $state<string | null>(null);
  /** Sube con cada cambio del guardado o del índice: la interfaz lo lee para redibujar */
  private version = $state(0);

  private historiales = new Map<string, HistorialGuion>();
  private sesion: Sesion | null = null;
  private indice: IndiceGuion | null = null;
  private cacheCodigos: { modelo: Modelo; version: number; codigos: Map<string, CodigoEscena> } | null = null;

  constructor(private readonly anfitrion: AnfitrionGuion) {}

  // --- Lo que se ve ---

  get soloLecturaGlobal(): boolean {
    return !!this.anfitrion.variante || !this.sesion;
  }

  get modelo(): Modelo | null {
    return this.anfitrion.sesionSerie?.modelo ?? null;
  }

  /** Las escenas del documento en pantalla, en orden; las descartadas al final */
  get escenas(): { activas: Evento[]; descartadas: Evento[] } {
    void this.version;
    const m = this.modelo;
    const d = this.enPantalla;
    if (!m || !d) return { activas: [], descartadas: [] };
    const idx = m.indice();
    const todas = (d.tipo === "episodio" ? idx.porEpisodio.get(d.id) : idx.bandeja.get(d.temporada)) ?? [];
    const sirven = todas.filter((e) => esIdEscena(e.id));
    return { activas: sirven.filter((e) => estadoDe(e) !== "descartado"), descartadas: sirven.filter((e) => estadoDe(e) === "descartado") };
  }

  codigoDe(id: string): CodigoEscena | undefined {
    const m = this.modelo;
    if (!m) return undefined;
    if (!this.cacheCodigos || this.cacheCodigos.modelo !== m || this.cacheCodigos.version !== m.version) this.cacheCodigos = { modelo: m, version: m.version, codigos: codigosDeEscenas(m) };
    return this.cacheCodigos.codigos.get(id);
  }

  bloque(id: string): Bloque | undefined {
    return this.bloques[id];
  }

  soloLectura(id: string): boolean {
    return this.soloLecturaGlobal || !!this.bloques[id]?.soloLectura || !this.bloques[id];
  }

  /** «2,4 págs ≈ 2 min 24 s» de una escena, o null si no tiene guion */
  medidaDe(id: string): string | null {
    void this.version;
    const b = this.bloques[id];
    const texto = b ? (b.propuesta ? "" : aTexto(b.doc)) : null;
    if (texto !== null) return /\S/.test(texto) ? formatoMedida(medir(texto)) : null;
    const m = this.indice?.medidaDe(id);
    return m ? formatoMedida(m) : null;
  }

  /** ¿Tiene guion? (para la lista; sin leer aún: undefined) */
  tieneGuion(id: string): boolean | undefined {
    void this.version;
    const b = this.bloques[id];
    if (b) return !b.propuesta && /\S/.test(aTexto(b.doc));
    const m = this.indice?.medidaDe(id);
    return m === undefined ? undefined : m !== null;
  }

  resumen(ambito: Ambito): Resumen | null {
    void this.version;
    return this.indice?.resumen(ambito) ?? null;
  }

  // --- Guardado y cambios por fuera ---

  get hayPendiente(): boolean {
    void this.version;
    return this.sesion?.guardadoGuion.hayPendiente ?? false;
  }

  errorDe(id: string): string | null {
    void this.version;
    return this.sesion?.guardadoGuion.errores.get(id) ?? null;
  }

  get errores(): Array<[string, string]> {
    void this.version;
    return [...(this.sesion?.guardadoGuion.errores ?? [])];
  }

  /** Las escenas cuyo fichero cambió fuera y esperan que el autor elija */
  get cambiadasFuera(): string[] {
    void this.version;
    return [...(this.sesion?.guardadoGuion.cambiadas.keys() ?? [])];
  }

  borradaFuera(id: string): boolean {
    void this.version;
    return this.sesion?.guardadoGuion.borradas.has(id) ?? false;
  }

  // --- Abrir y cerrar ---

  /** Al entrar en la vista: engancha la sesión y elige el documento. No escribe nada */
  async abrir(): Promise<void> {
    const s = this.anfitrion.sesionSerie;
    if (!s) return;
    if (this.sesion !== s) this.enganchar(s);
    if (!this.enPantalla || !this.vale(this.enPantalla)) this.enPantalla = this.porDefecto();
    await this.cargarDocumento();
    void this.revisarCarpeta();
    void this.indice?.calcular();
  }

  /** Al salir de la vista o de la escena se guarda lo pendiente */
  async alSalir(): Promise<void> {
    await this.sesion?.guardadoGuion.vaciar();
  }

  /** Otra serie, o ninguna: todo vuelve a empezar */
  reiniciar(): void {
    this.desenganchar();
    this.enPantalla = null;
    this.bloques = {};
    this.escenaActual = null;
    this.pendienteIr = null;
    this.anuncio = "";
    this.huerfanos = [];
    this.ignorados = [];
    this.errorCarga = null;
    this.historiales.clear();
  }

  async reintentar(): Promise<void> {
    await this.sesion?.guardadoGuion.reintentar();
  }

  private enganchar(s: Sesion): void {
    this.desenganchar();
    this.sesion = s;
    this.indice = new IndiceGuion(s.guion, () => s.modelo);
    this.indice.alCambiar = () => this.version++;
    s.guardadoGuion.alCambiar = () => this.version++;
    s.guardadoGuion.alFuera = (id, c) => this.poner(id, c, "Se usa la versión de fuera; la tuya está en la papelera.");
    s.alCambiarGuion = (cambios) => void this.alCambiarFuera(cambios);
    s.alMoverGuiones = (ids) => this.alMoverse(ids);
  }

  private desenganchar(): void {
    const s = this.sesion;
    if (s) {
      s.guardadoGuion.alCambiar = () => undefined;
      s.guardadoGuion.alFuera = () => undefined;
      s.alCambiarGuion = null;
      s.alMoverGuiones = null;
    }
    this.indice?.cancelar();
    this.indice = null;
    this.sesion = null;
  }

  private vale(d: DocumentoEnPantalla): boolean {
    const m = this.modelo;
    if (!m) return false;
    return d.tipo === "episodio" ? m.episodios.has(d.id) : m.temporadas.has(d.temporada);
  }

  /** El episodio del nivel si lo hay; si no, el primero de la temporada visible; si no, el primero de la serie */
  private porDefecto(): DocumentoEnPantalla | null {
    const m = this.modelo;
    if (!m) return null;
    const n = this.anfitrion.nivel;
    if (n.tipo === "episodio" && m.episodios.has(n.episodio)) return { tipo: "episodio", id: n.episodio };
    const idx = m.indice();
    const t = n.tipo !== "serie" ? n.temporada : (this.anfitrion.temporadaActual ?? idx.temporadas[0]);
    const eps = (t && idx.episodiosDe.get(t)) || idx.episodios;
    const primero = eps[0] ?? idx.episodios[0];
    return primero ? { tipo: "episodio", id: primero } : t ? { tipo: "bandeja", temporada: t } : null;
  }

  async elegir(d: DocumentoEnPantalla): Promise<void> {
    await this.sesion?.guardadoGuion.vaciar();
    this.enPantalla = d;
    this.escenaActual = null;
    await this.cargarDocumento();
  }

  // --- Cargar ---

  private async cargarDocumento(): Promise<void> {
    const s = this.sesion;
    if (!s) return;
    const { activas, descartadas } = this.escenas;
    const ids = [...activas, ...descartadas].map((e) => e.id).filter((id) => !this.bloques[id]);
    this.errorCarga = null;
    for (const id of ids) {
      try {
        const c = await s.guion.cargar(id);
        if (this.sesion !== s) return;
        // Si otra carga o el autor se adelantaron, no se pisa lo que ya hay
        if (!this.bloques[id]) this.poner(id, c);
      } catch (e) {
        if (this.sesion === s) this.errorCarga = (e as Error).message || "error desconocido";
      }
    }
  }

  private poner(id: string, c: CargaGuion, anuncio?: string): void {
    const antes = this.bloques[id];
    const doc = desdeTexto(c.guion.texto);
    const { texto: _t, ...base } = c.guion;
    this.bloques = { ...this.bloques, [id]: { id, doc, pos: antes?.pos ?? null, base: { ...base, texto: "" }, soloLectura: c.soloLectura, avisos: c.avisos } };
    this.historiales.get(id)?.vaciar();
    this.indice?.ponerTexto(id, c.guion.texto);
    if (anuncio) this.anuncio = anuncio;
  }

  /** Lo que cambió en _guion/ fuera de Atelier */
  private async alCambiarFuera(cambios: CambioExterno[]): Promise<void> {
    const s = this.sesion;
    if (!s) return;
    const ids = [...new Set(cambios.map((c) => /([^/\\]+)\.md$/.exec(c.ruta)?.[1]).filter((id): id is string => !!id && esIdEscena(id)))];
    this.indice?.invalidar(ids);
    for (const id of ids) {
      const b = this.bloques[id];
      if (!b) continue;
      if (s.guardadoGuion.hayPendienteDe(id) || s.guardadoGuion.cambiadas.has(id)) {
        // Hay texto mío sin escribir: se intenta escribir ya; si el disco cambió, el guardado lo bloquea y se ofrece elegir
        await s.guardadoGuion.vaciar(id);
        continue;
      }
      const c = await s.guion.releer(id);
      const ahora = this.bloques[id];
      if (ahora && (ahora.doc !== b.doc || s.guardadoGuion.hayPendienteDe(id))) {
        // El autor tecleó mientras se leía: lo suyo no se pisa ni se escribe; se ofrece elegir
        s.guardadoGuion.marcarCambioFuera(id, this.guionDe(ahora, ahora.doc));
        continue;
      }
      const antes = aTexto(b.doc);
      this.poner(id, c);
      const tipos = cambiosDeTipo(antes, c.guion.texto).length;
      this.anuncio = tipos ? `El guion de ${this.codigoDe(id)?.completo ?? "la escena"} cambió fuera de Atelier; ${tipos} línea${tipos === 1 ? "" : "s"} cambia${tipos === 1 ? "" : "n"} de tipo.` : `El guion de ${this.codigoDe(id)?.completo ?? "la escena"} cambió fuera de Atelier y se ha vuelto a leer.`;
    }
    void this.revisarCarpeta();
  }

  /** Borrar, deshacer o rehacer una escena movió su guion: lo leído ya no vale */
  private alMoverse(ids: string[]): void {
    const nuevo = { ...this.bloques };
    for (const id of ids) {
      delete nuevo[id];
      this.historiales.delete(id);
    }
    this.bloques = nuevo;
    this.indice?.invalidar(ids);
    void this.cargarDocumento();
    void this.revisarCarpeta();
  }

  /** Guiones sin escena y ficheros que no son guiones (RF-29) */
  async revisarCarpeta(): Promise<void> {
    const s = this.sesion;
    if (!s) return;
    try {
      const l = await s.guion.listar(new Set([...s.modelo.eventos.keys()]));
      if (this.sesion !== s) return;
      this.huerfanos = l.huerfanos;
      this.ignorados = l.ignorados;
    } catch {
      // Sin carpeta que mirar no hay nada que avisar
    }
  }

  // --- Escribir ---

  private historial(id: string): HistorialGuion {
    let h = this.historiales.get(id);
    if (!h) this.historiales.set(id, (h = new HistorialGuion()));
    return h;
  }

  private guionDe(b: Bloque, doc: Documento): Guion {
    return { ...b.base, texto: aTexto(doc) };
  }

  /** El cursor se mueve (sin cambiar el texto) */
  fijarCursor(id: string, pos: Pos | null): void {
    const b = this.bloques[id];
    if (!b) return;
    this.escenaActual = id;
    this.bloques = { ...this.bloques, [id]: { ...b, pos } };
  }

  /**
   * Aplica un cambio del editor: el documento nuevo, el cursor, el deshacer, el
   * guardado diferido y la medida. Si borra más de 500 caracteres, antes se
   * guarda una copia del texto de la memoria en la papelera (RF-30).
   */
  editar(id: string, r: Resultado, clave?: string): boolean {
    const s = this.sesion;
    const b = this.bloques[id];
    if (!s || !b || this.soloLectura(id)) return false;
    const antesTexto = aTexto(b.doc);
    const despuesTexto = aTexto(r.doc);
    if (antesTexto === despuesTexto) {
      // Mismo texto (solo cambian marcas de línea o el cursor): ni historial ni guardado
      this.bloques = { ...this.bloques, [id]: { ...b, doc: r.doc, pos: r.pos } };
      return true;
    }
    if (pideCopiaPrevia(antesTexto, despuesTexto)) {
      const copia = this.guionDe(b, b.doc);
      void s.guion.copiaAPapelera(id, copia).then(
        () => (this.anuncio = "Se borró bastante texto: queda una copia en la papelera del guion."),
        (e) => (this.anuncio = `No se pudo guardar la copia previa (${(e as Error).message}). Deshacer (Ctrl Z) lo recupera.`),
      );
    }
    this.historial(id).hacer({ doc: b.doc, pos: b.pos ?? r.pos }, { doc: r.doc, pos: r.pos }, clave);
    this.bloques = { ...this.bloques, [id]: { ...b, doc: r.doc, pos: r.pos, propuesta: false } };
    this.escenaActual = id;
    s.guardadoGuion.cambiar(id, this.guionDe(b, r.doc));
    this.indice?.ponerTexto(id, despuesTexto);
    return true;
  }

  /**
   * Una escena sin guion propone un encabezado con su primer lugar, o `INT. `
   * (RF-7). Es solo lo que se ve: no se guarda nada hasta que el autor escriba.
   */
  proponerEncabezado(id: string): void {
    const b = this.bloques[id];
    const ev = this.modelo?.eventos.get(id);
    if (!b || !ev || this.soloLectura(id) || b.propuesta || /\S/.test(aTexto(b.doc)) || this.historiales.get(id)?.puedeDeshacer) return;
    const lugar = ev.lugares.find((l) => l.trim());
    // El lugar suele ser un enlace [[Lugar]]: sale como referencia; el encabezado ya se ve en mayúsculas
    const texto = lugar ? `INT. ${lugar.trim()}` : "INT. ";
    const doc = desdeTexto(texto);
    this.bloques = { ...this.bloques, [id]: { ...b, doc, pos: { l: 0, u: doc[0]!.u.length }, propuesta: true, textoPropuesto: texto } };
  }

  /** Al salir de una escena: la propuesta sin tocar desaparece y lo pendiente se escribe ya */
  alSalirEscena(id: string): void {
    this.quitarPropuesta(id);
    void this.sesion?.guardadoGuion.vaciar(id);
  }

  /** Si el autor se va sin escribir, la propuesta desaparece */
  quitarPropuesta(id: string): void {
    const b = this.bloques[id];
    if (!b?.propuesta) return;
    this.bloques = { ...this.bloques, [id]: { ...b, doc: desdeTexto(""), pos: null, propuesta: false } };
  }

  /** Pegar entero o nada: si pasa del tope, se dice y no cambia nada */
  pegar(id: string, r: PegadoPermitido): boolean {
    if (!r.ok) {
      this.anuncio = r.motivo;
      return false;
    }
    return this.editar(id, r.resultado);
  }

  deshacer(id: string): boolean {
    return this.volver(id, this.historial(id).deshacer());
  }

  rehacer(id: string): boolean {
    return this.volver(id, this.historial(id).rehacer());
  }

  puedeDeshacer(id: string): boolean {
    void this.version;
    return this.historiales.get(id)?.puedeDeshacer ?? false;
  }

  private volver(id: string, e: { doc: Documento; pos: Pos } | null): boolean {
    const s = this.sesion;
    const b = this.bloques[id];
    if (!s || !b || !e || this.soloLectura(id)) return false;
    const antes = aTexto(b.doc);
    const despues = aTexto(e.doc);
    if (pideCopiaPrevia(antes, despues)) void s.guion.copiaAPapelera(id, this.guionDe(b, b.doc)).catch(() => undefined);
    // Deshacer hasta el encabezado propuesto no escribe lo que el autor no escribió (RF-7)
    const vuelveAPropuesta = b.textoPropuesto !== undefined && despues === b.textoPropuesto;
    this.bloques = { ...this.bloques, [id]: { ...b, doc: e.doc, pos: e.pos, propuesta: vuelveAPropuesta } };
    s.guardadoGuion.cambiar(id, this.guionDe(b, vuelveAPropuesta ? desdeTexto("") : e.doc));
    this.indice?.ponerTexto(id, despues);
    return true;
  }

  // --- Los tres caminos ante un cambio por fuera (RF-28) ---

  /** La versión mía que se conserva mientras el autor elige */
  localDeFuera(id: string): string | null {
    void this.version;
    return this.sesion?.guardadoGuion.cambiadas.get(id)?.local.texto ?? null;
  }

  async quedarmeConLaMia(id: string): Promise<void> {
    await this.sesion?.guardadoGuion.quedarmeConLaMia(id);
    this.anuncio = "Te quedas con tu versión; la de fuera está en la papelera del guion.";
  }

  async usarLaDeFuera(id: string): Promise<void> {
    await this.sesion?.guardadoGuion.usarLaDeFuera(id);
  }
}
