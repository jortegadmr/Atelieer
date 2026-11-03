// Lo que se hace en la pizarra (spec 012, RF-2 a RF-8, RF-15, RNF-10). Todo es
// puro: cada operación devuelve una pizarra nueva y la de partida no cambia. Lo
// que se puede rechazar devuelve `{ error }` con su porqué.

import { aleatorio } from "../modelo/ids";
import { cortarGrafemas } from "./texto";
import { COLORES, LIENZO, MAX_ELEMENTOS, MAX_ETIQUETA, MAX_FLECHAS, MAX_NOTA, esColor, type ColorNota, type Elemento, type Flecha, type Nota, type Pizarra, type Tarjeta } from "./tipos";

export interface Sitio {
  x: number;
  y: number;
}

/** Un id que no usa ningún elemento ni flecha */
export function nuevoIdPizarra(p: Pizarra): string {
  const usados = new Set<string>([...p.elementos.map((e) => e.id), ...p.flechas.map((f) => f.id)]);
  for (;;) {
    const id = `pz-${aleatorio(6)}`;
    if (!usados.has(id)) return id;
  }
}

/** Dentro del lienzo; un número que no lo es, al origen */
const limitar = (n: number) => (Number.isNaN(n) ? 0 : Math.min(LIENZO, Math.max(-LIENZO, n)));

const noCabenElementos = () => ({ error: `No caben más elementos: el tope es ${MAX_ELEMENTOS}.` });

const sin = (p: Pizarra, id: string): Elemento[] => p.elementos.filter((e) => e.id !== id);

/** Cambia un elemento y lo sube al final del apilado */
function cambiar(p: Pizarra, id: string, cambio: (e: Elemento) => Elemento): Pizarra {
  const e = p.elementos.find((x) => x.id === id);
  if (!e) return p;
  return { ...p, elementos: [...sin(p, id), cambio(e)] };
}

export function crearNota(p: Pizarra, sitio: Sitio, id: string = nuevoIdPizarra(p)): { pizarra: Pizarra; id: string } | { error: string } {
  if (p.elementos.length >= MAX_ELEMENTOS) return noCabenElementos();
  const nota: Nota = { tipo: "nota", id, texto: "", color: COLORES[0].id, x: limitar(sitio.x), y: limitar(sitio.y), extra: {} };
  return { pizarra: { ...p, elementos: [...p.elementos, nota] }, id };
}

/** El texto se corta en el tope sin partir un grafema; `recortado` lo dice */
export function editarNota(p: Pizarra, id: string, texto: string): { pizarra: Pizarra; recortado: boolean } {
  const corte = cortarGrafemas(texto, MAX_NOTA);
  const pizarra: Pizarra = { ...p, elementos: p.elementos.map((e) => (e.id === id && e.tipo === "nota" ? { ...e, texto: corte.texto } : e)) };
  return { pizarra, recortado: corte.recortado };
}

export function colorearNota(p: Pizarra, id: string, color: ColorNota): Pizarra {
  if (!esColor(color)) return p;
  return { ...p, elementos: p.elementos.map((e) => (e.id === id && e.tipo === "nota" ? { ...e, color } : e)) };
}

export function moverElemento(p: Pizarra, id: string, x: number, y: number): Pizarra {
  return cambiar(p, id, (e) => ({ ...e, x: limitar(x), y: limitar(y) }));
}

/** Tocar un elemento lo pone encima de todos (RNF-10) */
export function subir(p: Pizarra, id: string): Pizarra {
  const i = p.elementos.findIndex((e) => e.id === id);
  if (i === -1 || i === p.elementos.length - 1) return p;
  return { ...p, elementos: [...sin(p, id), p.elementos[i]] };
}

/** Una nota que se queda vacía al salir del campo se quita sola, salvo que tenga flechas */
export function quitarNotaVacia(p: Pizarra, id: string): Pizarra {
  const e = p.elementos.find((x) => x.id === id);
  if (!e || e.tipo !== "nota" || e.texto.trim() !== "") return p;
  if (p.flechas.some((f) => f.de === id || f.a === id)) return p;
  return { ...p, elementos: sin(p, id) };
}

export function anadirTarjeta(p: Pizarra, pieza: string, sitio: Sitio, origen?: string): { pizarra: Pizarra; id: string } | { error: string } {
  if (pieza === "") return { error: "Falta la pieza de la tarjeta." };
  if (p.elementos.some((e) => e.tipo === "tarjeta" && e.pieza === pieza)) return { error: "Esa pieza ya tiene tarjeta en la pizarra." };
  if (p.elementos.length >= MAX_ELEMENTOS) return noCabenElementos();
  const id = nuevoIdPizarra(p);
  const t: Tarjeta = { tipo: "tarjeta", id, pieza, x: limitar(sitio.x), y: limitar(sitio.y), extra: {}, ...(origen === undefined ? {} : { origen }) };
  return { pizarra: { ...p, elementos: [...p.elementos, t] }, id };
}

/** Una etiqueta es de una línea y de 60 grafemas como mucho */
function limpiarEtiqueta(texto: string): { texto: string; recortado: boolean } {
  return cortarGrafemas(texto.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " "), MAX_ETIQUETA);
}

/** Flecha dirigida de `de` a `a`. A→B y B→A son distintas (RF-7) */
export function unir(p: Pizarra, de: string, a: string, etiqueta = ""): { pizarra: Pizarra; id: string } | { error: string } {
  if (!p.elementos.some((e) => e.id === de) || !p.elementos.some((e) => e.id === a)) return { error: "Uno de los elementos ya no está." };
  if (de === a) return { error: "No se puede unir un elemento consigo mismo." };
  if (p.flechas.some((f) => f.de === de && f.a === a)) return { error: "Ya hay una flecha en ese sentido entre esos dos elementos." };
  if (p.flechas.length >= MAX_FLECHAS) return { error: `No caben más flechas: el tope es ${MAX_FLECHAS}.` };
  const id = nuevoIdPizarra(p);
  const flecha: Flecha = { id, de, a, etiqueta: limpiarEtiqueta(etiqueta).texto, extra: {} };
  return { pizarra: { ...p, flechas: [...p.flechas, flecha] }, id };
}

export function etiquetar(p: Pizarra, id: string, etiqueta: string): { pizarra: Pizarra; recortado: boolean } {
  const corte = limpiarEtiqueta(etiqueta);
  return { pizarra: { ...p, flechas: p.flechas.map((f) => (f.id === id ? { ...f, etiqueta: corte.texto } : f)) }, recortado: corte.recortado };
}

/** Quita el elemento y sus flechas; dice cuántas. Si no existe, nada cambia */
export function quitarElemento(p: Pizarra, id: string): { pizarra: Pizarra; flechasQuitadas: number } {
  if (!p.elementos.some((e) => e.id === id)) return { pizarra: p, flechasQuitadas: 0 };
  const flechas = p.flechas.filter((f) => f.de !== id && f.a !== id);
  return { pizarra: { ...p, elementos: sin(p, id), flechas }, flechasQuitadas: p.flechas.length - flechas.length };
}

export function quitarFlecha(p: Pizarra, id: string): Pizarra {
  if (!p.flechas.some((f) => f.id === id)) return p;
  return { ...p, flechas: p.flechas.filter((f) => f.id !== id) };
}
