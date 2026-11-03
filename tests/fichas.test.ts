import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Wiki } from "../src/lib/wiki/fichas";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

async function wiki() {
  const fs = await vaultDePrueba();
  const d = await new Almacen(fs, APPDATOS).abrirSerie("_prueba");
  const w = new Wiki(fs, VAULT, d.serie.wiki);
  await w.cargar();
  return { fs, w };
}

describe("personajes, lugares y épocas de la wiki (T8.1)", () => {
  it("lee los nombres de las carpetas de la serie", async () => {
    const { w } = await wiki();
    expect(w.de("personaje").map((f) => f.nombre).sort()).toEqual(["El Alcalde", "La madre", "Nando", "Sabela", "Telmo"]);
    expect(w.de("lugar").map((f) => f.nombre)).toContain("Torre de la emisora");
  });

  it("las épocas salen de la tabla Eras de la Timeline, con su 'desde'", async () => {
    const { w } = await wiki();
    const c1 = w.buscar("C1")!;
    expect(c1.tipo).toBe("era");
    expect(c1.detalle).toBe("hace cien años");
    expect(c1.ruta).toBe("appDatos/_prueba/_wiki/03_Mundo/Timeline.md");
  });

  it("encuentra por alias y sin distinguir acentos ni mayúsculas", async () => {
    const { w } = await wiki();
    expect(w.buscar("telmo costa")!.nombre).toBe("Telmo");
    expect(w.buscar("[[Sabela]]")!.nombre).toBe("Sabela");
    expect(w.buscar("Don Anselmo")).toBeNull();
  });

  it("lee el motor de la tabla 'Motor interno', sin los [PENDIENTE]", async () => {
    const { w } = await wiki();
    expect(w.buscar("Telmo")!.motor).toEqual({
      quiere: "Evitar cada desgracia sin que nadie más pague por ello.",
      necesita: "Confiar en alguien.",
      herida: "Vio cómo su madre callaba un aviso hasta que fue tarde.",
      mentira: "Si aviso, me tomarán por loco.",
    });
    expect(w.buscar("Sabela")!.motor.necesita).toBe("");
  });

  it("sugiere por lo que empieza el nombre", async () => {
    const { w } = await wiki();
    expect(w.sugerir("Te", ["personaje"]).map((f) => f.nombre)).toEqual(["Telmo"]);
    expect(w.sugerir("t", ["lugar"]).map((f) => f.nombre)).toEqual(["Torre de la emisora"]);
  });

  it("la dirección para abrirla en Obsidian", async () => {
    const { w } = await wiki();
    expect(w.urlObsidian(w.buscar("La madre")!)).toBe(
      "obsidian://open?vault=Vault&file=appDatos%2F_prueba%2F_wiki%2F02_Personajes%2FPersonajes%2FLa%20madre",
    );
  });

  it("si falta una carpeta, no revienta", async () => {
    const { fs } = await wiki();
    const w = new Wiki(fs, VAULT, { raiz: "", personajes: "no/existe", lugares: "", eras: "", timeline: "", narrativa: "", log: "" });
    await w.cargar();
    expect(w.de("personaje")).toEqual([]);
  });
});
