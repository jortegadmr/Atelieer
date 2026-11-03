import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import { escribirGuion, leerGuion } from "../src/lib/guion/formato";
import { esIdEscena, vacio, type Guion } from "../src/lib/guion/tipos";
import { estadoDe } from "../src/lib/modelo/estados";
import { borrarPieza } from "../src/lib/modelo/operaciones";
import { variante } from "../src/lib/variantes/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 013, T10b y T10c: el guion viaja con su escena (RF-34), el canon no
// bloquea escribirlo (RF-32) y una variante no toca _guion/ (RF-33).

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

const dirGuion = `${APPDATOS}/_prueba/_guion`;
const rutaGuion = (id: string) => `${dirGuion}/${id}.md`;
const enPapelera = (fs: FsMemoria, id: string) => fs.rutas().filter((r) => r.includes("/_papelera/_guion/") && r.includes(`/${id} `) && !r.includes(" copia "));
const g = (id: string, texto: string): Guion => ({ ...vacio(id), texto });

async function abrir() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s };
}

/** Escribe un guion de verdad (por el guardado de la sesión) */
async function escribir(s: Sesion, id: string, texto: string) {
  await s.guion.cargar(id);
  s.guardadoGuion.cambiar(id, g(id, texto));
  await s.guardadoGuion.vaciar();
}

const leer = async (fs: FsMemoria, id: string) => (leerGuion(await fs.leer(rutaGuion(id))) as { guion: Guion }).guion.texto;

function escenas(s: Sesion, n: number): string[] {
  const ids = [...s.modelo.eventos.values()].filter((e) => esIdEscena(e.id)).map((e) => e.id);
  expect(ids.length).toBeGreaterThanOrEqual(n);
  return ids.slice(0, n);
}

describe("el guion viaja con su escena (spec 013, T10b)", () => {
  it("borrar una escena manda su guion a la papelera y deshacer lo devuelve", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "INT. TALLER – NOCHE\n\nCARMELA\nHola.");
    await s.aplicar(borrarPieza(s.modelo, id!));
    expect(s.modelo.pieza(id!)).toBeUndefined();
    expect(await fs.existe(rutaGuion(id!))).toBe(false);
    expect(enPapelera(fs, id!)).toHaveLength(1);
    await s.deshacer();
    expect(s.modelo.pieza(id!)).toBeDefined();
    expect(await leer(fs, id!)).toBe("INT. TALLER – NOCHE\n\nCARMELA\nHola.");
    expect(s.alMoverGuiones).toBeNull();
    // Y se puede seguir escribiendo sin que parezca un cambio de fuera
    await escribir(s, id!, "otra vez");
    expect(s.guardadoGuion.cambiadas.size).toBe(0);
    expect(await leer(fs, id!)).toBe("otra vez");
  });

  it("rehacer el borrado vuelve a mover el guion", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "texto");
    await s.aplicar(borrarPieza(s.modelo, id!));
    await s.deshacer();
    await s.rehacer();
    expect(s.modelo.pieza(id!)).toBeUndefined();
    expect(await fs.existe(rutaGuion(id!))).toBe(false);
    await s.deshacer();
    expect(await leer(fs, id!)).toBe("texto");
  });

  it("lo pendiente de escribir se guarda antes de mover y no recrea el fichero", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await s.guion.cargar(id!);
    s.guardadoGuion.cambiar(id!, g(id!, "sin vaciar aún"));
    await s.aplicar(borrarPieza(s.modelo, id!));
    expect(await fs.existe(rutaGuion(id!))).toBe(false);
    const copia = enPapelera(fs, id!);
    expect(copia).toHaveLength(1);
    expect((leerGuion(await fs.leer(copia[0]!)) as { guion: Guion }).guion.texto).toBe("sin vaciar aún");
    expect(s.guardadoGuion.hayPendiente).toBe(false);
  });

  it("borrar una temporada mueve los guiones de todas sus escenas", async () => {
    const { fs, s } = await abrir();
    const t = [...s.modelo.temporadas.keys()][0]!;
    const deLaTemporada = [...s.modelo.eventos.values()].filter((e) => e.temporada === t && esIdEscena(e.id)).map((e) => e.id);
    expect(deLaTemporada.length).toBeGreaterThanOrEqual(2);
    const dos = deLaTemporada.slice(0, 2);
    for (const id of dos) await escribir(s, id, `guion de ${id}`);
    // La temporada de la serie de prueba tiene piezas canon: se acepta el retcon para poder borrarla
    for (const p of [t, ...deLaTemporada, ...[...s.modelo.episodios.values()].filter((e) => e.temporada === t).map((e) => e.id)]) s.desbloquear(p);
    const ok = await s.aplicar(borrarPieza(s.modelo, t));
    expect(ok).toBe(true);
    for (const id of dos) {
      expect(await fs.existe(rutaGuion(id))).toBe(false);
      expect(enPapelera(fs, id)).toHaveLength(1);
    }
    await s.deshacer();
    for (const id of dos) expect(await leer(fs, id)).toBe(`guion de ${id}`);
  });

  it("deshacer la creación de una escena manda su guion a la papelera", async () => {
    const { fs, s } = await abrir();
    const [antes] = escenas(s, 1);
    await s.aplicar({ guardar: [{ ...s.modelo.eventos.get(antes!)!, id: "ev-zzzz", titulo: "Nueva" }], borrar: [] });
    expect(s.modelo.pieza("ev-zzzz")).toBeDefined();
    await escribir(s, "ev-zzzz", "recién escrita");
    await s.deshacer();
    expect(s.modelo.pieza("ev-zzzz")).toBeUndefined();
    expect(await fs.existe(rutaGuion("ev-zzzz"))).toBe(false);
    expect(enPapelera(fs, "ev-zzzz")).toHaveLength(1);
    await s.rehacer();
    expect(await leer(fs, "ev-zzzz")).toBe("recién escrita");
  });

  it("un borrado desde fuera deja el guion como huérfano y no lo toca", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "me quedo");
    const pieza = s.modelo.pieza(id!)!;
    await fs.borrar(s.almacen.rutaPieza("_prueba", pieza));
    await s.releer([s.almacen.rutaPieza("_prueba", pieza)]);
    expect(await leer(fs, id!)).toBe("me quedo");
    const l = await s.guion.listar(new Set([...s.modelo.eventos.keys()]));
    expect(l.huerfanos).toContain(id);
  });

  it("mover una escena de episodio no toca el guion", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "viaja por id");
    const antes = await fs.leer(rutaGuion(id!));
    const ev = s.modelo.eventos.get(id!)!;
    await s.aplicar({ guardar: [{ ...ev, episodio: "" }], borrar: [] });
    expect(await fs.leer(rutaGuion(id!))).toBe(antes);
    expect(enPapelera(fs, id!)).toHaveLength(0);
  });

  it("si moverlo falla, el borrado se mantiene y se avisa", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "atascado");
    fs.fallo = (op, ruta) => (op === "renombrar" && ruta.includes("_guion") ? "entero" : null);
    await s.aplicar(borrarPieza(s.modelo, id!));
    fs.fallo = null;
    expect(s.modelo.pieza(id!)).toBeUndefined();
    expect(s.avisosCambio.join(" ")).toMatch(/no se pudo mover el guion/);
    expect(await leer(fs, id!)).toBe("atascado");
  });
});

