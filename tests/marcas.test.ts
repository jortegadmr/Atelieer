import { describe, expect, it } from "vitest";
import { comprobar } from "../src/lib/comprobaciones";
import { GUIA_INICIAL } from "../src/lib/guia/guia-inicial";
import { leerGuia } from "../src/lib/guia/guia-md";
import { estadoRegla, marca, piezasGuia, reglasDe } from "../src/lib/guia/marcas";
import { Constructor } from "./fixtures/constructor";

const guia = leerGuia(GUIA_INICIAL);

describe("pestaña Guía: reglas de cada pieza y su marca (T6.4)", () => {
  it("un B de trama ve las reglas de arco de trama y las de subtrama; uno de personaje, las suyas", () => {
    const b = new Constructor();
    const sub = b.arco({ tipo_trama: "B", tipo_arco: "trama" });
    const per = b.arco({ tipo_arco: "personaje" });
    const m = b.modelo();
    expect(piezasGuia(m.arcos.get(sub)!)).toEqual(["subtrama", "arco de trama"]);
    expect(piezasGuia(m.arcos.get(per)!)).toEqual(["arco de personaje"]);
    expect(reglasDe(guia, m.arcos.get(sub)!).some((r) => r.pieza === "subtrama")).toBe(true);
  });

  it("se cumple (ok), no se cumple (no) o no se puede comprobar (null)", () => {
    const b = new Constructor();
    const t = b.temporada({}, 2);
    const bien = b.evento({ episodio: t.eps[0], relleno: { avanza: true, revela: false }, gana: "Algo" });
    const mal = b.evento({ episodio: t.eps[0] });
    const m = b.modelo();
    const r = comprobar(m);
    const relleno = guia.reglas.find((x) => x.comprobacion === "C08")!;
    const sinComprobacion = guia.reglas.find((x) => x.pieza === "evento" && !x.comprobacion)!;
    expect(marca(relleno, m.eventos.get(bien)!, r, m)).toBe("ok");
    expect(marca(relleno, m.eventos.get(mal)!, r, m)).toBe("no");
    expect(marca(sinComprobacion, m.eventos.get(bien)!, r, m)).toBeNull();
  });

  it("sin los datos que la comprobación necesita, no hay marca", () => {
    const b = new Constructor();
    const s = b.secreto({});
    const m = b.modelo();
    const pistas = guia.reglas.find((x) => x.comprobacion === "C14")!;
    expect(marca(pistas, m.secretos.get(s)!, comprobar(m), m)).toBeNull();
  });

  it("un aviso silenciado con «lo sé» no marca la regla como incumplida", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const e = b.evento({ episodio: t.eps[0], avisos_silenciados: ["C08"] });
    const m = b.modelo();
    const relleno = guia.reglas.find((x) => x.comprobacion === "C08")!;
    expect(marca(relleno, m.eventos.get(e)!, comprobar(m), m)).toBeNull();
  });
});

describe("estado de una regla en una pieza (spec 004)", () => {
  const regla = (id: string) => guia.reglas.find((x) => x.id === id)!;

  it("no se cumple, con sus avisos y las reglas que comparten comprobación", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_trama: "A", tipo_arco: "trama" });
    const m = b.modelo();
    const r = comprobar(m);
    const e = estadoRegla(guia, regla("G07"), m.arcos.get(a)!, r, m);
    expect(e.marca).toBe("no");
    expect(e.avisos).toEqual(r.avisos.filter((x) => x.pieza === a && x.id === "C03"));
    expect(e.comparten).toEqual(["G08", "G10"]);
  });

  it("sugerencia, lo sé y se cumple", () => {
    const b = new Constructor();
    const sinBomba = b.arco({ tipo_trama: "B", tipo_arco: "trama" });
    const callado = b.arco({ tipo_trama: "B", tipo_arco: "trama", avisos_silenciados: ["C04"] });
    const conBomba = b.arco({ tipo_trama: "B", tipo_arco: "trama", bomba: "La boda" });
    const m = b.modelo();
    const r = comprobar(m);
    const g20 = (id: string) => estadoRegla(guia, regla("G20"), m.arcos.get(id)!, r, m);
    expect(g20(sinBomba).marca).toBe("sugerencia");
    expect(g20(callado).marca).toBe("lose");
    expect(g20(callado).avisos.map((x) => x.id)).toEqual(["C04"]);
    expect(g20(conBomba)).toEqual({ marca: "ok", avisos: [], comparten: [] });
  });

  it("la juzgas tú: sin comprobación o sin los datos que necesita", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_trama: "A", tipo_arco: "trama" });
    const s = b.secreto({});
    const m = b.modelo();
    const r = comprobar(m);
    expect(estadoRegla(guia, regla("G09"), m.arcos.get(a)!, r, m).marca).toBe("juzgas");
    expect(estadoRegla(guia, regla("G46"), m.secretos.get(s)!, r, m).marca).toBe("juzgas");
  });

  it("lo aparcado y lo descartado no se comprueban; la serie, sin estado, sí", () => {
    const b = new Constructor();
    const aparcado = b.arco({ tipo_trama: "A", tipo_arco: "trama", madurez: "idea", madurez_mesa: "aparcado" });
    const descartado = b.arco({ tipo_trama: "A", tipo_arco: "trama", madurez: "descartado" });
    const m = b.modelo();
    const r = comprobar(m);
    expect(estadoRegla(guia, regla("G07"), m.arcos.get(aparcado)!, r, m).marca).toBe("aparcada");
    expect(estadoRegla(guia, regla("G07"), m.arcos.get(descartado)!, r, m).marca).toBe("descartada");
    expect(estadoRegla(guia, regla("G02"), m.serie, r, m).marca).toBe("sugerencia");
  });

  it("la marca corta de la v1 cuenta una sugerencia como no se cumple", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_trama: "B", tipo_arco: "trama" });
    const m = b.modelo();
    expect(marca(regla("G20"), m.arcos.get(a)!, comprobar(m), m)).toBe("no");
  });
});
