import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAMPOS_VISTOS, camposCambiados } from "../../src/lib/consecuencias/campos-vistos";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { GUIA_INICIAL } from "../../src/lib/guia/guia-inicial";
import { leerGuia } from "../../src/lib/guia/guia-md";
import { crearPieza } from "../../src/lib/modelo/ficheros";
import type { Modelo } from "../../src/lib/modelo/modelo";
import { codigo } from "../../src/lib/modelo/consultas";
import { insertarEpisodio } from "../../src/lib/modelo/operaciones";
import type { Episodio, Pieza, PiezaDe, Punto, Serie, Temporada } from "../../src/lib/modelo/tipos";
import type { TipoPieza } from "../../src/lib/modelo/vocabulario";
import { serieBasica } from "./ayuda";

/** Copia la pieza, le aplica `fn` y la pone (como Sesion.editar, sin disco) */
function cambiar<P extends Pieza>(m: Modelo, id: string, fn: (p: P) => unknown) {
  const p = structuredClone(m.pieza(id)) as P;
  fn(p);
  m.poner(p);
}

/** La base (copia) y el modelo de ahora, para comparar una pieza */
function preparar(antes?: (x: ReturnType<typeof serieBasica>) => void) {
  const x = serieBasica();
  antes?.(x);
  const m = x.b.modelo();
  const base = copiaModelo(m);
  const frases = (id: string, guia?: ReturnType<typeof leerGuia>) => camposCambiados(base.pieza(id)!, m.pieza(id)!, base, m, guia);
  return { ...x, m, base, frases };
}

