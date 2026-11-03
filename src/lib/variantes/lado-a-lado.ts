// «Lado a lado» (spec 006, RF-23): una pieza en dos columnas, «Ahora» y «Cómo
// quedaría» (o «Antes de aplicar» y «Lo que aplicó», RF-44), con todos los
// campos del panel en su orden y los que cambian marcados con texto.

import type { Aviso } from "../comprobaciones";
import { CAMPOS_VISTOS, expandir, type CampoVisto, type Valor } from "../consecuencias/campos-vistos";
import { codigo } from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { Pieza } from "../modelo/tipos";

export interface FilaLado {
  etiqueta: string;
  izquierda: string;
  derecha: string;
  cambia: boolean;
  /** Ese campo cambió también en la serie después de la base (choque, RF-23) */
  enSerie?: boolean;
}

export interface LadoALado {
  /** null = la pieza no existe en ese lado */
  izquierda: { titulo: string; avisos: Aviso[] } | null;
  derecha: { titulo: string; avisos: Aviso[] } | null;
  filas: FilaLado[];
}

const titulo = (p: Pieza) => ("titulo" in p ? p.titulo.trim() : "") || "Sin título";

/** Una casilla; las de la estructura son «texto\u0000episodio» y se leen como «texto · E01» */
function casilla(x: string, m: Modelo): string {
  const [texto, episodio] = x.split("\u0000");
  if (episodio === undefined) return x.trim();
  return [texto.trim(), episodio ? codigo(m, episodio) || "ya no está" : ""].filter(Boolean).join(" · ");
}

function ver(cv: CampoVisto<Pieza>, v: Valor, m: Modelo): string {
  const uno = (s: string) => (s.trim() ? (cv.ver ? cv.ver(s, m) : s) : "");
  if (typeof v === "string") return uno(v) || cv.vacio || "vacío";
  if (Array.isArray(v)) return v.length ? v.map(uno).filter(Boolean).join(" · ") : cv.vacio || "vacío";
  const casillas = Object.entries(v)
    .map(([k, x]) => [k, casilla(x, m)] as const)
    .filter(([, x]) => x);
  if (!casillas.length) return cv.vacio || "vacío";
  return casillas.map(([k, x]) => `${cv.casilla ? (m.pieza(k) ? cv.casilla(k, m) : k) : k}: ${x}`).join(" · ");
}

const igual = (a: Valor, b: Valor) => JSON.stringify(a) === JSON.stringify(b);

/**
 * La misma pieza en dos modelos. `avisosIzq` y `avisosDer` son los de Comprobar
 * de cada lado; `camposEnSerie`, las etiquetas de los campos que cambiaron en la serie.
 */
export function ladoALado(
  id: string,
  izq: Modelo,
  der: Modelo,
  avisosIzq: readonly Aviso[],
  avisosDer: readonly Aviso[],
  camposEnSerie: ReadonlySet<string> = new Set(),
): LadoALado {
  const a = izq.pieza(id);
  const b = der.pieza(id);
  const p = b ?? a;
  const filas: FilaLado[] = [];
  if (p) {
    const piezas = [b, a].filter((x): x is Pieza => !!x);
    for (const cv of expandir((CAMPOS_VISTOS[p.tipo] ?? []) as CampoVisto<Pieza>[], ...piezas)) {
      const etiqueta = cv.nombre ? cv.nombre(p) : cv.etiqueta;
      const va = a ? cv.valor(a) : null;
      const vb = b ? cv.valor(b) : null;
      const fila: FilaLado = {
        etiqueta,
        izquierda: va === null ? "" : ver(cv, va, izq),
        derecha: vb === null ? "" : ver(cv, vb, der),
        cambia: va === null || vb === null ? false : !igual(va, vb),
      };
      if (camposEnSerie.has(etiqueta)) fila.enSerie = true;
      filas.push(fila);
    }
  }
  const lado = (x: Pieza | undefined, avisos: readonly Aviso[]) => (x ? { titulo: titulo(x), avisos: avisos.filter((av) => av.pieza === id) } : null);
  return { izquierda: lado(a, avisosIzq), derecha: lado(b, avisosDer), filas };
}
