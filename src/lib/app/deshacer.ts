// A quién le toca Ctrl Z / Ctrl Y (spec 013, RF-5; spec 012, RF-10): hay cuatro
// historiales (campo de texto, editor de guion, pizarra y piezas) y cada uno
// deshace lo suyo. Lo decide el foco, no la vista; con una ventana abierta,
// deshacer no actúa detrás.

export type FocoDeshacer = "campo" | "editor-guion" | "otro";
export type QuienDeshace = "campo" | "guion" | "pizarra" | "piezas" | "nada";

export function quienDeshace(s: { foco: FocoDeshacer; vista: string; capas: boolean }): QuienDeshace {
  // El editor de guion tiene su historial y lo atiende él mismo en su keydown
  if (s.foco === "editor-guion") return "guion";
  // Un campo de texto normal usa el suyo del navegador
  if (s.foco === "campo") return "campo";
  if (s.capas) return "nada";
  // En la vista del guion, fuera del editor, deshacer no toca las piezas: borraría escenas sin que se vea
  if (s.vista === "guion") return "nada";
  return s.vista === "pizarra" ? "pizarra" : "piezas";
}
