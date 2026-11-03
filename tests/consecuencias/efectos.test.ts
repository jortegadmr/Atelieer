import { describe, expect, it } from "vitest";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import { comprobar } from "../../src/lib/comprobaciones";
import { Comparacion } from "../../src/lib/consecuencias/comparacion";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { efectos } from "../../src/lib/consecuencias/efectos";
import { GUIA_INICIAL } from "../../src/lib/guia/guia-inicial";
import { leerGuia } from "../../src/lib/guia/guia-md";
import { Modelo } from "../../src/lib/modelo/modelo";
import { moverEvento } from "../../src/lib/modelo/operaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { serieBasica } from "./ayuda";

const guia = leerGuia(GUIA_INICIAL);
const nunca = () => false;

/** Copia la pieza, le aplica `fn`, la pone y la apunta en la comparación como del autor */
function cambiar<P extends Pieza>(m: Modelo, comp: Comparacion | null, id: string, fn: (p: P) => unknown, origen: "autor" | "fuera" = "autor") {
  const p = structuredClone(m.pieza(id)) as P;
  fn(p);
  m.poner(p);
  comp?.anotar([id], origen);
}

/** Serie básica con la trama A completa (sin C03) y la escena 3 con C02; abierta, la trama */
function preparar() {
  const x = serieBasica();
  const m = x.b.modelo();
  cambiar<PiezaDe<"arco">>(m, null, x.a, (p) => {
    p.quiere = "Evitar la desgracia";
    p.gana = "Paz";
    p.pierde = "La familia";
    p.bomba = "La boda";
  });
  cambiar<PiezaDe<"evento">>(m, null, x.s3, (p) => (p.cambio = ["+", "+"]));
  const comp = new Comparacion(x.a, copiaModelo(m), comprobar(m).avisos);
  return { ...x, m, comp };
}

