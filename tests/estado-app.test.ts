import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { borrarPieza } from "../src/lib/modelo/operaciones";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 002: el nivel del visor en el estado de la app (RF-11, RF-12, RF-20 a
// RF-24). Sin interfaz: la reactividad se prueba en el navegador.

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir() {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  return e;
}

const T1 = "te-t001";
const T2 = "te-t002";
const E3 = "ep-a103";

describe("el nivel del visor", () => {
  it("abrir la serie pone el nivel serie y la vista Serie (RF-23)", async () => {
    const e = await abrir();
    expect(e.nivel).toEqual({ tipo: "serie" });
    expect(e.vista).toBe("serie");
  });

  it("bajar a una temporada: vista Temporada y la elige en el panel (RF-11, RF-20)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "temporada", temporada: T2 });
    expect([e.vista, e.temporadaActual, e.seleccion]).toEqual(["temporada", T2, T2]);
  });

  it("bajar a un episodio conserva el episodio: vista Episodios con él marcado (RF-11, RF-20)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "episodio", temporada: T1, episodio: E3 });
    expect(e.nivel).toEqual({ tipo: "episodio", temporada: T1, episodio: E3 });
    expect([e.vista, e.temporadaActual, e.episodioActual, e.seleccion]).toEqual(["episodios", T1, E3, E3]);
  });

  it("elegir una columna de evento solo lo elige, sin cambiar de nivel (RF-12)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "episodio", temporada: T1, episodio: "ep-a101" });
    e.bajar({ tipo: "evento", id: "ev-e001" });
    expect(e.nivel).toEqual({ tipo: "episodio", temporada: T1, episodio: "ep-a101" });
    expect(e.seleccion).toBe("ev-e001");
  });

  it("subir: del episodio a la temporada (vista Temporada) y a la serie; en la serie no hace nada (RF-15, RF-18)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "episodio", temporada: T1, episodio: E3 });
    e.subirNivel();
    expect([e.nivel, e.vista]).toEqual([{ tipo: "temporada", temporada: T1 }, "temporada"]);
    e.subirNivel();
    expect([e.nivel, e.vista]).toEqual([{ tipo: "serie" }, "serie"]);
    expect(e.subirNivel()).toBe(false);
  });

  it("pasos y selector de temporada llevan el visor (RF-21)", async () => {
    const e = await abrir();
    e.cambiarVista("episodios");
    expect(e.nivel).toEqual({ tipo: "temporada", temporada: T1 });
    e.cambiarTemporada(T2);
    expect(e.nivel).toEqual({ tipo: "temporada", temporada: T2 });
    e.cambiarVista("serie");
    expect(e.nivel).toEqual({ tipo: "serie" });
  });

  it("Tramas y Wiki no cambian el nivel (RF-22)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "episodio", temporada: T1, episodio: E3 });
    e.cambiarVista("tramas");
    e.cambiarVista("wiki");
    expect(e.nivel).toEqual({ tipo: "episodio", temporada: T1, episodio: E3 });
  });

  it("si el episodio del nivel se borra, sube a su temporada y enseña Temporada (RF-24)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "episodio", temporada: T1, episodio: E3 });
    await e.sesion!.aplicar(borrarPieza(e.sesion!.modelo, E3));
    await Promise.resolve();
    expect([e.nivel, e.vista]).toEqual([{ tipo: "temporada", temporada: T1 }, "temporada"]);
  });

  it("en Tramas, si la pieza del nivel desaparece, sube el nivel pero la vista se queda (RF-22, RF-24)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "episodio", temporada: T1, episodio: E3 });
    e.cambiarVista("tramas");
    await e.sesion!.aplicar(borrarPieza(e.sesion!.modelo, E3));
    await Promise.resolve();
    expect([e.nivel, e.vista]).toEqual([{ tipo: "temporada", temporada: T1 }, "tramas"]);
  });

  it("ir a una pieza desde Comprobar deja el visor en el nivel de la vista", async () => {
    const e = await abrir();
    e.irA("ep-b201");
    expect([e.vista, e.nivel]).toEqual(["temporada", { tipo: "temporada", temporada: T2 }]);
  });
});

