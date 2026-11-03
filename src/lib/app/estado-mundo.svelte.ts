// El mundo de la serie en el estado de la app (spec 015): rejilla de categorías,
// listado, y la ficha abierta con todo lo que se puede hacer con ella. Escribir
// pasa siempre por `escribirFicha` (compara el texto entero antes, copia de cómo
// estaba y escritura segura); lo cambiado en Obsidian no se pisa (RF-12).

import { unir } from "../almacen/fs";
import { cambiarApartado, partirApartados } from "../wiki/apartados";
import { escribirFicha, type FichaLeida } from "../wiki/editar-ficha";
import { cambiarEstadoCanon } from "../wiki/estado-ficha";
import { textoEstado } from "../wiki/equivalencias";
import { separar } from "../wiki/md";
import type { Madurez } from "../modelo/vocabulario";
import {
  CATEGORIAS,
  aplicarRenombrar,
  categoria,
  conIdea,
  conRelaciones,
  contarCategorias,
  copiarMia,
  crearFichaMundo,
  fichaDeTexto,
  leerCategoria,
  leerIdeas,
  leerRelaciones,
  moverFicha,
  planRenombrar,
  quitarFicha,
  subcarpetasDe,
  usosDeFicha,
  carpetaDeCategoria,
  type Categoria,
  type FichaMundo,
  type PlanRenombrar,
  type Relacion,
  type Uso,
} from "../wiki/mundo";
import { leerGrafo, type Grafo } from "../wiki/conexiones";
import type { Sesion } from "./sesion";

export interface AnfitrionMundo {
  readonly sesionSerie: Sesion | null;
  /** Con una variante abierta no es null */
  readonly variante: unknown;
  /** Vuelve a abrir la serie tras tocar notas por debajo (renombrar) */
  recargarSerie?(): Promise<void>;
}

export interface FichaAbierta {
  ficha: FichaMundo;
  leida: FichaLeida;
  usos: Uso[];
  subcarpetas: string[];
  ideas: string[];
}

export type Pantalla = "rejilla" | "lista" | "ficha" | "conexiones";

const pad = (n: number) => String(n).padStart(2, "0");
const ahora = () => {
  const d = new Date();
  return { fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hora: `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}` };
};

export class EstadoMundo {
  pantalla = $state<Pantalla>("rejilla");
  /** El mapa de conexiones (spec 017) */
  grafo = $state.raw<Grafo | null>(null);
  categoria = $state<Categoria | null>(null);
  conteos = $state.raw<Record<Categoria, number> | null>(null);
  lista = $state.raw<FichaMundo[]>([]);
  filtro = $state("");
  abierta = $state.raw<FichaAbierta | null>(null);
  /** Lo que se dice al autor (región de estado) */
  aviso = $state("");
  error = $state<string | null>(null);
  /** El texto de la ficha cambió en Obsidian: lo escrito aquí se conserva y se elige qué hacer (RF-12) */
  cambioFuera = $state<{ miTexto: string } | null>(null);
  /** El canon se edita solo desbloqueándolo a propósito (RF-8) */
  desbloqueada = $state(false);
  planRenombre = $state.raw<(PlanRenombrar & { nuevo: string }) | null>(null);
  /** Resultados de buscar en todo el mundo */
  resultados = $state.raw<FichaMundo[]>([]);
  private fichasCopiadas = new Set<string>();

  constructor(private readonly anfitrion: AnfitrionMundo) {}

  private get s(): Sesion | null {
    return this.anfitrion.sesionSerie;
  }

  get soloLectura(): boolean {
    return !!this.anfitrion.variante || !this.s;
  }

  get bloqueada(): boolean {
    const a = this.abierta;
    return !!a && a.ficha.estado === "canon" && !this.desbloqueada;
  }

  get categorias() {
    return CATEGORIAS;
  }

  get sinWiki(): boolean {
    return !this.s?.modelo.serie.wiki.raiz && !this.s?.modelo.serie.wiki.personajes;
  }

