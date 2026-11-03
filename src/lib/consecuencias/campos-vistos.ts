// Los campos con etiqueta del panel (y de las tarjetas de Tramas) y qué ha
// cambiado en ellos desde el punto de partida (spec 005, RF-8). Se compara lo
// que se ve, no la nota: escribir y borrar no deja nada, ni un valor escrito a
// mano que la app deja de usar (`crudos`). Las referencias se comparan por id
// y se enseñan con el código de cada momento: renumerar no es cambiar el campo.

import { idBase } from "../comprobaciones";
import type { Guia } from "../guia/guia-md";
import { DEJADO_ASI } from "../wiki/equivalencias";
import { reglasDe } from "../guia/marcas";
import { fechasDe } from "../modelo/conocen-desde";
import * as c from "../modelo/consultas";
import { cuenta, estadoDe, type ConEstado } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import { momento, plantilla, PLANTILLAS, type IdPlantilla } from "../modelo/plantillas";
import type { BeatArco, Pieza, PiezaDe } from "../modelo/tipos";
import { queEs } from "../modelo/viene-de";
import { leerVieneDe, textoCrudo } from "../modelo/viene-de";
import {
  ACTO,
  BEATS,
  CLASE_PUNTO,
  ESTADO,
  ESTADO_ESCRITURA,
  ESTADO_TEMPORADA,
  etiqueta,
  MODO,
  NIVEL_SECRETO,
  PAPEL,
  TIPO_ARCO,
  type Papel,
  type TipoPieza,
} from "../modelo/vocabulario";
import { mayus, sinCorchetes } from "../vistas/textos";
import { dondeSeEmite } from "../vistas/historia";
import { claveLimpia, nombreLimpio } from "../wiki/md";

/** Texto, lista (cuántos y cuáles) o rejilla (qué casilla) */
export type Valor = string | string[] | Record<string, string>;

export interface CampoVisto<P> {
  etiqueta: string;
  /** La etiqueta que lleva en esta pieza, si cambia con su tipo (`etiqueta={… ? "A" : "B"}`) */
  nombre?: (p: P) => string;
  /** Otras etiquetas con las que sale el mismo campo (en Tramas, o la de su tarjeta) */
  otras?: string[];
  /** Lo que se compara: ids, no códigos */
  valor: (p: P) => Valor;
  /** Cómo se ve un valor de texto o un elemento de lista */
  ver?: (v: string, m: Modelo) => string;
  /** Lo que se dice si el valor está vacío */
  vacio?: string;
  /** Etiquetas del panel que van dentro de una rejilla */
  dentro?: string[];
  /** Cómo se nombra una casilla de la rejilla (si su clave es un id) */
  casilla?: (k: string, m: Modelo) => string;
  /** Frase propia en vez de la de siempre (o null si no hay nada que decir) */
  frase?: (antes: P, ahora: P) => string | null;
  /**
   * Un campo que se ve como uno por elemento (spec 010, «Lo sabe desde (Telmo)»):
   * por clave, el nombre que se enseña y su valor de texto. Ver `expandir`.
   */
  partes?: (p: P) => Map<string, { nombre: string; valor: string }>;
}

type Tabla = { [T in TipoPieza]?: CampoVisto<PiezaDe<T>>[] };

const LARGO = 80;

/** Una línea, recortada */
export function recortar(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > LARGO ? `${t.slice(0, LARGO - 1).trimEnd()}…` : t;
}

const titulo = (p: Pieza | undefined) => (p && "titulo" in p ? p.titulo.trim() : "") || "Sin título";

