// Arrastrar escenas dentro del visor (spec 003, RF-17, RF-26, RF-27, RF-31).
// Tipo de dato propio y sin text/plain: los campos del panel y la rejilla de
// Episodios no aceptan la tarjeta. Solo se acepta lo que empezó en el visor de
// esta serie (testigo en memoria): un texto o un fichero de fuera no hace nada.

const TIPO = "application/x-atelier-escena-visor";
let testigo: { id: string; serie: string } | null = null;

export function empezar(e: DragEvent, id: string, serie: string) {
  testigo = { id, serie };
  e.dataTransfer?.setData(TIPO, id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

/** La escena que se está arrastrando desde el visor de esta serie, o null */
export function arrastrada(e: DragEvent, serie: string): string | null {
  if (!testigo || testigo.serie !== serie || !e.dataTransfer?.types.includes(TIPO)) return null;
  return testigo.id;
}

export function limpiar() {
  testigo = null;
}
