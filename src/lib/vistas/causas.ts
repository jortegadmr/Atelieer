// Causa y efecto (spec 011, RF-4 a RF-8, RF-12): «Provoca», las marcas y los
// círculos, calculados desde «Viene de» de cada escena. Funciones puras sobre
// el modelo; el índice se recuerda mientras no cambie su versión.

import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Evento } from "../modelo/tipos";
import { leerVieneDe, queEs, textoCrudo, type Entrada } from "../modelo/viene-de";
import { dondeSeEmite, temporadaDeEscena } from "./historia";

/** Dónde va una escena en orden de emisión; `colocada` si está en un episodio */
export interface Posicion {
  clave: [number, number, number];
  colocada: boolean;
}

export type Marca = "tardia" | "sin-sitio" | null;

export interface IndiceCausas {
  pos: Map<string, Posicion>;
  /** Causas que son escenas de la serie, en orden de emisión */
  causas: Map<string, string[]>;
  /** Escenas que la tienen en «Viene de», en orden de emisión */
  provoca: Map<string, string[]>;
  /** Escenas en un círculo de enlaces activos, con el número de su círculo */
  circulo: Map<string, number>;
}

/** Una línea de «Viene de» o «Provoca» en el panel */
export interface FilaCausa {
  /** La escena, si lo es */
  id: string | null;
  /** Lo que se quita (solo en «Viene de») */
  entrada: Entrada | null;
  titulo: string;
  donde: string;
  /** En texto, nunca solo color (RF-6 a RF-9, RF-12) */
  marcas: string[];
}

/**
 * La posición común de marcas y «dónde se emite»: la de su episodio y su
 * puesto en él (el número que enseña la tarjeta, también con `orden` repetido
 * en disco); bandeja y «Sin temporada» detrás, como en `ordenEmision`.
 */
export function posiciones(m: Modelo): Map<string, Posicion> {
  const ix = m.indice();
  const posT = new Map(ix.temporadas.map((id, i) => [id, i]));
  const r = new Map<string, Posicion>();
  for (const [ep, l] of ix.porEpisodio) {
    const p = ix.posEpisodio.get(ep);
    if (!p) continue;
    l.forEach((ev, n) => r.set(ev.id, { clave: [p.iT, p.iE, n], colocada: true }));
  }
  for (const ev of m.eventos.values()) {
    if (r.has(ev.id)) continue;
    const t = temporadaDeEscena(m, ev);
    r.set(ev.id, { clave: [t ? posT.get(t)! : Infinity, Infinity, ev.orden], colocada: false });
  }
  return r;
}

const comparar = (pos: Map<string, Posicion>) => (a: string, b: string) =>
  c.compararPos(pos.get(a)!.clave, pos.get(b)!.clave) || a.localeCompare(b);

const descartada = (ev: Evento | undefined) => !!ev && estadoDe(ev) === "descartado";

/** Enlace activo: las dos escenas existen y ninguna está descartada */
export function activo(m: Modelo, a: string, b: string): boolean {
  const x = m.eventos.get(a);
  const y = m.eventos.get(b);
  return !!x && !!y && !descartada(x) && !descartada(y);
}

const cacheIndice = new WeakMap<Modelo, { version: number; r: IndiceCausas }>();

/** Causas, «Provoca» y círculos de toda la serie, en una pasada */
export function indiceCausas(m: Modelo): IndiceCausas {
  const x = cacheIndice.get(m);
  if (x && x.version === m.version) return x.r;
  const pos = posiciones(m);
  const causas = new Map<string, string[]>();
  const provoca = new Map<string, string[]>();
  for (const ev of m.eventos.values()) {
    const l = leerVieneDe(ev);
    if (!l.editable) continue;
    for (const e of l.entradas) {
      if (!("id" in e) || queEs(m, e.id, ev.id) !== "escena") continue;
      (causas.get(ev.id) ?? causas.set(ev.id, []).get(ev.id)!).push(e.id);
      (provoca.get(e.id) ?? provoca.set(e.id, []).get(e.id)!).push(ev.id);
    }
  }
  const orden = comparar(pos);
  for (const l of causas.values()) l.sort(orden);
  for (const l of provoca.values()) l.sort(orden);
  const r: IndiceCausas = { pos, causas, provoca, circulo: new Map() };
  r.circulo = circulos(m, r);
  cacheIndice.set(m, { version: m.version, r });
  return r;
}

/** «tardia» si la causa se ve después del efecto; «sin-sitio» si el efecto está colocado y la causa no */
export function marca(pos: Map<string, Posicion>, causa: string, efecto: string): Marca {
  const a = pos.get(causa);
  const b = pos.get(efecto);
  if (!a || !b || !b.colocada) return null;
  if (!a.colocada) return "sin-sitio";
  return c.compararPos(a.clave, b.clave) > 0 ? "tardia" : null;
}

/**
 * Las escenas que están en un círculo (RF-12), con el número de su círculo:
 * componentes fuertemente conexos de más de una escena, solo sobre enlaces
 * activos. Tarjan sin recursión.
 */
