// Pasar a la wiki (spec 10.2, reglas 2, 3, 5, 9 y 10; T8.4): crea la ficha de
// una temporada, un episodio, un arco o un secreto con su plantilla, en
// borrador, rellenando lo que la app sabe. Añade Fuentes y una entrada en el
// Log. Solo enlaza fichas que existen. La verdad de un secreto solo va en su
// propia ficha. Si la ficha ya existe, no la toca. Si otra nota del vault se
// llama igual, no crea nada hasta que el autor elija otro nombre (Guía §6).

import { isMap, parseDocument } from "yaml";
import { carpetaDe, unir, type Fs } from "../almacen/fs";
import { fechaVista } from "../modelo/conocen-desde";
import * as c from "../modelo/consultas";
import { tramaDominante } from "../modelo/dominante";
import type { Modelo } from "../modelo/modelo";
import type { Arco, Episodio, Pieza, Secreto, Temporada } from "../modelo/tipos";
import { BEATS, CARPETA, etiqueta } from "../modelo/vocabulario";
import { donde } from "../vistas/textos";
import { codigoEscena, escaletaDe } from "./escaleta";
import { anotarLog } from "./log";
import { celdas, clave, enUnaLinea, esSeparador } from "./md";
import { nombreValido, PLANTILLA, ponerFuentes, rellenar } from "./plantillas";

export interface OpcionesPasar {
  /** AAAA-MM-DD */
  fecha: string;
  /** "appDatos/_prueba": la carpeta de la serie, relativa al vault */
  carpetaSerie: string;
  /** Nombre elegido por el autor si el de siempre está repetido */
  nombre?: string;
}

export interface ResultadoPasar {
  estado: "creada" | "ya existía" | "nombre repetido";
  nombre: string;
  /** Relativa al vault */
  ruta: string;
  /** Otras notas del vault con el mismo nombre */
  repetidas: string[];
  /** La pieza enlazada a su ficha, para guardarla */
  pieza: Pieza | null;
  /** Nombres que se han dejado como texto porque no tienen ficha */
  sinFicha: string[];
}

type Pasable = Temporada | Episodio | Arco | Secreto;
const SUBCARPETA = { temporada: "Temporadas", episodio: "Episodios", arco: "Arcos", secreto: "Secretos" } as const;

// ---------------------------------------------------------------------------
// Índice de notas del vault (para enlazar solo lo que existe y ver repetidos)

const FUERA = new Set([".obsidian", ".trash", "_Plantillas", "appDatos", "node_modules"]);

async function indiceNotas(fs: Fs, vault: string, extra: string[]): Promise<Map<string, string[]>> {
  const indice = new Map<string, string[]>();
  const anotar = (rel: string) => {
    const nombre = rel.slice(rel.lastIndexOf("/") + 1).replace(/\.md$/, "");
    const k = clave(nombre);
    indice.set(k, [...(indice.get(k) ?? []), rel]);
  };
  const recorrer = async (rel: string, raiz: boolean) => {
    const abs = rel ? unir(vault, rel) : vault;
    if (!(await fs.existe(abs))) return;
    for (const e of await fs.listar(abs)) {
      if (e.nombre.startsWith(".")) continue;
      const hijo = rel ? `${rel}/${e.nombre}` : e.nombre;
      if (e.esDir) {
        if (raiz && FUERA.has(e.nombre)) continue;
        await recorrer(hijo, false);
      } else if (e.nombre.endsWith(".md")) anotar(hijo);
    }
  };
  await recorrer("", true);
  // La wiki de la serie puede estar dentro de appDatos (la falsa de _prueba)
  for (const rel of extra) if (rel.startsWith("appDatos/")) await recorrer(rel, false);
  return indice;
}

// ---------------------------------------------------------------------------
// Tocar la plantilla

// En una línea, sin control ni bidi (revisión de seguridad de la spec 010)
const celda = (s: string) => enUnaLinea(s).replace(/\|/g, "\\|");

