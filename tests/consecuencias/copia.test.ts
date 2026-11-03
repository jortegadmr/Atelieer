import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { antesDelPaso, copiaModelo } from "../../src/lib/consecuencias/copia";
import { Comparacion } from "../../src/lib/consecuencias/comparacion";
import { crearEscena } from "../../src/lib/vistas/actos";
import * as op from "../../src/lib/modelo/operaciones";
import { comprobar } from "../../src/lib/comprobaciones";
import { Modelo } from "../../src/lib/modelo/modelo";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import { abrir, congelar, serieBasica } from "./ayuda";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 21, 10, 0));
});
afterEach(() => vi.useRealTimers());

describe("punto de partida (spec 005)", () => {
  it("la base, congelada a fondo, no cambia al mover, Lo sé, cambiar de estado, deshacer y crear", async () => {
    const { b, e1, e2, s1, s3 } = serieBasica();
    const { s } = await abrir(b);
    const base = copiaModelo(s.modelo);
    const foto = JSON.stringify([...base.todas()]);
    for (const p of base.todas()) congelar(p);

    expect(await s.aplicar(op.moverEvento(s.modelo, s3, e2, 0))).toBe(true);
    s.editar(s1, (p) => ((p as { titulo: string }).titulo = "Uno bis"));
    s.loSe({ id: "C02", pieza: s1, clase: "aviso", mensaje: "", fuente: "", grupo: "Escenas" }, true);
    await s.cambiarEstado(s1, "propuesta");
    await s.revisarFichas();
    await s.deshacer();
    await s.rehacer();
    expect(await s.aplicar(crearEscena(s.modelo, e1, "2", { titulo: "Nueva" }).cambio)).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);

    expect(JSON.stringify([...base.todas()])).toBe(foto);
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Uno bis");
    await s.cerrar();
  });

  it("antesDelPaso devuelve las piezas del paso a su antes y quita las creadas", () => {
    const { b, s1 } = serieBasica();
    const m = b.modelo();
    const viejo = m.eventos.get(s1)!;
    const nuevo = { ...structuredClone(viejo), titulo: "Otro" };
    m.poner(nuevo);
    const creado = m.nueva("evento", { titulo: "Creado" });
    m.poner(creado);
    const antes = antesDelPaso(m, [
      { id: s1, antes: viejo, despues: nuevo },
      { id: creado.id, antes: null, despues: creado },
    ]);
    expect(antes.eventos.get(s1)!.titulo).toBe("Uno");
    expect(antes.eventos.has(creado.id)).toBe(false);
    expect(m.eventos.get(s1)!.titulo).toBe("Otro");
  });

  it("un cambio que toca la abierta o algo que cambió con ella se apunta; uno que no, no", () => {
    const { b, s1, s2, s3, s4 } = serieBasica();
    const m = b.modelo();
    const c = new Comparacion(s1, copiaModelo(m), []);
    c.anotar([s4], "autor");
    expect([...c.conLaAbierta]).toEqual([]);
    c.anotar([s1, s2], "autor");
    // En cadena: un paso posterior que toca s2 arrastra a s3
    c.anotar([s2, s3], "autor");
    expect([...c.conLaAbierta].sort()).toEqual([s1, s2, s3].sort());
    c.anotar([s4], "fuera");
    c.anotar([s1], "canon-wiki");
    expect(c.deFuera).toEqual(new Map([[s4, "fuera"], [s1, "canon-wiki"]]));
    expect(c.conLaAbierta.has(s4)).toBe(false);
  });

  it("la copia de la serie grande, en menos de 50 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    comprobar(m);
    const inicio = performance.now();
    const c = copiaModelo(m);
    expect(performance.now() - inicio).toBeLessThan(50);
    expect(c.eventos.size).toBe(m.eventos.size);
  });
});
