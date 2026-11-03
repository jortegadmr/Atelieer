import { afterEach, describe, expect, it, vi } from "vitest";
import type { Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import { camposCambiados } from "../src/lib/consecuencias/campos-vistos";
import { copiaModelo } from "../src/lib/consecuencias/copia";
import { codigo } from "../src/lib/modelo/consultas";
import { leerPieza } from "../src/lib/modelo/ficheros";
import { editar } from "../src/lib/modelo/operaciones";
import { momento, ponerMomento, type CambioMomento, type IdPlantilla } from "../src/lib/modelo/plantillas";
import type { Temporada } from "../src/lib/modelo/tipos";
import { ladoALado } from "../src/lib/variantes/lado-a-lado";
import { variante } from "../src/lib/variantes/tipos";
import { abrir, RAIZ, serieBasica } from "./consecuencias/ayuda";

// Momentos de plantilla en la sesión, diferencias y choques (spec 011, RF-31, RF-35, T11)

const abiertas: Sesion[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const s of abiertas.splice(0)) await s.cerrar();
});

async function preparar(datos: Partial<Temporada> = {}) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 23, 10, 0, 0));
  const x = serieBasica();
  Object.assign(x.b.temporadas.find((t) => t.id === x.t)!, datos);
  const r = await abrir(x.b);
  abiertas.push(r.s);
  const temporada = (ses: { modelo: Sesion["modelo"] } = r.s) => ses.modelo.temporadas.get(x.t)!;
  const nota = async () => leerPieza(await r.fs.leer(`${RAIZ}/s/temporadas/${x.t}.md`), "temporada") as Temporada;
  const poner = (ses: Sesion | SesionVariante, id: IdPlantilla, clave: string, cambio: CambioMomento) =>
    ses.aplicar(editar(ses.modelo, x.t, (p) => ponerMomento(ses.modelo, p as Temporada, id, clave, cambio)));
  const enVariante = async () => {
    const v = await SesionVariante.abrirSobre(r.s, variante("va-prue", "Prueba", ""));
    abiertas.push(v);
    return v;
  };
  /** Deja pasar el tiempo para que el siguiente cambio sea otro paso */
  const luego = () => vi.setSystemTime(Date.now() + 2000);
  return { ...x, ...r, temporada, nota, poner, enVariante, luego };
}

