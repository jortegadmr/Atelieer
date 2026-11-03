import { describe, expect, it } from "vitest";
import * as c from "../src/lib/modelo/consultas";
import { columnas, type Nivel } from "../src/lib/vistas/visor";
import { generarPruebaGrande } from "../scripts/datos-grande";
import { comprobar } from "../src/lib/comprobaciones";
import { Modelo } from "../src/lib/modelo/modelo";
import { columnasHistoria } from "../src/lib/vistas/historia";
import type { Epoca } from "../src/lib/wiki/fichas";
import { Constructor } from "./fixtures/constructor";

describe("rendimiento (spec 12, M7)", () => {
  it("las 19 comprobaciones sobre 1.500 eventos en menos de 100 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    comprobar(m); // calentar
    const veces = 5;
    const inicio = performance.now();
    let n = 0;
    for (let i = 0; i < veces; i++) {
      m.version++; // como si algo hubiera cambiado: sin caché del índice
      n = comprobar(m).avisos.length;
    }
    const ms = (performance.now() - inicio) / veces;
    console.log(`Comprobaciones sobre ${m.eventos.size} eventos: ${ms.toFixed(1)} ms (${n} avisos)`);
    expect(ms).toBeLessThan(100);
  });
});

describe("rendimiento del visor (spec 002, RNF)", () => {
  it("las columnas de los tres niveles sobre la serie grande en menos de 100 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    const avisos = comprobar(m).avisos;
    const t = c.temporadasEnOrden(m)[0];
    const ep = c.episodiosDeTemporada(m, t.id)[0];
    const niveles: Nivel[] = [{ tipo: "serie" }, { tipo: "temporada", temporada: t.id }, { tipo: "episodio", temporada: t.id, episodio: ep.id }];
    const inicio = performance.now();
    for (const n of niveles) {
      m.version++;
      columnas(m, n, avisos);
    }
    const ms = performance.now() - inicio;
    console.log(`Columnas del visor en los tres niveles: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(100);
  });
});

describe("rendimiento de la línea de la historia (spec 009, RNF)", () => {
  it("300 escenas y 30 épocas: abrir y filtrar en menos de 200 ms", () => {
    const b = new Constructor();
    const ts = Array.from({ length: 5 }, () => b.temporada({}, 6));
    const epocas: Epoca[] = Array.from({ length: 30 }, (_, i) => ({ nombre: `Época ${i}`, claves: new Set([`epoca ${i}`]), ruta: "", presente: false }));
    for (let i = 0; i < 300; i++) {
      const t = ts[i % 5];
      b.evento({ episodio: t.eps[i % 6], mundo: i % 7 ? `[[Época ${i % 30}]]` : "" });
    }
    const m = b.modelo();
    const fuente = { epocas: () => epocas, esPresente: (s: string) => !s };
    const inicio = performance.now();
    const cols = columnasHistoria(m, fuente, "");
    columnasHistoria(m, fuente, ts[2].id);
    const ms = performance.now() - inicio;
    console.log(`Línea de la historia con 300 escenas y 30 épocas: ${ms.toFixed(1)} ms`);
    expect(cols.reduce((n, x) => n + x.escenas.length, 0)).toBe(300);
    expect(ms).toBeLessThan(200);
  });
});
