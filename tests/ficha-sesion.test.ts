import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import type { Temporada } from "../src/lib/modelo/tipos";
import { variante } from "../src/lib/variantes/tipos";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 009, RF-38, RF-39c, RF-40 a RF-42: la sesión escribe en la ficha por un solo camino.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

const ID = "te-t001";
const temporada = (s: Sesion) => s.modelo.temporadas.get(ID)!;
const fichaDe = (s: Sesion) => `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;

/** Una serie con la ficha de T01 creada; el reloj del disco va un minuto por delante */
async function conFicha() {
  const fs: FsMemoria = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  expect((await s.cambiarEstado(ID, "borrador")).hecho).toBe(true);
  await s.guardado.vaciar();
  const luego = Date.now() + 60_000;
  fs.reloj = () => luego;
  return { fs, s };
}

describe("guardar un apartado desde la sesión (spec 009, RF-39c, RF-40)", () => {
  it("no entra en el Ctrl Z", async () => {
    const { fs, s } = await conFicha();
    const paso = s.historial.ultimoPaso();
    const r = await s.guardarApartado(ID, (await s.leerFichaDe(ID))!, 1, "Escrito en Atelier.");
    expect(r.ok).toBe(true);
    expect(await fs.leer(fichaDe(s))).toContain("## Núcleo\nEscrito en Atelier.\n");
    expect(s.historial.ultimoPaso()).toBe(paso);
  });

  it("pone al día la fecha de la ficha en la pieza", async () => {
    const { fs, s } = await conFicha();
    await s.guardarApartado(ID, (await s.leerFichaDe(ID))!, 1, "Uno.");
    expect(temporada(s).wiki_mtime).toBe(new Date((await fs.fecha(fichaDe(s)))!).toISOString());
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(false);
  });

  it("Ctrl Z de un paso anterior no da Cambió en la wiki", async () => {
    const { s } = await conFicha();
    s.editar<Temporada>(ID, (p) => (p.titulo = "Otro título"));
    await s.guardarApartado(ID, (await s.leerFichaDe(ID))!, 1, "Uno.");
    const fecha = temporada(s).wiki_mtime;
    await s.deshacer();
    expect(temporada(s).titulo).toBe("Cerrar la emisora");
    expect(temporada(s).wiki_mtime).toBe(fecha);
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(false);
  });

  it("si la ficha ya estaba marcada como cambiada fuera, se queda marcada", async () => {
    const { fs, s } = await conFicha();
    await fs.escribir(fichaDe(s), (await fs.leer(fichaDe(s))) + "\nDe Obsidian.\n");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(true);
    const fecha = temporada(s).wiki_mtime;
    expect((await s.guardarApartado(ID, (await s.leerFichaDe(ID))!, 1, "Uno.")).ok).toBe(true);
    expect(temporada(s).wiki_mtime).toBe(fecha);
  });

  it("lo pendiente se guarda antes de que la app escriba el estado", async () => {
    const { fs, s } = await conFicha();
    const leida = (await s.leerFichaDe(ID))!;
    let guardado = false;
    s.fichaPendiente = async () => {
      if (guardado) return;
      guardado = true;
      await s.guardarApartado(ID, leida, 1, "Pendiente.");
    };
    const antes = s.fichasEscritas.get(leida.ruta) ?? 0;
    expect((await s.cambiarEstado(ID, "canon")).hecho).toBe(true);
    const texto = await fs.leer(fichaDe(s));
    expect(texto).toContain("## Núcleo\nPendiente.\n");
    expect(texto).toContain("estado_canon: canon");
    expect(s.fichasEscritas.get(leida.ruta)).toBe(antes + 2);
  });

  it("canon bloqueado y variante no escriben", async () => {
    const { fs, s } = await conFicha();
    const leida = (await s.leerFichaDe(ID))!;
    const v = await SesionVariante.abrirSobre(s, variante("va-ficha", "Otra", ""));
    expect(await v.guardarApartado(ID, leida, 1, "x")).toMatchObject({ ok: false, mensaje: "La wiki solo cambia al aplicar la variante." });
    await s.cambiarEstado(ID, "canon");
    const texto = await fs.leer(fichaDe(s));
    expect(await s.guardarApartado(ID, (await s.leerFichaDe(ID))!, 1, "x")).toMatchObject({ ok: false, mensaje: "Canon: desbloquéala para editar su ficha" });
    expect(await fs.leer(fichaDe(s))).toBe(texto);
  });
});

describe("ruta segura al leer las fichas (spec 009, RF-43)", () => {
  it("un enlace con ../ no se lee, no se escribe ni lo revisa revisarFichas", async () => {
    const { fs, s } = await conFicha();
    const fuera = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/../../Fuera.md`;
    await fs.escribir(fuera, "---\nestado_canon: borrador\n---\n## Núcleo\nNo es una ficha.\n");
    s.editar<Temporada>(ID, (p) => (p.wiki = "[[../../Fuera]]"));
    expect(await s.leerFichaDe(ID)).toBeNull();
    const r = await s.escribirEnFicha(ID, async () => {
      throw new Error("no debería escribir");
    });
    expect(r).toMatchObject({ ok: false, motivo: "no está" });
    await s.cambiarEstado(ID, "canon");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.existe ?? false).toBe(false);
    expect(await fs.leer(fuera)).toBe("---\nestado_canon: borrador\n---\n## Núcleo\nNo es una ficha.\n");
  });
});
