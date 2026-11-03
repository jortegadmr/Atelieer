// Lo visible de cada pieza y qué otras piezas han cambiado desde el punto de
// partida (spec 005, RF-7). La huella guarda ids, no códigos: los códigos se
// ponen al escribir la frase (los de antes con la base, los de ahora con el
// modelo), así renumerar episodios no hace que un arco «pase» por otros.

import type { Aviso } from "../comprobaciones";
import * as c from "../modelo/consultas";
import { mismaPieza } from "./comparacion";
import { tramaDominante } from "../modelo/dominante";
import type { Modelo } from "../modelo/modelo";
import type { ParCarga, Pieza, Posicion } from "../modelo/tipos";
import { NOMBRE_ACTO, ORDEN_ACTOS, type ActoVisor } from "../vistas/actos";

export interface Huella {
  tipo: Pieza["tipo"];
  /** Código propio (episodio, temporada): parte de la huella (decisión del autor) */
  codigo: string;
  titulo: string;
  /** Una escena: su número en el episodio (o en la bandeja), su episodio ("" = bandeja) y su acto */
  escena?: { numero: number; episodio: string; temporada: string; acto: ActoVisor };
  escenas?: number;
  episodios?: number;
  carga?: string;
  /** Id de la trama dominante del episodio */
  dominante?: string;
  /** Avisos de la pieza, como los cuenta el visor: solo clase «aviso» */
  avisos: number;
  /** Ids de episodio (o de temporada, si el arco no baja a episodio) */
  arco?: { empieza: string; acaba: string; pasa: string[] };
  secreto?: { pistas: string[]; revela: string };
}

export interface Afectada {
  id: string;
  /** «T01E02 · 3» en una escena; el código en un episodio o una temporada */
  codigo: string;
  titulo: string;
  frases: string[];
  nueva?: true;
  borrada?: true;
  deFuera?: "fuera" | "canon-wiki";
}

/** Cuántos avisos (sin sugerencias) tiene cada pieza, como el visor */
export function contarAvisos(avisos: readonly Aviso[]): Map<string, number> {
  const r = new Map<string, number>();
  for (const a of avisos) if (a.clase === "aviso") r.set(a.pieza, (r.get(a.pieza) ?? 0) + 1);
  return r;
}

const lugar = (p: Posicion | null) => (p ? p.episodio || p.temporada : "");

/** El episodio donde cae una pista o una revelación: el de su escena si la tiene */
function episodioDe(m: Modelo, episodio: string, evento: string): string {
  const ev = evento ? m.eventos.get(evento) : undefined;
  return ev?.episodio || episodio;
}

/** Número de cada escena en su episodio o en la bandeja de su temporada */
function numeros(m: Modelo): Map<string, number> {
  const ix = m.indice();
  const r = new Map<string, number>();
  for (const l of [...ix.porEpisodio.values(), ...ix.bandeja.values()]) l.forEach((e, i) => r.set(e.id, i + 1));
  return r;
}

const cacheNumeros = new WeakMap<Modelo, { version: number; n: Map<string, number> }>();
function numeroDe(m: Modelo, id: string): number {
  let x = cacheNumeros.get(m);
  if (!x || x.version !== m.version) {
    x = { version: m.version, n: numeros(m) };
    cacheNumeros.set(m, x);
  }
  return x.n.get(id) ?? 0;
}

const titulo = (p: Pieza) => ("titulo" in p ? p.titulo.trim() : "") || "Sin título";
const carga = (x: ParCarga) => x.map((v) => v || "·").join(" ");