describe("efectos de «Si lo dejas así…» (spec 005)", () => {
  it("los cuatro grupos, con los avisos de la abierta primero, total y conAviso", () => {
    const { m, comp, a, s2, s3 } = preparar();
    cambiar<PiezaDe<"evento">>(m, comp, s2, (p) => (p.cambio = ["+", "+"]));
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.quiere = ""));
    cambiar<PiezaDe<"evento">>(m, comp, s3, (p) => (p.cambio = ["+", "-"]));
    const e = efectos(comp, m, comprobar(m), guia, nunca);
    expect(e.avisosNuevos.map((x) => [x.aviso.id, x.aviso.pieza, x.deOtra])).toEqual([
      ["C03", a, false],
      ["C02", s2, true],
    ]);
    expect(e.afectadas.map((x) => x.id)).toEqual([s2, s3]);
    expect(e.cambios).toEqual(["Qué quiere y por qué: Evitar la desgracia → vacío"]);
    expect(e.yaNoAvisan.map((x) => [x.aviso.id, x.aviso.pieza, x.deOtra])).toEqual([["C02", s3, true]]);
    expect(e.total).toBe(2 + 2 + 1);
    expect(e.conAviso).toBe(true);
    expect(e.puedeVolver).toBe(true);
  });

  it("un aviso compartido lleva todas sus reglas, y «Ir al campo» va al de la primera en la tabla", () => {
    const { m, comp, a } = preparar();
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.bomba = ""));
    const [x] = efectos(comp, m, comprobar(m), guia, nunca).avisosNuevos;
    expect(x.reglas.map((r) => r.id)).toEqual(["G07", "G08", "G10"]);
    expect(x.campo).toBe("arco.quiere");
  });

  it("sin «Ir al campo» si la abierta es canon bloqueado o el aviso es de otra pieza", () => {
    const { m, comp, a, s2 } = preparar();
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.bomba = ""));
    cambiar<PiezaDe<"evento">>(m, comp, s2, (p) => (p.cambio = ["+", "+"]));
    const e = efectos(comp, m, comprobar(m), guia, (id) => id === a);
    expect(e.avisosNuevos.map((x) => x.campo)).toEqual([undefined, undefined]);
  });

  it("sin guía, los avisos salen sin reglas", () => {
    const { m, comp, a } = preparar();
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.bomba = ""));
    const [x] = efectos(comp, m, comprobar(m), null, nunca).avisosNuevos;
    expect(x.reglas).toEqual([]);
    expect(x.campo).toBeUndefined();
  });

  it("nada ha cambiado: grupos vacíos, total 0 y no se puede volver", () => {
    const { m, comp, a } = preparar();
    // Escribir y borrar: la pieza no es la misma, pero se ve igual
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.gana = "Otra"));
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.gana = "Paz"));
    const e = efectos(comp, m, comprobar(m), guia, nunca);
    expect(e).toMatchObject({ avisosNuevos: [], afectadas: [], cambios: [], yaNoAvisan: [], total: 0, conAviso: false, puedeVolver: false });
  });

  it("la abierta cambiada fuera de Atelier lo dice; lo de otra pieza de fuera no se puede volver", () => {
    const { m, comp, a, s1 } = preparar();
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.titulo = "Revancha"), "fuera");
    const e = efectos(comp, m, comprobar(m), guia, nunca);
    expect(e.abiertaDeFuera).toBe("fuera");
    expect(e.cambios).toEqual(["Título: El eco → Revancha"]);
    const otro = preparar();
    cambiar<PiezaDe<"evento">>(otro.m, otro.comp, s1, (p) => (p.titulo = "Otro"), "fuera");
    const f = efectos(otro.comp, otro.m, comprobar(otro.m), guia, nunca);
    expect(f.puedeVolver).toBe(false);
    expect(f.afectadas.map((x) => x.deFuera)).toEqual(["fuera"]);
  });

  it("solo la abierta cambiada fuera: no se ofrece volver (RF-17, RF-22)", () => {
    const { m, comp, a } = preparar();
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.titulo = "Revancha"), "fuera");
    expect(efectos(comp, m, comprobar(m), guia, nunca).puedeVolver).toBe(false);
  });

  it("la fecha de la ficha (wiki_mtime) que pone Atelier no es un cambio: ni se puede volver ni «Cambió su nota»", () => {
    const { m, comp, a, t } = preparar();
    cambiar<PiezaDe<"arco">>(m, comp, a, (p) => (p.wiki_mtime = "2026-10-21T10:00:00.000Z"));
    cambiar<PiezaDe<"temporada">>(m, comp, t, (p) => (p.wiki_mtime = "2026-10-21T10:00:00.000Z"));
    const e = efectos(comp, m, comprobar(m), guia, nunca);
    expect(e).toMatchObject({ afectadas: [], cambios: [], total: 0, puedeVolver: false });
  });

  it("serie grande: editar un título en menos de 30 ms y mover una escena en menos de 200 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    const ep = [...m.episodios.values()][3];
    const comp = new Comparacion(ep.id, copiaModelo(m), comprobar(m).avisos);
    // Como en la 002: se calienta y se toma la media; cada vuelta es una edición nueva (otra versión del modelo)
    const media = (veces: number, editar: (i: number) => void) => {
      let total = 0;
      for (let i = 0; i <= veces; i++) {
        editar(i);
        const r = comprobar(m);
        const inicio = performance.now();
        efectos(comp, m, r, guia, nunca);
        if (i > 0) total += performance.now() - inicio;
      }
      return total / veces;
    };
    expect(media(5, (i) => cambiar<PiezaDe<"episodio">>(m, comp, ep.id, (p) => (p.titulo = `Otro título ${i}`)))).toBeLessThan(30);

    const destinos = [...m.episodios.values()].slice(4, 10);
    const ms = media(5, (i) => {
      const escena = [...m.eventos.values()].find((e) => e.episodio === ep.id)!;
      const cambio = moverEvento(m, escena.id, destinos[i].id, 0);
      for (const p of cambio.guardar) m.poner(p);
      comp.anotar(
        cambio.guardar.map((p) => p.id),
        "autor",
      );
    });
    expect(ms).toBeLessThan(200);
    expect(efectos(comp, m, comprobar(m), guia, nunca).afectadas.length).toBeGreaterThan(0);
  });
});
