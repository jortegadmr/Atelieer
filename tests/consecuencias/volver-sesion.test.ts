import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as op from "../../src/lib/modelo/operaciones";
import type { Pieza } from "../../src/lib/modelo/tipos";
import { crearEscena } from "../../src/lib/vistas/actos";
import { leidoPorV1 } from "../compat/uso-v1";
import { abrir, serieBasica } from "./ayuda";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 21, 10, 0));
});
afterEach(() => vi.useRealTimers());

type Abierta = Awaited<ReturnType<typeof abrir>>;

/** Lo que hay en disco de una pieza (o null si no está) */
async function nota({ s, fs, almacen }: Abierta, p: Pick<Pieza, "tipo" | "id">): Promise<string | null> {
  const ruta = almacen.rutaPieza(s.carpeta, p);
  return (await fs.existe(ruta)) ? fs.leer(ruta) : null;
}

/** Notas que hay en la papelera de la serie */
async function papelera({ fs, almacen, s }: Abierta): Promise<string[]> {
  const dir = `${almacen.rutaSerie(s.carpeta)}/_papelera`;
  return (await fs.existe(dir)) ? (await fs.listar(dir)).map((e) => e.nombre) : [];
}

const editar = (x: Abierta, id: string, fn: (p: Record<string, unknown>) => void) =>
  x.s.aplicar(op.editar(x.s.modelo, id, fn as unknown as (p: Pieza) => void));