  reiniciar(): void {
    this.pantalla = "rejilla";
    this.grafo = null;
    this.categoria = null;
    this.conteos = null;
    this.lista = [];
    this.filtro = "";
    this.abierta = null;
    this.aviso = "";
    this.error = null;
    this.cambioFuera = null;
    this.desbloqueada = false;
    this.planRenombre = null;
    this.resultados = [];
    this.fichasCopiadas.clear();
  }

  private decir(m: string): void {
    this.aviso = m;
  }

  // ---- Navegar

  /** Al entrar en la vista: cuenta las fichas de cada categoría. No escribe nada */
  async entrar(): Promise<void> {
    const s = this.s;
    if (!s) return;
    try {
      this.conteos = await contarCategorias(s.almacen.fs, s.vault, s.modelo.serie.wiki);
      this.error = null;
    } catch (e) {
      this.error = `No se pudo leer el mundo: ${(e as Error).message}`;
    }
  }

  volverARejilla(): void {
    this.pantalla = "rejilla";
    this.categoria = null;
    this.abierta = null;
    this.filtro = "";
    this.resultados = [];
    void this.entrar();
  }

  /** El mapa de conexiones: lee las relaciones de las fichas. No escribe nada */
  async abrirConexiones(): Promise<void> {
    const s = this.s;
    if (!s) return;
    this.categoria = null;
    this.abierta = null;
    try {
      this.grafo = await leerGrafo(s.almacen.fs, s.vault, s.modelo.serie.wiki);
      this.pantalla = "conexiones";
      this.error = null;
    } catch (e) {
      this.error = `No se pudo leer las conexiones: ${(e as Error).message}`;
    }
  }

  async abrirCategoria(cat: Categoria): Promise<void> {
    const s = this.s;
    if (!s) return;
    this.categoria = cat;
    this.pantalla = "lista";
    this.abierta = null;
    this.filtro = "";
    this.cambioFuera = null;
    try {
      this.lista = await leerCategoria(s.almacen.fs, s.vault, s.modelo.serie.wiki, cat);
      this.error = null;
      this.decir(`${categoria(cat).nombre}: ${this.lista.length} ficha${this.lista.length === 1 ? "" : "s"}.`);
    } catch (e) {
      this.error = `No se pudo leer ${categoria(cat).nombre.toLowerCase()}: ${(e as Error).message}`;
    }
  }

  /** Las fichas del listado que coinciden con el filtro (nombre, alias o resumen, sin tildes ni mayúsculas) */
  get filtradas(): FichaMundo[] {
    const q = norm(this.filtro);
    if (!q) return this.lista;
    return this.lista.filter((f) => [f.nombre, ...f.aliases, f.resumen].some((t) => norm(t).includes(q)));
  }

  /** Busca en todas las categorías, por nombre y por el texto de la ficha (RF-7) */
  async buscar(texto: string): Promise<void> {
    const s = this.s;
    const q = norm(texto);
    this.filtro = texto;
    if (!s || !q) {
      this.resultados = [];
      return;
    }
    const r: FichaMundo[] = [];
    for (const c of CATEGORIAS) {
      const fichas = await leerCategoria(s.almacen.fs, s.vault, s.modelo.serie.wiki, c.id);
      for (const f of fichas) {
        if ([f.nombre, ...f.aliases, f.resumen].some((t) => norm(t).includes(q))) r.push(f);
        else {
          try {
            if (norm(await s.almacen.fs.leer(unir(s.vault, f.ruta))).includes(q)) r.push(f);
          } catch {
            // Una ficha que no se lee no sale
          }
        }
      }
    }
    if (norm(this.filtro) === q) this.resultados = r;
  }

  /** Abre una ficha por su ruta (relativa al vault) en su pantalla */
  async abrirFicha(ruta: string, cat?: Categoria): Promise<boolean> {
    const s = this.s;
    if (!s) return false;
    const rutas = s.modelo.serie.wiki;
    const c = cat ?? CATEGORIAS.find((x) => {
      const d = carpetaDeCategoria(rutas, x.id);
      return d && ruta.toLowerCase().startsWith(`${d.toLowerCase()}/`);
    })?.id;
    if (!c) {
      this.error = "Esa ficha no está en ninguna categoría del mundo.";
      return false;
    }
    try {
      const abs = unir(s.vault, ruta);
      if (!(await s.almacen.fs.existe(abs))) {
        this.error = "La ficha ya no está.";
        return false;
      }
      const texto = await s.almacen.fs.leer(abs);
      const base = carpetaDeCategoria(rutas, c);
      const ficha = fichaDeTexto(texto, c, ruta, base);
      this.categoria = c;
      this.pantalla = "ficha";
      this.desbloqueada = false;
      this.cambioFuera = null;
      this.planRenombre = null;
      this.error = null;
      await this.poner(ficha, texto, await s.almacen.fs.fecha(abs));
      return true;
    } catch (e) {
      this.error = `No se pudo abrir la ficha: ${(e as Error).message}`;
      return false;
    }
  }

