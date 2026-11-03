import { describe, expect, it } from "vitest";
import { alCambiarConocen, escritaDeOtraForma, fechaVista, fechasDe, ponerFecha } from "../src/lib/modelo/conocen-desde";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import type { Secreto } from "../src/lib/modelo/tipos";
import { claveLimpia } from "../src/lib/wiki/md";
import { Constructor } from "./fixtures/constructor";

function secreto(conocen: string[], desde?: unknown): Secreto {
  return crearPieza("secreto", { id: "sc-1", titulo: "El acuerdo", conocen, extra: desde === undefined ? {} : { conocen_desde: desde } });
}

/** El secreto con el valor nuevo puesto (o la propiedad borrada) */
function con(s: Secreto, v: unknown): Secreto {
  const extra = { ...s.extra };
  if (v === undefined) delete extra.conocen_desde;
  else extra.conocen_desde = v;
  return { ...s, extra };
}

describe("Lo sabe desde (spec 010, T1)", () => {
  it("poner y quitar una fecha deja las demás entradas igual (por valor)", () => {
    const ana = { personaje: "[[Ana]]", episodio: "ep-2", nota: "a mano" };
    const rara = { personaje: "[[Telmo]]", episodio: 7 };
    const s = secreto(["[[Telmo]]", "[[Ana]]", "[[Lia]]"], [rara, ana, "suelta"]);
    const v = ponerFecha(s, "[[Lia]]", "ep-3") as unknown[];
    expect(v).toEqual([rara, ana, "suelta", { personaje: "[[Lia]]", episodio: "ep-3" }]);
    const sin = ponerFecha(con(s, v), "[[Lia]]", "");
    expect(sin).toEqual([rara, ana, "suelta"]);
    // Cambiar la de Ana no toca la rara de Telmo
    expect(ponerFecha(s, "Ana", "ep-5")).toEqual([rara, "suelta", { personaje: "Ana", episodio: "ep-5" }]);
  });

  it("sin fechas se borra la propiedad", () => {
    const s = secreto(["[[Telmo]]"], [{ personaje: "[[Telmo]]", episodio: "ep-1" }]);
    expect(ponerFecha(s, "[[Telmo]]", "")).toBeUndefined();
    // Sin propiedad y Sin fecha: sigue sin propiedad
    expect(ponerFecha(secreto(["[[Telmo]]"]), "[[Telmo]]", "")).toBeUndefined();
    const conUna = ponerFecha(secreto(["[[Telmo]]"]), "[[Telmo]]", "ep-1");
    expect(conUna).toEqual([{ personaje: "[[Telmo]]", episodio: "ep-1" }]);
  });

  it("un número, una lista o un id roto cuentan como Sin fecha y se conservan", () => {
    const c = new Constructor();
    const t = c.temporada({}, 2);
    const s = secreto(
      ["[[Telmo]]", "[[Ana]]", "[[Lia]]", "[[Bo]]"],
      [
        { personaje: "[[Telmo]]", episodio: 3 },
        { personaje: "[[Ana]]", episodio: ["ep-1"] },
        { personaje: "[[Lia]]", episodio: "ep-no-existe" },
        { personaje: "[[Bo]]", episodio: t.eps[1] },
      ],
    );
    const m = c.modelo();
    expect(fechaVista(m, s, "[[Telmo]]")).toEqual({ rota: true });
    expect(fechaVista(m, s, "Ana")).toEqual({ rota: true });
    expect(fechaVista(m, s, "[[Lia]]")).toEqual({ rota: true });
    expect(fechaVista(m, s, "[[Bo]]")).toEqual({ episodio: t.eps[1] });
    expect(fechaVista(m, s, "[[Nadie]]")).toBe("sin");
    // Poner la de Bo conserva las raras
    const v = ponerFecha(s, "[[Bo]]", t.eps[0]) as unknown[];
    expect(v.slice(0, 3)).toEqual((s.extra.conocen_desde as unknown[]).slice(0, 3));
  });

  it("`conocen_desde` que no es lista no se toca nunca", () => {
    for (const raro of ["ep-1", 3, { Telmo: "ep-1" }, null]) {
      const s = secreto(["[[Telmo]]"], raro);
      expect(escritaDeOtraForma(s)).toBe(true);
      expect(fechasDe(s).size).toBe(0);
      expect(ponerFecha(s, "[[Telmo]]", "ep-1")).toBe(raro);
      expect(alCambiarConocen(s, ["[[Telmo]]"], [])).toBe(raro);
    }
    expect(escritaDeOtraForma(secreto(["[[Telmo]]"]))).toBe(false);
    expect(escritaDeOtraForma(secreto(["[[Telmo]]"], []))).toBe(false);
  });

  it("quitar a un personaje quita su fecha; renombrar la pierde", () => {
    const desde = [
      { personaje: "[[Telmo]]", episodio: "ep-1" },
      { personaje: "[[Ana]]", episodio: "ep-2" },
    ];
    const s = secreto(["[[Telmo]]", "[[Ana]]"], desde);
    expect(alCambiarConocen(s, s.conocen, ["[[Ana]]"])).toEqual([desde[1]]);
    expect(alCambiarConocen(s, s.conocen, ["[[Telmen]]", "[[Ana]]"])).toEqual([desde[1]]);
    expect(alCambiarConocen(s, s.conocen, [])).toBeUndefined();
    // Reordenar o cambiar la forma de escribirlo no la pierde
    expect(alCambiarConocen(s, s.conocen, ["Ana", "telmo"])).toBe(desde);
  });

  it("huérfana de la v1.0 se conserva y vuelve con el personaje", () => {
    // La v1.0 quitó a Telmo de Lo conocen pero conservó la propiedad entera
    const huerfana = { personaje: "[[Telmo]]", episodio: "ep-1" };
    const s = secreto(["[[Ana]]"], [huerfana]);
    expect(fechasDe(s).size).toBe(0);
    expect(alCambiarConocen(s, ["[[Ana]]"], [])).toEqual([huerfana]);
    const v = ponerFecha(s, "[[Ana]]", "ep-2");
    expect(v).toEqual([huerfana, { personaje: "[[Ana]]", episodio: "ep-2" }]);
    const vuelve = { ...con(s, v), conocen: ["[[Ana]]", "[[Telmo]]"] };
    expect(fechasDe(vuelve).get("telmo")).toEqual({ episodio: "ep-1" });
  });

  it("`__proto__` y `constructor` funcionan como cualquier nombre", () => {
    const s = secreto(["__proto__", "constructor"]);
    const v = ponerFecha(s, "__proto__", "ep-1");
    const s2 = con(s, v);
    const v2 = ponerFecha(s2, "constructor", "ep-2");
    const f = fechasDe(con(s2, v2));
    expect(f.get(claveLimpia("__proto__"))).toEqual({ episodio: "ep-1" });
    expect(f.get("constructor")).toEqual({ episodio: "ep-2" });
    expect(f.get("toString")).toBeUndefined();
  });

  it("personaje repetido: la primera entrada", () => {
    const s = secreto(
      ["[[Telmo]]"],
      [
        { personaje: "Telmo", episodio: "ep-1" },
        { personaje: "[[telmo]]", episodio: "ep-2" },
      ],
    );
    expect(fechasDe(s).get("telmo")).toEqual({ episodio: "ep-1" });
    // Poner la fecha quita las dos y deja una
    expect(ponerFecha(s, "[[Telmo]]", "ep-3")).toEqual([{ personaje: "[[Telmo]]", episodio: "ep-3" }]);
  });

  it("la propiedad viaja en la nota y vuelve igual", () => {
    const s = secreto(["[[Telmo]]"], [{ personaje: "[[Telmo]]", episodio: "ep-1" }]);
    const leido = leerPieza(escribirPieza(s), "secreto", "sc-1") as Secreto;
    expect(fechasDe(leido).get("telmo")).toEqual({ episodio: "ep-1" });
  });
});
