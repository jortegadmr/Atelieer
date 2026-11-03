import { describe, expect, it } from "vitest";
import { versionesDe } from "../../src/lib/variantes/versiones";
import { variante, type CabeceraVariante, type EstadoVariante } from "../../src/lib/variantes/tipos";

function cabecera(id: string, opciones: { origen?: string; piezas?: string[]; estado?: EstadoVariante; cambiada?: string }): CabeceraVariante {
  const v = variante(id, id, opciones.cambiada ?? "2026-10-21 10:00", opciones.origen ?? "");
  return { ...v, estado: opciones.estado ?? "aparcada", piezas: opciones.piezas ?? [] };
}

describe("versiones de una pieza (spec 006, RF-4)", () => {
  it("son las aparcadas creadas desde la pieza o que la cambian, la más reciente primero, por las propiedades", () => {
    const lista = [
      cabecera("va-aaaa", { origen: "ep-1", cambiada: "2026-10-21 10:00" }),
      cabecera("va-bbbb", { piezas: ["ev-9", "ep-1"], cambiada: "2026-10-21 12:00" }),
      cabecera("va-cccc", { piezas: ["ev-9"] }),
      cabecera("va-dddd", { origen: "ep-1", estado: "descartada" }),
      cabecera("va-eeee", { piezas: ["ep-1"], estado: "aplicada" }),
    ];
    expect(versionesDe(lista, "ep-1").map((c) => c.id)).toEqual(["va-bbbb", "va-aaaa"]);
    expect(versionesDe(lista, "ep-2")).toEqual([]);
  });

  it("una variante creada desde la pieza es su versión aunque todavía no la cambie", () => {
    expect(versionesDe([cabecera("va-aaaa", { origen: "ep-1", piezas: ["ev-3"] })], "ep-1")).toHaveLength(1);
  });
});
