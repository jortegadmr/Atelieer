import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { AVISO_BLOQUEADA, Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import { estadoDe, type ConEstado } from "../src/lib/modelo/estados";
import { variante } from "../src/lib/variantes/tipos";
import { esEstadoAntiguo, normalizarEstado, propuesta, textoEstado } from "../src/lib/wiki/equivalencias";
import { cambiarEstadoCanon } from "../src/lib/wiki/estado-ficha";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 009, RF-53, RF-54, RF-55c: estados de la ficha que no son de la regla 9.

describe("equivalencias de estados antiguos (spec 009, RF-53, RF-54)", () => {
  it("la tabla propone sin mayúsculas ni acentos", () => {
    expect(propuesta(" APROBADO ")).toBe("canon");
    expect(propuesta("En Revisión")).toBe("borrador");
    expect(propuesta("en   desarrollo")).toBe("borrador");
    expect(propuesta("WIP")).toBe("borrador");
    expect(propuesta("Aparcada")).toBe("idea");
    expect(propuesta("propuesta")).toBe("idea");
    expect(propuesta("Eliminado")).toBe("descartado");
    expect(propuesta("raro")).toBeNull();
    expect(normalizarEstado("  En   Revisión ")).toBe("en revision");
  });

  it("vacío no es antiguo; los cuatro estados, con mayúsculas, tampoco", () => {
    for (const v of [undefined, null, "", "   "]) expect(esEstadoAntiguo(v)).toBe(false);
    for (const v of ["idea", "Borrador", "Canon", " DESCARTADO "]) expect(esEstadoAntiguo(v)).toBe(false);
    expect(esEstadoAntiguo("boceto")).toBe(true);
  });

  it("una lista avisa sin propuesta", () => {
    expect(esEstadoAntiguo(["canon", "borrador"])).toBe(true);
    expect(propuesta(["canon"])).toBeNull();
    expect(esEstadoAntiguo(3)).toBe(true);
    expect(propuesta(3)).toBeNull();
    expect(textoEstado(["a", "b"])).toBe("a, b");
    expect(textoEstado(3)).toBe("3");
  });

  it("una lista en bloque se cambia entera, sin dejar sus líneas", () => {
    const t = "---\ntipo: arco\nestado_canon:\n  - uno\n  - dos\naliases: []\n---\n# X\n";
    expect(cambiarEstadoCanon(t, "idea")).toBe("---\ntipo: arco\nestado_canon: idea\naliases: []\n---\n# X\n");
  });
});

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const ID = "te-t001";

async function conFicha(estado: string, piezaEn: "borrador" | "canon" = "borrador") {
  const fs: FsMemoria = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  expect((await s.cambiarEstado(ID, piezaEn)).hecho).toBe(true);
  await s.guardado.vaciar();
  const ficha = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;
  await fs.escribir(ficha, (await fs.leer(ficha)).replace(`estado_canon: ${piezaEn}`, `estado_canon: ${estado}`));
  await s.revisarFichas();
  return { fs, s, ficha };
}

describe("estados antiguos en la sesión (spec 009, RF-53, RF-55c)", () => {
  it("Canon con mayúscula es canon", async () => {
    const { s } = await conFicha("Canon");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.canon).toBe(true);
    expect(s.fichas.get(ID)?.estadoWiki).toBe("Canon");
  });

  it("revisarFichas da el valor tal cual", async () => {
    const { s } = await conFicha("[uno, dos]");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.estadoWiki).toEqual(["uno", "dos"]);
    expect(s.fichas.get(ID)?.canon).toBe(false);
  });

  it("un estado antiguo con saltos de línea no mete líneas en el Log (revisión de seguridad)", async () => {
    const { fs, s } = await conFicha("|\n  en\n  ## Falso");
    expect((await s.cambiarEstado(ID, "canon")).hecho).toBe(true);
    const log = await fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`);
    expect(log).toContain("Estado de [[T01 - Cerrar la emisora]]: en ## Falso → canon");
    expect(log).not.toMatch(/^## Falso/m);
  });

  it("el Log dice el valor de antes", async () => {
    const { fs, s, ficha } = await conFicha("boceto");
    expect((await s.cambiarEstado(ID, "canon")).hecho).toBe(true);
    expect(await fs.leer(ficha)).toContain("estado_canon: canon");
    expect(await fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`)).toContain("Estado de [[T01 - Cerrar la emisora]]: boceto → canon");
  });
});

const estadoPieza = (s: Sesion) => estadoDe(s.modelo.pieza(ID) as ConEstado);
const pasos = (s: Sesion) => (s.historial as unknown as { hechos: unknown[] }).hechos.length;
const silenciados = (s: Sesion) => (s.modelo.pieza(ID) as { avisos_silenciados: string[] }).avisos_silenciados;

