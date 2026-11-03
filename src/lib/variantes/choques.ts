// Choques (spec 006, RF-28, RF-29, RF-31): lo que cambió en la serie después
// de que la variante lo tocara. De pieza: su nota ya no es la de la base (en lo
// que se ve o por dentro), ya no está, o una nueva ya existe. De sitio: la
// serie cambió el orden de las escenas de un episodio que la variante tocó. De
// referencia: la variante apunta a una pieza que ya no está.

import { CAMPOS_VISTOS, expandir, type CampoVisto } from "../consecuencias/campos-vistos";
import { leerPieza } from "../modelo/ficheros";
import type { Modelo } from "../modelo/modelo";
import type { Evento, Pieza } from "../modelo/tipos";
import type { TipoPieza } from "../modelo/vocabulario";
import { notaNormal, textoNormal } from "./normal";
import { referenciasDe } from "./referencias";
import type { Choque, DatosVariante } from "./tipos";

/** Dónde va una escena en el orden de su serie: su episodio o, si no tiene, su temporada (la bandeja) */
export function contenedorDe(m: Modelo, ev: Evento): string {
  return ev.episodio && m.episodios.has(ev.episodio) ? ev.episodio : ev.temporada;
}

/** Orden de las escenas de un contenedor (episodio, o bandeja de una temporada); null si no existe */
export function ordenEn(m: Modelo, contenedor: string): string[] | null {
  const i = m.indice();
  if (m.episodios.has(contenedor)) return (i.porEpisodio.get(contenedor) ?? []).map((e) => e.id);
  if (m.temporadas.has(contenedor)) return (i.bandeja.get(contenedor) ?? []).map((e) => e.id);
  return null;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** El choque de una pieza cuya nota en la serie (`ahora`) ya no es su base */
function choqueDePieza(id: string, tipo: TipoPieza, base: string, ahora: Pieza, variante: Pieza | null): Choque {
  let antes: Pieza | null = null;
  try {
    antes = leerPieza(base, tipo, id);
  } catch {
    // Una base que no se lee: se dice que cambió por dentro
  }
  const soloSerie: string[] = [];
  const dosLados: string[] = [];
  if (antes) {
    const piezas = variante ? [ahora, variante, antes] : [ahora, antes];
    for (const cv of expandir((CAMPOS_VISTOS[tipo] ?? []) as CampoVisto<Pieza>[], ...piezas)) {
      const enBase = cv.valor(antes);
      if (igual(enBase, cv.valor(ahora))) continue;
      const etiqueta = cv.nombre ? cv.nombre(ahora) : cv.etiqueta;
      // A la papelera en la variante: choca con todo lo que cambió en la serie
      if (!variante || !igual(enBase, cv.valor(variante))) dosLados.push(etiqueta);
      else soloSerie.push(etiqueta);
    }
  }
  return { clase: "pieza", id, soloSerie, dosLados, porDentro: !soloSerie.length && !dosLados.length, yaNoEsta: false, yaExiste: false };
}

/** Los choques de la variante con la serie de ahora (en el modelo: lo que ya leyó la app) */
export function choques(v: Pick<DatosVariante, "piezas" | "sitios">, serie: Modelo, quedaria: Modelo): Choque[] {
  const r: Choque[] = [];
  for (const [id, e] of v.piezas) {
    const enSerie = serie.pieza(id);
    if (e.base === null) {
      if (enSerie) r.push({ clase: "pieza", id, soloSerie: [], dosLados: [], porDentro: false, yaNoEsta: false, yaExiste: true });
      continue;
    }
    if (!enSerie) r.push({ clase: "pieza", id, soloSerie: [], dosLados: [], porDentro: false, yaNoEsta: true, yaExiste: false });
    else if (notaNormal(enSerie) !== e.base) r.push(choqueDePieza(id, e.tipo, e.base, enSerie, e.pieza));
  }
  for (const [c, orden] of v.sitios) {
    const ahora = ordenEn(serie, c);
    if (!ahora) r.push({ clase: "sitio", contenedor: c, yaNoEsta: true });
    else if (!igual(ahora, orden)) r.push({ clase: "sitio", contenedor: c, yaNoEsta: false });
  }
  for (const [id, e] of v.piezas) {
    if (!e.pieza) continue;
    const enSerie = serie.pieza(id);
    // Rota también en la serie: no es de la variante
    const yaRotas = new Set(enSerie ? referenciasDe(enSerie).filter((x) => !serie.pieza(x)) : []);
    for (const x of referenciasDe(e.pieza)) if (!quedaria.pieza(x) && !yaRotas.has(x)) r.push({ clase: "referencia", id, apunta: x });
  }
  return r;
}

/**
 * Los choques de pieza leyendo el disco (al aplicar, RF-33): lo que la
 * vigilancia aún no ha releído también cuenta. `leer` da el texto de la nota
 * de la serie de esa pieza, o null si no existe.
 */
export async function choquesEnDisco(v: Pick<DatosVariante, "piezas">, leer: (tipo: TipoPieza, id: string) => Promise<string | null>): Promise<Choque[]> {
  const r: Choque[] = [];
  for (const [id, e] of v.piezas) {
    const texto = await leer(e.tipo, id);
    if (e.base === null) {
      if (texto !== null) r.push({ clase: "pieza", id, soloSerie: [], dosLados: [], porDentro: false, yaNoEsta: false, yaExiste: true });
      continue;
    }
    if (texto === null) {
      r.push({ clase: "pieza", id, soloSerie: [], dosLados: [], porDentro: false, yaNoEsta: true, yaExiste: false });
      continue;
    }
    const normal = textoNormal(texto, e.tipo, id);
    if (normal === e.base) continue;
    let ahora: Pieza | null = null;
    try {
      ahora = leerPieza(texto, e.tipo, id);
    } catch {
      // Una nota que no se lee: choque por dentro
    }
    r.push(ahora ? choqueDePieza(id, e.tipo, e.base, ahora, e.pieza) : { clase: "pieza", id, soloSerie: [], dosLados: [], porDentro: true, yaNoEsta: false, yaExiste: false });
  }
  return r;
}

/** Una línea por choque, para la pestaña, la confirmación y el lector (RF-28) */
export function frasesChoque(ch: Choque, nombre: (id: string) => string): string[] {
  if (ch.clase === "sitio")
    return [ch.yaNoEsta ? `${nombre(ch.contenedor)} ya no está en la serie` : `La serie cambió las escenas de ${nombre(ch.contenedor)} después`];
  if (ch.clase === "referencia") return [`${nombre(ch.id)} apunta a ${nombre(ch.apunta)}, que ya no está en la serie`];
  if (ch.yaNoEsta) return ["Ya no está en la serie"];
  if (ch.yaExiste) return ["Ya existe en la serie una pieza con su id"];
  const r = [...ch.soloSerie.map((c) => `${c}: cambió en la serie`), ...ch.dosLados.map((c) => `${c}: cambiada en los dos lados`)];
  if (ch.porDentro) r.push("Cambió por dentro (campos que Atelier no enseña)");
  return r;
}
