import { describe, expect, it } from "vitest";
import { NOMBRE_APP as nombreApp } from "../src/lib/app/nombre";

describe("prueba de ejemplo", () => {
  it("la app se llama Atelier", () => {
    expect(nombreApp).toBe("Atelier");
  });
});
