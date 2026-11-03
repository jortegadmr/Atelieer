// Estado de la interfaz: qué pantalla se ve, la serie abierta y el tema.
// La ruta de appDatos se guarda en cada equipo (M3): la de Proton es distinta
// en el PC y en el Mac.

import { Almacen, carpetaParaTitulo, type SerieEnLista } from "../almacen/almacen";
import { carpetaDe, limitarBorrado, type Fs } from "../almacen/fs";
import { crearCarpetasWiki, prepararVaultNueva, rutaRelativaSegura } from "./serie-nueva";
import type { RutasWiki } from "../modelo/tipos";
import { Sesion } from "./sesion";
import { SesionVariante } from "./sesion-variante";
import type { Modelo } from "../modelo/modelo";
import * as c from "../modelo/consultas";
import { fechaVariante, limpiarNombre, nombrePorDefecto, nombreUnico, nuevoIdVariante } from "../variantes/nombres";
import { variante as nuevaVarianteVacia, type DatosVariante } from "../variantes/tipos";
import { modeloAntes, modeloQuedaria } from "../variantes/quedaria";
import { choques } from "../variantes/choques";
import { fraseAplicada, fraseChoquesAplicar, frasesAplicar } from "../variantes/aplicar";

const CLAVE_RAIZ = "atelier.appDatos";
const CLAVE_TEMA = "atelier.tema";

import { mismoNivel, NIVEL_SERIE, nivelAlCambiarVista, nivelValido, subir, vistaDeNivel, type Nivel, type Vista } from "../vistas/visor";
import { AVISO_CANON, crearIdea, crearPieza, opcionesNuevo, type DatosNueva, type QueCrear } from "../vistas/crear";
import { anuncio, colocarEscena, pasoTeclado, porQueNoSeMueve, type ActoVisor, type Tecla } from "../vistas/actos";
import { anuncioEpoca, cambioDeEpoca, columnaDeEscena, columnasHistoria, pasoHistoria, porQueNoSeCambia, type Columna, type IdColumna } from "../vistas/historia";
import { Capas } from "./capas";
import { EstadoGuion } from "./estado-guion.svelte";
import { EstadoMundo } from "./estado-mundo.svelte";
import { EstadoDesglose } from "./estado-desglose.svelte";
import { EstadoPizarra } from "./estado-pizarra.svelte";
import { existeLente, nombreLente, relacion, alias, clavePersonaje, personajesDeSerie, type Lente, type Relacion } from "../vistas/lente";
import type { ClaveCampo } from "../guia/campos";
import { nombreMundoValido } from "../wiki/mundo";
import type { IdPlantilla } from "../modelo/plantillas";
import { clavePlantillaVista, escribirPlantillasVista, leerPlantillasVista, limpiarPlantillasVista } from "./plantilla-vista";
export type { Vista };
export type Pestana = "editar" | "efectos" | "ysi" | "guia" | "ficha" | "comprobar";

/** Lo que dice el panel mientras se ve «Ahora» con una variante abierta (spec 006, RF-15) */
export const VIENDO_AHORA = "Estás viendo ahora. Pulsa «Ver cómo quedaría» para seguir probando.";

/**
 * La pieza que se puede elegir en `visible` en lugar de `id`, que no existe ahí:
 * la que la contiene en `otro` (escena → episodio o temporada; episodio → temporada; lo demás → serie)
 */
export function contenedorEn(visible: Modelo, otro: Modelo, id: string): string {
  if (visible.pieza(id)) return id;
  const p = otro.pieza(id);
  const candidatos: string[] = [];
  if (p?.tipo === "evento") candidatos.push(p.episodio, p.temporada);
  else if (p?.tipo === "episodio") candidatos.push(p.temporada);
  else if (p?.tipo === "punto") candidatos.push(p.posicion.episodio, p.posicion.temporada);
  else if (p?.tipo === "arco") candidatos.push(p.temporada);
  return candidatos.find((x) => x && visible.pieza(x)) ?? visible.serie.id;
}
export type Tema = "claro" | "oscuro";

/** La confirmación de «Aplicar» (spec 006, RF-32 a RF-35), junto a la variante desde donde se pidió */
export interface ConfirmarAplicar {
  id: string;
  nombre: string;
  donde: "barra" | "menu" | "versiones";
  /** El resumen, o por qué no se aplica */
  frases: string[];
  /** Lo que se puede pulsar además de «Cancelar»; null = nada */
  boton: "aplicar" | "desbloquear" | null;
  aplicando: boolean;
}

export const AVISO_DESBLOQUEAR_APLICAR = "Cambiar algo de canon es un retcon. Anótalo en Canon y reglas. Se desbloquea hasta cerrar la serie y sigue siendo canon.";

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento local: se volverá a preguntar
  }
}

/** Rutas de la wiki a partir de su raíz, con la forma de la wiki de prueba */
export function rutasWikiPorDefecto(raiz: string): RutasWiki {
  const r = raiz.replace(/\/+$/, "");
  const arriba = carpetaDe(r);
  return {
    raiz: r,
    personajes: `${r}/02_Personajes/Personajes`,
    lugares: `${r}/03_Mundo/Lugares`,
    eras: `${r}/03_Mundo/Eras`,
    timeline: `${r}/03_Mundo/Timeline.md`,
    narrativa: `${r}/01_Narrativa`,
    log: arriba ? `${arriba}/Log.md` : "Log.md",
  };
}

/** Un arrastre soltado mientras se guardaba el movimiento anterior */
export const AVISO_GUARDANDO = "Se estaba guardando el movimiento anterior: vuelve a soltar la escena.";

/** Campos cuya regla solo está en una tarjeta de Tramas, no en Editar (spec 005, RF-13) */
const CAMPOS_DE_TRAMAS = new Set<ClaveCampo>(["arco.quiere", "arco.necesita", "arco.gana", "arco.cambia", "arco.pegamento", "arco.estados"]);

export class EstadoApp {
  raiz = $state<string | null>(leer(CLAVE_RAIZ));
  series = $state<SerieEnLista[]>([]);
  cargando = $state(false);
  error = $state<string | null>(null);
  /** La serie abierta (spec 006: con una variante abierta, `sesion` puede ser otra) */
  sesionSerie = $state.raw<Sesion | null>(null);
  /** La variante «¿Y si…?» abierta, o null (spec 006) */
  variante = $state.raw<SesionVariante | null>(null);
  /** Con una variante abierta: true = se ve la serie de ahora (RF-14) */
  viendoAhora = $state(false);
  /** Lo que hay que decir de la variante: «queda aparcada», «no se guarda»… */
  avisoVariante = $state<string | null>(null);
  /** La confirmación de «Aplicar» abierta, o null (RF-32) */
  confirmarAplicar = $state.raw<ConfirmarAplicar | null>(null);
  /** Aparcando, descartando, aplicando o abriendo una variante: lo demás de la variante espera */
  operando = $state(false);
  /** La nota de la variante abierta cambió fuera durante una operación: se vuelve a abrir al acabar */
  private fueraPendiente = false;

  /** Lo que enseñan las vistas: «Cómo quedaría» si hay una variante abierta, o la serie */
  get sesion(): Sesion | null {
    return this.variante && !this.viendoAhora ? this.variante : this.sesionSerie;
  }
  /** Sube cada vez que cambia la serie abierta: las vistas lo leen para redibujar */
  version = $state(0);
  vista = $state<Vista>("serie");
  /** Nivel del visor (spec 002); en memoria, nunca en disco */
  nivel = $state<Nivel>(NIVEL_SERIE);
  /** La lente (spec 010): en memoria, nunca en disco (RF-6, RF-11b) */
  lente = $state.raw<Lente | null>(null);
  /** Por qué se quitó la lente sola (RF-10) */
  avisoLente = $state<string | null>(null);
  private cacheLente: { sesion: Sesion; version: number; lente: Lente; wiki: number; rel: Relacion } | null = null;

  /** Lo relacionado con la lente en lo que se ve; null sin lente */
  get relacionLente(): Relacion | null {
    const s = this.sesion;
    const l = this.lente;
    const v = this.version;
    if (!s || !l) return null;
    const c = this.cacheLente;
    if (c && c.sesion === s && c.version === v && c.lente === l && c.wiki === s.wiki.lectura) return c.rel;
    const rel = relacion(s.modelo, alias(s.wiki), l);
    this.cacheLente = { sesion: s, version: v, lente: l, wiki: s.wiki.lectura, rel };
    return rel;
  }

  /** El nombre de la lente para la pastilla y los avisos: el último que tuvo, aunque ya no exista */
  nombreLente = $state("");