export function circulos(m: Modelo, ix: Pick<IndiceCausas, "provoca"> = indiceCausas(m)): Map<string, number> {
  const vecinos = (id: string) => (ix.provoca.get(id) ?? []).filter((b) => activo(m, id, b));
  const indice = new Map<string, number>();
  const bajo = new Map<string, number>();
  const enPila = new Set<string>();
  const pila: string[] = [];
  const r = new Map<string, number>();
  let n = 0;
  let k = 0;
  for (const raiz of m.eventos.keys()) {
    if (indice.has(raiz)) continue;
    const marcos: { id: string; v: string[]; i: number }[] = [];
    const entrar = (id: string) => {
      indice.set(id, n);
      bajo.set(id, n++);
      pila.push(id);
      enPila.add(id);
      marcos.push({ id, v: vecinos(id), i: 0 });
    };
    entrar(raiz);
    while (marcos.length) {
      const f = marcos[marcos.length - 1];
      if (f.i < f.v.length) {
        const w = f.v[f.i++];
        if (!indice.has(w)) entrar(w);
        else if (enPila.has(w)) bajo.set(f.id, Math.min(bajo.get(f.id)!, indice.get(w)!));
        continue;
      }
      marcos.pop();
      if (marcos.length) {
        const padre = marcos[marcos.length - 1].id;
        bajo.set(padre, Math.min(bajo.get(padre)!, bajo.get(f.id)!));
      }
      if (bajo.get(f.id) !== indice.get(f.id)) continue;
      const comp: string[] = [];
      let w: string;
      do {
        w = pila.pop()!;
        enPila.delete(w);
        comp.push(w);
      } while (w !== f.id);
      if (comp.length < 2) continue;
      for (const id of comp) r.set(id, k);
      k++;
    }
  }
  return r;
}

/** El enlace es parte de un círculo: las dos escenas están en el mismo (y entonces el enlace es activo) */
export const enCirculo = (ix: IndiceCausas, a: string, b: string) => ix.circulo.has(a) && ix.circulo.get(a) === ix.circulo.get(b);

const tituloDe = (ev: Evento) => ev.titulo.trim() || "Sin título";

/** «descartada» o «aparcada», o nada */
function palabraEstado(ev: Evento): string[] {
  const e = estadoDe(ev);
  return e === "descartado" ? ["descartada"] : e === "aparcado" ? ["aparcada"] : [];
}

/** Las marcas de estado de una escena enlazada, en el panel */
const estado = (ev: Evento) => palabraEstado(ev).map((x) => `(${x})`);

/** «Viene de» en el panel (RF-1, RF-6, RF-7, RF-9): las escenas en orden de emisión, lo demás detrás como está en disco */
export function filasVieneDe(m: Modelo, ev: Evento): FilaCausa[] {
  const l = leerVieneDe(ev);
  if (!l.editable) return [];
  const ix = indiceCausas(m);
  const escenas: FilaCausa[] = [];
  const resto: FilaCausa[] = [];
  for (const e of l.entradas) {
    if (!("id" in e)) {
      resto.push({ id: null, entrada: e, titulo: textoCrudo(e.rara), donde: "", marcas: ["(no se entiende)"] });
      continue;
    }
    const q = queEs(m, e.id, ev.id);
    if (q !== "escena") {
      resto.push({ id: null, entrada: e, titulo: e.id, donde: "", marcas: [q === "ya-no-esta" ? "(ya no está)" : "(no se entiende)"] });
      continue;
    }
    const causa = m.eventos.get(e.id)!;
    const marcas = estado(causa);
    const mk = marca(ix.pos, causa.id, ev.id);
    if (mk === "tardia") marcas.push("se ve después");
    if (mk === "sin-sitio") marcas.push("sin sitio todavía");
    if (enCirculo(ix, causa.id, ev.id)) marcas.push("círculo");
    escenas.push({ id: causa.id, entrada: e, titulo: tituloDe(causa), donde: dondeSeEmite(m, causa), marcas });
  }
  const orden = comparar(ix.pos);
  escenas.sort((a, b) => orden(a.id!, b.id!));
  return [...escenas, ...resto];
}

/** «Provoca» en el panel (RF-4, RF-6, RF-8, RF-12), en orden de emisión */
export function filasProvoca(m: Modelo, ev: Evento): FilaCausa[] {
  const ix = indiceCausas(m);
  return (ix.provoca.get(ev.id) ?? []).map((id) => {
    const efecto = m.eventos.get(id)!;
    const marcas = estado(efecto);
    if (marca(ix.pos, ev.id, id) === "tardia") marcas.push("se ve antes");
    if (enCirculo(ix, ev.id, id)) marcas.push("círculo");
    return { id, entrada: null, titulo: tituloDe(efecto), donde: dondeSeEmite(m, efecto), marcas };
  });
}