/** Selector de pieza: su código y su título */
const pieza = (id: string, m: Modelo) => {
  const p = m.pieza(id);
  if (!p) return "ya no está";
  return [c.codigo(m, id), titulo(p)].filter(Boolean).join(" · ");
};
/** Selector de episodio dentro de su temporada: solo el código */
const codigo = (id: string, m: Modelo) => c.codigo(m, id) || "ya no está";
const carga = (v: string) => v;
const enlace = (v: string) => sinCorchetes(v);
/** Dos valores en uno, para compararlos juntos */
const par = (a: string, b: string) => (a || b ? `${a}\u0000${b}` : "");
const partes = (v: string) => v.split("\u0000") as [string, string];
/** Una posición (temporada, episodio): el código del episodio o, si no baja a episodio, el de la temporada */
const posicion = (v: string, m: Modelo) => {
  const [t, e] = partes(v);
  return codigo(e || t, m);
};
const posicionBeat = (b: BeatArco | undefined) => (b ? par(b.temporada, b.episodio) : "");
/** Dónde cae una pista o una revelación: el episodio y, si la tiene, su escena */
const enEscena = (v: string, m: Modelo) => {
  const [e, ev] = partes(v);
  const escena = ev ? m.eventos.get(ev) : undefined;
  const ep = escena?.episodio || e;
  return [ep ? codigo(ep, m) : "", escena ? titulo(escena) : ""].filter(Boolean).join(" · ");
};
const de = (lista: readonly string[]) => (v: string) => mayus(etiqueta(lista as readonly string[], v));

const texto = <P>(etiquetaCampo: string, valor: (p: P) => string, mas: Partial<CampoVisto<P>> = {}): CampoVisto<P> => ({
  etiqueta: etiquetaCampo,
  valor,
  ...mas,
});

/** Estado de la pieza (spec 001): aparcar o descartar deja de comprobarla */
function estadoPieza<P extends Pick<ConEstado, "madurez" | "madurez_mesa">>(): CampoVisto<P> {
  return {
    etiqueta: "Estado",
    valor: (p) => estadoDe(p),
    frase: (a, b) => {
      const ea = estadoDe(a);
      const eb = estadoDe(b);
      if (ea === eb) return null;
      if (cuenta(a) && !cuenta(b)) return `Ya no se comprueba: ${eb === "aparcado" ? "aparcada" : "descartada"}`;
      if (!cuenta(a) && cuenta(b)) return "Se vuelve a comprobar";
      return `Estado: ${de(ESTADO)(ea)} → ${de(ESTADO)(eb)}`;
    },
  };
}

const ficha = <P extends { wiki: string }>(): CampoVisto<P> => texto("Ficha en la wiki", (p) => p.wiki, { ver: enlace });
const motivo = <P extends { motivo_descarte: string }>(): CampoVisto<P> => texto("Por qué se descartó", (p) => p.motivo_descarte);

const LOGLINE = [
  ["protagonista", "Protagonista"],
  ["objetivo", "Objetivo"],
  ["problema", "Problema"],
  ["accion", "Acción"],
  ["catalizador", "Catalizador"],
] as const;

const RUTAS = [
  ["raiz", "Raíz de la wiki"],
  ["personajes", "Personajes"],
  ["lugares", "Lugares"],
  ["eras", "Épocas"],
  ["timeline", "Timeline"],
  ["narrativa", "Narrativa"],
  ["log", "Log"],
] as const;

const MOMENTOS = PLANTILLAS[0].momentos.map((x) => x.nombre);

/**
 * Los momentos de una plantilla (spec 011, RF-35): uno por momento con algo,
 * «Estructura (Detonante)», con valor «texto\0episodio\0escena».
 */
function momentos(etiqueta: string, id: IdPlantilla, mas: Partial<CampoVisto<PiezaDe<"temporada">>> = {}): CampoVisto<PiezaDe<"temporada">> {
  return {
    etiqueta,
    valor: () => "",
    ver: (v, m) => {
      const [t, ep, ev] = v.split("\u0000");
      const escena = ev ? m.eventos.get(ev) : undefined;
      return [t, ep ? codigo(ep, m) : "", ev ? (escena ? titulo(escena) : "ya no está") : ""].filter(Boolean).join(" · ");
    },
    partes: (t) => {
      const r = new Map<string, { nombre: string; valor: string }>();
      for (const def of plantilla(id).momentos) {
        const x = momento(t, id, def.clave);
        const texto = x.texto.trim();
        // El separador no puede venir de la nota
        const sin = (v: string) => v.replaceAll("\u0000", "");
        if (texto || x.episodio || x.escena) r.set(def.clave, { nombre: def.nombre, valor: `${sin(texto)}\u0000${sin(x.episodio)}\u0000${sin(x.escena)}` });
      }
      return r;
    },
    ...mas,
  };
}

