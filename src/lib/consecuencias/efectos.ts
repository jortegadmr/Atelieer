// Lo que enseña la pestaña «Si lo dejas así…» (spec 005): los cuatro grupos
// de RF-5, ya ordenados, con la cifra de la pestaña y si se puede volver.

import { idBase, type Aviso, type Resultado } from "../comprobaciones";
import { CAMPOS, reglasDeCampo, type ClaveCampo } from "../guia/campos";
import type { Guia, Regla } from "../guia/guia-md";
import { reglasDe } from "../guia/marcas";
import type { Modelo } from "../modelo/modelo";
import { compararAvisos } from "./avisos";
import { camposCambiados } from "./campos-vistos";
import { mismaPieza, type Comparacion } from "./comparacion";
import { afectadas, rangos, type Afectada } from "./huellas";

export interface AvisoNuevo {
  aviso: Aviso;
  /** Reglas de la guía con esa comprobación en esa pieza (RF-6) */
  reglas: Regla[];
  /** Campo de «Ir al campo» (RF-13): solo en la abierta, sin canon bloqueado */
  campo?: ClaveCampo;
  deOtra: boolean;
}

export interface Efectos {
  avisosNuevos: AvisoNuevo[];
  afectadas: Afectada[];
  /** RF-8, ya en frases */
  cambios: string[];
  /** La abierta cambió fuera de Atelier o pasó a canon desde la wiki (RF-22) */
  abiertaDeFuera?: "fuera" | "canon-wiki";
  yaNoAvisan: { aviso: Aviso; deOtra: boolean }[];
  /** Entradas de los grupos 1 a 3 (RF-2) */
  total: number;
  /** Algún aviso que salta es de clase aviso (RF-2) */
  conAviso: boolean;
  /** La abierta o algo que cambió con ella no está como al principio (RF-17) */
  puedeVolver: boolean;
}

/** El campo de la primera de esas reglas en la tabla de la spec 004 */
function campoDe(guia: Guia, m: Modelo, piezaId: string, reglas: Regla[]): ClaveCampo | undefined {
  const p = m.pieza(piezaId);
  if (!p || !reglas.length) return undefined;
  const ids = new Set(reglas.map((r) => r.id));
  for (const clave of Object.keys(CAMPOS) as ClaveCampo[]) {
    if (!clave.startsWith(`${p.tipo}.`)) continue;
    if (reglasDeCampo(guia, p, clave).some((r) => ids.has(r.id))) return clave;
  }
  return undefined;
}

/** Las reglas de la guía que van con la comprobación de un aviso en su pieza (RF-6) */
export function reglasDelAviso(aviso: Aviso, m: Modelo, guia: Guia | null): Regla[] {
  const p = m.pieza(aviso.pieza);
  const base = idBase(aviso.id);
  return guia && p ? reglasDe(guia, p).filter((r) => r.comprobacion === base) : [];
}

/**
 * Los efectos de lo cambiado desde el punto de partida. `resultado` es el de
 * `Sesion.resultado()` para `m`; `bloqueada` dice si una pieza es canon bloqueado.
 */
export function efectos(comp: Comparacion, m: Modelo, resultado: Resultado, guia: Guia | null, bloqueada: (id: string) => boolean): Efectos {
  const abierta = comp.piezaId;
  const orden = rangos(m);
  const ordenBase = rangos(comp.base);
  const rango = (id: string) => (id === abierta ? -1 : (orden.get(id) ?? ordenBase.get(id) ?? Infinity));
  const porOrden = <T extends { aviso: Aviso }>(l: T[]) => l.sort((a, b) => rango(a.aviso.pieza) - rango(b.aviso.pieza));

  const av = compararAvisos(comp.avisosBase, resultado, m);
  const avisosNuevos = porOrden(
    av.saltan.map((aviso): AvisoNuevo => {
      const reglas = reglasDelAviso(aviso, m, guia);
      const deOtra = aviso.pieza !== abierta;
      const campo = guia && !deOtra && !bloqueada(abierta) ? campoDe(guia, m, abierta, reglas) : undefined;
      return campo ? { aviso, reglas, campo, deOtra } : { aviso, reglas, deOtra };
    }),
  );
  const yaNoAvisan = porOrden(av.dejan.map((aviso) => ({ aviso, deOtra: aviso.pieza !== abierta })));

  const lista = afectadas(comp.base, m, comp.avisosBase, resultado.avisos, abierta, comp.deFuera);

  const antes = comp.base.pieza(abierta);
  const ahora = m.pieza(abierta);
  const cambios = !ahora ? [] : !antes ? ["Nueva"] : antes === ahora ? [] : camposCambiados(antes, ahora, comp.base, m, guia);

  const conElla = [abierta, ...comp.conLaAbierta];
  // Lo que cambió fuera no se puede volver: si solo cambió eso, no se ofrece (RF-17, RF-22)
  const puedeVolver = conElla.some((id) => !comp.deFuera.has(id) && !mismaPieza(comp.base.pieza(id), m.pieza(id)));

  const r: Efectos = {
    avisosNuevos,
    afectadas: lista,
    cambios,
    yaNoAvisan,
    total: avisosNuevos.length + lista.length + cambios.length,
    conAviso: avisosNuevos.some((x) => x.aviso.clase === "aviso"),
    puedeVolver,
  };
  const deFuera = comp.deFuera.get(abierta);
  if (deFuera) r.abiertaDeFuera = deFuera;
  return r;
}
