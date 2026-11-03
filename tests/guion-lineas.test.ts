import { describe, expect, it } from "vitest";
import { cambiarForzado, cambiosDeTipo, clasificar, clasificarTexto, conPrefijo, enMayusculas, parecePersonaje, puedeForzar, siguienteAlEnter, type TipoForzable } from "../src/lib/guion/lineas";
import type { TipoLinea } from "../src/lib/guion/tipos";

const tipos = (texto: string): TipoLinea[] => clasificarTexto(texto).map((l) => l.tipo);
/** El tipo de la línea de en medio, con una línea de acción antes y después */
const solo = (linea: string): TipoLinea => clasificar(["", linea, "x"])[1]!.tipo;

describe("Reconocimiento de líneas (spec 013, T4a)", () => {
  it("encabezados: con punto, un espacio y texto, sin distinguir caja", () => {
    for (const l of ["INT. TALLER - NOCHE", "int. taller", "EXT. CALLE – DÍA", "INT./EXT. COCHE", "EXT./INT. COCHE", "INT/EXT. COCHE", "I/E. PUERTA", "Ext. playa"]) expect(solo(l), l).toBe("encabezado");
  });

  it("sin el punto o sin el espacio no es encabezado", () => {
    for (const l of ["INT TALLER", "INT.TALLER", "INTENTA SALIR", "EXTRA", "INT.", "INT. "]) expect(solo(l), l).not.toBe("encabezado");
    expect(tipos(["", "INTENTA SALIR"].join("\n"))).toEqual(["blanco", "accion"]);
  });

  it("personaje: mayúsculas, precedido de blanco y con texto debajo", () => {
    expect(tipos("\nVERA\n¿Hugo?")).toEqual(["blanco", "personaje", "dialogo"]);
    expect(tipos("VERA\nHola")).toEqual(["personaje", "dialogo"]);
    expect(tipos("VERA (V.O.)\nHola")).toEqual(["personaje", "dialogo"]);
    expect(tipos("VERA (cont'd)\nHola")).toEqual(["personaje", "dialogo"]);
    expect(tipos("INÉS MARÍA 2\nHola")).toEqual(["personaje", "dialogo"]);
  });

  it("VERA al final o con blanco debajo es acción, hasta que tenga texto debajo", () => {
    expect(tipos("\nVERA")).toEqual(["blanco", "accion"]);
    expect(tipos("\nVERA\n\nOtra cosa")).toEqual(["blanco", "accion", "blanco", "accion"]);
  });

  it("UN GOLPE. es acción aunque esté en mayúsculas", () => {
    expect(tipos("\nUN GOLPE.\nSe oye")).toEqual(["blanco", "accion", "accion"]);
    expect(tipos("\n¡CUIDADO!\nSe oye")[1]).toBe("accion");
    expect(tipos("\n¿QUIÉN?\nSe oye")[1]).toBe("accion");
  });

  it("un personaje demasiado largo no lo es", () => {
    expect(parecePersonaje("A".repeat(41))).toBe(false);
    expect(parecePersonaje("A".repeat(40))).toBe(true);
  });

  it("paréntesis bajo un personaje, y suelto es acción", () => {
    expect(tipos("\nVERA\n(en voz baja)\nHola")).toEqual(["blanco", "personaje", "parentesis", "dialogo"]);
    expect(tipos("\n(en voz baja)\nHola")[1]).toBe("accion");
  });

  it("diálogo de varias líneas hasta el blanco", () => {
    expect(tipos("VERA\nuno\ndos\n\nSigue la acción")).toEqual(["personaje", "dialogo", "dialogo", "blanco", "accion"]);
  });

  it("transiciones: en mayúsculas con dos puntos, o forzadas con >", () => {
    expect(solo("CORTE A:")).toBe("transicion");
    expect(solo("> FUNDIDO")).toBe("transicion");
    expect(clasificar(["> FUNDIDO"])[0]!.texto).toBe("FUNDIDO");
    expect(solo("Corte a:")).toBe("accion");
  });

  it("las líneas parecidas a un prefijo se ven intactas", () => {
    for (const l of ["...y entonces", ".5 segundos", "!!", "¡Qué!", "@", "@ solo", ">", ">>>", "- guion"]) {
      const c = clasificar(["", l, "x"])[1]!;
      expect(c.forzado, l).toBe(l === ">");
      if (l !== ">") expect(c.texto, l).toBe(l);
    }
  });

  it("prefijos forzados: . ! @ >", () => {
    expect(clasificar([".taller"])[0]).toEqual({ tipo: "encabezado", texto: "taller", forzado: true });
    expect(clasificar(["!Cuidado"])[0]).toEqual({ tipo: "accion", texto: "Cuidado", forzado: true });
    expect(clasificar(["@Vera", "Hola"])).toEqual([
      { tipo: "personaje", texto: "Vera", forzado: true },
      { tipo: "dialogo", texto: "Hola", forzado: false },
    ]);
  });

  it("forzar y volver a leer da lo mismo (ida y vuelta de cada prefijo)", () => {
    const casos: Array<[TipoForzable, string]> = [["encabezado", "taller de Hugo"], ["accion", "Cuidado con el perro"], ["personaje", "Vera"], ["transicion", "FUNDIDO A NEGRO"]];
    for (const [tipo, texto] of casos) {
      expect(puedeForzar(texto, tipo)).toBe(true);
      const leida = clasificar([conPrefijo(texto, tipo)])[0]!;
      expect(leida).toEqual({ tipo, texto, forzado: true });
    }
    expect(puedeForzar("¿Hola?", "accion")).toBe(false);
    expect(puedeForzar("...", "encabezado")).toBe(false);
  });

  it("un texto plano pegado se reconoce igual (RF-9)", () => {
    const t = "INT. TALLER – NOCHE\n\nLa luz parpadea.\n\nVERA\n(en voz baja)\n¿Hugo?\n\nHUGO\nAquí.\n\nCORTE A:\n\nEXT. CALLE – DÍA";
    expect(tipos(t)).toEqual(["encabezado", "blanco", "accion", "blanco", "personaje", "parentesis", "dialogo", "blanco", "personaje", "dialogo", "blanco", "transicion", "blanco", "encabezado"]);
  });
});

