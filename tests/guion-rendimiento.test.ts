import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Instantaneas } from "../src/lib/almacen/instantaneas";
import { Sesion } from "../src/lib/app/sesion";
import { aTexto, desdeTexto, tiposDelDocumento } from "../src/lib/guion/documento";
import { escribirGuion } from "../src/lib/guion/formato";
import { medir } from "../src/lib/guion/paginas";
import { vacio } from "../src/lib/guion/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 013, T21 (RNF-4): un documento de 15 y de 40 escenas, abrir una serie con
// muchos guiones y la instantánea con 300 guiones, con el disco en memoria.

/** Una escena de ~2 páginas: encabezado, acción y diálogos */
function escena(n: number): string {
  const trozos = [`INT. LUGAR ${n} - NOCHE`, ""];
  for (let i = 0; i < 12; i++) {
    trozos.push(`Telmo cruza la sala despacio y mira la puerta, número ${i}, sin decir nada.`, "", "TELMO", "No pienso volver a pedirlo.", "");
  }
  trozos.push("CORTE A:");
  return trozos.join("\n");
}

/** RNF-4: 15 escenas en 100 ms; 40 en 300 ms */
const MAXIMO_MS: Record<number, number> = { 15: 100, 40: 300 };

describe("rendimiento del guion (spec 013, T21)", () => {
  for (const n of [15, 40]) {
    it(`un documento de ${n} escenas se lee, se clasifica y se mide en menos de ${MAXIMO_MS[n]} ms`, () => {
      const textos = Array.from({ length: n }, (_, i) => escena(i + 1));
      const t0 = performance.now();
      for (const t of textos) {
        const doc = desdeTexto(t);
        tiposDelDocumento(doc);
        expect(aTexto(doc)).toBe(t);
        medir(t);
      }
      expect(performance.now() - t0).toBeLessThan(MAXIMO_MS[n]!);
    });
  }

  let abiertas: Sesion[] = [];
  afterEach(async () => {
    for (const s of abiertas) await s.cerrar();
    abiertas = [];
  });

  async function conGuiones(cuantos: number) {
    const fs = await vaultDePrueba();
    const carpeta = `${APPDATOS}/_prueba/_guion`;
    await fs.crearDir(carpeta);
    for (let i = 0; i < cuantos; i++) {
      const id = `ev-g${String(i).padStart(4, "0")}`;
      await fs.escribir(`${carpeta}/${id}.md`, escribirGuion({ ...vacio(id), texto: escena(i) }));
    }
    return fs;
  }

  it(`abrir una serie con 300 guiones en _guion/ tarda menos de 2 s`, async () => {
    const fs = await conGuiones(300);
    const t0 = performance.now();
    const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
    abiertas.push(s);
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it("la instantánea con 300 guiones se hace en menos de 5 s y pesa poco", async () => {
    const fs = await conGuiones(300);
    const almacen = new Almacen(fs, APPDATOS);
    const inst = new Instantaneas(almacen, "_prueba");
    const t0 = performance.now();
    const i = await inst.crear("con guiones");
    expect(performance.now() - t0).toBeLessThan(5000);
    expect((await inst.contenido(i.nombre)).filter((x) => x.startsWith("_guion/"))).toHaveLength(300);
    const bytes = await fs.leerBytes(`${APPDATOS}/_prueba/_instantaneas/${i.nombre}`);
    expect(bytes.length).toBeLessThan(5 * 1024 * 1024);
  });
});
