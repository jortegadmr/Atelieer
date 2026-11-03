import { describe, expect, it } from "vitest";
import { borrarPieza, moverEvento } from "../src/lib/modelo/operaciones";
import type { Modelo } from "../src/lib/modelo/modelo";
import { columnas, migas, nivelAlCambiarVista, nivelValido, subir, temporadaVisible, textoVacio, vistaDeNivel, type Nivel } from "../src/lib/vistas/visor";
import { Constructor } from "./fixtures/constructor";
import { modeloDePrueba } from "./fixtures/modelo-prueba";

// Spec 002: el nivel del visor (serie › temporada › episodio).

const T1 = "te-t001";
const T2 = "te-t002";
const E3 = "ep-a103";
const SERIE: Nivel = { tipo: "serie" };
const enT1: Nivel = { tipo: "temporada", temporada: T1 };
const enE3: Nivel = { tipo: "episodio", temporada: T1, episodio: E3 };

function aplicar(m: Modelo, cambio: { guardar: { id: string }[]; borrar: { id: string }[] }) {
  for (const p of cambio.borrar) m.quitar(p.id);
  for (const p of cambio.guardar) m.poner(p as never);
}

describe("temporada visible (la de Temporada y Episodios)", () => {
  it("la elegida, si existe", () => {
    expect(temporadaVisible(modeloDePrueba(), T2)?.id).toBe(T2);
  });

  it("sin elegir, la primera en marcha en orden de emisión", () => {
    expect(temporadaVisible(modeloDePrueba(), null)?.id).toBe(T1);
    expect(temporadaVisible(modeloDePrueba(), "te-borrada")?.id).toBe(T1);
  });

  it("sin ninguna en marcha, la primera; sin temporadas, ninguna", () => {
    const c = new Constructor();
    const a = c.temporada({ estado: "prevista" }).id;
    c.temporada({ estado: "cerrada" });
    expect(temporadaVisible(c.modelo(), null)?.id).toBe(a);
    expect(temporadaVisible(new Constructor().modelo(), null)).toBeNull();
  });
});

describe("subir y la miga de pan (RF-14, RF-15, RF-18)", () => {
  it("sube del episodio a su temporada y de ahí a la serie", () => {
    expect(subir(enE3)).toEqual(enT1);
    expect(subir(enT1)).toEqual(SERIE);
  });

  it("en la serie no sube", () => {
    expect(subir(SERIE)).toBeNull();
  });

  it("miga Serie › T01 › E03, cada tramo con su nivel", () => {
    const m = migas(modeloDePrueba(), enE3);
    expect(m.map((x) => x.texto)).toEqual(["Serie", "T01", "E03"]);
    expect(m.map((x) => x.nivel)).toEqual([SERIE, enT1, enE3]);
    expect(migas(modeloDePrueba(), SERIE).map((x) => x.texto)).toEqual(["Serie"]);
  });
});

describe("nivel válido (RF-24)", () => {
  it("si todo existe, no cambia", () => {
    const m = modeloDePrueba();
    expect(nivelValido(m, enE3)).toEqual(enE3);
    expect(nivelValido(m, enT1)).toEqual(enT1);
    expect(nivelValido(m, SERIE)).toEqual(SERIE);
  });

  it("episodio borrado (a la papelera) sube a su temporada", () => {
    const m = modeloDePrueba();
    // E03 no tiene eventos canon: se puede borrar sin tocar nada bloqueado
    aplicar(m, borrarPieza(m, E3));
    expect(nivelValido(m, enE3)).toEqual(enT1);
  });

  it("episodio que pasó a otra temporada sube a la temporada del nivel", () => {
    const m = modeloDePrueba();
    m.poner({ ...m.episodios.get(E3)!, temporada: T2 });
    expect(nivelValido(m, enE3)).toEqual(enT1);
  });

  it("temporada borrada sube a la serie, también desde un episodio suyo", () => {
    const m = modeloDePrueba();
    aplicar(m, borrarPieza(m, T1));
    expect(nivelValido(m, enT1)).toEqual(SERIE);
    expect(nivelValido(m, enE3)).toEqual(SERIE);
  });

  it("deshacer la creación de un episodio (desaparece) sube a su temporada", () => {
    const m = modeloDePrueba();
    m.quitar(E3);
    expect(nivelValido(m, enE3)).toEqual(enT1);
  });

  it("mover un evento no cambia el nivel", () => {
    const m = modeloDePrueba();
    aplicar(m, moverEvento(m, "ev-e005", "ep-a102"));
    expect(nivelValido(m, enE3)).toEqual(enE3);
  });
});

