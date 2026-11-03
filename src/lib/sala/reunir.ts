// Reunir lo que lleva un planteamiento para la sala (spec 012, RF-23 a RF-25,
// RF-28). Lee de la serie principal (también con una variante abierta) y de la
// ficha de la wiki; no escribe nada (RF-30). Lo que no se puede leer se dice en
// su sección y el resto sigue.

import type { Sesion } from "../app/sesion";
import { CAMPOS_VISTOS, expandir, type CampoVisto, type Valor } from "../consecuencias/campos-vistos";
import { reglasDelAviso } from "../consecuencias/efectos";
import * as c from "../modelo/consultas";
import { fechaVista } from "../modelo/conocen-desde";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Pieza, Secreto } from "../modelo/tipos";
import { ESTADO, etiqueta } from "../modelo/vocabulario";
import { ETIQUETA_TIPO, estadoTarjeta } from "../pizarra/resolver";
import type { Pizarra } from "../pizarra/tipos";
import { filasProvoca, filasVieneDe, type FilaCausa } from "../vistas/causas";
import { quienSabe, textoPublico } from "../vistas/quien-sabe";
import { leerAlternativas } from "../wiki/alternativas";
import { claveLimpia, textoSeguro } from "../wiki/md";
import { unir } from "../almacen/fs";
import { ordenEmision } from "../vistas/historia";
import { alias, clavePersonaje, existeLente, personajesDeSerie, relacion, type Lente } from "../vistas/lente";
import { notasUnidas } from "./notas";
import type { EntradaSala, SeccionSala } from "./planteamiento";
import { limpiar } from "./texto";

/** Lo que se lleva a la sala: una pieza de la serie o el personaje que enfoca la lente */
export type OrigenSala = { tipo: "pieza"; id: string } | { tipo: "personaje"; clave: string; nombre: string };

export interface ContextoSala {
  /** La pizarra: cargada, `{ nolee }` si no se pudo leer, o null si no hay que mirar notas */
  pizarra: Pizarra | { nolee: string } | null;
  /** Hay una variante abierta: el planteamiento lleva la serie y lo dice */
  conVariante: boolean;
}

export const NO_ESTA = "Esa pieza ya no está en la serie, así que no hay nada que llevar a la sala.";
export const NO_ESTA_LENTE = "Lo que enfocaba la lente ya no está en la serie, así que no hay nada que llevar a la sala.";

const NUL = String.fromCharCode(0);

/** Una casilla de la rejilla es «texto, NUL, episodio»: se lee como «texto · T01E01» */
function casilla(x: string, m: Modelo): string {
  const [texto, episodio] = x.split(NUL);
  if (episodio === undefined) return x.trim();
  return [texto.trim(), episodio ? c.codigo(m, episodio) || "ya no está" : ""].filter(Boolean).join(" · ");
}

const enLinea = (s: string) => limpiar(s).replace(/\s+/g, " ").trim();

/** Un valor de campo en una línea; "" si no hay nada que decir */
function textoValor(cv: CampoVisto<Pieza>, v: Valor, m: Modelo): string {
  const uno = (x: string) => (x.trim() ? enLinea(cv.ver ? cv.ver(x, m) : x) : "");
  if (typeof v === "string") return uno(v);
  if (Array.isArray(v)) return v.map(uno).filter(Boolean).join(" · ");
  return Object.entries(v)
    .map(([k, x]) => [k, casilla(x, m)] as const)
    .filter(([, x]) => x)
    .map(([k, x]) => `${cv.casilla && m.pieza(k) ? cv.casilla(k, m) : k}: ${x}`)
    .join(" · ");
}

/** Los campos que la app entiende de una pieza, uno por línea, sin los vacíos */
function camposDe(p: Pieza, m: Modelo): string[] {
  const lineas: string[] = [];
  for (const cv of expandir((CAMPOS_VISTOS[p.tipo] ?? []) as CampoVisto<Pieza>[], p)) {
    const v = textoValor(cv, cv.valor(p), m);
    if (v) lineas.push(`${cv.nombre ? cv.nombre(p) : cv.etiqueta}: ${v}`);
  }
  return lineas;
}

/** La ficha de la wiki sin las propiedades de arriba: las que cuentan ya salen en el estado y los avisos */
function cuerpoDeFicha(texto: string): string {
  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  return t.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "");
}

const lineasDeFicha = (texto: string) => cuerpoDeFicha(texto).replace(/\s+$/, "").split(/\r?\n/);

type Contenido ={ lineas: string[]; literal?: boolean } | null;

