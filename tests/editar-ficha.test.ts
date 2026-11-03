import { describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import type { RutasWiki } from "../src/lib/modelo/tipos";
import { guardarApartado, leerFicha } from "../src/lib/wiki/editar-ficha";

// Spec 009, RF-38, RF-39, RF-39b, RF-43: guardar un apartado en la ficha.

const VAULT = "/Vault";
const RUTAS: RutasWiki = {
  raiz: "Wiki",
  personajes: "Wiki/Personajes",
  lugares: "Wiki/Lugares",
  eras: "Wiki/Eras",
  timeline: "Wiki/Timeline.md",
  narrativa: "Wiki/Narrativa",
  log: "Wiki/Log.md",
};
const FICHA = `${VAULT}/Wiki/Narrativa/Arcos/El eco.md`;
const COPIAS = `${VAULT}/appDatos/_prueba/_fichas`;
const TEXTO = "---\nestado_canon: borrador\n---\nIntro\n\n## Herida\nPerdió la emisora.\n";
const P = { tipo: "arco" as const, wiki: "[[El eco]]" };
const OP = { fecha: "2026-10-22", hora: "14-35-08", copia: COPIAS, log: true };

async function preparar() {
  const fs = new FsMemoria();
  await fs.crearDir(`${VAULT}/Wiki/Narrativa/Arcos`);
  await fs.escribir(FICHA, TEXTO);
  const leida = (await leerFicha(fs, VAULT, RUTAS, P))!;
  return { fs, leida };
}

describe("leer la ficha (spec 009, RF-36, RF-43)", () => {
  it("con su ruta, su texto, sus apartados y su estado en la wiki", async () => {
    const { leida } = await preparar();
    expect(leida.ruta).toBe("Wiki/Narrativa/Arcos/El eco.md");
    expect(leida.apartados.map((a) => a.titulo)).toEqual(["Inicio", "Herida"]);
    expect(leida.estadoWiki).toBe("borrador");
  });

  it("si no existe o el enlace sale de la narrativa, null", async () => {
    const { fs } = await preparar();
    expect(await leerFicha(fs, VAULT, RUTAS, { tipo: "arco", wiki: "[[Otra]]" })).toBeNull();
    expect(await leerFicha(fs, VAULT, RUTAS, { tipo: "arco", wiki: "[[../../Log]]" })).toBeNull();
  });
});

describe("guardar un apartado (spec 009, RF-38, RF-39, RF-39b)", () => {
  it("si cambió fuera, no escribe", async () => {
    const { fs, leida } = await preparar();
    await fs.escribir(FICHA, TEXTO + "Algo de Obsidian\n");
    const r = await guardarApartado(fs, VAULT, RUTAS, leida, 1, "Nada", OP);
    expect(r).toMatchObject({ ok: false, motivo: "cambió fuera", mensaje: "La ficha cambió en Obsidian. No se ha guardado." });
    expect(await fs.leer(FICHA)).toBe(TEXTO + "Algo de Obsidian\n");
    expect(await fs.existe(COPIAS)).toBe(false);
  });

  it("si cambia fuera mientras se hace la copia, no escribe (revisión de seguridad)", async () => {
    const { fs, leida } = await preparar();
    const escribir = fs.escribir.bind(fs);
    fs.escribir = async (ruta: string, texto: string) => {
      await escribir(ruta, texto);
      // Obsidian guarda justo cuando Atelier hace la copia
      if (ruta.includes(".md.bak")) await escribir(FICHA, TEXTO + "De Obsidian\n");
    };
    const r = await guardarApartado(fs, VAULT, RUTAS, leida, 1, "Nada", OP);
    expect(r).toMatchObject({ ok: false, motivo: "cambió fuera" });
    expect(await fs.leer(FICHA)).toBe(TEXTO + "De Obsidian\n");
  });

  it("si el Log cambia fuera mientras se apunta, no pisa lo de fuera (revisión de seguridad)", async () => {
    const { fs, leida } = await preparar();
    const LOG = `${VAULT}/Wiki/Log.md`;
    await fs.escribir(LOG, "# Log\n");
    const leer = fs.leer.bind(fs);
    let veces = 0;
    fs.leer = async (ruta: string) => {
      const t = await leer(ruta);
      // Otra herramienta apunta en el Log justo después de que Atelier lo lea
      if (ruta === LOG && veces++ === 0) await fs.escribir(LOG, "# Log\n\n## [2026-10-22] otra | Fuera\n");
      return t;
    };
    const r = await guardarApartado(fs, VAULT, RUTAS, leida, 1, "Le cerraron la emisora.", OP);
    expect(r.ok).toBe(true);
    const log = await leer(LOG);
    expect(log).toContain("## [2026-10-22] otra | Fuera");
    expect(log).toContain("Editada desde Atelier: [[El eco]]");
  });

  it("la primera vez copia y apunta; la segunda, no", async () => {
    const { fs, leida } = await preparar();
    const r = await guardarApartado(fs, VAULT, RUTAS, leida, 1, "Le cerraron la emisora.", OP);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await fs.leer(FICHA)).toBe("---\nestado_canon: borrador\n---\nIntro\n\n## Herida\nLe cerraron la emisora.\n");
    expect(r.leida.texto).toBe(await fs.leer(FICHA));
    expect(await fs.leer(`${COPIAS}/2026-10-22 14-35-08 El eco.md.bak`)).toBe(TEXTO);
    const log = await fs.leer(`${VAULT}/Wiki/Log.md`);
    expect(log).toContain("## [2026-10-22] atelier | Editada desde Atelier: [[El eco]]");
    expect(log).toContain("«Herida»");

    const r2 = await guardarApartado(fs, VAULT, RUTAS, r.leida, 1, "Otra vez.", { ...OP, hora: "14-36-00", copia: null, log: false });
    expect(r2.ok).toBe(true);
    expect((await fs.listar(COPIAS)).length).toBe(1);
    expect(await fs.leer(`${VAULT}/Wiki/Log.md`)).toBe(log);
  });

  it("dos copias en el mismo segundo no se pisan", async () => {
    const { fs, leida } = await preparar();
    const r = await guardarApartado(fs, VAULT, RUTAS, leida, 1, "Uno.", OP);
    if (!r.ok) throw new Error(r.mensaje);
    await guardarApartado(fs, VAULT, RUTAS, r.leida, 1, "Dos.", OP);
    const nombres = (await fs.listar(COPIAS)).map((e) => e.nombre).sort();
    expect(nombres).toEqual(["2026-10-22 14-35-08 El eco (2).md.bak", "2026-10-22 14-35-08 El eco.md.bak"]);
    expect(await fs.leer(`${COPIAS}/2026-10-22 14-35-08 El eco (2).md.bak`)).toContain("Uno.");
  });

  it("lo que rompería la ficha no se guarda", async () => {
    const { fs, leida } = await preparar();
    const r = await guardarApartado(fs, VAULT, RUTAS, leida, 1, "x\n## Nuevo", OP);
    expect(r).toMatchObject({ ok: false, motivo: "no se guarda", mensaje: "Los apartados se crean en Obsidian." });
    expect(await fs.leer(FICHA)).toBe(TEXTO);
  });
});
