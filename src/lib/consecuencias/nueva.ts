// «Si la creas así…» (spec 005, RF-30 a RF-32): qué pasaría al crear una
// pieza desde «Nueva pieza», sin crearla. Se crea sobre una copia del modelo:
// ni el modelo de verdad ni el disco cambian.

import { comprobar, type Aviso, type Resultado } from "../comprobaciones";
import type { Guia, Regla } from "../guia/guia-md";
import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import { NOMBRE_ACTO, ORDEN_ACTOS, type ActoVisor } from "../vistas/actos";
import { crearPieza, opcionesNuevo, type DatosNueva, type QueCrear } from "../vistas/crear";
import type { Nivel } from "../vistas/visor";
import { compararAvisos } from "./avisos";
import { copiaModelo } from "./copia";
import { reglasDelAviso } from "./efectos";
import { afectadas, huella, type Afectada } from "./huellas";

export type SimulacionNueva =
  | {
      /** Dónde aparecerá (RF-30) */
      donde: string;
      /** Las piezas que cambiarán al crearla, como en RF-7 */
      afectadas: Afectada[];
      /** Los avisos que saltarán nada más crearla, en ella y en otras, como en RF-6 */
      avisos: { aviso: Aviso; reglas: Regla[]; deOtra: boolean }[];
    }
  | { error: string };

/** Dónde aparecerá la pieza ya creada en la copia */
function donde(m: Modelo, id: string, que: Exclude<QueCrear, "idea">): string {
  const p = m.pieza(id)!;
  switch (p.tipo) {
    case "evento": {
      const h = huella(m, id, new Map());
      const acto: ActoVisor = ORDEN_ACTOS.includes(p.acto) ? p.acto : "";
      return `${c.codigo(m, p.episodio)}, ${acto ? `acto ${NOMBRE_ACTO[acto]}` : "sin acto"}, escena ${h?.escena?.numero ?? "?"}`;
    }
    case "episodio": {
      const n = c.episodiosDeTemporada(m, p.temporada).findIndex((e) => e.id === id) + 1;
      return `Episodio ${n} de ${c.codigo(m, p.temporada)}`;
    }
    case "temporada":
      return `${c.codigo(m, id)}, al final`;
    case "arco":
      if (que === "trama") return "Trama de la serie";
      return p.tramo_de ? `Tramo de «${m.arcos.get(p.tramo_de)?.titulo.trim() || "Sin título"}» en ${c.codigo(m, p.temporada)}` : `Trama de ${c.codigo(m, p.temporada)}`;
    default:
      return "Secreto de la serie";
  }
}

/**
 * Lo que pasaría al crear la pieza así. `resultado` es el de ahora (el de
 * `Sesion.resultado()`); si falta, se calcula. Si no se puede crear así, el
 * mismo texto que impide Crear (RF-32).
 */
export function simularNueva(
  m: Modelo,
  nivel: Nivel,
  que: Exclude<QueCrear, "idea">,
  datos: DatosNueva,
  bloqueada: (id: string) => boolean,
  guia: Guia | null,
  resultado: Resultado = comprobar(m),
): SimulacionNueva {
  const bloqueo = opcionesNuevo(m, nivel, bloqueada).find((o) => o.que === que)?.bloqueo;
  if (bloqueo) return { error: bloqueo };
  const copia = copiaModelo(m);
  let creada: ReturnType<typeof crearPieza>;
  try {
    creada = crearPieza(copia, nivel, que, datos);
  } catch (e) {
    return { error: (e as Error).message };
  }
  for (const p of creada.cambio.borrar) copia.quitar(p.id);
  for (const p of creada.cambio.guardar) copia.poner(p);
  const id = creada.pieza.id;
  const ahora = comprobar(copia);
  const lista = afectadas(m, copia, resultado.avisos, ahora.avisos, id);
  const avisos = compararAvisos(resultado.avisos, ahora, copia)
    .saltan.map((aviso) => ({ aviso, reglas: reglasDelAviso(aviso, copia, guia), deOtra: aviso.pieza !== id }))
    .sort((a, b) => Number(a.deOtra) - Number(b.deOtra));
  return { donde: donde(copia, id, que), afectadas: lista, avisos };
}