/** Una sección que se lee: si falla, queda `{ nolee }` y se sigue (RF-25) */
async function seccion(clave: Exclude<SeccionSala["clave"], never>, titulo: string, leer: () => Contenido | Promise<Contenido>): Promise<SeccionSala | null> {
  try {
    const r = await leer();
    return r ? { clave, titulo, lineas: r.lineas, literal: r.literal } : null;
  } catch (e) {
    return { clave, titulo, nolee: (e as Error).message || "error desconocido" };
  }
}

const filaCausa = (que: string, f: FilaCausa) => `- ${que}: ${textoSeguro(f.titulo)}${f.donde ? ` (${textoSeguro(f.donde)})` : ""}${f.marcas.length ? ` ${f.marcas.map(textoSeguro).join(" ")}` : ""}`;

/** Lo que cuenta una ficha de la wiki: su texto y, si es de arco, sus alternativas descartadas */
interface FichaWiki {
  lineas: string[];
  alternativas: { titulo: string; porque: string }[];
}

async function fichaDeWiki(s: Sesion, p: Pieza): Promise<FichaWiki | null> {
  // Sin enlace a una ficha no hay nada que leer ni que decir
  if (!String((p as { wiki?: unknown }).wiki ?? "").trim()) return null;
  const f = await s.leerFichaDe(p.id);
  if (!f) throw new Error("la ficha de la wiki no está o no se puede leer");
  return { lineas: lineasDeFicha(f.texto), alternativas: leerAlternativas(f.texto) };
}

function seccionAvisos(s: Sesion, id: string): Contenido {
  const m = s.modelo;
  const lineas = s
    .resultado()
    .avisos.filter((a) => a.pieza === id)
    .map((a) => {
      const reglas = reglasDelAviso(a, m, s.guia).map((r) => `\n  - Regla ${textoSeguro(r.id)}: ${textoSeguro(r.texto)}`);
      return `- ${textoSeguro(a.mensaje)} (${textoSeguro(a.id)})${reglas.join("")}`;
    });
  return { lineas };
}

/** Qué sabe quién de un secreto: los que lo conocen con su fecha, y lo que sabe el público en cada temporada con filas */
function seccionQuienSabe(s: Sesion, sec: Secreto): Contenido {
  const m = s.modelo;
  const lineas = sec.conocen
    .filter((n) => n.trim())
    .map((n) => {
      const f = fechaVista(m, sec, n);
      const desde = f === "sin" ? "sin fecha" : "rota" in f ? "fecha que no es un episodio" : c.codigo(m, f.episodio) || "ya no está";
      return `- Lo conocen: ${textoSeguro(n)} · lo sabe desde ${textoSeguro(desde)}`;
    });
  for (const t of c.temporadasEnOrden(m)) {
    const fila = quienSabe(m, s.wiki, t.id).filas.find((x) => x.secreto.id === sec.id);
    const ultima = fila?.casillas.at(-1);
    if (ultima) lineas.push(`- El público al acabar ${textoSeguro(c.codigo(m, t.id) || "la temporada")}: ${textoSeguro(textoPublico(ultima))}`);
  }
  return { lineas };
}

/** La ficha de wiki de un personaje sin sus propiedades; null si no tiene */
async function fichaDePersonaje(s: Sesion, clave: string): Promise<string[] | null> {
  const f = s.wiki.de("personaje").find((x) => claveLimpia(x.nombre) === clave);
  if (!f) return null;
  const texto = await s.almacen.fs.leer(unir(s.vault, f.ruta)).catch(() => null);
  if (texto === null) throw new Error("la ficha de la wiki no está o no se puede leer");
  return lineasDeFicha(texto);
}

