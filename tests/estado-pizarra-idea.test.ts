import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import * as c from "../src/lib/modelo/consultas";
import type { Tarjeta } from "../src/lib/pizarra/tipos";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 012, T9: «Pasar a idea» desde una nota de la pizarra (RF-16 a RF-20).

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir(): Promise<{ e: EstadoApp; fs: FsMemoria }> {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  e.cambiarVista("pizarra");
  await e.pizarra.abrir();
  return { e, fs };
}

function notaConTexto(e: EstadoApp, texto: string): string {
  const r = e.pizarra.crearNota({ x: 10, y: 20 });
  if ("error" in r) throw new Error(r.error);
  e.pizarra.editarNota(r.id, texto);
  return r.id;
}

const tarjetas = (e: EstadoApp) => e.pizarra.pizarra.elementos.filter((x): x is Tarjeta => x.tipo === "tarjeta");
const ok = <T>(r: T): Exclude<T, { error: string }> => {
  if (typeof r === "object" && r !== null && "error" in r) throw new Error((r as { error: string }).error);
  return r as Exclude<T, { error: string }>;
};

describe("Pasar a idea (spec 012, T9)", () => {
  it("crea un evento en idea en la bandeja de la temporada en marcha, o de la última, y su tarjeta unida a la nota", async () => {
    const { e } = await abrir();
    const m = e.sesionSerie!.modelo;
    const ts = c.temporadasEnOrden(m);
    const destino = (ts.find((t) => t.estado === "en marcha") ?? ts.at(-1))!;
    const n = notaConTexto(e, "Telmo duda");
    const r = ok(await e.pasarAIdea(n, "Telmo duda"));
    expect(r.nueva).toBe(true);
    const ev = m.eventos.get(r.idea)!;
    expect(ev.titulo).toBe("Telmo duda");
    expect(ev.madurez).toBe("idea");
    expect(ev.temporada).toBe(destino.id);
    expect(ev.episodio).toBe("");
    expect(r.donde).toBe(`Idea en la bandeja de ${c.codigo(m, destino.id)}`);
    const [t] = tarjetas(e);
    expect(t).toMatchObject({ pieza: r.idea, origen: n });
    expect(e.pizarra.pizarra.flechas).toMatchObject([{ de: n, a: t.id }]);
    // La nota se conserva y la tostada deja deshacer la pieza
    expect(e.pizarra.pizarra.elementos.some((x) => x.id === n)).toBe(true);
    expect(e.tostada?.idea).toBe(r.idea);
  });

  it("tarjeta y flecha son un solo paso de la pizarra; la pieza es de la app", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "Algo");
    const r = ok(await e.pasarAIdea(n, "Algo"));
    expect(e.pizarra.deshacer()).toBe(true);
    expect(tarjetas(e)).toHaveLength(0);
    expect(e.pizarra.pizarra.flechas).toHaveLength(0);
    expect(e.sesionSerie!.modelo.eventos.has(r.idea)).toBe(true);
    expect(e.pizarra.pizarra.elementos.some((x) => x.id === n)).toBe(true);
  });

  it("sin temporada dice «Crea primero una temporada» y no cambia nada", async () => {
    const { e } = await abrir();
    for (const t of [...e.sesionSerie!.modelo.temporadas.keys()]) e.sesionSerie!.modelo.quitar(t);
    const n = notaConTexto(e, "Algo");
    const antes = e.pizarra.pizarra;
    const eventos = e.sesionSerie!.modelo.eventos.size;
    expect(await e.pasarAIdea(n, "Algo")).toEqual({ error: "Crea primero una temporada" });
    expect(e.pizarra.pizarra).toBe(antes);
    expect(e.sesionSerie!.modelo.eventos.size).toBe(eventos);
  });

  it("el título se limpia: una línea y como mucho 300", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "x");
    const r = ok(await e.pasarAIdea(n, `Uno\ndos\t${"a".repeat(400)}`));
    const titulo = e.sesionSerie!.modelo.eventos.get(r.idea)!.titulo;
    expect(titulo).not.toMatch(/[\n\t]/);
    expect(Array.from(titulo)).toHaveLength(300);
    expect(e.tostada?.texto).toMatch(/Recortada a 300 caracteres/);
  });

  it("un título vacío no crea nada", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "x");
    const eventos = e.sesionSerie!.modelo.eventos.size;
    expect(await e.pasarAIdea(n, "   ")).toMatchObject({ error: expect.any(String) });
    expect(e.sesionSerie!.modelo.eventos.size).toBe(eventos);
    expect(tarjetas(e)).toHaveLength(0);
  });

  it("si la nota ya tiene una tarjeta nacida de ella y su pieza existe, ofrece abrirla en lugar de crear otra", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "Una");
    const primera = ok(await e.pasarAIdea(n, "Una"));
    const eventos = e.sesionSerie!.modelo.eventos.size;
    const segunda = ok(await e.pasarAIdea(n, "Una"));
    expect(segunda).toMatchObject({ idea: primera.idea, nueva: false });
    expect(e.sesionSerie!.modelo.eventos.size).toBe(eventos);
    expect(tarjetas(e)).toHaveLength(1);
  });

  it("si la pieza de esa tarjeta ya no existe, crea otra", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "Una");
    const primera = ok(await e.pasarAIdea(n, "Una"));
    await e.deshacerIdea();
    expect(e.sesionSerie!.modelo.pieza(primera.idea)).toBeFalsy();
    const segunda = ok(await e.pasarAIdea(n, "Una otra vez"));
    expect(segunda.nueva).toBe(true);
    expect(segunda.idea).not.toBe(primera.idea);
    expect(e.sesionSerie!.modelo.eventos.get(segunda.idea)?.titulo).toBe("Una otra vez");
  });

  it("dos pulsaciones seguidas crean una sola pieza", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "Doble");
    const eventos = e.sesionSerie!.modelo.eventos.size;
    const [a, b] = await Promise.all([e.pasarAIdea(n, "Doble"), e.pasarAIdea(n, "Doble")]);
    expect(e.sesionSerie!.modelo.eventos.size).toBe(eventos + 1);
    expect([a, b].filter((x) => !("error" in x))).toHaveLength(1);
    expect(tarjetas(e)).toHaveLength(1);
  });

  it("si falla el guardado de la pizarra, la pieza queda y la pizarra sigue en pantalla con lo pendiente", async () => {
    const { e, fs } = await abrir();
    const n = notaConTexto(e, "Falla");
    await e.pizarra.alSalir();
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.endsWith("pizarra.md.tmp") ? "entero" : null);
    const r = ok(await e.pasarAIdea(n, "Falla"));
    await e.pizarra.alSalir();
    expect(e.pizarra.error).not.toBeNull();
    expect(e.pizarra.hayPendiente).toBe(true);
    expect(e.sesionSerie!.modelo.eventos.has(r.idea)).toBe(true);
    expect(tarjetas(e)).toHaveLength(1);
    fs.fallo = null;
  });

  it("«Deshacer idea» quita la pieza", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "Quitar");
    const r = ok(await e.pasarAIdea(n, "Quitar"));
    await e.deshacerIdea();
    expect(e.sesionSerie!.modelo.eventos.has(r.idea)).toBe(false);
  });

  it("no pasa a idea con la pizarra en solo lectura ni con una nota que ya no está", async () => {
    const { e } = await abrir();
    const n = notaConTexto(e, "Algo");
    expect(await e.pasarAIdea("pz-nada", "x")).toMatchObject({ error: expect.stringMatching(/ya no está/) });
    (e as unknown as { variante: unknown }).variante = {};
    expect(await e.pasarAIdea(n, "x")).toMatchObject({ error: expect.stringMatching(/solo lectura/) });
    (e as unknown as { variante: unknown }).variante = null;
  });

  it("Ctrl I sigue creando la idea igual (la lógica es la misma)", async () => {
    const { e } = await abrir();
    e.abrirCaptura();
    const eventos = e.sesionSerie!.modelo.eventos.size;
    expect(await e.guardarIdea("Rápida")).toBe(true);
    expect(e.sesionSerie!.modelo.eventos.size).toBe(eventos + 1);
  });
});
