// Lo que pasa en la wiki después de pasar una pieza (spec 10.2, T8.5): si la
// ficha dice `estado_canon: canon`, la pieza se ve canon; si la ficha se
// modificó después de pasarla, se marca "cambió en la wiki". No junta nada.

import { unir, type Fs } from "../almacen/fs";
import type { Modelo } from "../modelo/modelo";
import { normalizarEstado } from "./equivalencias";
import { leerEscaleta, type EscaletaLeida } from "./escaleta";
import { rutaFicha } from "./estado-ficha";
import { separar } from "./md";

export interface EstadoFicha {
  id: string;
  /** Relativa al vault */
  ruta: string;
  existe: boolean;
  canon: boolean;
  /** `estado_canon` de la ficha tal cual (texto, lista, número…), para los estados antiguos (spec 009, RF-53) */
  estadoWiki?: unknown;
  /** Se modificó después de pasarla (más de 2 s de margen) */
  cambio: boolean;
  /** Episodio: la escaleta de su ficha, para avisar si ya no está al día (spec 003, RF-39) */
  escaleta?: EscaletaLeida | null;
}

export async function revisarFichas(fs: Fs, vault: string, m: Modelo): Promise<EstadoFicha[]> {
  if (!m.serie.wiki.narrativa.replace(/\/+$/, "")) return [];
  const piezas = [...m.temporadas.values(), ...m.episodios.values(), ...m.arcos.values(), ...m.secretos.values()].filter((p) => p.wiki.trim());
  return Promise.all(
    piezas.map(async (p) => {
      // Solo fichas dentro de la narrativa: un enlace con ../ no se lee (spec 009, RF-43)
      const ruta = rutaFicha(m.serie.wiki, p);
      if (!ruta) return { id: p.id, ruta: "", existe: false, canon: false, cambio: false };
      const abs = unir(vault, ruta);
      if (!(await fs.existe(abs))) return { id: p.id, ruta, existe: false, canon: false, cambio: false };
      const { propiedades, cuerpo } = separar(await fs.leer(abs));
      const fecha = (await fs.fecha(abs)) ?? 0;
      const pasada = Date.parse(p.wiki_mtime);
      return {
        id: p.id,
        ruta,
        existe: true,
        // «Canon» con mayúscula también es canon (RF-53)
        canon: typeof propiedades.estado_canon === "string" && normalizarEstado(propiedades.estado_canon) === "canon",
        estadoWiki: propiedades.estado_canon,
        cambio: Number.isFinite(pasada) && fecha > pasada + 2000,
        ...(p.tipo === "episodio" ? { escaleta: leerEscaleta(cuerpo) } : {}),
      };
    }),
  );
}