  private nombreDe(l: Lente): string {
    const s = this.sesion;
    if (!s || l.tipo === "personaje") return l.tipo === "personaje" ? l.nombre : "";
    const visto = s.modelo.pieza(l.id) ? s.modelo : this.variante && this.sesionSerie?.modelo.pieza(l.id) ? this.sesionSerie.modelo : this.variante?.modelo;
    return nombreLente(visto ?? s.modelo, l);
  }

  /** Pone la lente y quita la que hubiera (RF-3) */
  ponerLente(l: Lente) {
    // Puesta desde un alias («K»), la pastilla dice el nombre del personaje
    const s = this.sesion;
    if (s && l.tipo === "personaje") l = { ...l, nombre: personajesDeSerie(s.modelo, s.wiki).get(l.clave)?.nombre ?? l.nombre };
    this.lente = l;
    this.avisoLente = null;
    this.nombreLente = this.nombreDe(l);
  }

  quitarLente() {
    this.lente = null;
    this.avisoLente = null;
  }

  /**
   * Si el objetivo ya no existe (en lo que se ve ni, con variante, en el otro
   * lado), quita la lente y dice por qué (RF-10). Un personaje solo se
   * comprueba con la wiki leída: mientras se lee, sus fichas aún no están.
   */
  revisarLente() {
    const s = this.sesion;
    const l = this.lente;
    if (!s || !l) return;
    if (l.tipo === "personaje" && !s.wiki.lectura) return;
    const otro = this.variante ? (this.sesion === this.variante ? this.sesionSerie : this.variante) : null;
    if (existeLente(s.modelo, otro?.modelo ?? null, s.wiki, l)) {
      this.nombreLente = this.nombreDe(l);
      return;
    }
    // La wiki releída con alias nuevos cambia la clave del mismo personaje
    if (l.tipo === "personaje") {
      const nueva: Lente = { ...l, clave: clavePersonaje(alias(s.wiki), l.nombre) };
      if (nueva.clave !== l.clave && existeLente(s.modelo, otro?.modelo ?? null, s.wiki, nueva)) {
        this.ponerLente(nueva);
        return;
      }
    }
    this.lente = null;
    this.avisoLente = `Se quitó la lente: ${this.nombreLente} ya no está en la serie`;
  }
  /** Lo abierto que Esc cierra antes de subir de nivel */
  readonly capas = new Capas();
  /** La pizarra libre de la serie abierta (spec 012) */
  readonly pizarra = new EstadoPizarra(this);
  /** El guion de las escenas de la serie abierta (spec 013) */
  readonly guion = new EstadoGuion(this);
  readonly mundo = new EstadoMundo(this);
  readonly desglose = new EstadoDesglose(this);
  private revisionPendiente = false;
  /** Id de la pieza elegida (la que enseña el panel derecho) */
  seleccion = $state<string | null>(null);
  pestana = $state<Pestana>("editar");
  /** Lo que la pestaña Ficha no pudo guardar al cambiar de pieza, vista o serie (spec 009, RF-37c) */
  avisoFicha = $state<string | null>(null);
  tema = $state<Tema | null>(leer(CLAVE_TEMA) as Tema | null);

  private quitarOyente: (() => void) | null = null;

  constructor(
    private readonly fs: Fs,
    private readonly equipo: () => Promise<string>,
  ) {
    this.aplicarTema();
  }

  get almacen(): Almacen | null {
    return this.raiz ? new Almacen(limitarBorrado(this.fs, this.raiz), this.raiz) : null;
  }

  async ponerRaiz(ruta: string | null) {
    this.raiz = ruta;
    guardar(CLAVE_RAIZ, ruta);
    await this.listar();
  }

  async listar() {
    const almacen = this.almacen;
    if (!almacen) return;
    this.cargando = true;
    this.error = null;
    try {
      this.series = await almacen.listarSeries();
    } catch (e) {
      this.series = [];
      this.error = `No se puede leer la carpeta ${this.raiz}: ${(e as Error).message}`;
    } finally {
      this.cargando = false;
    }
  }

  async abrir(carpeta: string) {
    const almacen = this.almacen;
    if (!almacen) return;
    this.error = null;
    this.cargando = true;
    try {
      await this.cerrar();
      const s = await Sesion.abrir(almacen, carpeta, await this.equipo());
      this.quitarOyente = s.alCambiar(() => {
        this.version++;
        this.programarRevision();
      });
      this.sesionSerie = s;
      s.alCambiarVariantes = (ids) => {
        if (this.variante && ids.includes(this.variante.datos.id)) this.porFuera();
      };
      // Ctrl Z / Ctrl Y de un «Aplicar»: la variante cambia de lista (RF-38)
      s.alVolverVariante = () => this.version++;
      // Una variante que se quedó sin cambios (cierre a medias) no deja rastro (RF-26)
      for (const [id, c] of [...s.variantes.lista]) if (!c.piezas.length && c.estado === "aparcada") await s.variantes.aPapelera(id).catch(() => undefined);
      this.vista = "serie";
      this.nivel = NIVEL_SERIE;
      this.seleccion = s.modelo.serie.id;
      this.pestana = "editar";
      this.filtroHistoria = "";
      this.pestanaAnalisis = "presencia";
      this.temporadaAnalisis = "";
      this.avisoHistoria = null;
      this.anuncioHistoria = "";
      // «Si lo dejas así…» compara desde aquí (spec 005, RF-23)
      s.empezarComparacion(s.modelo.serie.id);
      this.cargarPlantillasVista(s);
      this.version++;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.cargando = false;
    }
  }

  /** El arco que enseña el taller (paso 2) aunque luego se elija otra pieza */
  arcoActual = $state<string | null>(null);
  /** La caja de Buscar o crear (Ctrl K) está abierta */
  buscando = $state(false);
  /** El buscador de la lente está abierto (spec 010, RF-1) */
  buscandoLente = $state(false);
  /** El menú contextual con «Enfocar» (spec 010, RF-2): dónde sale y a qué vuelve el foco al cerrarlo */
  menuLente = $state.raw<{ lente: Lente; x: number; y: number; volver: HTMLElement | null } | null>(null);
  /** Pieza recién creada cuyo título hay que enfocar en el panel (T5.2) */
  enfocar = $state<string | null>(null);
  /** La temporada que enseña el paso 3 y la rejilla */
  temporadaActual = $state<string | null>(null);

  /** Regla que la pestaña Guía tiene que señalar al abrirse; la consume ella (spec 004, RF-16) */
  reglaSenalada = $state<string | null>(null);

  /** «Ver en la Guía»: elige la pieza en la pestaña Guía, sin cambiar de vista, con esa regla señalada */
  verRegla(piezaId: string, reglaId: string) {
    if (this.seleccion !== piezaId) this.elegir(piezaId, "guia");
    else this.pestana = "guia";
    this.reglaSenalada = reglaId;
  }

  /**
   * Elige una pieza para el panel derecho. La pestaña que estaba sigue abierta
   * (spec 005, RF-24); otra pieza empieza la comparación de cero.
   */
  elegir(id: string | null, pestana: Pestana = this.pestana) {
    if (id !== this.seleccion) void this.guardarFicha();
    const otra = id !== this.seleccion || !this.sesion?.comparacion;
    this.seleccion = id;
    this.pestana = pestana;
    if (otra && this.sesion) {
      this.sesion.empezarComparacion(id);
      // El visor deja las marcas de la comparación anterior (RF-24, RF-29)
      this.version++;
    }
    const m = this.sesion?.modelo;
    if (!id || !m) return;
    if (m.arcos.has(id)) this.arcoActual = id;
    // La temporada de la pieza elegida pasa a ser la que enseña el paso 3
    const p = m.pieza(id);
    const temporada =
      p?.tipo === "temporada" ? p.id : p?.tipo === "episodio" || p?.tipo === "evento" ? p.temporada : p?.tipo === "arco" && p.nivel === "temporada" ? p.temporada : "";
    if (temporada && m.temporadas.has(temporada)) this.temporadaActual = temporada;
  }

  /**
   * Pulsar una escena en la rejilla o en la línea (spec 009, RF-33b): con «Si
   * lo dejas así…» abierta no cambia la pieza que se compara, como bajar en el
   * visor; fuera de esa pestaña la elige.
   */
  pulsarEscena(id: string) {
    if (this.pestana !== "efectos" || !this.sesion?.comparacion) this.elegir(id);
  }

  /** Ver otro arco en Tramas (RF-33b): con «Si lo dejas así…» abierta, el panel sigue con su pieza */
  verArco(id: string) {
    if (this.pestana !== "efectos" || !this.sesion?.comparacion) this.elegir(id);
    else this.arcoActual = id;
  }

