import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../../src/lib/almacen/almacen";
import type { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { estadoDe } from "../../src/lib/modelo/estados";
import type { Temporada } from "../../src/lib/modelo/tipos";
import { variante } from "../../src/lib/variantes/tipos";
import { APPDATOS, VAULT, vaultDePrueba } from "../fixtures/wiki";

// Spec 006, RF-37b: la wiki solo se toca al aplicar, después de las notas.

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const ID = "te-t001";
const nota = `${APPDATOS}/_prueba/temporadas/${ID}.md`;
const log = async (fs: FsMemoria, s: Sesion) => fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`).catch(() => "");

async function preparar() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  const v = await SesionVariante.abrirSobre(s, variante("va-wiki", "Con ficha", ""));
  abiertas.push(v);
  return { fs, s, v };
}

describe("la wiki al aplicar una variante (spec 006, RF-37b)", () => {
  it("en la variante no se crea la ficha; al aplicar, sí, con el nombre elegido, su Log y el enlace en la nota", async () => {
    const { fs, s, v } = await preparar();
    const ficha = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 (variante).md`;
    const logAntes = await log(fs, s);
    // En la serie de prueba está en borrador sin ficha: en la variante pasa a canon
    expect((await v.cambiarEstado(ID, "canon", { nombre: "T01 (variante)" })).hecho).toBe(true);
    await v.escritor.vaciar();
    expect(await fs.existe(ficha)).toBe(false);
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r.hecho).toBe(true);
    expect(await fs.leer(ficha)).toContain("estado_canon: canon");
    expect((await log(fs, s)).length).toBeGreaterThan(logAntes.length);
    const t = s.modelo.temporadas.get(ID) as Temporada;
    expect(estadoDe(t)).toBe("canon");
    expect(t.wiki).toBe("[[T01 (variante)]]");
    expect(await fs.leer(nota)).toContain("wiki: \"[[T01 (variante)]]\"");
  });

  it("una pieza con ficha que cambia de estado en la variante pone al día su ficha al aplicar", async () => {
    const { fs, s, v } = await preparar();
    await s.cambiarEstado(ID, "borrador");
    await s.guardado.vaciar();
    const ficha = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;
    expect((await v.cambiarEstado(ID, "descartado", { motivo: "Repite el giro" })).hecho).toBe(true);
    expect(await fs.leer(ficha)).toContain("estado_canon: borrador");
    expect((await s.aplicarVariante(v.datos, v.modelo)).hecho).toBe(true);
    expect(await fs.leer(ficha)).toContain("estado_canon: descartado");
    expect(await log(fs, s)).toContain("Estado de [[T01 - Cerrar la emisora]]: descartado");
  });

  it("si la ficha no se puede crear, las notas de la serie vuelven y se dice qué queda", async () => {
    const { fs, s, v } = await preparar();
    await v.cambiarEstado(ID, "canon");
    await v.escritor.vaciar();
    const antes = await fs.leer(nota);
    fs.fallo = (op, r) => (op === "escribir" && r.includes("/_wiki/") && r.includes("/Temporadas/") ? "entero" : null);
    const r = await s.aplicarVariante(v.datos, v.modelo);
    fs.fallo = null;
    expect(r).toMatchObject({ hecho: false, motivo: "wiki" });
    expect(!r.hecho && r.avisos.join(" ")).toMatch(/han vuelto a como estaban/);
    expect(await fs.leer(nota)).toBe(antes);
    expect(estadoDe(s.modelo.temporadas.get(ID)!)).toBe("borrador");
    expect(s.edicionBloqueada).toBeNull();
  });

  it("si falla el estado de una ficha enlazada, las notas vuelven y la ficha creada se queda (y se dice)", async () => {
    const { fs, s, v } = await preparar();
    await s.cambiarEstado(ID, "borrador");
    await s.guardado.vaciar();
    const enlazada = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;
    const otra = [...v.modelo.temporadas.values()].find((t) => t.id !== ID)!;
    await v.cambiarEstado(otra.id, "canon", { nombre: "Otra (variante)" });
    await v.cambiarEstado(ID, "descartado", { motivo: "No" });
    await v.escritor.vaciar();
    const antes = await fs.leer(nota);
    fs.fallo = (op, r) => (op === "escribir" && r.startsWith(enlazada) ? "entero" : null);
    const r = await s.aplicarVariante(v.datos, v.modelo);
    fs.fallo = null;
    expect(r).toMatchObject({ hecho: false, motivo: "wiki" });
    expect(!r.hecho && r.avisos.join(" ")).toMatch(/«Otra \(variante\)» se queda en la wiki/);
    expect(await fs.leer(nota)).toBe(antes);
    expect(await fs.leer(enlazada)).toContain("estado_canon: borrador");
    expect(await fs.existe(`${APPDATOS}/_prueba/temporadas/${otra.id}.md`)).toBe(true);
    expect(await fs.leer(`${APPDATOS}/_prueba/temporadas/${otra.id}.md`)).not.toContain("Otra (variante)");
  });
});