export const CAMPOS_VISTOS: Tabla = {
  serie: [
    texto("Título", (s) => s.titulo),
    texto("Premisa", (s) => s.premisa),
    ...LOGLINE.map(([k, e]) => texto<PiezaDe<"serie">>(e, (s) => s.logline[k])),
    texto("Pregunta de oro", (s) => s.pregunta_oro),
    texto("Final decidido", (s) => s.final_decidido),
    { etiqueta: "Preguntas filosóficas", valor: (s) => s.preguntas_filosoficas.filter((x) => x.trim()) },
    texto("Tema", (s) => s.tema),
    texto("Dinámica de la historia", (s) => s.dinamica),
    texto("Arco olvidado: fracción de la temporada", (s) => String(s.olvido_fraccion)),
    ...RUTAS.map(([k, e]) => texto<PiezaDe<"serie">>(e, (s) => s.wiki[k])),
  ],
  punto: [
    texto("Tipo", (p) => p.clase, { ver: de(CLASE_PUNTO) }),
    texto("Temporada", (p) => p.posicion.temporada, { ver: pieza }),
    texto("Episodio", (p) => p.posicion.episodio, { ver: codigo }),
    texto("Qué pasa", (p) => p.que_pasa),
  ],
  temporada: [
    texto("Título", (t) => t.titulo),
    texto("Logline", (t) => t.logline),
    texto("Pregunta dramática", (t) => t.pregunta_dramatica),
    texto("Tema de la temporada", (t) => t.tema),
    texto("Trama principal", (t) => t.principal, { ver: pieza }),
    texto("Carga al empezar", (t) => t.carga[0], { ver: carga }),
    texto("Carga al acabar", (t) => t.carga[1], { ver: carga }),
    texto("Estado", (t) => t.estado, { ver: de(ESTADO_TEMPORADA) }),
    estadoPieza(),
    texto("Punto de partida", (t) => t.partida),
    momentos("Estructura", "tres_actos", { dentro: [...MOMENTOS, "Episodio"] }),
    texto("Punto de llegada", (t) => t.llegada),
    texto("Cierre / cliffhanger", (t) => t.cierre),
    momentos("Story Circle", "story_circle"),
    momentos("Save the Cat", "save_the_cat"),
    momentos("Viaje del héroe", "viaje_heroe"),
    texto("Episodios previstos", (t) => (t.episodios_previstos ? String(t.episodios_previstos) : "")),
    ficha(),
    motivo(),
  ],
  episodio: [
    texto("Título", (e) => e.titulo),
    estadoPieza(),
    texto("Idea central en una frase", (e) => e.idea_central),
    texto("Carga al empezar", (e) => e.carga[0], { ver: carga }),
    texto("Carga al acabar", (e) => e.carga[1], { ver: carga }),
    texto("Estado de escritura", (e) => e.estado, { ver: de(ESTADO_ESCRITURA) }),
    texto("Protagonista del capítulo", (e) => e.protagonista, { ver: enlace }),
    texto("Qué quiere", (e) => e.deseo),
    texto("Fuerza antagónica", (e) => e.fuerza_antagonica),
    texto("Conflicto", (e) => e.conflicto),
    texto("Acción", (e) => e.accion),
    texto("Contexto", (e) => e.contexto),
    texto("Gancho final", (e) => e.gancho),
    texto("Teaser (opcional)", (e) => e.actos.teaser),
    texto("Inicio", (e) => e.actos.inicio),
    texto("Desarrollo", (e) => e.actos.desarrollo),
    texto("Desenlace", (e) => e.actos.desenlace),
    texto("Trama dominante", (e) => e.dominante_manual, { ver: pieza, vacio: "calculada" }),
    ficha(),
    motivo(),
  ],
  evento: [
    texto("Título", (e) => e.titulo),
    estadoPieza(),
    texto("Episodio", (e) => par(e.temporada, e.episodio), {
      ver: (v, m) => {
        const [t, ep] = partes(v);
        return ep ? codigo(ep, m) : `En la bandeja de ${codigo(t, m)}`;
      },
    }),
    texto("Acto", (e) => e.acto, { ver: de(ACTO) }),
    texto("Cuándo ocurre en el mundo", (e) => e.mundo, { ver: enlace, vacio: "Presente" }),
    texto("Cómo se cuenta", (e) => e.modo, { ver: de(MODO) }),
    {
      etiqueta: "Tramas que toca",
      valor: (e) => e.arcos.map((x) => par(x.arco, x.papel)),
      ver: (v, m) => {
        const [a, papel] = partes(v);
        return `${titulo(m.arcos.get(a))} (${etiqueta(PAPEL, papel as Papel)})`;
      },
    },
    texto("Valor en juego", (e) => e.valor),
    texto("Empieza", (e) => e.cambio[0], { ver: carga }),
    texto("Acaba", (e) => e.cambio[1], { ver: carga }),
    texto("Qué gana", (e) => e.gana),
    texto("Qué pierde", (e) => e.pierde),
    {
      etiqueta: "Test de relleno",
      valor: (e) => ({ "hace avanzar": e.relleno.avanza ? "sí" : "", "da información": e.relleno.revela ? "sí" : "" }),
    },
    texto("Si quito esta escena, se pierde", (e) => e.eliminacion),
    { etiqueta: "Personajes · de la wiki", valor: (e) => e.personajes, ver: enlace },
    { etiqueta: "Lugares · de la wiki", valor: (e) => e.lugares, ver: enlace },
    {
      // Spec 011, RF-13: las causas en su orden en disco; lo que no es texto, como está
      etiqueta: "Viene de",
      valor: (e) => {
        const l = leerVieneDe(e);
        return l.editable ? l.entradas.map((x) => ("id" in x ? x.id : textoCrudo(x.rara))) : [l.crudo];
      },
      ver: (v, m) => {
        const ev = m.eventos.get(v);
        if (ev) return `${titulo(ev)} · ${dondeSeEmite(m, ev)}`;
        return queEs(m, v, "") === "ya-no-esta" ? "(ya no está)" : v;
      },
    },
    texto("Descripción", (e) => e.texto),
    motivo(),
  ],
  secreto: [
    texto("Título sin spoiler", (s) => s.titulo),
    estadoPieza(),
    texto("Nivel", (s) => s.nivel, { ver: de(NIVEL_SECRETO) }),
    texto("La verdad · solo autor", (s) => s.verdad),
    texto("Qué cree la audiencia hasta entonces", (s) => s.cree_audiencia),
    { etiqueta: "Lo conocen", valor: (s) => s.conocen, ver: enlace },
    {
      etiqueta: "Lo sabe desde",
      valor: () => "",
      // Lo que no es un episodio de la serie cuenta como Sin fecha (RF-29)
      ver: (v, m) => (m.episodios.has(v) && c.codigo(m, v)) || "Sin fecha",
      vacio: "Sin fecha",
      partes: (s) => {
        const fechas = fechasDe(s);
        const r = new Map<string, { nombre: string; valor: string }>();
        for (const x of s.conocen) {
          const k = claveLimpia(x);
          if (!k || r.has(k)) continue;
          const f = fechas.get(k);
          r.set(k, { nombre: nombreLimpio(x), valor: f && "episodio" in f ? f.episodio : "" });
        }
        return r;
      },
    },
    texto("Se revela en", (s) => par(s.revelado_en.episodio, s.revelado_en.evento), { ver: enEscena }),
    {
      etiqueta: "Pistas sembradas",
      valor: (s) => s.pistas.map((p) => JSON.stringify([p.texto.trim(), p.episodio, p.evento, p.clase])),
      ver: (v, m) => {
        const [t, e, ev] = JSON.parse(v) as string[];
        return [t || "sin texto", enEscena(par(e, ev), m)].filter(Boolean).join(" · ");
      },
    },
    {
      etiqueta: "Pistas falsas",
      valor: (s) => s.falsas.map((p) => JSON.stringify([p.texto.trim(), p.episodio, p.evento, p.conclusion.trim()])),
      ver: (v, m) => {
        const [t, e, ev] = JSON.parse(v) as string[];
        return [t || "sin texto", enEscena(par(e, ev), m)].filter(Boolean).join(" · ");
      },
    },
    ficha(),
    motivo(),
  ],
  arco: [
    // Panel
    texto("Título", (a) => a.titulo),
    estadoPieza(),
    texto("Personaje", (a) => a.personaje, { ver: enlace }),
    {
      etiqueta: "Protagonistas",
      nombre: (a) => (a.tipo_arco === "relacion" ? "Protagonistas del vínculo" : "Protagonistas"),
      otras: ["Protagonistas del vínculo", "Protagonista de la trama"],
      valor: (a) => a.protagonistas.map(sinCorchetes).filter(Boolean),
    },
    texto("Tipo de arco", (a) => a.tipo_arco, { ver: de(TIPO_ARCO) }),
    texto("Nivel", (a) => a.nivel, { ver: (v) => mayus(v) }),
    texto("Tipo", (a) => a.tipo_trama),
    texto("Temporada", (a) => a.temporada, { ver: pieza }),
    texto("Es tramo de", (a) => a.tramo_de, { ver: pieza, vacio: "de ninguno" }),
    texto("Color", (a) => String(a.color)),
    texto("Empieza (a mano)", (a) => par(a.inicio.temporada, a.inicio.episodio), { ver: posicion }),
    texto("Acaba (a mano)", (a) => par(a.fin.temporada, a.fin.episodio), { ver: posicion }),
    texto("Vence la bomba", (a) => par(a.bomba_vence.temporada, a.bomba_vence.episodio), { ver: posicion }),
    {
      etiqueta: "Siembras y recogidas",
      valor: (a) => a.siembras.map((s) => JSON.stringify([s.siembra.trim(), s.donde.trim(), s.recogida.trim(), s.donde_recogida.trim()])),
      ver: (v) => (JSON.parse(v) as string[])[0] || "sin texto",
    },
    ficha(),
    motivo(),
    // Tarjetas de Tramas
    texto("Qué quiere", (a) => a.quiere, {
      nombre: (a) => (a.tipo_arco === "personaje" ? "Qué quiere" : "Qué quiere y por qué"),
      otras: ["Qué quiere y por qué"],
    }),
    texto("Qué necesita", (a) => a.necesita),
    texto("Herida", (a) => a.herida, { otras: ["Herida y mentira que cree"] }),
    texto("Mentira que cree", (a) => a.mentira),
    texto("Qué se lo impide", (a) => a.impide),
    texto("Qué gana", (a) => a.gana, { otras: ["Qué gana / qué pierde"] }),
    texto("Qué pierde", (a) => a.pierde),
    texto("Bomba de tiempo", (a) => a.bomba),
    texto("Cómo cambia", (a) => a.cambia),
    texto("Pegamento con la principal", (a) => a.pegamento.texto),
    texto("Pegamento", (a) => a.pegamento.por, { ver: (v) => `Por ${v}` }),
    {
      etiqueta: "Estado por temporada",
      valor: (a) => Object.fromEntries(a.estados.map((e) => [e.temporada, par(e.inicio.trim(), e.fin.trim())])),
      casilla: (k, m) => codigo(k, m),
    },
    {
      etiqueta: "Beats",
      dentro: ["Dónde cae", "Qué pasa"],
      valor: (a) => Object.fromEntries(BEATS.map((b, i) => [mayus(etiqueta(BEATS, b)), par(a.beats[i]?.texto.trim() ?? "", posicionBeat(a.beats[i]))])),
    },
  ],
};