  /** La ficha por el nombre de un enlace `[[Nombre]]` (o un alias): para abrirla desde el guion, el visor… */
  async abrirPorNombre(nombre: string): Promise<boolean> {
    const f = await this.buscarPorNombre(nombre);
    return f ? this.abrirFicha(f.ruta, f.categoria) : false;
  }

  /** La primera ficha de cualquier categoría con ese nombre o alias, sin abrirla (spec 019, RF-3) */
  async buscarPorNombre(nombre: string): Promise<{ ruta: string; categoria: Categoria; nombre: string } | null> {
    return (await this.buscarTodasPorNombre(nombre, true))[0] ?? null;
  }

  /** Todas las fichas del mundo con ese nombre o alias, en el orden de las categorías (spec 019, RF-5) */
  async buscarTodasPorNombre(nombre: string, primera = false): Promise<{ ruta: string; categoria: Categoria; nombre: string }[]> {
    const s = this.s;
    if (!s) return [];
    const q = norm(nombre.replace(/^\s*\[\[|\]\]\s*$/g, ""));
    const todas: { ruta: string; categoria: Categoria; nombre: string }[] = [];
    for (const c of CATEGORIAS) {
      for (const f of await leerCategoria(s.almacen.fs, s.vault, s.modelo.serie.wiki, c.id)) {
        if (![f.nombre, ...f.aliases].some((n) => norm(n) === q)) continue;
        todas.push({ ruta: f.ruta, categoria: c.id, nombre: f.nombre });
        if (primera) return todas;
      }
    }
    return todas;
  }

  private async poner(ficha: FichaMundo, texto: string, fecha: number | null): Promise<void> {
    const s = this.s!;
    const leida: FichaLeida = { ruta: ficha.ruta, texto, fecha, apartados: partirApartados(texto), estadoWiki: textoEstado(separar(texto).propiedades.estado_canon) };
    let usos: Uso[] = [];
    let subcarpetas: string[] = [];
    try {
      usos = await usosDeFicha(s.almacen.fs, s.vault, s.modelo.serie.wiki, s.ruta, ficha);
      subcarpetas = await subcarpetasDe(s.almacen.fs, s.vault, s.modelo.serie.wiki, ficha.categoria);
    } catch {
      // Sin usos ni carpetas la ficha se puede editar igual
    }
    this.abierta = { ficha, leida, usos, subcarpetas, ideas: leerIdeas(texto) };
  }

  // ---- Crear

  async crear(cat: Categoria, nombre: string, subcarpeta = ""): Promise<boolean> {
    const s = this.s;
    if (!s || this.soloLectura) return false;
    try {
      const { fecha } = ahora();
      const r = await crearFichaMundo(s.almacen.fs, s.vault, s.modelo.serie.wiki, cat, nombre, { fecha, origen: s.carpetaEnVault, subcarpeta });
      await s.leerWiki();
      if (r.estado === "ya existe") this.decir(`Ya había una ficha con ese nombre: se abre.`);
      else this.decir(`Ficha «${nombre.trim()}» creada.`);
      return this.abrirFicha(r.ruta, cat);
    } catch (e) {
      this.error = (e as Error).message;
      return false;
    }
  }

  // ---- Escribir (siempre por escribirFicha)

  private opciones() {
    const s = this.s!;
    const { fecha, hora } = ahora();
    const ruta = this.abierta!.leida.ruta;
    return { fecha, hora, copia: this.fichasCopiadas.has(ruta) ? null : unir(s.ruta, "_fichas") };
  }

