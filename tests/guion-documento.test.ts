import { describe, expect, it } from "vitest";
import {
  aTexto,
  borrarAdelante,
  borrarAtras,
  borrarRango,
  cambiarForzadoLinea,
  caracteresPerdidos,
  desdeTexto,
  documentoVacio,
  enter,
  insertarReferencia,
  insertarTexto,
  partirLinea,
  pegar,
  pideCopiaPrevia,
  reemplazar,
  textoDeRango,
  tiposDelDocumento,
  type Documento,
  type Pos,
} from "../src/lib/guion/documento";
import { partir, type Ref } from "../src/lib/guion/referencias";
import { TOPE_BORRADO } from "../src/lib/guion/tipos";

const ref = (crudo: string): Ref => partir(crudo)[0] as Ref;
const fin = (doc: Documento): Pos => ({ l: doc.length - 1, u: doc[doc.length - 1]!.u.length });

describe("Documento: modelo y ida y vuelta (spec 013, T12a)", () => {
  it("desdeTexto y aTexto dan el mismo texto, con referencias y forzados", () => {
    const casos = [
      "",
      "INT. TALLER – NOCHE\n\nVera entra. [[Vera]] y [[Hugo|el herrero]] y [[01_Wiki/Personajes/Vera|Vera]].\n\n@VERA\n(en voz baja)\n¿Hugo?\n\n> FUNDIDO\n\n.taller de Hugo\n!Cuidado con el perro\n\n...y entonces\n.5 segundos\n!!\n[[sin cerrar\n]] raro",
      "línea con 😀 emoji y combinación é",
      "\n\n\nfinal\n",
    ];
    for (const t of casos) expect(aTexto(desdeTexto(t)), JSON.stringify(t)).toBe(t);
  });

  it("los forzados se reconocen y los parecidos no", () => {
    const d = desdeTexto("@Vera\n...y\n.taller\n>\n!!");
    expect(d.map((l) => l.forzado)).toEqual(["personaje", undefined, "encabezado", "transicion", undefined]);
  });

  it("una referencia es una unidad", () => {
    const d = desdeTexto("Hola [[Vera|la Gaviota]]!");
    expect(d[0]!.u).toHaveLength(7);
    expect(typeof d[0]!.u[5]).toBe("object");
  });

  it("insertar texto en el cursor y partir la línea", () => {
    let r = insertarTexto(documentoVacio(), { l: 0, u: 0 }, "Hola mundo");
    expect(aTexto(r.doc)).toBe("Hola mundo");
    expect(r.pos).toEqual({ l: 0, u: 10 });
    r = partirLinea(r.doc, { l: 0, u: 4 });
    expect(aTexto(r.doc)).toBe("Hola\n mundo");
    expect(r.pos).toEqual({ l: 1, u: 0 });
  });

  it("unir con la anterior (retroceso al principio) y borrar rangos entre líneas", () => {
    const d = desdeTexto("uno\ndos\ntres");
    expect(aTexto(borrarAtras(d, { l: 1, u: 0 }).doc)).toBe("unodos\ntres");
    expect(aTexto(borrarAdelante(d, { l: 0, u: 3 }).doc)).toBe("unodos\ntres");
    expect(aTexto(borrarRango(d, { l: 0, u: 2 }, { l: 2, u: 1 }).doc)).toBe("unres");
    expect(aTexto(borrarRango(d, { l: 2, u: 1 }, { l: 0, u: 2 }).doc)).toBe("unres");
    // En los extremos no hace nada
    expect(borrarAtras(d, { l: 0, u: 0 }).doc).toBe(d);
    expect(borrarAdelante(d, fin(d)).doc).toBe(d);
  });

  it("una referencia cuenta como una unidad y se borra de una vez", () => {
    const d = desdeTexto("a[[Vera]]b");
    expect(d[0]!.u).toHaveLength(3);
    expect(aTexto(borrarAtras(d, { l: 0, u: 2 }).doc)).toBe("ab");
    expect(aTexto(borrarAdelante(d, { l: 0, u: 1 }).doc)).toBe("ab");
    // Insertar una referencia mueve el cursor una unidad
    const r = insertarReferencia(desdeTexto("a b"), { l: 0, u: 2 }, ref("[[Hugo]]"));
    expect(aTexto(r.doc)).toBe("a [[Hugo]]b");
    expect(r.pos).toEqual({ l: 0, u: 3 });
  });

  it("un emoji se borra de una vez", () => {
    const d = desdeTexto("a😀b");
    expect(d[0]!.u).toHaveLength(3);
    expect(aTexto(borrarAtras(d, { l: 0, u: 2 }).doc)).toBe("ab");
  });

  it("el tipo pendiente no se escribe en disco", () => {
    const d = desdeTexto("INT. TALLER");
    const r = enter(d, fin(d));
    expect(r.doc.at(-1)!.tipoPendiente).toBe("accion");
    expect(aTexto(r.doc)).toBe("INT. TALLER\n\n");
    expect(aTexto(desdeTexto(aTexto(r.doc)))).toBe(aTexto(r.doc));
  });
});

