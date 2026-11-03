import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Almacen, CambioFuera } from "../../src/lib/almacen/almacen";
import { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { Vigilancia, type CambioExterno } from "../../src/lib/almacen/vigilancia";
import { crearPieza, escribirPieza } from "../../src/lib/modelo/ficheros";
import { AlmacenVariantes } from "../../src/lib/variantes/almacen-variantes";
import { escribirVariante } from "../../src/lib/variantes/formato";
import { variante, type DatosVariante } from "../../src/lib/variantes/tipos";

const RAIZ = "/appDatos";
const DIR = `${RAIZ}/s/_variantes`;
let fs: FsMemoria;
let almacen: Almacen;
let av: AlmacenVariantes;

function ejemplo(id = "va-k2m9", nombre = "Nando se va"): DatosVariante {
  const v = variante(id, nombre, "2026-10-21 18:20");
  v.piezas.set("ev-aaaa", { tipo: "evento", base: escribirPieza(crearPieza("evento", { id: "ev-aaaa", titulo: "Antes" })), pieza: crearPieza("evento", { id: "ev-aaaa", titulo: "Después" }) });
  return v;
}

beforeEach(async () => {
  fs = new FsMemoria();
  almacen = new Almacen(fs, RAIZ);
  await almacen.crearSerie("s", { titulo: "S" });
  av = new AlmacenVariantes(almacen, "s");
});

describe("las variantes en disco (spec 006)", () => {
  it("se guardan en appDatos/<serie>/_variantes/<id>.md y se listan por sus propiedades", async () => {
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    expect(await fs.existe(`${DIR}/va-k2m9.md`)).toBe(true);
    const otro = new AlmacenVariantes(almacen, "s");
    await otro.cargar();
    expect(otro.lista.get("va-k2m9")?.nombre).toBe("Nando se va");
    expect(otro.lista.get("va-k2m9")?.piezas).toEqual(["ev-aaaa"]);
  });

  it("al listar no analiza los bloques: una variante con un bloque roto sale en la lista y falla al abrirla", async () => {
    const roto = escribirVariante(ejemplo()).replace("titulo: Después", "titulo: [roto");
    await fs.escribir(`${DIR}/va-k2m9.md`, roto);
    await av.cargar();
    expect(av.lista.has("va-k2m9")).toBe(true);
    await expect(av.leer("va-k2m9")).rejects.toThrow(/no se puede leer/);
  });

  it("una nota que no vale se aparta con su motivo, sin tumbar las demás", async () => {
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    await fs.escribir(`${DIR}/va-mala.md`, "esto no es una variante");
    await fs.escribir(`${DIR}/notas.md`, "---\natelier: variante\nid: notas\n---\n");
    await av.cargar();
    expect([...av.lista.keys()]).toEqual(["va-k2m9"]);
    expect(av.apartadas.get(`${DIR}/va-mala.md`)?.mensaje).toMatch(/propiedades/);
    expect(av.apartadas.get(`${DIR}/notas.md`)?.mensaje).toMatch(/id de la variante/);
    expect(av.usados.has("va-mala")).toBe(true);
  });

  it("dos guardados seguidos de la misma variante no se pisan: queda el último", async () => {
    const a = av.guardar("va-k2m9", escribirVariante(ejemplo("va-k2m9", "Uno")));
    const b = av.guardar("va-k2m9", escribirVariante(ejemplo("va-k2m9", "Dos")));
    await Promise.all([a, b]);
    expect(await fs.leer(`${DIR}/va-k2m9.md`)).toContain("nombre: Dos");
  });

  it("si la nota cambió fuera desde la última vez, no la pisa: CambioFuera", async () => {
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    await fs.cambiarDesdeFuera(`${DIR}/va-k2m9.md`, escribirVariante(ejemplo("va-k2m9", "Del otro equipo")));
    await expect(av.guardar("va-k2m9", escribirVariante(ejemplo("va-k2m9", "Mía")))).rejects.toBeInstanceOf(CambioFuera);
    expect(await fs.leer(`${DIR}/va-k2m9.md`)).toContain("Del otro equipo");
    // Tras leerla otra vez, ya se puede guardar
    await av.leer("va-k2m9");
    await av.guardar("va-k2m9", escribirVariante(ejemplo("va-k2m9", "Mía")));
    expect(await fs.leer(`${DIR}/va-k2m9.md`)).toContain("Mía");
  });

  it("una nueva no pisa un fichero que ya estaba con ese nombre", async () => {
    await fs.escribir(`${DIR}/va-k2m9.md`, escribirVariante(ejemplo("va-k2m9", "Ya estaba")));
    await expect(av.guardar("va-k2m9", escribirVariante(ejemplo()))).rejects.toBeInstanceOf(CambioFuera);
  });

  it("no escribe lo que no se podría volver a leer", async () => {
    await expect(av.guardar("va-k2m9", "basura")).rejects.toThrow();
    expect(await fs.existe(`${DIR}/va-k2m9.md`)).toBe(false);
  });

  it("una variante vacía va a la papelera de la serie, nunca se borra (RF-26)", async () => {
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    await av.aPapelera("va-k2m9");
    expect(await fs.existe(`${DIR}/va-k2m9.md`)).toBe(false);
    const papelera = await fs.listar(`${RAIZ}/s/_papelera`);
    expect(papelera.map((e) => e.nombre)).toEqual([expect.stringMatching(/ va-k2m9\.md$/)]);
    expect(av.lista.has("va-k2m9")).toBe(false);
  });

  it("un conflicto de Proton se asocia a su variante: no se abre hasta resolverlo", async () => {
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    await fs.escribir(`${DIR}/va-k2m9 (# Edit conflict 2026-10-21 abc #).md`, escribirVariante(ejemplo("va-k2m9", "Otro")));
    await av.cargar();
    expect(av.enConflicto.has("va-k2m9")).toBe(true);
    await expect(av.leer("va-k2m9")).rejects.toThrow(/conflicto/);
  });

  it("un id de variante raro no se convierte en ruta", () => {
    expect(() => av.ruta("../x")).toThrow();
  });
});

describe("la vigilancia y _variantes/ (spec 006)", () => {
  let piezas: CambioExterno[];
  let deVariantes: CambioExterno[];
  let vigilancia: Vigilancia;

  beforeEach(() => {
    vi.useFakeTimers();
    piezas = [];
    deVariantes = [];
    vigilancia = new Vigilancia(
      almacen,
      "s",
      (c) => piezas.push(...c),
      10_000,
      (c) => deVariantes.push(...c),
    );
  });

  afterEach(() => {
    vigilancia.detener();
    vi.useRealTimers();
  });

  it("un cambio de fuera en _variantes/ va al segundo oyente y no se recarga como pieza", async () => {
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/va-k2m9.md`, escribirVariante(ejemplo("va-k2m9", "Fuera")));
    await vi.advanceTimersByTimeAsync(0);
    expect(deVariantes).toEqual([{ ruta: `${DIR}/va-k2m9.md`, que: "cambiado" }]);
    expect(piezas).toEqual([]);
    expect(await av.releer(deVariantes)).toEqual(["va-k2m9"]);
    expect(av.lista.get("va-k2m9")?.nombre).toBe("Fuera");
  });

  it("lo que escribe Atelier en _variantes/ no cuenta como de fuera", async () => {
    await vigilancia.iniciar();
    await av.guardar("va-k2m9", escribirVariante(ejemplo()));
    await av.guardar("va-k2m9", escribirVariante(ejemplo("va-k2m9", "Otra vez")));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(deVariantes).toEqual([]);
  });

  it("el repaso de 10 s ve _variantes/ aunque no llegue el aviso del sistema (carpetas en la nube)", async () => {
    fs.vigilanciaNativa = false;
    await vigilancia.iniciar();
    await fs.cambiarDesdeFuera(`${DIR}/va-nuev.md`, escribirVariante(ejemplo("va-nuev", "Del Mac")));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(deVariantes).toEqual([{ ruta: `${DIR}/va-nuev.md`, que: "nuevo" }]);
  });
});
