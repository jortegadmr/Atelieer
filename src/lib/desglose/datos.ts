// Datos del desglose (spec 014, RF-9 a RF-11, RF-13, RF-14): por personaje, por
// lugar y de la serie (o del filtro). Todo se calcula sobre las filas dadas y
// sobre el guion escrito: una escena sin guion cuenta como escena, no como minutos.

import type { InteriorExterior, Momento } from "./analisis";
import type { FilaDesglose } from "./desglose";

export interface DatosPersonaje {
  clave: string;
  nombre: string;
  ficha: boolean;
  /** Escenas en las que sale, con o sin guion */
  escenas: number;
  episodios: number;
  /** Segundos de las escenas con guion en las que sale (también si solo se le nombra) */
  presencia: number;
  /** Segundos de sus diálogos */
  habla: number;
  /** Del total de segundos con guion de las filas */
  pctPresencia: number;
  pctHabla: number;
  /** Código de la primera y la última escena en que sale ("" si no tiene código) */
  primera: string;
  ultima: string;
  /** Escenas en las que es el único personaje */
  solo: number;
  /** Con quién más coincide: hasta cinco, por escenas en común y luego por nombre */
  coincide: Array<{ nombre: string; escenas: number }>;
}

export interface DatosLugar {
  clave: string;
  nombre: string;
  ficha: boolean;
  escenas: number;
  segundos: number;
  pct: number;
  ie: InteriorExterior | null;
  momento: Momento | null;
  personajes: string[];
}

export interface DatosSerie {
  /** Segundos de las escenas con guion */
  segundos: number;
  escenas: number;
  conGuion: number;
  sinGuion: number;
  lugaresUnaEscena: string[];
  personajesUnaEscena: string[];
  /** Personajes que hablan en el guion y no tienen ficha de personaje en el mundo */
  hablanSinFicha: string[];
}

const porNombre = (a: string, b: string) => a.localeCompare(b, "es");
const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);
const totalSegundos = (filas: readonly FilaDesglose[]) => filas.reduce((n, x) => n + (x.segundos ?? 0), 0);

/** El valor que más se repite; a igualdad, el primero que apareció. null si no hay ninguno */
function masHabitual<T extends string>(valores: readonly T[]): T | null {
  const cuenta = new Map<T, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  let mejor: T | null = null;
  let n = 0;
  for (const [v, k] of cuenta) if (k > n) (mejor = v), (n = k);
  return mejor;
}

/** Datos por personaje (RF-9); las filas deben ir en orden de emisión para que primera y última tengan sentido */
export function datosPersonajes(filas: readonly FilaDesglose[]): DatosPersonaje[] {
  const total = totalSegundos(filas);
  interface Acum {
    d: DatosPersonaje;
    eps: Set<string>;
    con: Map<string, { nombre: string; n: number }>;
  }
  const acum = new Map<string, Acum>();
  for (const x of filas) {
    for (const p of x.personajes) {
      let a = acum.get(p.clave);
      if (!a) {
        a = {
          d: { clave: p.clave, nombre: p.nombre, ficha: p.ficha, escenas: 0, episodios: 0, presencia: 0, habla: 0, pctPresencia: 0, pctHabla: 0, primera: "", ultima: "", solo: 0, coincide: [] },
          eps: new Set(),
          con: new Map(),
        };
        acum.set(p.clave, a);
      }
      a.d.escenas++;
      if (x.episodio) a.eps.add(x.episodio);
      if (x.segundos !== null) {
        a.d.presencia += x.segundos;
        a.d.habla += p.habla;
      }
      const etiqueta = x.codigo || x.titulo;
      if (!a.d.primera) a.d.primera = etiqueta;
      a.d.ultima = etiqueta;
      if (x.personajes.length === 1) a.d.solo++;
      for (const otro of x.personajes) {
        if (otro.clave === p.clave) continue;
        const c = a.con.get(otro.clave);
        if (c) c.n++;
        else a.con.set(otro.clave, { nombre: otro.nombre, n: 1 });
      }
    }
  }
  const r = [...acum.values()].map((a) => {
    a.d.episodios = a.eps.size;
    a.d.pctPresencia = pct(a.d.presencia, total);
    a.d.pctHabla = pct(a.d.habla, total);
    a.d.coincide = [...a.con.values()]
      .sort((u, v) => v.n - u.n || porNombre(u.nombre, v.nombre))
      .slice(0, 5)
      .map((c) => ({ nombre: c.nombre, escenas: c.n }));
    return a.d;
  });
  return r.sort((a, b) => b.presencia - a.presencia || b.escenas - a.escenas || porNombre(a.nombre, b.nombre));
}

