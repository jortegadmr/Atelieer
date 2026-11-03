import { describe, expect, it } from "vitest";
import { Comparacion } from "../../src/lib/consecuencias/comparacion";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { cambioVolver } from "../../src/lib/consecuencias/volver";
import type { Cambio, Modelo } from "../../src/lib/modelo/modelo";
import * as op from "../../src/lib/modelo/operaciones";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { crearEscena } from "../../src/lib/vistas/actos";
import { serieBasica } from "./ayuda";

const nunca = () => false;

/** Aplica un cambio al modelo y lo apunta en la comparación, como Sesion.aplicar */
function aplicar(m: Modelo, comp: Comparacion, cambio: Cambio, origen: "autor" | "fuera" | "canon-wiki" = "autor") {
  for (const p of cambio.guardar) m.poner(p);
  for (const p of cambio.borrar) m.quitar(p.id);
  comp.anotar([...cambio.guardar, ...cambio.borrar].map((p) => p.id), origen);
}

function editar(m: Modelo, id: string, fn: (p: Record<string, unknown>) => void): Cambio {
  const p = structuredClone(m.pieza(id)) as unknown as Record<string, unknown>;
  fn(p);
  return { guardar: [p as unknown as Pieza], borrar: [] };
}

function preparar(abierta: "s1" | "s3" | "e1" = "s1") {
  const x = serieBasica();
  const m = x.b.modelo();
  const comp = new Comparacion(x[abierta], copiaModelo(m), []);
  const json = (id: string) => JSON.stringify(comp.base.pieza(id));
  return { ...x, m, comp, json };
}

/** Lo que devuelve: ids de guardar y de borrar */
function ids(r: ReturnType<typeof cambioVolver>) {
  if ("error" in r) throw new Error(r.error);
  return { guardar: r.cambio.guardar.map((p) => p.id).sort(), borrar: r.cambio.borrar.map((p) => p.id).sort(), devueltas: r.devueltas };
}