  /** Los guardados y cambios de sitio van uno detrás de otro: cada uno parte de lo que dejó el anterior */
  private cola: Promise<unknown> = Promise.resolve();
  private enCola<T>(trabajo: () => Promise<T>): Promise<T> {
    const r = this.cola.then(trabajo, trabajo);
    this.cola = r.catch(() => undefined);
    return r;
  }

  /** Guarda el texto entero de la nota; devuelve si se escribió. Un cambio por fuera no se pisa */
  private async escribir(nuevo: string): Promise<boolean> {
    const s = this.s;
    const a = this.abierta;
    if (!s || !a || this.soloLectura) return false;
    if (this.bloqueada) {
      this.error = "Esta ficha es canon: desbloquéala a propósito para editarla.";
      return false;
    }
    const ruta = a.leida.ruta;
    const r = await escribirFicha(s.almacen.fs, s.vault, a.leida, nuevo, this.opciones());
    // Si mientras se guardaba se abrió otra ficha, lo de esta no toca la pantalla de la otra
    const sigue = this.abierta?.leida.ruta === ruta;
    if (!r.ok) {
      if (!sigue) return false;
      if (r.motivo === "cambió fuera") this.cambioFuera = { miTexto: nuevo };
      else this.error = r.mensaje;
      return false;
    }
    if (r.escrita) this.fichasCopiadas.add(ruta);
    if (!sigue) return true;
    const ficha = fichaDeTexto(r.leida.texto, a.ficha.categoria, a.ficha.ruta, carpetaDeCategoria(s.modelo.serie.wiki, a.ficha.categoria));
    this.abierta = { ...a, ficha, leida: r.leida, ideas: leerIdeas(r.leida.texto) };
    this.error = null;
    return true;
  }

  guardarApartado(i: number, nuevo: string): Promise<boolean> {
    return this.guardarApartadoCon(i, () => nuevo);
  }

  /**
   * Cambia un apartado partiendo del texto que tiene EN EL MOMENTO de ejecutarse (en la cola): dos cambios
   * seguidos (dos celdas de una tabla) se aplican uno sobre otro y no se pisan.
   */
  guardarApartadoCon(i: number, cambio: (actual: string) => string): Promise<boolean> {
    return this.enCola(async () => {
      const a = this.abierta;
      const actual = a?.leida.apartados[i]?.texto;
      if (!a || actual === undefined) return false;
      const nuevo = cambio(actual);
      if (nuevo.replace(/\s+$/, "") === actual.replace(/\s+$/, "")) return true;
      return this.escribir(cambiarApartado(a.leida.texto, i, nuevo));
    });
  }

  guardarAliases(aliases: string[]): Promise<boolean> {
    return this.enCola(async () => {
      const a = this.abierta;
      if (!a) return false;
      const limpios = aliases.map((x) => x.trim()).filter(Boolean);
      const texto = conAliases(a.leida.texto, limpios);
      return texto === a.leida.texto ? true : this.escribir(texto);
    });
  }

  guardarRelaciones(relaciones: Relacion[]): Promise<boolean> {
    return this.enCola(async () => {
      const a = this.abierta;
      if (!a) return false;
      const limpias = relaciones.filter((r) => r.con.trim()).map((r) => ({ con: r.con.replace(/^\s*\[\[|\]\]\s*$/g, "").trim(), tipo: r.tipo.trim() }));
      const texto = conRelaciones(a.leida.texto, limpias);
      // Si las propiedades de la nota no se entienden no se cambia nada, y se dice (RF-13)
      if (texto === a.leida.texto && JSON.stringify(limpias) !== JSON.stringify(leerRelaciones(separar(a.leida.texto).propiedades))) {
        this.error = "No se pudieron guardar las relaciones: las propiedades de la nota no se entienden. Arréglalas en Obsidian.";
        return false;
      }
      return this.escribir(texto);
    });
  }

  anadirIdea(idea: string): Promise<boolean> {
    return this.enCola(async () => {
      const a = this.abierta;
      if (!a || !idea.trim()) return false;
      const ok = await this.escribir(conIdea(a.leida.texto, idea));
      if (ok) this.decir("Idea apuntada.");
      return ok;
    });
  }

