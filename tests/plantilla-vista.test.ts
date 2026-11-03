import { describe, expect, it } from "vitest";
import {
  clavePlantillaVista,
  escribirPlantillasVista,
  leerPlantillasVista,
  limpiarPlantillasVista,
} from "../src/lib/app/plantilla-vista";

// La plantilla a la vista, recordada en el equipo (spec 011, RF-42, T13a)

describe("Plantilla a la vista (spec 011, T13a)", () => {
  it("JSON roto o valores extraños dan vacío", () => {
    for (const t of [null, "", "{", "[1,2]", "null", "5", '"tres_actos"', "[]"]) expect(leerPlantillasVista(t).size).toBe(0);
    expect([...leerPlantillasVista('{"te-1": 3, "te-2": null, "te-3": {"a": 1}, "": "tres_actos"}')]).toEqual([]);
    // Y __proto__ no ensucia nada
    const m = leerPlantillasVista('{"__proto__": "save_the_cat", "te-1": "story_circle"}');
    expect(m.get("te-1")).toBe("story_circle");
    expect(({} as Record<string, unknown>).save_the_cat).toBeUndefined();
  });

  it("solo plantillas de la lista", () => {
    const m = leerPlantillasVista('{"te-1": "tres_actos", "te-2": "ninguna", "te-3": "Save the Cat", "te-4": "viaje_heroe"}');
    expect([...m]).toEqual([
      ["te-1", "tres_actos"],
      ["te-4", "viaje_heroe"],
    ]);
    // Ida y vuelta, y sin nada se borra la clave
    expect(leerPlantillasVista(escribirPlantillasVista(m))).toEqual(m);
    expect(escribirPlantillasVista(new Map())).toBeNull();
  });

  it("limpiar olvida las que no existen en serie ni variante", () => {
    const m = leerPlantillasVista('{"te-1": "tres_actos", "te-2": "story_circle", "te-3": "save_the_cat"}');
    const enSerie = new Set(["te-1"]);
    const enVariante = new Set(["te-3"]);
    expect([...limpiarPlantillasVista(m, (t) => enSerie.has(t) || enVariante.has(t)).keys()]).toEqual(["te-1", "te-3"]);
    expect(m.size).toBe(3);
  });

  it("una clave por serie", () => {
    expect(clavePlantillaVista("Cabo Sal")).toBe("atelier.plantillaVista:Cabo Sal");
    expect(clavePlantillaVista("Otra")).not.toBe(clavePlantillaVista("Cabo Sal"));
  });
});