describe("Sesion.volverAComoEstaba (spec 005, RF-18 a RF-21)", () => {
  it("deja la abierta exacta, con sus valores a mano y sus campos desconocidos, y la v1.0 la lee", async () => {
    const { b, t } = serieBasica();
    const temporada = b.temporadas.find((x) => x.id === t)!;
    temporada.crudos = { madurez: "en revisión" };
    temporada.extra = { raro: "sí" };
    const x = await abrir(b);
    const leida = x.s.modelo.temporadas.get(t)!;
    expect(leida.crudos?.madurez).toBe("en revisión");
    x.s.empezarComparacion(t);
    const antes = JSON.stringify(leida);
    const texto = await nota(x, leida);

    await editar(x, t, (p) => ((p.madurez = "borrador"), (p.titulo = "Otra")));
    expect(x.s.modelo.temporadas.get(t)!.crudos).toBeUndefined();
    await x.s.guardado.vaciar();
    expect(await nota(x, leida)).not.toBe(texto);

    const r = await x.s.volverAComoEstaba();
    expect(r).toEqual({ devueltas: 1, eraNueva: false, titulo: "Otra" });
    expect(JSON.stringify(x.s.modelo.temporadas.get(t))).toBe(antes);
    expect(await nota(x, leida)).toBe(texto);
    expect(x.s.avisosCambio).toEqual(["Devuelta 1 pieza."]);
    expect(leidoPorV1((await nota(x, leida))!, "temporada").titulo).toBe("Primera");
    await x.s.cerrar();
  });

  it("lo borrado con la abierta vuelve a su sitio y su copia se queda en la papelera; la abierta creada vuelve a ella", async () => {
    const { b, t, e2, s4 } = serieBasica();
    const x = await abrir(b);
    const episodio = x.s.modelo.episodios.get(e2)!;
    const textoEp = await nota(x, episodio);
    x.s.empezarComparacion(t);
    // Borrar un episodio cambia la temporada (la abierta) y deja su escena en la bandeja
    expect(await x.s.aplicar(op.borrarPieza(x.s.modelo, e2))).toBe(true);
    expect(await papelera(x)).toHaveLength(1);
    expect(await x.s.volverAComoEstaba()).toMatchObject({ devueltas: 3, eraNueva: false });
    expect(await nota(x, episodio)).toBe(textoEp);
    // Spec 007: la copia de la papelera no se borra
    expect(await papelera(x)).toHaveLength(1);
    expect(x.s.modelo.eventos.get(s4)!.episodio).toBe(e2);
    expect(leidoPorV1((await nota(x, x.s.modelo.eventos.get(s4)!))!, "evento").episodio).toBe(e2);

    // Una escena recién creada desde la app: su punto de partida es el de antes de crearla
    const { cambio, pieza } = crearEscena(x.s.modelo, e2, "2", { titulo: "Nueva" });
    expect(await x.s.aplicar(cambio)).toBe(true);
    x.s.empezarComparacion(pieza.id);
    expect(await x.s.volverAComoEstaba()).toMatchObject({ eraNueva: true, titulo: "Nueva" });
    expect(x.s.modelo.eventos.has(pieza.id)).toBe(false);
    expect(await nota(x, pieza)).toBeNull();
    expect(await papelera(x)).toHaveLength(2);
    expect(x.s.avisosCambio).toContain("«Nueva» ha vuelto a la papelera; Ctrl Z la recupera.");
    expect(x.s.comparacion).toBeNull();
    await x.s.cerrar();
  });

  it("cambiado fuera sin que lo vea la vigilancia: no devuelve nada", async () => {
    const { b, s1 } = serieBasica();
    const x = await abrir(b);
    x.s.empezarComparacion(s1);
    await editar(x, s1, (p) => (p.titulo = "Uno bis"));
    await x.s.guardado.vaciar();
    const p = x.s.modelo.eventos.get(s1)!;
    const ruta = x.almacen.rutaPieza(x.s.carpeta, p);
    const deFuera = (await x.fs.leer(ruta)).replace("Uno bis", "Uno de Obsidian");
    await x.fs.escribir(ruta, deFuera);
    expect(await x.s.volverAComoEstaba()).toBeNull();
    expect(x.s.avisosCambio[0]).toMatch(/cambió fuera de Atelier: no se ha devuelto nada/);
    expect(await x.fs.leer(ruta)).toBe(deFuera);
    await x.s.cerrar();
  });

  it("canon bloqueado: no devuelve nada y dice por qué", async () => {
    const { b, s1, s2, e2 } = serieBasica();
    const x = await abrir(b);
    x.s.empezarComparacion(s1);
    await editar(x, s1, (p) => (p.titulo = "Uno bis"));
    await x.s.cambiarEstado(s1, "canon");
    const antes = await nota(x, x.s.modelo.eventos.get(s2)!);
    expect(await x.s.volverAComoEstaba()).toBeNull();
    expect(x.s.avisosCambio).toEqual(["«Uno bis» es canon: desbloquéala para volver."]);
    expect(x.s.modelo.eventos.get(s1)!.titulo).toBe("Uno bis");
    expect(await nota(x, x.s.modelo.eventos.get(s2)!)).toBe(antes);
    void e2;
    await x.s.cerrar();
  });

  it("avisa de la ficha de la wiki que se queda", async () => {
    const { b, t } = serieBasica();
    const x = await abrir(b);
    x.s.empezarComparacion(t);
    await editar(x, t, (p) => (p.wiki = "[[T01 - Primera]]"));
    expect(await x.s.volverAComoEstaba()).toMatchObject({ devueltas: 1 });
    expect(x.s.avisosCambio[0]).toMatch(/«T01 - Primera» se queda en la wiki/);
    expect(x.s.modelo.temporadas.get(t)!.wiki).toBe("");
    await x.s.cerrar();
  });
});

