import { afterEach, describe, expect, it } from "vitest";
import { generarPruebaGrande } from "../../scripts/datos-grande";
import { Almacen } from "../../src/lib/almacen/almacen";
import { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { conEstado } from "../../src/lib/modelo/estados";
import { escribirPieza } from "../../src/lib/modelo/ficheros";
import { borrarPieza, editar } from "../../src/lib/modelo/operaciones";
import type { Pieza, PiezaDe } from "../../src/lib/modelo/tipos";
import { colocarEscena } from "../../src/lib/vistas/actos";
import { crearPieza as crearEnNivel } from "../../src/lib/vistas/crear";
import { variante } from "../../src/lib/variantes/tipos";
import { leidoPorV1 } from "../compat/uso-v1";
import { abrir, RAIZ, serieBasica } from "../consecuencias/ayuda";

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

async function preparar() {
  const x = serieBasica();
  const r = await abrir(x.b);
  abiertas.push(r.s);
  const v = await SesionVariante.abrirSobre(r.s, variante("va-prue", "Nando se va", "2026-10-21 18:20"));
  abiertas.push(v);
  return { ...x, ...r, v };
}

type Ev = PiezaDe<"evento">;
const enVariante = (v: SesionVariante, id: string, fn: (p: Ev) => void) => v.aplicar(editar(v.modelo, id, (p) => fn(p as Ev)));
const nota = (fs: FsMemoria, carpeta: string, id: string) => fs.leer(`${RAIZ}/${carpeta}/eventos/${id}.md`);

describe("aplicar una variante (spec 006, RF-32 a RF-40)", () => {
  it("queda en disco «Cómo quedaría» exacto: cambiadas, nuevas, movidas y a la papelera; la v1.0 lo lee", async () => {
    const { s, v, fs, s1, s3, t, e2 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "Nando se va"));
    await v.aplicar(colocarEscena(v.modelo, s1, e2, "", 0));
    const nueva = crearEnNivel(v.modelo, { tipo: "episodio", temporada: t, episodio: e2 }, "evento", { titulo: "Nueva" });
    await v.aplicar(nueva.cambio);
    await v.aplicar(borrarPieza(v.modelo, s3));
    await v.escritor.vaciar();
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r).toEqual({ hecho: true, piezas: v.datos.piezas.size });
    for (const [id, e] of v.datos.piezas) {
      if (e.pieza) expect(await fs.leer(`${RAIZ}/s/eventos/${id}.md`).catch(() => fs.leer(`${RAIZ}/s/episodios/${id}.md`))).toBe(escribirPieza(e.pieza));
    }
    expect(await fs.existe(`${RAIZ}/s/eventos/${s3}.md`)).toBe(false);
    expect(s.modelo.eventos.get(s1)).toMatchObject({ titulo: "Nando se va", episodio: e2 });
    expect(s.modelo.eventos.has(nueva.pieza.id)).toBe(true);
    expect(s.modelo.eventos.has(s3)).toBe(false);
    expect(leidoPorV1(await nota(fs, "s", s1), "evento")).toMatchObject({ titulo: "Nando se va", episodio: e2 });
    // Hay una instantánea de antes de aplicar (RF-36)
    expect((await s.instantaneas.listar()).length).toBeGreaterThan(0);
  });

  it("con choques no aplica nada y los devuelve (RF-33)", async () => {
    const { s, v, fs, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await s.aplicar(editar(s.modelo, s1, (p) => ((p as Ev).titulo = "En la serie")));
    await s.guardado.vaciar();
    const antes = await nota(fs, "s", s1);
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r).toMatchObject({ hecho: false, motivo: "choques" });
    expect(!r.hecho && r.choques?.length).toBe(1);
    expect(await nota(fs, "s", s1)).toBe(antes);
  });

  it("un cambio de fuera entre la comprobación y la escritura no deja aplicar nada", async () => {
    const { s, v, fs, s1, s2 } = await preparar();
    fs.vigilanciaNativa = false;
    await enVariante(v, s1, (p) => (p.titulo = "Uno en la variante"));
    await enVariante(v, s2, (p) => (p.titulo = "Dos en la variante"));
    const ruta = `${RAIZ}/s/eventos/${s2}.md`;
    const fuera = (await fs.leer(ruta)).replace("titulo: Dos", "titulo: Cambiada fuera");
    // Mientras se hace la instantánea, alguien cambia la nota en el otro equipo
    fs.alOperar = (op, r) => {
      if (op === "escribir" && r.includes("_instantaneas")) {
        fs.alOperar = null;
        void fs.cambiarDesdeFuera(ruta, fuera);
      }
    };
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r).toMatchObject({ hecho: false, motivo: "choques" });
    expect(await fs.leer(ruta)).toBe(fuera);
    expect(await nota(fs, "s", s1)).toContain("titulo: Uno");
  });

  it("canon bloqueado: no aplica y dice cuáles; con «Desbloquear y aplicar», sí (RF-34)", async () => {
    const { s, v, s4 } = await preparar();
    await s.aplicar({ guardar: [conEstado(s.modelo.eventos.get(s4)!, "canon")], borrar: [] });
    await s.guardado.vaciar();
    const v2 = await SesionVariante.abrirSobre(s, variante("va-cano", "Canon", ""));
    abiertas.push(v2);
    await enVariante(v2, s4, (p) => (p.titulo = "Canon cambiado"));
    const r = await s.aplicarVariante(v2.datos, v2.modelo);
    expect(r).toMatchObject({ hecho: false, motivo: "canon", canon: [s4] });
    expect(s.modelo.eventos.get(s4)!.titulo).toBe("Cuatro");
    const r2 = await s.aplicarVariante(v2.datos, v2.modelo, { desbloquear: true });
    expect(r2.hecho).toBe(true);
    expect(s.modelo.eventos.get(s4)!.titulo).toBe("Canon cambiado");
    expect(s.estaBloqueada(s4)).toBe(false);
    void v;
  });

  it("si falla la escritura, el canon sigue bloqueado", async () => {
    const { s, fs, s4 } = await preparar();
    await s.aplicar({ guardar: [conEstado(s.modelo.eventos.get(s4)!, "canon")], borrar: [] });
    await s.guardado.vaciar();
    const v2 = await SesionVariante.abrirSobre(s, variante("va-cano", "Canon", ""));
    abiertas.push(v2);
    await enVariante(v2, s4, (p) => (p.titulo = "Canon cambiado"));
    fs.fallo = (op, r) => (op === "escribir" && r.includes("/eventos/") ? "entero" : null);
    const r = await s.aplicarVariante(v2.datos, v2.modelo, { desbloquear: true });
    fs.fallo = null;
    expect(r).toMatchObject({ hecho: false, motivo: "disco" });
    expect(s.estaBloqueada(s4)).toBe(true);
  });

  it("solo se aplica una variante aparcada: una descartada o aplicada, no", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await v.escritor.vaciar();
    await s.descartarVariante(v.datos.id, "");
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r).toMatchObject({ hecho: false, motivo: "estado" });
    const leida = await s.variantes.leer(v.datos.id);
    expect(await s.aplicarVariante(leida, v.modelo)).toMatchObject({ hecho: false, motivo: "estado" });
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Uno");
  });

  it("sin instantánea no se aplica nada (RF-36)", async () => {
    const { s, v, fs, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    const antes = await nota(fs, "s", s1);
    fs.fallo = (op, r) => (r.includes("_instantaneas") && op === "escribir" ? "entero" : null);
    const r = await s.aplicarVariante(v.datos, v.modelo);
    fs.fallo = null;
    expect(r).toMatchObject({ hecho: false, motivo: "instantanea" });
    expect(await nota(fs, "s", s1)).toBe(antes);
  });

  it("mientras se aplica, lo que haga el autor en la serie se rechaza", async () => {
    const { s, v, s1, s2 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    const aplicando = s.aplicarVariante(v.datos, v.modelo);
    const editado = await s.aplicar(editar(s.modelo, s2, (p) => ((p as Ev).titulo = "Durante")));
    expect(editado).toBe(false);
    expect(s.avisosCambio[0]).toMatch(/^Aplicando «Nando se va»/);
    expect((await aplicando).hecho).toBe(true);
    expect(s.modelo.eventos.get(s2)!.titulo).toBe("Dos");
    expect(s.edicionBloqueada).toBeNull();
  });

  it("las otras variantes que tocaban lo mismo pasan a tener choques; no se cambian solas (RF-40)", async () => {
    const { s, v, s1 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la primera"));
    const otra = await SesionVariante.abrirSobre(s, variante("va-otra", "Otra", ""));
    abiertas.push(otra);
    await enVariante(otra, s1, (p) => (p.titulo = "En la otra"));
    expect((await s.aplicarVariante(v.datos, v.modelo)).hecho).toBe(true);
    expect(otra.choques()).toEqual([expect.objectContaining({ clase: "pieza", id: s1, dosLados: ["Título"] })]);
    expect(otra.modelo.eventos.get(s1)!.titulo).toBe("En la otra");
  });

  it("es un solo paso de deshacer de la serie", async () => {
    const { s, v, s1, s3 } = await preparar();
    await enVariante(v, s1, (p) => (p.titulo = "En la variante"));
    await v.aplicar(borrarPieza(v.modelo, s3));
    await s.aplicarVariante(v.datos, v.modelo);
    await s.deshacer();
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("Uno");
    expect(s.modelo.eventos.has(s3)).toBe(true);
    await s.rehacer();
    expect(s.modelo.eventos.get(s1)!.titulo).toBe("En la variante");
    expect(s.modelo.eventos.has(s3)).toBe(false);
  });

  it("serie grande: aplicar 200 piezas en menos de 2 s (disco en memoria)", async () => {
    const fs = new FsMemoria();
    const almacen = new Almacen(fs, RAIZ);
    const d = generarPruebaGrande();
    await almacen.crearSerie("g", { titulo: "G" });
    for (const p of [d.serie, ...d.puntos, ...d.temporadas, ...d.episodios, ...d.arcos, ...d.eventos, ...d.secretos] as Pieza[]) await almacen.guardar("g", p);
    const s = await Sesion.abrir(almacen, "g", "PC");
    abiertas.push(s);
    const v = await SesionVariante.abrirSobre(s, variante("va-gran", "Grande", ""));
    abiertas.push(v);
    for (const ev of [...v.modelo.eventos.values()].filter((e) => e.madurez !== "canon").slice(0, 200)) await enVariante(v, ev.id, (p) => (p.titulo = `${p.titulo}!`));
    expect(v.datos.piezas.size).toBe(200);
    const t = performance.now();
    const r = await s.aplicarVariante(v.datos, v.modelo);
    const ms = performance.now() - t;
    console.log(`Aplicar 200 piezas (disco en memoria): ${ms.toFixed(0)} ms`);
    expect(r.hecho).toBe(true);
    expect(ms).toBeLessThan(2000);
  }, 60_000);
});