/** Sustituye las filas de la tabla cuya cabecera empieza por `primera`; sin filas, la deja */
function tabla(texto: string, primera: string, filas: string[][]): string {
  if (!filas.length) return texto;
  const lineas = texto.split("\n");
  const i = lineas.findIndex((l) => l.trim().startsWith("|") && clave(celdas(l)[0] ?? "") === clave(primera));
  if (i < 0 || !esSeparador(lineas[i + 1] ?? "")) return texto;
  let fin = i + 2;
  while (fin < lineas.length && lineas[fin].trim().startsWith("|")) fin++;
  const nuevas = filas.map((f) => `| ${f.map(celda).join(" | ")} |`);
  return [...lineas.slice(0, i + 2), ...nuevas, ...lineas.slice(fin)].join("\n");
}

/**
 * Como `tabla`, pero cada valor va en la columna de su cabecera, esté donde
 * esté; lo que no tiene columna no se escribe, y las columnas sin valor quedan
 * vacías (spec 010, RF-30: «Lo sabe desde» va solo en su columna).
 */
function tablaPorColumnas(texto: string, primera: string, filas: [cabecera: string, valor: string][][]): string {
  if (!filas.length) return texto;
  const lineas = texto.split("\n");
  const i = lineas.findIndex((l) => l.trim().startsWith("|") && clave(celdas(l)[0] ?? "") === clave(primera));
  if (i < 0) return texto;
  const cabeceras = celdas(lineas[i]).map(clave);
  return tabla(
    texto,
    primera,
    filas.map((f) => {
      const porCabecera = new Map(f.map(([k, v]) => [clave(k), v]));
      return cabeceras.map((k) => porCabecera.get(k) ?? "");
    }),
  );
}

/** "- **Pregunta dramática:** " → con su valor */
function linea(texto: string, etiquetaLinea: string, valor: string): string {
  if (!valor.trim()) return texto;
  const re = new RegExp(`^- \\*\\*${escapar(etiquetaLinea)}:\\*\\*.*$`, "m");
  return texto.replace(re, `- **${etiquetaLinea}:** ${celdaLibre(valor)}`);
}

/** "> **Logline:** [PENDIENTE]" → con su valor */
function cita(texto: string, etiquetaCita: string, valor: string): string {
  if (!valor.trim()) return texto;
  const re = new RegExp(`^> \\*\\*${escapar(etiquetaCita)}:\\*\\*.*$`, "m");
  return texto.replace(re, `> **${etiquetaCita}:** ${celdaLibre(valor)}`);
}

