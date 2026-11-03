import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { esConflicto, leerConflicto, nombreOriginal } from "../src/lib/almacen/conflictos";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { crearPieza } from "../src/lib/modelo/ficheros";

const CONFLICTO = "ev-1 (# Edit conflict 2026-10-15 5i1veaD #).md";

describe("conflictos de Proton (spec 11.2)", () => {
  it("reconoce el nombre que pone Proton", () => {
    expect(esConflicto("app (# Edit conflict 2026-10-15 5i1veaD #).json")).toBe(true);
    expect(esConflicto(CONFLICTO)).toBe(true);
    expect(esConflicto("ev-1.md")).toBe(false);
    expect(nombreOriginal(CONFLICTO)).toBe("ev-1.md");
  });

  it("no se lee como pieza: sale en la lista de conflictos de la serie", async () => {
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, "/d");
    await almacen.crearSerie("s", { titulo: "S" });
    await almacen.guardar("s", crearPieza("evento", { id: "ev-1", titulo: "En el PC" }));
    await fs.escribir(`/d/s/eventos/${CONFLICTO}`, "---\nid: ev-1\ntipo: evento\ntitulo: En el Mac\n---\n");
    const d = await almacen.abrirSerie("s");
    expect(d.eventos.map((e) => e.titulo)).toEqual(["En el PC"]);
    expect(d.problemas).toEqual([]);
    expect(d.conflictos).toEqual([`/d/s/eventos/${CONFLICTO}`]);
  });

  it("el aviso trae las dos versiones", async () => {
    const fs = new FsMemoria();
    await fs.escribir("/d/s/eventos/ev-1.md", "versión del PC");
    await fs.escribir(`/d/s/eventos/${CONFLICTO}`, "versión del Mac");
    const c = await leerConflicto(fs, `/d/s/eventos/${CONFLICTO}`);
    expect(c).toEqual({
      ruta: `/d/s/eventos/${CONFLICTO}`,
      rutaOriginal: "/d/s/eventos/ev-1.md",
      original: "versión del PC",
      conflicto: "versión del Mac",
    });
  });

  it("si el original ya no existe, lo dice", async () => {
    const fs = new FsMemoria();
    await fs.escribir(`/d/${CONFLICTO}`, "versión del Mac");
    expect((await leerConflicto(fs, `/d/${CONFLICTO}`)).original).toBeNull();
  });
});