describe("campos cambiados de la pieza abierta (spec 005, RF-8)", () => {
  it("un texto cambiado sale con su etiqueta, cómo estaba y cómo está", () => {
    const { m, t, frases } = preparar();
    cambiar<Temporada>(m, t, (p) => (p.titulo = "Otra"));
    expect(frases(t)).toEqual(["Título: Primera → Otra"]);
  });

  it("vacío si lo estaba o lo queda, y los textos largos en una línea recortada", () => {
    const { m, t, frases } = preparar();
    const largo = `Una línea\nque sigue ${"y sigue ".repeat(20)}`;
    cambiar<Temporada>(m, t, (p) => {
      p.logline = largo;
      p.titulo = "";
    });
    const [titulo, f] = frases(t);
    expect(titulo).toBe("Título: Primera → vacío");
    expect(f.startsWith("Logline: vacío → Una línea que sigue y sigue")).toBe(true);
    expect(f.endsWith("…")).toBe(true);
    expect(f.length).toBeLessThan("Logline: vacío → ".length + 81);
    expect(f).not.toContain("\n");
  });

  it("la trama dominante vacía se dice «calculada», y un arco elegido, con su título", () => {
    const { m, e1, a, frases } = preparar();
    cambiar<Episodio>(m, e1, (p) => (p.dominante_manual = a));
    expect(frases(e1)).toEqual(["Trama dominante: calculada → El eco"]);
  });

  it("los momentos de la estructura y del Story Circle salen uno a uno (spec 011, RF-35)", () => {
    const { m, t, e2, frases } = preparar();
    cambiar<Temporada>(m, t, (p) => {
      p.estructura.crisis.texto = "Lo pierde todo";
      p.estructura.climax.episodio = e2;
      p.story_circle[2] = "Entra";
    });
    expect(frases(t)).toEqual([
      "Estructura (Crisis): vacío → Lo pierde todo",
      `Estructura (Clímax): vacío → ${codigo(m, e2)}`,
      "Story Circle (3 · Ir): vacío → Entra",
    ]);
  });

  it("una causa que ya no está sale como «(ya no está)», no como su id (spec 011, RF-13)", () => {
    const { m, s1, frases } = preparar();
    cambiar<PiezaDe<"evento">>(m, s1, (p) => (p.extra.viene_de = ["ev-zzzz"]));
    const [f] = frases(s1);
    expect(f).toContain("(ya no está)");
    expect(f).not.toContain("ev-zzzz");
  });

  it("un NUL escrito en la nota no parte el momento (spec 011, RF-35)", () => {
    const { m, t, frases } = preparar();
    cambiar<Temporada>(m, t, (p) => (p.estructura.crisis.texto = "Lo pierde\u0000 todo"));
    expect(frases(t)).toEqual(["Estructura (Crisis): vacío → Lo pierde todo"]);
  });

  it("en una lista dice cuántas había y cuáles se añadieron o quitaron", () => {
    const { m, b, frases } = preparar();
    const id = b.serie.id;
    cambiar<Serie>(m, id, (p) => (p.preguntas_filosoficas = ["¿Se puede evitar lo avisado?"]));
    const base = copiaModelo(m);
    cambiar<Serie>(m, id, (p) => (p.preguntas_filosoficas = ["¿Se puede evitar lo avisado?", "¿Y el aviso?"]));
    expect(camposCambiados(base.pieza(id)!, m.pieza(id)!, base, m)).toEqual(["Preguntas filosóficas: 1 → 2 · añadida «¿Y el aviso?»"]);
    cambiar<Serie>(m, id, (p) => (p.preguntas_filosoficas = ["¿Y el aviso?"]));
    expect(camposCambiados(base.pieza(id)!, m.pieza(id)!, base, m)).toEqual(["Preguntas filosóficas: cambió «¿Y el aviso?»"]);
    expect(frases(id)).toEqual(["Preguntas filosóficas: 0 → 1 · añadida «¿Y el aviso?»"]);
  });

  it("silenciar con «Lo sé» y reactivar, con el código de la regla o el de la comprobación", () => {
    const { m, e1, frases } = preparar();
    const guia = leerGuia(GUIA_INICIAL);
    cambiar<Episodio>(m, e1, (p) => p.avisos_silenciados.push("C16"));
    expect(frases(e1, guia)).toEqual(["G40: silenciado con «Lo sé»"]);
    expect(frases(e1)).toEqual(["C16: silenciado con «Lo sé»"]);
    const base = copiaModelo(m);
    cambiar<Episodio>(m, e1, (p) => (p.avisos_silenciados = []));
    expect(camposCambiados(base.pieza(e1)!, m.pieza(e1)!, base, m, guia)).toEqual(["G40: vuelve a avisar"]);
  });

  it("aparcar y descartar ya no se comprueba; volver a idea se vuelve a comprobar; lo demás es «Estado»", () => {
    const { m, t, frases } = preparar();
    cambiar<Temporada>(m, t, (p) => (p.madurez_mesa = "aparcado"));
    expect(frases(t)).toEqual(["Ya no se comprueba: aparcada"]);
    cambiar<Temporada>(m, t, (p) => {
      p.madurez = "descartado";
      p.madurez_mesa = "";
    });
    expect(frases(t)).toEqual(["Ya no se comprueba: descartada"]);
    const base = copiaModelo(m);
    cambiar<Temporada>(m, t, (p) => (p.madurez = "idea"));
    expect(camposCambiados(base.pieza(t)!, m.pieza(t)!, base, m)).toEqual(["Se vuelve a comprobar"]);
    cambiar<Temporada>(m, t, (p) => (p.madurez = "borrador"));
    expect(frases(t)).toEqual(["Estado: Idea → Borrador"]);
  });

  it("escribir y borrar lo escrito no deja nada", () => {
    const { m, t, e1, frases } = preparar();
    cambiar<Temporada>(m, t, (p) => (p.tema = "La señal"));
    cambiar<Temporada>(m, t, (p) => (p.tema = ""));
    cambiar<Episodio>(m, e1, (p) => (p.actos.inicio = "  "));
    expect(frases(t)).toEqual([]);
    expect(frases(e1)).toEqual([]);
  });

  it("un valor escrito a mano que la app deja de usar no cuenta", () => {
    const { m, t } = preparar();
    // En la nota ponía «en pausa»: se enseña como «prevista» y se guarda aparte
    cambiar<Temporada>(m, t, (p) => (p.crudos = { estado: "en pausa" }));
    const base = copiaModelo(m);
    cambiar<Temporada>(m, t, (p) => delete p.crudos);
    expect(camposCambiados(base.pieza(t)!, m.pieza(t)!, base, m)).toEqual([]);
  });

  it("renumerar episodios no cambia un selector; elegir otro episodio, sí, con sus códigos", () => {
    const { m, t, e1, e2 } = preparar();
    const punto = crearPieza("punto", { id: "pu-1", posicion: { temporada: t, episodio: e1 } });
    m.poner(punto);
    cambiar<Temporada>(m, t, (p) => (p.estructura.crisis.episodio = e2));
    const base = copiaModelo(m);
    const { cambio } = insertarEpisodio(m, t, 0);
    for (const p of cambio.guardar) m.poner(p);
    expect(camposCambiados(base.pieza(t)!, m.pieza(t)!, base, m)).toEqual([]);
    expect(camposCambiados(base.pieza(punto.id)!, m.pieza(punto.id)!, base, m)).toEqual([]);
    cambiar<Punto>(m, punto.id, (p) => (p.posicion.episodio = e2));
    expect(camposCambiados(base.pieza(punto.id)!, m.pieza(punto.id)!, base, m)).toEqual(["Episodio: T01E01 → T01E03"]);
  });

  it("listas de escena, secreto y arco: pistas, protagonistas y personajes", () => {
    let sc = "";
    const { m, a, s1, e1, e2, frases } = preparar((x) => {
      sc = x.b.secreto({ titulo: "La cinta", pistas: [1, 2, 3].map((n) => ({ episodio: x.e1, evento: "", texto: `Pista ${n}`, clase: "sutil" as const })) });
    });
    cambiar<PiezaDe<"secreto">>(m, sc, (p) => p.pistas.push({ episodio: e2, evento: "", texto: "Un sobre", clase: "sutil" }));
    expect(frases(sc)).toEqual(["Pistas sembradas: 3 → 4 · añadida «Un sobre · T01E02»"]);
    cambiar<PiezaDe<"secreto">>(m, sc, (p) => {
      p.pistas.pop();
      p.pistas[1].episodio = e2;
    });
    expect(frases(sc)).toEqual(["Pistas sembradas: cambió «Pista 2 · T01E02»"]);
    cambiar<PiezaDe<"arco">>(m, a, (p) => (p.protagonistas = ["[[Telmo]]"]));
    expect(frases(a)).toEqual(["Protagonistas: 0 → 1 · añadida «Telmo»"]);
    cambiar<PiezaDe<"evento">>(m, s1, (p) => (p.personajes = ["[[Telmo]]", "[[Nando]]"]));
    expect(frases(s1)).toEqual(["Personajes · de la wiki: 0 → 2 · añadida «Telmo» · añadida «Nando»"]);
    void e1;
  });

  it("la etiqueta calculada es la que lleva la pieza: protagonistas del vínculo en una relación", () => {
    const { m, a, frases } = preparar();
    cambiar<PiezaDe<"arco">>(m, a, (p) => {
      p.tipo_arco = "relacion";
      p.protagonistas = ["[[Telmo]]", "[[Nando]]"];
      p.quiere = "Evitar la desgracia";
    });
    expect(frases(a)).toEqual([
      "Protagonistas del vínculo: 0 → 2 · añadida «Telmo» · añadida «Nando»",
      "Tipo de arco: Trama → Relación",
      "Qué quiere y por qué: vacío → Evitar la desgracia",
    ]);
  });

  it("estado por temporada: dice qué temporada cambió, con su código", () => {
    let t2 = "";
    const { m, a, frases } = preparar((x) => {
      t2 = x.b.temporada({ titulo: "Segunda" }).id;
    });
    cambiar<PiezaDe<"arco">>(m, a, (p) => {
      p.tipo_arco = "personaje";
      p.estados = [{ temporada: t2, inicio: "Huye", fin: "" }];
    });
    expect(frases(a)).toEqual(["Tipo de arco: Trama → Personaje", "Estado por temporada: cambió T02"]);
  });

  it("una escena que pasa a la bandeja y cambia sus tramas", () => {
    const { m, s1, t, frases } = preparar();
    cambiar<PiezaDe<"evento">>(m, s1, (p) => {
      p.episodio = "";
      p.arcos[0].papel = "gira";
      p.relleno.avanza = true;
    });
    expect(frases(s1)).toEqual([
      `Episodio: T01E01 → En la bandeja de T01`,
      "Tramas que toca: cambió «El eco (gira)»",
      "Test de relleno: cambió hace avanzar",
    ]);
    void t;
  });
});