  /**
   * Desde el desglose (spec 014, RF-6): la escena se abre en «Guion» si tiene guion; si no, en el panel.
   * No cambia ninguna pieza.
   */
  irAGuionDe(id: string, conGuion: boolean) {
    const m = this.sesionSerie?.modelo;
    const ev = m?.eventos.get(id);
    if (!m || !ev) return;
    if (!conGuion) {
      this.irA(id);
      return;
    }
    this.guion.enPantalla = ev.episodio && m.episodios.has(ev.episodio) ? { tipo: "episodio", id: ev.episodio } : { tipo: "bandeja", temporada: ev.temporada };
    this.guion.pendienteIr = id;
    this.cambiarVista("guion");
  }

  /** Lleva a la vista donde vive una pieza y la elige (desde un aviso de Comprobar) */
  irA(id: string, pestana: Pestana = this.pestana) {
    const m = this.sesion?.modelo;
    const p = m?.pieza(id);
    if (!m || !p) return;
    let vista: Vista;
    if (p.tipo === "serie" || p.tipo === "punto") vista = "serie";
    else if (p.tipo === "arco") vista = "tramas";
    else if (p.tipo === "evento") vista = p.episodio && m.episodios.has(p.episodio) ? "episodios" : "temporada";
    else vista = "temporada";
    // Primero se elige (pone la temporada de la pieza) y después la vista lleva el visor
    this.elegir(id, pestana);
    this.cambiarVista(vista);
  }

  /** El episodio marcado en Episodios: el del nivel del visor */
  get episodioActual(): string | null {
    return this.nivel.tipo === "episodio" ? this.nivel.episodio : null;
  }

  /**
   * Cambia de vista (pasos, menú, avisos). Serie, Temporada y Episodios llevan
   * el visor a su nivel; Tramas, Wiki y Sincronización lo dejan (RF-21, RF-22).
   */
  cambiarVista(v: Vista) {
    if (v !== this.vista) void this.guardarFicha();
    // La pizarra se carga al entrar y guarda lo pendiente al salir (spec 012)
    if (v === "pizarra" && this.vista !== "pizarra") void this.pizarra.abrir();
    else if (v !== "pizarra" && this.vista === "pizarra") void this.pizarra.alSalir();
    // El guion se carga al entrar y guarda lo pendiente al salir (spec 013)
    if (v === "guion" && this.vista !== "guion") void this.guion.abrir();
    else if (v !== "guion" && this.vista === "guion") void this.guion.alSalir();
    // El mundo cuenta sus fichas al entrar (spec 015)
    if (v === "wiki" && this.vista !== "wiki") void this.mundo.entrar();
    this.vista = v;
    const m = this.sesion?.modelo;
    if (m) this.nivel = nivelAlCambiarVista(m, v, this.temporadaActual, this.nivel);
  }

  /** Abre la ficha editable de un personaje, lugar… por su nombre (spec 015, RF-10): desde el guion, el visor, la línea */
  async abrirFichaDelMundo(nombre: string): Promise<boolean> {
    // Si no hay ficha, no se sale de donde se está (spec 019, RF-4)
    const f = await this.mundo.buscarPorNombre(nombre);
    if (!f) return false;
    this.cambiarVista("wiki");
    return this.mundo.abrirFicha(f.ruta, f.categoria);
  }

  /** Abre en Mundo la ficha de esa ruta (relativa al vault): la elegida, sin volver a buscar por nombre (spec 019, RF-5) */
  abrirFichaPorRuta(ruta: string): Promise<boolean> {
    this.cambiarVista("wiki");
    return this.mundo.abrirFicha(ruta);
  }

  /**
   * Crea una ficha del mundo con ese nombre y la abre en Mundo (spec 019, RF-4).
   * Con un nombre que no vale como fichero, no sale de donde está: devuelve false.
   */
  async crearFichaDelMundo(categoria: "personaje" | "lugar", nombre: string): Promise<boolean> {
    if (!nombreMundoValido(nombre.trim()) || this.mundo.soloLectura) return false;
    this.cambiarVista("wiki");
    return this.mundo.crear(categoria, nombre);
  }

  /** Vuelve a abrir la serie en la misma vista (tras renombrar una ficha, que toca notas por debajo) */
  async recargarSerie(): Promise<void> {
    const s = this.sesionSerie;
    if (!s) return;
    const vista = this.vista;
    await this.abrir(s.carpeta);
    this.cambiarVista(vista);
  }

  /** Cambia la temporada que enseñan Temporada y Episodios (selector, RF-21) */
  cambiarTemporada(id: string) {
    this.temporadaActual = id;
    if (this.vista === "temporada" || this.vista === "episodios") this.nivel = { tipo: "temporada", temporada: id };
  }

  /**
   * Lleva el visor a un nivel y enseña debajo su vista (RF-20). Al bajar se
   * elige en el panel la pieza del nivel (RF-11); al subir, no.
   */
  irANivel(n: Nivel, elegir = true) {
    const m = this.sesion?.modelo;
    if (!m) return;
    const v = nivelValido(m, n);
    this.nivel = v;
    const nueva = vistaDeNivel(v);
    // Salir de la pizarra por otro camino que cambiarVista también guarda lo pendiente
    if (this.vista === "pizarra") void this.pizarra.alSalir();
    if (this.vista === "guion") void this.guion.alSalir();
    this.vista = nueva;
    if (v.tipo !== "serie") this.temporadaActual = v.temporada;
    if (elegir) this.elegir(v.tipo === "serie" ? m.serie.id : v.tipo === "temporada" ? v.temporada : v.episodio);
  }

  /**
   * Pinchar o pulsar Intro en una columna del visor (RF-11, RF-12). Con «Si lo
   * dejas así…» abierta, bajar no cambia la pieza del panel; una escena, sí
   * (spec 005, RF-25).
   */
  bajar(col: { tipo: "temporada" | "episodio" | "evento"; id: string }) {
    const m = this.sesion?.modelo;
    if (!m) return;
    // Sin comparación (la abierta ya no existe), nada que conservar: se elige como siempre
    const elegir = this.pestana !== "efectos" || !this.sesion?.comparacion;
    if (col.tipo === "evento") this.elegir(col.id);
    else if (col.tipo === "temporada") this.irANivel({ tipo: "temporada", temporada: col.id }, elegir);
    else {
      const ep = m.episodios.get(col.id);
      if (ep) this.irANivel({ tipo: "episodio", temporada: ep.temporada, episodio: ep.id }, elegir);
    }
  }

  // --- Plantillas de estructura (spec 011) ---

  /** Apartado de plantilla que abrir y enfocar en Editar de la temporada; lo consume `ApartadoPlantilla` (RF-41) */
  apartadoTemporada = $state<{ temporada: string; plantilla: IdPlantilla } | null>(null);

  /** La plantilla a la vista de cada temporada, recordada en este equipo (RF-42); sin entrada, «Ninguna» */
  plantillasVista = $state.raw(new Map<string, IdPlantilla>());

  private cargarPlantillasVista(s: Sesion) {
    const clave = clavePlantillaVista(s.carpeta);
    const leidas = leerPlantillasVista(leer(clave));
    const enVariante = (t: string) => [...s.variantes.lista.values()].some((c) => c.piezas.includes(t));
    const limpias = limpiarPlantillasVista(leidas, (t) => s.modelo.temporadas.has(t) || enVariante(t));
    if (limpias.size !== leidas.size) guardar(clave, escribirPlantillasVista(limpias));
    this.plantillasVista = limpias;
  }

  plantillaVista(temporada: string): IdPlantilla | null {
    return this.plantillasVista.get(temporada) ?? null;
  }

  ponerPlantillaVista(temporada: string, plantilla: IdPlantilla | null) {
    const s = this.sesionSerie;
    if (!s) return;
    const m = new Map(this.plantillasVista);
    if (plantilla) m.set(temporada, plantilla);
    else m.delete(temporada);
    this.plantillasVista = m;
    guardar(clavePlantillaVista(s.carpeta), escribirPlantillasVista(m));
  }

  /** Abre la temporada en Editar, en el apartado de esa plantilla (RF-41) */
  abrirApartado(temporada: string, plantilla: IdPlantilla) {
    this.apartadoTemporada = { temporada, plantilla };
    this.elegir(temporada, "editar");
  }

  // --- «Si lo dejas así…» (spec 005) ---

  /** Campo al que llevar el foco; lo consume el `ConGuia` de esa pieza y clave (RF-13) */
  enfocarCampo = $state<{ pieza: string; clave: ClaveCampo } | null>(null);

  /** «Ir a la pieza»: la elige en Editar, donde vive, y la comparación empieza de cero (RF-14, RF-24) */
  irAPieza(id: string) {
    this.irA(id, "editar");
  }

