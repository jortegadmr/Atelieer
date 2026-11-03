import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, ErrorFormato, leerPieza } from "../src/lib/modelo/ficheros";
import { nuevoId, tipoDeId } from "../src/lib/modelo/ids";
import type { Arco, Evento, Pieza, Secreto, Serie } from "../src/lib/modelo/tipos";
import { TIPO_PIEZA } from "../src/lib/modelo/vocabulario";

function idaYVuelta(p: Pieza): Pieza {
  return leerPieza(escribirPieza(p), p.tipo);
}

const EVENTO_SPEC = `---
id: ev-7f3k
tipo: evento
titulo: La leyenda del Faro Ciego, junto al fuego
madurez: borrador
episodio: ep-k2m9       # id fijo (se ve como T01E06); vacío = bandeja de su temporada
temporada: te-a1b2      # id fijo (se ve como T01)
orden: 2
acto: "2"               # teaser · 1 · 2 · 3
arcos:
  - arco: ar-cinta
    papel: avanza
personajes: ["[[Don Anselmo]]", "[[Telmo]]"]
lugares: ["[[Torre de la emisora]]"]
mundo: "[[C1]]"         # vacío = presente
modo: leyenda           # escena · flashback · leyenda
valor: Verdad
cambio: ["-", "+"]
gana: "Una pista."
pierde: ""
relleno: {avanza: false, revela: true}
eliminacion: ""
avisos_silenciados: []
---
Texto libre del evento.
`;

