import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import * as c from "../src/lib/modelo/consultas";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// La vista «Análisis» en el estado de la app (spec 010, RF-13, RF-14, T17)

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir() {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  return e;
}

describe("estado de Análisis (spec 010, T17)", () => {
  it("arranca en la temporada del visor; en la serie, la primera; después no la sigue", async () => {
    const e = await abrir();
    const [t1, t2] = c.temporadasEnOrden(e.sesion!.modelo).map((t) => t.id);
    await e.abrirAnalisis();
    expect(e.vista).toBe("analisis");
    expect(e.temporadaAnalisis).toBe(t1);
    e.irANivel({ tipo: "temporada", temporada: t2 });
    expect(e.temporadaAnalisis).toBe(t1);
    e.cambiarVista("tramas");
    await e.abrirAnalisis();
    expect(e.temporadaAnalisis).toBe(t2);
    // El nivel del visor no cambia al abrir Análisis
    expect(e.nivel).toEqual({ tipo: "temporada", temporada: t2 });
  });

  it("recuerda la pestaña en la sesión; abrir otra vez la serie vuelve a Presencia", async () => {
    const e = await abrir();
    await e.abrirAnalisis();
    expect(e.pestanaAnalisis).toBe("presencia");
    e.pestanaAnalisis = "esquema";
    e.cambiarVista("serie");
    await e.abrirAnalisis();
    expect(e.pestanaAnalisis).toBe("esquema");
    await e.cerrar();
    await e.abrir("_prueba");
    expect(e.pestanaAnalisis).toBe("presencia");
    expect(e.temporadaAnalisis).toBe("");
  });
});
