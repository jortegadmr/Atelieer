// Copia congelada de la etiqueta v1.0 (spec 006, T6). No se toca (solo las rutas de import, a esta carpeta): sirve para probar que la v1.0 no ve ni toca _variantes/.
// Ids fijos de las piezas (D4): prefijo del tipo y cuatro letras o cifras,
// por ejemplo ep-k2m9. No cambian nunca, aunque cambie el título o el orden.

import { PREFIJO, type TipoPieza } from "./vocabulario";

const LETRAS = "abcdefghijklmnopqrstuvwxyz0123456789";

function aleatorio(largo: number): string {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += LETRAS[b % LETRAS.length];
  return s;
}

export function nuevoId(tipo: TipoPieza, usados: { has(id: string): boolean }): string {
  let largo = 4;
  for (let intento = 0; ; intento++) {
    // Si se llena el espacio de cuatro letras (1,6 millones), se alarga
    if (intento > 0 && intento % 50 === 0) largo++;
    const id = `${PREFIJO[tipo]}-${aleatorio(largo)}`;
    if (!usados.has(id)) return id;
  }
}

export function tipoDeId(id: string): TipoPieza | null {
  const prefijo = id.split("-")[0];
  for (const [tipo, p] of Object.entries(PREFIJO)) {
    if (p === prefijo) return tipo as TipoPieza;
  }
  return null;
}