describe("captura, ventana «Nueva pieza» y tostada", () => {
  it("abrir la captura dos veces la deja como está; sin serie no se abre (RF-36, RF-37)", async () => {
    const e = await abrir();
    expect(e.abrirCaptura()).toBe(true);
    expect(e.abrirCaptura()).toBe(false);
    expect(e.capturando).toBe(true);
    await e.cerrar();
    e.capturando = false;
    expect(e.abrirCaptura()).toBe(false);
  });

  it("guardar la idea la crea donde toca, cierra la captura y lo dice (RF-38, RF-39, RF-43)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "temporada", temporada: T1 });
    e.abrirCaptura();
    expect(await e.guardarIdea("Telmo duda")).toBe(true);
    expect(e.capturando).toBe(false);
    expect(e.tostada?.texto).toBe("Idea en la bandeja de T01");
    expect(e.sesion!.modelo.eventos.get(e.tostada!.idea)?.titulo).toBe("Telmo duda");
  });

  it("vacío no crea nada y cierra; sin temporadas deja la captura abierta con el aviso (RF-40, RF-41)", async () => {
    const e = await abrir();
    e.abrirCaptura();
    const n = e.sesion!.modelo.eventos.size;
    expect(await e.guardarIdea("   ")).toBe(true);
    expect([e.capturando, e.sesion!.modelo.eventos.size, e.tostada]).toEqual([false, n, null]);
    for (const t of [...e.sesion!.modelo.temporadas.keys()]) e.sesion!.modelo.quitar(t);
    e.abrirCaptura();
    expect(await e.guardarIdea("algo")).toBe(false);
    expect(e.capturando).toBe(true);
    expect(e.errorCaptura).toBe("Crea primero una temporada");
  });

  it("recortada a 300: la tostada lo dice (RF-46)", async () => {
    const e = await abrir();
    e.abrirCaptura();
    await e.guardarIdea("a".repeat(301));
    expect(e.tostada?.texto).toMatch(/Recortada a 300 caracteres/);
  });

  it("Intro dos veces seguidas crea una sola idea", async () => {
    const e = await abrir();
    e.abrirCaptura();
    const n = e.sesion!.modelo.eventos.size;
    await Promise.all([e.guardarIdea("una"), e.guardarIdea("una")]);
    expect(e.sesion!.modelo.eventos.size).toBe(n + 1);
  });

  it("Intro cuando la captura ya se cerró no crea nada", async () => {
    const e = await abrir();
    const n = e.sesion!.modelo.eventos.size;
    expect(await e.guardarIdea("tarde")).toBe(false);
    e.abrirCaptura();
    e.cerrarCaptura();
    expect(await e.guardarIdea("tarde")).toBe(false);
    expect(e.sesion!.modelo.eventos.size).toBe(n);
    expect(e.tostada).toBeNull();
  });

  it("Deshacer de la tostada quita la idea y la tostada (RF-43)", async () => {
    const e = await abrir();
    e.abrirCaptura();
    await e.guardarIdea("Uno");
    const id = e.tostada!.idea;
    await e.deshacerIdea();
    expect(e.sesion!.modelo.eventos.has(id)).toBe(false);
    expect(e.tostada).toBeNull();
  });

  it("la tostada se va si la idea ya no existe (Ctrl Z)", async () => {
    const e = await abrir();
    e.abrirCaptura();
    await e.guardarIdea("Uno");
    await e.sesion!.deshacer();
    expect(e.tostada).toBeNull();
  });

  it("la ventana «Nueva pieza» se abre con lo que se va a crear y se cierra sin crear (RF-28, RF-35)", async () => {
    const e = await abrir();
    const n = e.sesion!.modelo.temporadas.size;
    e.abrirNueva("temporada");
    expect(e.nueva).toBe("temporada");
    e.cerrarNueva();
    expect(e.nueva).toBeNull();
    expect(e.sesion!.modelo.temporadas.size).toBe(n);
  });

  it("Crear en la ventana crea la pieza, cierra y la elige (RF-31)", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "temporada", temporada: T1 });
    e.abrirNueva("episodio");
    expect(await e.crearNueva({ titulo: "Nuevo" })).toBe(true);
    expect(e.nueva).toBeNull();
    const p = e.sesion!.modelo.pieza(e.seleccion!);
    expect(p?.tipo === "episodio" && p.titulo).toBe("Nuevo");
  });

  it("si el nivel cambió con la ventana abierta y ya no se puede crear ahí, lo dice sin romperse", async () => {
    const e = await abrir();
    e.irANivel({ tipo: "temporada", temporada: T1 });
    e.abrirNueva("episodio");
    e.subirNivel();
    const n = e.sesion!.modelo.episodios.size;
    expect(await e.crearNueva({ titulo: "Nuevo" })).toBe(false);
    expect(e.nueva).toBe("episodio");
    expect(e.errorNueva).toMatch(/hace falta estar en su nivel/);
    expect(e.sesion!.modelo.episodios.size).toBe(n);
  });

  it("Crear algo que el canon bloqueado impide no crea nada y lo dice (RF-33)", async () => {
    const e = await abrir();
    await e.sesion!.cambiarEstado(T1, "canon");
    e.irANivel({ tipo: "temporada", temporada: T1 });
    const n = e.sesion!.modelo.episodios.size;
    e.abrirNueva("episodio");
    expect(await e.crearNueva({})).toBe(false);
    expect(e.sesion!.modelo.episodios.size).toBe(n);
  });
});

