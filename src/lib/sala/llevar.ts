// «Llevar a la sala» (spec 012, RF-21 a RF-30): del origen al texto que se
// copia. Siempre lleva la serie principal, también con una variante abierta
// (RF-28), y no escribe nada en el disco (RF-30).

import type { Sesion } from "../app/sesion";
import type { Pizarra } from "../pizarra/tipos";
import { planteamiento } from "./planteamiento";
import { reunirSala, type OrigenSala } from "./reunir";

export interface OpcionesLlevar {
  /** La pizarra como está en pantalla (con lo que aún no se guardó); null = leerla del disco sin tocarla */
  pizarra: Pizarra | null;
  /** Hay una variante abierta */
  conVariante: boolean;
  /** La pieza existe en la variante abierta pero no en la serie principal */
  soloEnVariante?: boolean;
}

export const SOLO_EN_VARIANTE = "Esa pieza solo existe en la variante abierta: la sala lleva la serie principal, que no la tiene.";

/** El planteamiento listo para copiar, o el motivo de no tenerlo */
export async function textoParaLaSala(s: Sesion, origen: OrigenSala, o: OpcionesLlevar): Promise<string | { error: string }> {
  if (origen.tipo === "pieza" && !s.modelo.pieza(origen.id) && o.soloEnVariante) return { error: SOLO_EN_VARIANTE };
  let pizarra: Pizarra | { nolee: string } | null = null;
  if (origen.tipo === "pieza") {
    if (o.pizarra) pizarra = o.pizarra;
    else {
      const l = await s.pizarra.leerSinEscribir();
      pizarra = "nolee" in l ? l : l.pizarra;
    }
  }
  const entrada = await reunirSala(s, origen, { pizarra, conVariante: o.conVariante });
  if ("error" in entrada) return entrada;
  return planteamiento(entrada).texto;
}
