import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { leerPizarra } from "../src/lib/pizarra/formato";
import type { Nota, Pizarra } from "../src/lib/pizarra/tipos";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 012, T8b: quitar con copia en la papelera (RNF-2, RF-8).

const PAPELERA = `${APPDATOS}/_prueba/_papelera/_pizarra`;

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir(): Promise<{ e: EstadoApp; fs: FsMemoria }> {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  e.cambiarVista("pizarra");
  await e.pizarra.abrir();
  return { e, fs };
}

const id = (r: { id: string } | { error: string }) => {
  if ("error" in r) throw new Error(r.error);
  return r.id;
};
const copias = (fs: FsMemoria) => fs.rutas().filter((r) => r.startsWith(PAPELERA));
const copiaLeida = async (fs: FsMemoria, ruta: string) => (leerPizarra(await fs.leer(ruta)) as { pizarra: Pizarra }).pizarra;

describe("quitar con copia en la papelera (spec 012, T8b)", () => {
  it("quitar una nota con texto deja copia de la pizarra de antes y se puede deshacer", async () => {
    const { e, fs } = await abrir();
    const n = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(n, "importante");
    const r = await e.pizarra.quitar(n);
    expect(r).toEqual({ flechasQuitadas: 0, copia: true });
    expect(e.pizarra.pizarra.elementos).toHaveLength(0);
    const rutas = copias(fs);
    expect(rutas).toHaveLength(1);
    expect(((await copiaLeida(fs, rutas[0])).elementos[0] as Nota).texto).toBe("importante");
    expect(e.pizarra.deshacer()).toBe(true);
    expect((e.pizarra.pizarra.elementos[0] as Nota).texto).toBe("importante");
  });

  it("quitar una tarjeta y quitar una flecha dejan copia", async () => {
    const { e, fs } = await abrir();
    const ev = [...e.sesionSerie!.modelo.eventos.values()][0];
    const n = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    const t = id(e.pizarra.anadirTarjeta(ev.id, { x: 300, y: 0 }));
    const f = id(e.pizarra.unir(n, t, "x"));
    expect(await e.pizarra.quitar(f)).toEqual({ flechasQuitadas: 0, copia: true });
    expect(copias(fs)).toHaveLength(1);
    expect(e.pizarra.pizarra.flechas).toHaveLength(0);
    expect(await e.pizarra.quitar(t)).toEqual({ flechasQuitadas: 0, copia: true });
    expect(copias(fs)).toHaveLength(2);
    expect(e.pizarra.pizarra.elementos.map((x) => x.id)).toEqual([n]);
  });

  it("quitar una nota con flechas deja una sola copia y cuenta las flechas", async () => {
    const { e, fs } = await abrir();
    const a = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    const b = id(e.pizarra.crearNota({ x: 300, y: 0 }));
    const c = id(e.pizarra.crearNota({ x: 600, y: 0 }));
    e.pizarra.editarNota(b, "centro");
    id(e.pizarra.unir(a, b));
    id(e.pizarra.unir(b, c));
    const r = await e.pizarra.quitar(b);
    expect(r).toEqual({ flechasQuitadas: 2, copia: true });
    expect(copias(fs)).toHaveLength(1);
    expect(e.pizarra.pizarra.flechas).toHaveLength(0);
    // Un solo paso de deshacer devuelve la nota y sus flechas
    e.pizarra.deshacer();
    expect(e.pizarra.pizarra.flechas).toHaveLength(2);
  });

  it("quitar una nota vacía sin flechas no deja copia", async () => {
    const { e, fs } = await abrir();
    const n = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    expect(await e.pizarra.quitar(n)).toEqual({ flechasQuitadas: 0, copia: false });
    expect(copias(fs)).toEqual([]);
  });

  it("una nota vacía con flechas sí deja copia", async () => {
    const { e, fs } = await abrir();
    const a = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    const b = id(e.pizarra.crearNota({ x: 300, y: 0 }));
    id(e.pizarra.unir(a, b));
    expect(await e.pizarra.quitar(a)).toEqual({ flechasQuitadas: 1, copia: true });
    expect(copias(fs)).toHaveLength(1);
  });

  it("si la copia falla no se quita nada y se dice por qué", async () => {
    const { e, fs } = await abrir();
    const n = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(n, "no la pierdas");
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.includes("_papelera") ? "entero" : null);
    const r = await e.pizarra.quitar(n);
    fs.fallo = null;
    expect("error" in r && r.error).toMatch(/copia/i);
    expect(e.pizarra.pizarra.elementos).toHaveLength(1);
  });

  it("quitar lo que ya no está o con la pizarra en solo lectura dice por qué", async () => {
    const { e } = await abrir();
    const n = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    expect(await e.pizarra.quitar("pz-nada")).toMatchObject({ error: expect.stringMatching(/ya no está/) });
    (e as unknown as { variante: unknown }).variante = {};
    expect(await e.pizarra.quitar(n)).toMatchObject({ error: expect.stringMatching(/solo lectura/) });
    (e as unknown as { variante: unknown }).variante = null;
  });

  it("dos pulsaciones seguidas quitan una vez y dejan una copia", async () => {
    const { e, fs } = await abrir();
    const n = id(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(n, "una");
    const [a, b] = await Promise.all([e.pizarra.quitar(n), e.pizarra.quitar(n)]);
    expect([a, b].filter((x) => !("error" in x))).toHaveLength(1);
    expect(copias(fs)).toHaveLength(1);
  });
});
