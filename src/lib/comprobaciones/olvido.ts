// N del arco olvidado (D5): un tercio de los episodios de la temporada,
// redondeado hacia arriba, nunca menos de 2 (8 ep → 3; 10 → 4; 6 → 2). La
// fracción se guarda con cuatro decimales (0,3334), así que se redondea el
// producto a centésimas antes de subir: 6 × 0,3334 = 2,0004 debe dar 2.

export function nOlvido(episodios: number, fraccion: number): number {
  return Math.max(2, Math.ceil(Math.round(episodios * fraccion * 100) / 100));
}
