import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { escribirPizarra, leerPizarra } from "../src/lib/pizarra/formato";
import { crearNota, editarNota } from "../src/lib/pizarra/operaciones";
import { ENCUADRE_INICIAL } from "../src/lib/pizarra/encuadre";
import { vacia, type Nota, type Pizarra } from "../src/lib/pizarra/tipos";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 012, T8a: la pizarra en el estado de la app. Sin interfaz: lo visual se
// prueba en el navegador.

const RUTA = `${APPDATOS}/_prueba/_pizarra/pizarra.md`;

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir(): Promise<{ e: EstadoApp; fs: FsMemoria }> {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  e.cambiarVista("pizarra");
  await e.pizarra.abrir();
  return { e, fs };
}

function conTexto(texto: string): Pizarra {
  const r = crearNota(vacia(), { x: 1, y: 2 }, "pz-a");
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, "pz-a", texto).pizarra;
}

const textos = (e: EstadoApp) => e.pizarra.pizarra.elementos.map((x) => (x as Nota).texto);
const idDe = (r: { id: string } | { error: string }) => {
  if ("error" in r) throw new Error(r.error);
  return r.id;
};

describe("la pizarra en el estado de la app (spec 012, T8a)", () => {
  it("abrir la vista carga una pizarra vacía y no crea nada en disco", async () => {
    const { e, fs } = await abrir();
    expect(e.pizarra.cargada).toBe(true);
    expect(e.pizarra.pizarra).toEqual(vacia());
    expect(await fs.existe(RUTA)).toBe(false);
  });

  it("crear, escribir, mover y deshacer / rehacer", async () => {
    const { e } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 10, y: 20 }));
    e.pizarra.editarNota(id, "hola");
    e.pizarra.mover(id, 100, 200);
    expect(e.pizarra.pizarra.elementos[0]).toMatchObject({ texto: "hola", x: 100, y: 200 });
    expect(e.pizarra.deshacer()).toBe(true);
    expect(e.pizarra.pizarra.elementos[0]).toMatchObject({ texto: "hola", x: 10, y: 20 });
    expect(e.pizarra.deshacer()).toBe(true);
    expect(textos(e)).toEqual([""]);
    expect(e.pizarra.rehacer()).toBe(true);
    expect(textos(e)).toEqual(["hola"]);
  });

  it("guarda sola y a la vuelta se lee lo mismo", async () => {
    const { e, fs } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 1, y: 2 }));
    e.pizarra.editarNota(id, "guardada");
    await e.pizarra.alSalir();
    const leida = leerPizarra(await fs.leer(RUTA)) as { pizarra: Pizarra };
    expect((leida.pizarra.elementos[0] as Nota).texto).toBe("guardada");
  });

  it("con la vista Pizarra, Ctrl Z deshace la pizarra y no las piezas; con otra vista, las piezas", async () => {
    const { e } = await abrir();
    const s = e.sesionSerie!;
    const ev = [...s.modelo.eventos.values()][0];
    const titulo = ev.titulo;
    s.editar(ev.id, (x) => {
      if ("titulo" in x) x.titulo = "Cambiada";
    });
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(id, "nota");
    await e.deshacerActual();
    expect(textos(e)).toEqual([""]);
    expect(s.modelo.eventos.get(ev.id)!.titulo).toBe("Cambiada");
    await e.rehacerActual();
    expect(textos(e)).toEqual(["nota"]);
    e.cambiarVista("serie");
    await e.deshacerActual();
    expect(s.modelo.eventos.get(ev.id)!.titulo).toBe(titulo);
    expect(textos(e)).toEqual(["nota"]);
  });

  it("con una variante abierta no se escribe nada y las tarjetas se resuelven contra la serie principal", async () => {
    const { e, fs } = await abrir();
    const ev = [...e.sesionSerie!.modelo.eventos.values()][0];
    (e as unknown as { variante: unknown }).variante = { modelo: { eventos: new Map() } };
    expect(e.pizarra.soloLectura).toBe(true);
    expect("error" in e.pizarra.crearNota({ x: 0, y: 0 })).toBe(true);
    expect(e.pizarra.pizarra).toEqual(vacia());
    await e.pizarra.alSalir();
    expect(await fs.existe(RUTA)).toBe(false);
    expect(e.pizarra.tarjeta({ pieza: ev.id })).toMatchObject({ estado: "ok", titulo: ev.titulo });
    (e as unknown as { variante: unknown }).variante = null;
  });

  it("abrir otra serie renueva la pizarra y el encuadre; cambiar de vista los recuerda", async () => {
    const { e } = await abrir();
    e.pizarra.crearNota({ x: 0, y: 0 });
    e.pizarra.encuadre = { x: 50, y: 60, zoom: 1.5 };
    e.cambiarVista("serie");
    e.cambiarVista("pizarra");
    await e.pizarra.abrir();
    expect(e.pizarra.encuadre).toEqual({ x: 50, y: 60, zoom: 1.5 });
    expect(e.pizarra.pizarra.elementos).toHaveLength(1);
    await e.abrir("_prueba");
    expect(e.pizarra.cargada).toBe(false);
    expect(e.pizarra.pizarra).toEqual(vacia());
    expect(e.pizarra.encuadre).toEqual(ENCUADRE_INICIAL);
  });

  it("un cambio de fuera relee la pizarra, descarta lo pendiente y Ctrl Z no resucita lo anterior", async () => {
    const { e, fs } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(id, "mía");
    await e.pizarra.alSalir();
    // Una edición más, aún sin guardar, y llega lo de fuera
    e.pizarra.editarNota(id, "mía pendiente");
    await fs.cambiarDesdeFuera(RUTA, escribirPizarra(conTexto("de fuera")));
    await e.pizarra.alCambiarFuera([{ ruta: RUTA, que: "cambiado" }]);
    expect(textos(e)).toEqual(["de fuera"]);
    expect(e.pizarra.deshacer()).toBe(false);
    expect(e.pizarra.avisos.join(" ")).toMatch(/cambió fuera/);
    // Lo pendiente de antes ya no pisa lo de fuera
    await e.pizarra.alSalir();
    expect(await fs.leer(RUTA)).toContain("de fuera");
  });

  it("al volver a la ventana se comprueba el disco y, si cambió, se relee", async () => {
    const { e, fs } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(id, "mía");
    await e.pizarra.alSalir();
    await e.pizarra.alVolverALaVentana();
    expect(textos(e)).toEqual(["mía"]);
    expect(e.pizarra.avisos).toEqual([]);
    await fs.cambiarDesdeFuera(RUTA, escribirPizarra(conTexto("de otro equipo")));
    await e.pizarra.alVolverALaVentana();
    expect(textos(e)).toEqual(["de otro equipo"]);
    expect(e.pizarra.avisos.join(" ")).toMatch(/cambió fuera/);
  });

  it("si se borra fuera, la pizarra sigue en pantalla y el siguiente cambio la vuelve a escribir", async () => {
    const { e, fs } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(id, "mía");
    await e.pizarra.alSalir();
    await fs.borrar(RUTA);
    await e.pizarra.alCambiarFuera([{ ruta: RUTA, que: "borrado" }]);
    expect(textos(e)).toEqual(["mía"]);
    expect(e.pizarra.avisos.join(" ")).toMatch(/borró fuera/);
    expect(await fs.existe(RUTA)).toBe(false);
    e.pizarra.editarNota(id, "mía otra vez");
    await e.pizarra.alSalir();
    expect(await fs.leer(RUTA)).toContain("mía otra vez");
  });

  it("cerrar la serie guarda lo pendiente", async () => {
    const { e, fs } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(id, "al cerrar");
    await e.cerrar();
    expect(await fs.leer(RUTA)).toContain("al cerrar");
  });

  it("restaurar una instantánea con un cambio pendiente no da CambioFuera y deja la pizarra de la copia", async () => {
    const { e, fs } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.editarNota(id, "antes");
    await e.pizarra.alSalir();
    const copia = await e.sesionSerie!.instantaneas.crear("con pizarra");
    e.pizarra.editarNota(id, "pendiente");
    await e.restaurar(copia.nombre);
    expect(e.vista).toBe("serie");
    e.cambiarVista("pizarra");
    await e.pizarra.abrir();
    expect(textos(e)).toEqual(["antes"]);
    expect(e.pizarra.error).toBeNull();
    expect(await fs.leer(RUTA)).toContain("antes");
  });

  it("quitar una nota vacía no deja paso de deshacer ni copia", async () => {
    const { e } = await abrir();
    const id = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    expect(e.pizarra.quitarNotaVacia(id)).toBe(true);
    expect(e.pizarra.pizarra.elementos).toHaveLength(0);
    // El paso de crearla desaparece con ella: ni deshacer ni rehacer la devuelven (revisión T17)
    expect(e.pizarra.deshacer()).toBe(false);
    expect(e.pizarra.rehacer()).toBe(false);
    expect(e.pizarra.pizarra.elementos).toHaveLength(0);
  });

  it("subir una nota la pone encima pero no es un paso de deshacer", async () => {
    const { e } = await abrir();
    const a = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    const b = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    e.pizarra.subir(a);
    expect(e.pizarra.pizarra.elementos.map((x) => x.id)).toEqual([b, a]);
    e.pizarra.deshacer();
    expect(e.pizarra.pizarra.elementos.map((x) => x.id)).toEqual([a]);
  });

  it("unir y poner tarjetas pasan por el estado y dicen por qué no", async () => {
    const { e } = await abrir();
    const ev = [...e.sesionSerie!.modelo.eventos.values()][0];
    const a = idDe(e.pizarra.crearNota({ x: 0, y: 0 }));
    const t = idDe(e.pizarra.anadirTarjeta(ev.id, { x: 300, y: 0 }));
    expect("error" in e.pizarra.anadirTarjeta(ev.id, { x: 0, y: 0 })).toBe(true);
    const f = idDe(e.pizarra.unir(a, t, "provoca"));
    expect("error" in e.pizarra.unir(a, t)).toBe(true);
    expect(e.pizarra.pizarra.flechas.map((x) => x.id)).toEqual([f]);
    e.pizarra.etiquetar(f, "causa");
    expect(e.pizarra.pizarra.flechas[0].etiqueta).toBe("causa");
  });
});
