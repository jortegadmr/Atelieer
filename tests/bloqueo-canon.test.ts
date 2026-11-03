import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AVISO_EPISODIO_CANON, AVISO_ESCENA_CANON, Sesion } from "../src/lib/app/sesion";
import { ordenEpisodios, ordenTemporadas } from "../src/lib/modelo/codigos";
import { arcosEnOrden } from "../src/lib/modelo/consultas";
import { estadoDe } from "../src/lib/modelo/estados";
import { borrarPieza, crearEvento, editar, insertarEpisodio, moverArco, moverEpisodio, moverEvento, moverTemporada } from "../src/lib/modelo/operaciones";
import type { Evento } from "../src/lib/modelo/tipos";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 001, RF-29 (revisión independiente): una pieza canon bloqueada no se
// mueve, y un cambio que la toca no se aplica a medias.

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

const T1 = "te-t001";
const EP = "ep-a101";
const ECO = "ar-ecos"; // canon en la serie de prueba
const temporadas = (s: Sesion) => ordenTemporadas(s.modelo.serie, [...s.modelo.temporadas.values()]);
const episodios = (s: Sesion) => ordenEpisodios(s.modelo.temporadas.get(T1)!, [...s.modelo.episodios.values()]);
const arcos = (s: Sesion) => arcosEnOrden(s.modelo).map((a) => a.id);

describe("una pieza canon bloqueada no se mueve (RF-29)", () => {
  it("una temporada canon no cambia de sitio, y avisa", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(T1, "canon");
    const antes = temporadas(s);
    await s.aplicar(moverTemporada(s.modelo, T1, 2));
    expect(temporadas(s)).toEqual(antes);
    expect(s.avisosCambio.join(" ")).toMatch(/canon/);
  });

  it("un episodio canon no cambia de sitio", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(EP, "canon");
    const antes = episodios(s);
    await s.aplicar(moverEpisodio(s.modelo, EP, 5));
    expect(episodios(s)).toEqual(antes);
  });

  it("un arco canon no cambia de sitio", async () => {
    const { s } = await abrir();
    expect(s.estaBloqueada(ECO)).toBe(true);
    const antes = arcos(s);
    await s.aplicar(moverArco(s.modelo, ECO, 3));
    expect(arcos(s)).toEqual(antes);
  });

  it("un evento canon no cambia de episodio", async () => {
    const { s } = await abrir();
    expect(s.estaBloqueada("ev-e001")).toBe(true);
    await s.aplicar(moverEvento(s.modelo, "ev-e001", "ep-a103"));
    expect(s.modelo.eventos.get("ev-e001")!.episodio).toBe(EP);
  });

  it("mover otra pieza junto a una canon sí vale: los vecinos canon solo se renumeran", async () => {
    const { s } = await abrir();
    // ev-e005 (idea) va el primero de E01, delante de ev-e001 (canon)
    await s.aplicar(moverEvento(s.modelo, "ev-e005", EP, 0));
    const fila = [...s.modelo.eventos.values()].filter((e) => e.episodio === EP).sort((a, b) => a.orden - b.orden);
    expect(fila.map((e) => e.id)).toEqual(["ev-e005", "ev-e001", "ev-e002"]);
    expect(new Set(fila.map((e) => e.orden)).size).toBe(3);
  });

  it("mover un episodio que no es canon en una temporada que no es canon sí vale", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(EP, "canon");
    await s.aplicar(moverEpisodio(s.modelo, "ep-a103", 6));
    expect(episodios(s).indexOf("ep-a103")).toBe(6);
  });
});

describe("un cambio que toca una pieza bloqueada no se aplica a medias (RF-29)", () => {
  it("borrar una temporada con eventos canon no borra nada", async () => {
    const { s } = await abrir();
    await s.aplicar(borrarPieza(s.modelo, T1));
    expect(s.modelo.temporadas.has(T1)).toBe(true);
    expect(s.modelo.episodios.has(EP)).toBe(true);
    expect(s.modelo.eventos.has("ev-e001")).toBe(true);
    expect(s.avisosCambio.join(" ")).toMatch(/canon/);
  });

  it("borrar un episodio con eventos canon no lo borra ni mueve sus eventos", async () => {
    const { s } = await abrir();
    await s.aplicar(borrarPieza(s.modelo, EP));
    expect(s.modelo.episodios.has(EP)).toBe(true);
    expect(s.modelo.eventos.get("ev-e002")!.episodio).toBe(EP);
  });

  it("si lo impide otra pieza canon, el aviso dice cuál", async () => {
    const { s } = await abrir();
    await s.aplicar(borrarPieza(s.modelo, "ar-amis"));
    expect(s.modelo.arcos.has("ar-amis")).toBe(true);
    expect(s.avisosCambio.join(" ")).toMatch(/«Lee el aviso en el pleno» está en canon/);
  });

  it("insertar un episodio en una temporada canon no crea nada", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(T1, "canon");
    const n = s.modelo.episodios.size;
    const { pieza, cambio } = insertarEpisodio(s.modelo, T1, 0);
    await s.aplicar(cambio);
    expect(s.modelo.episodios.has(pieza.id)).toBe(false);
    expect(s.modelo.episodios.size).toBe(n);
  });
});

