// Qué avisos saltan y cuáles dejan de saltar desde el punto de partida
// (spec 005). Un aviso es el mismo si coinciden su pieza, su comprobación (con
// la variante) y aquello de lo que habla, aunque cambie su texto.

import type { Aviso, Resultado } from "../comprobaciones";
import { cuenta } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";

export const claveAviso = (a: Aviso) => `${a.pieza}|${a.id}|${a.sobre ?? ""}`;

export interface ComparacionAvisos {
  /** Activos ahora y no en el punto de partida */
  saltan: Aviso[];
  /** Activos en el punto de partida que ya no salen, con su pieza aún comprobándose */
  dejan: Aviso[];
  /** Los que dejan de salir porque el autor los silenció con «Lo sé» (van a «Lo que has cambiado») */
  silenciados: Aviso[];
  /** Los que dejan de salir porque su pieza ya no se comprueba (aparcada o descartada) */
  sinComprobar: Aviso[];
}

function porClave(l: readonly Aviso[]): Map<string, Aviso[]> {
  const r = new Map<string, Aviso[]>();
  for (const a of l) {
    const k = claveAviso(a);
    const g = r.get(k);
    if (g) g.push(a);
    else r.set(k, [a]);
  }
  return r;
}

/** Lo que sobra de `a` frente a `b`, clave a clave y contando los repetidos uno a uno */
function sobrantes(a: Map<string, Aviso[]>, b: Map<string, Aviso[]>): Aviso[] {
  const r: Aviso[] = [];
  for (const [k, l] of a) r.push(...l.slice(b.get(k)?.length ?? 0));
  return r;
}

export function compararAvisos(antes: readonly Aviso[], ahora: Resultado, m: Modelo): ComparacionAvisos {
  const [mapaAntes, mapaAhora] = [porClave(antes), porClave(ahora.avisos)];
  const callados = new Set(ahora.silenciados.map(claveAviso));
  const r: ComparacionAvisos = { saltan: sobrantes(mapaAhora, mapaAntes), dejan: [], silenciados: [], sinComprobar: [] };
  for (const a of sobrantes(mapaAntes, mapaAhora)) {
    const p = m.pieza(a.pieza);
    // Una pieza que ya no existe sale como «A la papelera», no por sus avisos
    if (!p) continue;
    if ("madurez" in p && !cuenta(p)) r.sinComprobar.push(a);
    else if (callados.has(claveAviso(a))) r.silenciados.push(a);
    else r.dejan.push(a);
  }
  return r;
}
