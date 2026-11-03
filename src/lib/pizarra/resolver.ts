// De las tarjetas a las piezas (spec 012, RF-4, RF-5, RF-9): una tarjeta guarda
// el id de su pieza y aquí se ve cómo está esa pieza ahora en el modelo. Siempre
// se llama con el modelo de la serie principal, también con una variante abierta.

import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import { dondeSeEmite, ordenEmision } from "../vistas/historia";
import { simple } from "../vistas/buscar";
import type { Elemento, Pizarra, Tarjeta } from "./tipos";

export type TipoTarjeta = "episodio" | "escena" | "arco" | "secreto";

export const ETIQUETA_TIPO: Record<TipoTarjeta, string> = { episodio: "Episodio", escena: "Escena", arco: "Arco", secreto: "Secreto" };

export const TEXTO_AUSENTE = "(pieza no encontrada)";

export interface VistaTarjeta {
  pieza: string;
  /** null = la pieza no se encuentra */
  tipo: TipoTarjeta | null;
  titulo: string;
  /** Código o algo que ayude a reconocerla («T01E01 · 2», «Tramas»…) */
  detalle: string;
  estado: "ok" | "descartada" | "ausente";
}

interface Ficha {
  tipo: TipoTarjeta;
  titulo: string;
  detalle: string;
  descartada: boolean;
}

/** La pieza como la ve una tarjeta, o null si no es episodio, escena, arco ni secreto (o no está) */
function ficha(m: Modelo, id: string): Ficha | null {
  const ep = m.episodios.get(id);
  if (ep) return { tipo: "episodio", titulo: ep.titulo.trim() || "Sin título", detalle: c.codigo(m, ep.id), descartada: estadoDe(ep) === "descartado" };
  const ev = m.eventos.get(id);
  if (ev) return { tipo: "escena", titulo: ev.titulo.trim() || "Sin título", detalle: dondeSeEmite(m, ev), descartada: estadoDe(ev) === "descartado" };
  const ar = m.arcos.get(id);
  if (ar) return { tipo: "arco", titulo: ar.titulo.trim() || "Sin título", detalle: ar.tipo_trama, descartada: estadoDe(ar) === "descartado" };
  const sc = m.secretos.get(id);
  if (sc) return { tipo: "secreto", titulo: sc.titulo.trim() || "Sin título", detalle: sc.nivel, descartada: estadoDe(sc) === "descartado" };
  return null;
}

export function estadoTarjeta(m: Modelo, t: Pick<Tarjeta, "pieza">): VistaTarjeta {
  const f = ficha(m, t.pieza);
  if (!f) return { pieza: t.pieza, tipo: null, titulo: TEXTO_AUSENTE, detalle: "", estado: "ausente" };
  return { pieza: t.pieza, tipo: f.tipo, titulo: f.titulo, detalle: f.detalle, estado: f.descartada ? "descartada" : "ok" };
}

/** De arriba abajo y, a igual altura, de izquierda a derecha; no toca el apilado */
export function ordenLectura(p: Pizarra): Elemento[] {
  return [...p.elementos].sort((a, b) => a.y - b.y || a.x - b.x);
}

export interface PiezaTarjeta {
  id: string;
  tipo: TipoTarjeta;
  titulo: string;
  detalle: string;
  descartada: boolean;
}

const ORDEN_TIPO: Record<TipoTarjeta, number> = { episodio: 0, escena: 1, arco: 2, secreto: 3 };

/**
 * Piezas que se pueden poner como tarjeta (RF-4): episodios, escenas, arcos y
 * secretos que aún no tienen tarjeta, por título o por código, sin tildes ni
 * mayúsculas. Las descartadas salen marcadas. Sin texto, todas.
 */
export function piezasParaTarjeta(m: Modelo, p: Pizarra, texto: string, maximo = 30): PiezaTarjeta[] {
  const q = simple(texto);
  const puestas = new Set(p.elementos.flatMap((e) => (e.tipo === "tarjeta" ? [e.pieza] : [])));
  const orden = ordenEmision(m);
  const todas: { f: Ficha; id: string; peso: number; ev?: ReturnType<Modelo["eventos"]["get"]> }[] = [];
  const ids = [...m.episodios.keys(), ...m.eventos.keys(), ...m.arcos.keys(), ...m.secretos.keys()];
  for (const id of ids) {
    if (puestas.has(id)) continue;
    const f = ficha(m, id);
    if (!f) continue;
    const t = simple(f.titulo);
    const d = simple(f.detalle);
    const peso = !q ? 0 : t.startsWith(q) || d.startsWith(q) ? 0 : t.includes(q) || d.includes(q) ? 1 : -1;
    if (peso < 0) continue;
    todas.push({ f, id, peso, ev: m.eventos.get(id) });
  }
  const pos = m.indice().posEpisodio;
  const lugar = (id: string) => pos.get(id)?.global ?? Number.MAX_SAFE_INTEGER;
  todas.sort(
    (a, b) =>
      a.peso - b.peso ||
      ORDEN_TIPO[a.f.tipo] - ORDEN_TIPO[b.f.tipo] ||
      // Episodios y escenas, en orden de emisión; arcos y secretos, por título
      (a.f.tipo === "episodio" ? lugar(a.id) - lugar(b.id) : 0) ||
      (a.ev && b.ev ? orden(a.ev, b.ev) : a.f.titulo.localeCompare(b.f.titulo, "es")),
  );
  return todas.slice(0, maximo).map(({ f, id }) => ({ id, tipo: f.tipo, titulo: f.titulo, detalle: f.detalle, descartada: f.descartada }));
}
