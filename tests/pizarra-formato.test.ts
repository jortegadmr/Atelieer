import { describe, expect, it } from "vitest";
import { cortarGrafemas } from "../src/lib/pizarra/texto";
import { COLORES, LIENZO, MAX_ELEMENTOS, MAX_ETIQUETA, MAX_FLECHAS, MAX_NOTA, VERSION, vacia, type Flecha, type Nota, type Pizarra, type Tarjeta } from "../src/lib/pizarra/tipos";
import { escribirPizarra, leerPizarra } from "../src/lib/pizarra/formato";

const nota = (id: string, over: Partial<Nota> = {}): Nota => ({ tipo: "nota", id, texto: `texto ${id}`, color: COLORES[0].id, x: 10, y: 20, extra: {}, ...over });
const tarjeta = (id: string, pieza: string, over: Partial<Tarjeta> = {}): Tarjeta => ({ tipo: "tarjeta", id, pieza, x: 30, y: 40, extra: {}, ...over });
const flecha = (id: string, de: string, a: string, etiqueta = ""): Flecha => ({ id, de, a, etiqueta, extra: {} });

/** Una nota de pizarra escrita a mano con este JSON dentro */
const doc = (json: unknown) => `# Pizarra\n\n\`\`\`json\n${typeof json === "string" ? json : JSON.stringify(json)}\n\`\`\`\n`;

function leida(texto: string) {
  const r = leerPizarra(texto);
  if ("ilegible" in r) throw new Error(`ilegible: ${r.ilegible}`);
  return r;
}

