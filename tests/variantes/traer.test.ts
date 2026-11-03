import { afterEach, describe, expect, it } from "vitest";
import type { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { crearPieza, escribirPieza } from "../../src/lib/modelo/ficheros";
import { editar } from "../../src/lib/modelo/operaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { colocarEscena } from "../../src/lib/vistas/actos";
import { crearPieza as crearEnNivel } from "../../src/lib/vistas/crear";
import { limpiarPisa, traerPieza } from "../../src/lib/variantes/traer";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, serieBasica } from "../consecuencias/ayuda";

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

async function preparar() {
  const x = serieBasica();
  const r = await abrir(x.b);
  abiertas.push(r.s);
  const v = await SesionVariante.abrirSobre(r.s, variante("va-prue", "Prueba", ""));
  abiertas.push(v);
  return { ...x, ...r, v };
}

type Ev = PiezaDe<"evento">;
const enVariante = (v: SesionVariante, id: string, fn: (p: Ev) => void) => v.aplicar(editar(v.modelo, id, (p) => fn(p as Ev)));
const enSerie = (s: Sesion, id: string, fn: (p: Ev) => void) => s.aplicar(editar(s.modelo, id, (p) => fn(p as Ev)));

describe("traer lo de ahora a una pieza (spec 006, RF-30, RF-30c)", () => {
  it("a tres bandas: lo de la serie entra, lo de la variante se queda, lo de los dos lados se queda y pisa", () => {
    const base = crearPieza("evento", { id: "ev-aaaa", titulo: "Base", gana: "", pierde: "", valor: "" });
    const serie = { ...base, gana: "Serie", titulo: "Serie" } as Pieza;
    const mio = { ...base, pierde: "Variante", titulo: "Variante" } as Pieza;
    const t = traerPieza({ tipo: "evento", base: escribirPieza(base), pieza: mio }, "ev-aaaa", serie);
    expect(t.pieza).toMatchObject({ gana: "Serie", pierde: "Variante", titulo: "Variante" });
    expect(t.pisa).toEqual({ titulo: "Serie" });
    expect(t.base).toBe(escribirPieza(serie));
  });

  it("lo que la app no entiende (extra) se junta por subclave", () => {
    const base = crearPieza("evento", { id: "ev-aaaa", extra: { a: 1, b: 1 } });
    const serie = { ...base, extra: { a: 2, b: 1 } } as Pieza;
    const mio = { ...base, extra: { a: 1, b: 3 }, titulo: "Mía" } as Pieza;
    const t = traerPieza({ tipo: "evento", base: escribirPieza(base), pieza: mio }, "ev-aaaa", serie);
    expect(t.pieza!.extra).toEqual({ a: 2, b: 3 });
    expect(t.pisa).toEqual({});
  });

  it("un valor escrito a mano (crudos) va con su campo", () => {
    const base = crearPieza("evento", { id: "ev-aaaa", titulo: "Base" });
    const serie = { ...base, acto: "", crudos: { acto: "prólogo" } } as Pieza;
    const mio = { ...base, titulo: "Mía" } as Pieza;
    const t = traerPieza({ tipo: "evento", base: escribirPieza(base), pieza: mio }, "ev-aaaa", serie);
    expect(t.pieza!.crudos).toEqual({ acto: "prólogo" });
    expect(escribirPieza(t.pieza!)).toContain("acto: prólogo");
  });

  it("«Pisa lo de ahora» deja de valer cuando la variante iguala a la serie o vuelve a lo que pisaba", () => {
    const v = crearPieza("evento", { id: "ev-aaaa", titulo: "Variante" });
    const s = crearPieza("evento", { id: "ev-aaaa", titulo: "Serie" });
    expect(limpiarPisa({ titulo: "Serie" }, v, s)).toEqual({ titulo: "Serie" });
    expect(limpiarPisa({ titulo: "Serie" }, { ...v, titulo: "Serie" }, s)).toBeUndefined();
    expect(limpiarPisa({ titulo: "Antes" }, { ...v, titulo: "Antes" }, s)).toBeUndefined();
  });

  it("en la sesión: el choque desaparece, «Pisa lo de ahora» se ve, y deshacer lo trae de vuelta", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await enSerie(s, s1, (p) => ((p.titulo = "En la serie"), (p.gana = "Gana en la serie")));
    const [ch] = v.choques();
    expect(v.sePuedeTraer(ch)).toBe(true);
    await v.traer(ch);
    expect(v.choques()).toEqual([]);
    expect(v.modelo.eventos.get(s1)).toMatchObject({ titulo: "En la variante", gana: "Gana en la serie" });
    expect(v.datos.pisa.get(s1)).toEqual({ titulo: "En la serie" });
    const d = v.diferencias();
    expect(d.pisan).toBe(1);
    expect(d.piezas[0].pisa[0]).toMatch(/^Pisa lo de ahora · Título/);
    await v.deshacer();
    expect(v.choques()).toHaveLength(1);
    expect(v.datos.pisa.has(s1)).toBe(false);
    await v.rehacer();
    expect(v.choques()).toEqual([]);
  });

  it("si la variante vuelve al valor de la serie, ya no pisa nada", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await enSerie(s, s1, (p) => (p.titulo = "En la serie"));
    await v.traer(v.choques()[0]);
    await enVariante(v, s1, (p) => (p.titulo = "En la serie"));
    expect(v.datos.pisa.has(s1)).toBe(false);
  });

  it("si lo que choca ya no existe, no se ofrece traer (RF-31)", async () => {
    const { s, v, s3 } = await preparar();
    await enVariante(v, s3, (p) => (p.titulo = "En la variante"));
    await s.aplicar({ guardar: [], borrar: [s.modelo.eventos.get(s3)!] });
    const [ch] = v.choques();
    expect(ch).toMatchObject({ yaNoEsta: true });
    expect(v.sePuedeTraer(ch)).toBe(false);
  });
});

