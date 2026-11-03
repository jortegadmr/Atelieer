import { afterEach, describe, expect, it } from "vitest";
import { EstadoApp, VIENDO_AHORA } from "../../src/lib/app/estado.svelte";
import { editar } from "../../src/lib/modelo/operaciones";
import type { PiezaDe } from "../../src/lib/modelo/tipos";
import { crearPieza as crearEnNivel } from "../../src/lib/vistas/crear";
import { escribirVariante } from "../../src/lib/variantes/formato";
import { variante } from "../../src/lib/variantes/tipos";
import { APPDATOS, vaultDePrueba } from "../fixtures/wiki";

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

const DIR = `${APPDATOS}/_prueba/_variantes`;

async function abrir() {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  return { e, fs };
}

/** Un episodio y una escena suya de la serie de prueba */
function algo(e: EstadoApp) {
  const m = e.sesionSerie!.modelo;
  const ev = [...m.eventos.values()].find((x) => x.episodio && m.episodios.has(x.episodio))!;
  return { ev: ev.id, ep: ev.episodio, t: ev.temporada };
}

const titular = (e: EstadoApp, id: string, titulo: string) => e.sesion!.aplicar(editar(e.sesion!.modelo, id, (p) => ((p as PiezaDe<"evento">).titulo = titulo)));

describe("las variantes en el estado de la app (spec 006)", () => {
  it("una variante nueva se ve en lugar de la serie; al aparcarla se guarda y se vuelve a la serie (RF-2, RF-25)", async () => {
    const { e, fs } = await abrir();
    const { ev } = algo(e);
    const original = e.sesionSerie!.modelo.eventos.get(ev)!.titulo;
    await e.nuevaVariante();
    expect(e.variante).not.toBeNull();
    expect(e.sesion).toBe(e.variante);
    expect(e.variante!.datos.nombre).toMatch(/^¿Y si…\? \d+ \w+, \d\d:\d\d$/);
    await titular(e, ev, "En la variante");
    expect(e.sesionSerie!.modelo.eventos.get(ev)!.titulo).toBe(original);
    const id = e.variante!.datos.id;
    e.elegir(ev);
    await e.aparcar();
    expect(e.variante).toBeNull();
    expect(e.sesion).toBe(e.sesionSerie);
    expect(e.seleccion).toBe(ev);
    expect(await fs.leer(`${DIR}/${id}.md`)).toContain("En la variante");
    expect(e.sesionSerie!.variantes.lista.get(id)?.elegida).toBe(ev);
    // Se vuelve a abrir tal como se dejó (RF-5)
    expect(await e.abrirVariante(id)).toBe(true);
    expect(e.sesion!.modelo.eventos.get(ev)!.titulo).toBe("En la variante");
    expect(e.seleccion).toBe(ev);
  });

  it("aparcar una variante sin cambios no deja nada y lo dice (RF-26)", async () => {
    const { e, fs } = await abrir();
    await e.nuevaVariante();
    const id = e.variante!.datos.id;
    await e.aparcar();
    expect(await fs.existe(`${DIR}/${id}.md`)).toBe(false);
    expect(e.avisoVariante).toBe("No cambiaba nada: no se guarda.");
  });

  it("una variante que se queda sin cambios (Ctrl Z) va a la papelera al aparcarla, no se borra", async () => {
    const { e, fs } = await abrir();
    const { ev } = algo(e);
    await e.nuevaVariante();
    const id = e.variante!.datos.id;
    await titular(e, ev, "Algo");
    await e.variante!.escritor.vaciar();
    await e.sesion!.deshacer();
    await e.aparcar();
    expect(await fs.existe(`${DIR}/${id}.md`)).toBe(false);
    const papelera = await fs.listar(`${APPDATOS}/_prueba/_papelera`);
    expect(papelera.some((x) => x.nombre.endsWith(` ${id}.md`))).toBe(true);
  });

  it("al abrir la serie, una variante sin cambios que quedó de antes va a la papelera (RF-26, RF-27)", async () => {
    const { e, fs } = await abrir();
    await fs.escribir(`${DIR}/va-vaci.md`, escribirVariante(variante("va-vaci", "Vacía", "2026-10-21 18:20")));
    await e.abrir("_prueba");
    expect(await fs.existe(`${DIR}/va-vaci.md`)).toBe(false);
    expect(e.sesionSerie!.variantes.lista.has("va-vaci")).toBe(false);
  });

  it("abrir otra aparca la abierta y lo dice (RF-6)", async () => {
    const { e } = await abrir();
    const { ev } = algo(e);
    await e.nuevaVariante();
    const a = e.variante!.datos;
    await titular(e, ev, "En A");
    await e.nuevaVariante();
    expect(e.variante!.datos.id).not.toBe(a.id);
    expect(e.avisoVariante).toBe(`«${a.nombre}» queda aparcada.`);
    expect(e.sesionSerie!.variantes.lista.get(a.id)?.estado).toBe("aparcada");
  });

  it("«Probar otra versión» de una pieza: «Otra versión de «título»», con esa pieza elegida (RF-3)", async () => {
    const { e } = await abrir();
    const { ep } = algo(e);
    const titulo = e.sesionSerie!.modelo.episodios.get(ep)!.titulo.trim();
    await e.probarOtraVersion(ep);
    expect(e.variante!.datos).toMatchObject({ nombre: `Otra versión de «${titulo}»`, origen: ep });
    expect(e.seleccion).toBe(ep);
  });

  it("«Ver ahora» enseña la serie con la edición bloqueada; si la pieza solo está en la variante, elige la que la contiene (RF-14 a RF-16)", async () => {
    const { e } = await abrir();
    const { ep, t } = algo(e);
    await e.nuevaVariante();
    const { pieza, cambio } = crearEnNivel(e.sesion!.modelo, { tipo: "episodio", temporada: t, episodio: ep }, "evento", { titulo: "Solo en la variante" });
    await e.sesion!.aplicar(cambio);
    e.elegir(pieza.id);
    e.verAhora(true);
    expect(e.sesion).toBe(e.sesionSerie);
    expect(e.sesionSerie!.edicionBloqueada).toBe(VIENDO_AHORA);
    expect(e.seleccion).toBe(ep);
    expect(e.avisoVariante).toMatch(/no existe en lo que ves/);
    e.verAhora(false);
    expect(e.sesion).toBe(e.variante);
    expect(e.sesionSerie!.edicionBloqueada).toBeNull();
  });

  it("Ctrl I con una variante abierta apunta la idea en la serie, y la variante la ve (RF-8b)", async () => {
    const { e } = await abrir();
    await e.nuevaVariante();
    e.abrirCaptura();
    expect(await e.guardarIdea("Nando duda")).toBe(true);
    const enSerie = [...e.sesionSerie!.modelo.eventos.values()].find((x) => x.titulo === "Nando duda");
    expect(enSerie).toBeDefined();
    expect(e.variante!.modelo.eventos.get(enSerie!.id)).toBe(enSerie);
    expect(e.variante!.datos.piezas.size).toBe(0);
    expect(e.tostada?.texto).toMatch(/fuera de la variante/);
    // Y su «Deshacer» la quita de la serie, también viendo ahora
    e.verAhora(true);
    await e.deshacerIdea();
    expect(e.sesionSerie!.modelo.eventos.has(enSerie!.id)).toBe(false);
  });

  it("cerrar la serie aparca la variante abierta (RF-27)", async () => {
    const { e, fs } = await abrir();
    const { ev } = algo(e);
    await e.nuevaVariante();
    const id = e.variante!.datos.id;
    await titular(e, ev, "Antes de cerrar");
    await e.cerrar();
    expect(await fs.leer(`${DIR}/${id}.md`)).toContain("Antes de cerrar");
  });
});