/** Un párrafo debajo de un encabezado (y de su comentario, si lo tiene) */
function bajo(texto: string, encabezado: string, valor: string): string {
  if (!valor.trim()) return texto;
  const lineas = texto.split("\n");
  const i = lineas.findIndex((l) => l.trim() === encabezado);
  if (i < 0) return texto;
  let j = i + 1;
  while (j < lineas.length && (lineas[j].trim() === "" || lineas[j].trim().startsWith("<!--"))) {
    if (lineas[j].trim().startsWith("<!--")) {
      while (j < lineas.length && !lineas[j].includes("-->")) j++;
    }
    j++;
  }
  // j apunta a la primera línea con contenido tras el encabezado y su comentario
  let k = j;
  while (k > i + 1 && lineas[k - 1].trim() === "") k--;
  return [...lineas.slice(0, k), "", valor.trim(), "", ...lineas.slice(j)].join("\n").replace(/\n{3,}/g, "\n\n");
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const celdaLibre = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();

/** Pone propiedades sin desordenar las de la plantilla */
function propiedades(texto: string, valores: Record<string, unknown>): string {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return texto;
  const doc = parseDocument(m[1]);
  if (!isMap(doc.contents)) return texto;
  for (const [k, v] of Object.entries(valores)) doc.set(k, v);
  const yaml = doc.toString({ lineWidth: 0 });
  return `---\n${yaml}---\n${texto.slice(m[0].length)}`;
}

// ---------------------------------------------------------------------------
// Contenido de cada ficha

interface Ctx {
  m: Modelo;
  /** ¿Existe una nota con ese nombre? */
  existe: (nombre: string) => boolean;
  sinFicha: Set<string>;
}

const limpio = (s: string) => s.replace(/^\s*\[\[|\]\]\s*$/g, "").trim();

/** "[[Telmo]]" si tiene ficha; "Telmo" si no (regla 3) */
function enlace(ctx: Ctx, nombre: string): string {
  const n = limpio(nombre);
  if (!n) return "";
  if (ctx.existe(n)) return `[[${n}]]`;
  ctx.sinFicha.add(n);
  return n;
}

/** Nombre de la ficha de una pieza que ya se pasó, o null */
const fichaDe = (p: { wiki?: string }) => (p.wiki ? limpio(p.wiki) : null);

function enlacePieza(ctx: Ctx, p: { wiki?: string; titulo: string }, nombreSinFicha: string): string {
  const f = fichaDe(p);
  return f && ctx.existe(f) ? `[[${f}]]` : nombreSinFicha || p.titulo || "Sin título";
}

export function nombreFicha(m: Modelo, p: Pasable): string {
  if (p.tipo === "temporada") return [c.codigo(m, p.id), p.titulo.trim()].filter(Boolean).join(" - ");
  if (p.tipo === "episodio") return [c.codigo(m, p.id), p.titulo.trim()].filter(Boolean).join(" - ");
  return p.titulo.trim() || p.id;
}

function temporada(ctx: Ctx, t: Temporada, texto: string): string {
  const { m } = ctx;
  const eps = c.episodiosDeTemporada(m, t.id);
  const arcos = c.arcosPresentes(m, t.id).filter((a) => a.madurez !== "descartado");
  const ordenArcos = new Map(c.arcosEnOrden(m).map((a, i) => [a.id, i]));
  arcos.sort((a, b) => a.tipo_trama.localeCompare(b.tipo_trama) || ordenArcos.get(a.id)! - ordenArcos.get(b.id)!);
  const nombreEp = (e: Episodio) => nombreFicha(m, e);

  texto = propiedades(texto, {
    estado_canon: "borrador",
    numero: m.indice().posTemporada.get(t.id)! + 1,
    episodios: eps.map((e) => enlacePieza(ctx, e, nombreEp(e))),
    arcos: arcos.map((a) => enlacePieza(ctx, a, a.titulo)),
  });
  texto = cita(texto, "Logline de temporada", t.logline);
  texto = linea(texto, "Pregunta dramática", t.pregunta_dramatica);
  texto = linea(texto, "Tema de la temporada", t.tema);
  texto = linea(texto, "Punto de partida", t.partida);
  texto = linea(texto, "Punto de llegada", t.llegada);
  texto = linea(texto, "Cierre / cliffhanger", t.cierre);

  texto = tabla(
    texto,
    "Trama",
    arcos.map((a) => {
      const enT = a.beats.filter((b) => b.temporada === t.id && b.texto.trim()).map((b) => b.texto.trim());
      return [a.tipo_trama, enlacePieza(ctx, a, a.titulo), enT.join("; ") || a.quiere];
    }),
  );
  texto = tabla(
    texto,
    "Nº",
    eps.map((e) => {
      const dom = tramaDominante(m, e.id);
      return [c.codigo(m, e.id).slice(3), enlacePieza(ctx, e, e.titulo), e.idea_central, dom ? m.arcos.get(dom)!.titulo : "", e.estado];
    }),
  );
  const tramo = (k: keyof Temporada["estructura"]) => {
    const x = t.estructura[k];
    return [x.episodio ? c.codigo(m, x.episodio).slice(3) : "", x.texto];
  };
  if (Object.values(t.estructura).some((x) => x.texto))
    texto = tabla(texto, "Tramo", [
      ["Planteamiento", ...tramo("detonante")],
      ["Punto medio", ...tramo("punto_medio")],
      ["Crisis", ...tramo("crisis")],
      ["Final", ...tramo("climax")],
    ]);
  texto = tabla(
    texto,
    "Personaje",
    arcos
      .filter((a) => a.tipo_arco === "personaje" && a.personaje)
      .map((a) => {
        const e = a.estados.find((x) => x.temporada === t.id);
        return [enlace(ctx, a.personaje), e?.inicio ?? "", e?.fin ?? "", a.cambia];
      }),
  );
  const ix = m.indice();
  const iT = ix.posTemporada.get(t.id);
  const epDe = (episodio: string, evento: string) => episodio || m.eventos.get(evento)?.episodio || "";
  const enEsta = (ep: string) => ix.posEpisodio.get(ep)?.iT === iT;
  const revelaciones: string[][] = [];
  for (const s of m.secretos.values()) {
    if (s.madurez === "descartado") continue;
    const rev = epDe(s.revelado_en.episodio, s.revelado_en.evento);
    if (rev && enEsta(rev)) revelaciones.push(["Revelación", enlacePieza(ctx, s, s.titulo), c.codigo(m, rev).slice(3), ""]);
    for (const p of s.pistas) {
      const ep = epDe(p.episodio, p.evento);
      if (ep && enEsta(ep)) revelaciones.push(["Siembra", p.texto, c.codigo(m, ep).slice(3), s.titulo]);
    }
  }
  texto = tabla(texto, "Tipo", revelaciones);
  return texto;
}

function episodio(ctx: Ctx, e: Episodio, texto: string): string {
  const { m } = ctx;
  const evs = c.eventosDeEpisodio(m, e.id).filter((x) => x.madurez !== "descartado");
  const t = m.temporadas.get(e.temporada);
  const unicos = (l: string[]) => [...new Set(l.map(limpio).filter(Boolean))];
  const arcos = unicos(evs.flatMap((x) => x.arcos.map((a) => a.arco)))
    .map((id) => m.arcos.get(id))
    .filter((a): a is Arco => !!a);

  texto = propiedades(texto, {
    estado_canon: "borrador",
    id: c.codigo(m, e.id),
    temporada: t ? enlacePieza(ctx, t, c.codigo(m, t.id)) : "",
    numero: (m.indice().posEpisodio.get(e.id)?.iE ?? 0) + 1,
    estado: e.estado,
    personajes: unicos(evs.flatMap((x) => x.personajes)).map((n) => enlace(ctx, n)),
    lugares: unicos(evs.flatMap((x) => x.lugares)).map((n) => enlace(ctx, n)),
    arcos: arcos.map((a) => enlacePieza(ctx, a, a.titulo)),
  });
  texto = cita(texto, "Logline", e.idea_central);
  texto = linea(texto, "Pregunta del episodio", e.conflicto);
  texto = linea(texto, "Trama A", arcos.filter((a) => a.tipo_trama === "A").map((a) => a.titulo).join(", "));
  texto = linea(texto, "Trama B", arcos.filter((a) => a.tipo_trama !== "A").map((a) => a.titulo).join(", "));
  texto = linea(texto, "Botón final", e.gancho);

  texto = tabla(
    texto,
    "Escena",
    evs.map((x, i) => {
      const arco = m.arcos.get(x.arcos[0]?.arco ?? "");
      return [codigoEscena(i), x.lugares[0] ? enlace(ctx, x.lugares[0]) : "", x.titulo, arco?.tipo_trama ?? "", "", "idea"];
    }),
  );
  // Los mismos códigos que lee después el aviso de la escaleta (spec 003, RF-39)
  const [teaser, uno, dos, tres] = escaletaDe(m, e.id).actos!;
  texto = tabla(texto, "Acto", [
    ["Teaser / cold open", teaser, e.actos.teaser, ""],
    ["Acto 1", uno, e.actos.inicio, ""],
    ["Acto 2", dos, e.actos.desarrollo, ""],
    ["Acto 3", tres, e.actos.desenlace, ""],
  ]);
  return texto;
}

function arco(ctx: Ctx, a: Arco, texto: string): string {
  const { m } = ctx;
  const presentes = c.temporadasEnOrden(m).filter((t) => c.arcosPresentes(m, t.id).some((x) => x.id === a.id));
  const quienes = a.tipo_arco === "personaje" ? [a.personaje] : a.protagonistas;
  texto = propiedades(texto, {
    estado_canon: "borrador",
    tipo_arco: a.tipo_arco,
    trama: a.tipo_trama,
    personajes: quienes.filter((x) => limpio(x)).map((n) => enlace(ctx, n)),
    temporadas: presentes.map((t) => enlacePieza(ctx, t, c.codigo(m, t.id))),
  });
  texto = cita(texto, "Resumen", a.quiere);
  texto = linea(texto, "Punto de partida", a.beats[0]?.texto ?? "");
  texto = linea(texto, "Punto de llegada", a.beats[4]?.texto || a.cambia);
  texto = linea(texto, "Conflicto que lo mueve", a.impide);
  texto = linea(texto, "Tema que explora", a.pegamento.por === "tema" ? a.pegamento.texto : "");
  texto = tabla(
    texto,
    "#",
    BEATS.map((b, i) => {
      const x = a.beats[i];
      const nombre = etiqueta(BEATS, b);
      return [String(i + 1), nombre[0].toUpperCase() + nombre.slice(1), x ? donde(m, x) : "", x?.texto ?? "", ""];
    }),
  );
  texto = tabla(
    texto,
    "Siembra",
    a.siembras.filter((s) => s.siembra.trim()).map((s) => [s.siembra, s.donde, s.recogida, s.donde_recogida]),
  );
  const descartados = [
    ...c.tramos(m, a.id).filter((x) => x.madurez === "descartado"),
    ...c.eventosDeArco(m, a.id).filter((x) => x.madurez === "descartado"),
  ];
  texto = tabla(
    texto,
    "Idea",
    descartados.map((x) => [x.titulo || "Sin título", x.motivo_descarte]),
  );
  return texto;
}

function secreto(ctx: Ctx, s: Secreto, texto: string): string {
  const { m } = ctx;
  const epDe = (episodio: string, evento: string) => episodio || m.eventos.get(evento)?.episodio || "";
  const cod = (episodio: string, evento: string) => c.codigo(m, epDe(episodio, evento));
  const primera = s.pistas.find((p) => epDe(p.episodio, p.evento));
  texto = propiedades(texto, {
    estado_canon: "borrador",
    nivel: s.nivel,
    conocen: s.conocen.filter((x) => limpio(x)).map((n) => enlace(ctx, n)),
    revelado_en: cod(s.revelado_en.episodio, s.revelado_en.evento),
    se_siembra_en: primera ? cod(primera.episodio, primera.evento) : "",
  });
  texto = bajo(texto, "### La verdad", s.verdad);
  texto = bajo(texto, "### Qué cree la audiencia hasta la revelación", s.cree_audiencia);
  const evRev = m.eventos.get(s.revelado_en.evento);
  texto = linea(texto, "Dónde", [cod(s.revelado_en.episodio, s.revelado_en.evento), evRev?.titulo].filter(Boolean).join(" · "));
  texto = tablaPorColumnas(
    texto,
    "Personaje",
    s.conocen
      .filter((x) => limpio(x))
      .map((n): [string, string][] => {
        const f = fechaVista(m, s, n);
        return [
          ["Personaje", enlace(ctx, n)],
          ["Lo sabe desde", typeof f === "object" && "episodio" in f ? c.codigo(m, f.episodio) : ""],
        ];
      }),
  );
  texto = tabla(
    texto,
    "Escena",
    s.pistas.filter((p) => p.texto.trim()).map((p) => [cod(p.episodio, p.evento), p.texto, p.clase, ""]),
  );
  // La de pistas falsas tiene la misma primera columna: se rellena la segunda tabla "Escena"
  const falsas = s.falsas.filter((p) => p.texto.trim()).map((p) => [cod(p.episodio, p.evento), p.texto, p.conclusion]);
  if (falsas.length) {
    const i = texto.indexOf("### Pistas falsas");
    if (i >= 0) texto = texto.slice(0, i) + tabla(texto.slice(i), "Escena", falsas);
  }
  return texto;
}

// ---------------------------------------------------------------------------

/** Lo que decide pasar a la wiki, sin escribir nada: el nombre, la ruta y si choca con otra nota (spec 006, RF-34b) */
export interface PasoPrevio {
  estado: "se puede" | "ya existía" | "nombre repetido";
  nombre: string;
  /** Relativa al vault */
  ruta: string;
  repetidas: string[];
}

/**
 * Comprueba si una pieza se puede pasar a la wiki, sin escribir: lanza si no
 * es de las que se pasan, falta la carpeta o la plantilla, o el nombre no vale.
 */
export async function comprobarPasar(fs: Fs, vault: string, m: Modelo, piezaId: string, op: Pick<OpcionesPasar, "nombre">): Promise<PasoPrevio> {
  const p = m.pieza(piezaId);
  if (!p || (p.tipo !== "temporada" && p.tipo !== "episodio" && p.tipo !== "arco" && p.tipo !== "secreto")) {
    throw new Error("Solo se pasan a la wiki temporadas, episodios, arcos y secretos.");
  }
  const rutas = m.serie.wiki;
  if (!rutas.narrativa) throw new Error("La serie no tiene carpeta de narrativa en la wiki: ponla en el Editar de la serie.");
  const nombre = (op.nombre ?? nombreFicha(m, p)).trim();
  if (!nombreValido(nombre)) throw new Error(`El nombre «${nombre}» no vale para un fichero (sin / \\ : * ? " < > | # ^ [ ]).`);
  const ruta = `${rutas.narrativa.replace(/\/+$/, "")}/${SUBCARPETA[p.tipo]}/${nombre}.md`;
  if (await fs.existe(unir(vault, ruta))) return { estado: "ya existía", nombre, ruta, repetidas: [] };
  const indice = await indiceNotas(fs, vault, [rutas.raiz]);
  const repetidas = (indice.get(clave(nombre)) ?? []).filter((r) => r !== ruta);
  if (repetidas.length) return { estado: "nombre repetido", nombre, ruta, repetidas };
  if (!(await fs.existe(unir(vault, PLANTILLA[p.tipo])))) throw new Error(`Falta la plantilla ${PLANTILLA[p.tipo]} en la wiki.`);
  return { estado: "se puede", nombre, ruta, repetidas: [] };
}

export async function pasarAWiki(fs: Fs, vault: string, m: Modelo, piezaId: string, op: OpcionesPasar): Promise<ResultadoPasar> {
  const p = m.pieza(piezaId);
  if (!p || (p.tipo !== "temporada" && p.tipo !== "episodio" && p.tipo !== "arco" && p.tipo !== "secreto")) {
    throw new Error("Solo se pasan a la wiki temporadas, episodios, arcos y secretos.");
  }
  const rutas = m.serie.wiki;
  if (!rutas.narrativa) throw new Error("La serie no tiene carpeta de narrativa en la wiki: ponla en el Editar de la serie.");
  const nombre = (op.nombre ?? nombreFicha(m, p)).trim();
  if (!nombreValido(nombre)) throw new Error(`El nombre «${nombre}» no vale para un fichero (sin / \\ : * ? " < > | # ^ [ ]).`);
  const ruta = `${rutas.narrativa.replace(/\/+$/, "")}/${SUBCARPETA[p.tipo]}/${nombre}.md`;
  const abs = unir(vault, ruta);

  const enlazada = async (): Promise<Pieza> => {
    const fecha = await fs.fecha(abs);
    const n = structuredClone(p);
    n.wiki = `[[${nombre}]]`;
    n.wiki_mtime = fecha ? new Date(fecha).toISOString() : "";
    return n;
  };

  if (await fs.existe(abs)) {
    return { estado: "ya existía", nombre, ruta, repetidas: [], pieza: await enlazada(), sinFicha: [] };
  }

  const indice = await indiceNotas(fs, vault, [rutas.raiz]);
  const repetidas = (indice.get(clave(nombre)) ?? []).filter((r) => r !== ruta);
  if (repetidas.length) return { estado: "nombre repetido", nombre, ruta, repetidas, pieza: null, sinFicha: [] };

  const ctx: Ctx = { m, existe: (n) => indice.has(clave(n)), sinFicha: new Set() };
  let texto = rellenar(await fs.leer(unir(vault, PLANTILLA[p.tipo])), nombre, op.fecha);
  if (p.tipo === "temporada") texto = temporada(ctx, p, texto);
  else if (p.tipo === "episodio") texto = episodio(ctx, p, texto);
  else if (p.tipo === "arco") texto = arco(ctx, p, texto);
  else texto = secreto(ctx, p, texto);

  const origen = `${op.carpetaSerie.replace(/\/+$/, "")}/${CARPETA[p.tipo]}/${p.id}.md`;
  texto = ponerFuentes(texto, `- \`${origen}\` — pasada desde Atelier el ${op.fecha}`);
  await fs.crearDir(carpetaDe(abs));
  await fs.escribir(abs, texto);
  await anotarLog(fs, vault, rutas, op.fecha, `Pasar a la wiki: ${nombre}`, `Ficha de ${p.tipo} creada en borrador desde Atelier (\`${origen}\`).`);
  return { estado: "creada", nombre, ruta, repetidas: [], pieza: await enlazada(), sinFicha: [...ctx.sinFicha] };
}