describe("leer y escribir piezas (spec 11.1)", () => {
  it("lee el ejemplo de evento de la spec", () => {
    const e = leerPieza(EVENTO_SPEC, "evento") as Evento;
    expect(e.id).toBe("ev-7f3k");
    expect(e.titulo).toBe("La leyenda del Faro Ciego, junto al fuego");
    expect(e.episodio).toBe("ep-k2m9");
    expect(e.orden).toBe(2);
    expect(e.acto).toBe("2");
    expect(e.arcos).toEqual([{ arco: "ar-cinta", papel: "avanza" }]);
    expect(e.personajes).toEqual(["[[Don Anselmo]]", "[[Telmo]]"]);
    expect(e.mundo).toBe("[[C1]]");
    expect(e.modo).toBe("leyenda");
    expect(e.cambio).toEqual(["-", "+"]);
    expect(e.relleno).toEqual({ avanza: false, revela: true });
    expect(e.texto).toBe("Texto libre del evento.\n");
  });

  it("ida y vuelta da lo mismo para las siete piezas, vacías", () => {
    for (const tipo of TIPO_PIEZA) {
      const p = crearPieza(tipo, { id: nuevoId(tipo, new Set()) });
      expect(idaYVuelta(p)).toEqual(p);
    }
  });

  it("ida y vuelta da lo mismo con datos de verdad", () => {
    const e = leerPieza(EVENTO_SPEC, "evento");
    expect(idaYVuelta(e)).toEqual(e);

    const arco = crearPieza("arco", {
      id: "ar-v3n9",
      titulo: "El eco",
      madurez: "canon",
      tipo_arco: "trama",
      tipo_trama: "A",
      color: 1,
      inicio: { temporada: "te-a1b2", episodio: "ep-k2m9" },
      protagonistas: ["[[Telmo]]"],
      quiere: "Que el Alcalde escuche.",
      bomba: "La desgracia llega con la marea viva",
      bomba_vence: { temporada: "te-a1b2", episodio: "ep-p4r7" },
      pegamento: { por: "tema", texto: "La señal" },
      siembras: [{ siembra: "La cinta", donde: "T01E01", recogida: "", donde_recogida: "" }],
      texto: "Notas\n\ncon varias líneas\n",
    }) as Arco;
    expect(idaYVuelta(arco)).toEqual(arco);

    const secreto = crearPieza("secreto", {
      id: "sc-b8x1",
      titulo: "Quién grabó la cinta",
      verdad: "Fue Sabela: 'la alcaldesa' no sabía nada.\nSegunda línea.",
      conocen: ["[[Nando]]"],
      revelado_en: { episodio: "ep-p4r7", evento: "" },
      pistas: [{ episodio: "ep-k2m9", evento: "", texto: "Tinta verde", clase: "sutil" }],
    }) as Secreto;
    expect(idaYVuelta(secreto)).toEqual(secreto);
  });

  it("la serie nace con las 11 preguntas en orden y la fracción de olvido de D5", () => {
    const s = crearPieza("serie", { id: "se-d7k2" }) as Serie;
    expect(s.preguntas).toHaveLength(11);
    expect(s.preguntas[0]).toEqual({ pregunta: "Protagonista", respuesta: "" });
    expect(s.preguntas[10].pregunta).toBe("Mensaje");
    expect(s.olvido_fraccion).toBeCloseTo(1 / 3, 3);
  });

  it("arco con cinco beats y temporada con ocho pasos del Story Circle", () => {
    const a = crearPieza("arco", { id: "ar-1" }) as Arco;
    expect(a.beats).toHaveLength(5);
    const t = crearPieza("temporada", { id: "te-1" });
    expect(t.tipo === "temporada" && t.story_circle).toHaveLength(8);
  });

  it("conserva los campos desconocidos y el texto libre, pero no los comentarios", () => {
    const md = `---
id: ar-x1y2
tipo: arco
titulo: Mi arco
nota_mia: algo que puse a mano
otra: {a: 1, b: [2, 3]}
---
Texto libre.

Con párrafos.
`;
    const a = leerPieza(md, "arco");
    expect(a.extra).toEqual({ nota_mia: "algo que puse a mano", otra: { a: 1, b: [2, 3] } });
    const vuelta = escribirPieza(a);
    expect(vuelta).toContain("nota_mia: algo que puse a mano");
    expect(vuelta.endsWith("---\nTexto libre.\n\nCon párrafos.\n")).toBe(true);
    expect(escribirPieza(leerPieza(EVENTO_SPEC, "evento"))).not.toContain("#");
  });

  it("los enlaces [[Nombre]] salen igual y entre comillas", () => {
    const e = leerPieza(EVENTO_SPEC, "evento");
    const md = escribirPieza(e);
    expect(md).toContain('"[[Don Anselmo]]"');
    expect(md).toContain('mundo: "[[C1]]"');
  });

  it("acepta la forma en bloque que escribe Obsidian y enlaces sin comillas", () => {
    const md = `---
id: ev-a1
tipo: evento
personajes:
  - "[[Prueba Enlace Atelier 2]]"
mundo: [[C1]]
lugares: "[[Torre de la emisora]]"
---
`;
    const e = leerPieza(md, "evento") as Evento;
    expect(e.personajes).toEqual(["[[Prueba Enlace Atelier 2]]"]);
    expect(e.mundo).toBe("[[C1]]");
    expect(e.lugares).toEqual(["[[Torre de la emisora]]"]);
  });

  it("acentos, comillas, dos puntos y saltos de línea", () => {
    const e = crearPieza("evento", {
      id: "ev-b2",
      titulo: 'Ñandú: "la última" canción de Sabela — ¿o no?',
      gana: "Línea uno\nLínea 'dos'",
      pierde: "#no es comentario",
      valor: "yes",
    });
    const vuelta = idaYVuelta(e) as Evento;
    expect(vuelta).toEqual(e);
    expect(vuelta.valor).toBe("yes");
  });

  it("tolera valores con otra forma: números, mayúsculas y acentos en las listas", () => {
    const md = `---
id: ar-c1
tipo: arco
madurez: Canon
tipo_arco: relación
color: "3"
---
`;
    const a = leerPieza(md, "arco") as Arco;
    expect(a.madurez).toBe("canon");
    expect(a.tipo_arco).toBe("relacion");
    expect(a.color).toBe(3);
    const e = leerPieza("---\nid: ev-1\ntipo: evento\nacto: 2\ncambio: [\"+\", \"−\"]\n---\n", "evento") as Evento;
    expect(e.acto).toBe("2");
    expect(e.cambio).toEqual(["+", "-"]);
  });

  it("sin id en las propiedades, lo toma del nombre del fichero", () => {
    const e = leerPieza("---\ntipo: evento\ntitulo: Sin id\n---\n", "evento", "ev-zz99");
    expect(e.id).toBe("ev-zz99");
  });

  it("YAML roto o sin propiedades da un error de formato, no revienta", () => {
    expect(() => leerPieza("---\ntitulo: [sin cerrar\n---\n", "evento")).toThrow(ErrorFormato);
    expect(() => leerPieza("Solo texto, sin propiedades", "evento")).toThrow(ErrorFormato);
    expect(() => leerPieza("---\nid: ev-1\ntipo: arco\n---\n", "evento")).toThrow(ErrorFormato);
  });

  it("acepta saltos de línea de Windows y la marca BOM", () => {
    const e = leerPieza("\uFEFF---\r\nid: ev-1\r\ntipo: evento\r\ntitulo: Hola\r\n---\r\nTexto\r\n", "evento") as Evento;
    expect(e.titulo).toBe("Hola");
    expect(e.texto).toBe("Texto\n");
  });
});

describe("ids (D4)", () => {
  it("llevan el prefijo de su tipo", () => {
    expect(nuevoId("evento", new Set())).toMatch(/^ev-[a-z0-9]{4}$/);
    expect(nuevoId("episodio", new Set())).toMatch(/^ep-/);
    expect(nuevoId("secreto", new Set())).toMatch(/^sc-/);
    expect(tipoDeId("te-a1b2")).toBe("temporada");
    expect(tipoDeId("zz-1")).toBeNull();
  });

  it("no se repiten", () => {
    const usados = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const id = nuevoId("evento", usados);
      expect(usados.has(id)).toBe(false);
      usados.add(id);
    }
  });
});