describe("«Volver a como estaba» a la vez que otra cosa (spec 005, RF-20)", () => {
  /** La abierta (s1) movida al final de su episodio: s1, s2 y s3 renumeradas */
  async function movida() {
    const { b, e1, s1, s2, s3 } = serieBasica();
    const x = await abrir(b);
    x.s.empezarComparacion(s1);
    expect(await x.s.aplicar(op.moverEvento(x.s.modelo, s1, e1, 2))).toBe(true);
    await x.s.guardado.vaciar();
    const ids = [s1, s2, s3];
    const orden = () => ids.map((id) => x.s.modelo.eventos.get(id)!.orden);
    const enDisco = async () => Promise.all(ids.map(async (id) => Number(/orden: *(\d+)/.exec((await nota(x, { tipo: "evento", id }))!)![1])));
    return { x, s1, s2, s3, orden, enDisco };
  }

  it("pulsado dos veces seguidas: devuelve una vez, y el modelo y el disco quedan iguales", async () => {
    const { x, orden, enDisco } = await movida();
    expect(orden()).toEqual([3, 1, 2]);
    const [r1, r2] = await Promise.all([x.s.volverAComoEstaba(), x.s.volverAComoEstaba()]);
    await x.s.guardado.vaciar();
    expect([r1?.devueltas, r2]).toEqual([3, null]);
    expect(orden()).toEqual([1, 2, 3]);
    expect(await enDisco()).toEqual([1, 2, 3]);
    expect(x.s.guardado.aviso).toBeNull();
    expect(x.s.comparacion!.deFuera.size).toBe(0);
    expect(x.s.avisosCambio).toEqual(["Devueltas 3 piezas."]);
    await x.s.cerrar();
  });

  it("Ctrl Z dos veces seguidas sobre Volver: deshace Volver una vez y el paso de antes sigue en su pila", async () => {
    const { x, orden, enDisco } = await movida();
    expect(await x.s.volverAComoEstaba()).not.toBeNull();
    await Promise.all([x.s.deshacer(), x.s.deshacer()]);
    await x.s.guardado.vaciar();
    expect(orden()).toEqual([3, 1, 2]);
    expect(await enDisco()).toEqual([3, 1, 2]);
    expect(x.s.historial.puedeDeshacer).toBe(true);
    // El paso de mover sigue ahí: Ctrl Z lo deshace
    await x.s.deshacer();
    expect(orden()).toEqual([1, 2, 3]);
    await x.s.cerrar();
  });

  it("si algo cambia en Atelier mientras comprueba el disco: no devuelve nada, no lo toma por de fuera y no relee", async () => {
    const { x, s2, orden, enDisco } = await movida();
    const volver = x.s.volverAComoEstaba();
    // Mientras Volver espera al disco, el autor edita una de las renumeradas
    await editar(x, s2, (p) => (p.titulo = "Dos bis"));
    expect(await volver).toBeNull();
    expect(x.s.avisosCambio).toEqual(["Algo cambió mientras tanto: no se ha devuelto nada. Vuelve a probar."]);
    await x.s.guardado.vaciar();
    expect(x.s.modelo.eventos.get(s2)!.titulo).toBe("Dos bis");
    expect(orden()).toEqual([3, 1, 2]);
    expect(await enDisco()).toEqual([3, 1, 2]);
    expect(x.s.guardado.aviso).toBeNull();
    expect(x.s.comparacion!.deFuera.size).toBe(0);
    await x.s.cerrar();
  });

  it("lo que sale de la papelera no pisa una nota que el autor ya ha vuelto a poner en su sitio", async () => {
    const { b, t, e2 } = serieBasica();
    const x = await abrir(b);
    const episodio = x.s.modelo.episodios.get(e2)!;
    x.s.empezarComparacion(t);
    expect(await x.s.aplicar(op.borrarPieza(x.s.modelo, e2))).toBe(true);
    // Sacada a mano de la papelera y cambiada, sin que la vigilancia la haya visto
    const ruta = x.almacen.rutaPieza(x.s.carpeta, episodio);
    const suya = `${(await x.fs.leer(`${x.almacen.rutaSerie(x.s.carpeta)}/_papelera/${(await papelera(x))[0]}`)).replace("Sin título", "Mío")}\\nNotas del autor\\n`;
    x.fs.vigilanciaNativa = false;
    await x.fs.escribir(ruta, suya);
    x.fs.vigilanciaNativa = true;
    expect(await x.s.volverAComoEstaba()).toBeNull();
    expect(x.s.avisosCambio[0]).toMatch(/cambió fuera de Atelier: no se ha devuelto nada/);
    expect(await x.fs.leer(ruta)).toBe(suya);
    await x.s.cerrar();
  });
});