describe("confirmar o dejar así un estado antiguo (spec 009, RF-55 a RF-57)", () => {
  it("confirmar canon cambia ficha, Log y pieza", async () => {
    const { fs, s, ficha } = await conFicha("Aprobado");
    expect(s.estadoAntiguo(ID)).toEqual({ valor: "Aprobado", texto: "Aprobado", propuesta: "canon" });
    const r = await s.confirmarEquivalencia(ID, "canon");
    expect(r.hecho).toBe(true);
    expect(await fs.leer(ficha)).toContain("estado_canon: canon");
    expect(await fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`)).toContain("Estado de [[T01 - Cerrar la emisora]]: Aprobado → canon");
    expect(estadoPieza(s)).toBe("canon");
    expect(s.estadoAntiguo(ID)).toBeNull();
  });

  it("confirmar descartado pide su porqué", async () => {
    const { fs, s, ficha } = await conFicha("obsoleto");
    expect(s.estadoAntiguo(ID)?.propuesta).toBe("descartado");
    expect((await s.confirmarEquivalencia(ID, "descartado", "Ya no encaja")).hecho).toBe(true);
    expect(estadoPieza(s)).toBe("descartado");
    expect((s.modelo.pieza(ID) as { motivo_descarte: string }).motivo_descarte).toBe("Ya no encaja");
    expect(await fs.leer(ficha)).toContain("estado_canon: descartado");
  });

  it("confirmar que cambia la pieza es un paso propio de Ctrl Z", async () => {
    const { fs, s, ficha } = await conFicha("boceto");
    const antes = pasos(s);
    // Justo después de otro cambio de estado: no se junta con él
    expect((await s.confirmarEquivalencia(ID, "idea")).hecho).toBe(true);
    expect(pasos(s)).toBe(antes + 1);
    expect(estadoPieza(s)).toBe("idea");
    await s.deshacer();
    // La ficha vuelve al estado de la pieza, no al valor antiguo
    expect(estadoPieza(s)).toBe("borrador");
    expect(await fs.leer(ficha)).toContain("estado_canon: borrador");
  });

  it("confirmar lo que ya corresponde solo cambia la ficha, sin paso de Ctrl Z", async () => {
    const { fs, s, ficha } = await conFicha("en revisión");
    const antes = pasos(s);
    expect((await s.confirmarEquivalencia(ID, "borrador")).hecho).toBe(true);
    expect(pasos(s)).toBe(antes);
    expect(await fs.leer(ficha)).toContain("estado_canon: borrador");
    expect(await fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`)).toContain("en revisión → borrador");
    expect(s.fichas.get(ID)?.cambio).toBe(false);
    expect(s.estadoAntiguo(ID)).toBeNull();
  });

  it("canon bloqueado y variante no confirman", async () => {
    const { fs, s, ficha } = await conFicha("obsoleto", "canon");
    const r = await s.confirmarEquivalencia(ID, "descartado", "No");
    expect(r).toEqual({ hecho: false, avisos: [AVISO_BLOQUEADA] });
    expect(await fs.leer(ficha)).toContain("estado_canon: obsoleto");
    expect(estadoPieza(s)).toBe("canon");
    // Quedarse en canon sí vale: solo cambia la ficha
    expect((await s.confirmarEquivalencia(ID, "canon")).hecho).toBe(true);
    expect(await fs.leer(ficha)).toContain("estado_canon: canon");

    const otra = await conFicha("boceto");
    const v = await SesionVariante.abrirSobre(otra.s, variante("va-eq", "Prueba", ""));
    abiertas.push(v);
    expect(await v.confirmarEquivalencia(ID, "idea")).toEqual({ hecho: false, avisos: ["Sal de la variante para cambiar la wiki."] });
    expect(await otra.fs.leer(otra.ficha)).toContain("estado_canon: boceto");
  });

  it("Dejarlo así se guarda en la pieza y vuelve a avisar con otro valor", async () => {
    const { fs, s, ficha } = await conFicha("Boceto");
    expect(await s.dejarAsi(ID, "Boceto")).toBe(true);
    expect(silenciados(s)).toContain("ficha:boceto");
    expect(s.dejadoAsi(ID)).toBe("boceto");
    expect(s.estadoAntiguo(ID)).toBeNull();
    expect(await fs.leer(ficha)).toContain("estado_canon: Boceto");
    // Es un paso de Ctrl Z
    await s.deshacer();
    expect(s.dejadoAsi(ID)).toBeNull();
    await s.rehacer();
    expect(s.dejadoAsi(ID)).toBe("boceto");
    // Con otro valor, vuelve a avisar
    await fs.escribir(ficha, (await fs.leer(ficha)).replace("estado_canon: Boceto", "estado_canon: semilla"));
    await s.revisarFichas();
    expect(s.estadoAntiguo(ID)?.texto).toBe("semilla");
    // Una lista se apunta con su texto, y «Quitar» la quita
    await s.dejarAsi(ID, ["a", "b"]);
    expect(silenciados(s).filter((x) => x.startsWith("ficha:"))).toEqual(["ficha:a, b"]);
    await s.quitarDejarAsi(ID);
    expect(silenciados(s).some((x) => x.startsWith("ficha:"))).toBe(false);
  });

  it("nada cambia sin confirmar", async () => {
    const { fs, s, ficha } = await conFicha("aprobado");
    await s.revisarFichas();
    await s.leerWiki();
    await s.guardado.vaciar();
    expect(await fs.leer(ficha)).toContain("estado_canon: aprobado");
    expect(estadoPieza(s)).toBe("borrador");
    expect(await fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`)).not.toContain("aprobado →");
  });
});