describe("escenas en el visor (spec 003)", () => {
  const E1 = "ep-a101";
  const enE1 = { tipo: "episodio" as const, temporada: T1, episodio: E1 };
  const fila = (e: EstadoApp) => e.sesion!.modelo.indice().porEpisodio.get(E1)!.map((x) => x.id);

  it("crear desde «+ Escena» de una columna: al final de ese acto y elegida", async () => {
    const e = await abrir();
    e.irANivel(enE1);
    e.abrirNueva("evento", { acto: "teaser" });
    expect(await e.crearNueva({ titulo: "Antes de todo" })).toBe(true);
    const nueva = e.sesion!.modelo.eventos.get(e.seleccion!)!;
    expect([nueva.titulo, nueva.acto, fila(e)[0]]).toEqual(["Antes de todo", "teaser", nueva.id]);
  });

  it("dos movimientos seguidos: el segundo con uno pendiente se ignora; esperados, dos pasos de deshacer", async () => {
    const e = await abrir();
    const antes = fila(e);
    const [a, b] = await Promise.all([e.moverEscena("ev-e002", E1, "3", 0), e.moverEscena("ev-e002", E1, "teaser", 0)]);
    expect([a, b]).toEqual([true, false]);
    expect(e.sesion!.modelo.eventos.get("ev-e002")!.acto).toBe("3");
    expect(e.anuncioVisor).toMatch(/^Escena \d+ · Desenlace, 1\.ª$/);
    expect(await e.moverEscena("ev-e002", E1, "teaser")).toBe(true);
    await e.sesion!.deshacer();
    expect(e.sesion!.modelo.eventos.get("ev-e002")!.acto).toBe("3");
    await e.sesion!.deshacer();
    expect(fila(e)).toEqual(antes);
  });

  it("bloqueado: no mueve y dice por qué", async () => {
    const e = await abrir();
    expect(await e.moverEscena("ev-e001", E1, "2", 0)).toBe(false);
    expect(e.avisoVisor).toBe("La escena es canon: desbloquéala para moverla");
  });
});
