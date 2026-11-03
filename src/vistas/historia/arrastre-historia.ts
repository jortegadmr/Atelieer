// Arrastrar escenas en la línea de la historia (spec 009, RF-18, RF-23, RF-24).
// Tipo de dato propio y sin text/plain, como el visor: los campos del panel, el
// visor y la rejilla no aceptan la tarjeta. Solo se acepta lo que empezó en la
// línea de esta serie (testigo en memoria), con la lectura de la wiki de ese
// momento: si la wiki se relee a medio arrastre, no se mueve.

const TIPO = "application/x-atelier-escena-historia";
let testigo: { id: string; serie: string; lectura: number } | null = null;

export function empezar(e: DragEvent, id: string, serie: string, lectura: number) {
  testigo = { id, serie, lectura };
  e.dataTransfer?.setData(TIPO, id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

/** La escena que se está arrastrando desde la línea de esta serie, o null */
export function arrastrada(e: DragEvent, serie: string): { id: string; lectura: number } | null {
  if (!testigo || testigo.serie !== serie || !e.dataTransfer?.types.includes(TIPO)) return null;
  return { id: testigo.id, lectura: testigo.lectura };
}

export function limpiar() {
  testigo = null;
}