describe("Enter, Tab y cambios de tipo (spec 013, T4b)", () => {
  const ctx = (tipo: TipoLinea, vacia: boolean, alFinal = true, alPrincipio = false) => ({ tipo, vacia, alFinal, alPrincipio });

  it("al final de encabezado, acción o transición: blanco y línea nueva en acción", () => {
    for (const t of ["encabezado", "accion", "transicion"] as const) expect(siguienteAlEnter(ctx(t, false), "texto normal"), t).toEqual({ que: "blanco-y-linea", pendiente: "accion" });
  });

  it("al final de una línea que parece personaje: línea pegada de diálogo", () => {
    expect(siguienteAlEnter(ctx("accion", false), "VERA")).toEqual({ que: "linea-pegada", pendiente: "dialogo" });
    expect(siguienteAlEnter(ctx("accion", false), "vera")).toEqual({ que: "blanco-y-linea", pendiente: "accion" });
    expect(siguienteAlEnter(ctx("accion", false), "UN GOLPE.")).toEqual({ que: "blanco-y-linea", pendiente: "accion" });
  });

  it("al final de personaje, paréntesis o diálogo con texto: línea pegada de diálogo", () => {
    for (const t of ["personaje", "parentesis", "dialogo"] as const) expect(siguienteAlEnter(ctx(t, false)), t).toEqual({ que: "linea-pegada", pendiente: "dialogo" });
  });

  it("en un diálogo vacío: se cierra y empieza un personaje (dos Enter = nuevo personaje)", () => {
    expect(siguienteAlEnter(ctx("dialogo", true))).toEqual({ que: "cerrar-dialogo", pendiente: "personaje" });
    expect(siguienteAlEnter(ctx("parentesis", true))).toEqual({ que: "cerrar-dialogo", pendiente: "personaje" });
  });

  it("en una acción o línea vacía repetida no apila líneas", () => {
    expect(siguienteAlEnter(ctx("accion", true))).toEqual({ que: "nada" });
    expect(siguienteAlEnter(ctx("blanco", true))).toEqual({ que: "nada" });
    expect(siguienteAlEnter(ctx("personaje", true))).toEqual({ que: "nada" });
  });

  it("en medio de una línea la parte; al principio de una con texto pone un blanco encima", () => {
    expect(siguienteAlEnter(ctx("accion", false, false, false))).toEqual({ que: "partir" });
    expect(siguienteAlEnter(ctx("dialogo", false, false, true))).toEqual({ que: "blanco-encima" });
    expect(siguienteAlEnter(ctx("accion", true, false, true))).toEqual({ que: "partir" });
  });

  it("Tab recorre auto → acción → personaje → encabezado → transición → auto, y Mayús + Tab al revés", () => {
    let t: TipoForzable | undefined;
    const ida = [];
    for (let i = 0; i < 5; i++) ida.push((t = cambiarForzado(t)));
    expect(ida).toEqual(["accion", "personaje", "encabezado", "transicion", undefined]);
    expect(cambiarForzado(undefined, true)).toBe("transicion");
    expect(cambiarForzado("accion", true)).toBeUndefined();
  });

  it("un personaje pendiente escribe en mayúsculas, con tildes y ñ", () => {
    expect(enMayusculas("vera soler")).toBe("VERA SOLER");
    expect(enMayusculas("peña")).toBe("PEÑA");
  });

  it("cambiosDeTipo marca la línea que cambia de tipo tras un cambio de blancos", () => {
    const antes = "INT. TALLER\n\nVERA\nHola";
    expect(cambiosDeTipo(antes, antes)).toEqual([]);
    // Alguien añade una línea en blanco debajo de VERA: deja de ser personaje y su texto, diálogo
    const despues = "INT. TALLER\n\nVERA\n\nHola";
    expect(cambiosDeTipo(antes, despues)).toEqual([
      { linea: 3, de: "personaje", a: "accion" },
      { linea: 4, de: "dialogo", a: "blanco" },
    ]);
  });
});