describe("canon y variantes (spec 013, T10c)", () => {
  it("escribir el guion de una escena canon no pasa por el bloqueo", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await s.cambiarEstado(id!, "canon");
    expect(estadoDe(s.modelo.pieza(id!) as never)).toBe("canon");
    const version = s.modelo.version;
    s.avisosCambio = [];
    await escribir(s, id!, "guion de una escena canon");
    expect(await leer(fs, id!)).toBe("guion de una escena canon");
    expect(s.modelo.version).toBe(version);
    expect(s.avisosCambio).toEqual([]);
  });

  it("borrar una escena dentro de una variante no toca _guion/", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "de la serie");
    const antes = await fs.leer(rutaGuion(id!));
    const v = await SesionVariante.abrirSobre(s, variante("va-gui", "Sin la escena", ""));
    abiertas.push(v);
    await v.aplicar(borrarPieza(v.modelo, id!));
    await v.escritor.vaciar();
    expect(v.modelo.pieza(id!)).toBeUndefined();
    expect(await fs.leer(rutaGuion(id!))).toBe(antes);
    expect(enPapelera(fs, id!)).toHaveLength(0);
    // La serie sigue teniendo su escena y su guion
    expect(s.modelo.pieza(id!)).toBeDefined();
  });

  it("aplicar una variante que borra una escena se lleva su guion, y deshacer lo devuelve", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "se va con la variante");
    const v = await SesionVariante.abrirSobre(s, variante("va-gui", "Sin la escena", ""));
    abiertas.push(v);
    await v.aplicar(borrarPieza(v.modelo, id!));
    await v.escritor.vaciar();
    const r = await s.aplicarVariante(v.datos, v.modelo, { desbloquear: true });
    expect(r.hecho).toBe(true);
    expect(s.modelo.pieza(id!)).toBeUndefined();
    expect(await fs.existe(rutaGuion(id!))).toBe(false);
    expect(enPapelera(fs, id!)).toHaveLength(1);
    await s.deshacer();
    expect(await leer(fs, id!)).toBe("se va con la variante");
  });
});

describe("revisión de código de la spec 013 (T25c)", () => {
  it("borrar una escena con una versión mía sin escribir (cambio por fuera) la deja en la papelera", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await escribir(s, id!, "el de antes");
    await fs.cambiarDesdeFuera(rutaGuion(id!), escribirGuion(g(id!, "de fuera")));
    s.guardadoGuion.cambiar(id!, g(id!, "mía, sin escribir"));
    await s.guardadoGuion.vaciar();
    expect(s.guardadoGuion.cambiadas.has(id!)).toBe(true);
    await s.aplicar(borrarPieza(s.modelo, id!));
    const copias = await Promise.all(fs.rutas().filter((r) => r.includes("/_papelera/_guion/")).map((r) => fs.leer(r)));
    expect(copias.some((c) => c.includes("mía, sin escribir"))).toBe(true);
  });

  it("un guion de más de 500 páginas con menos de 1 MB se abre en solo lectura", async () => {
    const { fs, s } = await abrir();
    const [id] = escenas(s, 1);
    await fs.crearDir(dirGuion);
    await fs.escribir(rutaGuion(id!), escribirGuion(g(id!, Array.from({ length: 30000 }, () => "x").join("\n"))));
    const c = await s.guion.cargar(id!);
    expect(c.soloLectura).toBe(true);
    expect(c.avisos.join(" ")).toContain("tope");
  });

  it("escribir un guion basta para que la copia automática se haga", async () => {
    const { s } = await abrir();
    await s.copiaAutomatica();
    const antes = (await s.instantaneas.listar()).length;
    const [id] = escenas(s, 1);
    await escribir(s, id!, "algo nuevo");
    await s.copiaAutomatica();
    expect((await s.instantaneas.listar()).length).toBeGreaterThanOrEqual(antes);
    expect(await s.instantaneas.contenido((await s.instantaneas.listar())[0]!.nombre)).toContain(`_guion/${id}.md`);
  });
});
