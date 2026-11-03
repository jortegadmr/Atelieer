import { afterEach, describe, expect, it, vi } from "vitest";
import { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { borrarPieza, editar } from "../../src/lib/modelo/operaciones";
import type { PiezaDe } from "../../src/lib/modelo/tipos";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, RAIZ, serieBasica } from "../consecuencias/ayuda";

// Spec 006, RF-38: «Aplicar» es un paso del deshacer de la serie.

const abiertas: Sesion[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const s of abiertas.splice(0)) await s.cerrar();
});

type Ev = PiezaDe<"evento">;
const ID = "va-prue";

async function aplicada() {
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
  vi.setSystemTime(new Date(2026, 9, 22, 10, 5, 0));
  expect((await r.s.aplicarVariante(v.datos, v.modelo)).hecho).toBe(true);
  return { ...x, ...r, v };
}

const estadoEnDisco = async (s: Sesion) => (await s.variantes.leer(ID)).estado;

describe("deshacer y rehacer «Aplicar» (spec 006, RF-38)", () => {
  it("al aplicar queda aplicada con su fecha", async () => {
    const { s } = await aplicada();
    expect(await s.variantes.leer(ID)).toMatchObject({ estado: "aplicada", aplicada: "2026-10-22 10:05:00" });
  });

  it("Ctrl Z deja la variante aparcada y vuelve a poner lo borrado; su copia se queda en la papelera (spec 007)", async () => {
    const { s, fs, s1, s3 } = await aplicada();
    const papelera = `${s.almacen.rutaSerie(s.carpeta)}/_papelera`;
    const copias = await fs.listar(papelera);
    expect(copias).toHaveLength(1);
    const avisos: boolean[] = [];
    s.alVolverVariante = (_p, deshecho) => avisos.push(deshecho);
    await s.deshacer();
    expect(await s.variantes.leer(ID)).toMatchObject({ estado: "aparcada", aplicada: "" });
    expect(s.variantes.lista.get(ID)?.estado).toBe("aparcada");
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Uno");
    expect(s.modelo.eventos.has(s3)).toBe(true);
    expect(await fs.existe(`${RAIZ}/s/eventos/${s3}.md`)).toBe(true);
    expect(await fs.listar(papelera)).toEqual(copias);
    expect(avisos).toEqual([true]);
  });

  it("Ctrl Y la deja aplicada", async () => {
    const { s, s1 } = await aplicada();
    await s.deshacer();
    vi.setSystemTime(new Date(2026, 9, 22, 10, 9, 0));
    await s.rehacer();
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Nando se va");
    expect(await s.variantes.leer(ID)).toMatchObject({ estado: "aplicada", aplicada: "2026-10-22 10:09:00" });
  });

  it("Ctrl Y tras editar la variante deshecha la deja aparcada y lo dice", async () => {
    const { s, s2 } = await aplicada();
    await s.deshacer();
    vi.setSystemTime(new Date(2026, 9, 22, 10, 7, 0));
    const otra = await SesionVariante.abrirSobre(s, await s.variantes.leer(ID));
    abiertas.push(otra);
    await otra.aplicar(editar(otra.modelo, s2, (p) => ((p as Ev).titulo = "Dos en la variante")));
    await otra.escritor.vaciar();
    await otra.cerrar();
    await s.rehacer();
    expect(await estadoEnDisco(s)).toBe("aparcada");
    expect(s.avisosCambio.join(" ")).toContain("La variante «Nando se va» ha cambiado desde que se aplicó: queda aparcada.");
    // Lo nuevo de la variante sigue en ella, sin aplicar
    expect((await s.variantes.leer(ID)).piezas.has(s2)).toBe(true);
    expect(s.modelo.eventos.get(s2)!.titulo).toBe("Dos");
  });

  it("Ctrl Y de una variante descartada después de deshacer la deja descartada", async () => {
    const { s } = await aplicada();
    await s.deshacer();
    await s.descartarVariante(ID, "Mejor no");
    await s.rehacer();
    expect(await s.variantes.leer(ID)).toMatchObject({ estado: "descartada", aplicada: "", porque: "Mejor no" });
  });

  it("si no se puede escribir la nota de la variante, se dice y se reintenta", async () => {
    const { s, fs } = await aplicada();
    s.reintentoMarcaMs = 20;
    fs.fallo = (op, r) => (op === "escribir" && r.includes("_variantes") ? "entero" : null);
    await s.deshacer();
    expect(s.avisosCambio.join(" ")).toMatch(/No se pudo apuntar el estado de la variante «Nando se va» .*Se reintenta solo\./);
    expect(await estadoEnDisco(s)).toBe("aplicada");
    fs.fallo = null;
    await vi.waitFor(async () => expect(await estadoEnDisco(s)).toBe("aparcada"), { timeout: 2000, interval: 20 });
  });
});
