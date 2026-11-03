import { describe, expect, it } from "vitest";
import { fechasDe, ponerFecha } from "../src/lib/modelo/conocen-desde";
import { crearPieza, escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import type { Secreto } from "../src/lib/modelo/tipos";
import { editadoPorV1, guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";

// «Lo sabe desde» y la v1.0 (spec 010, T2, constitución 9): la v1.0 no lo
// entiende, pero lo conserva y sigue viendo «Lo conocen» igual.

function conFecha(s: Secreto, personaje: string, episodio: string): Secreto {
  const v = ponerFecha(s, personaje, episodio);
  const extra = { ...s.extra };
  if (v === undefined) delete extra.conocen_desde;
  else extra.conocen_desde = v;
  return { ...s, extra };
}

const base = () => crearPieza("secreto", { id: "sc-1", titulo: "El acuerdo", verdad: "Lo firmó Telmo", conocen: ["[[Telmo]]", "[[Ana]]", "[[Lia]]"] });

function conFechas(): Secreto {
  let s = base();
  s = conFecha(s, "[[Telmo]]", "ep-1");
  s = conFecha(s, "[[Ana]]", "ep-2");
  return s;
}

describe("Lo sabe desde y la v1.0 (spec 010, T2)", () => {
  it("la v1.0 ve Lo conocen igual", () => {
    const leido = leidoPorV1(escribirPieza(conFechas()), "secreto");
    expect(leido.conocen).toEqual(["[[Telmo]]", "[[Ana]]", "[[Lia]]"]);
    // Y guardar sin cambiar nada no pierde las fechas
    const vuelta = leerPieza(guardadoPorV1(escribirPieza(conFechas()), "secreto"), "secreto") as Secreto;
    expect(fechasDe(vuelta)).toEqual(fechasDe(conFechas()));
  });

  it("tras editar en la v1.0 las fechas siguen por nombre", () => {
    // La v1.0 reordena Lo conocen y quita a Lia
    const texto = editadoPorV1(escribirPieza(conFechas()), "secreto", (p) => {
      p.conocen = ["[[Ana]]", "[[Telmo]]"];
    });
    const s = leerPieza(texto, "secreto") as Secreto;
    expect(s.conocen).toEqual(["[[Ana]]", "[[Telmo]]"]);
    expect(fechasDe(s).get("telmo")).toEqual({ episodio: "ep-1" });
    expect(fechasDe(s).get("ana")).toEqual({ episodio: "ep-2" });

    // La v1.0 quita a Telmo: su fecha queda huérfana y vuelve si vuelve Telmo
    const sinTelmo = leerPieza(
      editadoPorV1(texto, "secreto", (p) => {
        p.conocen = ["[[Ana]]"];
      }),
      "secreto",
    ) as Secreto;
    expect(fechasDe(sinTelmo).has("telmo")).toBe(false);
    expect(fechasDe({ ...sinTelmo, conocen: ["[[Ana]]", "[[Telmo]]"] }).get("telmo")).toEqual({ episodio: "ep-1" });
  });

  it("sin fechas, la nota es idéntica a la de antes", () => {
    const antes = escribirPieza(base());
    let s = conFechas();
    s = conFecha(s, "[[Telmo]]", "");
    s = conFecha(s, "[[Ana]]", "");
    expect(escribirPieza(s)).toBe(antes);
    expect(guardadoPorV1(escribirPieza(s), "secreto")).toBe(guardadoPorV1(antes, "secreto"));
  });
});