async function reunirPersonaje(s: Sesion, origen: Extract<OrigenSala, { tipo: "personaje" }>): Promise<EntradaSala | { error: string }> {
  const m = s.modelo;
  const lente: Lente = { tipo: "personaje", clave: origen.clave, nombre: origen.nombre };
  if (!existeLente(m, null, s.wiki, lente)) return { error: NO_ESTA_LENTE };
  const nombre = personajesDeSerie(m, s.wiki).get(origen.clave)?.nombre ?? origen.nombre;
  const al = alias(s.wiki);
  const rel = relacion(m, al, lente);
  const escenas = [...rel.escenas].flatMap((id) => (m.eventos.get(id) ? [m.eventos.get(id)!] : [])).sort(ordenEmision(m));
  const arcos = new Set(escenas.flatMap((e) => e.arcos.map((x) => x.arco)));
  const secretos = [...m.secretos.values()].filter((x) => rel.secretos.has(x.id));

  const secciones = [
    await seccion("ficha", "Ficha", async () => {
      const lineas = await fichaDePersonaje(s, origen.clave);
      return lineas ? { lineas, literal: true } : null;
    }),
    await seccion("causas", "Con qué se relaciona", () => ({
      lineas: [
        ...c.arcosEnOrden(m).filter((a) => arcos.has(a.id)).map((a) => `- Arco: ${textoSeguro(a.titulo) || "Sin título"}`),
        ...secretos.map((x) => `- Secreto: ${textoSeguro(x.titulo) || "Sin título"}`),
        ...escenas.map((e) => {
          const v = estadoTarjeta(m, { pieza: e.id });
          const descartada = estadoDe(e) === "descartado" ? " (descartada)" : "";
          return `- Aparece en: ${textoSeguro(v.titulo)}${v.detalle ? ` · ${textoSeguro(v.detalle)}` : ""}${descartada}`;
        }),
      ],
    })),
    await seccion("quien-sabe", "Lo que sabe", () => ({
      lineas: secretos.map((x) => {
        const n = x.conocen.find((y) => clavePersonaje(al, y) === origen.clave) ?? nombre;
        const f = fechaVista(m, x, n);
        const desde = f === "sin" ? "sin fecha" : "rota" in f ? "fecha que no es un episodio" : c.codigo(m, f.episodio) || "ya no está";
        return `- Secreto «${textoSeguro(x.titulo) || "Sin título"}», lo sabe desde ${textoSeguro(desde)}`;
      }),
    })),
  ];
  return { tipo: "Personaje", titulo: nombre, estado: "", secciones: secciones.filter((x): x is SeccionSala => !!x), notas: null };
}

export async function reunirSala(s: Sesion, origen: OrigenSala, ctx: ContextoSala): Promise<EntradaSala | { error: string }> {
  if (origen.tipo === "personaje") return reunirPersonaje(s, origen);
  const m = s.modelo;
  const p = m.pieza(origen.id);
  if (!p || (p.tipo !== "episodio" && p.tipo !== "evento" && p.tipo !== "arco" && p.tipo !== "secreto")) return { error: NO_ESTA };
  const v = estadoTarjeta(m, { pieza: p.id });
  if (!v.tipo) return { error: NO_ESTA };

  // La ficha de la wiki se lee una vez, para la sección de ficha y las alternativas
  let wiki: FichaWiki | null = null;
  let wikiError: string | null = null;
  if (p.tipo === "arco" || p.tipo === "secreto") {
    try {
      wiki = await fichaDeWiki(s, p);
    } catch (e) {
      wikiError = (e as Error).message;
    }
  }

  const secciones: (SeccionSala | null)[] = [
    await seccion("ficha", "Ficha", () => {
      if (wikiError) throw new Error(wikiError);
      if (wiki) return { lineas: wiki.lineas, literal: true };
      if (p.tipo === "episodio" || p.tipo === "evento") return { lineas: camposDe(p, m), literal: true };
      return null;
    }),
    await seccion("avisos", "Avisos activos", () => seccionAvisos(s, p.id)),
    await seccion("causas", "De qué viene y qué provoca", () => {
      if (p.tipo !== "evento") return null;
      return { lineas: [...filasVieneDe(m, p).map((f) => filaCausa("Viene de", f)), ...filasProvoca(m, p).map((f) => filaCausa("Provoca", f))] };
    }),
    await seccion("quien-sabe", "Qué sabe quién", () => (p.tipo === "secreto" ? seccionQuienSabe(s, p) : null)),
    await seccion("cambios", "Si lo dejas así…", () => {
      // Solo la pieza abierta con punto de partida (RF-23.6)
      if (s.comparacion?.piezaId !== p.id) return null;
      const e = s.efectos();
      return { lineas: [...(e?.cambios ?? []).map((x) => `- Cambia: ${textoSeguro(x)}`), ...(e?.avisosNuevos ?? []).map((x) => `- Aviso nuevo: ${textoSeguro(x.aviso.mensaje)}`)] };
    }),
    await seccion("alternativas", "Alternativas descartadas", () => {
      if (p.tipo !== "arco" || !wiki) return null;
      return { lineas: wiki.alternativas.map((a) => `- ${textoSeguro(a.titulo) || "Sin título"}${a.porque ? `: ${textoSeguro(a.porque)}` : ""}`) };
    }),
  ];

  return {
    tipo: `${ETIQUETA_TIPO[v.tipo]}${v.detalle ? ` · ${v.detalle}` : ""}`,
    titulo: v.titulo,
    estado: etiqueta(ESTADO, estadoDe(p)),
    conVariante: ctx.conVariante,
    secciones: secciones.filter((x): x is SeccionSala => !!x),
    notas: ctx.pizarra === null ? null : "nolee" in ctx.pizarra ? ctx.pizarra : notasUnidas(ctx.pizarra, p.id),
  };
}
