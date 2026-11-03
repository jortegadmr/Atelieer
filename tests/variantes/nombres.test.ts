import { describe, expect, it } from "vitest";
import { LARGO_NOMBRE, LARGO_PORQUE, limpiarNombre, limpiarPorque, nombrePorDefecto, nombreUnico, nuevoIdVariante } from "../../src/lib/variantes/nombres";

describe("nombres de las variantes (spec 006, RF-2, RF-2b, RF-41)", () => {
  const fecha = new Date(2026, 9, 21, 18, 5);

  it("el nombre por defecto lleva el día, el mes abreviado y la hora", () => {
    expect(nombrePorDefecto(fecha, [])).toBe("¿Y si…? 21 oct, 18:05");
  });

  it("si en el mismo minuto ya hay una con ese nombre, añade « (2)», « (3)»…", () => {
    expect(nombrePorDefecto(fecha, ["¿Y si…? 21 oct, 18:05"])).toBe("¿Y si…? 21 oct, 18:05 (2)");
    expect(nombrePorDefecto(fecha, ["¿Y si…? 21 oct, 18:05", "¿Y si…? 21 oct, 18:05 (2)"])).toBe("¿Y si…? 21 oct, 18:05 (3)");
  });

  it("«Otra versión de…» repetida también lleva « (2)» (RF-3)", () => {
    expect(nombreUnico("Otra versión de «E05»", ["Otra versión de «E05»"])).toBe("Otra versión de «E05» (2)");
    expect(nombreUnico("Otra versión de «E05»", [])).toBe("Otra versión de «E05»");
  });

  it("saltos de línea, tabuladores y caracteres de control pasan a espacios", () => {
    expect(limpiarNombre("Nando\ncalla\ten\u0007E05").nombre).toBe("Nando calla en E05");
    expect(limpiarPorque("pierde\r\ngancho").texto).toBe("pierde  gancho");
  });

  it("los caracteres que dan la vuelta al texto (bidi) también pasan a espacios", () => {
    expect(limpiarNombre("a\u202Eb\u2066c").nombre).toBe("a b c");
  });

  it("el nombre se recorta a 120 caracteres y lo dice", () => {
    const largo = "x".repeat(LARGO_NOMBRE + 30);
    const r = limpiarNombre(largo);
    expect(LARGO_NOMBRE).toBe(120);
    expect(r.nombre).toHaveLength(120);
    expect(r.recortado).toBe(true);
    expect(limpiarNombre("corto").recortado).toBe(false);
  });

  it("el porqué se recorta a 500 caracteres y lo dice", () => {
    const r = limpiarPorque("y".repeat(LARGO_PORQUE + 1));
    expect(LARGO_PORQUE).toBe(500);
    expect(r.texto).toHaveLength(500);
    expect(r.recortado).toBe(true);
  });

  it("un nombre que queda vacío da vacío (la barra vuelve al de antes)", () => {
    expect(limpiarNombre(" \n\t ").nombre).toBe("");
  });

  it("nuevoIdVariante da va- y cuatro letras o cifras, sin repetir los usados", () => {
    const usados = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const id = nuevoIdVariante(usados);
      expect(id).toMatch(/^va-[a-z0-9]{4,}$/);
      expect(usados.has(id)).toBe(false);
      usados.add(id);
    }
  });
});