  /** «Ir al campo» (RF-13): en Editar, o en su tarjeta de Tramas si solo está allí */
  irAlCampo(pieza: string, clave: ClaveCampo) {
    if (CAMPOS_DE_TRAMAS.has(clave)) {
      this.arcoActual = pieza;
      this.cambiarVista("tramas");
    } else this.pestana = "editar";
    this.enfocarCampo = { pieza, clave };
  }

  /**
   * «Volver a como estaba» (RF-18 a RF-21). Si la abierta era nueva, ha vuelto
   * a la papelera: se elige la serie y la comparación empieza con ella (RF-18b).
   */
  /** «Volver a como estaba» en marcha: el botón, desactivado (spec 005, RF-20) */
  volviendo = $state(false);

  async volverAComoEstaba() {
    const s = this.sesion;
    if (!s || this.volviendo) return;
    this.volviendo = true;
    try {
      const r = await s.volverAComoEstaba();
      if (r?.eraNueva && this.sesion === s) this.elegir(s.modelo.serie.id);
    } finally {
      this.volviendo = false;
    }
  }

  /** Sube un nivel (Esc o miga); false si ya está en la serie (RF-15, RF-18) */
  subirNivel(): boolean {
    const arriba = subir(this.nivel);
    if (!arriba) return false;
    this.irANivel(arriba, false);
    return true;
  }

  // --- Captura rápida, ventana «Nueva pieza» y tostada (spec 002) ---

  /** La captura rápida de ideas está abierta */
  capturando = $state(false);
  /** Por qué no se guardó la idea (el texto se queda en la captura) */
  errorCaptura = $state<string | null>(null);
  private guardandoIdea = false;
  private ultimaIdea = $state<{ texto: string; idea: string } | null>(null);
  /** Pieza que se está creando en la ventana «Nueva pieza» */
  nueva = $state<Exclude<QueCrear, "idea"> | null>(null);
  errorNueva = $state<string | null>(null);
  /** Acto con el que se abre la ventana para una escena («+ Escena» de una columna, spec 003 RF-13) */
  actoNueva = $state<ActoVisor>("");

  /** Lo que dice la tostada tras guardar una idea; se va si la idea ya no existe (RF-43) */
  get tostada(): { texto: string; idea: string } | null {
    void this.version;
    const t = this.ultimaIdea;
    return t && this.sesionSerie?.modelo.pieza(t.idea) ? t : null;
  }

  quitarTostada() {
    this.ultimaIdea = null;
  }

  /** Abre la captura; false si no hay serie o ya estaba abierta (RF-36, RF-37) */
  abrirCaptura(): boolean {
    if (!this.sesion || this.capturando) return false;
    this.capturando = true;
    this.errorCaptura = null;
    return true;
  }

  cerrarCaptura() {
    this.capturando = false;
    this.errorCaptura = null;
  }

  /**
   * Guarda la idea donde diga el nivel en este momento (RF-38 a RF-41, RF-46).
   * true si la captura queda cerrada; false si se queda abierta con el aviso.
   */
  async guardarIdea(texto: string): Promise<boolean> {
    // Ctrl I va siempre a la serie, también con una variante abierta (spec 006, RF-8b)
    const s = this.sesionSerie;
    // Un Intro que llega con la captura ya cerrada no crea nada
    if (!s || !this.capturando || this.guardandoIdea) return false;
    this.guardandoIdea = true;
    try {
      const r = await this.aplicarIdea(s, texto, this.nivel);
      if (!r) {
        this.cerrarCaptura();
        return true;
      }
      if ("error" in r) {
        this.errorCaptura = r.error;
        return false;
      }
      this.cerrarCaptura();
      this.ponerTostada(r);
      return true;
    } finally {
      this.guardandoIdea = false;
    }
  }

  /**
   * Crea la idea en la serie principal según el nivel (RF-38 a RF-41, RF-46):
   * lo comparten Ctrl I y «Pasar a idea» de la pizarra. null = texto vacío.
   */
  private async aplicarIdea(s: Sesion, texto: string, nivel: Nivel): Promise<{ id: string; donde: string; recortada: boolean } | { error: string } | null> {
    // El episodio del nivel puede existir solo en la variante: la idea sube a su temporada
    const r = crearIdea(s.modelo, nivelValido(s.modelo, nivel), texto, (id) => s.estaBloqueada(id));
    if (!r || "error" in r) return r;
    if (!(await s.aplicar(r.cambio, true, undefined, { enLectura: true }))) return { error: s.avisosCambio[0] ?? "No se pudo guardar la idea." };
    return { id: r.pieza.id, donde: r.donde, recortada: r.recortada };
  }

  private ponerTostada(r: { id: string; donde: string; recortada: boolean }) {
    const donde = this.variante ? `${r.donde} · Apuntada en la serie (fuera de la variante)` : r.donde;
    this.ultimaIdea = { texto: r.recortada ? `${donde} · Recortada a 300 caracteres` : donde, idea: r.id };
  }

  /**
   * «Pasar a idea» de una nota de la pizarra (spec 012, RF-16 a RF-20): crea la
   * idea en la bandeja de la temporada en marcha (o la última) y deja junto a la
   * nota su tarjeta unida con una flecha. Si la nota ya tiene una tarjeta nacida
   * de ella y su pieza existe, no crea otra: dice cuál es para abrirla.
   */
  async pasarAIdea(notaId: string, titulo: string): Promise<{ idea: string; nueva: boolean; donde: string } | { error: string }> {
    const s = this.sesionSerie;
    const pz = this.pizarra;
    if (!s || !pz.cargada) return { error: "La pizarra no está abierta." };
    if (pz.soloLectura) return { error: "La pizarra está en solo lectura." };
    const nota = pz.pizarra.elementos.find((e) => e.id === notaId && e.tipo === "nota");
    if (!nota) return { error: "Esa nota ya no está en la pizarra." };
    const previa = pz.pizarra.elementos.find((e) => e.tipo === "tarjeta" && e.origen === notaId && s.modelo.pieza(e.pieza));
    if (previa && previa.tipo === "tarjeta") return { idea: previa.pieza, nueva: false, donde: "Ya tiene su idea" };
    if (this.guardandoIdea) return { error: "Ya se está creando una idea." };
    this.guardandoIdea = true;
    try {
      const r = await this.aplicarIdea(s, titulo, NIVEL_SERIE);
      if (!r) return { error: "Escribe un título para la idea." };
      if ("error" in r) return r;
      this.ponerTostada(r);
      // La pieza ya existe pase lo que pase con la pizarra (RF-20)
      const t = pz.anadirTarjetaUnida(notaId, r.id);
      if ("error" in t) return { idea: r.id, nueva: true, donde: `${r.donde}. ${t.error}` };
      return { idea: r.id, nueva: true, donde: r.donde };
    } finally {
      this.guardandoIdea = false;
    }
  }

  /** Deshacer de la tostada (RF-43) */
  async deshacerIdea() {
    const t = this.ultimaIdea;
    this.ultimaIdea = null;
    if (t) await this.sesionSerie?.deshacerCreacion(t.idea);
  }

  abrirNueva(que: Exclude<QueCrear, "idea">, opciones: { acto?: ActoVisor } = {}) {
    this.nueva = que;
    this.errorNueva = null;
    this.actoNueva = opciones.acto ?? "";
  }

  cerrarNueva() {
    this.nueva = null;
    this.errorNueva = null;
  }

  /** Crear en la ventana «Nueva pieza»: crea en el nivel actual, cierra y la elige (RF-31 a RF-33) */
  async crearNueva(datos: DatosNueva): Promise<boolean> {
    const s = this.sesion;
    const que = this.nueva;
    if (!s || !que) return false;
    const bloqueada = (id: string) => s.estaBloqueada(id);
    if (opcionesNuevo(s.modelo, this.nivel, bloqueada).find((o) => o.que === que)?.bloqueo) {
      this.errorNueva = AVISO_CANON;
      return false;
    }
    let creada: ReturnType<typeof crearPieza>;
    try {
      creada = crearPieza(s.modelo, this.nivel, que, { acto: this.actoNueva, ...datos });
    } catch (e) {
      // El nivel cambió con la ventana abierta (por ejemplo, Esc desde fuera)
      this.errorNueva = e instanceof Error ? e.message : String(e);
      return false;
    }
    const { pieza, cambio } = creada;
    if (!(await s.aplicar(cambio))) {
      this.errorNueva = s.avisosCambio[0] ?? "No se pudo crear.";
      return false;
    }
    this.cerrarNueva();
    // Si mientras tanto se cambió de sesión (aparcar, Ver ahora), no se elige en la otra
    if (this.sesion === s) this.elegir(pieza.id, "editar");
    return true;
  }

  // --- Mover escenas en el visor (spec 003) ---