describe("Sesion.efectos (spec 005)", () => {
  it("se recalcula al releer la guía aunque el modelo no cambie (reglas e «Ir al campo»)", async () => {
    const { b, s1 } = serieBasica();
    const x = await abrir(b);
    x.s.empezarComparacion(s1);
    await editar(x, s1, (p) => (p.titulo = "Uno bis"));
    const antes = x.s.efectos();
    expect(x.s.efectos()).toBe(antes);
    await x.s.crearGuia();
    expect(x.s.efectos()).not.toBe(antes);
    await x.s.cerrar();
  });
});

describe("Ctrl Z y Ctrl Y de «Volver a como estaba» (spec 005, RF-19, RF-20)", () => {
  /** La abierta (s1) movida a e2 con sus renumeradas, y vuelta a como estaba */
  async function vuelta() {
    const { b, s1, s4, e1, e2 } = serieBasica();
    const x = await abrir(b);
    x.s.empezarComparacion(s1);
    await editar(x, s1, (p) => (p.titulo = "Uno bis"));
    expect(await x.s.aplicar(op.moverEvento(x.s.modelo, s1, e2, 0))).toBe(true);
    expect(await x.s.volverAComoEstaba()).toMatchObject({ devueltas: 2 });
    return { x, s1, s4, e1, e2 };
  }

  it("Volver es un paso: Ctrl Z lo deshace entero y Ctrl Y lo rehace entero", async () => {
    const { x, s1, s4, e1, e2 } = await vuelta();
    const ev = (id: string) => x.s.modelo.eventos.get(id)!;
    expect([ev(s1).titulo, ev(s1).episodio]).toEqual(["Uno", e1]);
    await x.s.deshacer();
    expect([ev(s1).titulo, ev(s1).episodio, ev(s4).orden]).toEqual(["Uno bis", e2, 2]);
    expect(await nota(x, ev(s4))).toContain("orden: 2");
    await x.s.rehacer();
    expect([ev(s1).titulo, ev(s1).episodio, ev(s4).orden]).toEqual(["Uno", e1, 1]);
    // Y deshacer otra vez deja lo de antes de Volver, paso a paso
    await x.s.deshacer();
    await x.s.deshacer();
    expect([ev(s1).titulo, ev(s1).episodio]).toEqual(["Uno bis", e1]);
    await x.s.cerrar();
  });

  it("si una pieza cambió fuera, Ctrl Z no hace nada y el paso sigue en su pila", async () => {
    const { x, s1, s4 } = await vuelta();
    const p = x.s.modelo.eventos.get(s4)!;
    const ruta = x.almacen.rutaPieza(x.s.carpeta, p);
    await x.fs.escribir(ruta, (await x.fs.leer(ruta)).replace("Cuatro", "Cuatro de Obsidian"));
    await x.s.releer([ruta]);
    expect(x.s.modelo.eventos.get(s4)!.titulo).toBe("Cuatro de Obsidian");
    const antes = JSON.stringify([...x.s.modelo.todas()]);
    await x.s.deshacer();
    expect(JSON.stringify([...x.s.modelo.todas()])).toBe(antes);
    expect(x.s.avisosCambio).toEqual(["«Cuatro de Obsidian» cambió después fuera de Atelier: no se ha cambiado nada."]);
    expect(x.s.historial.puedeDeshacer).toBe(true);
    expect(x.s.historial.puedeRehacer).toBe(false);
    void s1;
    await x.s.cerrar();
  });
});