/** La huella de una pieza en un modelo, o null si no está */
export function huella(m: Modelo, id: string, nAvisos: Map<string, number>): Huella | null {
  const p = m.pieza(id);
  if (!p) return null;
  const h: Huella = { tipo: p.tipo, codigo: "", titulo: titulo(p), avisos: nAvisos.get(id) ?? 0 };
  switch (p.tipo) {
    case "evento": {
      const colocado = !!p.episodio && m.episodios.has(p.episodio);
      const acto: ActoVisor = ORDEN_ACTOS.includes(p.acto) ? p.acto : "";
      h.escena = { numero: numeroDe(m, id), episodio: colocado ? p.episodio : "", temporada: p.temporada, acto };
      break;
    }
    case "episodio":
      h.codigo = c.codigo(m, id);
      h.escenas = c.eventosDeEpisodio(m, id).length;
      h.carga = carga(p.carga);
      h.dominante = tramaDominante(m, id);
      break;
    case "temporada":
      h.codigo = c.codigo(m, id);
      h.episodios = c.episodiosDeTemporada(m, id).length;
      h.carga = carga(p.carga);
      break;
    case "arco": {
      const f = c.inicioFin(m, id);
      const pasa = [...new Set(c.eventosColocadosDeArco(m, id).map((e) => e.episodio))];
      h.arco = { empieza: lugar(f.inicio), acaba: lugar(f.fin), pasa };
      break;
    }
    case "secreto":
      h.secreto = {
        pistas: p.pistas.map((x) => episodioDe(m, x.episodio, x.evento)),
        revela: episodioDe(m, p.revelado_en.episodio, p.revelado_en.evento),
      };
      break;
  }
  return h;
}

const cacheRangos = new WeakMap<Modelo, { version: number; r: Map<string, number> }>();

/** Orden de la serie: serie, puntos, temporadas, episodios, escenas (por episodio y bandeja), arcos y secretos */
export function rangos(m: Modelo): Map<string, number> {
  let x = cacheRangos.get(m);
  if (!x || x.version !== m.version) {
    x = { version: m.version, r: calcularRangos(m) };
    cacheRangos.set(m, x);
  }
  return x.r;
}

function calcularRangos(m: Modelo): Map<string, number> {
  const ix = m.indice();
  const ids: string[] = [m.serie.id, ...m.puntos.keys(), ...ix.temporadas, ...ix.episodios];
  for (const e of ix.episodios) ids.push(...(ix.porEpisodio.get(e) ?? []).map((x) => x.id));
  for (const t of ix.temporadas) ids.push(...(ix.bandeja.get(t) ?? []).map((x) => x.id));
  ids.push(...m.eventos.keys(), ...c.arcosEnOrden(m).map((a) => a.id), ...m.secretos.keys());
  const r = new Map<string, number>();
  for (const id of ids) if (!r.has(id)) r.set(id, r.size);
  return r;
}

/**
 * Piezas que hay que mirar: las que no son la misma (las piezas son valores),
 * lo que depende de ellas y las que cambian de número de avisos.
 */