  cambiarEstado(valor: Madurez): Promise<boolean> {
    return this.enCola(async () => {
      const a = this.abierta;
      if (!a) return false;
      // Pasar a canon o salir de él es siempre un botón explícito (RF-8): con la ficha bloqueada no se cambia
      if (this.bloqueada) {
        this.error = "Esta ficha es canon: desbloquéala a propósito para cambiar su estado.";
        return false;
      }
      const ok = await this.escribirSinCanon(cambiarEstadoCanon(a.leida.texto, valor));
      if (ok) this.decir(`Estado: ${valor}.`);
      return ok;
    });
  }

  private async escribirSinCanon(nuevo: string): Promise<boolean> {
    const antes = this.desbloqueada;
    this.desbloqueada = true;
    try {
      return await this.escribir(nuevo);
    } finally {
      this.desbloqueada = antes;
    }
  }

  desbloquear(): void {
    this.desbloqueada = true;
    this.decir("Ficha desbloqueada: es canon, edítala con cuidado.");
  }

  // ---- Cambio por fuera: las tres salidas (RF-12)

  /** «Quedarme con la mía»: la de fuera va antes a la papelera y se escribe lo mío */
  async quedarmeConLaMia(): Promise<void> {
    const s = this.s;
    const a = this.abierta;
    const f = this.cambioFuera;
    if (!s || !a || !f) return;
    const abs = unir(s.vault, a.leida.ruta);
    const deFuera = await s.almacen.fs.leer(abs);
    const { fecha, hora } = ahora();
    await copiarMia(s.almacen.fs, s.ruta, `${a.ficha.nombre} (de fuera)`, deFuera, { fecha, hora });
    const nueva: FichaLeida = { ...a.leida, texto: deFuera, fecha: await s.almacen.fs.fecha(abs), apartados: partirApartados(deFuera) };
    this.abierta = { ...a, leida: nueva };
    this.cambioFuera = null;
    await this.escribirSinCanon(f.miTexto);
  }

  /** «Usar la de fuera»: lo mío va antes a la papelera y se vuelve a leer la ficha */
  async usarLaDeFuera(): Promise<void> {
    const s = this.s;
    const a = this.abierta;
    const f = this.cambioFuera;
    if (!s || !a || !f) return;
    const { fecha, hora } = ahora();
    await copiarMia(s.almacen.fs, s.ruta, a.ficha.nombre, f.miTexto, { fecha, hora });
    this.cambioFuera = null;
    await this.abrirFicha(a.ficha.ruta, a.ficha.categoria);
    this.decir("Se usa la versión de fuera; la tuya está en la papelera.");
  }

  /** «Copiar la mía»: deja una copia aparte y no cambia nada más */
  async copiarLaMia(): Promise<void> {
    const s = this.s;
    const a = this.abierta;
    const f = this.cambioFuera;
    if (!s || !a || !f) return;
    const { fecha, hora } = ahora();
    await copiarMia(s.almacen.fs, s.ruta, a.ficha.nombre, f.miTexto, { fecha, hora });
    this.decir("Copia de tu versión guardada en la papelera de la serie.");
  }

  // ---- Renombrar, mover y quitar

  async planearRenombre(nuevo: string): Promise<void> {
    const s = this.s;
    const a = this.abierta;
    if (!s || !a) return;
    const plan = await planRenombrar(s.almacen.fs, s.vault, s.modelo.serie.wiki, s.ruta, a.ficha, nuevo);
    if (!plan.ok) {
      this.planRenombre = null;
      this.error = plan.motivo ?? "No se puede renombrar.";
      return;
    }
    this.error = null;
    this.planRenombre = { ...plan, nuevo: nuevo.trim() };
  }

  cancelarRenombre(): void {
    this.planRenombre = null;
  }

  confirmarRenombre(): Promise<void> {
    return this.enCola(() => this.renombrarYa());
  }