describe("Enter, Tab y tipos en el documento (spec 013, T4b sobre el modelo)", () => {
  const tipos = (d: Documento) => tiposDelDocumento(d);

  it("un guion corto siguiendo la tabla: encabezado, acción, personaje, diálogo", () => {
    let r = { doc: documentoVacio(), pos: { l: 0, u: 0 } as Pos };
    const escribir = (t: string) => (r = insertarTexto(r.doc, r.pos, t));
    escribir("INT. TALLER – NOCHE");
    r = enter(r.doc, r.pos);
    escribir("La luz parpadea.");
    r = enter(r.doc, r.pos);
    // La acción vacía no apila líneas
    expect(tipos(r.doc).at(-1)).toBe("accion");
    escribir("VERA");
    r = enter(r.doc, r.pos); // parece personaje: línea pegada de diálogo
    escribir("¿Hugo?");
    r = enter(r.doc, r.pos);
    r = enter(r.doc, r.pos); // diálogo vacío: se cierra y empieza un personaje
    expect(tipos(r.doc).at(-1)).toBe("personaje");
    escribir("hugo");
    expect(aTexto(r.doc)).toMatch(/\nHUGO$/);
    expect(aTexto(r.doc).startsWith("INT. TALLER – NOCHE\n\nLa luz parpadea.\n\nVERA\n¿Hugo?\n\nHUGO")).toBe(true);
  });

  it("Enter en medio parte, y al principio de una línea con texto pone un blanco encima", () => {
    const d = desdeTexto("abcdef");
    expect(aTexto(enter(d, { l: 0, u: 3 }).doc)).toBe("abc\ndef");
    const r = enter(d, { l: 0, u: 0 });
    expect(aTexto(r.doc)).toBe("\nabcdef");
    expect(r.pos).toEqual({ l: 1, u: 0 });
  });

  it("Enter con selección: primero se borra", () => {
    const d = desdeTexto("abcdef");
    expect(aTexto(enter(d, { l: 0, u: 1 }, { l: 0, u: 4 }).doc)).toBe("a\nef");
  });

  it("Tab cambia el tipo forzado y lo conserva; un texto que no admite el prefijo no cambia", () => {
    let d = desdeTexto("Vera");
    d = cambiarForzadoLinea(d, 0, "personaje");
    expect(aTexto(d)).toBe("@Vera");
    d = cambiarForzadoLinea(d, 0, undefined);
    expect(aTexto(d)).toBe("Vera");
    const raro = desdeTexto("¿Hola?");
    expect(cambiarForzadoLinea(raro, 0, "accion")).toBe(raro);
    // En una línea vacía, el forzado no escribe nada hasta que haya texto
    let v = cambiarForzadoLinea(documentoVacio(), 0, "encabezado");
    expect(aTexto(v)).toBe("");
    expect(tipos(v)[0]).toBe("encabezado");
    v = insertarTexto(v, { l: 0, u: 0 }, "taller").doc;
    expect(aTexto(v)).toBe(".taller");
  });

  it("un personaje pendiente escribe en mayúsculas y con tildes", () => {
    let d: Documento = [{ u: [], forzado: "personaje" }];
    d = insertarTexto(d, { l: 0, u: 0 }, "inés").doc;
    d = insertarTexto(d, { l: 0, u: 4 }, " peña").doc;
    expect(aTexto(d)).toBe("@INÉS PEÑA");
  });
});