function candidatas(base: Modelo, ahora: Modelo, avisosAntes: Map<string, number>, avisosAhora: Map<string, number>): Set<string> {
  const r = new Set<string>();
  const sumar = (m: Modelo, p: Pieza | undefined) => {
    if (!p) return;
    if (p.tipo === "evento") {
      if (p.episodio) r.add(p.episodio);
      if (p.temporada) r.add(p.temporada);
      for (const x of p.arcos) r.add(x.arco);
      // Las vecinas de su episodio se renumeran (son piezas nuevas, ya entran) y los secretos que la nombran
      for (const s of m.secretos.values()) if (s.revelado_en.evento === p.id || s.pistas.some((x) => x.evento === p.id)) r.add(s.id);
    }
    if (p.tipo === "episodio") {
      r.add(p.temporada);
      // El número de cada escena es su puesto: sacar una renumera a las demás sin cambiarlas
      for (const e of c.eventosDeEpisodio(m, p.id)) r.add(e.id);
      // Su código y el de sus vecinos dependen del orden de la temporada
      for (const e of c.eventosDeEpisodio(m, p.id)) for (const x of e.arcos) r.add(x.arco);
      for (const s of m.secretos.values()) if (s.revelado_en.episodio === p.id || s.pistas.some((x) => x.episodio === p.id)) r.add(s.id);
    }
    if (p.tipo === "temporada") for (const e of c.episodiosDeTemporada(m, p.id)) r.add(e.id);
    if (p.tipo === "serie") for (const t of m.temporadas.keys()) sumar(m, m.temporadas.get(t));
    if (p.tipo === "arco") for (const e of c.eventosColocadosDeArco(m, p.id)) r.add(e.episodio);
  };
  // Las piezas son valores: una que no es la misma ha cambiado (o es nueva, o se borró)
  const cambiadas = new Set<string>();
  for (const b of ahora.todas()) if (base.pieza(b.id) !== b) cambiadas.add(b.id);
  for (const a of base.todas()) if (!ahora.pieza(a.id)) cambiadas.add(a.id);
  for (const id of cambiadas) {
    r.add(id);
    sumar(base, base.pieza(id));
    sumar(ahora, ahora.pieza(id));
  }
  for (const id of [...r]) {
    const t = base.temporadas.get(id) ?? ahora.temporadas.get(id);
    // Un episodio que cambia de orden en su temporada (la temporada cambia), o una temporada en la serie,
    // cambia el código de los de detrás
    if (t && (cambiadas.has(t.id) || cambiadas.has(ahora.serie.id))) for (const m of [base, ahora]) for (const e of c.episodiosDeTemporada(m, t.id)) r.add(e.id);
    // Igual en la bandeja de una temporada
    if (t) for (const m of [base, ahora]) for (const e of c.bandeja(m, t.id)) r.add(e.id);
    const ep = base.episodios.get(id) ?? ahora.episodios.get(id);
    if (ep) for (const m of [base, ahora]) for (const e of c.eventosDeEpisodio(m, ep.id)) r.add(e.id);
  }
  for (const id of new Set([...avisosAntes.keys(), ...avisosAhora.keys()])) if ((avisosAntes.get(id) ?? 0) !== (avisosAhora.get(id) ?? 0)) r.add(id);
  return r;
}

const lista = (l: string[]) => l.join(", ").replace(/, ([^,]*)$/, " y $1");