/** Datos por lugar (RF-10) */
export function datosLugares(filas: readonly FilaDesglose[]): DatosLugar[] {
  const total = totalSegundos(filas);
  const acum = new Map<string, { d: DatosLugar; ie: InteriorExterior[]; momentos: Momento[]; ps: Set<string> }>();
  for (const x of filas) {
    for (const l of x.locaciones) {
      let a = acum.get(l.clave);
      if (!a) {
        a = { d: { clave: l.clave, nombre: l.nombre, ficha: l.ficha, escenas: 0, segundos: 0, pct: 0, ie: null, momento: null, personajes: [] }, ie: [], momentos: [], ps: new Set() };
        acum.set(l.clave, a);
      }
      a.d.escenas++;
      a.d.segundos += x.segundos ?? 0;
      if (x.ie) a.ie.push(x.ie);
      if (x.momento) a.momentos.push(x.momento);
      for (const p of x.personajes) a.ps.add(p.nombre);
    }
  }
  const r = [...acum.values()].map((a) => {
    a.d.pct = pct(a.d.segundos, total);
    a.d.ie = masHabitual(a.ie);
    a.d.momento = masHabitual(a.momentos);
    a.d.personajes = [...a.ps].sort(porNombre);
    return a.d;
  });
  return r.sort((a, b) => b.segundos - a.segundos || b.escenas - a.escenas || porNombre(a.nombre, b.nombre));
}

/** Datos de las filas dadas, que son la serie entera o lo que deje el filtro (RF-11, RF-13) */
export function datosSerie(filas: readonly FilaDesglose[]): DatosSerie {
  const conGuion = filas.filter((x) => x.conGuion).length;
  const lugares = new Map<string, { nombre: string; n: number }>();
  const personajes = new Map<string, { nombre: string; n: number }>();
  const sinFicha = new Map<string, string>();
  for (const x of filas) {
    for (const l of x.locaciones) {
      const a = lugares.get(l.clave);
      if (a) a.n++;
      else lugares.set(l.clave, { nombre: l.nombre, n: 1 });
    }
    for (const p of x.personajes) {
      const a = personajes.get(p.clave);
      if (a) a.n++;
      else personajes.set(p.clave, { nombre: p.nombre, n: 1 });
      if (!p.ficha && p.habla > 0) sinFicha.set(p.clave, p.nombre);
    }
  }
  const unaVez = (m: Map<string, { nombre: string; n: number }>) => [...m.values()].filter((a) => a.n === 1).map((a) => a.nombre).sort(porNombre);
  return {
    segundos: totalSegundos(filas),
    escenas: filas.length,
    conGuion,
    sinGuion: filas.length - conGuion,
    lugaresUnaEscena: unaVez(lugares),
    personajesUnaEscena: unaVez(personajes),
    hablanSinFicha: [...sinFicha.values()].sort(porNombre),
  };
}

// ---- Orden por cualquier columna (RF-14)

/** Ordena una copia por una columna; a igualdad, por nombre (orden estable y repetible) */
export function ordenar<T extends { nombre: string }>(filas: readonly T[], valor: (x: T) => number | string, descendente: boolean): T[] {
  const signo = descendente ? -1 : 1;
  return [...filas].sort((a, b) => {
    const u = valor(a);
    const v = valor(b);
    const c = typeof u === "number" && typeof v === "number" ? u - v : String(u).localeCompare(String(v), "es", { numeric: true });
    return c * signo || porNombre(a.nombre, b.nombre);
  });
}