describe("cambioVolver (spec 005, RF-18 a RF-20)", () => {
  it("devuelve la abierta y las piezas de sus pasos, exactas, con crudos y campos desconocidos", () => {
    const { m, comp, s1, s4, e2, json } = preparar();
    aplicar(m, comp, editar(m, s1, (p) => ((p.titulo = "Uno bis"), (p.extra = { raro: 1 }), (p.crudos = undefined))));
    // Mover la abierta a otro episodio renumera las escenas de allí: van con ella
    aplicar(m, comp, op.moverEvento(m, s1, e2, 0));
    const r = cambioVolver(comp, m, nunca);
    expect(ids(r).guardar).toEqual([s1, s4].sort());
    if ("error" in r) return;
    expect(JSON.stringify(r.cambio.guardar.find((p) => p.id === s1))).toBe(json(s1));
  });

  it("en cadena: otra escena movida después en el mismo episodio también vuelve", () => {
    const { m, comp, s1, s2, s3, s4, e2 } = preparar();
    aplicar(m, comp, op.moverEvento(m, s1, m.eventos.get(s1)!.episodio, 2));
    // s3 se renumeró con s1; moverla después la arrastra, y con ella a s4 en e2
    aplicar(m, comp, op.moverEvento(m, s3, e2, 0));
    expect(ids(cambioVolver(comp, m, nunca)).guardar).toEqual([s1, s2, s3, s4].sort());
  });

  it("lo cambiado en pasos que no tocan esas piezas se queda", () => {
    const { m, comp, s1, s4 } = preparar();
    aplicar(m, comp, editar(m, s1, (p) => (p.titulo = "Uno bis")));
    aplicar(m, comp, editar(m, s4, (p) => (p.avisos_silenciados = ["C02"])));
    expect(ids(cambioVolver(comp, m, nunca))).toEqual({ guardar: [s1], borrar: [], devueltas: 1 });
  });

  it("lo creado con la abierta va a borrar; lo borrado, a guardar", () => {
    const { m, comp, e1, s1, s2, s3, s4 } = preparar();
    const creada = crearEscena(m, e1, "2", { titulo: "Nueva" });
    // Crear en el acto 2 renumera s1 y s3 en el mismo paso: van con la abierta
    aplicar(m, comp, creada.cambio);
    expect(creada.cambio.guardar.map((p) => p.id)).toContain(s1);
    aplicar(m, comp, { guardar: editar(m, s1, (p) => (p.titulo = "Uno bis")).guardar, borrar: [m.eventos.get(s2)!] });
    aplicar(m, comp, editar(m, s4, (p) => (p.titulo = "Otra")));
    const r = ids(cambioVolver(comp, m, nunca));
    expect(r.borrar).toEqual([creada.pieza.id]);
    expect(r.guardar).toEqual([s1, s2, s3].sort());
  });

  it("nada que devolver si todo está como al principio", () => {
    const { m, comp, s1 } = preparar();
    aplicar(m, comp, editar(m, s1, (p) => (p.titulo = "Otro")));
    aplicar(m, comp, editar(m, s1, (p) => (p.titulo = "Uno")));
    expect(ids(cambioVolver(comp, m, nunca))).toEqual({ guardar: [], borrar: [], devueltas: 0 });
  });

  it("si una de las que hay que devolver cambió fuera, no devuelve nada y dice cuál", () => {
    const { m, comp, s1 } = preparar();
    aplicar(m, comp, editar(m, s1, (p) => (p.titulo = "Uno bis")));
    aplicar(m, comp, editar(m, s1, (p) => (p.texto = "de Obsidian")), "fuera");
    const r = cambioVolver(comp, m, nunca);
    expect(r).toEqual({ error: "«Uno bis» cambió fuera de Atelier después de abrir la pieza: no se puede volver sin perder ese cambio." });
  });

  it("si pasó a canon desde la wiki, lo dice así (no «cambió fuera»)", () => {
    const { m, comp, e1 } = preparar("e1");
    aplicar(m, comp, editar(m, e1, (p) => (p.titulo = "Otro")));
    aplicar(m, comp, editar(m, e1, (p) => (p.madurez = "canon")), "canon-wiki");
    expect(cambioVolver(comp, m, nunca)).toEqual({ error: "«Otro» pasó a canon desde la wiki después de abrir la pieza: no se puede volver sin cambiar su ficha." });
  });

  it("la fecha de la ficha se queda la de ahora; si solo cambió ella, no hay nada que devolver", () => {
    const { m, comp, e1 } = preparar("e1");
    aplicar(m, comp, editar(m, e1, (p) => (p.wiki_mtime = "2026-10-21T10:00:00.000Z")));
    expect(ids(cambioVolver(comp, m, nunca)).devueltas).toBe(0);
    aplicar(m, comp, editar(m, e1, (p) => (p.titulo = "Otro")));
    const r = cambioVolver(comp, m, nunca);
    if ("error" in r) throw new Error(r.error);
    expect(r.cambio.guardar[0]).toEqual({ ...comp.base.pieza(e1), wiki_mtime: "2026-10-21T10:00:00.000Z" });
  });

  it("canon bloqueado: no devuelve nada y dice cuál y por qué; renumerarla no cuenta", () => {
    const { m, comp, s1, s2, s3 } = preparar();
    aplicar(m, comp, op.moverEvento(m, s1, m.eventos.get(s1)!.episodio, 2));
    // s2 y s3 solo se renumeraron: aunque sean canon, volver no las cambia
    expect(ids(cambioVolver(comp, m, (id) => id === s2 || id === s3)).guardar).toEqual([s1, s2, s3].sort());
    aplicar(m, comp, editar(m, s1, (p) => (p.titulo = "Uno canon")));
    expect(cambioVolver(comp, m, (id) => id === s1)).toEqual({ error: "«Uno canon» es canon: desbloquéala para volver." });
  });

  it("canon bloqueado: un episodio canon en el que entra o sale la escena lo impide", () => {
    const { m, comp, s1, e1, e2 } = preparar();
    aplicar(m, comp, op.moverEvento(m, s1, e2, 0));
    const r = cambioVolver(comp, m, (id) => id === e1);
    expect(r).toEqual({ error: `«${m.episodios.get(e1)!.titulo || "Sin título"}» es canon: desbloquéala para volver.` });
  });
});