/** Las frases de lo que cambió en una pieza (RF-7) */
function frases(base: Modelo, ahora: Modelo, a: Huella, b: Huella): string[] {
  const r: string[] = [];
  const codA = (id: string) => c.codigo(base, id) || "?";
  const codB = (id: string) => c.codigo(ahora, id) || "?";
  if (a.codigo !== b.codigo) r.push(`${a.codigo || "?"} → ${b.codigo || "?"}`);
  if (a.escena && b.escena) {
    const [x, y] = [a.escena, b.escena];
    if (x.episodio !== y.episodio) {
      if (!y.episodio) r.push(`De ${codA(x.episodio)} a la bandeja de ${codB(y.temporada)}`);
      else if (!x.episodio) r.push(`De la bandeja a ${codB(y.episodio)}`);
      else r.push(`De ${codA(x.episodio)} a ${codB(y.episodio)}`);
    } else if (x.numero !== y.numero) r.push(`Escena ${x.numero} → ${y.numero}`);
    if (x.acto !== y.acto && y.episodio) r.push(`Pasa al acto ${NOMBRE_ACTO[y.acto]}`);
  }
  if (a.escenas !== undefined && a.escenas !== b.escenas) r.push(`${a.escenas} → ${b.escenas} escenas`);
  if (a.episodios !== undefined && a.episodios !== b.episodios) r.push(`${a.episodios} → ${b.episodios} episodios`);
  if (a.carga !== b.carga) r.push(`Carga ${a.carga} → ${b.carga}`);
  if (a.dominante !== b.dominante) {
    const nombre = (m: Modelo, id = "") => (id && m.arcos.get(id)?.titulo.trim()) || "ninguna";
    r.push(`Trama dominante: ${nombre(base, a.dominante)} → ${nombre(ahora, b.dominante)}`);
  }
  if (a.arco && b.arco) {
    if (a.arco.empieza !== b.arco.empieza) r.push(`Empieza en ${codA(a.arco.empieza) || "?"} → ${codB(b.arco.empieza) || "?"}`);
    if (a.arco.acaba !== b.arco.acaba) r.push(`Acaba en ${codA(a.arco.acaba) || "?"} → ${codB(b.arco.acaba) || "?"}`);
    const mas = b.arco.pasa.filter((e) => !a.arco!.pasa.includes(e));
    const menos = a.arco.pasa.filter((e) => !b.arco!.pasa.includes(e));
    if (mas.length) r.push(`Pasa también por ${lista(mas.map(codB))}`);
    if (menos.length) r.push(`Deja de pasar por ${lista(menos.map(codA))}`);
  }
  if (a.secreto && b.secreto) {
    if (a.secreto.revela !== b.secreto.revela) r.push(`La revelación pasa de ${codA(a.secreto.revela)} a ${codB(b.secreto.revela)}`);
    const n = Math.min(a.secreto.pistas.length, b.secreto.pistas.length);
    for (let i = 0; i < n; i++) {
      if (a.secreto.pistas[i] !== b.secreto.pistas[i]) r.push(`Una pista pasa de ${codA(a.secreto.pistas[i])} a ${codB(b.secreto.pistas[i])}`);
    }
  }
  if (a.avisos !== b.avisos) r.push(`Avisos ${a.avisos} → ${b.avisos}`);
  return r;
}

/** Código con el que se nombra la pieza en la lista */
function codigoDe(m: Modelo, h: Huella): string {
  if (h.escena) return h.escena.episodio ? `${c.codigo(m, h.escena.episodio)} · ${h.escena.numero}` : `Bandeja ${c.codigo(m, h.escena.temporada)} · ${h.escena.numero}`;
  return h.codigo;
}

/**
 * Las otras piezas afectadas desde el punto de partida, en orden de la serie
 * (RF-7). La abierta no sale: lo suyo va en «Lo que has cambiado» (RF-8).
 */
export function afectadas(
  base: Modelo,
  ahora: Modelo,
  avisosBase: readonly Aviso[],
  avisosAhora: readonly Aviso[],
  abierta: string,
  deFuera: ReadonlyMap<string, "fuera" | "canon-wiki"> = new Map(),
): Afectada[] {
  const [nA, nB] = [contarAvisos(avisosBase), contarAvisos(avisosAhora)];
  const r: { rango: number; a: Afectada }[] = [];
  const [rA, rB] = [rangos(base), rangos(ahora)];
  for (const id of candidatas(base, ahora, nA, nB)) {
    if (id === abierta) continue;
    const [a, b] = [huella(base, id, nA), huella(ahora, id, nB)];
    if (!a && !b) continue;
    let af: Afectada;
    if (!a) af = { id, codigo: codigoDe(ahora, b!), titulo: b!.titulo, frases: ["Nueva"], nueva: true };
    else if (!b) af = { id, codigo: codigoDe(base, a), titulo: a.titulo, frases: ["A la papelera"], borrada: true };
    else {
      let f = frases(base, ahora, a, b);
      if (!f.length && !mismaPieza(base.pieza(id), ahora.pieza(id))) f = ["Cambió su nota"];
      if (!f.length) continue;
      af = { id, codigo: codigoDe(ahora, b), titulo: b.titulo, frases: f };
    }
    const fuera = deFuera.get(id);
    if (fuera) af.deFuera = fuera;
    r.push({ rango: rB.get(id) ?? rA.get(id) ?? Infinity, a: af });
  }
  return r.sort((x, y) => x.rango - y.rango).map((x) => x.a);
}
