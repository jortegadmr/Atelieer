import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { crearPieza, crearIdea } from "../src/lib/vistas/crear";
import type { Nivel } from "../src/lib/vistas/visor";
import { guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 002: la idea capturada queda en la mesa, se deshace a la papelera y la
// v1.0 la lee igual (RF-38, RF-43, RF-44, RNF compatibilidad).

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

async function abrir() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s };
}

const enT1: Nivel = { tipo: "temporada", temporada: "te-t001" };
const RAROS = 'Telmo: "no es mío" --- # duda [[Acuerdo]] \'sí\' - [x] {a: b}';

async function capturar(s: Sesion, texto: string, nivel: Nivel = enT1) {
  const r = crearIdea(s.modelo, nivel, texto, (id) => s.estaBloqueada(id));
  if (!r || "error" in r) throw new Error("no se creó");
  await s.aplicar(r.cambio);
  return r.pieza.id;
}

describe("la idea en la mesa", () => {
  it("queda escrita en appDatos en menos de 2 s", async () => {
    const { fs, s } = await abrir();
    const inicio = Date.now();
    const id = await capturar(s, "Telmo duda");
    const ruta = s.almacen.rutaPieza(s.carpeta, { tipo: "evento", id });
    await expect.poll(() => fs.existe(ruta), { timeout: 2000, interval: 50 }).toBe(true);
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(await fs.leer(ruta)).toContain("titulo: Telmo duda");
  });

  it("en una temporada canon bloqueada también entra (en su bandeja)", async () => {
    const { s } = await abrir();
    await s.cambiarEstado("te-t001", "canon");
    expect(s.estaBloqueada("te-t001")).toBe(true);
    const id = await capturar(s, "Aunque sea canon");
    expect(s.modelo.eventos.get(id)?.episodio).toBe("");
  });
});

describe("deshacer la idea (RF-43)", () => {
  it("si es lo último que se hizo, se deshace (y se puede rehacer)", async () => {
    const { s } = await abrir();
    const id = await capturar(s, "Uno");
    await s.deshacerCreacion(id);
    expect(s.modelo.eventos.has(id)).toBe(false);
    expect(s.historial.puedeRehacer).toBe(true);
  });

  it("si después se hizo otra cosa, solo ella va a la papelera y lo otro se queda", async () => {
    const { fs, s } = await abrir();
    const id = await capturar(s, "Uno");
    await s.guardado.vaciar();
    const otra = await capturar(s, "Dos");
    await s.deshacerCreacion(id);
    expect(s.modelo.eventos.has(id)).toBe(false);
    expect(s.modelo.eventos.has(otra)).toBe(true);
    const papelera = (await fs.listar(`${s.ruta}/_papelera`)).map((e) => e.nombre);
    expect(papelera.some((n) => n.includes(id))).toBe(true);
  });

  it("si ya no existe, no hace nada", async () => {
    const { s } = await abrir();
    const id = await capturar(s, "Uno");
    await s.deshacer();
    const pasos = s.historial.puedeDeshacer;
    await s.deshacerCreacion(id);
    expect(s.historial.puedeDeshacer).toBe(pasos);
  });
});

describe("la v1.0 lee lo creado en esta entrega (constitución 9)", () => {
  it("la idea con caracteres raros: la v1.0 la lee igual y al guardarla no cambia", async () => {
    const { s } = await abrir();
    const id = await capturar(s, RAROS);
    const ev = s.modelo.eventos.get(id)!;
    const texto = escribirPieza(ev);
    const v1 = leidoPorV1(texto, "evento");
    expect(v1.titulo).toBe(RAROS);
    expect([v1.episodio, v1.temporada, v1.madurez]).toEqual(["", "te-t001", "idea"]);
    expect(leerPieza(guardadoPorV1(texto, "evento"), "evento")).toEqual(leerPieza(texto, "evento"));
  });

  it("el fichero que queda en disco: la v1.0 lo lee con su título tal cual", async () => {
    const { fs, s } = await abrir();
    const id = await capturar(s, RAROS);
    await s.guardado.vaciar();
    const texto = await fs.leer(s.almacen.rutaPieza(s.carpeta, { tipo: "evento", id }));
    const v1 = leidoPorV1(texto, "evento");
    expect([v1.id, v1.titulo, v1.temporada, v1.madurez]).toEqual([id, RAROS, "te-t001", "idea"]);
  });

  it("la idea deshecha a la papelera: la v1.0 la sigue leyendo igual", async () => {
    const { fs, s } = await abrir();
    const id = await capturar(s, RAROS);
    await s.guardado.vaciar();
    await capturar(s, "Otra cosa después");
    await s.deshacerCreacion(id);
    await s.guardado.vaciar();
    const papelera = `${s.ruta}/_papelera`;
    const fichero = (await fs.listar(papelera)).find((e) => e.nombre.includes(id))!;
    const v1 = leidoPorV1(await fs.leer(`${papelera}/${fichero.nombre}`), "evento");
    expect([v1.id, v1.titulo, v1.madurez]).toEqual([id, RAROS, "idea"]);
  });

  it("las piezas de «Nuevo…» con título raro: la v1.0 las lee igual", async () => {
    const { s } = await abrir();
    const serie: Nivel = { tipo: "serie" };
    const casos = [
      crearPieza(s.modelo, serie, "temporada", { titulo: RAROS }),
      crearPieza(s.modelo, serie, "trama", { titulo: RAROS, tipoArco: "personaje" }),
      crearPieza(s.modelo, serie, "secreto", { titulo: RAROS }),
      crearPieza(s.modelo, enT1, "episodio", { titulo: RAROS }),
      crearPieza(s.modelo, enT1, "trama-temporada", { titulo: RAROS, tramoDe: "ar-ecos" }),
      crearPieza(s.modelo, { tipo: "episodio", temporada: "te-t001", episodio: "ep-a103" }, "evento", { titulo: RAROS }),
    ];
    for (const { pieza } of casos) {
      const texto = escribirPieza(pieza);
      expect(leidoPorV1(texto, pieza.tipo).titulo, pieza.tipo).toBe(RAROS);
      expect(leerPieza(guardadoPorV1(texto, pieza.tipo), pieza.tipo), pieza.tipo).toEqual(leerPieza(texto, pieza.tipo));
    }
  });
});
