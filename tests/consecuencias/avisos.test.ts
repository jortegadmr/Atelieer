import { describe, expect, it } from "vitest";
import { comprobar, type Aviso } from "../../src/lib/comprobaciones";
import { claveAviso, compararAvisos } from "../../src/lib/consecuencias/avisos";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import type { Modelo } from "../../src/lib/modelo/modelo";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { Constructor } from "../fixtures/constructor";
import { serieBasica } from "./ayuda";

/** Copia la pieza, le aplica `fn` y la pone (como Sesion.editar, sin disco) */
const cambiar = (m: Modelo, id: string, fn: (p: never) => unknown) => {
  const p = structuredClone(m.pieza(id)) as Pieza;
  fn(p as never);
  m.poner(p);
};
const ids = (l: Aviso[]) => l.map((a) => `${a.id}@${a.pieza}${a.sobre ? `:${a.sobre}` : ""}`);

describe("avisos que saltan y que dejan de saltar (spec 005)", () => {
  it("renombrar una escena no hace saltar ni dejar de saltar su aviso", () => {
    const { b, s1 } = serieBasica();
    const m = b.modelo();
    cambiar(m, s1, (p: { cambio: [string, string] }) => (p.cambio = ["+", "+"]));
    const antes = comprobar(m).avisos;
    expect(antes.some((a) => a.id === "C02" && a.pieza === s1)).toBe(true);
    cambiar(m, s1, (p: { titulo: string }) => (p.titulo = "Otro título"));
    const r = compararAvisos(antes, comprobar(m), m);
    expect(r.saltan.filter((a) => a.pieza === s1)).toEqual([]);
    expect(r.dejan).toEqual([]);
  });

  it("C13 de inicio y de fin son dos avisos distintos", () => {
    const { b, a, e1, e2, t } = serieBasica();
    const m = b.modelo();
    // Abre en e1 y cierra en e2; a mano, al revés
    cambiar(m, a, (p: { inicio: { temporada: string; episodio: string }; fin: { temporada: string; episodio: string } }) => {
      p.inicio = { ...p.inicio, temporada: t, episodio: e2 };
      p.fin = { ...p.fin, temporada: t, episodio: e1 };
    });
    const c13 = comprobar(m).avisos.filter((x) => x.id === "C13");
    expect(c13.map((x) => x.sobre)).toEqual(["inicio", "fin"]);
    expect(new Set(c13.map(claveAviso)).size).toBe(2);
  });

  it("C06 que arranca antes y se resuelve después en la misma temporada son dos", () => {
    const k = (sobre: string): Aviso => ({ id: "C06", pieza: "ar-1", clase: "aviso", mensaje: "", fuente: "", grupo: "Tramas", sobre });
    expect(claveAviso(k("te-1 arranca"))).not.toBe(claveAviso(k("te-1 resuelve")));
  });

  it("C07 de T01 que se va y C07 de T02 que llega son dos entradas, no se anulan", () => {
    const k = (sobre: string): Aviso => ({ id: "C07", pieza: "ar-1", clase: "sugerencia", mensaje: "", fuente: "", grupo: "Tramas", sobre });
    const m = new Constructor().modelo();
    const r = compararAvisos([k("te-1")], { avisos: [k("te-2")], silenciados: [] }, m);
    expect(r.saltan.map((a) => a.sobre)).toEqual(["te-2"]);
    // ar-1 no existe en este modelo: sus avisos se cuentan por la papelera, no aquí
    expect(r.dejan).toEqual([]);
  });

  it("dos avisos iguales en la misma pieza cuentan uno a uno", () => {
    const a: Aviso = { id: "C99", pieza: "se-prueba", clase: "aviso", mensaje: "uno", fuente: "", grupo: "Serie" };
    const m = new Constructor().modelo();
    const r = compararAvisos([a], { avisos: [a, { ...a, mensaje: "dos" }], silenciados: [] }, m);
    expect(r.saltan.map((x) => x.mensaje)).toEqual(["dos"]);
    const r2 = compararAvisos([a, a], { avisos: [a], silenciados: [] }, m);
    expect(r2.dejan).toHaveLength(1);
  });

  it("silenciar o aparcar no es «ya no avisa»; arreglarlo, sí", () => {
    const { b, s1, s2, s3 } = serieBasica();
    const m = b.modelo();
    for (const id of [s1, s2, s3]) cambiar(m, id, (p: { cambio: [string, string] }) => (p.cambio = ["+", "+"]));
    const base = copiaModelo(m);
    const antes = comprobar(base).avisos;
    cambiar(m, s1, (p: { avisos_silenciados: string[] }) => p.avisos_silenciados.push("C02"));
    cambiar(m, s2, (p: { madurez: string; madurez_mesa: string }) => {
      p.madurez = "idea";
      p.madurez_mesa = "aparcado";
    });
    cambiar(m, s3, (p: { cambio: [string, string] }) => (p.cambio = ["+", "-"]));
    const r = compararAvisos(antes, comprobar(m), m);
    expect(ids(r.silenciados.filter((a) => a.id === "C02"))).toEqual([`C02@${s1}`]);
    expect(r.sinComprobar.some((a) => a.id === "C02" && a.pieza === s2)).toBe(true);
    expect(ids(r.dejan.filter((a) => a.id === "C02"))).toEqual([`C02@${s3}`]);
  });
});