  /** Por qué no se ha movido la escena (canon, cambió fuera); el visor lo enseña */
  avisoVisor = $state<string | null>(null);
  /** Dónde ha quedado la escena movida, para la zona aria-live (RF-22) */
  anuncioVisor = $state("");
  /** Se está arrastrando una tarjeta del visor: Esc no sube de nivel (RF-26) */
  arrastrando = $state(false);
  private moviendo = false;
  /** Llegó otro movimiento mientras se guardaba uno: se dice al acabar, donde se pidió */
  private ignorado: "visor" | "historia" | null = null;
  /** Las pulsaciones de Alt + flecha, una tras otra (RF-21) */
  private colaTeclas: Promise<unknown> = Promise.resolve();

  /**
   * Mueve la escena a `puesto` de `acto` del episodio (RF-17 a RF-23, RF-31).
   * En serie: si llega otro con uno pendiente, se ignora (no se calcula sobre
   * el modelo viejo). Sin clave: cada movimiento es un paso de deshacer (RF-28).
   */
  async moverEscena(id: string, episodio: string, acto: ActoVisor, puesto?: number): Promise<boolean> {
    const s = this.sesion;
    if (!s) return false;
    if (this.moviendo) {
      this.ignorado = "visor";
      return false;
    }
    const porque = porQueNoSeMueve(s.modelo, id, episodio, (x) => s.estaBloqueada(x));
    if (porque) {
      this.avisoVisor = porque;
      return false;
    }
    this.moviendo = true;
    try {
      const cambio = colocarEscena(s.modelo, id, episodio, acto, puesto);
      if (!cambio.guardar.length) return false;
      if (!(await s.aplicar(cambio))) {
        this.avisoVisor = s.avisosCambio[0] ?? "No se ha movido nada.";
        return false;
      }
      this.avisoVisor = null;
      if (this.sesion === s) this.anuncioVisor = anuncio(s.modelo, id);
      return true;
    } finally {
      this.acabarMovimiento();
    }
  }

  private acabarMovimiento() {
    this.moviendo = false;
    if (this.ignorado === "visor") this.avisoVisor = AVISO_GUARDANDO;
    else if (this.ignorado === "historia") this.avisoHistoria = AVISO_GUARDANDO;
    this.ignorado = null;
  }

  /**
   * Alt + flecha sobre una tarjeta (RF-18 a RF-20). Cada pulsación espera a
   * la anterior y calcula su paso sobre lo ya movido: un movimiento por pulsación.
   */
  moverConTecla(id: string, tecla: Tecla): Promise<boolean> {
    const turno = this.colaTeclas.then(() => {
      const m = this.sesion?.modelo;
      const paso = m ? pasoTeclado(m, id, tecla) : null;
      return paso ? this.moverEscena(id, paso.episodio, paso.acto, paso.puesto) : false;
    });
    this.colaTeclas = turno.catch(() => false);
    return turno;
  }

  /** De la bandeja a un episodio: al final de su acto (RF-31) */
  async llevarAEpisodio(id: string, episodio: string): Promise<boolean> {
    const ev = this.sesion?.modelo.eventos.get(id);
    return ev ? this.moverEscena(id, episodio, ev.acto) : false;
  }

  quitarAvisoVisor() {
    this.avisoVisor = null;
  }

  // --- Análisis (spec 010) ---

  /** La pestaña de «Análisis», mientras la serie siga abierta (RF-13) */
  pestanaAnalisis = $state<"presencia" | "sabe" | "esquema" | "causas" | "desglose">("presencia");
  /** La temporada elegida en «Análisis»: al abrir, la del visor; después no lo sigue (RF-14) */
  temporadaAnalisis = $state("");

  /** La temporada que enseña «Análisis»: la elegida o, si ya no existe, la primera; "" sin temporadas */
  get temporadaDeAnalisis(): string {
    const m = this.sesion?.modelo;
    if (!m) return "";
    return m.temporadas.has(this.temporadaAnalisis) ? this.temporadaAnalisis : (c.temporadasEnOrden(m)[0]?.id ?? "");
  }

  async abrirAnalisis(): Promise<void> {
    const m = this.sesion?.modelo;
    if (m) this.temporadaAnalisis = this.nivel.tipo === "serie" ? (c.temporadasEnOrden(m)[0]?.id ?? "") : this.nivel.temporada;
    this.cambiarVista("analisis");
    // Presencia necesita las fichas de personaje (alias)
    await this.sesion?.leerWiki();
    this.version++;
  }

  // --- Línea de la historia (spec 009) ---

  /** La temporada que enseña la línea, o "" para toda la serie; solo mientras la serie siga abierta (RF-15) */
  filtroHistoria = $state("");
  /** Por qué no se ha movido la escena, o en qué borde está (RF-20, RF-29) */
  avisoHistoria = $state<string | null>(null);
  /** A dónde ha pasado la escena, para el aviso visible y aria-live (RF-29) */
  anuncioHistoria = $state("");
  /** La escena y la columna del anuncio: con Ctrl Z deja de ser verdad y no se enseña */
  private anuncioDe: { id: string; columna: IdColumna } | null = null;

  /** El anuncio, mientras la escena siga en la columna que dice */
  anuncioVigente(): string {
    const a = this.anuncioDe;
    if (!this.anuncioHistoria || !a) return "";
    return columnaDeEscena(this.columnasLinea(), a.id)?.id === a.columna ? this.anuncioHistoria : "";
  }

  /** Las columnas de lo que se ve ahora, con el filtro si su temporada sigue existiendo */
  columnasLinea(): Columna[] {
    const s = this.sesion;
    if (!s) return [];
    const filtro = s.modelo.temporadas.has(this.filtroHistoria) ? this.filtroHistoria : "";
    return columnasHistoria(s.modelo, s.wiki, filtro);
  }

  /** Abre la línea sin cambiar el nivel del visor; relee la wiki para traer las épocas de Obsidian (RF-17) */
  async abrirHistoria(): Promise<void> {
    this.cambiarVista("historia");
    await this.sesion?.leerWiki();
    this.version++;
  }

  /**
   * Pasa la escena a la columna `destino` (RF-18 a RF-29): solo cambia `mundo`,
   * un paso de deshacer por movimiento. `lectura` es la de la wiki cuando
   * empezó el arrastre: si se releyó entretanto, no se mueve.
   */
  async cambiarEpoca(id: string, destino: IdColumna, lectura?: number): Promise<boolean> {
    const s = this.sesion;
    if (!s) return false;
    if (this.moviendo) {
      this.ignorado = "historia";
      return false;
    }
    if (lectura !== undefined && lectura !== s.wiki.lectura) {
      this.avisoHistoria = "La wiki cambió mientras arrastrabas: no se ha movido.";
      return false;
    }
    const columnas = this.columnasLinea();
    const col = columnas.find((x) => x.id === destino);
    if (!col) {
      this.avisoHistoria = "Esa época ya no está en la wiki: no se ha movido.";
      return false;
    }
    const porque = porQueNoSeCambia(s.modelo, id, col, s.estaBloqueada(id));
    if (porque) {
      this.avisoHistoria = porque;
      return false;
    }
    this.moviendo = true;
    try {
      const cambio = cambioDeEpoca(s.modelo, columnas, id, col);
      if (!cambio?.guardar.length) return false;
      if (!(await s.aplicar(cambio))) {
        this.avisoHistoria = s.avisosCambio[0] ?? "No se ha movido nada.";
        return false;
      }
      this.avisoHistoria = null;
      if (this.sesion === s) {
        this.anuncioHistoria = anuncioEpoca(col);
        this.anuncioDe = { id, columna: col.id };
      }
      return true;
    } finally {
      this.acabarMovimiento();
    }
  }

  /** Alt + flecha en la línea (RF-19, RF-20): una pulsación tras otra, como en el visor */
  moverEpocaConTecla(id: string, dir: "izq" | "der"): Promise<boolean> {
    const turno = this.colaTeclas.then(() => {
      const paso = pasoHistoria(this.columnasLinea(), id, dir);
      if ("borde" in paso) {
        this.avisoHistoria = paso.borde;
        return false;
      }
      return this.cambiarEpoca(id, paso.columna.id);
    });
    this.colaTeclas = turno.catch(() => false);
    return turno;
  }

  quitarAvisoHistoria() {
    this.avisoHistoria = null;
  }

  /** Lo que se ve cambia de lado (variante, «Ahora»): los avisos de la línea eran del otro */
  private callarHistoria() {
    this.avisoHistoria = null;
    this.anuncioHistoria = "";
  }

  /** Tras un cambio del modelo, una sola vez y sin estados a medias (RF-24) */
  private programarRevision() {
    if (this.revisionPendiente) return;
    this.revisionPendiente = true;
    queueMicrotask(() => {
      this.revisionPendiente = false;
      this.revisarNivel();
      this.revisarLente();
    });
  }

