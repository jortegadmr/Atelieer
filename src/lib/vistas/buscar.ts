// Buscar cualquier pieza por su título o su código (Ctrl K, T7.4), sin
// distinguir acentos ni mayúsculas.

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import { estadoDe } from "../modelo/estados";
import type { Evento, Pieza } from "../modelo/tipos";
import { CLASE_PUNTO, etiqueta, type TipoPieza } from "../modelo/vocabulario";
import { dondeSeEmite, ordenEmision } from "./historia";

export interface Encontrada {
  id: string;
  tipo: TipoPieza;
  titulo: string;
  /** Código o algo que ayude a reconocerla */
  detalle: string;
}

export const simple = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function describir(m: Modelo, p: Pieza): { titulo: string; detalle: string } {
  switch (p.tipo) {
    case "serie":
      return { titulo: p.titulo, detalle: "serie" };
    case "punto": {
      const clase = etiqueta(CLASE_PUNTO, p.clase);
      return { titulo: `${clase[0].toUpperCase()}${clase.slice(1)}`, detalle: [c.codigo(m, p.posicion.episodio || p.posicion.temporada), p.que_pasa].filter(Boolean).join(" · ") };
    }
    case "temporada":
    case "episodio":
      return { titulo: p.titulo, detalle: c.codigo(m, p.id) };
    case "evento":
      return { titulo: p.titulo, detalle: p.episodio ? c.codigo(m, p.episodio) : `bandeja de ${c.codigo(m, p.temporada)}` };
    case "arco":
      return { titulo: p.titulo, detalle: p.madurez === "descartado" ? "descartado" : `${p.tipo_trama}` };
    case "secreto":
      return { titulo: p.titulo, detalle: p.nivel };
  }
}

export function buscar(m: Modelo, texto: string, maximo = 30): Encontrada[] {
  const q = simple(texto);
  if (!q) return [];
  const r: (Encontrada & { peso: number })[] = [];
  for (const p of m.todas()) {
    const { titulo, detalle } = describir(m, p);
    const t = simple(titulo);
    const d = simple(detalle);
    // El detalle solo cuenta por su código (T01E06) o, en los puntos clave, por lo que pasa
    const peso = t.startsWith(q) ? 0 : t.includes(q) ? 1 : d.startsWith(q) ? 2 : p.tipo === "punto" && d.includes(q) ? 3 : -1;
    if (peso < 0) continue;
    r.push({ id: p.id, tipo: p.tipo, titulo: titulo || "Sin título", detalle, peso });
  }
  return r
    .sort((a, b) => a.peso - b.peso || a.titulo.localeCompare(b.titulo, "es"))
    .slice(0, maximo)
    .map(({ peso: _peso, ...x }) => x);
}

export interface EscenaEncontrada {
  id: string;
  titulo: string;
  /** Dónde se emite: «T01E03 · 2», «Bandeja T01»… */
  donde: string;
}

/**
 * Escenas no descartadas por título o por dónde se emite (spec 011, RF-2,
 * RF-29), sin las de `excluir` y solo las que pasan `filtro`. Sin texto, todas
 * en orden de emisión; con texto, primero las que empiezan así.
 */
export function buscarEscenas(m: Modelo, texto: string, opciones: { excluir?: Set<string>; filtro?: (ev: Evento) => boolean } = {}, maximo = 30): EscenaEncontrada[] {
  const q = simple(texto);
  const orden = ordenEmision(m);
  const r: (EscenaEncontrada & { peso: number; ev: Evento })[] = [];
  for (const ev of m.eventos.values()) {
    if (estadoDe(ev) === "descartado" || opciones.excluir?.has(ev.id) || (opciones.filtro && !opciones.filtro(ev))) continue;
    const titulo = ev.titulo.trim() || "Sin título";
    const donde = dondeSeEmite(m, ev);
    const t = simple(titulo);
    const d = simple(donde);
    const peso = !q ? 0 : t.startsWith(q) || d.startsWith(q) ? 0 : t.includes(q) || d.includes(q) ? 1 : -1;
    if (peso < 0) continue;
    r.push({ id: ev.id, titulo, donde, peso, ev });
  }
  return r
    .sort((a, b) => a.peso - b.peso || orden(a.ev, b.ev))
    .slice(0, maximo)
    .map(({ id, titulo, donde }) => ({ id, titulo, donde }));
}