/**
 * Los campos con `partes` pasan a ser uno de texto por elemento de cualquiera
 * de las piezas («Lo sabe desde (Telmo)»), en el orden de la primera que lo tiene;
 * el nombre que se enseña es el de la primera pieza (spec 010, RF-27).
 */
export function expandir<P>(campos: readonly CampoVisto<P>[], ...piezas: P[]): CampoVisto<P>[] {
  const r: CampoVisto<P>[] = [];
  for (const cv of campos) {
    const partes = cv.partes;
    if (!partes) {
      r.push(cv);
      continue;
    }
    const nombres = new Map<string, string>();
    for (const p of piezas) for (const [k, x] of partes(p)) if (!nombres.has(k)) nombres.set(k, x.nombre);
    for (const [k, nombre] of nombres)
      r.push({ etiqueta: `${cv.etiqueta} (${nombre})`, valor: (p) => partes(p).get(k)?.valor ?? "", ver: cv.ver, vacio: cv.vacio });
  }
  return r;
}

/** Frase de un campo de texto, o null si se ve igual */
function fraseTexto<P>(cv: CampoVisto<P>, nombre: string, a: string, b: string, mA: Modelo, mB: Modelo): string | null {
  const ver = (v: string, m: Modelo) => {
    const t = v.trim() ? recortar(cv.ver ? cv.ver(v, m) : v) : "";
    return t || cv.vacio || "vacío";
  };
  if (a.trim() === b.trim()) return null;
  const va = ver(a, mA);
  const vb = ver(b, mB);
  // Un texto que solo cambia en espacios o tras el corte sigue siendo un cambio
  return va === vb ? `${nombre}: cambió` : `${nombre}: ${va} → ${vb}`;
}

