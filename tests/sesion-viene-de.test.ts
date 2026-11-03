import { afterEach, describe, expect, it, vi } from "vitest";
import { juntar, type Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import { camposCambiados } from "../src/lib/consecuencias/campos-vistos";
import { copiaModelo } from "../src/lib/consecuencias/copia";
import { crearPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { editar } from "../src/lib/modelo/operaciones";
import type { Evento } from "../src/lib/modelo/tipos";
import { anadirCausa, ponerVieneDe, quitarCausa } from "../src/lib/modelo/viene-de";
import { variante } from "../src/lib/variantes/tipos";
import { dondeSeEmite } from "../src/lib/vistas/historia";
import { abrir, RAIZ, serieBasica } from "./consecuencias/ayuda";

// «Viene de» en la sesión (spec 011, RF-10, RF-11, RF-13, RF-14, T5)

const abiertas: Sesion[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const causa = (id: string) => (p: Evento) => ponerVieneDe(p, anadirCausa(p, id));

async function preparar(datos: Partial<Omit<Evento, "arcos">> = {}) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 23, 10, 0, 0));
  const x = serieBasica();
  const ev = x.b.evento({ titulo: "Cinco", episodio: x.e2, ...datos });
  const r = await abrir(x.b);
  abiertas.push(r.s);
  const escena = (ses: { modelo: Sesion["modelo"] } = r.s) => ses.modelo.eventos.get(ev)!;
  const nota = async () => leerPieza(await r.fs.leer(`${RAIZ}/s/eventos/${ev}.md`), "evento") as Evento;
  const en = (ses: Sesion | SesionVariante, fn: (p: Evento) => void) => ses.aplicar(editar(ses.modelo, ev, (p) => fn(p as Evento)));
  /** Deja pasar el tiempo para que el siguiente cambio sea otro paso */
  const luego = () => vi.setSystemTime(Date.now() + 2000);
  return { ...x, ...r, ev, escena, nota, en, luego };
}

describe("Viene de en la sesión (spec 011, T5)", () => {
  it("un paso de Ctrl Z", async () => {
    const { s, s1, s2, escena, nota, en, luego } = await preparar();
    await en(s, causa(s1));
    luego();
    await en(s, causa(s2));
    expect(escena().extra.viene_de).toEqual([s1, s2]);
    await s.deshacer();
    expect(escena().extra.viene_de).toEqual([s1]);
    await s.guardado.vaciar();
    expect((await nota()).extra.viene_de).toEqual([s1]);
    await s.deshacer();
    expect(Object.hasOwn(escena().extra, "viene_de")).toBe(false);
    await s.guardado.vaciar();
    expect(Object.hasOwn((await nota()).extra, "viene_de")).toBe(false);
  });

  it("canon bloqueado no cambia", async () => {
    const { s, s1, escena, en } = await preparar({ madurez: "canon" });
    expect(await en(s, causa(s1))).toBe(false);
    expect(Object.hasOwn(escena().extra, "viene_de")).toBe(false);
  });

  it("en la variante no escribe en la serie", async () => {
    const { s, s1, escena, nota, en } = await preparar();
    const v = await SesionVariante.abrirSobre(s, variante("va-prue", "Prueba", ""));
    abiertas.push(v);
    await en(v, causa(s1));
    expect(escena(v).extra.viene_de).toEqual([s1]);
    await s.guardado.vaciar();
    expect(Object.hasOwn(escena().extra, "viene_de")).toBe(false);
    expect(Object.hasOwn((await nota()).extra, "viene_de")).toBe(false);
  });

  it("aplicar una variante con una causa que ya no está no choca", async () => {
    const { s, s1, escena, en } = await preparar();
    const v = await SesionVariante.abrirSobre(s, variante("va-prue", "Prueba", ""));
    abiertas.push(v);
    await en(v, causa(s1));
    await en(v, causa("ev-zzzz"));
    await v.escritor.vaciar();
    await v.cerrar();
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r).toMatchObject({ hecho: true });
    expect(escena().extra.viene_de).toEqual([s1, "ev-zzzz"]);
  });

  it("Si lo dejas así dice Viene de", async () => {
    const { s, s1, s2, ev, en } = await preparar();
    const base = copiaModelo(s.modelo);
    await en(s, causa(s1));
    await en(s, causa(s2));
    const m = s.modelo;
    const ver = (id: string) => `${m.eventos.get(id)!.titulo} · ${dondeSeEmite(m, m.eventos.get(id)!)}`;
    expect(camposCambiados(base.pieza(ev)!, m.pieza(ev)!, base, m)).toEqual([`Viene de: 0 → 2 · añadida «${ver(s1)}» · añadida «${ver(s2)}»`]);
    const antes = copiaModelo(m);
    await en(s, (p) => ponerVieneDe(p, quitarCausa(p, { id: s1, i: 0 })));
    expect(camposCambiados(antes.pieza(ev)!, m.pieza(ev)!, antes, m)).toEqual([`Viene de: 2 → 1 · quitada «${ver(s1)}»`]);
  });

  it("cambiar viene_de no pisa otro campo desconocido cambiado fuera", () => {
    const base = crearPieza("evento", { id: "ev-1", extra: { mio: "antes", otro: 1 } });
    const mio = structuredClone(base);
    causa("ev-2")(mio);
    // Mientras tanto, fuera cambian «mio» y quitan «otro»
    const ahora = { ...structuredClone(base), extra: { mio: "fuera" } };
    const r = juntar(base, mio, ahora) as Evento;
    expect(r.extra).toEqual({ mio: "fuera", viene_de: ["ev-2"] });
    // Y quitar la causa en la app no se lleva lo de fuera
    const sin = structuredClone(r);
    ponerVieneDe(sin, quitarCausa(sin, { id: "ev-2", i: 0 }));
    const r2 = juntar(r, sin, { ...structuredClone(r), extra: { ...r.extra, nuevo: true } }) as Evento;
    expect(r2.extra).toEqual({ mio: "fuera", nuevo: true });
  });
});
