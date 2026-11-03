// Serie grande para medir el rendimiento (M7): 5 temporadas × 10 episodios ×
// 300 eventos por temporada (1.500 en total). Sale siempre igual (semilla fija),
// para que las mediciones se puedan comparar.

import { crearPieza } from "../src/lib/modelo/ficheros";
import type { DatosModelo } from "../src/lib/modelo/modelo";
import type { Arco, Episodio, Evento, Secreto, Temporada } from "../src/lib/modelo/tipos";
import { PAPEL, type Carga } from "../src/lib/modelo/vocabulario";

/** Generador pseudoaleatorio con semilla (mulberry32) */
function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NT = 5;
const NE = 10;
const EVENTOS_POR_TEMPORADA = 300;
const PERSONAJES = ["Telmo", "Nando", "Sabela", "El Alcalde", "Don Anselmo", "La madre"].map((n) => `[[${n}]]`);
const LUGARES = ["Casa del Muelle", "Lonja vieja", "Torre de la emisora", "El Ayuntamiento", "Paso del Espigón"].map((n) => `[[${n}]]`);

export function generarPruebaGrande(semilla = 2026): DatosModelo {
  const r = azar(semilla);
  const elegir = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  const carga = (): Carga => (r() < 0.5 ? "+" : "-");
  const id = (prefijo: string, n: number) => `${prefijo}-${n.toString(36).padStart(4, "0")}`;

  const temporadas: Temporada[] = [];
  const episodios: Episodio[] = [];
  const arcos: Arco[] = [];
  const eventos: Evento[] = [];
  const secretos: Secreto[] = [];

  for (let t = 0; t < NT; t++) {
    const eps = Array.from({ length: NE }, (_, e) => id("ep", t * 100 + e));
    temporadas.push(
      crearPieza("temporada", {
        id: id("te", t),
        titulo: `Temporada grande ${t + 1}`,
        madurez: "borrador",
        estado: "en marcha",
        carga: [carga(), carga()],
        episodios: eps,
      }),
    );
    eps.forEach((e, i) =>
      episodios.push(
        crearPieza("episodio", { id: e, temporada: id("te", t), titulo: `Episodio ${i + 1}`, carga: [carga(), carga()] }),
      ),
    );
  }

  const deSerie = [
    { titulo: "El eco", tipo_trama: "A", tipo_arco: "trama" },
    { titulo: "Amistad", tipo_trama: "B", tipo_arco: "relacion" },
    { titulo: "La cinta", tipo_trama: "B", tipo_arco: "trama" },
    { titulo: "Respiro", tipo_trama: "C", tipo_arco: "trama" },
    { titulo: "Telmo", tipo_trama: "A", tipo_arco: "personaje" },
  ] as const;
  deSerie.forEach((a, i) =>
    arcos.push(
      crearPieza("arco", {
        id: id("ar", i),
        titulo: a.titulo,
        tipo_trama: a.tipo_trama,
        tipo_arco: a.tipo_arco,
        color: (i % 6) + 1,
        protagonistas: [elegir(PERSONAJES)],
        madurez: "borrador",
      }),
    ),
  );
  for (let t = 0; t < NT; t++) {
    for (let k = 0; k < 3; k++) {
      arcos.push(
        crearPieza("arco", {
          id: id("ar", 100 + t * 10 + k),
          titulo: `Tramo ${k + 1} de T${t + 1}`,
          nivel: "temporada",
          temporada: id("te", t),
          tipo_trama: (["A", "B", "C"] as const)[k],
          tramo_de: k === 0 ? id("ar", 0) : "",
          color: ((k + t) % 6) + 1,
          protagonistas: [elegir(PERSONAJES)],
          madurez: "borrador",
        }),
      );
    }
  }

  let n = 0;
  for (let t = 0; t < NT; t++) {
    const propios = arcos.filter((a) => a.nivel === "serie" || a.temporada === id("te", t));
    const orden = new Map<string, number>();
    for (let k = 0; k < EVENTOS_POR_TEMPORADA; k++) {
      const enBandeja = r() < 0.05;
      const episodio = enBandeja ? "" : id("ep", t * 100 + Math.floor(r() * NE));
      const o = (orden.get(episodio) ?? 0) + 1;
      orden.set(episodio, o);
      const toca = new Set([elegir(propios).id]);
      if (r() < 0.3) toca.add(elegir(propios).id);
      eventos.push(
        crearPieza("evento", {
          id: id("ev", n++),
          titulo: `Evento ${k + 1} de T${t + 1}`,
          madurez: "borrador",
          temporada: id("te", t),
          episodio,
          orden: o,
          arcos: [...toca].map((arco) => ({ arco, papel: elegir(PAPEL) })),
          personajes: [elegir(PERSONAJES), elegir(PERSONAJES)],
          lugares: [elegir(LUGARES)],
          cambio: [carga(), carga()],
          gana: r() < 0.8 ? "Algo" : "",
          relleno: { avanza: r() < 0.7, revela: r() < 0.6 },
        }),
      );
    }
    for (let k = 0; k < 3; k++) {
      const rev = id("ep", t * 100 + 5 + Math.floor(r() * 5));
      secretos.push(
        crearPieza("secreto", {
          id: id("sc", t * 10 + k),
          titulo: `Secreto ${k + 1} de T${t + 1}`,
          nivel: elegir(["menor", "mayor", "central"] as const),
          verdad: "Lo sabe solo el autor.",
          revelado_en: { episodio: rev, evento: "" },
          pistas: [0, 1, 2].map(() => ({ episodio: id("ep", t * 100 + Math.floor(r() * NE)), evento: "", texto: "Una pista", clase: "sutil" as const })),
        }),
      );
    }
  }

  const serie = crearPieza("serie", {
    id: "se-gran",
    titulo: "Prueba grande",
    temporadas: temporadas.map((t) => t.id),
  });
  return { serie, puntos: [], temporadas, episodios, arcos, eventos, secretos };
}
