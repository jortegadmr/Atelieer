import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import * as c from "../src/lib/modelo/consultas";
import { escribirObjetivo, guardarObjetivo, interpretarObjetivo, leerObjetivo, objetivoDe, objetivoVacio, rutaObjetivo, MAX_MINUTOS } from "../src/lib/desglose/objetivo";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 014, T3: la duración objetivo en su propio fichero (RF-12, RNF-1).

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

async function abrir() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s, serie: s.almacen.rutaSerie("_prueba") };
}

describe("duración objetivo: fichero", () => {
  it("sin fichero no hay objetivo y no se crea nada", async () => {
    const { fs, serie } = await abrir();
    const l = await leerObjetivo(fs, serie);
    expect(l).toMatchObject({ crudo: null, soloLectura: false, avisos: [] });
    expect(l.objetivo).toEqual(objetivoVacio());
    expect(await fs.existe(rutaObjetivo(serie))).toBe(false);
  });

  it("se guarda en _desglose/objetivo.md, se vuelve a leer igual y no toca serie.md ni las notas", async () => {
    const { fs, s, serie } = await abrir();
    const ep = c.episodiosEnOrden(s.modelo)[0]!;
    const antes = await fs.leer(`${serie}/serie.md`);
    const l = await leerObjetivo(fs, serie);
    const r = await guardarObjetivo(fs, serie, { ...l.objetivo, serie: 450, temporadas: { [ep.temporada]: 200 }, episodios: { [ep.id]: 45.5 } }, l);
    expect(r.hecho).toBe(true);
    expect(rutaObjetivo(serie)).toBe(`${serie}/_desglose/objetivo.md`);
    const otra = await leerObjetivo(fs, serie);
    expect(otra.objetivo).toMatchObject({ serie: 450, temporadas: { [ep.temporada]: 200 }, episodios: { [ep.id]: 45.5 } });
    expect(await fs.leer(`${serie}/serie.md`)).toBe(antes);
    expect(await fs.existe(`${rutaObjetivo(serie)}.tmp`)).toBe(false);
  });

  it("conserva los campos de la cabecera que no entiende", () => {
    const crudo = "---\natelier_desglose: 1\nserie: 90\nnota_de_otra_cosa: hola\n---\ntexto\n";
    const l = interpretarObjetivo(crudo);
    expect(l.objetivo.extra).toEqual({ nota_de_otra_cosa: "hola" });
    expect(escribirObjetivo(l.objetivo)).toContain("nota_de_otra_cosa: hola");
  });

  it("una versión más nueva se mira y no se escribe", async () => {
    const { fs, serie } = await abrir();
    await fs.crearDir(`${serie}/_desglose`);
    await fs.escribir(rutaObjetivo(serie), "---\natelier_desglose: 9\nserie: 90\n---\n");
    const l = await leerObjetivo(fs, serie);
    expect(l.soloLectura).toBe(true);
    expect(await guardarObjetivo(fs, serie, { ...l.objetivo, serie: 10 }, l)).toEqual({ hecho: false, motivo: "solo-lectura" });
    expect(await fs.leer(rutaObjetivo(serie))).toContain("serie: 90");
  });

  it("un fichero ilegible no se entiende ni se pisa", async () => {
    const { fs, serie } = await abrir();
    await fs.crearDir(`${serie}/_desglose`);
    for (const malo of ["sin cabecera", "---\n: : [\n---\n", "---\n- uno\n- dos\n---\n"]) {
      await fs.escribir(rutaObjetivo(serie), malo);
      const l = await leerObjetivo(fs, serie);
      expect(l.soloLectura).toBe(true);
      expect(l.avisos.length).toBeGreaterThan(0);
      expect((await guardarObjetivo(fs, serie, { ...l.objetivo, serie: 10 }, l)).hecho).toBe(false);
      expect(await fs.leer(rutaObjetivo(serie))).toBe(malo);
    }
  });

  it("si el disco cambió desde que se leyó, no se pisa", async () => {
    const { fs, serie } = await abrir();
    const l = await leerObjetivo(fs, serie);
    await fs.crearDir(`${serie}/_desglose`);
    await fs.escribir(rutaObjetivo(serie), "---\natelier_desglose: 1\nserie: 77\n---\n");
    expect(await guardarObjetivo(fs, serie, { ...l.objetivo, serie: 10 }, l)).toEqual({ hecho: false, motivo: "fuera" });
    expect(await fs.leer(rutaObjetivo(serie))).toContain("serie: 77");
  });

  it("no se guardan duraciones que no son un número entre 0 y el tope", async () => {
    const { fs, serie } = await abrir();
    const l = await leerObjetivo(fs, serie);
    for (const malo of [0, -5, Number.NaN, Infinity, MAX_MINUTOS + 1]) {
      expect(await guardarObjetivo(fs, serie, { ...l.objetivo, serie: malo }, l)).toEqual({ hecho: false, motivo: "invalido" });
    }
    expect(await fs.existe(rutaObjetivo(serie))).toBe(false);
  });

  it("al leer, los valores que no son duración se ignoran con aviso y __proto__ no entra", () => {
    const crudo = "---\natelier_desglose: 1\nserie: mucho\ntemporadas:\n  t1: -3\n  t2: 100\n  __proto__: 5\nepisodios: [1, 2]\n---\n";
    const l = interpretarObjetivo(crudo);
    expect(l.objetivo.serie).toBeNull();
    expect(l.objetivo.temporadas).toEqual({ t2: 100 });
    expect(l.objetivo.episodios).toEqual({});
    expect(l.avisos.length).toBeGreaterThanOrEqual(3);
    expect(Object.hasOwn(l.objetivo.temporadas, "__proto__")).toBe(false);
    expect(({} as Record<string, unknown>)["5"]).toBeUndefined();
  });
});

describe("duración objetivo: por ámbito", () => {
  it("episodio, temporada y serie; la temporada suma sus episodios si todos tienen objetivo", async () => {
    const { s } = await abrir();
    const m = s.modelo;
    const t = c.temporadasEnOrden(m)[0]!;
    const eps = c.episodiosDeTemporada(m, t.id);
    expect(eps.length).toBeGreaterThanOrEqual(2);
    const o = objetivoVacio();
    expect(objetivoDe(o, m, { que: "serie" })).toBeNull();
    expect(objetivoDe(o, m, { que: "episodio", id: eps[0]!.id })).toBeNull();
    for (const e of eps) o.episodios[e.id] = 30;
    expect(objetivoDe(o, m, { que: "episodio", id: eps[0]!.id })).toBe(1800);
    expect(objetivoDe(o, m, { que: "temporada", id: t.id })).toBe(eps.length * 1800);
    // Con objetivo propio de la temporada, manda ese
    o.temporadas[t.id] = 100;
    expect(objetivoDe(o, m, { que: "temporada", id: t.id })).toBe(6000);
    // Si falta algún episodio, no se inventa la suma
    delete o.temporadas[t.id];
    delete o.episodios[eps[0]!.id];
    expect(objetivoDe(o, m, { que: "temporada", id: t.id })).toBeNull();
    // La serie: el valor propio gana
    o.serie = 600;
    expect(objetivoDe(o, m, { que: "serie" })).toBe(36000);
  });
});
