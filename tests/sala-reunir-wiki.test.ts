import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { planteamiento, type EntradaSala } from "../src/lib/sala/planteamiento";
import { reunirSala } from "../src/lib/sala/reunir";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 012, T13b y T13c: el arco con su ficha y sus alternativas; el secreto con quién lo sabe.

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const CTX = { pizarra: null, conVariante: false };
const HER = "ar-amis";
const CINTA = "sc-voz1";
const ESCENA = "ev-e005";

const entrada = (r: EntradaSala | { error: string }): EntradaSala => {
  if ("error" in r) throw new Error(r.error);
  return r;
};
const texto = async (s: Sesion, id: string) => planteamiento(entrada(await reunirSala(s, { tipo: "pieza", id }, CTX))).texto;

/** La serie de prueba con ficha para Amistad rota y para el secreto de la carta */
async function preparar(conFicha = true) {
  const fs = await vaultDePrueba();
  if (conFicha) {
    const antes = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
    for (const id of [HER, CINTA]) expect((await antes.pasar(id)).pieza).toBeTruthy();
    await antes.cerrar();
  }
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s };
}

const foto = async (fs: FsMemoria) => JSON.stringify(await Promise.all(fs.rutas().map(async (r) => [r, await fs.leer(r)])));

describe("reunirSala: arco", () => {
  it("lleva la ficha tal como está, sin las propiedades de arriba", async () => {
    const { s } = await preparar();
    const t = await texto(s, HER);
    expect(t).toContain("## Ficha");
    expect(t).not.toMatch(/^estado_canon:/m);
    expect(t).toMatch(/^- Tipo: Arco/m);
  });

  it("lleva las alternativas descartadas de la ficha", async () => {
    const { s } = await preparar();
    s.desbloquear(ESCENA);
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    const t = await texto(s, HER);
    expect(t).toContain("## Alternativas descartadas");
    expect(t).toContain("No pegaba");
  });

  it("sin ficha enlazada no hay sección de ficha ni de alternativas, y no falla", async () => {
    const { s } = await preparar(false);
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: HER }, CTX));
    expect(r.secciones.some((x) => x.clave === "ficha" || x.clave === "alternativas")).toBe(false);
  });

  it("si la ficha enlazada ya no está en la wiki, lo dice en su sección y sigue con el resto", async () => {
    const { fs, s } = await preparar();
    const ruta = `${VAULT}/${(await s.leerFichaDe(HER))!.ruta}`;
    await fs.borrar(ruta);
    const r = entrada(await reunirSala(s, { tipo: "pieza", id: HER }, CTX));
    const ficha = r.secciones.find((x) => x.clave === "ficha");
    expect(ficha && "nolee" in ficha).toBe(true);
    expect(planteamiento(r).texto).toContain("(no se pudo leer:");
    expect(planteamiento(r).texto).toContain("Quiero decidir:");
  });

  it("no escribe nada, ni en la serie ni en la wiki", async () => {
    const { fs, s } = await preparar();
    const antes = await foto(fs);
    await reunirSala(s, { tipo: "pieza", id: HER }, CTX);
    expect(await foto(fs)).toBe(antes);
  });
});

describe("reunirSala: secreto", () => {
  it("lleva la ficha y quién lo sabe", async () => {
    const { s } = await preparar();
    const t = await texto(s, CINTA);
    expect(t).toMatch(/^- Tipo: Secreto/m);
    expect(t).toContain("## Ficha");
    expect(t).toContain("## Qué sabe quién");
    expect(t).toMatch(/Lo conocen: .*Sabela.* lo sabe desde/);
  });

  it("sin ficha sigue llevando quién lo sabe", async () => {
    const { s } = await preparar(false);
    const t = await texto(s, CINTA);
    expect(t).not.toContain("## Ficha");
    expect(t).toContain("Lo conocen:");
  });
});
