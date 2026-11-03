import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { crearFicha } from "../src/lib/wiki/plantillas";
import { APPDATOS, PLANTILLAS, VAULT, vaultDePrueba } from "./fixtures/wiki";

async function preparar() {
  const fs = await vaultDePrueba();
  const d = await new Almacen(fs, APPDATOS).abrirSerie("_prueba");
  return { fs, rutas: d.serie.wiki };
}

const OPCIONES = { fecha: "2026-10-20", origen: "appDatos/_prueba" };

describe("Crear ficha (spec 10.1, 10.3, reglas 7 y 14; T8.3)", () => {
  it("crea la ficha de un personaje con su plantilla, el nombre y la fecha puestos", async () => {
    const { fs, rutas } = await preparar();
    const r = await crearFicha(fs, VAULT, rutas, "personaje", "Don Anselmo", OPCIONES);
    expect(r).toEqual({ estado: "creada", ruta: "appDatos/_prueba/_wiki/02_Personajes/Personajes/Don Anselmo.md" });
    const texto = await fs.leer(`${VAULT}/${r.ruta}`);
    expect(texto).toContain("# Don Anselmo");
    expect(texto).toContain('creado: "2026-10-20"');
    expect(texto).not.toContain("{{");
    expect(texto).toContain("### Motor interno");
  });

  it("añade Fuentes con la serie de appDatos y la fecha", async () => {
    const { fs, rutas } = await preparar();
    const r = await crearFicha(fs, VAULT, rutas, "lugar", "Azotea", OPCIONES);
    const texto = await fs.leer(`${VAULT}/${r.ruta}`);
    expect(r.ruta).toBe("appDatos/_prueba/_wiki/03_Mundo/Lugares/Azotea.md");
    expect(texto).toMatch(/## Fuentes\n\n- `appDatos\/_prueba` — creada desde Atelier el 2026-10-20/);
    expect(texto).not.toContain("00_Raw/...");
  });

  it("añade una entrada al final del Log de la serie", async () => {
    const { fs, rutas } = await preparar();
    const antes = await fs.leer(`${VAULT}/${rutas.log}`);
    await crearFicha(fs, VAULT, rutas, "era", "C2", OPCIONES);
    const log = await fs.leer(`${VAULT}/${rutas.log}`);
    expect(log.startsWith(antes)).toBe(true);
    expect(log.slice(antes.length)).toMatch(/^\n?## \[2026-10-20\] atelier \| Crear ficha: C2\n/);
    expect(await fs.existe(`${VAULT}/appDatos/_prueba/_wiki/03_Mundo/Eras/C2.md`)).toBe(true);
  });

  it("si ya existe, no hace nada", async () => {
    const { fs, rutas } = await preparar();
    const ruta = `${VAULT}/appDatos/_prueba/_wiki/02_Personajes/Personajes/Telmo.md`;
    const antes = await fs.leer(ruta);
    const log = await fs.leer(`${VAULT}/${rutas.log}`);
    expect((await crearFicha(fs, VAULT, rutas, "personaje", "Telmo", OPCIONES)).estado).toBe("ya existe");
    expect(await fs.leer(ruta)).toBe(antes);
    expect(await fs.leer(`${VAULT}/${rutas.log}`)).toBe(log);
  });

  it("no toca las plantillas", async () => {
    const { fs, rutas } = await preparar();
    await crearFicha(fs, VAULT, rutas, "personaje", "Don Anselmo", OPCIONES);
    expect(await fs.leer(`${VAULT}/_Plantillas/Personajes/Plantilla - Personaje.md`)).toBe(PLANTILLAS["Personajes/Plantilla - Personaje.md"]);
  });

  it("un nombre con caracteres que no valen en un fichero se rechaza", async () => {
    const { fs, rutas } = await preparar();
    await expect(crearFicha(fs, VAULT, rutas, "personaje", "Telmo/Nando", OPCIONES)).rejects.toThrow(/nombre/);
  });
});
