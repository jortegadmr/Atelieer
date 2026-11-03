// Recortes de texto de la pizarra: en grafemas, para no partir un emoji ni una
// letra con acento combinado (como `limpiarIdea`).

const segmentador = new Intl.Segmenter("es", { granularity: "grapheme" });

/** Como mucho `max` grafemas del texto; `recortado` dice si sobraba algo */
export function cortarGrafemas(texto: string, max: number): { texto: string; recortado: boolean } {
  // Si no tiene tantas unidades de texto, tampoco tiene tantos grafemas
  if (texto.length <= max) return { texto, recortado: false };
  let n = 0;
  let fin = 0;
  for (const g of segmentador.segment(texto)) {
    if (n === max) return { texto: texto.slice(0, fin), recortado: true };
    n++;
    fin = g.index + g.segment.length;
  }
  return { texto, recortado: false };
}