  /** Si la pieza del nivel ya no vale, sube al primer nivel válido (RF-24) */
  revisarNivel() {
    const m = this.sesion?.modelo;
    if (!m) return;
    const v = nivelValido(m, this.nivel);
    if (mismoNivel(v, this.nivel)) return;
    // En Tramas, Wiki o Sincronización la vista se queda (RF-22)
    if (this.vista === "serie" || this.vista === "temporada" || this.vista === "episodios") this.irANivel(v, false);
    else this.nivel = v;
  }

  /**
   * Guarda lo que la pestaña Ficha tiene sin guardar antes de cambiar de pieza,
   * vista o serie, o de abrir una variante (spec 009, RF-37c). Si no puede, lo
   * dice la pestaña o, si ya no está, `avisoFicha`.
   */
  async guardarFicha(): Promise<void> {
    await this.sesionSerie?.fichaPendiente?.();
  }

  async cerrar() {
    const s = this.sesionSerie;
    if (!s) return;
    await this.guardarFicha();
    this.avisoFicha = null;
    // Cerrar la serie (o la app) aparca la variante abierta (RF-27): lo que no se pudo escribir no detiene el cierre
    await this.aparcarYa(false, true);
    this.quitarOyente?.();
    this.quitarOyente = null;
    this.sesionSerie = null;
    this.lente = null;
    this.avisoLente = null;
    this.cacheLente = null;
    this.menuLente = null;
    this.confirmarAplicar = null;
    this.cerrarCaptura();
    this.cerrarNueva();
    this.ultimaIdea = null;
    await s.cerrar();
    this.pizarra.reiniciar();
    this.guion.reiniciar();
    this.mundo.reiniciar();
    this.desglose.reiniciar();
  }

  /** Ctrl Z: con la pizarra a la vista deshace la pizarra; en otra vista, las piezas */
  async deshacerActual() {
    if (this.vista === "pizarra") this.pizarra.deshacer();
    else await this.sesion?.deshacer();
  }

  async rehacerActual() {
    if (this.vista === "pizarra") this.pizarra.rehacer();
    else await this.sesion?.rehacer();
  }

  /** Restaura una instantánea y vuelve a abrir la serie */
  async restaurar(nombre: string) {
    const s = this.sesionSerie;
    // Con una variante abierta no se restaura: es de la serie (spec 006, RF-12)
    if (!s || this.variante) return;
    await s.guardado.vaciar();
    await s.guardadoPizarra.vaciar();
    await s.guardadoGuion.vaciar();
    // La versión que cambió por fuera y la que no se pudo escribir quedan aparte antes de restaurar
    await s.guardadoGuion.salvarLocales().catch(() => undefined);
    await s.instantaneas.restaurar(nombre);
    const carpeta = s.carpeta;
    // La pizarra se relee al volver a entrar: la de la copia, no la de pantalla
    const vista = this.vista === "pizarra" || this.vista === "guion" ? "serie" : this.vista;
    await this.abrir(carpeta);
    this.cambiarVista(vista);
  }

  async volverAInicio() {
    await this.cerrar();
    await this.listar();
  }

  async crearSerie(titulo: string, carpeta: string, wiki: RutasWiki) {
    const almacen = this.almacen;
    if (!almacen) return;
    const nombre = carpeta.trim() || carpetaParaTitulo(titulo);
    if (!rutaRelativaSegura(nombre)) throw new Error("La carpeta de la serie no vale: sin «..», ni rutas absolutas.");
    await almacen.crearSerie(nombre, { titulo: titulo.trim(), wiki });
    // Las carpetas de la wiki, para que Obsidian y el Mundo las encuentren desde el primer día (spec 016)
    await crearCarpetasWiki(almacen.fs, carpetaDe(almacen.raiz), wiki);
    await this.listar();
    await this.abrir(nombre);
  }

  /** Serie nueva en una vault nueva: la carpeta elegida pasa a ser la vault (spec 016, RF-1) */
  async crearSerieEnVaultNueva(titulo: string, carpetaVault: string) {
    const r = await prepararVaultNueva(this.fs, carpetaVault, this.raiz ?? undefined);
    if (!r.ok) throw new Error(r.motivo);
    const antes = this.raiz;
    const nombre = carpetaParaTitulo(titulo);
    if (!nombre) throw new Error("Ponle un título con letras o números.");
    await this.ponerRaiz(r.raiz);
    try {
      await this.crearSerie(titulo, nombre, rutasWikiPorDefecto(`${nombre}/01_Wiki`));
    } catch (e) {
      // Si falla, la app sigue donde estaba
      await this.ponerRaiz(antes);
      throw e;
    }
  }

  // --- «¿Y si…?» (spec 006) ---

  private quitarOyenteVariante: (() => void) | null = null;

  /** «Lado a lado» abierto (RF-23, RF-44): la pieza en dos modelos, con sus títulos */
  ladoALado = $state.raw<{
    pieza: string;
    nombre: string;
    izq: { titulo: string; modelo: Modelo };
    der: { titulo: string; modelo: Modelo };
    /** Etiquetas de los campos que cambiaron también en la serie (choques) */
    enSerie?: Set<string>;
  } | null>(null);

  /** «Lado a lado» de una pieza: con la variante abierta, o con una aparcada (desde «Versiones») */
  async verLadoALado(pieza: string, varianteId?: string): Promise<void> {
    const s = this.sesionSerie;
    if (!s) return;
    const v = this.variante;
    if (v && (!varianteId || varianteId === v.datos.id)) {
      // Los campos que chocan llevan «cambió en la serie» (RF-23)
      const ch = v.choques().find((c) => c.clase === "pieza" && c.id === pieza);
      const enSerie = ch?.clase === "pieza" ? new Set([...ch.soloSerie, ...ch.dosLados]) : undefined;
      this.ladoALado = { pieza, nombre: v.datos.nombre, izq: { titulo: "Ahora", modelo: s.modelo }, der: { titulo: "Cómo quedaría", modelo: v.modelo }, enSerie };
      return;
    }
    if (!varianteId) return;
    try {
      const datos = await s.variantes.leer(varianteId);
      // Una aplicada se ve como «Antes de aplicar» y «Lo que aplicó» (RF-44)
      this.ladoALado =
        datos.estado === "aplicada"
          ? { pieza, nombre: datos.nombre, izq: { titulo: "Antes de aplicar", modelo: modeloAntes(s.modelo, datos) }, der: { titulo: "Lo que aplicó", modelo: modeloQuedaria(s.modelo, datos) } }
          : { pieza, nombre: datos.nombre, izq: { titulo: "Ahora", modelo: s.modelo }, der: { titulo: "Cómo quedaría", modelo: modeloQuedaria(s.modelo, datos) } };
    } catch (e) {
      this.avisoVariante = `No se puede leer la variante: ${(e as Error).message}`;
    }
  }

  cerrarLadoALado() {
    this.ladoALado = null;
  }

  private cacheChoques = new Map<string, Promise<number>>();

  /** Cuántos choques tiene una variante aparcada (menú y «Versiones», RF-29); se recuerda por versión de la serie */
  choquesDeAparcada(id: string): Promise<number> {
    const s = this.sesionSerie;
    if (!s) return Promise.resolve(0);
    if (this.variante?.datos.id === id) return Promise.resolve(this.variante.choques().length);
    const c = s.variantes.lista.get(id);
    const clave = `${id}|${c?.cambiada ?? ""}|${s.modelo.version}`;
    let r = this.cacheChoques.get(clave);
    if (!r) {
      r = s.variantes
        .leer(id)
        .then((d) => choques(d, s.modelo, modeloQuedaria(s.modelo, d)).length)
        .catch(() => 0);
      if (this.cacheChoques.size > 200) this.cacheChoques.clear();
      this.cacheChoques.set(clave, r);
    }
    return r;
  }

