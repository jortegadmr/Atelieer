// Qué hace Esc (spec 002, RF-15 a RF-18; spec 003, RF-26; spec 010, RF-8):
// cierra lo abierto (buscador de la lente, menú contextual, ventanas); si se
// está escribiendo, sale del campo; durante un arrastre, nada (lo cancela el
// propio arrastre); si hay lente, la quita; si no, el visor sube un nivel.

export type QueHaceEsc = "capa" | "campo" | "nada" | "lente" | "subir";

export function queHaceEsc(s: { capas: boolean; campo: boolean; arrastrando: boolean; lente: boolean }): QueHaceEsc {
  if (s.capas) return "capa";
  if (s.campo) return "campo";
  if (s.arrastrando) return "nada";
  if (s.lente) return "lente";
  return "subir";
}
