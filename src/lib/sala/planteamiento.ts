// El planteamiento para la sala (spec 012, RF-19, RF-23, RF-25): lo que se copia
// al portapapeles para llevarlo a la sala de guionistas. Aquí solo se compone:
// quien reúne los datos (`reunir.ts`) decide qué entra; esto pone el orden fijo,
// omite lo vacío, cuenta lo que no se pudo leer y recorta si no cabe.

import { textoSeguro } from "../wiki/md";
import { componer, limpiar, entrecomillar, recortarPlanteamiento, unidades, type ClaveSeccion, type Seccion } from "./texto";

/** Texto del autor en una línea, sin invisibles ni dirección y sin Markdown */
const seguro = (s: string) => textoSeguro(limpiar(s));

/** La última línea, para que el autor la rellene (RF-23.9) */
export const ULTIMA_LINEA = "Quiero decidir:";

/** El orden de las secciones (RF-23): la ficha y los avisos primero, la pizarra al final */
const ORDEN: ClaveSeccion[] = ["estado", "ficha", "avisos", "causas", "quien-sabe", "cambios", "alternativas", "notas"];

/** Una sección con su contenido, o una que no se pudo leer y se dice por qué (RF-25) */
export type SeccionSala =
  | { clave: Exclude<ClaveSeccion, "estado" | "notas">; titulo: string; lineas: string[]; literal?: boolean }
  | { clave: Exclude<ClaveSeccion, "estado" | "notas">; titulo: string; nolee: string };

/** Una nota de la pizarra unida a la pieza por una flecha directa (RF-23.8) */
export interface NotaSala {
  texto: string;
  /** La etiqueta de la flecha, si tiene */
  etiqueta: string;
  /** «llega»: la flecha va de la nota a la pieza; «sale»: de la pieza a la nota */
  direccion: "llega" | "sale";
  /** Para ordenarlas por posición: de arriba abajo y de izquierda a derecha */
  x: number;
  y: number;
}

export interface EntradaSala {
  /** Qué es: «Episodio», «Escena», «Arco»… */
  tipo: string;
  titulo: string;
  /** En palabras («en borrador», «canon»); vacío si no hay */
  estado: string;
  /** Con una variante abierta el planteamiento lleva la serie, y lo dice */
  conVariante?: boolean;
  secciones: SeccionSala[];
  /** Las notas, `{ nolee }` si la pizarra no cargó, o null si no hay pizarra que consultar */
  notas: NotaSala[] | { nolee: string } | null;
}

export interface Planteamiento {
  texto: string;
  /** En unidades de texto (RF-22) */
  caracteres: number;
  recortado: boolean;
}

const lineaNoLee = (motivo: string) => `(no se pudo leer: ${seguro(motivo)})`;

function seccionNotas(notas: NotaSala[] | { nolee: string } | null): Seccion | null {
  if (!notas) return null;
  const titulo = "Notas de la pizarra";
  if ("nolee" in notas) return { clave: "notas", titulo, lineas: [`(la pizarra no se pudo leer: ${seguro(notas.nolee)}; se omiten sus notas)`] };
  const lineas = [...notas]
    .filter((n) => n.texto.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((n) => {
      const de = n.direccion === "llega" ? "Flecha de la nota a esta pieza" : "Flecha de esta pieza a la nota";
      const etiqueta = n.etiqueta.trim() ? ` · «${seguro(n.etiqueta)}»` : "";
      return `- ${de}${etiqueta}\n${entrecomillar(n.texto)}`;
    });
  return lineas.length ? { clave: "notas", titulo, lineas } : null;
}

export function planteamiento(e: EntradaSala): Planteamiento {
  const estado: Seccion = {
    clave: "estado",
    titulo: "Qué es",
    lineas: [
      `- Tipo: ${seguro(e.tipo)}`,
      ...(e.estado.trim() ? [`- Estado: ${seguro(e.estado)}`] : []),
      ...(e.conVariante ? ["- Hay una variante abierta: este planteamiento lleva la serie principal, no la variante."] : []),
    ],
  };
  const resto: Seccion[] = e.secciones.flatMap((s): Seccion[] => {
    if ("nolee" in s) return [{ clave: s.clave, titulo: s.titulo, lineas: [lineaNoLee(s.nolee)] }];
    // Lo que no es de una línea suelta ya viene seguro de quien reúne; aquí solo se limpia
    const lineas = s.lineas.map(limpiar).filter((l) => l.trim());
    return lineas.length ? [{ clave: s.clave, titulo: s.titulo, lineas, literal: s.literal }] : [];
  });
  const notas = seccionNotas(e.notas);
  const secciones = [estado, ...resto, ...(notas ? [notas] : [])].sort((a, b) => ORDEN.indexOf(a.clave) - ORDEN.indexOf(b.clave));
  const cabecera = `# Planteamiento para la sala: ${seguro(e.titulo) || "sin título"}`;
  const r = recortarPlanteamiento(cabecera, secciones, ULTIMA_LINEA);
  const texto = componer(cabecera, r.secciones, ULTIMA_LINEA, r.aviso);
  return { texto, caracteres: unidades(texto), recortado: r.recortado };
}