/** Un enlace activo con una escena que no es de la pestaña (RF-20) */
export interface RefFuera {
  /** «viene de» o «provoca» */
  sentido: "viene" | "provoca";
  id: string;
  donde: string;
  marcas: string[];
}

export interface NodoCadena {
  id: string;
  /** 0 en el inicio; uno más por cada «provoca» */
  nivel: number;
  /** Ya salió antes: no se baja por ella (RF-18) */
  verArriba: boolean;
  fuera: RefFuera[];
  marcas: string[];
}

export interface Cadenas {
  cadenas: NodoCadena[][];
  /** Escenas de la pestaña sin enlaces activos, en orden de emisión (RF-21) */
  sueltas: string[];
}

const viva = (ev: Evento) => {
  const e = estadoDe(ev);
  return e !== "descartado" && e !== "aparcado";
};

/**
 * Las cadenas de una temporada (RF-16 a RF-21). Escenas de la pestaña: vivas y
 * con episodio de la temporada. Inicios, cada grupo en orden de emisión: los de
 * RF-16, los círculos sin causa de fuera (RF-19) y lo que quede sin enseñar que
 * no es suelto (RF-19b). Se baja en profundidad; lo ya visto sale como «ver arriba».
 */
export function cadenas(m: Modelo, temporadaId: string): Cadenas {
  const ix = indiceCausas(m);
  const orden = comparar(ix.pos);
  const pestana = new Set<string>();
  for (const ev of m.eventos.values()) if (viva(ev) && c.estaColocado(m, ev) && temporadaDeEscena(m, ev) === temporadaId) pestana.add(ev.id);
  const lista = [...pestana].sort(orden);
  const causasActivas = (id: string) => (ix.causas.get(id) ?? []).filter((x) => activo(m, x, id));
  const efectosActivos = (id: string) => (ix.provoca.get(id) ?? []).filter((x) => activo(m, id, x));
  const dentro = (l: string[]) => l.filter((x) => pestana.has(x));

  const refFuera = (id: string): RefFuera[] => {
    const r: RefFuera[] = [];
    for (const x of causasActivas(id)) {
      if (pestana.has(x)) continue;
      const marcas = palabraEstado(m.eventos.get(x)!);
      const mk = marca(ix.pos, x, id);
      if (mk === "tardia") marcas.push("se ve después");
      if (mk === "sin-sitio") marcas.push("sin sitio todavía");
      r.push({ sentido: "viene", id: x, donde: dondeSeEmite(m, m.eventos.get(x)!), marcas });
    }
    for (const x of efectosActivos(id)) {
      if (pestana.has(x)) continue;
      const marcas = palabraEstado(m.eventos.get(x)!);
      if (marca(ix.pos, id, x) === "tardia") marcas.push("se ve antes");
      r.push({ sentido: "provoca", id: x, donde: dondeSeEmite(m, m.eventos.get(x)!), marcas });
    }
    return r;
  };

  const sueltas = lista.filter((id) => !causasActivas(id).length && !efectosActivos(id).length);
  const esSuelta = new Set(sueltas);
  const visto = new Set<string>();
  const r: NodoCadena[][] = [];

  const recorrer = (inicio: string) => {
    const cadena: NodoCadena[] = [];
    const pila: { id: string; nivel: number; padre: string | null }[] = [{ id: inicio, nivel: 0, padre: null }];
    while (pila.length) {
      const { id, nivel, padre } = pila.pop()!;
      const marcas: string[] = [];
      if (ix.circulo.has(id)) marcas.push("círculo");
      if (padre && marca(ix.pos, padre, id) === "tardia") marcas.push("se ve antes");
      if (visto.has(id)) {
        cadena.push({ id, nivel, verArriba: true, fuera: [], marcas });
        continue;
      }
      visto.add(id);
      cadena.push({ id, nivel, verArriba: false, fuera: refFuera(id), marcas });
      const hijos = dentro(efectosActivos(id));
      for (let i = hijos.length - 1; i >= 0; i--) pila.push({ id: hijos[i], nivel: nivel + 1, padre: id });
    }
    r.push(cadena);
  };

  // RF-16: sin causas en la pestaña, y provoca algo de ella o viene de fuera
  for (const id of lista) {
    if (esSuelta.has(id) || dentro(causasActivas(id)).length) continue;
    if (dentro(efectosActivos(id)).length || causasActivas(id).length) recorrer(id);
  }
  // RF-19: círculos sin inicio, por su escena más temprana
  const conCausaDeFuera = new Set<number>();
  for (const [id, k] of ix.circulo) if (causasActivas(id).some((x) => ix.circulo.get(x) !== k)) conCausaDeFuera.add(k);
  for (const id of lista) {
    const k = ix.circulo.get(id);
    if (k !== undefined && !visto.has(id) && !conCausaDeFuera.has(k)) recorrer(id);
  }
  // RF-19b: lo que quede, que no es suelto
  for (const id of lista) if (!visto.has(id) && !esSuelta.has(id)) recorrer(id);
  return { cadenas: r, sueltas };
}
