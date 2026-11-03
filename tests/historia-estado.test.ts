import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp, AVISO_GUARDANDO } from "../src/lib/app/estado.svelte";
import { editar } from "../src/lib/modelo/operaciones";
import type { Evento } from "../src/lib/modelo/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 009, T3: mover de época desde el estado de la app, con la serie de
// prueba (Timeline: C1 y Presente) y el disco en memoria.

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
  return { e, fs };
}

const LIBRE = "ev-e002";
const CANON = "ev-e001";
const C1 = "e:c1";
const mundo = (e: EstadoApp, id: string) => e.sesion!.modelo.eventos.get(id)!.mundo;
const ponerMundo = (e: EstadoApp, id: string, valor: string) => e.sesion!.aplicar(editar(e.sesion!.modelo, id, (p) => ((p as Evento).mundo = valor)));

describe("mover de época desde la línea (spec 009, RF-25, RF-27 a RF-29)", () => {
  it("abrir la línea no cambia el nivel; el filtro vuelve a toda la serie al abrir otra vez", async () => {
    const { e } = await abrir();
    const nivel = e.nivel;
    await e.abrirHistoria();
    expect([e.vista, e.nivel]).toEqual(["historia", nivel]);
    e.filtroHistoria = "te-t001";
    await e.abrir("_prueba");
    expect(e.filtroHistoria).toBe("");
  });

  it("un paso de Ctrl Z por movimiento, y anuncia a dónde pasa", async () => {
    const { e } = await abrir();
    expect(await e.cambiarEpoca(LIBRE, C1)).toBe(true);
    expect(mundo(e, LIBRE)).toBe("[[C1]]");
    expect(e.anuncioHistoria).toBe("Pasa a «C1»");
    expect(await e.cambiarEpoca(LIBRE, "presente")).toBe(true);
    expect(mundo(e, LIBRE)).toBe("");
    expect(e.anuncioHistoria).toBe("Pasa al presente");
    await e.sesion!.deshacer();
    expect(mundo(e, LIBRE)).toBe("[[C1]]");
    await e.sesion!.deshacer();
    expect(mundo(e, LIBRE)).toBe("");
  });

  it("en su misma columna no hace nada ni crea paso", async () => {
    const { e } = await abrir();
    expect(await e.cambiarEpoca(LIBRE, "presente")).toBe(false);
    expect(e.sesion!.historial.puedeDeshacer).toBe(false);
  });

  it("Ctrl Z desde No está en la wiki devuelve el texto exacto", async () => {
    const { e } = await abrir();
    await ponerMundo(e, LIBRE, "  la **Edad** perdida ");
    expect(await e.cambiarEpoca(LIBRE, C1)).toBe(true);
    await e.sesion!.deshacer();
    expect(mundo(e, LIBRE)).toBe("  la **Edad** perdida ");
  });

  it("canon bloqueado no se mueve y lo dice; en la variante sí, y no escribe en la serie", async () => {
    const { e } = await abrir();
    const antes = mundo(e, CANON);
    expect(await e.cambiarEpoca(CANON, C1)).toBe(false);
    expect(e.avisoHistoria).toBe("La escena es canon: desbloquéala para moverla");
    await e.nuevaVariante();
    expect(await e.cambiarEpoca(CANON, C1)).toBe(true);
    expect(mundo(e, CANON)).toBe("[[C1]]");
    expect(e.sesionSerie!.modelo.eventos.get(CANON)!.mundo).toBe(antes);
  });

  it("con Ver ahora no se mueve", async () => {
    const { e } = await abrir();
    await e.nuevaVariante();
    e.verAhora(true);
    expect(await e.cambiarEpoca(LIBRE, C1)).toBe(false);
    expect(e.avisoHistoria).toMatch(/Estás viendo ahora/);
    expect(e.sesionSerie!.modelo.eventos.get(LIBRE)!.mundo).toBe("");
  });

  it("la wiki releída a medio arrastre no mueve", async () => {
    const { e } = await abrir();
    const lectura = e.sesion!.wiki.lectura;
    await e.sesion!.leerWiki();
    expect(await e.cambiarEpoca(LIBRE, C1, lectura)).toBe(false);
    expect(e.avisoHistoria).toBe("La wiki cambió mientras arrastrabas: no se ha movido.");
    expect(mundo(e, LIBRE)).toBe("");
  });

  it("dos movimientos a la vez: el segundo se ignora y lo dice", async () => {
    const { e } = await abrir();
    const [a, b] = await Promise.all([e.cambiarEpoca(LIBRE, C1), e.cambiarEpoca("ev-e013", "presente")]);
    expect([a, b]).toEqual([true, false]);
    expect(e.avisoHistoria).toBe(AVISO_GUARDANDO);
    expect(e.avisoVisor).toBeNull();
  });

  it("Alt + flechas: uno por pulsación y avisa en los bordes", async () => {
    const { e } = await abrir();
    const [a, b] = await Promise.all([e.moverEpocaConTecla(LIBRE, "izq"), e.moverEpocaConTecla(LIBRE, "izq")]);
    expect([a, b]).toEqual([true, false]);
    expect(mundo(e, LIBRE)).toBe("[[C1]]");
    expect(e.avisoHistoria).toBe("Ya está en la primera época");
    expect(await e.moverEpocaConTecla(LIBRE, "der")).toBe(true);
    expect(mundo(e, LIBRE)).toBe("");
  });

  it("con «Si lo dejas así…» abierta, pulsar una escena no cambia la pieza que se compara (RF-33b)", async () => {
    const { e } = await abrir();
    e.elegir(LIBRE, "efectos");
    await e.cambiarEpoca(LIBRE, C1);
    e.pulsarEscena("ev-e013");
    expect([e.seleccion, e.sesion!.comparacion!.piezaId]).toEqual([LIBRE, LIBRE]);
    e.elegir(LIBRE, "guia");
    e.pulsarEscena("ev-e013");
    expect(e.seleccion).toBe("ev-e013");
  });
});
