import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../../src/lib/almacen/almacen";
import type { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { Sesion } from "../../src/lib/app/sesion";
import { conEstado } from "../../src/lib/modelo/estados";
import type { Episodio, Temporada } from "../../src/lib/modelo/tipos";
import { rutaFicha } from "../../src/lib/wiki/estado-ficha";
import { APPDATOS, VAULT, vaultDePrueba } from "../fixtures/wiki";

// Spec 005, RF-20: un cambio entero (Volver, su Ctrl Z / Ctrl Y) con fichas de
// la wiki que cambian de estado se aplica entero o nada, también en la wiki.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

/** La serie de prueba con la temporada y su primer episodio pasados a la wiki en borrador */
async function conDosFichas() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  const t = [...s.modelo.temporadas.values()][0];
  const ep = [...s.modelo.episodios.values()].find((e) => e.temporada === t.id)!;
  expect((await s.cambiarEstado(t.id, "borrador")).hecho).toBe(true);
  expect((await s.cambiarEstado(ep.id, "borrador")).hecho).toBe(true);
  const ficha = (p: Temporada | Episodio) => `${VAULT}/${rutaFicha(s.modelo.serie.wiki, { tipo: p.tipo, wiki: p.wiki })!}`;
  const temporada = () => s.modelo.temporadas.get(t.id)!;
  const episodio = () => s.modelo.episodios.get(ep.id)!;
  // Las dos a canon, en un solo cambio entero
  const cambio = { guardar: [conEstado(temporada(), "canon"), conEstado(episodio(), "canon")], borrar: [] };
  return { fs, s, temporada, episodio, ficha, cambio };
}

const estadoEn = async (fs: FsMemoria, ruta: string) => /estado_canon: (.*)/.exec(await fs.leer(ruta))?.[1];

describe("cambio entero con fichas de la wiki (spec 005, RF-20)", () => {
  it("si falta una ficha, no escribe ninguna ni cambia la mesa", async () => {
    const { fs, s, temporada, episodio, ficha, cambio } = await conDosFichas();
    const [rt, re] = [ficha(temporada()), ficha(episodio())];
    await fs.borrar(re);
    const antes = JSON.stringify([temporada(), episodio()]);
    expect(await s.aplicar(cambio, true, undefined, { entero: true, exacto: true })).toBe(false);
    expect(await estadoEn(fs, rt)).toBe("borrador");
    expect(JSON.stringify([temporada(), episodio()])).toBe(antes);
    expect(s.avisosCambio.join(" ")).toMatch(/no está en la wiki de la serie: no se ha devuelto nada/);
  });

  it("si una ficha falla después de escribir otra, la escrita vuelve a su estado y la mesa no cambia", async () => {
    const { fs, s, temporada, episodio, ficha, cambio } = await conDosFichas();
    const [rt, re] = [ficha(temporada()), ficha(episodio())];
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.startsWith(re) ? "entero" : null);
    const antes = JSON.stringify([temporada(), episodio()]);
    expect(await s.aplicar(cambio, true, undefined, { entero: true, exacto: true })).toBe(false);
    fs.fallo = null;
    expect(await estadoEn(fs, rt)).toBe("borrador");
    expect(await estadoEn(fs, re)).toBe("borrador");
    expect(JSON.stringify([temporada(), episodio()])).toBe(antes);
    expect(s.avisosCambio).toContain("Las fichas que ya habían cambiado han vuelto a su estado (el Log lo apunta).");
    expect(s.fichas.get(temporada().id)?.canon).not.toBe(true);
  });

  it("si todo va bien, cambian las dos fichas y la mesa", async () => {
    const { fs, s, temporada, episodio, ficha, cambio } = await conDosFichas();
    expect(await s.aplicar(cambio, true, undefined, { entero: true, exacto: true })).toBe(true);
    expect(await estadoEn(fs, ficha(temporada()))).toBe("canon");
    expect(await estadoEn(fs, ficha(episodio()))).toBe("canon");
    expect([temporada().madurez, episodio().madurez]).toEqual(["canon", "canon"]);
  });
});
