import { describe, expect, it } from "vitest";
import { comprobar } from "../src/lib/comprobaciones";
import { CAMPOS, reglasDeCampo, reglasNueva, type ClaveCampo } from "../src/lib/guia/campos";
import { GUIA_INICIAL } from "../src/lib/guia/guia-inicial";
import { leerGuia } from "../src/lib/guia/guia-md";
import { estadoRegla } from "../src/lib/guia/marcas";
import { Modelo } from "../src/lib/modelo/modelo";
import { generarPruebaGrande } from "../scripts/datos-grande";
import { Constructor } from "./fixtures/constructor";

const guia = leerGuia(GUIA_INICIAL);
const conMagia = leerGuia(GUIA_INICIAL.replace("magia: false", "magia: true"));
const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe("guía junto a cada campo (spec 004)", () => {
  it("cada regla de la tabla existe en la guía inicial con la pieza esperada", () => {
    for (const [clave, lista] of Object.entries(CAMPOS)) {
      for (const rc of lista) {
        const regla = conMagia.reglas.find((x) => x.id === rc.id);
        expect(regla?.pieza, `${clave} · ${rc.id}`).toBe(rc.pieza);
      }
    }
  });

  it("en los campos compartidos por los arcos, cada tipo ve las suyas", () => {
    const b = new Constructor();
    const trama = b.arco({ tipo_trama: "A", tipo_arco: "trama" });
    const personaje = b.arco({ tipo_arco: "personaje" });
    const relacion = b.arco({ tipo_trama: "A", tipo_arco: "relacion" });
    const m = b.modelo();
    const de = (id: string, clave: ClaveCampo) => ids(reglasDeCampo(guia, m.arcos.get(id)!, clave));
    expect(de(trama, "arco.quiere")).toEqual(["G07"]);
    expect(de(personaje, "arco.quiere")).toEqual(["G21"]);
    expect(de(trama, "arco.cambia")).toEqual(["G11"]);
    expect(de(personaje, "arco.cambia")).toEqual(["G23", "G24"]);
    expect(de(relacion, "arco.cambia")).toEqual(["G26", "G27", "G28"]);
  });

  it("G12 solo en una trama A de serie y G13 solo en un arco de temporada", () => {
    const b = new Constructor();
    const t = b.temporada({}, 1);
    const deSerie = b.arco({ tipo_trama: "A", tipo_arco: "trama", nivel: "serie" });
    const deTemporada = b.arco({ tipo_trama: "A", tipo_arco: "trama", nivel: "temporada", temporada: t.id });
    const m = b.modelo();
    expect(ids(reglasDeCampo(guia, m.arcos.get(deSerie)!, "arco.fin"))).toEqual(["G12", "G15"]);
    expect(ids(reglasDeCampo(guia, m.arcos.get(deTemporada)!, "arco.fin"))).toEqual(["G13", "G15"]);
  });

  it("las de subtrama solo en B y C; las de magia solo con la magia activada", () => {
    const b = new Constructor();
    const a = b.arco({ tipo_trama: "A", tipo_arco: "trama" });
    const sub = b.arco({ tipo_trama: "B", tipo_arco: "relacion" });
    const ev = b.evento({});
    const m = b.modelo();
    expect(ids(reglasDeCampo(guia, m.arcos.get(a)!, "arco.bomba"))).toEqual(["G10"]);
    expect(ids(reglasDeCampo(guia, m.arcos.get(sub)!, "arco.bomba"))).toEqual(["G20"]);
    expect(ids(reglasDeCampo(guia, m.eventos.get(ev)!, "evento.descripcion"))).toEqual(["G44"]);
    expect(ids(reglasDeCampo(conMagia, m.eventos.get(ev)!, "evento.descripcion"))).toEqual(["G44", "M01"]);
  });

  it("una regla borrada, cambiada de pieza o nueva no sale junto a ningún campo", () => {
    const b = new Constructor();
    const per = b.arco({ tipo_arco: "personaje" });
    const trama = b.arco({ tipo_trama: "A", tipo_arco: "trama" });
    const m = b.modelo();
    const cambiada = leerGuia(
      GUIA_INICIAL.replace("| G07 | arco de trama |", "| G07 | arco de personaje |")
        .replace(/\| G22 \|[^\n]*\n/, "")
        .replace("| G49 |", "| G50 | arco de personaje | Una nueva. | § | |\n| G49 |"),
    );
    expect(ids(reglasDeCampo(cambiada, m.arcos.get(per)!, "arco.quiere"))).toEqual(["G21"]);
    expect(ids(reglasDeCampo(cambiada, m.arcos.get(trama)!, "arco.quiere"))).toEqual([]);
    expect(ids(reglasDeCampo(cambiada, m.arcos.get(per)!, "arco.necesita"))).toEqual([]);
    expect(Object.values(CAMPOS).flat().some((rc) => rc.id === "G50")).toBe(false);
  });

  it("«Nueva pieza»: las de su tipo, y las de subtrama aparte o con las propias", () => {
    const b = new Constructor();
    const madreB = b.arco({ tipo_trama: "B", tipo_arco: "trama", nivel: "serie" });
    const madreA = b.arco({ tipo_trama: "A", tipo_arco: "personaje", nivel: "serie" });
    const m = b.modelo();
    const piezas = (l: { pieza: string }[]) => [...new Set(l.map((x) => x.pieza))];
    expect(piezas(reglasNueva(guia, m, { que: "evento", tipoArco: "trama" }).propias)).toEqual(["evento"]);
    expect(piezas(reglasNueva(guia, m, { que: "secreto", tipoArco: "trama" }).propias)).toEqual(["secreto"]);
    const serie = reglasNueva(guia, m, { que: "trama", tipoArco: "relacion" });
    expect(piezas(serie.propias)).toEqual(["arco de relación"]);
    expect(piezas(serie.subtrama)).toEqual(["subtrama"]);
    expect(reglasNueva(guia, m, { que: "trama", tipoArco: "personaje" }).subtrama).toEqual([]);
    const temporada = reglasNueva(guia, m, { que: "trama-temporada", tipoArco: "trama" });
    expect(piezas(temporada.propias)).toEqual(["arco de trama", "subtrama"]);
    expect(temporada.subtrama).toEqual([]);
    expect(piezas(reglasNueva(guia, m, { que: "trama-temporada", tipoArco: "relacion", tramoDe: madreB }).propias)).toEqual(["arco de trama", "subtrama"]);
    expect(reglasNueva(guia, m, { que: "trama-temporada", tipoArco: "trama", tramoDe: madreA })).toEqual({
      propias: guia.reglas.filter((x) => x.pieza === "arco de personaje"),
      subtrama: [],
    });
  });

  it("las reglas de un campo y su estado, sobre la serie grande, en menos de 50 ms", () => {
    const m = new Modelo(generarPruebaGrande());
    const r = comprobar(m);
    const ev = [...m.eventos.values()][0];
    const inicio = performance.now();
    for (const clave of ["evento.valor", "evento.gana", "evento.relleno", "evento.descripcion"] as const) {
      for (const regla of reglasDeCampo(guia, ev, clave)) estadoRegla(guia, regla, ev, r, m);
    }
    expect(performance.now() - inicio).toBeLessThan(50);
  });
});