describe("traer lo de ahora a un sitio (spec 006, RF-30b)", () => {
  it("el orden de la serie de ahora con la escena de la variante junto a su vecina, sin repetidos", async () => {
    const { s, v, s1, s3, s4, e2 } = await preparar();
    // Variante: la escena 1 va al episodio 2, delante de la 4
    await v.aplicar(colocarEscena(v.modelo, s1, e2, "", 0));
    // Serie: la escena 3 también va al episodio 2, al final
    await s.aplicar(colocarEscena(s.modelo, s3, e2, ""));
    // Chocan los dos episodios: del 1 salieron escenas en los dos lados, al 2 llegaron
    const sitios = v.choques().filter((c) => c.clase === "sitio");
    expect(sitios.length).toBeGreaterThan(0);
    for (const ch of sitios) await v.traer(ch);
    expect(v.choques().filter((c) => c.clase === "sitio")).toEqual([]);
    const enE2 = [...v.modelo.eventos.values()].filter((e) => e.episodio === e2).sort((a, b) => a.orden - b.orden);
    expect(enE2.map((e) => e.id)).toEqual([s1, s4, s3]);
    expect(enE2.map((e) => e.orden)).toEqual([1, 2, 3]);
  });

  it("si la vecina de delante ya no está, la escena va al final", async () => {
    const { s, v, t, s4, e2 } = await preparar();
    const nueva = crearEnNivel(v.modelo, { tipo: "episodio", temporada: t, episodio: e2 }, "evento", { titulo: "Nueva" });
    await v.aplicar(nueva.cambio);
    // La serie se lleva la 4 (la vecina de la nueva) a la bandeja
    await s.aplicar({ guardar: [{ ...structuredClone(s.modelo.eventos.get(s4)!), episodio: "" }], borrar: [] });
    const ch = v.choques().find((c) => c.clase === "sitio");
    if (ch) await v.traer(ch);
    const enE2 = [...v.modelo.eventos.values()].filter((e) => e.episodio === e2);
    expect(enE2.map((e) => e.id)).toContain(nueva.pieza.id);
    const nums = enE2.map((e) => e.orden);
    expect(new Set(nums).size).toBe(nums.length);
  });
});