describe("Momentos de plantilla en la sesión (spec 011, T11)", () => {
  it("poner escena y episodio, un paso de Ctrl Z", async () => {
    const { s, e1, e2, s1, s4, temporada, nota, poner, luego } = await preparar();
    await poner(s, "save_the_cat", "catalizador", { texto: "La señal", episodio: e1 });
    luego();
    // La escena de otro episodio trae su episodio en el mismo paso
    await poner(s, "save_the_cat", "catalizador", { escena: s4 });
    expect(momento(temporada(), "save_the_cat", "catalizador")).toEqual({ texto: "La señal", episodio: e2, escena: s4 });
    await s.deshacer();
    expect(momento(temporada(), "save_the_cat", "catalizador")).toEqual({ texto: "La señal", episodio: e1, escena: "" });
    await s.guardado.vaciar();
    expect(momento(await nota(), "save_the_cat", "catalizador")).toEqual({ texto: "La señal", episodio: e1, escena: "" });
    // Cambiar el episodio quita la escena de otro, y Ctrl Z la devuelve
    luego();
    await poner(s, "tres_actos", "crisis", { escena: s1 });
    luego();
    await poner(s, "tres_actos", "crisis", { episodio: e2 });
    expect(momento(temporada(), "tres_actos", "crisis")).toEqual({ texto: "", episodio: e2, escena: "" });
    await s.deshacer();
    expect(momento(temporada(), "tres_actos", "crisis")).toEqual({ texto: "", episodio: e1, escena: s1 });
    await s.guardado.vaciar();
    expect(momento(await nota(), "tres_actos", "crisis")).toEqual({ texto: "", episodio: e1, escena: s1 });
  });

  it("canon y variante", async () => {
    const canon = await preparar({ madurez: "canon" });
    expect(await canon.poner(canon.s, "viaje_heroe", "odisea", { texto: "La final" })).toBe(false);
    expect(Object.hasOwn(canon.temporada().extra, "viaje_heroe")).toBe(false);
    for (const s of abiertas.splice(0)) await s.cerrar();

    const { s, s4, temporada, nota, poner, enVariante } = await preparar();
    const v = await enVariante();
    await poner(v, "viaje_heroe", "odisea", { texto: "La final", escena: s4 });
    expect(momento(temporada(v), "viaje_heroe", "odisea").escena).toBe(s4);
    await s.guardado.vaciar();
    expect(Object.hasOwn(temporada().extra, "viaje_heroe")).toBe(false);
    expect(Object.hasOwn((await nota()).extra, "viaje_heroe")).toBe(false);
  });

  it("Si lo dejas así dice Save the Cat (Catalizador)", async () => {
    const { s, t, e2, s4, poner } = await preparar();
    const base = copiaModelo(s.modelo);
    await poner(s, "save_the_cat", "catalizador", { texto: "La señal", escena: s4 });
    const m = s.modelo;
    expect(camposCambiados(base.pieza(t)!, m.pieza(t)!, base, m)).toEqual([`Save the Cat (Catalizador): vacío → La señal · ${codigo(m, e2)} · Cuatro`]);
  });

  it("Estructura (Detonante) enseña texto, episodio y escena en Lado a lado", async () => {
    const { s, t, e1, s1, poner, enVariante } = await preparar();
    const v = await enVariante();
    await poner(v, "tres_actos", "detonante", { texto: "Llega la cinta", escena: s1 });
    const l = ladoALado(t, s.modelo, v.modelo, [], []);
    const f = l.filas.find((x) => x.etiqueta === "Estructura (Detonante)")!;
    expect(f).toMatchObject({ izquierda: "vacío", derecha: `Llega la cinta · ${codigo(s.modelo, e1)} · Uno`, cambia: true });
    // Una escena que ya no está se dice
    await poner(v, "tres_actos", "detonante", { escena: "ev-zzzz" });
    expect(ladoALado(t, s.modelo, v.modelo, [], []).filas.find((x) => x.etiqueta === "Estructura (Detonante)")!.derecha).toBe(
      `Llega la cinta · ${codigo(s.modelo, e1)} · ya no está`,
    );
  });

  it("choque por momento", async () => {
    const { s, t, e1, poner, enVariante } = await preparar();
    const v = await enVariante();
    await poner(v, "save_the_cat", "catalizador", { texto: "En la variante" });
    await poner(s, "save_the_cat", "debate", { texto: "En la serie", episodio: e1 });
    expect(v.choques()).toEqual([expect.objectContaining({ clase: "pieza", id: t, soloSerie: ["Save the Cat (Debate)"], dosLados: [] })]);
    await poner(s, "save_the_cat", "catalizador", { texto: "También en la serie" });
    expect(v.choques()).toEqual([
      expect.objectContaining({ clase: "pieza", id: t, soloSerie: ["Save the Cat (Debate)"], dosLados: ["Save the Cat (Catalizador)"] }),
    ]);
  });

  it("aplicar con una escena de momento que ya no está no choca", async () => {
    const { s, temporada, poner, enVariante } = await preparar();
    const v = await enVariante();
    await poner(v, "viaje_heroe", "odisea", { texto: "La final", escena: "ev-zzzz" });
    await poner(v, "save_the_cat", "final", { episodio: "ep-zzzz" });
    await poner(v, "story_circle", "ir", { escena: "ev-yyyy", episodio: "ep-yyyy" });
    await v.escritor.vaciar();
    await v.cerrar();
    expect(await s.aplicarVariante(v.datos, v.modelo)).toMatchObject({ hecho: true });
    expect(momento(temporada(), "viaje_heroe", "odisea")).toEqual({ texto: "La final", episodio: "", escena: "ev-zzzz" });
    expect(momento(temporada(), "save_the_cat", "final").episodio).toBe("ep-zzzz");
    expect(momento(temporada(), "story_circle", "ir")).toEqual({ texto: "", episodio: "ep-yyyy", escena: "ev-yyyy" });
  });
});
