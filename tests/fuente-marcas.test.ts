import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { fuenteMarcas } from "../src/lib/consecuencias/fuente";
import { TEXTOS_ANTES } from "../src/lib/consecuencias/visor";
import { TEXTOS_AHORA, TEXTOS_QUEDARIA } from "../src/lib/variantes/visor";
import { editar } from "../src/lib/modelo/operaciones";
import type { Evento } from "../src/lib/modelo/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 009, RF-32: la regla de gris o acento, la misma para todas las vistas.

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir() {
  const e = new EstadoApp(await vaultDePrueba(), async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  return e;
}

const LIBRE = "ev-e002";
const titular = (e: EstadoApp, t: string) => e.sesion!.aplicar(editar(e.sesion!.modelo, LIBRE, (p) => ((p as Evento).titulo = t)));

describe("de dónde salen las marcas (spec 009, RF-32)", () => {
  it("sin cambios ni variante, ninguna", async () => {
    const e = await abrir();
    expect(fuenteMarcas(e)).toBeNull();
  });

  it("con una variante con diferencias, acento; con Ver ahora, al revés", async () => {
    const e = await abrir();
    await e.nuevaVariante();
    await titular(e, "Otro");
    const f = fuenteMarcas(e)!;
    expect([f.fantasma, f.textos, f.ids]).toEqual([true, TEXTOS_QUEDARIA, [LIBRE]]);
    expect([f.base, f.actual]).toEqual([e.sesionSerie!.modelo, e.variante!.modelo]);
    e.verAhora(true);
    const g = fuenteMarcas(e)!;
    expect([g.textos, g.base, g.actual]).toEqual([TEXTOS_AHORA, e.variante!.modelo, e.sesionSerie!.modelo]);
  });

  it("con «Si lo dejas así…» abierta y cambios, gris, también dentro de una variante", async () => {
    const e = await abrir();
    await e.nuevaVariante();
    e.elegir(LIBRE, "efectos");
    await titular(e, "Otro");
    const f = fuenteMarcas(e)!;
    expect([f.fantasma, f.textos, f.actual]).toEqual([false, TEXTOS_ANTES, e.variante!.modelo]);
    expect(f.ids[0]).toBe(LIBRE);
  });
});
