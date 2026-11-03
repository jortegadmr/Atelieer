import { afterEach, describe, expect, it, vi } from "vitest";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import { Almacen } from "../../src/lib/almacen/almacen";
import type { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { FsMemoria as Fs } from "../../src/lib/almacen/fs-memoria";
import { Sesion } from "../../src/lib/app/sesion";
import { SAL_DE_LA_VARIANTE, SesionVariante } from "../../src/lib/app/sesion-variante";
import { escribirPieza } from "../../src/lib/modelo/ficheros";
import { conEstado } from "../../src/lib/modelo/estados";
import { borrarPieza, editar } from "../../src/lib/modelo/operaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { colocarEscena } from "../../src/lib/vistas/actos";
import { crearPieza as crearEnNivel } from "../../src/lib/vistas/crear";
import { leerVariante } from "../../src/lib/variantes/formato";
import { notaNormal } from "../../src/lib/variantes/normal";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, RAIZ, serieBasica } from "../consecuencias/ayuda";

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

/** Todos los ficheros del disco con su contenido, menos los de _variantes/ */
async function disco(fs: FsMemoria, dir = RAIZ): Promise<Map<string, string>> {
  const r = new Map<string, string>();
  for (const e of await fs.listar(dir)) {
    const ruta = `${dir}/${e.nombre}`;
    if (e.esDir) {
      if (e.nombre === "_variantes") continue;
      for (const [k, v] of await disco(fs, ruta)) r.set(k, v);
    } else r.set(ruta, await fs.leer(ruta).catch(() => "(binario)"));
  }
  return r;
}

async function preparar() {
  const x = serieBasica();
  const { s, fs, almacen } = await abrir(x.b);
  abiertas.push(s);
  const v = await SesionVariante.abrirSobre(s, variante("va-prue", "Prueba", "2026-10-21 18:20"));
  abiertas.push(v);
  return { ...x, s, v, fs, almacen };
}

