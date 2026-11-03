import { describe, expect, it } from "vitest";
import { crearPieza, ErrorFormato, escribirPieza } from "../../src/lib/modelo/ficheros";
import { escribirVariante, leerCabecera, leerVariante, MAXIMO_VARIANTE, tipoDeIdSeguro } from "../../src/lib/variantes/formato";
import { variante } from "../../src/lib/variantes/tipos";

function nota(): string {
  const v = variante("va-k2m9", "Prueba", "2026-10-21 18:20");
  v.piezas.set("ev-aaaa", { tipo: "evento", base: escribirPieza(crearPieza("evento", { id: "ev-aaaa", titulo: "Antes" })), pieza: crearPieza("evento", { id: "ev-aaaa", titulo: "Después" }) });
  return escribirVariante(v);
}

const rechaza = (md: string, motivo: RegExp, fichero = "va-k2m9.md") => {
  expect(() => leerVariante(md, fichero)).toThrow(ErrorFormato);
  expect(() => leerVariante(md, fichero)).toThrow(motivo);
};

describe("una variante manipulada no se abre (spec 006, plan › Seguridad)", () => {
  it("la buena se lee", () => {
    expect(leerVariante(nota(), "va-k2m9.md").piezas.size).toBe(1);
  });

  it("un id con barras o puntos (ev-../../x) no es una pieza: no se puede escribir fuera de la mesa", () => {
    expect(tipoDeIdSeguro("ev-../../x")).toBeNull();
    expect(tipoDeIdSeguro("ev-a/b")).toBeNull();
    expect(tipoDeIdSeguro("ev-a\\b")).toBeNull();
    expect(tipoDeIdSeguro("ev-k2m9")).toBe("evento");
    const md = nota().replaceAll("ev-aaaa", "ev-../../x");
    rechaza(md, /no tiene un id válido|no es una pieza válida/);
  });

  it("un bloque con un tipo que no existe", () => {
    rechaza(nota().replace("atelier pieza evento ev-aaaa", "atelier pieza demonio ev-aaaa"), /no es un tipo de pieza/);
  });

  it("un id que no es de su tipo (ep- en un bloque de evento)", () => {
    rechaza(nota().replace("atelier pieza evento ev-aaaa", "atelier pieza evento ep-aaaa"), /no tiene un id válido de evento/);
  });

  it("la nota de dentro dice otra pieza", () => {
    rechaza(nota().replace("id: ev-aaaa\ntipo: evento\ntitulo: Después", "id: ev-bbbb\ntipo: evento\ntitulo: Después"), /dice que es «ev-bbbb»/);
  });

  it("la nota de dentro es de otro tipo", () => {
    rechaza(nota().replace("tipo: evento\ntitulo: Después", "tipo: episodio\ntitulo: Después"), /no se puede leer/);
  });

  it("la misma pieza dos veces", () => {
    const md = nota();
    const repetido = md.slice(md.indexOf("~~~~atelier pieza"));
    rechaza(md + repetido, /sale dos veces/);
  });

  it("una base sin cómo quedaría", () => {
    const md = nota();
    rechaza(md.slice(0, md.indexOf("~~~~atelier pieza")), /no dice cómo quedaría/);
  });

  it("un bloque que no se cierra", () => {
    rechaza(nota().replace(/~~~~\n$/, ""), /no se cierra/);
  });

  it("un id de variante que no casa con el nombre del fichero, o que no es va-", () => {
    rechaza(nota(), /no coincide con el nombre del fichero/, "va-otra1.md");
    rechaza(nota().replace("id: va-k2m9", "id: ../va-k2m9"), /id de la variante no es válido/);
  });

  it("un estado que no es aparcada, aplicada ni descartada", () => {
    rechaza(nota().replace("estado: aparcada", "estado: borrada"), /estado «borrada»/);
  });

  it("una fecha que no se entiende", () => {
    rechaza(nota().replace("creada: 2026-10-21 18:20", "creada: ayer"), /fecha «creada»/);
  });

  it("origen, elegida, sitios, pisa o fichas con ids que no valen", () => {
    rechaza(nota().replace('origen: ""', "origen: ../x"), /«origen» no es una pieza válida/);
    rechaza(nota().replace("sitios: {}", "sitios:\n  ep-aaaa: [../x]"), /sitios/);
    rechaza(nota().replace("sitios: {}", "sitios:\n  ev-aaaa: [ev-bbbb]"), /sitios/);
    rechaza(nota().replace("pisa: {}", "pisa:\n  ../x: {}"), /pisa/);
    rechaza(nota().replace("fichas: {}", "fichas:\n  x/y: Nombre"), /fichas/);
  });

  it("el índice de piezas no puede repetir", () => {
    expect(() => leerCabecera(nota().replace("  - ev-aaaa", "  - ev-aaaa\n  - ev-aaaa"), "va-k2m9.md")).toThrow(/repite/);
  });

  it("el nombre y el porqué se limpian al leer", () => {
    const c = leerCabecera(nota().replace("nombre: Prueba", 'nombre: "Nando\\ncalla\\u202E"').replace('porque: ""', 'porque: "a\\tb"'), "va-k2m9.md");
    expect(c.nombre).toBe("Nando calla");
    expect(c.porque).toBe("a b");
  });

  it("más de 5 MB: se aparta sin analizarla", () => {
    const md = nota() + "x".repeat(MAXIMO_VARIANTE);
    rechaza(md, /5 MB/);
    expect(() => leerCabecera(md, "va-k2m9.md")).toThrow(/5 MB/);
  });

  it("si no es una variante de Atelier", () => {
    rechaza(nota().replace("atelier: variante", "atelier: otra"), /No es una variante/);
  });
});