describe("vista de cada nivel y nivel de cada vista (RF-20 a RF-22)", () => {
  it("serie → Serie; temporada → Temporada; episodio → Episodios", () => {
    expect(vistaDeNivel(SERIE)).toBe("serie");
    expect(vistaDeNivel(enT1)).toBe("temporada");
    expect(vistaDeNivel(enE3)).toBe("episodios");
  });

  it("Serie lleva al nivel serie; Temporada y Episodios, al de su temporada", () => {
    const m = modeloDePrueba();
    expect(nivelAlCambiarVista(m, "serie", T2, enE3)).toEqual(SERIE);
    expect(nivelAlCambiarVista(m, "temporada", T2, SERIE)).toEqual({ tipo: "temporada", temporada: T2 });
    expect(nivelAlCambiarVista(m, "episodios", T2, enE3)).toEqual({ tipo: "temporada", temporada: T2 });
  });

  it("Temporada o Episodios sin temporadas: nivel serie", () => {
    expect(nivelAlCambiarVista(new Constructor().modelo(), "temporada", null, SERIE)).toEqual(SERIE);
  });

  it("Tramas, Wiki y Sincronización no cambian el nivel", () => {
    const m = modeloDePrueba();
    for (const v of ["tramas", "wiki", "sincronizacion"] as const) expect(nivelAlCambiarVista(m, v, T2, enE3)).toEqual(enE3);
  });

  it("la Pizarra (spec 012) deja el nivel como estaba y ningún nivel lleva a ella", () => {
    const m = modeloDePrueba();
    expect(nivelAlCambiarVista(m, "pizarra", T2, enE3)).toEqual(enE3);
    expect(nivelAlCambiarVista(m, "pizarra", T2, SERIE)).toEqual(SERIE);
    for (const n of [SERIE, enE3, { tipo: "temporada", temporada: T2 } as Nivel]) expect(vistaDeNivel(n)).not.toBe("pizarra");
  });

  it("el Guion (spec 013) deja el nivel como estaba y ningún nivel lleva a él", () => {
    const m = modeloDePrueba();
    expect(nivelAlCambiarVista(m, "guion", T2, enE3)).toEqual(enE3);
    expect(nivelAlCambiarVista(m, "guion", T2, SERIE)).toEqual(SERIE);
    for (const n of [SERIE, enE3, { tipo: "temporada", temporada: T2 } as Nivel]) expect(vistaDeNivel(n)).not.toBe("guion");
  });
});

describe("columnas del visor (RF-2 a RF-10)", () => {
  const aviso = (pieza: string, clase: "aviso" | "sugerencia" = "aviso") => ({ id: "C99", pieza, clase, mensaje: "", fuente: "", grupo: "Serie" as const });

  it("nivel serie: una columna por temporada, en orden, con sus datos (RF-2, RF-5)", () => {
    const m = modeloDePrueba();
    const cols = columnas(m, SERIE, []);
    expect(cols.map((x) => x.id)).toEqual(["te-t001", "te-t002", "te-t003"]);
    const t1 = cols[0];
    expect(t1).toMatchObject({ tipo: "temporada", codigo: "T01", titulo: "Cerrar la emisora", estado: "borrador", carga: ["+", "-"] });
    expect(t1.detalle).toEqual(["en marcha", "8 ep"]);
    expect(t1.texto).toMatch(/^Telmo se queda/);
    expect(cols[2].detalle).toEqual(["prevista", "0 ep"]);
  });

  it("nivel temporada: una columna por episodio, con escritura, carga, trama dominante e idea central (RF-3, RF-6)", () => {
    const m = modeloDePrueba();
    const cols = columnas(m, enT1, []);
    expect(cols).toHaveLength(8);
    expect(cols[0]).toMatchObject({ tipo: "episodio", id: "ep-a101", codigo: "E01", titulo: "La señal", carga: ["+", "-"], detalle: ["guion"] });
    expect(cols[0].texto).toMatch(/^Telmo vuelve/);
    expect(cols[0].dominante).toEqual({ nombre: m.arcos.get("ar-ecos")!.titulo, color: m.arcos.get("ar-ecos")!.color });
  });

  it("nivel episodio: una columna por evento, con su código S01 calculado, con su cambio de valor (RF-4, RF-7)", () => {
    const cols = columnas(modeloDePrueba(), { tipo: "episodio", temporada: T1, episodio: "ep-a101" }, []);
    expect(cols.map((x) => [x.codigo, x.titulo])).toEqual([
      ["S01", "Telmo llega al pueblo"],
      ["S02", "Se conocen en la lonja"],
    ]);
    expect(cols[0]).toMatchObject({ tipo: "evento", estado: "canon", carga: ["+", "-"] });
  });

  it("solo cuentan los avisos de esa pieza; no las sugerencias (RF-8)", () => {
    const cols = columnas(modeloDePrueba(), SERIE, [aviso("te-t001"), aviso("te-t001"), aviso("te-t001", "sugerencia"), aviso("ep-a101")]);
    expect(cols[0].avisos).toBe(2);
    expect(cols[1].avisos).toBe(0);
  });

  it("aparcado y descartado llevan su estado (RF-9)", () => {
    const m = modeloDePrueba();
    m.poner({ ...m.temporadas.get("te-t002")!, madurez: "idea", madurez_mesa: "aparcado" });
    m.poner({ ...m.temporadas.get("te-t003")!, madurez: "descartado" });
    expect(columnas(m, SERIE, []).map((x) => x.estado)).toEqual(["borrador", "aparcado", "descartado"]);
  });

  it("vacío: «Aún no hay …», con los episodios previstos (RF-10)", () => {
    const c = new Constructor();
    const vacia = c.temporada({ episodios_previstos: 8 }).id;
    const sin = c.temporada().id;
    const t = c.temporada({}, 1);
    const m = c.modelo();
    expect(textoVacio(m, SERIE)).toBe("Aún no hay temporadas");
    expect(textoVacio(m, { tipo: "temporada", temporada: vacia })).toBe("Aún no hay episodios · 8 previstos");
    expect(textoVacio(m, { tipo: "temporada", temporada: sin })).toBe("Aún no hay episodios");
    expect(textoVacio(m, { tipo: "episodio", temporada: t.id, episodio: t.eps[0] })).toBe("Aún no hay escenas");
  });
});