/**
 * «Pistas sembradas: 3 → 4 · añadida «…»», contando los repetidos uno a uno.
 * Con las mismas que había, lo que cambió en su sitio es «cambió «…»».
 */
function fraseLista<P>(cv: CampoVisto<P>, nombre: string, a: string[], b: string[], mA: Modelo, mB: Modelo): string | null {
  if (a.length === b.length && a.every((x, i) => x === b[i])) return null;
  const anadidas = [...b];
  const quitadas: string[] = [];
  for (const x of a) {
    const i = anadidas.indexOf(x);
    if (i >= 0) anadidas.splice(i, 1);
    else quitadas.push(x);
  }
  const ver = (v: string, m: Modelo) => `«${recortar(cv.ver ? cv.ver(v, m) : v)}»`;
  const enSuSitio = a.length === b.length ? a.flatMap((x, i) => (x !== b[i] ? [i] : [])) : [];
  let texto: string[];
  if (!quitadas.length && !anadidas.length) texto = ["cambió el orden"];
  else if (a.length === b.length && enSuSitio.length === quitadas.length) texto = enSuSitio.map((i) => `cambió ${ver(b[i], mB)}`);
  else texto = [...quitadas.map((x) => `quitada ${ver(x, mA)}`), ...anadidas.map((x) => `añadida ${ver(x, mB)}`)];
  const cuantas = a.length === b.length ? "" : `${a.length} → ${b.length} · `;
  return `${nombre}: ${cuantas}${texto.join(" · ")}`;
}