describe("rendimiento de «Ver ahora» (spec 006, RNF)", () => {
  it("serie grande: cambiar entre «Ahora» y «Cómo quedaría» en menos de 100 ms", async () => {
    const { generarPruebaGrande } = await import("../../scripts/datos-grande");
    const { FsMemoria } = await import("../../src/lib/almacen/fs-memoria");
    const { Almacen } = await import("../../src/lib/almacen/almacen");
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, "/appDatos");
    const d = generarPruebaGrande();
    await almacen.crearSerie("g", { titulo: "G" });
    for (const p of [d.serie, ...d.puntos, ...d.temporadas, ...d.episodios, ...d.arcos, ...d.eventos, ...d.secretos]) await almacen.guardar("g", p);
    const e = new EstadoApp(fs, async () => "PC");
    abiertos.push(e);
    await e.ponerRaiz("/appDatos");
    await e.abrir("g");
    await e.nuevaVariante();
    const ev = [...e.sesion!.modelo.eventos.values()][5];
    await titular(e, ev.id, "En la variante");
    e.elegir(ev.id);
    // Calentar: la primera vez se comprueba cada modelo
    e.verAhora(true);
    e.verAhora(false);
    const veces = 6;
    const t0 = performance.now();
    for (let i = 0; i < veces; i++) e.verAhora(i % 2 === 0);
    const ms = (performance.now() - t0) / veces;
    console.log(`Cambiar entre Ahora y Cómo quedaría (serie grande): ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(100);
    expect(e.seleccion).toBe(ev.id);
  }, 60_000);
});
