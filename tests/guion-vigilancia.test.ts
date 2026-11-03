import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { AlmacenGuion } from "../src/lib/almacen/almacen-guion";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Vigilancia, type CambioExterno } from "../src/lib/almacen/vigilancia";
import { escribirGuion } from "../src/lib/guion/formato";
import { vacio } from "../src/lib/guion/tipos";

const RAIZ = "C:/Vault/appDatos";
const DIR = `${RAIZ}/s/_guion`;

let fs: FsMemoria;
let almacen: Almacen;
let guion: AlmacenGuion;
let piezas: CambioExterno[];
let deGuion: CambioExterno[];
let vigilancia: Vigilancia;

const g = (texto: string) => ({ ...vacio("ev-aaaa"), texto });

beforeEach(async () => {
  vi.useFakeTimers();
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await fs.crearDir(RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  guion = new AlmacenGuion(almacen, "s");
  await guion.cargar("ev-aaaa");
  piezas = [];
  deGuion = [];
  vigilancia = new Vigilancia(almacen, "s", (c) => piezas.push(...c), 10_000, () => undefined, () => undefined, (c) => deGuion.push(...c));
});

afterEach(() => {
  vigilancia.detener();
  vi.useRealTimers();
});

describe("la vigilancia y _guion/ (spec 013, T8a)", () => {
  it("un guion cambiado fuera va al oyente del guion y no se recarga como pieza", async () => {
    await guion.guardar("ev-aaaa", g("mío"));
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/ev-aaaa.md`, escribirGuion(g("de fuera")));
    await vi.advanceTimersByTimeAsync(0);
    expect(deGuion).toEqual([{ ruta: `${DIR}/ev-aaaa.md`, que: "cambiado" }]);
    expect(piezas).toEqual([]);
  });

  it("lo que escribe Atelier en el guion no cuenta como de fuera", async () => {
    await vigilancia.iniciar();
    await guion.guardar("ev-aaaa", g("uno"));
    await guion.guardar("ev-aaaa", g("dos"));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(deGuion).toEqual([]);
    expect(piezas).toEqual([]);
  });

  it("un guion nuevo de fuera (otro equipo) avisa como nuevo", async () => {
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/ev-bbbb.md`, escribirGuion(g("otro")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(deGuion).toEqual([{ ruta: `${DIR}/ev-bbbb.md`, que: "nuevo" }]);
  });

  it("un conflicto de Proton avisa como conflicto; un nombre raro o un .tmp se ignoran", async () => {
    await guion.guardar("ev-aaaa", g("mío"));
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/ev-aaaa (# Edit conflict 2026-10-15 5i1veaD #).md`, "x");
    await fs.cambiarDesdeFuera(`${DIR}/notas.md`, "x");
    await fs.cambiarDesdeFuera(`${DIR}/ev-aaaa.md.tmp`, "x");
    await fs.cambiarDesdeFuera(`${DIR}/foto.png`, "x");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(deGuion.map((c) => c.que)).toEqual(["conflicto"]);
    expect(piezas).toEqual([]);
  });

  it("un cambio en _guion no llega a alCambiar (el de las piezas)", async () => {
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/ev-aaaa.md`, escribirGuion(g("x")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(piezas).toEqual([]);
    expect(deGuion.length).toBe(1);
  });

  it("un guion borrado fuera avisa como borrado", async () => {
    await guion.guardar("ev-aaaa", g("mío"));
    await vigilancia.iniciar();
    await fs.borrar(`${DIR}/ev-aaaa.md`);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(deGuion).toEqual([{ ruta: `${DIR}/ev-aaaa.md`, que: "borrado" }]);
  });
});
