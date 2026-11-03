import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { leerEncabezado } from "../src/lib/desglose/analisis";
import { aTablaMarkdown, type FilaDesglose } from "../src/lib/desglose/desglose";
import { interpretarObjetivo } from "../src/lib/desglose/objetivo";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 014: arreglos de la revisión independiente.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

describe("revisión de la spec 014", () => {
  it("leer la wiki solo para mirar no avisa ni cambia la versión", async () => {
    const s = await Sesion.abrir(new Almacen(await vaultDePrueba(), APPDATOS), "_prueba", "PC");
    abiertas.push(s);
    let avisos = 0;
    s.alCambiar(() => avisos++);
    await s.leerWikiSoloLectura();
    expect(avisos).toBe(0);
  });

  it("un valor de duración que la app no entiende deja el objetivo en solo lectura", () => {
    const r = interpretarObjetivo("---\natelier_desglose: 1\nserie: 45 min\n---\n");
    expect(r.soloLectura).toBe(true);
    const ok = interpretarObjetivo("---\natelier_desglose: 1\nserie: 45\n---\n");
    expect(ok.soloLectura).toBe(false);
  });

  it("un encabezado con miles de espacios se lee deprisa", () => {
    const t0 = performance.now();
    leerEncabezado("INT." + " ".repeat(50000) + "CASA" + " ".repeat(50000) + "x");
    expect(performance.now() - t0).toBeLessThan(200);
  });

  it("la tabla Markdown neutraliza enlaces, incrustaciones y HTML", () => {
    const fila = { codigo: "S01", titulo: "![[a]] <img src=x onerror=1>" } as unknown as FilaDesglose;
    const { texto } = aTablaMarkdown([fila], ["titulo"]);
    expect(texto).toContain("\\!\\[\\[a\\]\\]");
    expect(texto).toContain("\\<img");
  });
});