describe("Copia previa y pegado (spec 013, T12b)", () => {
  const largoTexto = (n: number) => "x".repeat(n);

  it("suprimir (borrar un rango) de más de 500 caracteres pide copia; de menos, no", () => {
    const d = desdeTexto(`${largoTexto(501)}\nfin`);
    const grande = borrarRango(d, { l: 0, u: 0 }, { l: 0, u: 501 });
    expect(pideCopiaPrevia(aTexto(d), aTexto(grande.doc))).toBe(true);
    const justo = borrarRango(d, { l: 0, u: 0 }, { l: 0, u: TOPE_BORRADO });
    expect(pideCopiaPrevia(aTexto(d), aTexto(justo.doc))).toBe(false);
    expect(caracteresPerdidos(aTexto(d), aTexto(justo.doc))).toBe(500);
  });

  it("cortar es borrar el rango: mismo criterio, y el texto copiado es el del rango", () => {
    const d = desdeTexto(`a${largoTexto(600)}b`);
    expect(textoDeRango(d, { l: 0, u: 1 }, { l: 0, u: 601 })).toHaveLength(600);
    expect(pideCopiaPrevia(aTexto(d), aTexto(borrarRango(d, { l: 0, u: 1 }, { l: 0, u: 601 }).doc))).toBe(true);
  });

  it("reemplazar al pegar cuenta lo que se pierde, no lo que se mete", () => {
    const d = desdeTexto(largoTexto(700));
    const r = reemplazar(d, { l: 0, u: 0 }, { l: 0, u: 700 }, "otra cosa");
    expect(aTexto(r.doc)).toBe("otra cosa");
    expect(pideCopiaPrevia(aTexto(d), aTexto(r.doc))).toBe(true);
    const pequeno = reemplazar(d, { l: 0, u: 0 }, { l: 0, u: 10 }, "otra cosa");
    expect(pideCopiaPrevia(aTexto(d), aTexto(pequeno.doc))).toBe(false);
  });

  it("deshacer que quita mucho (de un texto a otro corto) también lo cuenta", () => {
    expect(pideCopiaPrevia(largoTexto(800), "")).toBe(true);
    expect(pideCopiaPrevia("hola", "hola mundo")).toBe(false);
  });

  it("borrar un texto repetido solo cuenta lo que cambió", () => {
    expect(caracteresPerdidos("abcabc", "abc")).toBe(3);
    expect(caracteresPerdidos("igual", "igual")).toBe(0);
    expect(caracteresPerdidos("", "algo")).toBe(0);
  });

  it("pegar algo que pase del tope se rechaza entero con aviso", () => {
    const d = desdeTexto("antes");
    const r = pegar(d, fin(d), fin(d), "x".repeat(1_100_000));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/1 MB/);
    const paginas = pegar(d, fin(d), fin(d), Array.from({ length: 55 * 500 + 1 }, () => "x").join("\n"));
    expect(paginas.ok).toBe(false);
    if (!paginas.ok) expect(paginas.motivo).toMatch(/500 páginas/);
    expect(aTexto(d)).toBe("antes");
  });

  it("pegar texto plano de otro programa se reconoce (RF-9)", () => {
    const d = desdeTexto("");
    const r = pegar(d, { l: 0, u: 0 }, { l: 0, u: 0 }, "INT. TALLER – NOCHE\r\n\r\nLa luz.\r\n\r\nVERA\r\n(en voz baja)\r\n¿Hugo? [[Hugo]]\r\n\r\nCORTE A:");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(tiposDelDocumento(r.resultado.doc)).toEqual(["encabezado", "blanco", "accion", "blanco", "personaje", "parentesis", "dialogo", "blanco", "transicion"]);
    expect(aTexto(r.resultado.doc)).toContain("¿Hugo? [[Hugo]]");
    expect(typeof r.resultado.doc[6]!.u[7]).toBe("object");
    expect(r.resultado.pos).toEqual(fin(r.resultado.doc));
  });

  it("pegar en medio de una línea une la primera con la cabeza y la última con la cola", () => {
    const d = desdeTexto("abcd");
    const r = pegar(d, { l: 0, u: 2 }, { l: 0, u: 2 }, "X\nY\nZ");
    expect(r.ok && aTexto(r.resultado.doc)).toBe("abX\nY\nZcd");
    expect(r.ok && r.resultado.pos).toEqual({ l: 2, u: 1 });
  });

  it("pegar lo copiado con una referencia la conserva como referencia", () => {
    const d = desdeTexto("Hola [[Vera]] y [[Hugo]]");
    const copiado = textoDeRango(d, { l: 0, u: 0 }, fin(d));
    expect(copiado).toBe("Hola [[Vera]] y [[Hugo]]");
    const r = pegar(documentoVacio(), { l: 0, u: 0 }, { l: 0, u: 0 }, copiado);
    expect(r.ok && r.resultado.doc[0]!.u).toHaveLength(10);
  });
});

describe("revisión de código de la spec 013 (T25c)", () => {
  it("pegar un trozo con prefijo forzado al principio de una línea con texto no pierde el prefijo", () => {
    const doc = desdeTexto("hola mundo");
    const r = reemplazar(doc, { l: 0, u: 0 }, { l: 0, u: 0 }, "!5 segundos ");
    expect(aTexto(r.doc)).toContain("5 segundos hola mundo");
    expect(aTexto(r.doc).startsWith("!5 segundos ")).toBe(true);
  });

  it("copiar una línea forzada entera conserva su prefijo", () => {
    const doc = desdeTexto("Telmo entra.\n>CORTE A:");
    expect(textoDeRango(doc, { l: 1, u: 0 }, { l: 1, u: 8 })).toBe(">CORTE A:");
  });

  it("una referencia sola en una línea de personaje la mantiene como personaje y su diálogo como diálogo", () => {
    const doc = desdeTexto("Hola\n\n[[Vera]]\n¿Hugo?");
    expect(tiposDelDocumento(doc)).toEqual(["accion", "blanco", "personaje", "dialogo"]);
  });
});
