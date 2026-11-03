import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearEscena } from "../../src/lib/vistas/actos";
import * as op from "../../src/lib/modelo/operaciones";
import { abrir, RAIZ, serieBasica } from "./ayuda";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 21, 10, 0));
});
afterEach(() => vi.useRealTimers());

describe("la comparación en la sesión (spec 005)", () => {
  it("al crear, la base es la de antes de crear; si algo cambia antes de elegirla, ya no", async () => {
    const { b, e1, s1, s2 } = serieBasica();
    const { s } = await abrir(b);
    expect(await s.aplicar(op.moverEvento(s.modelo, s2, e1, 0))).toBe(true);
    expect(await s.aplicar(crearEscena(s.modelo, e1, "", { titulo: "Nueva" }).cambio)).toBe(true);
    const nueva = [...s.modelo.eventos.values()].find((e) => e.titulo === "Nueva")!;
    s.empezarComparacion(nueva.id);
    expect(s.comparacion!.base.eventos.has(nueva.id)).toBe(false);
    expect(s.comparacion!.conLaAbierta.has(nueva.id)).toBe(true);

    // Otra creación, pero con un cambio en medio: ya no cuenta como recién creada
    expect(await s.aplicar(crearEscena(s.modelo, e1, "", { titulo: "Otra" }).cambio)).toBe(true);
    const otra = [...s.modelo.eventos.values()].find((e) => e.titulo === "Otra")!;
    s.editar(s1, (p) => ((p as { titulo: string }).titulo = "Uno bis"));
    s.empezarComparacion(otra.id);
    expect(s.comparacion!.base.eventos.has(otra.id)).toBe(true);
    expect(s.comparacion!.base.eventos.get(s1)!.titulo).toBe("Uno bis");
    await s.cerrar();
  });

  it("volver a elegir una pieza recién creada después de otra empieza de cero", async () => {
    const { b, e1, s1 } = serieBasica();
    const { s } = await abrir(b);
    expect(await s.aplicar(crearEscena(s.modelo, e1, "", { titulo: "Nueva" }).cambio)).toBe(true);
    const nueva = [...s.modelo.eventos.values()].find((e) => e.titulo === "Nueva")!;
    s.empezarComparacion(s1);
    s.empezarComparacion(nueva.id);
    expect(s.comparacion!.base.eventos.has(nueva.id)).toBe(true);
    await s.cerrar();
  });

  it("los pasos del autor que tocan la abierta se apuntan con ella", async () => {
    const { b, e1, s1, s3, s4 } = serieBasica();
    const { s } = await abrir(b);
    s.empezarComparacion(s3);
    expect(await s.aplicar(op.moverEvento(s.modelo, s3, e1, 0))).toBe(true);
    s.editar(s4, (p) => ((p as { titulo: string }).titulo = "Cuatro bis"));
    expect([...s.comparacion!.conLaAbierta]).toContain(s1);
    expect(s.comparacion!.conLaAbierta.has(s4)).toBe(false);
    await s.cerrar();
  });

  it("lo releído de fuera que cambia va a deFuera; lo releído igual, no", async () => {
    const { b, s1, s2 } = serieBasica();
    const { s, fs } = await abrir(b);
    s.empezarComparacion(s1);
    const ruta = (id: string) => `${RAIZ}/s/eventos/${id}.md`;
    const igual = await fs.leer(ruta(s2));
    await fs.cambiarDesdeFuera(ruta(s2), igual);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.comparacion!.deFuera.has(s2)).toBe(false);
    await fs.cambiarDesdeFuera(ruta(s2), igual.replace("titulo: Dos", "titulo: Dos desde fuera"));
    await vi.advanceTimersByTimeAsync(0);
    expect(s.modelo.eventos.get(s2)!.titulo).toBe("Dos desde fuera");
    expect(s.comparacion!.deFuera.get(s2)).toBe("fuera");
    await s.cerrar();
  });

  it("lo que sube a canon la wiki va a deFuera como canon-wiki", async () => {
    const { b, s1, s2 } = serieBasica();
    const { s } = await abrir(b);
    s.empezarComparacion(s1);
    const p = { ...structuredClone(s.modelo.eventos.get(s2)!), madurez: "canon" as const };
    expect(await s.aplicar({ guardar: [p], borrar: [] }, false, undefined, { origen: "canon-wiki" })).toBe(true);
    expect(s.comparacion!.deFuera.get(s2)).toBe("canon-wiki");
    await s.cerrar();
  });

  it("deshacer la creación de la abierta acaba la comparación", async () => {
    const { b, e1 } = serieBasica();
    const { s } = await abrir(b);
    expect(await s.aplicar(crearEscena(s.modelo, e1, "", { titulo: "Nueva" }).cambio)).toBe(true);
    const nueva = [...s.modelo.eventos.values()].find((e) => e.titulo === "Nueva")!;
    s.empezarComparacion(nueva.id);
    await s.deshacer();
    expect(s.comparacion).toBeNull();
    await s.cerrar();
  });
});