/**
 * Cómo estaba un campo de texto o de lista que cambió, visto y recortado como
 * en «Lo cambiado» (spec 009, RF-30); null si se ve igual o es una rejilla.
 */
export function comoEstaba<P>(cv: CampoVisto<P>, antes: P, ahora: P, mAntes: Modelo): string | null {
  const a = cv.valor(antes);
  const b = cv.valor(ahora);
  if (typeof a === "string" && typeof b === "string") {
    if (a.trim() === b.trim()) return null;
    return (a.trim() && recortar(cv.ver ? cv.ver(a, mAntes) : a)) || cv.vacio || "vacío";
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length === b.length && a.every((x, i) => x === b[i])) return null;
    return a.map((x) => recortar(cv.ver ? cv.ver(x, mAntes) : x)).join(", ") || "ninguno";
  }
  return null;
}

/** «Estado por temporada: cambió T02» */
function fraseRejilla<P>(cv: CampoVisto<P>, nombre: string, a: Record<string, string>, b: Record<string, string>, mA: Modelo, mB: Modelo): string | null {
  const claves = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const cambiadas = claves.filter((k) => (a[k] ?? "") !== (b[k] ?? ""));
  if (!cambiadas.length) return null;
  const casilla = (k: string) => (cv.casilla ? (mB.pieza(k) ? cv.casilla(k, mB) : cv.casilla(k, mA)) : k);
  return `${nombre}: cambió ${cambiadas.map(casilla).join(", ")}`;
}