  /**
   * «Aplicar» (RF-32 a RF-35): prepara la confirmación con el resumen. Con
   * choques no se ofrece: desde la barra se abre la pestaña «¿Y si…?»; desde el
   * menú o «Versiones» se dice en la confirmación (RF-33).
   */
  async pedirAplicar(id: string, donde: ConfirmarAplicar["donde"]): Promise<void> {
    const s = this.sesionSerie;
    if (!s) return;
    const abierta = this.variante?.datos.id === id ? this.variante : null;
    let temporal: SesionVariante | null = null;
    try {
      // Una aparcada se mira sin abrirla: sus diferencias y choques salen de una sesión de paso
      const v = abierta ?? (temporal = await SesionVariante.abrirSobre(s, await s.variantes.leer(id)));
      const base = { id, nombre: v.datos.nombre, donde, aplicando: false };
      const ch = v.choques().length;
      if (ch && abierta) {
        this.confirmarAplicar = null;
        this.pestana = "ysi";
        this.avisoVariante = fraseChoquesAplicar(ch).replace(" Ábrela para verlos en la pestaña «¿Y si…?».", "");
        return;
      }
      if (ch) {
        this.confirmarAplicar = { ...base, frases: [fraseChoquesAplicar(ch)], boton: null };
        return;
      }
      const d = v.diferencias();
      // Sin diferencias no se ofrece (RF-35)
      if (!d.enVariante) {
        this.confirmarAplicar = { ...base, frases: ["No cambia nada."], boton: null };
        return;
      }
      this.confirmarAplicar = { ...base, frases: frasesAplicar(v.datos.nombre, v.datos.piezas.size, d.avisos.length, d.pisan), boton: "aplicar" };
    } catch (e) {
      this.avisoVariante = `No se puede leer la variante: ${(e as Error).message}`;
    } finally {
      await temporal?.cerrar();
    }
  }

  cancelarAplicar() {
    this.confirmarAplicar = null;
  }

  /**
   * Aplica la variante de la confirmación (RF-32 a RF-39). Si sale, se cierra
   * si estaba abierta, se vuelve a la serie y se dice. Si no, la variante sigue
   * como estaba y la confirmación dice por qué (con canon, «Desbloquear y aplicar»).
   */
  async aplicarVariante(desbloquear = false): Promise<boolean> {
    const c = this.confirmarAplicar;
    if (!c || !this.sesionSerie || c.aplicando) return false;
    return (await this.operar(() => this.aplicarYa(c, desbloquear))) ?? false;
  }

  private async aplicarYa(c: ConfirmarAplicar, desbloquear: boolean): Promise<boolean> {
    const s = this.sesionSerie!;
    this.confirmarAplicar = { ...c, aplicando: true };
    const abierta = this.variante?.datos.id === c.id ? this.variante : null;
    // Mientras se aplica, la variante abierta no se cambia: lo que se aplica es lo que tiene ahora
    if (abierta) abierta.edicionBloqueada = `Aplicando «${abierta.datos.nombre}»…`;
    try {
      // Lo pendiente de la pestaña Ficha, antes de que aplicar escriba en las fichas (spec 009, RF-38)
      await this.guardarFicha();
      return await this.aplicarEn(s, c, abierta, desbloquear);
    } finally {
      if (abierta) abierta.edicionBloqueada = null;
    }
  }

  private async aplicarEn(s: Sesion, c: ConfirmarAplicar, abierta: SesionVariante | null, desbloquear: boolean): Promise<boolean> {
    let datos: DatosVariante;
    let quedaria: Modelo;
    try {
      if (abierta) {
        // Solo se aplica lo que ya está en su nota: si no se pudo escribir o cambió fuera, no se aplica
        const escrito = await abierta.escritor.vaciar();
        if (escrito !== "bien") {
          const frase = escrito === "fuera" ? "La variante cambió fuera de Atelier: no se ha aplicado nada." : `${abierta.escritor.error ?? "No se pudo guardar la variante."} No se ha aplicado nada.`;
          this.confirmarAplicar = { ...c, frases: [frase], boton: null, aplicando: false };
          return false;
        }
        datos = abierta.datos;
        quedaria = abierta.modelo;
      } else {
        datos = await s.variantes.leer(c.id);
        quedaria = modeloQuedaria(s.modelo, datos);
      }
    } catch (e) {
      this.confirmarAplicar = { ...c, frases: [`No se puede leer la variante: ${(e as Error).message}`], boton: null, aplicando: false };
      return false;
    }
    const r = await s.aplicarVariante(datos, quedaria, { desbloquear });
    if (!r.hecho) {
      if (r.motivo === "choques" && abierta) {
        this.confirmarAplicar = null;
        this.pestana = "ysi";
        this.avisoVariante = r.avisos.join(" ");
      } else {
        const frases = r.motivo === "choques" ? [...r.avisos, fraseChoquesAplicar(r.choques?.length ?? 0)] : r.motivo === "canon" ? [...r.avisos, AVISO_DESBLOQUEAR_APLICAR] : r.avisos;
        this.confirmarAplicar = { ...c, frases, boton: r.motivo === "canon" ? "desbloquear" : null, aplicando: false };
      }
      this.version++;
      return false;
    }
    this.confirmarAplicar = null;
    if (abierta) {
      // Ya está aplicada: lo pendiente de su nota no se escribe encima (RF-39)
      const antes = this.sesion!.modelo;
      const elegida = this.seleccion ?? "";
      abierta.escritor.parar();
      await abierta.cerrar();
      this.soltarVariante();
      if (this.pestana === "ysi") this.pestana = "editar";
      this.elegirEnVisible(elegida || s.modelo.serie.id, antes);
    }
    this.avisoVariante = [fraseAplicada(datos.nombre, r.piezas), ...(r.avisos ?? [])].join(" ");
    this.version++;
    return true;
  }

  /** Abre una variante nueva, vacía (RF-2), o «Otra versión de «título»» desde una pieza (RF-3) */
  async nuevaVariante(origen = ""): Promise<void> {
    const s = this.sesionSerie;
    if (!s) return;
    // El título, de lo que se ve ahora (puede ser una pieza que solo existe en la variante abierta)
    const p = origen ? (this.sesion?.modelo.pieza(origen) ?? s.modelo.pieza(origen)) : undefined;
    await this.guardarFicha();
    await this.operar(async () => {
      if (!(await this.aparcarYa(true))) return;
      const ahora = new Date();
      const titulo = p && "titulo" in p ? p.titulo.trim() || "Sin título" : "";
      const usados = [...s.variantes.lista.values()].map((c) => c.nombre);
      const nombre = p ? nombreUnico(limpiarNombre(`Otra versión de «${titulo}»`).nombre, usados) : nombrePorDefecto(ahora, usados);
      const origenEnSerie = p && s.modelo.pieza(origen) ? origen : "";
      const v = nuevaVarianteVacia(nuevoIdVariante(s.variantes.usados), nombre, fechaVariante(ahora), origenEnSerie);
      await this.ponerVariante(v, origenEnSerie || (this.seleccion ?? ""));
    });
  }

  /** «Probar otra versión» de una pieza (RF-3) */
  probarOtraVersion(piezaId: string): Promise<void> {
    return this.nuevaVariante(piezaId);
  }

  /** Abre una variante aparcada tal como se dejó (RF-5) */
  async abrirVariante(id: string): Promise<boolean> {
    const s = this.sesionSerie;
    if (!s) return false;
    if (this.variante?.datos.id === id) return true;
    let datos: DatosVariante;
    try {
      datos = await s.variantes.leer(id);
    } catch (e) {
      this.avisoVariante = `No se puede abrir la variante: ${(e as Error).message}`;
      return false;
    }
    if (datos.estado !== "aparcada") {
      this.avisoVariante = "Solo se abren las variantes aparcadas.";
      return false;
    }
    await this.guardarFicha();
    const abierta = await this.operar(async () => {
      if (!(await this.aparcarYa(true))) return false;
      await this.ponerVariante(datos, datos.elegida);
      return true;
    });
    return abierta ?? false;
  }

  private async ponerVariante(datos: DatosVariante, elegir: string) {
    const s = this.sesionSerie!;
    const antes = this.sesion!.modelo;
    const v = await SesionVariante.abrirSobre(s, datos);
    v.alCambioFuera = () => this.porFuera();
    this.quitarOyenteVariante = v.alCambiar(() => {
      this.version++;
      this.programarRevision();
    });
    this.variante = v;
    this.viendoAhora = false;
    s.edicionBloqueada = null;
    this.callarHistoria();
    this.elegirEnVisible(elegir || v.modelo.serie.id, antes);
  }

  /** Elige `id` en lo que se ve; si ahí no existe, la pieza que la contiene, y lo dice (RF-16) */
  private elegirEnVisible(id: string, otro: Modelo) {
    const m = this.sesion?.modelo;
    if (!m) return;
    const elegida = contenedorEn(m, otro, id);
    const p = otro.pieza(id);
    if (elegida !== id && p) this.avisoVariante = `«${("titulo" in p && p.titulo.trim()) || "Sin título"}» no existe en lo que ves: se ha elegido la pieza que la contiene.`;
    // Lo que se ve es otra sesión: la comparación empieza de cero (RF-13)
    this.seleccion = null;
    this.elegir(elegida);
    this.nivel = nivelValido(m, this.nivel);
    this.version++;
  }

