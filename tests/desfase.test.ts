import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Modelo } from "../src/lib/modelo/modelo";
import { revisarFichas } from "../src/lib/wiki/desfase";
import { pasarAWiki } from "../src/lib/wiki/pasar";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

const OP = { fecha: "2026-10-20", carpetaSerie: "appDatos/_prueba" };

async function pasada() {
  const fs = await vaultDePrueba();
  const m = new Modelo(await new Almacen(fs, APPDATOS).abrirSerie("_prueba"));
  const r = await pasarAWiki(fs, VAULT, m, "te-t001", OP);
  m.poner(r.pieza!);
  return { fs, m, abs: `${VAULT}/${r.ruta}` };
}

describe("estado y desfase de la ficha (spec 10.2, T8.5)", () => {
  it("recién pasada: en borrador y sin cambios", async () => {
    const { fs, m } = await pasada();
    expect(await revisarFichas(fs, VAULT, m)).toEqual([
      { id: "te-t001", ruta: "appDatos/_prueba/_wiki/01_Narrativa/Temporadas/T01 - Cerrar la emisora.md", existe: true, canon: false, estadoWiki: "borrador", cambio: false },
    ]);
  });

  it("si la ficha pone canon, se ve canon; si se cambió después de pasarla, lo dice", async () => {
    const { fs, m, abs } = await pasada();
    const texto = await fs.leer(abs);
    fs.reloj = () => Date.now() + 10_000; // el autor la toca un rato después
    await fs.cambiarDesdeFuera(abs, texto.replace("estado_canon: borrador", "estado_canon: canon"));
    const [e] = await revisarFichas(fs, VAULT, m);
    expect(e.canon).toBe(true);
    expect(e.cambio).toBe(true);
  });

  it("si la ficha ya no está (se renombró o se borró), lo dice", async () => {
    const { fs, m, abs } = await pasada();
    await fs.borrar(abs);
    const [e] = await revisarFichas(fs, VAULT, m);
    expect(e.existe).toBe(false);
  });

  it("las piezas sin ficha no se revisan", async () => {
    const fs = await vaultDePrueba();
    const m = new Modelo(await new Almacen(fs, APPDATOS).abrirSerie("_prueba"));
    expect(await revisarFichas(fs, VAULT, m)).toEqual([]);
  });
});