/** El código de la regla que el autor ve para un aviso silenciado: la primera de su comprobación */
function nombreAviso(id: string, p: Pieza, guia: Guia | null | undefined): string {
  // «Dejarlo así» de un estado antiguo de la ficha (spec 009, RF-56)
  if (id.startsWith(DEJADO_ASI)) return `Estado «${id.slice(DEJADO_ASI.length)}» de la ficha`;
  const base = idBase(id);
  const regla = guia ? reglasDe(guia, p).find((r) => r.comprobacion === base) : undefined;
  return regla?.id ?? id;
}

function frasesSilenciados(a: Pieza, b: Pieza, guia: Guia | null | undefined): string[] {
  if (!("avisos_silenciados" in a) || !("avisos_silenciados" in b)) return [];
  const antes = new Set(a.avisos_silenciados);
  const ahora = new Set(b.avisos_silenciados);
  return [
    ...[...ahora].filter((x) => !antes.has(x)).map((x) => `${nombreAviso(x, b, guia)}: silenciado con «Lo sé»`),
    ...[...antes].filter((x) => !ahora.has(x)).map((x) => `${nombreAviso(x, b, guia)}: vuelve a avisar`),
  ];
}

/**
 * Lo que ha cambiado en una pieza, campo a campo, en el orden del panel y
 * después el de las tarjetas de Tramas (RF-8). `antes` y `ahora` son la misma
 * pieza en la base y en el modelo.
 */
export function camposCambiados(antes: Pieza, ahora: Pieza, mAntes: Modelo, mAhora: Modelo, guia?: Guia | null): string[] {
  const r: string[] = [];
  if (antes.tipo !== ahora.tipo) return r;
  const campos = expandir((CAMPOS_VISTOS[ahora.tipo] ?? []) as CampoVisto<Pieza>[], ahora, antes);
  for (const cv of campos) {
    const nombre = cv.nombre ? cv.nombre(ahora) : cv.etiqueta;
    let f: string | null;
    if (cv.frase) f = cv.frase(antes, ahora);
    else {
      const a = cv.valor(antes);
      const b = cv.valor(ahora);
      if (Array.isArray(a) && Array.isArray(b)) f = fraseLista(cv, nombre, a, b, mAntes, mAhora);
      else if (typeof a === "string" && typeof b === "string") f = fraseTexto(cv, nombre, a, b, mAntes, mAhora);
      else f = fraseRejilla(cv, nombre, a as Record<string, string>, b as Record<string, string>, mAntes, mAhora);
    }
    if (f) r.push(f);
  }
  r.push(...frasesSilenciados(antes, ahora, guia));
  return r;
}
