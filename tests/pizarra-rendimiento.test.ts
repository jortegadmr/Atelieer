import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { escribirPizarra, leerPizarra } from "../src/lib/pizarra/formato";
import * as op from "../src/lib/pizarra/operaciones";
import { MAX_ELEMENTOS, MAX_FLECHAS, vacia, type Pizarra } from "../src/lib/pizarra/tipos";

// Spec 012, RNF-5: 200 elementos y 400 flechas se leen y se guardan en menos de 100 ms con el disco en memoria.

/** La pizarra más grande que cabe: 100 notas, 100 tarjetas y 400 flechas (la última se une en la prueba) */
function grande(flechas = MAX_FLECHAS): Pizarra {
  let p = vacia();
  for (let i = 0; i < MAX_ELEMENTOS / 2; i++) {
    const n = op.crearNota(p, { x: (i % 20) * 200, y: Math.floor(i / 20) * 150 });
    if ("error" in n) throw new Error(n.error);
    p = op.editarNota(n.pizarra, n.id, `Nota ${i}: ${"texto con acentos y «comillas» ".repeat(8)}`).pizarra;
  }
  for (let i = 0; i < MAX_ELEMENTOS / 2; i++) {
    const t = op.anadirTarjeta(p, `ev-${String(i).padStart(4, "0")}`, { x: (i % 20) * 200, y: 1200 + Math.floor(i / 20) * 150 });
    if ("error" in t) throw new Error(t.error);
    p = t.pizarra;
  }
  const ids = p.elementos.map((e) => e.id);
  for (let i = 0; i < flechas; i++) {
    // Cada elemento sale a su siguiente y, en la segunda vuelta, a otro tres más allá
    const de = i % ids.length;
    const r = op.unir(p, ids[de], ids[(de + (i < ids.length ? 1 : 3)) % ids.length], `etiqueta ${i}`);
    if ("error" in r) throw new Error(`${i}: ${r.error}`);
    p = r.pizarra;
  }
  return p;
}

const medir = (veces: number, f: () => unknown | Promise<unknown>) => async () => {
  await f(); // calentar
  const inicio = performance.now();
  for (let i = 0; i < veces; i++) await f();
  return (performance.now() - inicio) / veces;
};

describe("rendimiento de la pizarra (spec 012, RNF-5)", () => {
  it("la pizarra de prueba tiene 200 elementos y 400 flechas", () => {
    const p = grande();
    expect(p.elementos).toHaveLength(MAX_ELEMENTOS);
    expect(p.flechas).toHaveLength(MAX_FLECHAS);
  });

  it("escribir y leer el texto en menos de 100 ms", async () => {
    const p = grande();
    const escribe = await medir(10, () => escribirPizarra(p))();
    const texto = escribirPizarra(p);
    const lee = await medir(10, () => leerPizarra(texto))();
    expect("pizarra" in leerPizarra(texto)).toBe(true);
    console.log(`Pizarra de 200 elementos y 400 flechas: escribir ${escribe.toFixed(1)} ms, leer ${lee.toFixed(1)} ms`);
    expect(escribe).toBeLessThan(100);
    expect(lee).toBeLessThan(100);
  });

  it("guardar y cargar con el almacén en menos de 100 ms", async () => {
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, "/appDatos");
    await almacen.crearSerie("s", { titulo: "S" });
    const a = new AlmacenPizarra(almacen, "s");
    let p = grande();
    await a.cargar();
    const guarda = await medir(10, async () => {
      // Cada vuelta cambia algo para que escriba de verdad
      p = op.moverElemento(p, p.elementos[0].id, Math.random() * 1000, 0);
      await a.guardar(p);
    })();
    const carga = await medir(10, () => a.cargar())();
    const cargada = await a.cargar();
    expect(cargada.pizarra.elementos).toHaveLength(MAX_ELEMENTOS);
    expect(cargada.pizarra.flechas).toHaveLength(MAX_FLECHAS);
    console.log(`Almacén: guardar ${guarda.toFixed(1)} ms, cargar ${carga.toFixed(1)} ms`);
    expect(guarda).toBeLessThan(100);
    expect(carga).toBeLessThan(100);
  });

  it("unir dos elementos con 399 flechas en menos de 100 ms", async () => {
    const p = grande(MAX_FLECHAS - 1);
    const ids = p.elementos.map((e) => e.id);
    const une = await medir(10, () => {
      const r = op.unir(p, ids[0], ids[5], "nueva");
      if ("error" in r) throw new Error(r.error);
      return r;
    })();
    console.log(`Unir con 399 flechas: ${une.toFixed(2)} ms`);
    expect(une).toBeLessThan(100);
  });
});
