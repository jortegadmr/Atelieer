import { afterEach, describe, expect, it } from "vitest";
import type { Sesion } from "../src/lib/app/sesion";
import { NO_ESTA, reunirSala } from "../src/lib/sala/reunir";
import { planteamiento, type EntradaSala } from "../src/lib/sala/planteamiento";
import type { Evento } from "../src/lib/modelo/tipos";
import type { Pizarra } from "../src/lib/pizarra/tipos";
import { Constructor } from "./fixtures/constructor";
import { abrir } from "./consecuencias/ayuda";

// Spec 012, T13a: reunir lo que lleva un episodio o una escena (RF-23, RF-25, RF-28).

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

const CTX = { pizarra: null, conVariante: false };

async function serie() {
  const b = new Constructor();
  const t = b.temporada({ titulo: "Primera" }, 2);
  const [e1, e2] = t.eps;
  const a = b.arco({ titulo: "El eco" });
  const causa = b.evento({ id: "ev-aaaa1", titulo: "Causa", episodio: e1, arcos: [[a, "abre"]] });
  const efecto = b.evento({ id: "ev-bbbb2", titulo: "Efecto", episodio: e2, extra: { viene_de: [causa] } });
  const r = await abrir(b);
  abiertas.push(r.s);
  return { ...r, b, e1, e2, causa, efecto };
}

const entrada = (r: EntradaSala | { error: string }): EntradaSala => {
  if ("error" in r) throw new Error(r.error);
  return r;
};

const pizarraCon = (o: Partial<Pizarra>): Pizarra => ({ formato: 1, elementos: [], flechas: [], ...o }) as Pizarra;

describe("reunirSala: episodio y escena", () => {
  it("una pieza que ya no está da un error y no reúne nada", async () => {
    const { s } = await serie();
    const r = await reunirSala(s, { tipo: "pieza", id: "no-existe" }, CTX);
    expect(r).toEqual({ error: NO_ESTA });
  });

  it("un episodio lleva su tipo, su título y su estado en palabras", async () => {
    const { s, e1 } = await serie();
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: e1 }, CTX));
    expect(r.tipo).toMatch(/^Episodio/);
    expect(r.estado).toBeTypeOf("string");
    expect(planteamiento(r).texto).toContain("Quiero decidir:");
  });

  it("una escena lleva de qué viene y qué provoca", async () => {
    const { s, causa, efecto } = await serie();
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: causa }, CTX));
    const texto = planteamiento(r).texto;
    expect(r.tipo).toMatch(/^Escena/);
    expect(texto).toContain("Provoca: Efecto");
    const r2 = entrada(await reunirSala(s, { tipo: "pieza", id: efecto }, CTX));
    expect(planteamiento(r2).texto).toContain("Viene de: Causa");
  });

  it("sin punto de partida abierto no hay «Si lo dejas así…»", async () => {
    const { s, causa } = await serie();
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: causa }, CTX));
    expect(r.secciones.some((x) => x.clave === "cambios")).toBe(false);
  });

  it("con la pieza abierta y comparación, «Si lo dejas así…» sale; con otra pieza, no", async () => {
    const { s, causa, efecto } = await serie();
    s.empezarComparacion(causa);
    const ev = structuredClone(s.modelo.pieza(causa)!) as Evento;
    s.desbloquear(causa);
    await s.aplicar({ guardar: [{ ...ev, titulo: "Causa cambiada" }], borrar: [] });
    const abierta = entrada(await reunirSala(s, { tipo: "pieza", id: causa }, CTX));
    const cambios = abierta.secciones.find((x) => x.clave === "cambios");
    expect(cambios && "lineas" in cambios && cambios.lineas.join(" ")).toContain("Cambia:");
    const otra = entrada(await reunirSala(s, { tipo: "pieza", id: efecto }, CTX));
    expect(otra.secciones.some((x) => x.clave === "cambios")).toBe(false);
  });

  it("con pizarra null no hay sección de notas; con notas unidas, salen", async () => {
    const { s, causa } = await serie();
    expect(entrada(await reunirSala(s, { tipo: "pieza", id: causa }, CTX)).notas).toBeNull();
    const p = pizarraCon({
      elementos: [
        { tipo: "tarjeta", id: "t1", pieza: causa, x: 0, y: 0 },
        { tipo: "nota", id: "n1", texto: "pensar esto", color: "ambar", x: 0, y: 100 },
      ] as never,
      flechas: [{ id: "f1", de: "n1", a: "t1", etiqueta: "porque" }] as never,
    });
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: causa }, { pizarra: p, conVariante: false }));
    expect(r.notas).toEqual([{ texto: "pensar esto", etiqueta: "porque", direccion: "llega", x: 0, y: 100 }]);
  });

  it("una pizarra que no se leyó se pasa tal cual para decirlo", async () => {
    const { s, causa } = await serie();
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: causa }, { pizarra: { nolee: "rota" }, conVariante: true }));
    expect(r.notas).toEqual({ nolee: "rota" });
    expect(r.conVariante).toBe(true);
  });

  it("no escribe nada en el disco", async () => {
    const { s, fs, causa } = await serie();
    const foto = async () => JSON.stringify(await Promise.all(fs.rutas().map(async (r) => [r, await fs.leer(r)])));
    const antes = await foto();
    await reunirSala(s, { tipo: "pieza", id: causa }, CTX);
    expect(await foto()).toBe(antes);
  });
});
