import { describe, expect, it } from "vitest";
import {
  anadirTarjeta,
  colorearNota,
  crearNota,
  editarNota,
  etiquetar,
  moverElemento,
  nuevoIdPizarra,
  quitarElemento,
  quitarFlecha,
  quitarNotaVacia,
  subir,
  unir,
} from "../src/lib/pizarra/operaciones";
import { COLORES, LIENZO, MAX_ELEMENTOS, MAX_ETIQUETA, MAX_FLECHAS, MAX_NOTA, vacia, type Flecha, type Nota, type Pizarra } from "../src/lib/pizarra/tipos";

/** Saca el resultado bueno o falla con el error */
function bien<T>(r: T): Exclude<T, { error: string }> {
  if (typeof r === "object" && r !== null && "error" in r) throw new Error(`error inesperado: ${String((r as { error: unknown }).error)}`);
  return r as Exclude<T, { error: string }>;
}

const ids = (p: Pizarra) => p.elementos.map((e) => e.id);

/** Una pizarra con tres notas a, b, c */
function tres(): Pizarra {
  let p = vacia();
  for (const id of ["pz-a", "pz-b", "pz-c"]) p = bien(crearNota(p, { x: 0, y: 0 }, id)).pizarra;
  return p;
}

describe("Operaciones de la pizarra (spec 012, T2)", () => {
  it("crear una nota la pone vacía, con el primer color, en su sitio y encima de todo", () => {
    const p0 = vacia();
    const { pizarra, id } = bien(crearNota(p0, { x: 120, y: -40 }));
    const n = pizarra.elementos[0] as Nota;
    expect(id).toBe(n.id);
    expect(id).toMatch(/^pz-[a-z0-9]{6}$/);
    expect([n.tipo, n.texto, n.color, n.x, n.y]).toEqual(["nota", "", COLORES[0].id, 120, -40]);
    // La pizarra de partida no cambia
    expect(p0.elementos).toHaveLength(0);
  });

  it("los ids nuevos no repiten ninguno de elementos ni de flechas", () => {
    const p = bien(unir(tres(), "pz-a", "pz-b")).pizarra;
    const usados = new Set([...ids(p), ...p.flechas.map((f) => f.id)]);
    for (let i = 0; i < 200; i++) expect(usados.has(nuevoIdPizarra(p))).toBe(false);
  });

  it("editar el texto, colorear y mover cambian solo lo suyo", () => {
    const p = tres();
    const e = bien(editarNota(p, "pz-b", "hola"));
    expect(e.recortado).toBe(false);
    expect((e.pizarra.elementos[1] as Nota).texto).toBe("hola");
    expect((colorearNota(e.pizarra, "pz-b", "lila").elementos[1] as Nota).color).toBe("lila");
    // Un color de fuera de la paleta no se pone
    expect((colorearNota(e.pizarra, "pz-b", "fucsia" as never).elementos[1] as Nota).color).toBe(COLORES[0].id);
    const m = moverElemento(e.pizarra, "pz-b", 300, 200);
    const b = m.elementos.find((x) => x.id === "pz-b")!;
    expect([b.x, b.y]).toEqual([300, 200]);
    expect((b as Nota).texto).toBe("hola");
  });

  it("el texto de una nota se corta en el tope sin partir un emoji y se dice", () => {
    const r = bien(editarNota(tres(), "pz-a", "👍".repeat(MAX_NOTA + 3)));
    expect(r.recortado).toBe(true);
    expect((r.pizarra.elementos[0] as Nota).texto).toBe("👍".repeat(MAX_NOTA));
  });

  it("mover deja el elemento dentro del lienzo y un número raro no lo estropea", () => {
    const p = moverElemento(tres(), "pz-a", 1e9, -1e9);
    const a = p.elementos.find((x) => x.id === "pz-a")!;
    expect([a.x, a.y]).toEqual([LIENZO, -LIENZO]);
    const q = moverElemento(p, "pz-a", Number.NaN, 5);
    const a2 = q.elementos.find((x) => x.id === "pz-a")!;
    expect([a2.x, a2.y]).toEqual([0, 5]);
  });

  it("tocar, crear y mover suben al final del apilado", () => {
    const p = tres();
    expect(ids(p)).toEqual(["pz-a", "pz-b", "pz-c"]);
    expect(ids(subir(p, "pz-a"))).toEqual(["pz-b", "pz-c", "pz-a"]);
    expect(ids(moverElemento(p, "pz-b", 5, 5))).toEqual(["pz-a", "pz-c", "pz-b"]);
    const n = bien(crearNota(p, { x: 0, y: 0 }));
    expect(ids(n.pizarra).at(-1)).toBe(n.id);
    // Subir lo que ya está arriba, o lo que no existe, no cambia nada
    expect(subir(p, "pz-c")).toBe(p);
    expect(subir(p, "pz-zzz")).toBe(p);
  });

  it("una nota vacía se quita sola; con texto o con flechas, no", () => {
    const p = tres();
    expect(ids(quitarNotaVacia(p, "pz-b"))).toEqual(["pz-a", "pz-c"]);
    expect(ids(quitarNotaVacia(bien(editarNota(p, "pz-b", "   \n ")).pizarra, "pz-b"))).toEqual(["pz-a", "pz-c"]);
    const conTexto = bien(editarNota(p, "pz-b", "algo")).pizarra;
    expect(quitarNotaVacia(conTexto, "pz-b")).toBe(conTexto);
    // Con flechas no se pierden en silencio
    const unida = bien(unir(p, "pz-a", "pz-b")).pizarra;
    expect(quitarNotaVacia(unida, "pz-b")).toBe(unida);
  });

  it("una tarjeta por pieza", () => {
    const a = bien(anadirTarjeta(tres(), "ev-1", { x: 10, y: 10 }, "pz-a"));
    const t = a.pizarra.elementos.at(-1)!;
    expect(t.tipo === "tarjeta" && t.pieza === "ev-1" && t.origen === "pz-a").toBe(true);
    const otra = anadirTarjeta(a.pizarra, "ev-1", { x: 0, y: 0 });
    expect("error" in otra && otra.error).toMatch(/ya tiene tarjeta/);
    expect("error" in anadirTarjeta(a.pizarra, "", { x: 0, y: 0 })).toBe(true);
  });

  it("unir crea la flecha del primero al segundo, con etiqueta opcional", () => {
    const r = bien(unir(tres(), "pz-a", "pz-b", "provoca"));
    expect(r.pizarra.flechas).toEqual([{ id: r.id, de: "pz-a", a: "pz-b", etiqueta: "provoca", extra: {} }]);
    expect(bien(unir(tres(), "pz-a", "pz-b")).pizarra.flechas[0].etiqueta).toBe("");
  });

  it("unir rechaza un elemento consigo mismo, una repetida y lo que no existe, con su motivo; A→B y B→A valen", () => {
    const p = bien(unir(tres(), "pz-a", "pz-b")).pizarra;
    expect((unir(p, "pz-a", "pz-a") as { error: string }).error).toMatch(/consigo mismo/);
    expect((unir(p, "pz-a", "pz-b") as { error: string }).error).toMatch(/Ya hay una flecha/);
    expect((unir(p, "pz-a", "pz-nada") as { error: string }).error).toMatch(/ya no está/);
    const vuelta = bien(unir(p, "pz-b", "pz-a"));
    expect(vuelta.pizarra.flechas).toHaveLength(2);
  });

  it("la etiqueta se corta en 60, sin saltos de línea, y se puede cambiar", () => {
    const p = bien(unir(tres(), "pz-a", "pz-b")).pizarra;
    const f = p.flechas[0];
    const r = etiquetar(p, f.id, "una\nlínea ".repeat(20));
    expect(r.recortado).toBe(true);
    expect(Array.from(r.pizarra.flechas[0].etiqueta)).toHaveLength(MAX_ETIQUETA);
    expect(r.pizarra.flechas[0].etiqueta).not.toMatch(/[\n\r]/);
    expect(etiquetar(p, f.id, "otra").pizarra.flechas[0].etiqueta).toBe("otra");
  });

  it("quitar un elemento quita sus flechas y dice cuántas; quitar una flecha no toca los elementos", () => {
    let p = tres();
    p = bien(unir(p, "pz-a", "pz-b")).pizarra;
    p = bien(unir(p, "pz-b", "pz-c")).pizarra;
    p = bien(unir(p, "pz-c", "pz-a")).pizarra;
    const q = quitarElemento(p, "pz-b");
    expect(ids(q.pizarra)).toEqual(["pz-a", "pz-c"]);
    expect(q.flechasQuitadas).toBe(2);
    expect(q.pizarra.flechas.map((f) => [f.de, f.a])).toEqual([["pz-c", "pz-a"]]);
    const sin = quitarFlecha(p, p.flechas[0].id);
    expect(sin.flechas).toHaveLength(2);
    expect(ids(sin)).toEqual(["pz-a", "pz-b", "pz-c"]);
    // Lo que no existe no cambia nada
    expect(quitarElemento(p, "pz-nada")).toEqual({ pizarra: p, flechasQuitadas: 0 });
    expect(quitarFlecha(p, "pf-nada")).toBe(p);
  });

  it("el tope de elementos y el de flechas se respetan y avisan de que no caben más", () => {
    let p = vacia();
    for (let i = 0; i < MAX_ELEMENTOS; i++) p = bien(crearNota(p, { x: 0, y: 0 }, `pz-${i}`)).pizarra;
    expect((crearNota(p, { x: 0, y: 0 }) as { error: string }).error).toMatch(/No caben más elementos/);
    expect((anadirTarjeta(p, "ev-1", { x: 0, y: 0 }) as { error: string }).error).toMatch(/No caben más elementos/);
  });

  it("al llegar a 400 flechas no cabe otra", () => {
    let p = vacia();
    for (let i = 0; i < MAX_ELEMENTOS; i++) p = bien(crearNota(p, { x: 0, y: 0 }, `pz-${i}`)).pizarra;
    let n = 0;
    for (let k = 1; k <= 2; k++) for (let i = 0; i < MAX_ELEMENTOS; i++) (p = bien(unir(p, `pz-${i}`, `pz-${(i + k) % MAX_ELEMENTOS}`)).pizarra), n++;
    expect(n).toBe(MAX_FLECHAS);
    expect((unir(p, "pz-0", "pz-5") as { error: string }).error).toMatch(/No caben más flechas/);
  });

  it("las operaciones no cambian la pizarra de partida", () => {
    const p = bien(unir(tres(), "pz-a", "pz-b")).pizarra;
    const foto = JSON.stringify(p);
    editarNota(p, "pz-a", "x");
    colorearNota(p, "pz-a", "rosa");
    moverElemento(p, "pz-a", 9, 9);
    subir(p, "pz-a");
    quitarElemento(p, "pz-a");
    quitarFlecha(p, p.flechas[0].id);
    etiquetar(p, p.flechas[0].id, "x");
    expect(JSON.stringify(p)).toBe(foto);
  });

  it("unir y quitar con 200 elementos y 400 flechas cuestan menos de 100 ms", () => {
    let p: Pizarra = vacia();
    p = { ...p, elementos: Array.from({ length: MAX_ELEMENTOS }, (_, i) => ({ tipo: "nota", id: `pz-${i}`, texto: "", color: COLORES[0].id, x: 0, y: 0, extra: {} }) as Nota) };
    const flechas: Flecha[] = [];
    for (let k = 1; k <= 2; k++) for (let i = 0; i < MAX_ELEMENTOS; i++) flechas.push({ id: `pf-${k}-${i}`, de: `pz-${i}`, a: `pz-${(i + k) % MAX_ELEMENTOS}`, etiqueta: "", extra: {} });
    p = { ...p, flechas: flechas.slice(0, MAX_FLECHAS - 1) };
    const ini = performance.now();
    const u = bien(unir(p, "pz-0", "pz-150"));
    const q = quitarElemento(u.pizarra, "pz-7");
    const ms = performance.now() - ini;
    expect(q.flechasQuitadas).toBeGreaterThan(0);
    expect(ms).toBeLessThan(100);
  });
});
