import { afterEach, describe, expect, it } from "vitest";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import type { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { crearPieza, escribirPieza } from "../../src/lib/modelo/ficheros";
import { Modelo } from "../../src/lib/modelo/modelo";
import { borrarPieza, editar } from "../../src/lib/modelo/operaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { colocarEscena } from "../../src/lib/vistas/actos";
import { choques, choquesEnDisco, frasesChoque } from "../../src/lib/variantes/choques";
import { notaNormal } from "../../src/lib/variantes/normal";
import { modeloQuedaria } from "../../src/lib/variantes/quedaria";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, RAIZ, serieBasica } from "../consecuencias/ayuda";

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

describe("choques de la variante con la serie (spec 006, RF-28)", () => {
  it("sin cambios en la serie, no hay choques", async () => {
    const { v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    expect(v.choques()).toEqual([]);
  });

  it("de pieza: un campo que cambió solo en la serie, y otro que cambió en los dos lados", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await enSerie(s, s1, (p) => (p.gana = "Algo"));
    const [c1] = v.choques();
    expect(c1).toMatchObject({ clase: "pieza", id: s1, dosLados: [], porDentro: false });
    expect(c1.clase === "pieza" && c1.soloSerie.length).toBe(1);
    await enSerie(s, s1, (p) => (p.titulo = "En la serie"));
    const [c2] = v.choques();
    expect(c2.clase === "pieza" && c2.dosLados).toEqual(["Título"]);
    expect(frasesChoque(c2, (id) => id)).toContain("Título: cambiada en los dos lados");
  });

  it("de pieza «por dentro»: un campo que Atelier no enseña", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await s.aplicar({ guardar: [{ ...structuredClone(s.modelo.eventos.get(s1)!), extra: { campo_mio: "fuera" } } as Pieza], borrar: [] }, true, undefined, { exacto: true });
    expect(v.choques()).toEqual([{ clase: "pieza", id: s1, soloSerie: [], dosLados: [], porDentro: true, yaNoEsta: false, yaExiste: false }]);
  });

  it("un cambio solo de formato (Obsidian pasa las listas a bloque) no es choque", async () => {
    const { s, v, fs, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    const ruta = `${RAIZ}/s/eventos/${s1}.md`;
    await fs.cambiarDesdeFuera(ruta, (await fs.leer(ruta)).replace(/arcos: \[(.*)\]/, "arcos:\n  - $1"));
    await s.releer([ruta]);
    expect(v.choques()).toEqual([]);
    expect(await choquesEnDisco(v.datos, (tipo, id) => fs.leer(`${RAIZ}/s/eventos/${id}.md`).catch(() => null))).toEqual([]);
  });

  it("la fecha de la ficha (wiki_mtime) que pone Atelier no es choque", async () => {
    const { s, v, e1 } = await preparar();
    await v.aplicar(editar(v.modelo, e1, (p) => ((p as PiezaDe<"episodio">).titulo = "En la variante")));
    await s.aplicar({ guardar: [{ ...structuredClone(s.modelo.episodios.get(e1)!), wiki_mtime: "2026-10-21T10:00:00.000Z" }], borrar: [] }, true, undefined, { exacto: true });
    expect(v.choques()).toEqual([]);
  });

  it("de pieza: ya no está en la serie, o una nueva ya existe", async () => {
    const { s, v, s1, s3 } = await preparar();
    await enVariante(v, s3, (p) => (p.titulo = "En la variante"));
    const nueva = crearPieza("evento", { id: "ev-nuev", titulo: "Nueva" });
    await v.aplicar({ guardar: [nueva], borrar: [] });
    await s.aplicar(borrarPieza(s.modelo, s3));
    await s.aplicar({ guardar: [{ ...nueva, titulo: "Del otro equipo" }], borrar: [] });
    const c = v.choques().filter((x) => x.clase === "pieza");
    expect(c).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: s3, yaNoEsta: true }),
        expect.objectContaining({ id: "ev-nuev", yaExiste: true }),
      ]),
    );
    expect(c.some((x) => x.clase === "pieza" && x.id === s1)).toBe(false);
  });

  it("de sitio: la serie cambia las escenas de un episodio que la variante tocó", async () => {
    const { s, v, s1, s3, e2 } = await preparar();
    await v.aplicar(colocarEscena(v.modelo, s1, e2, "", 0));
    expect(v.choques()).toEqual([]);
    await s.aplicar(colocarEscena(s.modelo, s3, e2, ""));
    expect(v.choques()).toEqual(expect.arrayContaining([{ clase: "sitio", contenedor: e2, yaNoEsta: false }]));
  });

  it("de referencia: la variante apunta a una pieza que la serie mandó a la papelera", async () => {
    const { s, v, s4, e2 } = await preparar();
    await enVariante(v, s4, (p) => (p.titulo = "En la variante"));
    await s.aplicar(borrarPieza(s.modelo, e2));
    expect(v.choques()).toEqual(expect.arrayContaining([{ clase: "referencia", id: s4, apunta: e2 }]));
  });

  it("en disco: lo que la vigilancia aún no ha releído también choca", async () => {
    const { v, fs, s1 } = await preparar();
    fs.vigilanciaNativa = false;
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    const ruta = `${RAIZ}/s/eventos/${s1}.md`;
    await fs.cambiarDesdeFuera(ruta, (await fs.leer(ruta)).replace("titulo: Uno", "titulo: Cambiado fuera"));
    expect(v.choques()).toEqual([]);
    const c = await choquesEnDisco(v.datos, (_tipo, id) => fs.leer(`${RAIZ}/s/eventos/${id}.md`).catch(() => null));
    expect(c).toEqual([expect.objectContaining({ clase: "pieza", id: s1, dosLados: ["Título"] })]);
  });

  it("serie grande: los choques de 50 variantes en menos de 300 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    const eventos = [...m.eventos.values()];
    const vs = Array.from({ length: 50 }, (_, i) => {
      const v = variante(`va-${String(i).padStart(4, "0")}`, "x", "");
      for (const ev of eventos.slice(i * 4, i * 4 + 4)) v.piezas.set(ev.id, { tipo: "evento", base: notaNormal(ev), pieza: { ...ev, titulo: `${ev.titulo}!` } });
      return { v, q: modeloQuedaria(m, v) };
    });
    // Que algo haya cambiado en la serie
    m.poner({ ...eventos[0], titulo: "Cambiado en la serie" });
    const t = performance.now();
    let n = 0;
    for (const { v, q } of vs) n += choques(v, m, q).length;
    const ms = performance.now() - t;
    console.log(`Choques de 50 variantes (serie grande): ${ms.toFixed(1)} ms`);
    expect(n).toBe(1);
    expect(ms).toBeLessThan(300);
  });

  it("la base guardada es la nota normalizada de la serie", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    expect(v.datos.piezas.get(s1)!.base).toBe(notaNormal(s.modelo.eventos.get(s1)!));
    expect(v.datos.piezas.get(s1)!.base).toBe(escribirPieza(s.modelo.eventos.get(s1)!));
  });
});
