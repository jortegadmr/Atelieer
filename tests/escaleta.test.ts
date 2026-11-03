import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { moverEvento } from "../src/lib/modelo/operaciones";
import { colocarEscena } from "../src/lib/vistas/actos";
import { escaletaAlDia, leerEscaleta } from "../src/lib/wiki/escaleta";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 003, RF-39: aviso si la escaleta de la ficha del episodio ya no está al día.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

const EP = "ep-a101";

async function pasado() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  await s.cambiarEstado(EP, "borrador");
  await s.revisarFichas();
  const leida = s.fichas.get(EP)?.escaleta;
  expect(leida).toBeTruthy();
  return { s, leida: leida! };
}

describe("la escaleta de la wiki", () => {
  it("recién pasada: al día", async () => {
    const { s, leida } = await pasado();
    expect(leida.titulos.length).toBeGreaterThan(0);
    expect(escaletaAlDia(s.modelo, EP, leida)).toBe(true);
  });

  it("recién pasada con una escena sin título: al día", async () => {
    const fs = await vaultDePrueba();
    const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
    abiertas.push(s);
    const ev = s.modelo.indice().porEpisodio.get(EP)![1];
    s.desbloquear(ev.id);
    await s.aplicar({ guardar: [{ ...structuredClone(ev), titulo: "" }], borrar: [] });
    await s.cambiarEstado(EP, "borrador");
    await s.revisarFichas();
    const leida = s.fichas.get(EP)!.escaleta!;
    expect(escaletaAlDia(s.modelo, EP, leida)).toBe(true);
  });

  it("tras mover a otro acto: desfasada", async () => {
    const { s, leida } = await pasado();
    const ev = s.modelo.indice().porEpisodio.get(EP)![0];
    s.desbloquear(ev.id);
    await s.aplicar(colocarEscena(s.modelo, ev.id, EP, ev.acto === "3" ? "teaser" : "3"));
    expect(escaletaAlDia(s.modelo, EP, leida)).toBe(false);
  });

  it("cambio de orden: desfasada", async () => {
    const { s, leida } = await pasado();
    const ultima = s.modelo.indice().porEpisodio.get(EP)!.at(-1)!;
    s.desbloquear(ultima.id);
    await s.aplicar(moverEvento(s.modelo, ultima.id, EP, 0));
    expect(escaletaAlDia(s.modelo, EP, leida)).toBe(false);
  });

  it("plantilla con la fila vacía: sin títulos; ficha sin tablas: no avisa (null)", () => {
    const plantilla = "| Escena | Lugar | Qué pasa | Trama | Duración | Estado |\n|---|---|---|---|---|---|\n| ESC01 | | | A | | idea |\n";
    expect(leerEscaleta(plantilla)).toEqual({ titulos: [], actos: null });
    expect(leerEscaleta("# Sin tablas\n\nTexto.")).toBeNull();
  });

  it("un título con | escapada se lee entero", () => {
    const t = "| Escena | Lugar | Qué pasa |\n|---|---|---|\n| ESC01 | | Uno \\| dos |\n";
    expect(leerEscaleta(t)?.titulos).toEqual(["Uno | dos"]);
  });
});
