import { describe, expect, it } from "vitest";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import type { Arco, Episodio, Secreto, Temporada } from "../src/lib/modelo/tipos";
import { ESTADO } from "../src/lib/modelo/vocabulario";
import { editadoPorV1, guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";

// Spec 001: estados nuevos (propuesta, aparcado) en un campo aparte que la
// v1.0 no entiende pero conserva; episodios con estado; motivo de descarte.

const nota = (props: string, texto = "") => `---\n${props}\n---\n${texto}`;

describe("los seis estados (RF-9)", () => {
  it("son idea, propuesta, aparcado, borrador, canon y descartado", () => {
    expect([...ESTADO]).toEqual(["idea", "propuesta", "aparcado", "borrador", "canon", "descartado"]);
  });
});

describe("propuesta y aparcado, en un campo aparte (RF-10, RF-11)", () => {
  it("una pieza en propuesta se guarda como idea más el estado nuevo aparte", () => {
    const a = crearPieza("arco", { id: "arco-1", titulo: "Amistad rota", madurez_mesa: "propuesta" });
    const texto = escribirPieza(a);
    expect(texto).toContain("madurez: idea");
    expect(texto).toContain("madurez_mesa: propuesta");
  });

  it("la v1.0 la ve como idea y, al guardarla, la v2 la sigue viendo en propuesta", () => {
    const a = crearPieza("arco", { id: "arco-1", madurez_mesa: "propuesta" });
    const texto = escribirPieza(a);
    expect(leidoPorV1(texto, "arco").madurez).toBe("idea");
    const vuelta = leerPieza(guardadoPorV1(texto, "arco"), "arco") as Arco;
    expect(vuelta.madurez).toBe("idea");
    expect(vuelta.madurez_mesa).toBe("propuesta");
  });

  it("vale en temporadas, episodios, arcos, eventos y secretos", () => {
    for (const tipo of ["temporada", "episodio", "arco", "evento", "secreto"] as const) {
      const p = crearPieza(tipo, { id: `${tipo}-1`, madurez_mesa: "aparcado" } as never);
      const vuelta = leerPieza(guardadoPorV1(escribirPieza(p), tipo), tipo) as { madurez_mesa: string };
      expect(vuelta.madurez_mesa, tipo).toBe("aparcado");
    }
  });

  it("si la v1.0 la pasa a descartado, la v2 lee descartado y el guardado aparte sigue en la nota (RF-12)", () => {
    const a = crearPieza("arco", { id: "arco-1", madurez_mesa: "aparcado" });
    const texto = editadoPorV1(escribirPieza(a), "arco", (p) => (p.madurez = "descartado"));
    const vuelta = leerPieza(texto, "arco") as Arco;
    expect(vuelta.madurez).toBe("descartado");
  });

  it("tras eso, la v2 olvida el aparcado antiguo: si la v1.0 la vuelve a idea, no reaparece", () => {
    const a = crearPieza("arco", { id: "arco-1", madurez_mesa: "aparcado" });
    const v1 = editadoPorV1(escribirPieza(a), "arco", (p) => (p.madurez = "borrador"));
    const v2 = escribirPieza(leerPieza(v1, "arco"));
    expect(v2).not.toContain("madurez_mesa");
    const otraVez = editadoPorV1(v2, "arco", (p) => (p.madurez = "idea"));
    expect((leerPieza(otraVez, "arco") as Arco).madurez_mesa).toBe("");
  });
});

describe("episodios con estado (RF-13, RF-14)", () => {
  it("un episodio en borrador sobrevive a un guardado de la v1.0 y no toca su estado de escritura", () => {
    const e = crearPieza("episodio", { id: "ep-1", madurez: "borrador", estado: "escaleta" });
    const vuelta = leerPieza(guardadoPorV1(escribirPieza(e), "episodio"), "episodio") as Episodio;
    expect(vuelta.madurez).toBe("borrador");
    expect(vuelta.estado).toBe("escaleta");
  });

  it("un episodio sin estado se lee como idea", () => {
    const e = leerPieza(nota("id: ep-1\ntipo: episodio\nestado: guion"), "episodio") as Episodio;
    expect(e.madurez).toBe("idea");
    expect(e.madurez_mesa).toBe("");
    expect(e.estado).toBe("guion");
  });
});

describe("los campos nuevos no ensucian las notas", () => {
  it("vacíos no se escriben", () => {
    const t = escribirPieza(crearPieza("temporada", { id: "temp-1" }));
    expect(t).not.toContain("madurez_mesa");
    expect(t).not.toContain("motivo_descarte");
    const e = escribirPieza(crearPieza("episodio", { id: "ep-1" }));
    expect(e).not.toContain("madurez");
  });

  it("una nota de la v1 que la v2 abre y guarda sin cambios no gana líneas", () => {
    const v1 = nota("id: temp-1\ntipo: temporada\ntitulo: Uno\nmadurez: borrador");
    const p = leerPieza(v1, "temporada");
    expect(escribirPieza(p)).not.toMatch(/madurez_mesa|motivo_descarte/);
  });
});

describe("lectura tolerante del estado", () => {
  it("entiende propuesta o aparcado escritos a mano en el estado de siempre, con mayúsculas", () => {
    const a = leerPieza(nota("id: arco-1\ntipo: arco\nmadurez: Propuesta"), "arco") as Arco;
    expect(a.madurez).toBe("idea");
    expect(a.madurez_mesa).toBe("propuesta");
    const s = leerPieza(nota("id: sec-1\ntipo: secreto\nmadurez: APARCADO"), "secreto") as Secreto;
    expect(s.madurez).toBe("idea");
    expect(s.madurez_mesa).toBe("aparcado");
  });

  it("un valor desconocido se ve como idea y se conserva tal cual al guardar", () => {
    const t = leerPieza(nota("id: temp-1\ntipo: temporada\nmadurez: en pausa"), "temporada") as Temporada;
    expect(t.madurez).toBe("idea");
    expect(escribirPieza(t)).toContain("madurez: en pausa");
  });

  it("si el autor cambia ese estado, se escribe el nuevo", () => {
    const t = leerPieza(nota("id: temp-1\ntipo: temporada\nmadurez: en pausa"), "temporada") as Temporada;
    t.madurez = "borrador";
    delete t.crudos;
    const texto = escribirPieza(t);
    expect(texto).toContain("madurez: borrador");
    expect(texto).not.toContain("en pausa");
  });
});

describe("por qué se descartó, en todos los tipos (RF-24)", () => {
  it("temporada, episodio y secreto guardan el motivo", () => {
    for (const tipo of ["temporada", "episodio", "secreto"] as const) {
      const p = crearPieza(tipo, { id: `${tipo}-1`, madurez: "descartado", motivo_descarte: "Repite el giro de T1" } as never);
      const vuelta = leerPieza(guardadoPorV1(escribirPieza(p), tipo), tipo) as { motivo_descarte: string };
      expect(vuelta.motivo_descarte, tipo).toBe("Repite el giro de T1");
    }
  });
});
