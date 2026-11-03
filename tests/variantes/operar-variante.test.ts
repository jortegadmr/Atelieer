import { afterEach, describe, expect, it, vi } from "vitest";
import { EstadoApp } from "../../src/lib/app/estado.svelte";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { editar } from "../../src/lib/modelo/operaciones";
import type { PiezaDe } from "../../src/lib/modelo/tipos";
import { variante } from "../../src/lib/variantes/tipos";
import { APPDATOS, vaultDePrueba } from "../fixtures/wiki";

// Spec 006, revisión de T28: una operación de la variante cada vez, y nada se
// cierra, aplica ni descarta sin que su nota esté escrita (RF-9, RF-15, RF-39, RF-41).

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

const DIR = `${APPDATOS}/_prueba/_variantes`;

async function conVariante() {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  const m = e.sesionSerie!.modelo;
  const ev = [...m.eventos.values()].find((x) => x.episodio && m.episodios.has(x.episodio) && x.madurez !== "canon")!.id;
  await e.nuevaVariante();
  await titular(e, ev, "En la variante");
  await e.variante!.escritor.vaciar();
  return { e, fs, ev, id: e.variante!.datos.id, original: m.eventos.get(ev)!.titulo };
}

const titular = (e: EstadoApp, id: string, titulo: string) => e.sesion!.aplicar(editar(e.sesion!.modelo, id, (p) => ((p as PiezaDe<"evento">).titulo = titulo)));
const fallarVariantes = (op: string, r: string) => (op === "escribir" && r.includes("_variantes") ? ("entero" as const) : null);

describe("una operación de la variante cada vez (spec 006)", () => {
  it("mientras se aplica, la variante abierta no se cambia y «Ver ahora» espera", async () => {
    const { e, ev } = await conVariante();
    await e.pedirAplicar(e.variante!.datos.id, "barra");
    const aplicando = e.aplicarVariante();
    expect(e.operando).toBe(true);
    expect(await titular(e, ev, "Durante")).toBe(false);
    e.verAhora(true);
    expect(e.viendoAhora).toBe(false);
    expect(await aplicando).toBe(true);
    expect(e.operando).toBe(false);
    expect(e.sesionSerie!.modelo.eventos.get(ev)!.titulo).toBe("En la variante");
    expect(e.sesionSerie!.edicionBloqueada).toBeNull();
  });

  it("si la nota no se puede escribir, aparcar no cierra la variante y lo dice; luego sí", async () => {
    const { e, fs, ev, id } = await conVariante();
    await titular(e, ev, "Otra vez");
    fs.fallo = fallarVariantes;
    expect(await e.aparcar()).toBe(false);
    expect(e.variante?.datos.id).toBe(id);
    expect(e.avisoVariante).toMatch(/No se pudo guardar la variante .*sigue abierta para no perder nada\./);
    fs.fallo = null;
    expect(await e.aparcar()).toBe(true);
    expect(e.variante).toBeNull();
    expect(await fs.leer(`${DIR}/${id}.md`)).toContain("Otra vez");
  });

  it("si la nota no se puede escribir, no se aplica ni se descarta", async () => {
    const { e, fs, ev, id, original } = await conVariante();
    await titular(e, ev, "Otra vez");
    fs.fallo = fallarVariantes;
    await e.pedirAplicar(id, "barra");
    expect(await e.aplicarVariante()).toBe(false);
    expect(e.confirmarAplicar?.frases.join(" ")).toContain("No se ha aplicado nada.");
    expect(e.sesionSerie!.modelo.eventos.get(ev)!.titulo).toBe(original);
    await e.descartarVariante("No");
    expect(e.variante?.datos.id).toBe(id);
    expect(e.avisoVariante).toContain("no se ha descartado");
    fs.fallo = null;
    expect((await e.sesionSerie!.variantes.leer(id)).estado).toBe("aparcada");
  });

  it("si la nota cambió fuera al aplicar, no se aplica y se vuelve a abrir con lo de fuera", async () => {
    const { e, fs, ev, id, original } = await conVariante();
    const ruta = `${DIR}/${id}.md`;
    await fs.cambiarDesdeFuera(ruta, (await fs.leer(ruta)).replaceAll("En la variante", "De fuera"));
    await titular(e, ev, "Mía");
    await e.pedirAplicar(id, "barra");
    expect(await e.aplicarVariante()).toBe(false);
    expect(e.sesionSerie!.modelo.eventos.get(ev)!.titulo).toBe(original);
    await vi.waitFor(() => expect(e.variante?.modelo.eventos.get(ev)!.titulo).toBe("De fuera"), { timeout: 2000, interval: 10 });
    expect(e.avisoVariante).toContain("se ha vuelto a abrir con lo de fuera");
  });

  it("si la nota cambió fuera al aparcar, queda aparcada con lo de fuera y no se vuelve a abrir", async () => {
    const { e, fs, ev, id } = await conVariante();
    const ruta = `${DIR}/${id}.md`;
    await fs.cambiarDesdeFuera(ruta, (await fs.leer(ruta)).replaceAll("En la variante", "De fuera"));
    await titular(e, ev, "Mía");
    expect(await e.aparcar()).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(e.variante).toBeNull();
    expect(e.avisoVariante).toContain("queda aparcada con lo de fuera");
    expect(await fs.leer(ruta)).toContain("De fuera");
  });
});

describe("cerrar la variante no deja reintentos sueltos (spec 006, RF-9, RF-41)", () => {
  it("una escritura fallida antes de cerrar no vuelve a poner aparcada una variante descartada", async () => {
    const { e, fs, ev } = await conVariante();
    const s = e.sesionSerie!;
    const v = await SesionVariante.abrirSobre(s, variante("va-reti", "Reintento", ""));
    await v.aplicar(editar(v.modelo, ev, (p) => ((p as PiezaDe<"evento">).titulo = "Primera")));
    expect(await v.escritor.vaciar()).toBe("bien");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await v.aplicar(editar(v.modelo, ev, (p) => ((p as PiezaDe<"evento">).titulo = "Segunda")));
    fs.fallo = fallarVariantes;
    expect(await v.escritor.vaciar()).toBe("error");
    await v.cerrar();
    fs.fallo = null;
    await s.descartarVariante("va-reti", "No");
    await vi.advanceTimersByTimeAsync(5000);
    expect((await s.variantes.leer("va-reti")).estado).toBe("descartada");
  });
});
