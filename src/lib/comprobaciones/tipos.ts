// Un aviso de las comprobaciones (spec 6.2). Nunca bloquea.

export type Clase = "aviso" | "sugerencia";
export type Grupo = "Carga" | "Tramas" | "Escenas" | "Secretos" | "Episodios" | "Serie";

export interface Aviso {
  /** Id de la comprobación: "C03", o "C01a" para las variantes de C01 */
  id: string;
  /** Id de la pieza a la que se refiere */
  pieza: string;
  clase: Clase;
  /** En español llano */
  mensaje: string;
  fuente: string;
  grupo: Grupo;
  /**
   * De qué habla (una temporada, un episodio, «inicio»…) cuando la misma
   * comprobación puede salir varias veces en la misma pieza. Solo en memoria:
   * sirve para saber si un aviso es el mismo aunque cambie su texto (spec 005).
   */
  sobre?: string;
}