describe("Formato de la pizarra (spec 012, T1)", () => {
  it("ida y vuelta idéntica y dos escrituras iguales dan el mismo texto", () => {
    const p: Pizarra = {
      ...vacia(),
      elementos: [nota("pz-a"), tarjeta("pz-b", "ev-1", { origen: "pz-a" })],
      flechas: [flecha("pz-c", "pz-a", "pz-b", "provoca")],
    };
    const t = escribirPizarra(p);
    const r = leida(t);
    expect(r.avisos).toEqual([]);
    expect(r.soloLectura).toBe(false);
    expect(r.pizarra).toEqual(p);
    expect(escribirPizarra(r.pizarra)).toBe(t);
  });

  it("lo de fuera del bloque se conserva al reescribir", () => {
    const t0 = escribirPizarra({ ...vacia(), elementos: [nota("pz-a")] });
    const editado = `Apuntes míos arriba\n\n${t0}\nApuntes míos abajo\n`;
    const r = leida(editado);
    const p2 = { ...r.pizarra, elementos: [...r.pizarra.elementos, nota("pz-z")] };
    const t1 = escribirPizarra(p2, editado);
    expect(t1.startsWith("Apuntes míos arriba\n")).toBe(true);
    expect(t1.endsWith("\nApuntes míos abajo\n")).toBe(true);
    expect(leida(t1).pizarra.elementos.map((e) => e.id)).toEqual(["pz-a", "pz-z"]);
  });

  it("posiciones que no son números o están fuera del lienzo se normalizan con aviso", () => {
    const j = {
      version: 1,
      elementos: [
        { tipo: "nota", id: "pz-a", texto: "a", color: COLORES[0].id, x: "izquierda", y: null },
        { tipo: "nota", id: "pz-b", texto: "b", color: COLORES[0].id, x: 1e9, y: -1e9 },
      ],
      flechas: [],
    };
    const r = leida(doc(j));
    const [a, b] = r.pizarra.elementos as Nota[];
    expect([a.x, a.y]).toEqual([0, 0]);
    expect([b.x, b.y]).toEqual([LIENZO, -LIENZO]);
    // 1e999 es un número válido en JSON que se lee como infinito
    const inf = leida(doc('{"version":1,"elementos":[{"tipo":"nota","id":"pz-a","texto":"a","color":"ambar","x":1e999,"y":0}],"flechas":[]}'));
    expect((inf.pizarra.elementos[0] as Nota).x).toBe(LIENZO);
    expect(r.avisos.length).toBeGreaterThanOrEqual(2);
  });

  it("ids repetidos, flechas rotas, colores raros y topes: se descarta o recorta con aviso y se sigue", () => {
    const larga = "x".repeat(MAX_NOTA + 50);
    const j = {
      version: 1,
      elementos: [
        { tipo: "nota", id: "pz-a", texto: larga, color: "fucsia", x: 1, y: 2 },
        { tipo: "nota", id: "pz-a", texto: "repetida", color: COLORES[0].id, x: 3, y: 4 },
        { tipo: "tarjeta", id: "pz-b", pieza: "ev-1", x: 5, y: 6 },
        { tipo: "tarjeta", id: "pz-c", x: 5, y: 6 },
        { tipo: "dibujo", id: "pz-d", x: 0, y: 0 },
        "suelto",
      ],
      flechas: [
        { id: "pz-f1", de: "pz-a", a: "pz-b", etiqueta: "y".repeat(MAX_ETIQUETA + 10) },
        { id: "pz-f2", de: "pz-a", a: "pz-nada", etiqueta: "" },
        { id: "pz-f3", de: "pz-a", a: "pz-a", etiqueta: "" },
        { id: "pz-f4", de: "pz-a", a: "pz-b", etiqueta: "otra igual" },
        { id: "pz-f1", de: "pz-b", a: "pz-a", etiqueta: "id repetido" },
      ],
    };
    const r = leida(doc(j));
    expect(r.pizarra.elementos.map((e) => e.id)).toEqual(["pz-a", "pz-b"]);
    const n = r.pizarra.elementos[0] as Nota;
    expect(Array.from(n.texto)).toHaveLength(MAX_NOTA);
    expect(n.color).toBe(COLORES[0].id);
    expect(r.pizarra.flechas.map((f) => f.id)).toEqual(["pz-f1"]);
    expect(Array.from(r.pizarra.flechas[0].etiqueta)).toHaveLength(MAX_ETIQUETA);
    expect(r.avisos.length).toBeGreaterThanOrEqual(6);
  });

  it("más de 200 elementos o 400 flechas: sobran y se avisa", () => {
    const n = MAX_ELEMENTOS + 5;
    const elementos = Array.from({ length: n }, (_, i) => nota(`pz-${i}`));
    const flechas: Flecha[] = [];
    for (let k = 1; k <= 3; k++) for (let i = 0; i < n; i++) flechas.push(flecha(`pf-${k}-${i}`, `pz-${i}`, `pz-${(i + k) % n}`));
    const r = leida(doc({ version: 1, elementos, flechas }));
    expect(r.pizarra.elementos).toHaveLength(MAX_ELEMENTOS);
    expect(r.pizarra.flechas).toHaveLength(MAX_FLECHAS);
    expect(r.avisos.some((a) => /elementos/.test(a))).toBe(true);
    expect(r.avisos.some((a) => /flechas/.test(a))).toBe(true);
  });

  it("el tope no parte un emoji ni una letra combinada", () => {
    const familia = "👨‍👩‍👧";
    const e = "é";
    for (const unidad of [familia, e]) {
      const j = { version: 1, elementos: [{ tipo: "nota", id: "pz-a", texto: unidad.repeat(MAX_NOTA + 1), color: COLORES[0].id, x: 0, y: 0 }], flechas: [] };
      const n = leida(doc(j)).pizarra.elementos[0] as Nota;
      expect(n.texto).toBe(unidad.repeat(MAX_NOTA));
    }
    expect(cortarGrafemas("abc", 5)).toEqual({ texto: "abc", recortado: false });
    expect(cortarGrafemas("abcdef", 3)).toEqual({ texto: "abc", recortado: true });
  });

  it("los campos desconocidos se conservan, también los de primer nivel", () => {
    const j = {
      version: 1,
      futuro: { a: 1 },
      elementos: [
        { tipo: "nota", id: "pz-a", texto: "a", color: COLORES[0].id, x: 1, y: 2, fijada: true },
        { tipo: "tarjeta", id: "pz-b", pieza: "ev-1", x: 1, y: 2, nota: "de Ana" },
      ],
      flechas: [{ id: "pz-f", de: "pz-a", a: "pz-b", etiqueta: "", grosor: 3 }],
    };
    const r = leida(doc(j));
    expect(r.pizarra.extra).toEqual({ futuro: { a: 1 } });
    const salida = leida(escribirPizarra(r.pizarra)).pizarra;
    expect(salida.extra).toEqual({ futuro: { a: 1 } });
    expect((salida.elementos[0] as Nota).extra).toEqual({ fijada: true });
    expect((salida.elementos[1] as Tarjeta).extra).toEqual({ nota: "de Ana" });
    expect(salida.flechas[0].extra).toEqual({ grosor: 3 });
  });

  it("el origen de una tarjeta se lee y se escribe", () => {
    const p: Pizarra = { ...vacia(), elementos: [nota("pz-a"), tarjeta("pz-b", "ev-1", { origen: "pz-a" })] };
    const t = leida(escribirPizarra(p)).pizarra.elementos[1] as Tarjeta;
    expect(t.origen).toBe("pz-a");
    const sin = leida(escribirPizarra({ ...p, elementos: [tarjeta("pz-b", "ev-1")] })).pizarra.elementos[0] as Tarjeta;
    expect("origen" in sin).toBe(false);
  });

  it("un __proto__ en el fichero no cambia ningún prototipo y se conserva como dato", () => {
    const t = doc('{"version":1,"__proto__":{"roto":true},"elementos":[{"tipo":"nota","id":"pz-a","texto":"a","color":"ambar","x":0,"y":0,"__proto__":{"roto":true}}],"flechas":[]}');
    const r = leida(t);
    expect(Object.getPrototypeOf(r.pizarra.extra)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).roto).toBeUndefined();
    expect((r.pizarra.elementos[0] as Nota & { roto?: unknown }).roto).toBeUndefined();
    expect(Object.getPrototypeOf((r.pizarra.elementos[0] as Nota).extra)).toBe(Object.prototype);
    // Y no se pierde al reescribir
    expect(escribirPizarra(r.pizarra)).toContain('"__proto__"');
  });

  it("una versión más nueva se abre en solo lectura", () => {
    const r = leida(doc({ version: VERSION + 1, elementos: [{ tipo: "nota", id: "pz-a", texto: "a", color: COLORES[0].id, x: 0, y: 0 }], flechas: [] }));
    expect(r.soloLectura).toBe(true);
    expect(r.pizarra.elementos).toHaveLength(1);
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it("sin bloque, con el JSON roto o que no es un objeto: ilegible con su motivo", () => {
    for (const t of ["", "# Pizarra\n\nsolo texto\n", doc("{ roto"), doc("[1,2]"), doc("null"), "```json\n{\"version\":1\n"]) {
      const r = leerPizarra(t);
      expect("ilegible" in r && r.ilegible.length > 0).toBe(true);
    }
  });

  it("una nota con NUL, saltos de línea y caracteres de dirección vuelve igual", () => {
    const texto = "uno\0dos\ntres\r\n‮cuatro⁦ ``` --- # [[x]]";
    const p: Pizarra = { ...vacia(), elementos: [nota("pz-a", { texto })] };
    const t = escribirPizarra(p);
    expect((leida(t).pizarra.elementos[0] as Nota).texto).toBe(texto);
    // El bloque sigue siendo un solo bloque: ninguna línea del JSON cierra la valla
    expect(t.split("\n").filter((l) => l.trim() === "```")).toHaveLength(1);
  });

  it("200 elementos y 400 flechas se escriben y leen en menos de 100 ms", () => {
    const elementos = Array.from({ length: MAX_ELEMENTOS }, (_, i) => nota(`pz-${i}`, { texto: "texto ".repeat(40) }));
    const flechas: Flecha[] = [];
    for (let i = 0; i < MAX_ELEMENTOS && flechas.length < MAX_FLECHAS; i++) for (const k of [1, 2]) flechas.push(flecha(`pf-${i}-${k}`, `pz-${i}`, `pz-${(i + k) % MAX_ELEMENTOS}`));
    const p: Pizarra = { ...vacia(), elementos, flechas };
    const ini = performance.now();
    const t = escribirPizarra(p);
    const r = leida(t);
    const ms = performance.now() - ini;
    expect(r.pizarra.flechas).toHaveLength(MAX_FLECHAS);
    expect(ms).toBeLessThan(100);
  });
});
