import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { FICHERO_PIZARRA, CARPETA_PIZARRA } from "../src/lib/almacen/almacen-pizarra";
import type { Sesion } from "../src/lib/app/sesion";
import { escribirPizarra } from "../src/lib/pizarra/formato";
import type { Pizarra } from "../src/lib/pizarra/tipos";
import { vacia } from "../src/lib/pizarra/tipos";
import { SOLO_EN_VARIANTE, textoParaLaSala } from "../src/lib/sala/llevar";
import { NO_ESTA } from "../src/lib/sala/reunir";
import { Sesion as SesionReal } from "../src/lib/app/sesion";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";

// Spec 012, T14b: del origen al texto que se copia, sin escribir nada (RF-28, RF-30).

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const ESCENA = "ev-e005";
const RUTA = `${APPDATOS}/_prueba/${CARPETA_PIZARRA}/${FICHERO_PIZARRA}`;

async function abrir() {
  const fs = await vaultDePrueba();
  const s = await SesionReal.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s };
}

const foto = async (fs: FsMemoria) => JSON.stringify(await Promise.all(fs.rutas().map(async (r) => [r, await fs.leer(r)])));

const conNota = (): Pizarra => ({
  ...vacia(),
  elementos: [
    { tipo: "tarjeta", id: "t1", pieza: ESCENA, x: 0, y: 0, extra: {} },
    { tipo: "nota", id: "n1", texto: "idea suelta", color: "ambar", x: 0, y: 80, extra: {} },
  ],
  flechas: [{ id: "f1", de: "n1", a: "t1", etiqueta: "", extra: {} }],
});

describe("textoParaLaSala", () => {
  it("una pieza sin pizarra en disco da el planteamiento sin notas y no crea la pizarra", async () => {
    const { fs, s } = await abrir();
    const antes = await foto(fs);
    const t = await textoParaLaSala(s, { tipo: "pieza", id: ESCENA }, { pizarra: null, conVariante: false });
    expect(typeof t).toBe("string");
    expect(t).toContain("Quiero decidir:");
    expect(t).not.toContain("Notas de la pizarra");
    expect(await foto(fs)).toBe(antes);
  });

  it("lee las notas de la pizarra del disco sin cambiar nada", async () => {
    const { fs, s } = await abrir();
    await fs.crearDir(`${APPDATOS}/_prueba/${CARPETA_PIZARRA}`);
    await fs.escribir(RUTA, escribirPizarra(conNota()));
    const antes = await foto(fs);
    const t = await textoParaLaSala(s, { tipo: "pieza", id: ESCENA }, { pizarra: null, conVariante: false });
    expect(t).toContain("idea suelta");
    expect(await foto(fs)).toBe(antes);
  });

  it("una pizarra ilegible se dice y no se aparta ni se renombra (RF-30)", async () => {
    const { fs, s } = await abrir();
    await fs.crearDir(`${APPDATOS}/_prueba/${CARPETA_PIZARRA}`);
    await fs.escribir(RUTA, "esto no es una pizarra");
    const antes = await foto(fs);
    const t = await textoParaLaSala(s, { tipo: "pieza", id: ESCENA }, { pizarra: null, conVariante: false });
    expect(t).toContain("(la pizarra no se pudo leer:");
    expect(await foto(fs)).toBe(antes);
  });

  it("con la pizarra de pantalla usa esa, aunque aún no esté guardada", async () => {
    const { s } = await abrir();
    const t = await textoParaLaSala(s, { tipo: "pieza", id: ESCENA }, { pizarra: conNota(), conVariante: false });
    expect(t).toContain("idea suelta");
  });

  it("una pieza que ya no está no copia nada y dice por qué", async () => {
    const { s } = await abrir();
    expect(await textoParaLaSala(s, { tipo: "pieza", id: "ev-nada" }, { pizarra: null, conVariante: false })).toEqual({ error: NO_ESTA });
  });

  it("una pieza que solo está en la variante lo dice", async () => {
    const { s } = await abrir();
    expect(await textoParaLaSala(s, { tipo: "pieza", id: "ev-nada" }, { pizarra: null, conVariante: true, soloEnVariante: true })).toEqual({ error: SOLO_EN_VARIANTE });
  });

  it("con una variante abierta lleva la serie y lo dice", async () => {
    const { s } = await abrir();
    const t = await textoParaLaSala(s, { tipo: "pieza", id: ESCENA }, { pizarra: null, conVariante: true });
    expect(t).toContain("Hay una variante abierta");
  });
});
