import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { crearEvento, moverEvento } from "../src/lib/modelo/operaciones";
import type { Evento } from "../src/lib/modelo/tipos";
import { guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 003, RNF integridad (constitución 2): un acto o un cambio de valor
// escritos a mano que la app no entiende se conservan tal cual.

const nota = (props: string) => `---\nid: ev-1\ntipo: evento\ntitulo: Uno\n${props}\n---\n`;
const leer = (texto: string) => leerPieza(texto, "evento") as Evento;

describe("acto y cambio escritos a mano", () => {
  it("un acto desconocido se lee como sin acto y se conserva al guardar", () => {
    const ev = leer(nota("acto: prólogo"));
    expect(ev.acto).toBe("");
    expect(escribirPieza(ev)).toContain("acto: prólogo");
  });

  it("un cambio raro se lee como sin cambio y se conserva al guardar", () => {
    for (const raro of ["[sube, baja]", '"+ → −"', '["+", "-", "+"]']) {
      const ev = leer(nota(`cambio: ${raro}`));
      expect(ev.crudos?.cambio, raro).toBeDefined();
      expect(leer(escribirPieza(ev)).crudos?.cambio, raro).toEqual(leer(nota(`cambio: ${raro}`)).crudos?.cambio);
      expect(escribirPieza(ev), raro).not.toMatch(/cambio: \[\s*"?"?,\s*"?"?\s*\]/);
    }
  });

  it("lo que sí se entiende no se guarda aparte (también − y mayúsculas)", () => {
    for (const bien of ["acto: Teaser", "acto: 2", "cambio: [+, −]", 'cambio: ["", +]', "acto: ''"]) {
      expect(leer(nota(bien)).crudos, bien).toBeUndefined();
    }
  });

  it("al renumerar la escena (cambia su orden), el valor a mano se conserva", () => {
    const ev = leer(nota("orden: 3\nacto: prólogo\ncambio: [sube, baja]"));
    const otra = { ...structuredClone(ev), orden: 1 };
    const texto = escribirPieza(otra);
    expect(texto).toContain("acto: prólogo");
    expect(texto).toMatch(/cambio: \[\s*sube,\s*baja\s*\]/);
    expect(texto).toContain("orden: 1");
  });

  it("si el autor le pone un acto, se escribe el nuevo", () => {
    const ev = leer(nota("acto: prólogo"));
    expect(escribirPieza({ ...ev, acto: "2" })).toContain('acto: "2"');
  });

  it("la v1.0 lee la nota como antes y, al guardarla, la v2 sigue viendo el valor a mano", () => {
    const texto = escribirPieza(leer(nota("acto: prólogo\ncambio: [sube, baja]")));
    const v1 = leidoPorV1(texto, "evento");
    expect([v1.acto, v1.cambio]).toEqual(["", ["", ""]]);
    expect(leer(texto).crudos).toEqual({ acto: "prólogo", cambio: ["sube", "baja"] });
    // La v1.0 sí lo pierde si guarda la nota: no se puede arreglar en ella (congelada)
    expect(guardadoPorV1(texto, "evento")).not.toContain("prólogo");
  });

  it("madurez y madurez_mesa desconocidos siguen como en la spec 001", () => {
    const ev = leer(nota("madurez: en pausa\nmadurez_mesa: quizá"));
    expect([ev.madurez, ev.madurez_mesa]).toEqual(["idea", ""]);
    const texto = escribirPieza(ev);
    expect(texto).toContain("madurez: en pausa");
    expect(texto).toContain("madurez_mesa: quizá");
    expect(escribirPieza({ ...ev, madurez: "borrador" })).toContain("madurez: borrador");
  });
});

describe("el valor a mano no resucita (Sesion.aplicar)", () => {
  let abiertas: Sesion[] = [];
  afterEach(async () => {
    for (const s of abiertas) await s.cerrar();
    abiertas = [];
  });

  // Borrador (no canon): se puede editar y mover
  const ID = "ev-e002";

  async function conActoRaro() {
    const fs = await vaultDePrueba();
    const almacen = new Almacen(fs, APPDATOS);
    const ruta = almacen.rutaPieza("_prueba", { tipo: "evento", id: ID });
    await fs.escribir(ruta, (await fs.leer(ruta)).replace(/^acto:.*$/m, "acto: prólogo"));
    const s = await Sesion.abrir(almacen, "_prueba", "PC");
    abiertas.push(s);
    return { fs, s, ruta };
  }

  it("la nota de prueba tiene el acto a mano", async () => {
    const { s } = await conActoRaro();
    expect(s.modelo.eventos.get(ID)?.crudos?.acto).toBe("prólogo");
  });

  it("poner acto 2 y quitarlo no vuelve a escribir el valor a mano", async () => {
    const { fs, s, ruta } = await conActoRaro();
    s.editar<Evento>(ID, (e) => (e.acto = "2"));
    await s.guardado.vaciar();
    s.editar<Evento>(ID, (e) => (e.acto = ""));
    await s.guardado.vaciar();
    expect(await fs.leer(ruta)).not.toContain("prólogo");
  });

  it("deshacer el cambio de acto sí lo devuelve", async () => {
    const { fs, s, ruta } = await conActoRaro();
    await s.aplicar(
      (() => {
        const ev = structuredClone(s.modelo.eventos.get(ID)!);
        ev.acto = "2";
        return { guardar: [ev], borrar: [] };
      })(),
    );
    await s.deshacer();
    await s.guardado.vaciar();
    expect(await fs.leer(ruta)).toContain("acto: prólogo");
  });

  it("mover otra escena del mismo episodio la renumera sin perder su valor a mano", async () => {
    const { fs, s, ruta } = await conActoRaro();
    const ev = s.modelo.eventos.get(ID)!;
    const nueva = crearEvento(s.modelo, { titulo: "Nueva", temporada: ev.temporada, episodio: ev.episodio });
    await s.aplicar(nueva.cambio);
    await s.aplicar(moverEvento(s.modelo, nueva.pieza.id, ev.episodio, 0));
    expect(s.modelo.eventos.get(ID)!.orden).not.toBe(ev.orden);
    await s.guardado.vaciar();
    expect(await fs.leer(ruta)).toContain("acto: prólogo");
  });
});
