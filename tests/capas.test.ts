import { describe, expect, it } from "vitest";
import { Capas } from "../src/lib/app/capas";

// Spec 002, RF-15 y RF-16: Esc cierra primero lo que esté abierto, de una en una.

describe("capas abiertas (Esc)", () => {
  it("cierra la última que se abrió, y después la anterior", () => {
    const capas = new Capas();
    const cerradas: string[] = [];
    capas.abrir(() => cerradas.push("confirmación"));
    capas.abrir(() => cerradas.push("búsqueda"));
    expect(capas.cerrarUltima()).toBe(true);
    expect(capas.cerrarUltima()).toBe(true);
    expect(cerradas).toEqual(["búsqueda", "confirmación"]);
  });

  it("vacía no cierra nada", () => {
    const capas = new Capas();
    expect(capas.hayAbiertas).toBe(false);
    expect(capas.cerrarUltima()).toBe(false);
  });

  it("quitar una capa fuera de orden la saca sin cerrar las demás", () => {
    const capas = new Capas();
    const cerradas: string[] = [];
    const quitarA = capas.abrir(() => cerradas.push("a"));
    capas.abrir(() => cerradas.push("b"));
    quitarA();
    expect(capas.cerrarUltima()).toBe(true);
    expect(capas.cerrarUltima()).toBe(false);
    expect(cerradas).toEqual(["b"]);
  });

  it("quitar dos veces no rompe nada", () => {
    const capas = new Capas();
    const quitar = capas.abrir(() => undefined);
    quitar();
    quitar();
    expect(capas.hayAbiertas).toBe(false);
  });

  it("al cerrarse, la capa sale aunque su función vuelva a quitarla", () => {
    const capas = new Capas();
    let quitar = () => {};
    quitar = capas.abrir(() => quitar());
    expect(capas.cerrarUltima()).toBe(true);
    expect(capas.hayAbiertas).toBe(false);
  });
});
