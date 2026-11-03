import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenPizarra } from "../src/lib/almacen/almacen-pizarra";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Vigilancia, type CambioExterno } from "../src/lib/almacen/vigilancia";
import { escribirPizarra } from "../src/lib/pizarra/formato";
import { crearNota, editarNota } from "../src/lib/pizarra/operaciones";
import { vacia, type Pizarra } from "../src/lib/pizarra/tipos";

const RAIZ = "C:/Vault/appDatos";
const DIR = `${RAIZ}/s/_pizarra`;

let fs: FsMemoria;
let almacen: Almacen;
let pizarra: AlmacenPizarra;
let piezas: CambioExterno[];
let deVariantes: CambioExterno[];
let dePizarra: CambioExterno[];
let vigilancia: Vigilancia;

function conTexto(texto: string): Pizarra {
  const r = crearNota(vacia(), { x: 1, y: 2 }, "pz-a");
  if ("error" in r) throw new Error(r.error);
  return editarNota(r.pizarra, "pz-a", texto).pizarra;
}

beforeEach(async () => {
  vi.useFakeTimers();
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await fs.crearDir(RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  pizarra = new AlmacenPizarra(almacen, "s");
  await pizarra.cargar();
  piezas = [];
  deVariantes = [];
  dePizarra = [];
  vigilancia = new Vigilancia(
    almacen,
    "s",
    (c) => piezas.push(...c),
    10_000,
    (c) => deVariantes.push(...c),
    (c) => dePizarra.push(...c),
  );
});

afterEach(() => {
  vigilancia.detener();
  vi.useRealTimers();
});

describe("la vigilancia y _pizarra/ (spec 012, T5a)", () => {
  it("un cambio de fuera en pizarra.md va al oyente de la pizarra y no se recarga como pieza", async () => {
    await pizarra.guardar(conTexto("mía"));
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/pizarra.md`, escribirPizarra(conTexto("de fuera")));
    await vi.advanceTimersByTimeAsync(0);
    expect(dePizarra).toEqual([{ ruta: `${DIR}/pizarra.md`, que: "cambiado" }]);
    expect(piezas).toEqual([]);
    expect(deVariantes).toEqual([]);
  });

  it("lo que escribe Atelier en la pizarra no cuenta como de fuera", async () => {
    await vigilancia.iniciar();
    await pizarra.guardar(conTexto("uno"));
    await pizarra.guardar(conTexto("dos"));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(dePizarra).toEqual([]);
  });

  it("el repaso de 10 s ve la pizarra aunque no llegue el aviso del sistema (carpetas en la nube)", async () => {
    fs.vigilanciaNativa = false;
    await vigilancia.iniciar();
    await fs.crearDir(DIR);
    await fs.cambiarDesdeFuera(`${DIR}/pizarra.md`, escribirPizarra(conTexto("del Mac")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(dePizarra).toEqual([{ ruta: `${DIR}/pizarra.md`, que: "nuevo" }]);
  });

  it("que se borre por fuera también se avisa", async () => {
    await pizarra.guardar(conTexto("mía"));
    await vigilancia.iniciar();
    await fs.borrar(`${DIR}/pizarra.md`);
    await vigilancia.repasar();
    expect(dePizarra).toEqual([{ ruta: `${DIR}/pizarra.md`, que: "borrado" }]);
  });

  it("un conflicto de Proton junto a la pizarra se avisa como conflicto", async () => {
    await pizarra.guardar(conTexto("mía"));
    await vigilancia.iniciar();
    const c = `${DIR}/pizarra (# Edit conflict 2026-10-29 abc #).md`;
    await fs.cambiarDesdeFuera(c, escribirPizarra(conTexto("otra")));
    await vi.advanceTimersByTimeAsync(0);
    expect(dePizarra).toEqual([{ ruta: c, que: "conflicto" }]);
  });

  it("otros ficheros de _pizarra/ (la pizarra rota apartada, un .tmp) no interesan", async () => {
    await vigilancia.iniciar();
    await fs.crearDir(DIR);
    await fs.cambiarDesdeFuera(`${DIR}/pizarra rota 2026-10-29 12-00-00.md`, "roto");
    await fs.cambiarDesdeFuera(`${DIR}/pizarra.md.tmp`, "a medias");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(dePizarra).toEqual([]);
    expect(piezas).toEqual([]);
  });

  it("sin oyente de la pizarra (como hasta ahora) la vigilancia sigue funcionando", async () => {
    const solo: CambioExterno[] = [];
    const v = new Vigilancia(almacen, "s", (c) => solo.push(...c));
    await v.iniciar();
    await fs.crearDir(DIR);
    await fs.cambiarDesdeFuera(`${DIR}/pizarra.md`, escribirPizarra(conTexto("x")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(solo).toEqual([]);
    v.detener();
  });
});
