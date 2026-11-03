// La plantilla a la vista de cada temporada (spec 011, RF-42): se recuerda en
// este equipo, en el almacenamiento local, con una clave por serie. Nunca va
// a las notas. «Ninguna» es no tener entrada.

import { PLANTILLAS, type IdPlantilla } from "../modelo/plantillas";

/** Una clave por serie, con su carpeta */
export const clavePlantillaVista = (carpeta: string) => `atelier.plantillaVista:${carpeta}`;

const IDS = new Set<string>(PLANTILLAS.map((p) => p.id));
export const esPlantilla = (v: unknown): v is IdPlantilla => typeof v === "string" && IDS.has(v);

/** Lo guardado; un JSON roto o lo que no sea temporada → plantilla de la lista, fuera */
export function leerPlantillasVista(texto: string | null): Map<string, IdPlantilla> {
  const r = new Map<string, IdPlantilla>();
  if (!texto) return r;
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return r;
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return r;
  for (const [t, p] of Object.entries(datos)) if (t && esPlantilla(p)) r.set(t, p);
  return r;
}

/** Lo que se guarda; sin entradas, null (se borra la clave) */
export function escribirPlantillasVista(m: ReadonlyMap<string, IdPlantilla>): string | null {
  return m.size ? JSON.stringify(Object.fromEntries(m)) : null;
}

/** Olvida las temporadas que ya no existen (ni en la serie ni en una variante) */
export function limpiarPlantillasVista(m: ReadonlyMap<string, IdPlantilla>, existe: (temporada: string) => boolean): Map<string, IdPlantilla> {
  return new Map([...m].filter(([t]) => existe(t)));
}