describe("la sesión de una variante (spec 006, RF-8 a RF-11)", () => {
  it("editar, crear, mover, mandar a la papelera, «Lo sé», cambiar de estado y tocar canon no escriben en la serie, la wiki ni el Log", async () => {
    const { s, v, fs, s1, s4, e2, t } = await preparar();
    // Una pieza canon en la serie: en la variante se prueba igual (RF-11)
    await s.aplicar({ guardar: [conEstado(s.modelo.eventos.get(s4)!, "canon")], borrar: [] });
    await s.guardado.vaciar();
    expect(s.estaBloqueada(s4)).toBe(true);
    const antes = await disco(fs);

    await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Nando se va")));
    await v.aplicar(editar(v.modelo, s4, (p) => ((p as PiezaDe<"evento">).titulo = "Canon cambiado en la variante")));
    await v.aplicar(crearEnNivel(v.modelo, { tipo: "episodio", temporada: t, episodio: e2 }, "evento", { titulo: "Nueva" }).cambio);
    await v.aplicar(colocarEscena(v.modelo, s1, e2, ""));
    const s2 = [...v.modelo.eventos.values()].find((e) => e.titulo === "Dos")!.id;
    await v.aplicar(borrarPieza(v.modelo, s2));
    await v.aplicar({ guardar: [conEstado(v.modelo.eventos.get(s4)!, "idea")], borrar: [] });
    await v.escritor.vaciar();
    await s.guardado.vaciar();

    expect(await disco(fs)).toEqual(antes);
    // En la serie no ha cambiado nada; en la variante, sí
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Uno");
    expect(v.modelo.eventos.get(s1)!.titulo).toBe("Nando se va");
    expect(v.modelo.eventos.has(s2)).toBe(false);
    expect(s.modelo.eventos.has(s2)).toBe(true);
    expect(v.estaBloqueada()).toBe(false);
    expect(v.canonEnSerie(s4)).toBe(true);
    // Y la variante está guardada en su nota
    const nota = leerVariante(await fs.leer(`${RAIZ}/s/_variantes/va-prue.md`), "va-prue.md");
    expect(nota.piezas.get(s1)!.pieza).toMatchObject({ titulo: "Nando se va", episodio: e2 });
    expect(nota.piezas.get(s2)!.pieza).toBeNull();
    expect(nota.piezas.get(s1)!.base).toBe(notaNormal(s.modelo.eventos.get(s1)!));
    expect([...nota.sitios.keys()].sort()).toEqual([...new Set([s.modelo.eventos.get(s1)!.episodio, e2])].sort());
  });

  it("escribir y borrar lo escrito no deja nada en la variante", async () => {
    const { v, s1 } = await preparar();
    await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Otro")));
    expect(v.datos.piezas.has(s1)).toBe(true);
    await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Uno")));
    expect(v.datos.piezas.size).toBe(0);
  });

  it("la pieza que vuelve a ser como en la serie enseña lo de la serie de ahora", async () => {
    const { s, v, s1, s3 } = await preparar();
    await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Otro")));
    // Mientras, cambia otra cosa de la serie: la variante la sigue
    await s.aplicar(editar(s.modelo, s3, (p) => ((p as PiezaDe<"evento">).titulo = "Tres en la serie")));
    expect(v.modelo.eventos.get(s3)!.titulo).toBe("Tres en la serie");
    await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Uno")));
    expect(v.modelo.eventos.get(s1)).toBe(s.modelo.eventos.get(s1));
  });

  it("una pieza nueva que se manda a la papelera en la misma variante no queda", async () => {
    const { v, t, e2 } = await preparar();
    const { pieza, cambio } = crearEnNivel(v.modelo, { tipo: "episodio", temporada: t, episodio: e2 }, "evento", { titulo: "Nueva" });
    await v.aplicar(cambio);
    await v.aplicar(borrarPieza(v.modelo, pieza.id));
    expect(v.datos.piezas.has(pieza.id)).toBe(false);
    expect(v.modelo.eventos.has(pieza.id)).toBe(false);
  });

  it("la base de una nota con formato de Obsidian (listas en bloque) es la nota normalizada: no hay cambio por formato", async () => {
    const x = serieBasica();
    const { s, fs } = await abrir(x.b);
    abiertas.push(s);
    // Obsidian reescribe la nota con las listas en bloque
    const ruta = `${RAIZ}/s/eventos/${x.s1}.md`;
    const obsidian = (await fs.leer(ruta)).replace(/arcos: \[(.*)\]/, "arcos:\n  - $1");
    await fs.cambiarDesdeFuera(ruta, obsidian);
    await s.releer([ruta]);
    expect(await fs.leer(ruta)).not.toBe(escribirPieza(s.modelo.eventos.get(x.s1)!));
    const v = await SesionVariante.abrirSobre(s, variante("va-prue", "Prueba", ""));
    abiertas.push(v);
    await v.aplicar(editar(v.modelo, x.s1, (p) => ((p as PiezaDe<"evento">).titulo = "Otro")));
    expect(v.datos.piezas.get(x.s1)!.base).toBe(notaNormal(s.modelo.eventos.get(x.s1)!));
    // Y volver al título de antes la saca de la variante
    await v.aplicar(editar(v.modelo, x.s1, (p) => ((p as PiezaDe<"evento">).titulo = "Uno")));
    expect(v.datos.piezas.size).toBe(0);
  });

  it("una variante que no cambia nada no deja nota", async () => {
    const { v, fs } = await preparar();
    await v.escritor.vaciar();
    await v.cerrar();
    expect(await fs.existe(`${RAIZ}/s/_variantes/va-prue.md`)).toBe(false);
  });

  it("cerrada, no cambia nada", async () => {
    const { v, s1 } = await preparar();
    await v.cerrar();
    expect(await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "Tarde")))).toBe(false);
    expect(v.modelo.eventos.get(s1)!.titulo).toBe("Uno");
  });

  it("serie grande: una edición en la variante en menos de 10 ms", async () => {
    const fs = new Fs();
    const almacen = new Almacen(fs, RAIZ);
    const d = generarPruebaGrande();
    await almacen.crearSerie("g", { titulo: "G" });
    const piezas: Pieza[] = [d.serie, ...d.puntos, ...d.temporadas, ...d.episodios, ...d.arcos, ...d.eventos, ...d.secretos];
    for (const p of piezas) await almacen.guardar("g", p);
    const s = await Sesion.abrir(almacen, "g", "PC");
    abiertas.push(s);
    const v = await SesionVariante.abrirSobre(s, variante("va-gran", "Grande", ""));
    abiertas.push(v);
    const ev = [...v.modelo.eventos.values()][10];
    await v.aplicar(editar(v.modelo, ev.id, (p) => ((p as PiezaDe<"evento">).titulo = "calentar")));
    const veces = 10;
    const t0 = performance.now();
    for (let i = 0; i < veces; i++) await v.aplicar(editar(v.modelo, ev.id, (p) => ((p as PiezaDe<"evento">).titulo = `Título ${i}`)), true, `editar ${ev.id}`);
    const ms = (performance.now() - t0) / veces;
    console.log(`Edición en la variante (serie grande): ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(10);
  }, 30_000);
});

describe("lo que en la variante es distinto (spec 006, RF-10, RF-12)", () => {
  it("el deshacer de la variante es suyo: el de la serie queda tal cual", async () => {
    const { s, v, s1, s3 } = await preparar();
    await s.aplicar(editar(s.modelo, s3, (p) => ((p as PiezaDe<"evento">).titulo = "En la serie")));
    expect(v.historial.puedeDeshacer).toBe(false);
    await v.aplicar(editar(v.modelo, s1, (p) => ((p as PiezaDe<"evento">).titulo = "En la variante")));
    await v.deshacer();
    expect(v.modelo.eventos.get(s1)!.titulo).toBe("Uno");
    expect(v.datos.piezas.size).toBe(0);
    expect(s.modelo.eventos.get(s3)!.titulo).toBe("En la serie");
    expect(s.historial.puedeDeshacer).toBe(true);
    await v.rehacer();
    expect(v.modelo.eventos.get(s1)!.titulo).toBe("En la variante");
    expect(v.datos.piezas.get(s1)!.base).toBe(notaNormal(s.modelo.eventos.get(s1)!));
  });

  it("deshacer y rehacer devuelven los datos de la variante del paso: base y orden de la serie de entonces (no los de ahora)", async () => {
    const { s, v, s1, e1, e2, s4 } = await preparar();
    await v.aplicar(colocarEscena(v.modelo, s1, e2, ""));
    const sitios = new Map(v.datos.sitios);
    expect(sitios.get(e2)).toEqual([s4]);
    // Mientras, la serie mete otra escena en E2: su orden de ahora ya es otro
    const s2 = [...s.modelo.eventos.values()].find((e) => e.titulo === "Dos")!.id;
    await s.aplicar(colocarEscena(s.modelo, s2, e2, ""));
    await v.deshacer();
    expect(v.datos.sitios.size).toBe(0);
    expect(v.datos.piezas.has(s1)).toBe(false);
    await v.rehacer();
    expect(v.datos.sitios).toEqual(sitios);
    expect(v.datos.sitios.get(e1)).toEqual(sitios.get(e1));
    expect(v.modelo.eventos.get(s1)!.episodio).toBe(e2);
  });

  it("cambiar de estado no toca la wiki: pasar a borrador deja la ficha para cuando se aplique", async () => {
    const { v, fs, e1 } = await preparar();
    const antes = await disco(fs);
    const r = await v.cambiarEstado(e1, "borrador", { nombre: "El episodio" });
    expect(r.hecho).toBe(true);
    expect(r.avisos).toEqual(["La ficha se crea en la wiki al aplicar la variante."]);
    expect(v.datos.fichas.get(e1)).toBe("El episodio");
    await v.escritor.vaciar();
    expect(await disco(fs)).toEqual(antes);
  });

  it("«Pasar a la wiki» en la variante apunta el nombre y no escribe en la wiki", async () => {
    const { v, fs, e1 } = await preparar();
    const antes = await disco(fs);
    const r = await v.pasar(e1, "Otro nombre");
    expect(r.pieza).toBeNull();
    expect(v.datos.fichas.get(e1)).toBe("Otro nombre");
    await v.escritor.vaciar();
    expect(await disco(fs)).toEqual(antes);
  });

  it("volver a leer la wiki desde la variante se hace en la serie y no mete piezas en la variante", async () => {
    const { s, v } = await preparar();
    const leer = vi.spyOn(s, "leerWiki");
    await v.leerWiki();
    expect(leer).toHaveBeenCalled();
    expect(v.datos.piezas.size).toBe(0);
    expect(v.wiki).toBe(s.wiki);
  });

  it("crear fichas o guia.md dice «Sal de la variante para…»", async () => {
    const { v } = await preparar();
    await expect(v.crearFicha("personaje", "Nando")).rejects.toThrow(SAL_DE_LA_VARIANTE("crear fichas en la wiki"));
    await v.crearGuia();
    expect(v.avisosCambio).toEqual([SAL_DE_LA_VARIANTE("crear guia.md")]);
  });
});
