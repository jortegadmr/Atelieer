import { afterEach, describe, expect, it, vi } from "vitest";
import { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { borrarPieza, editar } from "../../src/lib/modelo/operaciones";
import type { PiezaDe } from "../../src/lib/modelo/tipos";
import { choques } from "../../src/lib/variantes/choques";
import { modeloAntes, modeloQuedaria } from "../../src/lib/variantes/quedaria";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, serieBasica } from "../consecuencias/ayuda";

// Spec 006, RF-41 a RF-44: descartar con su porqué, recuperar y ver una aplicada.

const abiertas: Sesion[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const s of abiertas.splice(0)) await s.cerrar();
});

type Ev = PiezaDe<"evento">;
const ID = "va-prue";

async function aparcada() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 10, 0, 0));
  const x = serieBasica();
  const r = await abrir(x.b);
  abiertas.push(r.s);
  const v = await SesionVariante.abrirSobre(r.s, variante(ID, "Nando se va", "2026-10-22 10:00:00"));
  abiertas.push(v);
  await v.aplicar(editar(v.modelo, x.s1, (p) => ((p as Ev).titulo = "Nando se va")));
  await v.aplicar(borrarPieza(v.modelo, x.s3));
  await v.escritor.vaciar();
  await v.cerrar();
  return { ...x, ...r };
}

describe("descartar y recuperar una variante (spec 006, RF-41 a RF-43)", () => {
  it("descartar y recuperar conservan los cambios y sus choques", async () => {
    const { s, s1, s3 } = await aparcada();
    const antes = await s.variantes.leer(ID);
    vi.setSystemTime(new Date(2026, 9, 22, 10, 30, 0));
    await s.descartarVariante(ID, "Mejor que viva");
    const descartada = await s.variantes.leer(ID);
    expect(descartada).toMatchObject({ estado: "descartada", descartada: "2026-10-22 10:30:00", porque: "Mejor que viva" });
    expect(descartada.piezas).toEqual(antes.piezas);
    expect(s.variantes.lista.get(ID)?.estado).toBe("descartada");

    // La serie cambia después una pieza que la variante toca: al recuperarla, choca
    await s.aplicar(editar(s.modelo, s1, (p) => ((p as Ev).titulo = "Nando se queda")));
    await s.recuperarVariante(ID);
    const recuperada = await s.variantes.leer(ID);
    expect(recuperada).toMatchObject({ estado: "aparcada", descartada: "", porque: "" });
    expect(recuperada.piezas).toEqual(antes.piezas);
    expect(choques(recuperada, s.modelo, modeloQuedaria(s.modelo, recuperada)).map((c) => c.clase === "pieza" && c.id)).toEqual([s1]);
    expect(s.modelo.eventos.has(s3)).toBe(true);
  });

  it("el porqué se guarda en una línea y como mucho de 500 caracteres", async () => {
    const { s } = await aparcada();
    await s.descartarVariante(ID, `No\nconvence\u0007${"x".repeat(600)}`);
    const { porque } = await s.variantes.leer(ID);
    expect(porque.startsWith("No convence ")).toBe(true);
    expect(porque.length).toBeLessThanOrEqual(500);
  });

  it("solo se descarta una aparcada y solo se recupera una descartada", async () => {
    const { s } = await aparcada();
    await s.recuperarVariante(ID);
    expect((await s.variantes.leer(ID)).estado).toBe("aparcada");
    await s.descartarVariante(ID, "");
    await s.descartarVariante(ID, "Otra vez");
    expect(await s.variantes.leer(ID)).toMatchObject({ estado: "descartada", porque: "" });
  });
});

describe("ver una aplicada (spec 006, RF-44)", () => {
  it("«Antes de aplicar» son las bases y «Lo que aplicó», sus piezas", async () => {
    const { s, s1, s3, s2 } = await aparcada();
    const datos = await s.variantes.leer(ID);
    const tituloAntes = (s.modelo.eventos.get(s1) as Ev).titulo;
    expect((await s.aplicarVariante(datos, modeloQuedaria(s.modelo, datos))).hecho).toBe(true);
    const aplicada = await s.variantes.leer(ID);
    const antes = modeloAntes(s.modelo, aplicada);
    const aplico = modeloQuedaria(s.modelo, aplicada);
    expect((antes.eventos.get(s1) as Ev).titulo).toBe(tituloAntes);
    expect(antes.eventos.has(s3)).toBe(true);
    expect((aplico.eventos.get(s1) as Ev).titulo).toBe("Nando se va");
    expect(aplico.eventos.has(s3)).toBe(false);
    // Lo que la variante no tocó es lo de ahora en los dos lados
    expect(antes.eventos.get(s2)).toBe(s.modelo.eventos.get(s2));
  });
});
