// Ayudas para las pruebas de las comprobaciones.
import type { Aviso } from "../../src/lib/comprobaciones/tipos";

/** [id de la comprobación, pieza] de cada aviso, ordenado */
export const quien = (avisos: Aviso[]) => avisos.map((a) => [a.id, a.pieza]).sort();

/** [id, pieza, clase] de cada aviso */
export const resumen = (avisos: Aviso[]) => avisos.map((a) => [a.id, a.pieza, a.clase]);
