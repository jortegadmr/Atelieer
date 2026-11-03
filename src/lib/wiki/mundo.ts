// El mundo de la serie escrito desde Atelier (spec 015): categorías de fichas,
// crear, renombrar con sus enlaces, mover, quitar a la papelera, usos,
// relaciones y bloc de ideas. Todo son notas Markdown de la vault (Obsidian las
// abre sin avisos). Lógica pura sobre `Fs`: nada de Svelte ni de Tauri.

import { parseDocument, stringify } from "yaml";
import { carpetaDe, escribirSeguro, nombreDe, normalizar, unir, type Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";
import { anotarLog } from "./log";
import { clave, separar, util } from "./md";
import { nombreValido, ponerFuentes, rellenar } from "./plantillas";

export type Categoria = "personaje" | "lugar" | "era" | "glosario" | "grupo" | "poder" | "evento" | "especie" | "documento";

export interface DefCategoria {
  id: Categoria;
  /** En plural, para la carpeta de la rejilla */
  nombre: string;
  singular: string;
  /** Carpeta fija dentro de la raíz de la wiki (las tres de hoy usan la de `serie.md`) */
  carpeta: string;
  /** Plantilla del vault, si el autor ya la tiene */
  plantillaVault?: string;
  /** Apartados propios, además de Resumen, Ideas y Fuentes */
  apartados: string[];
}

export const CATEGORIAS: DefCategoria[] = [
  { id: "personaje", nombre: "Personajes", singular: "personaje", carpeta: "", plantillaVault: "_Plantillas/Personajes/Plantilla - Personaje.md", apartados: ["Núcleo"] },
  { id: "glosario", nombre: "Glosario", singular: "término", carpeta: "Glosario", apartados: ["Definición"] },
  { id: "lugar", nombre: "Lugares", singular: "lugar", carpeta: "", plantillaVault: "_Plantillas/Mundo/Plantilla - Lugar.md", apartados: ["Descripción"] },
  { id: "grupo", nombre: "Grupos", singular: "grupo", carpeta: "Grupos", apartados: ["Miembros", "Objetivo"] },
  { id: "poder", nombre: "Poderes y reglas", singular: "poder o regla", carpeta: "Poderes y reglas", apartados: ["Cómo funciona", "Límites y coste"] },
  { id: "evento", nombre: "Eventos del mundo", singular: "evento", carpeta: "Eventos del mundo", apartados: ["Qué pasó", "Cuándo", "Consecuencias"] },
  { id: "especie", nombre: "Especies", singular: "especie", carpeta: "Especies", apartados: ["Rasgos", "Cultura"] },
  { id: "era", nombre: "Épocas", singular: "época", carpeta: "", plantillaVault: "_Plantillas/Mundo/Plantilla - Era.md", apartados: ["Descripción"] },
  { id: "documento", nombre: "Documentos", singular: "documento", carpeta: "Documentos", apartados: ["Contenido"] },
];

export const categoria = (id: Categoria): DefCategoria => CATEGORIAS.find((c) => c.id === id)!;

/** La carpeta de la categoría, relativa al vault, o "" si la serie no tiene wiki configurada */
export function carpetaDeCategoria(rutas: RutasWiki, id: Categoria): string {
  const c = categoria(id);
  const fija = id === "personaje" ? rutas.personajes : id === "lugar" ? rutas.lugares : id === "era" ? rutas.eras : c.carpeta && rutas.raiz ? unir(rutas.raiz, c.carpeta) : "";
  return fija.replace(/\/+$/, "");
}

// ---- Leer

export interface Relacion {
  /** El nombre de la ficha con la que se relaciona, sin [[ ]] */
  con: string;
  /** romántica, amistad, rivalidad u otra que escriba el autor */
  tipo: string;
}

export interface FichaMundo {
  nombre: string;
  categoria: Categoria;
  /** Relativa al vault, con .md */
  ruta: string;
  /** Subcarpeta dentro de la de su categoría ("" si está en la raíz de ella) */
  subcarpeta: string;
  aliases: string[];
  resumen: string;
  estado: string;
  relaciones: Relacion[];
}

const RELACION = /^\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*(?:[—–-]+\s*(.*))?$/;

/** `relaciones` de las propiedades: lista de «[[Nombre]] — tipo»; lo que no encaje se ignora aquí y se conserva en el fichero */
export function leerRelaciones(propiedades: Record<string, unknown>): Relacion[] {
  const r = propiedades.relaciones;
  if (!Array.isArray(r)) return [];
  const salida: Relacion[] = [];
  for (const x of r) {
    const m = typeof x === "string" ? RELACION.exec(x) : null;
    if (m) salida.push({ con: m[1]!.trim(), tipo: util(m[2]) });
  }
  return salida;
}

function textoDeEstado(v: unknown): string {
  return Array.isArray(v) ? v.map(String).join(", ") : v === undefined || v === null ? "" : String(v);
}

/** Lee una nota como ficha del mundo; null si no se puede leer */
export function fichaDeTexto(texto: string, cat: Categoria, ruta: string, base: string): FichaMundo {
  const { propiedades, cuerpo } = separar(texto);
  const rel = ruta.slice(base.length).replace(/^\/+/, "");
  const sub = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
  return {
    nombre: nombreDe(ruta).replace(/\.md$/, ""),
    categoria: cat,
    ruta,
    subcarpeta: sub,
    aliases: Array.isArray(propiedades.aliases) ? propiedades.aliases.map(String) : [],
    resumen: util(cuerpo.match(/^>\s*\*\*Resumen[^*]*:\*\*\s*(.*)$/m)?.[1]),
    estado: textoDeEstado(propiedades.estado_canon),
    relaciones: leerRelaciones(propiedades),
  };
}

const NO_ENTRAR = new Set(["_papelera", "_instantaneas", "_fichas", "_guion", "_pizarra", "_variantes", ".obsidian", ".trash"]);

async function notasDe(fs: Fs, abs: string, alto = 8): Promise<string[]> {
  if (alto < 0 || !(await fs.existe(abs))) return [];
  const r: string[] = [];
  for (const e of await fs.listar(abs)) {
    if (e.nombre.startsWith(".") || NO_ENTRAR.has(e.nombre)) continue;
    const ruta = unir(abs, e.nombre);
    if (e.esDir) r.push(...(await notasDe(fs, ruta, alto - 1)));
    else if (e.nombre.endsWith(".md")) r.push(ruta);
  }
  return r;
}

/** Las fichas de una categoría, por nombre; una que no se pueda leer se salta */
export async function leerCategoria(fs: Fs, vault: string, rutas: RutasWiki, cat: Categoria): Promise<FichaMundo[]> {
  const dir = carpetaDeCategoria(rutas, cat);
  if (!dir) return [];
  const r: FichaMundo[] = [];
  for (const abs of await notasDe(fs, unir(vault, dir))) {
    try {
      const rel = abs.slice(unir(vault).length).replace(/^\/+/, "");
      r.push(fichaDeTexto(await fs.leer(abs), cat, rel, dir));
    } catch {
      // Una ficha ilegible se salta
    }
  }
  return r.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Cuántas fichas tiene cada categoría (para la rejilla de carpetas) */
export async function contarCategorias(fs: Fs, vault: string, rutas: RutasWiki): Promise<Record<Categoria, number>> {
  const r = {} as Record<Categoria, number>;
  for (const c of CATEGORIAS) {
    const dir = carpetaDeCategoria(rutas, c.id);
    r[c.id] = dir ? (await notasDe(fs, unir(vault, dir))).length : 0;
  }
  return r;
}

/** Subcarpetas de una categoría, para mover fichas entre ellas */
export async function subcarpetasDe(fs: Fs, vault: string, rutas: RutasWiki, cat: Categoria): Promise<string[]> {
  const dir = carpetaDeCategoria(rutas, cat);
  if (!dir) return [];
  const r: string[] = [];
  const recorrer = async (abs: string, rel: string, alto: number) => {
    if (alto < 0 || !(await fs.existe(abs))) return;
    for (const e of await fs.listar(abs)) {
      if (!e.esDir || e.nombre.startsWith(".") || NO_ENTRAR.has(e.nombre)) continue;
      const sub = rel ? `${rel}/${e.nombre}` : e.nombre;
      r.push(sub);
      await recorrer(unir(abs, e.nombre), sub, alto - 1);
    }
  };
  await recorrer(unir(vault, dir), "", 4);
  return r.sort((a, b) => a.localeCompare(b, "es"));
}

/** Como `nombreValido`, y además sin nombres de solo puntos, que acaben en punto o espacio, reservados de Windows ni que rompan el YAML de la plantilla */
export function nombreMundoValido(n: string): boolean {
  if (!nombreValido(n)) return false;
  if (/^\.+$/.test(n) || /[. ]$/.test(n)) return false;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(n)) return false;
  return !/^[*&!{|>%@`]/.test(n) && !/^[-?:] /.test(n);
}

/** ¿Vale como nombre de subcarpeta? Sin `..`, sin unidad, sin caracteres de fichero */
export function subcarpetaValida(sub: string): boolean {
  const n = normalizar(sub).replace(/^\/+|\/+$/g, "");
  if (!n) return true;
  return n.split("/").every((t) => t !== "." && t !== ".." && nombreMundoValido(t) && !/^[A-Za-z]:$/.test(t));
}

// ---- Plantillas y crear

/** La plantilla propuesta por la app para las categorías nuevas: Resumen, apartados propios, Ideas y Fuentes */
export function plantillaPropuesta(cat: Categoria): string {
  const c = categoria(cat);
  const apartados = c.apartados.map((a) => `## ${a}\n\n`).join("");
  return `---
tipo: ${cat}
estado_canon: idea
aliases: []
relaciones: []
tags:
  - ${cat}
creado: "{{date}}"
actualizado: "{{date}}"
---

# {{title}}

> **Resumen:** [PENDIENTE]

${apartados}## Ideas

## Fuentes

- \`00_Raw/...\` —
`;
}

export interface OpcionesCrear {
  /** AAAA-MM-DD */
  fecha: string;
  /** De dónde sale, para Fuentes: «appDatos/serie» */
  origen: string;
  /** Subcarpeta dentro de la de la categoría */
  subcarpeta?: string;
}

export type ResultadoCrear = { estado: "creada" | "ya existe"; ruta: string };

/** Crea una ficha con solo su nombre (RF-2, RF-14). Nunca pisa una que ya está */
export async function crearFichaMundo(fs: Fs, vault: string, rutas: RutasWiki, cat: Categoria, nombre: string, op: OpcionesCrear): Promise<ResultadoCrear> {
  const limpio = nombre.replace(/^\s*\[\[|\]\]\s*$/g, "").trim();
  if (!nombreMundoValido(limpio)) throw new Error(`El nombre «${nombre}» no vale para un fichero (sin / \\ : * ? " < > | # ^ [ ]).`);
  const dir = carpetaDeCategoria(rutas, cat);
  if (!dir) throw new Error(`La serie no tiene carpeta de ${categoria(cat).nombre.toLowerCase()} en la wiki.`);
  const sub = (op.subcarpeta ?? "").replace(/^\/+|\/+$/g, "");
  if (!subcarpetaValida(sub)) throw new Error("La subcarpeta no vale.");
  const ruta = unir(dir, sub, `${limpio}.md`);
  const abs = unir(vault, ruta);
  if (await fs.existe(abs)) return { estado: "ya existe", ruta };

  const def = categoria(cat);
  let plantilla: string;
  const deVault = def.plantillaVault ? unir(vault, def.plantillaVault) : "";
  if (deVault && (await fs.existe(deVault))) plantilla = await fs.leer(deVault);
  else plantilla = plantillaPropuesta(cat);
  let texto = rellenar(plantilla, limpio, op.fecha);
  texto = ponerFuentes(texto, `- \`${op.origen}\` — creada desde Atelier el ${op.fecha}`);
  await fs.crearDir(carpetaDe(abs));
  await escribirSeguro(fs, abs, texto);
  await anotarLog(fs, vault, rutas, op.fecha, `Crear ficha: ${limpio}`, `Ficha de ${def.singular} creada desde Atelier, a petición del autor (\`${ruta}\`). Origen: \`${op.origen}\`.`);
  return { estado: "creada", ruta };
}

// ---- Enlaces de toda la serie

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** El enlace `[[Nombre]]`, `[[Nombre|alias]]`, `[[ruta/Nombre]]` o `[[Nombre#apartado]]` */
function patronEnlace(nombre: string): RegExp {
  return new RegExp(`\\[\\[((?:[^\\]|#\\n]*/)?)${escapar(nombre)}((?:#[^\\]|\\n]*)?(?:\\|[^\\]\\n]*)?)\\]\\]`, "gi");
}

/** Dónde se buscan enlaces: la wiki de la serie y su mesa de borradores (piezas y guion) */
async function notasDeLaSerie(fs: Fs, vault: string, rutas: RutasWiki, mesa: string): Promise<string[]> {
  const r = new Set<string>();
  if (rutas.raiz) for (const n of await notasDe(fs, unir(vault, rutas.raiz))) r.add(n);
  for (const n of await notasDe(fs, mesa)) r.add(n);
  // El guion vive en una carpeta con guion bajo que `notasDe` no recorre
  const guion = unir(mesa, "_guion");
  if (await fs.existe(guion)) for (const e of await fs.listar(guion)) if (!e.esDir && /^ev-[a-z0-9]{4,}\.md$/.test(e.nombre)) r.add(unir(guion, e.nombre));
  return [...r];
}

export interface Uso {
  /** Ruta absoluta de la nota */
  ruta: string;
  nombre: string;
  tipo: "ficha" | "pieza" | "guion";
  veces: number;
}

/** Quién nombra a esta ficha por su nombre o sus alias (RF-6) */
export async function usosDeFicha(fs: Fs, vault: string, rutas: RutasWiki, mesa: string, ficha: Pick<FichaMundo, "nombre" | "aliases" | "ruta">): Promise<Uso[]> {
  // Nombre y alias distintos sin mirar mayúsculas: el patrón ya las ignora y no se cuenta dos veces
  const nombres = [...new Map([ficha.nombre, ...ficha.aliases].filter(Boolean).map((n) => [n.toLowerCase(), n] as const)).values()];
  const propia = unir(vault, ficha.ruta).toLowerCase();
  const r: Uso[] = [];
  for (const abs of await notasDeLaSerie(fs, vault, rutas, mesa)) {
    if (abs.toLowerCase() === propia) continue;
    let texto: string;
    try {
      texto = await fs.leer(abs);
    } catch {
      continue;
    }
    let veces = 0;
    for (const n of nombres) veces += (texto.match(patronEnlace(n)) ?? []).length;
    if (!veces) continue;
    const tipo = abs.includes("/_guion/") ? "guion" : abs.toLowerCase().startsWith(unir(vault).toLowerCase() + "/") && !abs.startsWith(mesa) ? "ficha" : "pieza";
    r.push({ ruta: abs, nombre: nombreDe(abs).replace(/\.md$/, ""), tipo, veces });
  }
  return r.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// ---- Renombrar

export interface PlanRenombrar {
  ok: boolean;
  motivo?: string;
  /** Ruta nueva, relativa al vault */
  rutaNueva: string;
  /** Notas cuyos enlaces cambian, con cuántos */
  cambios: { ruta: string; veces: number }[];
}

function rutaConNombre(ficha: Pick<FichaMundo, "ruta">, nuevo: string): string {
  return unir(carpetaDe(ficha.ruta), `${nuevo}.md`);
}

/** Lo que cambiaría al renombrar, sin escribir nada (RF-4) */
export async function planRenombrar(fs: Fs, vault: string, rutas: RutasWiki, mesa: string, ficha: FichaMundo, nuevo: string): Promise<PlanRenombrar> {
  const limpio = nuevo.trim();
  const rutaNueva = rutaConNombre(ficha, limpio);
  if (!nombreMundoValido(limpio)) return { ok: false, motivo: `El nombre «${nuevo}» no vale para un fichero (sin / \\ : * ? " < > | # ^ [ ]).`, rutaNueva, cambios: [] };
  if (clave(limpio) === clave(ficha.nombre) && limpio === ficha.nombre) return { ok: false, motivo: "Es el mismo nombre.", rutaNueva, cambios: [] };
  if (limpio.toLowerCase() !== ficha.nombre.toLowerCase() && (await fs.existe(unir(vault, rutaNueva)))) return { ok: false, motivo: `Ya hay una ficha llamada «${limpio}» en esa carpeta.`, rutaNueva, cambios: [] };
  const cambios: PlanRenombrar["cambios"] = [];
  const propia = unir(vault, ficha.ruta).toLowerCase();
  for (const abs of await notasDeLaSerie(fs, vault, rutas, mesa)) {
    if (abs.toLowerCase() === propia) continue;
    try {
      const veces = (( await fs.leer(abs)).match(patronEnlace(ficha.nombre)) ?? []).length;
      if (veces) cambios.push({ ruta: abs, veces });
    } catch {
      // Una nota que no se lee no se toca
    }
  }
  return { ok: true, rutaNueva, cambios };
}

export interface OpcionesCambio {
  fecha: string;
  hora: string;
  /** Carpeta de las copias de cómo estaban las notas (`appDatos/<serie>/_fichas`) */
  copias: string;
}

export interface ResultadoRenombrar {
  ok: boolean;
  motivo?: string;
  rutaNueva: string;
  cambiadas: number;
  /** Notas que no se pudieron actualizar: se dicen, el renombrado ya está hecho */
  fallos: string[];
}

async function copiaPrevia(fs: Fs, carpeta: string, abs: string, texto: string, op: OpcionesCambio): Promise<void> {
  await fs.crearDir(carpeta);
  const base = `${op.fecha} ${op.hora} ${nombreDe(abs).replace(/\.md$/, "")}`;
  for (let n = 1; ; n++) {
    const ruta = unir(carpeta, `${base}${n > 1 ? ` (${n})` : ""}.md.bak`);
    if (await fs.existe(ruta)) continue;
    await escribirSeguro(fs, ruta, texto);
    return;
  }
}

/**
 * Renombra la nota (primero, de un golpe) y después actualiza los enlaces de la
 * serie, dejando copia de cómo estaba cada nota (RF-4). Si una nota falla, se dice.
 */
export async function aplicarRenombrar(fs: Fs, vault: string, rutas: RutasWiki, mesa: string, ficha: FichaMundo, nuevo: string, op: OpcionesCambio): Promise<ResultadoRenombrar> {
  const plan = await planRenombrar(fs, vault, rutas, mesa, ficha, nuevo);
  if (!plan.ok) return { ok: false, motivo: plan.motivo, rutaNueva: plan.rutaNueva, cambiadas: 0, fallos: [] };
  const limpio = nuevo.trim();
  const de = unir(vault, ficha.ruta);
  const a = unir(vault, plan.rutaNueva);
  let paso: string | null = null;
  let texto = "";
  try {
    texto = await fs.leer(de);
    await copiaPrevia(fs, op.copias, de, texto, op);
    if (de.toLowerCase() === a.toLowerCase()) {
      // Solo cambian mayúsculas: en discos que no las distinguen hace falta pasar por un nombre intermedio
      paso = `${de}.renombrando`;
      await fs.renombrar(de, paso);
      await fs.renombrar(paso, a);
      paso = null;
    } else await fs.renombrar(de, a);
  } catch (e) {
    // Si se quedó a medias en el nombre intermedio, se devuelve a su sitio
    if (paso) await fs.renombrar(paso, de).catch(() => undefined);
    return { ok: false, motivo: `No se pudo renombrar la ficha: ${(e as Error).message}`, rutaNueva: plan.rutaNueva, cambiadas: 0, fallos: [] };
  }
  const fallos: string[] = [];
  // El título de dentro, releyendo justo antes de escribir: si la nota cambió por fuera, no se pisa
  try {
    const titulo = new RegExp(`^# ${escapar(ficha.nombre)}[ \t]*$`, "m");
    const actual = await fs.leer(a);
    if (titulo.test(actual)) {
      // La copia de antes de renombrar ya tiene este texto; solo se hace otra si cambió entre medias
      if (actual !== texto) await copiaPrevia(fs, op.copias, a, actual, op);
      const otra = await fs.leer(a);
      if (otra === actual) await escribirSeguro(fs, a, actual.replace(titulo, `# ${limpio}`));
      else fallos.push(`${nombreDe(a)} (cambió mientras tanto: el título no se tocó)`);
    }
  } catch (e) {
    fallos.push(`${nombreDe(a)} (título: ${(e as Error).message})`);
  }
  let cambiadas = 0;
  for (const c of plan.cambios) {
    try {
      const antes = await fs.leer(c.ruta);
      const despues = antes.replace(patronEnlace(ficha.nombre), (_m, carpeta: string, resto: string) => `[[${carpeta}${limpio}${resto}]]`);
      if (despues === antes) continue;
      await copiaPrevia(fs, op.copias, c.ruta, antes, op);
      // Se relee justo antes de escribir: si cambió mientras tanto (Obsidian, la nube), no se pisa
      if ((await fs.leer(c.ruta)) !== antes) {
        fallos.push(`${nombreDe(c.ruta)} (cambió mientras tanto: sus enlaces no se tocaron)`);
        continue;
      }
      await escribirSeguro(fs, c.ruta, despues);
      cambiadas++;
    } catch (e) {
      fallos.push(`${nombreDe(c.ruta)} (${(e as Error).message})`);
    }
  }
  try {
    await anotarLog(fs, vault, rutas, op.fecha, `Renombrar ficha: ${ficha.nombre} → ${limpio}`, `Renombrada desde Atelier; ${cambiadas} nota${cambiadas === 1 ? "" : "s"} con enlaces actualizados.`);
  } catch {
    // El Log no impide el renombrado
  }
  return { ok: true, rutaNueva: plan.rutaNueva, cambiadas, fallos };
}

// ---- Mover y quitar

/** Mueve la ficha a otra subcarpeta de su misma categoría (RF-5). Devuelve su ruta nueva */
export async function moverFicha(fs: Fs, vault: string, rutas: RutasWiki, ficha: FichaMundo, subcarpeta: string, op: Pick<OpcionesCambio, "fecha">): Promise<string> {
  const dir = carpetaDeCategoria(rutas, ficha.categoria);
  if (!dir) throw new Error("La serie no tiene carpeta para esta categoría.");
  const sub = subcarpeta.replace(/^\/+|\/+$/g, "");
  if (!subcarpetaValida(sub)) throw new Error("La carpeta no vale.");
  const nueva = unir(dir, sub, `${ficha.nombre}.md`);
  if (nueva.toLowerCase() === ficha.ruta.toLowerCase()) return ficha.ruta;
  if (await fs.existe(unir(vault, nueva))) throw new Error(`Ya hay una ficha llamada «${ficha.nombre}» en esa carpeta.`);
  await fs.crearDir(carpetaDe(unir(vault, nueva)));
  await fs.renombrar(unir(vault, ficha.ruta), unir(vault, nueva));
  try {
    await anotarLog(fs, vault, rutas, op.fecha, `Mover ficha: ${ficha.nombre}`, `Movida desde Atelier a \`${nueva}\`.`);
  } catch {
    // El Log no impide mover
  }
  return nueva;
}

/** Manda la ficha a la papelera de la serie (RF-5): nunca se borra. Devuelve dónde queda */
export async function quitarFicha(fs: Fs, vault: string, rutas: RutasWiki, mesa: string, ficha: FichaMundo, op: Pick<OpcionesCambio, "fecha" | "hora">): Promise<string> {
  const dir = unir(mesa, "_papelera", "_wiki");
  await fs.crearDir(dir);
  let destino = unir(dir, `${op.fecha} ${op.hora} ${ficha.nombre}.md`);
  for (let n = 2; await fs.existe(destino); n++) destino = unir(dir, `${op.fecha} ${op.hora} ${ficha.nombre} (${n}).md`);
  await fs.renombrar(unir(vault, ficha.ruta), destino);
  try {
    await anotarLog(fs, vault, rutas, op.fecha, `Quitar ficha: ${ficha.nombre}`, `Mandada a la papelera de la serie desde Atelier (\`${ficha.ruta}\`).`);
  } catch {
    // El Log no impide quitar
  }
  return destino;
}

/** Copia aparte de lo que había en pantalla («copiar la mía», RF-12) */
export async function copiarMia(fs: Fs, mesa: string, nombre: string, texto: string, op: Pick<OpcionesCambio, "fecha" | "hora">): Promise<string> {
  const dir = unir(mesa, "_papelera", "_wiki");
  await fs.crearDir(dir);
  let destino = unir(dir, `${op.fecha} ${op.hora} ${nombre} copia.md`);
  for (let n = 2; await fs.existe(destino); n++) destino = unir(dir, `${op.fecha} ${op.hora} ${nombre} copia (${n}).md`);
  await escribirSeguro(fs, destino, texto);
  return destino;
}

// ---- Relaciones (RF-14c) y bloc de ideas (RF-11)

/** El texto de la nota con `relaciones` puesto; el resto de propiedades y el cuerpo, intactos (RF-13) */
export function conRelaciones(texto: string, relaciones: Relacion[]): string {
  const bom = texto.startsWith("\uFEFF") ? "\uFEFF" : "";
  const cuerpo = texto.slice(bom.length);
  const fin = cuerpo.includes("\r\n") ? "\r\n" : "\n";
  const md = cuerpo.replace(/\r\n/g, "\n");
  const lista = relaciones.map((r) => `[[${r.con}]]${r.tipo.trim() ? ` — ${r.tipo.trim()}` : ""}`);
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  let salida: string;
  if (!m) salida = `---\n${stringify({ relaciones: lista })}---\n${md}`;
  else {
    const doc = parseDocument(m[1]!);
    if (doc.errors.length) return texto;
    if (!lista.length && !doc.has("relaciones")) return texto;
    doc.set("relaciones", lista);
    const yaml = doc.toString().replace(/\n$/, "");
    salida = `---\n${yaml}\n---\n${md.slice(m[0].length)}`;
  }
  return bom + (fin === "\r\n" ? salida.replace(/\n/g, "\r\n") : salida);
}

const APARTADO_IDEAS = /^## Ideas[ \t]*$/m;

/** Las ideas apuntadas en la ficha: líneas de la sección «Ideas» */
export function leerIdeas(texto: string): string[] {
  const { cuerpo } = separar(texto);
  const m = APARTADO_IDEAS.exec(cuerpo);
  if (!m) return [];
  const resto = cuerpo.slice(m.index + m[0].length);
  const fin = resto.search(/^## /m);
  return (fin < 0 ? resto : resto.slice(0, fin))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s+/, ""));
}

/** Añade una idea al final de la sección «Ideas» (la crea antes de «Fuentes», o al final) */
export function conIdea(texto: string, idea: string): string {
  const linea = idea.replace(/\s+/g, " ").trim();
  if (!linea) return texto;
  const fin = texto.includes("\r\n") ? "\r\n" : "\n";
  const md = texto.replace(/\r\n/g, "\n");
  const m = APARTADO_IDEAS.exec(md);
  let salida: string;
  if (m) {
    const desde = m.index + m[0].length;
    const resto = md.slice(desde);
    const sig = resto.search(/^## /m);
    const cuerpo = (sig < 0 ? resto : resto.slice(0, sig)).replace(/\s+$/, "");
    const cola = sig < 0 ? "" : `\n\n${resto.slice(sig)}`;
    salida = `${md.slice(0, desde)}${cuerpo ? `${cuerpo}\n` : "\n\n"}- ${linea}${cola || "\n"}`;
  } else {
    const f = /^## Fuentes[ \t]*$/m.exec(md);
    if (f) salida = `${md.slice(0, f.index)}## Ideas\n\n- ${linea}\n\n${md.slice(f.index)}`;
    else salida = `${md.replace(/\s*$/, "")}\n\n## Ideas\n\n- ${linea}\n`;
  }
  return fin === "\r\n" ? salida.replace(/\n/g, "\r\n") : salida;
}