  /** «Ver ahora» / «Ver cómo quedaría» (RF-14 a RF-16) */
  verAhora(si: boolean) {
    const v = this.variante;
    const s = this.sesionSerie;
    if (!v || !s || this.viendoAhora === si || this.operando) return;
    const antes = this.sesion!.modelo;
    this.viendoAhora = si;
    s.edicionBloqueada = si ? VIENDO_AHORA : null;
    this.callarHistoria();
    this.elegirEnVisible(this.seleccion ?? s.modelo.serie.id, antes);
  }

  /** Cambia el nombre de la variante abierta (RF-2b); devuelve el aviso si se recortó */
  renombrarVariante(nombre: string): string | null {
    const v = this.variante;
    if (!v || this.operando) return null;
    const r = limpiarNombre(nombre);
    if (!r.nombre) return null;
    v.datos.nombre = r.nombre;
    v.escritor.pedir();
    this.version++;
    return r.recortado ? "El nombre se ha recortado a 120 caracteres." : null;
  }

  /**
   * «Aparcar variante» (RF-25): se cierra, se queda en Aparcadas y se vuelve a
   * la serie. Sin cambios, no deja nada (RF-26). `porOtra`: se aparca para abrir otra (RF-6).
   */
  async aparcar(porOtra = false): Promise<boolean> {
    return (await this.operar(() => this.aparcarYa(porOtra))) ?? false;
  }

  /**
   * Aparca sin mirar si hay otra operación (la que llama ya la lleva). Si la nota
   * no se pudo escribir, la variante sigue abierta y se dice, salvo `forzar` (cerrar la app).
   */
  private async aparcarYa(porOtra: boolean, forzar = false): Promise<boolean> {
    const v = this.variante;
    const s = this.sesionSerie;
    if (!v || !s) return true;
    const antes = this.sesion!.modelo;
    const elegida = this.seleccion ?? "";
    if (v.datos.piezas.size) {
      v.datos.elegida = elegida && antes.pieza(elegida) ? elegida : "";
      v.escritor.pedir();
      const escrito = await v.escritor.vaciar();
      if (escrito === "error" && !forzar) {
        this.avisoVariante = `${v.escritor.error ?? "No se pudo guardar la variante."} «${v.datos.nombre}» sigue abierta para no perder nada.`;
        this.version++;
        return false;
      }
      // Cambió fuera: se queda lo de fuera, ya aparcada (no hace falta volver a abrirla)
      this.fueraPendiente = false;
      this.avisoVariante =
        escrito === "fuera" ? `«${v.datos.nombre}» cambió fuera de Atelier: queda aparcada con lo de fuera.` : porOtra ? `«${v.datos.nombre}» queda aparcada.` : null;
    } else {
      v.escritor.parar();
      if (s.variantes.lista.has(v.datos.id)) await s.variantes.aPapelera(v.datos.id).catch(() => undefined);
      this.avisoVariante = "No cambiaba nada: no se guarda.";
    }
    await v.cerrar();
    this.soltarVariante();
    if (this.pestana === "ysi") this.pestana = "editar";
    this.elegirEnVisible(elegida || s.modelo.serie.id, antes);
    return true;
  }

  /**
   * «Descartar variante» (RF-41): se cierra, queda descartada con su fecha y su
   * porqué, y se vuelve a la serie. No se borra nada. Sin cambios, como aparcar (RF-26).
   */
  async descartarVariante(porque: string): Promise<void> {
    await this.operar(() => this.descartarYa(porque));
  }

  private async descartarYa(porque: string): Promise<void> {
    const v = this.variante;
    const s = this.sesionSerie;
    if (!v || !s) return;
    if (!v.datos.piezas.size) {
      await this.aparcarYa(false);
      return;
    }
    const antes = this.sesion!.modelo;
    const elegida = this.seleccion ?? "";
    v.datos.elegida = elegida && antes.pieza(elegida) ? elegida : "";
    v.escritor.pedir();
    // Lo que se descarta es lo que está en su nota: si no se pudo escribir, sigue abierta
    const escrito = await v.escritor.vaciar();
    if (escrito === "error") {
      this.avisoVariante = `${v.escritor.error ?? "No se pudo guardar la variante."} «${v.datos.nombre}» sigue abierta: no se ha descartado.`;
      this.version++;
      return;
    }
    // Cambió fuera: no se descarta; al acabar se vuelve a abrir con lo de fuera
    if (escrito === "fuera") return;
    await v.cerrar();
    this.soltarVariante();
    if (this.pestana === "ysi") this.pestana = "editar";
    try {
      await s.descartarVariante(v.datos.id, porque);
      this.avisoVariante = `«${v.datos.nombre}» descartada: está en «Aplicadas y descartadas».`;
    } catch (e) {
      this.avisoVariante = `No se pudo descartar «${v.datos.nombre}» (${(e as Error).message}): queda aparcada.`;
    }
    this.elegirEnVisible(elegida || s.modelo.serie.id, antes);
  }

  /** «Recuperar» (RF-43): la descartada vuelve a aparcadas */
  async recuperarVariante(id: string): Promise<void> {
    const s = this.sesionSerie;
    if (!s) return;
    try {
      const c = await s.recuperarVariante(id);
      this.avisoVariante = `«${c.nombre}» vuelve a Aparcadas.`;
    } catch (e) {
      this.avisoVariante = `No se pudo recuperar la variante: ${(e as Error).message}`;
    }
    this.version++;
  }

  /** «Ver» una aplicada (RF-44): las piezas que cambió, con su título y qué les hizo */
  async piezasDeAplicada(id: string): Promise<{ id: string; titulo: string; que: string }[]> {
    const s = this.sesionSerie;
    if (!s) return [];
    try {
      const datos = await s.variantes.leer(id);
      const antes = modeloAntes(s.modelo, datos);
      const aplico = modeloQuedaria(s.modelo, datos);
      return [...datos.piezas].map(([pid, p]) => {
        const x = aplico.pieza(pid) ?? antes.pieza(pid);
        const titulo = (x && "titulo" in x && x.titulo.trim()) || "Sin título";
        return { id: pid, titulo, que: p.base === null ? "nueva" : p.pieza ? "cambiada" : "a la papelera" };
      });
    } catch (e) {
      this.avisoVariante = `No se puede leer la variante: ${(e as Error).message}`;
      return [];
    }
  }

  private soltarVariante() {
    this.quitarOyenteVariante?.();
    this.quitarOyenteVariante = null;
    this.variante = null;
    this.ladoALado = null;
    this.viendoAhora = false;
    this.confirmarAplicar = null;
    if (this.sesionSerie) this.sesionSerie.edicionBloqueada = null;
    this.callarHistoria();
  }

  /** Una operación de la variante cada vez; al acabar, si la nota cambió fuera mientras tanto, se vuelve a abrir */
  private async operar<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (this.operando) return undefined;
    this.operando = true;
    try {
      return await fn();
    } finally {
      this.operando = false;
      if (this.fueraPendiente) {
        this.fueraPendiente = false;
        if (this.variante) void this.reabrirPorFuera();
      }
    }
  }

  /** La nota de la variante abierta cambió fuera: se vuelve a abrir ya o, si hay una operación, al acabar */
  private porFuera() {
    if (this.operando) this.fueraPendiente = true;
    else void this.reabrirPorFuera();
  }

  /** La nota de la variante abierta cambió fuera: se vuelve a abrir con lo de fuera, sin pisarlo */
  private reabrirPorFuera(): Promise<void> {
    return this.operar(() => this.reabrirYa()).then(() => undefined);
  }

  private async reabrirYa() {
    const v = this.variante;
    const s = this.sesionSerie;
    if (!v || !s) return;
    const id = v.datos.id;
    const antes = this.sesion!.modelo;
    const elegida = this.seleccion ?? "";
    v.escritor.parar();
    await v.cerrar();
    this.soltarVariante();
    try {
      const datos = await s.variantes.leer(id);
      if (datos.estado === "aparcada") {
        await this.ponerVariante(datos, elegida);
        this.avisoVariante = "La variante cambió fuera de Atelier: se ha vuelto a abrir con lo de fuera.";
        return;
      }
    } catch {
      // No se puede leer: se vuelve a la serie
    }
    this.avisoVariante = "La variante cambió fuera de Atelier y ya no se puede abrir aquí.";
    this.elegirEnVisible(elegida || s.modelo.serie.id, antes);
  }

  cambiarTema() {
    const oscuroAhora =
      this.tema === "oscuro" || (this.tema === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    this.tema = oscuroAhora ? "claro" : "oscuro";
    guardar(CLAVE_TEMA, this.tema);
    this.aplicarTema();
  }

  private aplicarTema() {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (this.tema === "oscuro") el.dataset.theme = "dark";
    else if (this.tema === "claro") el.dataset.theme = "light";
    else delete el.dataset.theme;
  }
}