  private async renombrarYa(): Promise<void> {
    const s = this.s;
    const a = this.abierta;
    const p = this.planRenombre;
    if (!s || !a || !p || this.soloLectura) return;
    if (this.bloqueada) {
      this.error = "Esta ficha es canon: desbloquéala a propósito para renombrarla.";
      return;
    }
    await s.guardado.vaciar();
    await s.guardadoGuion.vaciar();
    const { fecha, hora } = ahora();
    const r = await aplicarRenombrar(s.almacen.fs, s.vault, s.modelo.serie.wiki, s.ruta, a.ficha, p.nuevo, { fecha, hora, copias: unir(s.ruta, "_fichas") });
    this.planRenombre = null;
    if (!r.ok) {
      this.error = r.motivo ?? "No se pudo renombrar.";
      return;
    }
    // Las piezas y el guion cambiaron en disco: se vuelve a abrir la serie para que nada se quede con el nombre viejo
    this.decir(`Renombrada a «${p.nuevo}»; ${r.cambiadas} nota${r.cambiadas === 1 ? "" : "s"} con enlaces actualizados.${r.fallos.length ? ` No se pudo actualizar: ${r.fallos.join(", ")}.` : ""}`);
    await s.leerWiki();
    await this.anfitrion.recargarSerie?.();
    await this.abrirFicha(r.rutaNueva, a.ficha.categoria);
  }

  mover(subcarpeta: string): Promise<void> {
    return this.enCola(() => this.moverYa(subcarpeta));
  }

  private async moverYa(subcarpeta: string): Promise<void> {
    const s = this.s;
    const a = this.abierta;
    if (!s || !a || this.soloLectura) return;
    if (this.bloqueada) {
      this.error = "Esta ficha es canon: desbloquéala a propósito para moverla.";
      return;
    }
    try {
      const { fecha } = ahora();
      const nueva = await moverFicha(s.almacen.fs, s.vault, s.modelo.serie.wiki, a.ficha, subcarpeta, { fecha });
      await s.leerWiki();
      await this.abrirFicha(nueva, a.ficha.categoria);
      this.decir("Ficha movida.");
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  quitar(): Promise<boolean> {
    return this.enCola(() => this.quitarYa());
  }

  private async quitarYa(): Promise<boolean> {
    const s = this.s;
    const a = this.abierta;
    if (!s || !a || this.soloLectura) return false;
    if (this.bloqueada) {
      this.error = "Esta ficha es canon: desbloquéala a propósito para quitarla.";
      return false;
    }
    try {
      const { fecha, hora } = ahora();
      await quitarFicha(s.almacen.fs, s.vault, s.modelo.serie.wiki, s.ruta, a.ficha, { fecha, hora });
      await s.leerWiki();
      const cat = a.ficha.categoria;
      this.abierta = null;
      await this.abrirCategoria(cat);
      this.decir(`«${a.ficha.nombre}» está en la papelera de la serie.`);
      return true;
    } catch (e) {
      this.error = (e as Error).message;
      return false;
    }
  }
}

/** Sin tildes ni mayúsculas, para buscar */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** El texto con `aliases` puesto, conservando el resto de propiedades */
function conAliases(texto: string, aliases: string[]): string {
  const bom = texto.startsWith("\uFEFF") ? "\uFEFF" : "";
  const cuerpo = texto.slice(bom.length);
  const fin = cuerpo.includes("\r\n") ? "\r\n" : "\n";
  const md = cuerpo.replace(/\r\n/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return texto;
  const ya = separar(texto).propiedades.aliases;
  if (JSON.stringify(Array.isArray(ya) ? ya.map(String) : []) === JSON.stringify(aliases)) return texto;
  const lineas = m[1]!.split("\n");
  const i = lineas.findIndex((l) => /^aliases\s*:/.test(l));
  const nuevo = `aliases: [${aliases.map((a) => JSON.stringify(a)).join(", ")}]`;
  if (i >= 0) {
    let hasta = i + 1;
    while (hasta < lineas.length && /^\s+\S|^-(\s|$)/.test(lineas[hasta]!)) hasta++;
    lineas.splice(i, hasta - i, nuevo);
  } else lineas.push(nuevo);
  const salida = `---\n${lineas.join("\n")}\n---\n${md.slice(m[0].length)}`;
  return bom + (fin === "\r\n" ? salida.replace(/\n/g, "\r\n") : salida);
}