/** Etiquetas de un .svelte: las escritas, las calculadas con «? :», las de listas `{ k, texto }` y los <label> */
function etiquetasDe(archivo: string): string[] {
  const s = readFileSync(archivo, "utf-8");
  const r: string[] = [];
  for (const x of s.matchAll(/etiqueta="([^"]+)"/g)) r.push(x[1]);
  for (const x of s.matchAll(/etiqueta=\{[^}]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"\s*\}/g)) r.push(x[1], x[2]);
  for (const x of s.matchAll(/\{\s*k:\s*"[^"]+",\s*texto:\s*"([^"]+)"/g)) r.push(x[1]);
  for (const x of s.matchAll(/<label[^>]*>([^<{]+)</g)) r.push(x[1].trim());
  return r;
}

const etiquetasTabla = (tipo: TipoPieza) => (CAMPOS_VISTOS[tipo] ?? []).flatMap((c) => [c.etiqueta, ...(c.otras ?? []), ...(c.dentro ?? [])]);

/** Campos hechos a mano, sin `etiqueta` que se pueda leer del archivo */
const MANUALES: Partial<Record<TipoPieza, string[]>> = {
  temporada: ["Estado", "Story Circle", "Ficha en la wiki", "Por qué se descartó"],
  episodio: ["Estado", "Ficha en la wiki", "Por qué se descartó"],
  evento: ["Estado", "Tramas que toca", "Test de relleno", "Por qué se descartó"],
  secreto: ["Estado", "Se revela en", "Pistas sembradas", "Pistas falsas", "Ficha en la wiki", "Por qué se descartó"],
  arco: [
    "Estado",
    "Color",
    "Siembras y recogidas",
    "Estado por temporada",
    "Beats",
    "Pegamento",
    "Mentira que cree",
    "Qué pierde",
    "Ficha en la wiki",
    "Por qué se descartó",
  ],
};

describe("la tabla de campos vistos tiene las etiquetas del panel (spec 005, RF-8)", () => {
  const ARCHIVOS: [string, TipoPieza][] = [
    ["EditarSerie", "serie"],
    ["EditarPunto", "punto"],
    ["EditarTemporada", "temporada"],
    ["EditarEpisodio", "episodio"],
    ["EditarEvento", "evento"],
    ["EditarSecreto", "secreto"],
    ["EditarArco", "arco"],
    ["Siembras", "arco"],
    ["../tramas/Campos", "arco"],
    ["../tramas/Beats", "arco"],
  ];
  for (const [archivo, tipo] of ARCHIVOS) {
    it(`${archivo}: cada etiqueta está en la tabla de ${tipo}`, () => {
      const etiquetas = etiquetasDe(`src/vistas/panel/${archivo}.svelte`);
      if (!archivo.includes("Siembras")) expect(etiquetas.length).toBeGreaterThan(1);
      const tabla = etiquetasTabla(tipo);
      expect(etiquetas.filter((e) => !tabla.includes(e))).toEqual([]);
    });
  }

  it("los campos hechos a mano están en la tabla", () => {
    for (const [tipo, etiquetas] of Object.entries(MANUALES) as [TipoPieza, string[]][]) {
      const tabla = etiquetasTabla(tipo);
      expect(etiquetas.filter((e) => !tabla.includes(e))).toEqual([]);
    }
  });
});
