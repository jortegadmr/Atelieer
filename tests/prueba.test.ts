import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import * as c from "../src/lib/modelo/consultas";
import { Modelo } from "../src/lib/modelo/modelo";
import { crearPrueba } from "../scripts/datos-prueba";
import { generarPruebaGrande } from "../scripts/datos-grande";

const RAIZ = "/Vault/appDatos";

async function preparar() {
  const fs = new FsMemoria();
  await fs.crearDir(RAIZ);
  await crearPrueba(fs, RAIZ);
  const almacen = new Almacen(fs, RAIZ);
  const d = await almacen.abrirSerie("_prueba");
  return { fs, almacen, d, m: new Modelo(d) };
}

describe("serie de prueba (T1.8, M8)", () => {
  it("el almacén la abre sin avisos de formato ni conflictos", async () => {
    const { d } = await preparar();
    expect(d.problemas).toEqual([]);
    expect(d.conflictos).toEqual([]);
  });

  it("tiene lo de la maqueta: 2 temporadas de 8 y una prevista, 6 arcos y uno descartado, 13 eventos, bandeja, 2 secretos", async () => {
    const { m } = await preparar();
    const ts = c.temporadasEnOrden(m);
    expect(ts.map((t) => c.episodiosDeTemporada(m, t.id).length)).toEqual([8, 8, 0]);
    expect(ts[2].estado).toBe("prevista");
    expect(m.arcos.size).toBe(7);
    expect([...m.arcos.values()].filter((a) => a.madurez === "descartado").map((a) => a.titulo)).toEqual(["Nando se va en E05"]);
    expect([...m.eventos.values()].filter((e) => c.estaColocado(m, e))).toHaveLength(13);
    expect(c.bandeja(m, ts[0].id).map((e) => e.titulo)).toEqual(["Subida a la azotea", "Alguien conoce la frecuencia"]);
    expect(m.secretos.size).toBe(2);
  });

  it("las relaciones cuadran: todo id apunta a una pieza que existe", async () => {
    const { m } = await preparar();
    const existe = (id: string, tipo: string) => id === "" || m.pieza(id)?.tipo === tipo;
    for (const a of m.arcos.values()) {
      expect(existe(a.tramo_de, "arco")).toBe(true);
      expect(existe(a.temporada, "temporada")).toBe(true);
      for (const p of [a.inicio, a.fin, a.bomba_vence, ...a.beats]) {
        expect(existe(p.temporada, "temporada")).toBe(true);
        expect(existe(p.episodio, "episodio")).toBe(true);
      }
    }
    for (const e of m.eventos.values()) {
      expect(existe(e.temporada, "temporada") && e.temporada !== "").toBe(true);
      expect(existe(e.episodio, "episodio")).toBe(true);
      for (const { arco } of e.arcos) expect(existe(arco, "arco")).toBe(true);
    }
    for (const s of m.secretos.values()) {
      expect(existe(s.revelado_en.episodio, "episodio")).toBe(true);
      for (const p of [...s.pistas, ...s.falsas]) expect(existe(p.episodio, "episodio")).toBe(true);
    }
    for (const t of m.temporadas.values()) expect(existe(t.principal, "arco")).toBe(true);
    for (const p of m.puntos.values()) expect(existe(p.posicion.temporada, "temporada")).toBe(true);
  });

  it("La tormenta es tramo de El eco y la leyenda del Faro Ciego ocurre en C1", async () => {
    const { m } = await preparar();
    const ven = [...m.arcos.values()].find((a) => a.titulo === "El eco")!;
    expect(c.tramos(m, ven.id).map((a) => a.titulo)).toEqual(["La tormenta"]);
    const leyenda = [...m.eventos.values()].find((e) => e.titulo.startsWith("La leyenda"))!;
    expect(leyenda.mundo).toBe("[[C1]]");
    expect(leyenda.modo).toBe("leyenda");
    expect(c.codigo(m, leyenda.episodio)).toBe("T01E06");
  });

  it("crea la wiki falsa con la forma de la de Cabo Sal; Don Anselmo no tiene ficha", async () => {
    const { fs } = await preparar();
    const w = `${RAIZ}/_prueba/_wiki`;
    for (const n of ["Telmo", "Nando", "Sabela", "El Alcalde", "La madre"]) {
      const ficha = await fs.leer(`${w}/02_Personajes/Personajes/${n}.md`);
      expect(ficha).toContain("### Motor interno");
      expect(ficha).toContain("| Quiere (objetivo consciente) |");
    }
    expect(await fs.existe(`${w}/02_Personajes/Personajes/Don Anselmo.md`)).toBe(false);
    for (const n of ["Casa del Muelle", "Lonja vieja", "Torre de la emisora", "El Ayuntamiento", "Paso del Espigón"]) {
      expect(await fs.existe(`${w}/03_Mundo/Lugares/${n}.md`)).toBe(true);
    }
    expect(await fs.leer(`${w}/03_Mundo/Timeline.md`)).toMatch(/\| C1 \|/);
    expect(await fs.existe(`${w}/01_Narrativa`)).toBe(true);
    expect(await fs.leer(`${w}/Log.md`)).toMatch(/^# Log/);
  });

  it("no pisa una serie que ya existe; con rehacer, la rehace y deja lo demás", async () => {
    const { fs } = await preparar();
    await fs.escribir(`${RAIZ}/_prueba/enlace.md`, "de T0.4");
    await expect(crearPrueba(fs, RAIZ)).rejects.toThrow(/ya existe/);
    await fs.escribir(`${RAIZ}/_prueba/eventos/ev-suelto.md`, "---\nid: ev-suelto\ntipo: evento\n---\n");
    await crearPrueba(fs, RAIZ, { rehacer: true });
    expect(await fs.leer(`${RAIZ}/_prueba/enlace.md`)).toBe("de T0.4");
    expect(await fs.existe(`${RAIZ}/_prueba/eventos/ev-suelto.md`)).toBe(false);
    const d = await new Almacen(fs, RAIZ).abrirSerie("_prueba");
    expect(d.eventos).toHaveLength(15);
  });
});

describe("serie grande de rendimiento (M7)", () => {
  it("5 temporadas × 10 episodios × 300 eventos por temporada", () => {
    const d = generarPruebaGrande();
    const m = new Modelo(d);
    expect(c.temporadasEnOrden(m)).toHaveLength(5);
    expect(c.episodiosEnOrden(m)).toHaveLength(50);
    expect(m.eventos.size).toBe(1500);
    for (const t of c.temporadasEnOrden(m)) {
      expect([...m.eventos.values()].filter((e) => e.temporada === t.id)).toHaveLength(300);
    }
  });

  it("sale siempre igual (semilla fija)", () => {
    const a = generarPruebaGrande();
    const b = generarPruebaGrande();
    expect(a.eventos.map((e) => e.id)).toEqual(b.eventos.map((e) => e.id));
  });
});