describe("canon por la estructura del episodio (spec 003, RF-23 a RF-25, RF-33)", () => {
  const LIBRE = "ev-e002"; // borrador en E01
  const DE_FUERA = "ev-e005"; // borrador en E03
  const enEp = (s: Sesion) => [...s.modelo.eventos.values()].filter((e) => e.episodio === EP).sort((a, b) => a.orden - b.orden).map((e) => e.id);

  async function conEpisodioCanon() {
    const r = await abrir();
    await r.s.cambiarEstado(EP, "canon");
    expect(r.s.estaBloqueada(EP)).toBe(true);
    return r;
  }

  it("moverEvento de la rejilla a un episodio bloqueado: rechazado", async () => {
    const { s } = await conEpisodioCanon();
    const origen = s.modelo.eventos.get(DE_FUERA)!.episodio;
    expect(await s.aplicar(moverEvento(s.modelo, DE_FUERA, EP))).toBe(false);
    expect(s.modelo.eventos.get(DE_FUERA)!.episodio).toBe(origen);
    expect(s.avisosCambio).toEqual([AVISO_EPISODIO_CANON]);
  });

  it("sacarla a la bandeja o a otro episodio: rechazado", async () => {
    const { s } = await conEpisodioCanon();
    await s.aplicar(moverEvento(s.modelo, LIBRE, ""));
    expect(s.modelo.eventos.get(LIBRE)!.episodio).toBe(EP);
    await s.aplicar(moverEvento(s.modelo, LIBRE, "ep-a103"));
    expect(s.modelo.eventos.get(LIBRE)!.episodio).toBe(EP);
    expect(s.avisosCambio).toEqual([AVISO_EPISODIO_CANON]);
  });

  it("cambiar su acto o su orden: rechazado", async () => {
    const { s } = await conEpisodioCanon();
    const antes = enEp(s);
    const acto = s.modelo.eventos.get(LIBRE)!.acto;
    expect(await s.aplicar(editar(s.modelo, LIBRE, (e) => ((e as Evento).acto = acto === "2" ? "3" : "2")))).toBe(false);
    expect(s.modelo.eventos.get(LIBRE)!.acto).toBe(acto);
    expect(await s.aplicar(moverEvento(s.modelo, LIBRE, EP, 0))).toBe(false);
    expect(enEp(s)).toEqual(antes);
    expect(s.avisosCambio).toEqual([AVISO_EPISODIO_CANON]);
  });

  it("borrarla o crear una dentro: rechazado", async () => {
    const { s } = await conEpisodioCanon();
    expect(await s.aplicar(borrarPieza(s.modelo, LIBRE))).toBe(false);
    expect(s.modelo.eventos.has(LIBRE)).toBe(true);
    const nueva = crearEvento(s.modelo, { titulo: "Nueva", temporada: T1, episodio: EP });
    expect(await s.aplicar(nueva.cambio)).toBe(false);
    expect(s.modelo.eventos.has(nueva.pieza.id)).toBe(false);
    expect(s.avisosCambio).toEqual([AVISO_EPISODIO_CANON]);
  });

  it("escena canon no se mueve, ni dentro de su episodio", async () => {
    const { s } = await abrir();
    const antes = enEp(s);
    expect(await s.aplicar(moverEvento(s.modelo, "ev-e001", EP, 1))).toBe(false);
    expect(enEp(s)).toEqual(antes);
    expect(s.avisosCambio).toEqual([AVISO_ESCENA_CANON]);
  });

  it("vecinas canon en un episodio libre sí se renumeran", async () => {
    const { s } = await abrir();
    expect(await s.aplicar(moverEvento(s.modelo, LIBRE, EP, 0))).toBe(true);
    expect(enEp(s)).toEqual([LIBRE, "ev-e001"]);
  });

  it("desbloqueado: vale", async () => {
    const { s } = await conEpisodioCanon();
    s.desbloquear(EP);
    expect(await s.aplicar(moverEvento(s.modelo, DE_FUERA, EP))).toBe(true);
    expect(s.modelo.eventos.get(DE_FUERA)!.episodio).toBe(EP);
  });

  it("editar el título de una escena no canon de un episodio canon: vale", async () => {
    const { s } = await conEpisodioCanon();
    expect(await s.aplicar(editar(s.modelo, LIBRE, (e) => ((e as Evento).titulo = "Otro título")))).toBe(true);
    expect(s.modelo.eventos.get(LIBRE)!.titulo).toBe("Otro título");
  });
});

describe("deshacer y rehacer con piezas bloqueadas", () => {
  it("deshacer un movimiento de una pieza que después pasó a canon desde fuera no la mueve", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(T1, "borrador");
    await s.aplicar(moverTemporada(s.modelo, T1, 2));
    const movido = temporadas(s);
    const ficha = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;
    await fs.cambiarDesdeFuera(ficha, (await fs.leer(ficha)).replace("estado_canon: borrador", "estado_canon: canon"));
    await s.revisarFichas();
    expect(s.estaBloqueada(T1)).toBe(true);
    await s.deshacer();
    expect(temporadas(s)).toEqual(movido);
    expect(s.avisosCambio.join(" ")).toMatch(/canon/);
  });

  it("un paso rechazado no se gasta: tras desbloquear, se deshace", async () => {
    const { s } = await abrir();
    const ID = "ar-amis";
    await s.cambiarEstado(ID, "canon");
    expect(s.estaBloqueada(ID)).toBe(true);
    await s.deshacer();
    expect(estadoDe(s.modelo.arcos.get(ID)!)).toBe("canon");
    expect(s.historial.puedeDeshacer).toBe(true);
    s.desbloquear(ID);
    await s.deshacer();
    expect(estadoDe(s.modelo.arcos.get(ID)!)).toBe("borrador");
  });
});
