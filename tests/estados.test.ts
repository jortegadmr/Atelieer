import { describe, expect, it } from "vitest";
import { c01, c08, comprobar } from "../src/lib/comprobaciones";
import { tramaDominante } from "../src/lib/modelo/dominante";
import { conEstado, cuenta, estadoDe, tieneFicha, valorEnWiki } from "../src/lib/modelo/estados";
import { crearPieza } from "../src/lib/modelo/ficheros";
import type { Arco } from "../src/lib/modelo/tipos";
import { Constructor } from "./fixtures/constructor";
import { resumen } from "./comprobaciones/ayuda";

// Spec 001: el estado que ve el autor y cuáles cuentan en las comprobaciones.

const arco = (datos: Partial<Arco> = {}) => crearPieza("arco", { id: "arco-1", ...datos });

describe("estado de una pieza (RF-11, RF-12)", () => {
  it("idea con el estado nuevo aparte es ese estado nuevo", () => {
    expect(estadoDe(arco({ madurez: "idea", madurez_mesa: "propuesta" }))).toBe("propuesta");
    expect(estadoDe(arco({ madurez: "idea", madurez_mesa: "aparcado" }))).toBe("aparcado");
  });

  it("sin estado nuevo, el de siempre", () => {
    expect(estadoDe(arco({ madurez: "idea" }))).toBe("idea");
    expect(estadoDe(arco({ madurez: "canon" }))).toBe("canon");
  });

  it("si la v1.0 lo cambió a borrador, canon o descartado, manda el suyo", () => {
    expect(estadoDe(arco({ madurez: "descartado", madurez_mesa: "aparcado" }))).toBe("descartado");
    expect(estadoDe(arco({ madurez: "borrador", madurez_mesa: "propuesta" }))).toBe("borrador");
  });
});

describe("cambiar el estado (RF-10)", () => {
  it("propuesta y aparcado se guardan como idea más el estado aparte", () => {
    const a = conEstado(arco(), "aparcado");
    expect(a.madurez).toBe("idea");
    expect(a.madurez_mesa).toBe("aparcado");
  });

  it("cualquier otro estado quita el guardado aparte", () => {
    const a = conEstado(arco({ madurez_mesa: "propuesta" }), "borrador");
    expect(a.madurez).toBe("borrador");
    expect(a.madurez_mesa).toBe("");
    expect(conEstado(arco({ madurez_mesa: "aparcado" }), "idea").madurez_mesa).toBe("");
  });

  it("olvida el valor original no entendido", () => {
    const a = arco();
    a.crudos = { madurez: "en pausa" };
    expect(conEstado(a, "canon").crudos).toBeUndefined();
  });

  it("al descartar guarda el motivo si lo hay, sin exigirlo (RF-24)", () => {
    expect(conEstado(arco(), "descartado", "Repite T1").motivo_descarte).toBe("Repite T1");
    expect(conEstado(arco({ motivo_descarte: "Antiguo" }), "descartado").motivo_descarte).toBe("Antiguo");
  });

  it("no cambia la pieza original", () => {
    const a = arco();
    conEstado(a, "canon");
    expect(a.madurez).toBe("idea");
  });
});

describe("qué cuenta en las comprobaciones (RF-15 a RF-17)", () => {
  it("aparcado no cuenta", () => {
    expect(cuenta(arco({ madurez_mesa: "aparcado" }))).toBe(false);
  });

  it("propuesta cuenta como idea", () => {
    expect(cuenta(arco({ madurez_mesa: "propuesta" }))).toBe(true);
    expect(cuenta(arco())).toBe(true);
  });

  it("descartado no cuenta", () => {
    expect(cuenta(arco({ madurez: "descartado" }))).toBe(false);
  });

  it("un evento aparcado no dispara avisos; uno en propuesta, sí", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    b.evento({ episodio: t.eps[0], relleno: { avanza: false, revela: false }, madurez_mesa: "aparcado" });
    const e = b.evento({ episodio: t.eps[0], relleno: { avanza: false, revela: false }, madurez_mesa: "propuesta" });
    expect(resumen(c08(b.modelo()))).toEqual([["C08", e, "aviso"]]);
  });

  it("un episodio o una temporada aparcados o descartados no dan avisos (RF-15, RF-17)", () => {
    const b = new Constructor();
    const t = b.temporada({ carga: ["+", "+"], madurez_mesa: "aparcado" });
    b.episodio(t.id, { carga: ["+", "+"], madurez: "descartado" });
    b.episodio(t.id, { carga: ["-", "-"], madurez_mesa: "aparcado" });
    const m = b.modelo();
    const suyos = comprobar(m).avisos.filter((a) => a.pieza !== m.serie.id);
    expect(suyos).toEqual([]);
  });

  it("un episodio aparcado no rompe la cadena de carga de sus vecinos", () => {
    const b = new Constructor();
    const t = b.temporada();
    b.episodio(t.id, { carga: ["-", "+"] });
    b.episodio(t.id, { carga: ["-", "-"], madurez_mesa: "aparcado" });
    b.episodio(t.id, { carga: ["+", "-"] });
    expect(resumen(c01(b.modelo()))).toEqual([]);
  });

  it("un episodio en propuesta sí da avisos", () => {
    const b = new Constructor();
    const t = b.temporada();
    const e = b.episodio(t.id, { carga: ["+", "+"], madurez_mesa: "propuesta" });
    expect(resumen(c01(b.modelo()))).toEqual([["C01a", e, "aviso"]]);
  });

  it("los eventos aparcados no cuentan para la trama dominante", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const a = b.arco({ tipo_trama: "A" });
    const bb = b.arco({ tipo_trama: "B" });
    b.evento({ episodio: t.eps[0], arcos: [[a, "abre"]] });
    b.evento({ episodio: t.eps[0], arcos: [[bb, "abre"]], madurez_mesa: "aparcado" });
    b.evento({ episodio: t.eps[0], arcos: [[bb, "avanza"]], madurez_mesa: "aparcado" });
    expect(tramaDominante(b.modelo(), t.eps[0])).toBe(a);
  });
});

describe("ficha en la wiki", () => {
  it("tienen ficha temporadas, episodios, arcos y secretos; los eventos no (RF-22)", () => {
    expect(["temporada", "episodio", "arco", "secreto"].every((t) => tieneFicha(t))).toBe(true);
    expect(tieneFicha("evento")).toBe(false);
    expect(tieneFicha("serie")).toBe(false);
  });

  it("propuesta y aparcado se escriben en la ficha como idea (RF-25)", () => {
    expect(valorEnWiki("propuesta")).toBe("idea");
    expect(valorEnWiki("aparcado")).toBe("idea");
    expect(valorEnWiki("canon")).toBe("canon");
  });
});
