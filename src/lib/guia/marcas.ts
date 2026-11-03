// Qué reglas de la guía tocan a cada pieza y su marca (spec 5.5, T6.4; spec
// 004): se cumple, no se cumple, sugerencia, lo sé, la juzgas tú (la regla no
// tiene comprobación o faltan los datos), o no se comprueba porque la pieza
// está aparcada o descartada.

import { eventosArco } from "../comprobaciones/base";
import { idBase, type Aviso, type Resultado } from "../comprobaciones";
import * as c from "../modelo/consultas";
import { estadoDe } from "../modelo/estados";
import type { Modelo } from "../modelo/modelo";
import type { Pieza } from "../modelo/tipos";
import type { Guia, PiezaGuia, Regla } from "./guia-md";

export type Marca = "ok" | "no" | null;

const TIPO_ARCO: Record<string, PiezaGuia> = { trama: "arco de trama", personaje: "arco de personaje", relacion: "arco de relación" };

/** Tipos de regla de un arco; M9: las de subtrama, en arcos B y C de trama o relación */
export function piezasArco(tipoArco: string, tipoTrama: string): PiezaGuia[] {
  const propio = TIPO_ARCO[tipoArco];
  return tipoTrama !== "A" && tipoArco !== "personaje" ? ["subtrama", propio] : [propio];
}

/** Tipos de regla de la guía que aplican a una pieza */
export function piezasGuia(p: Pieza): PiezaGuia[] {
  switch (p.tipo) {
    case "serie":
    case "punto":
      return ["serie"];
    case "arco":
      return piezasArco(p.tipo_arco, p.tipo_trama);
    default:
      return [p.tipo];
  }
}

export function reglasDe(guia: Guia, p: Pieza): Regla[] {
  const tipos = piezasGuia(p);
  return tipos.flatMap((t) => guia.reglas.filter((r) => r.pieza === t));
}

const decidida = (x: [string, string]) => x[0] !== "" && x[1] !== "";

/** ¿Tiene la pieza los datos que necesita esa comprobación? */
function aplica(id: string, p: Pieza, m: Modelo): boolean {
  switch (id) {
    case "C01":
      return (p.tipo === "temporada" || p.tipo === "episodio") && (p.carga[0] !== "" || p.carga[1] !== "");
    case "C02":
      return p.tipo === "evento" && decidida(p.cambio);
    case "C03":
      return p.tipo === "arco" && p.tipo_trama === "A" && p.tipo_arco === "trama";
    case "C04":
    case "C07":
      return p.tipo === "arco" && p.tipo_trama !== "A" && p.tipo_arco !== "personaje";
    case "C05":
    case "C06":
      return (
        p.tipo === "arco" &&
        p.tipo_trama !== "A" &&
        p.tipo_arco !== "personaje" &&
        c.temporadasEnOrden(m).some((t) => t.principal && c.arcosPresentes(m, t.id).some((a) => a.id === p.id))
      );
    case "C08":
    case "C09":
      return p.tipo === "evento";
    case "C10":
      return p.tipo === "arco" && p.nivel === "temporada";
    case "C11":
      return p.tipo === "arco" && eventosArco(m, p.id).length > 0;
    case "C12":
      return p.tipo === "arco" && p.tipo_trama === "A" && p.nivel === "serie" && eventosArco(m, p.id).some((e) => c.papelEn(e, p.id) === "cierra");
    case "C13": {
      if (p.tipo !== "arco") return false;
      const f = c.inicioFin(m, p.id);
      return (!!p.inicio.temporada && f.inicioCalculado) || (!!p.fin.temporada && f.finCalculado);
    }
    case "C14":
    case "C15":
      return p.tipo === "secreto" && !!(p.revelado_en.episodio || p.revelado_en.evento);
    case "C16":
      return p.tipo === "episodio";
    case "C17":
      return p.tipo === "arco" && p.tipo_arco === "personaje";
    case "C18":
      return p.tipo === "serie";
    case "C19":
      return p.tipo === "temporada";
    default:
      return false;
  }
}

export type EstadoMarca = "ok" | "no" | "sugerencia" | "lose" | "juzgas" | "aparcada" | "descartada";

export interface EstadoRegla {
  marca: EstadoMarca;
  /** Avisos de su comprobación en esta pieza: los activos, o los silenciados si marca = "lose" */
  avisos: Aviso[];
  /** Otras reglas de esta pieza con la misma comprobación (para «Lo sé · también G08, G10») */
  comparten: string[];
}

/** Estado de una regla en una pieza (spec 004, RF-10 a RF-12, RF-14, RF-19) */
export function estadoRegla(guia: Guia, regla: Regla, p: Pieza, r: Resultado, m: Modelo): EstadoRegla {
  const id = regla.comprobacion;
  const comparten = id ? reglasDe(guia, p).filter((x) => x.comprobacion === id && x.id !== regla.id).map((x) => x.id) : [];
  const sin = (marca: EstadoMarca): EstadoRegla => ({ marca, avisos: [], comparten });
  // Lo aparcado y lo descartado no se comprueban (spec 001, RF-15 a RF-17)
  if ("madurez" in p) {
    const e = estadoDe(p);
    if (e === "aparcado") return sin("aparcada");
    if (e === "descartado") return sin("descartada");
  }
  if (!id) return sin("juzgas");
  const mios = (l: Aviso[]) => l.filter((a) => a.pieza === p.id && idBase(a.id) === id);
  const activos = mios(r.avisos);
  if (activos.length) return { marca: activos.some((a) => a.clase === "aviso") ? "no" : "sugerencia", avisos: activos, comparten };
  const callados = mios(r.silenciados);
  if (callados.length) return { marca: "lose", avisos: callados, comparten };
  return sin(aplica(id, p, m) ? "ok" : "juzgas");
}

/** La marca corta de la v1: se cumple, no se cumple (también una sugerencia) o nada */
export function marca(regla: Regla, p: Pieza, r: Resultado, m: Modelo): Marca {
  const e = estadoRegla({ reglas: [regla], magia: false, avisos: [] }, regla, p, r, m).marca;
  return e === "ok" ? "ok" : e === "no" || e === "sugerencia" ? "no" : null;
}
