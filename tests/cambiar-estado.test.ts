import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { estadoDe } from "../src/lib/modelo/estados";
import { borrarPieza } from "../src/lib/modelo/operaciones";
import type { Temporada } from "../src/lib/modelo/tipos";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 001: cambiar el estado de una pieza (modo mixto) y bloqueo de canon.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

async function abrir(fs?: FsMemoria) {
  fs ??= await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s };
}

const ID = "te-t001";
const temporada = (s: Sesion) => s.modelo.temporadas.get(ID)!;
const fichaDe = (s: Sesion) => `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;
const log = async (fs: FsMemoria, s: Sesion) => fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`).catch(() => "");

describe("pasar a borrador crea la ficha en el mismo paso (RF-18 a RF-21)", () => {
  it("crea la ficha en borrador, enlaza la pieza y la deja en la mesa", async () => {
    const { fs, s } = await abrir();
    const r = await s.cambiarEstado(ID, "borrador");
    expect(r.hecho).toBe(true);
    expect(estadoDe(temporada(s))).toBe("borrador");
    expect(temporada(s).wiki).toBe("[[T01 - Cerrar la emisora]]");
    expect(await fs.leer(fichaDe(s))).toContain("estado_canon: borrador");
    await s.guardado.vaciar();
    expect(await fs.existe(`${APPDATOS}/_prueba/temporadas/${ID}.md`)).toBe(true);
  });

  it("si otra nota del vault se llama igual, no cambia nada y lo dice", async () => {
    const { fs, s } = await abrir();
    await fs.escribir(`${VAULT}/${s.modelo.serie.wiki.raiz}/Otra/T01 - Cerrar la emisora.md`, "otra");
    const antes = structuredClone(temporada(s));
    const r = await s.cambiarEstado(ID, "borrador");
    expect(r.hecho).toBe(false);
    expect(r.pasar?.estado).toBe("nombre repetido");
    expect(temporada(s)).toEqual(antes);
  });

  it("sin carpeta de narrativa, no cambia nada y dice por qué", async () => {
    const { s } = await abrir();
    s.editar(s.modelo.serie.id, (p) => {
      if (p.tipo === "serie") p.wiki.narrativa = "";
    });
    const antes = structuredClone(temporada(s));
    const r = await s.cambiarEstado(ID, "canon");
    expect(r.hecho).toBe(false);
    expect(r.avisos.join(" ")).toMatch(/narrativa/);
    expect(temporada(s)).toEqual(antes);
  });

  it("si ya tiene ficha, no la vuelve a crear ni toca su texto: solo el estado (RF-20)", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    const texto = (await fs.leer(fichaDe(s))) + "\nNotas del autor\n";
    await fs.cambiarDesdeFuera(fichaDe(s), texto);
    await s.leerWiki();
    await s.cambiarEstado(ID, "idea");
    await s.cambiarEstado(ID, "borrador");
    expect(await fs.leer(fichaDe(s))).toBe(texto);
  });

  it("un evento solo cambia en la mesa: no tiene ficha (RF-22)", async () => {
    const { fs, s } = await abrir();
    const ev = [...s.modelo.eventos.values()][0];
    const antes = fs.rutas();
    const r = await s.cambiarEstado(ev.id, "canon");
    expect(r.hecho).toBe(true);
    expect(estadoDe(s.modelo.eventos.get(ev.id)!)).toBe("canon");
    expect(fs.rutas().filter((x) => !antes.includes(x) && !x.includes("/appDatos/_prueba/eventos/") && !x.includes("_instantaneas"))).toEqual([]);
  });

  it("pasar a canon una pieza sin ficha la crea y la deja en canon (RF-23)", async () => {
    const { fs, s } = await abrir();
    const r = await s.cambiarEstado(ID, "canon");
    expect(r.hecho).toBe(true);
    expect(estadoDe(temporada(s))).toBe("canon");
    expect(await fs.leer(fichaDe(s))).toContain("estado_canon: canon");
  });
});

describe("la ficha sigue el estado de su pieza (RF-24, RF-25, RF-27)", () => {
  it("descartar cambia la ficha, guarda el motivo y lo apunta en el Log", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    const r = await s.cambiarEstado(ID, "descartado", { motivo: "Repite el giro" });
    expect(r.hecho).toBe(true);
    expect(temporada(s).motivo_descarte).toBe("Repite el giro");
    expect(await fs.leer(fichaDe(s))).toContain("estado_canon: descartado");
    expect(await log(fs, s)).toContain("Estado de [[T01 - Cerrar la emisora]]: descartado");
  });

  it("propuesta y aparcado se escriben en la ficha como idea", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await s.cambiarEstado(ID, "aparcado");
    expect(estadoDe(temporada(s))).toBe("aparcado");
    expect(await fs.leer(fichaDe(s))).toContain("estado_canon: idea");
  });

  it("tras cambiarla, la ficha no sale como «cambió en la wiki»", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await s.cambiarEstado(ID, "descartado");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(false);
  });

  it("si la ficha ya había cambiado en la wiki, cambiar el estado no quita el aviso", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    const t0 = Date.now();
    fs.reloj = () => t0 + 10_000;
    await fs.cambiarDesdeFuera(fichaDe(s), (await fs.leer(fichaDe(s))) + "\nTexto nuevo del autor.\n");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(true);
    await s.cambiarEstado(ID, "propuesta");
    expect(s.fichas.get(ID)?.cambio).toBe(true);
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(true);
  });

  it("si la ficha cambió en la wiki y aún no se ha revisado, cambiar el estado no esconde el aviso", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    const t0 = Date.now();
    fs.reloj = () => t0 + 10_000;
    await fs.cambiarDesdeFuera(fichaDe(s), (await fs.leer(fichaDe(s))) + "\nTexto nuevo del autor.\n");
    await s.cambiarEstado(ID, "propuesta");
    await s.revisarFichas();
    expect(s.fichas.get(ID)?.cambio).toBe(true);
  });

  it("un «Lo sé» pulsado mientras se pone al día la ficha no se pierde", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    const cambio = s.cambiarEstado(ID, "descartado");
    s.editar<Temporada>(ID, (t) => t.avisos_silenciados.push("C01"));
    await cambio;
    expect(temporada(s).avisos_silenciados).toContain("C01");
  });

  it("una pieza borrada mientras se pone al día su ficha no vuelve", async () => {
    const { s } = await abrir();
    const AMOR = "ar-voce";
    await s.pasar(AMOR);
    const cambio = s.cambiarEstado(AMOR, "descartado");
    await s.aplicar(borrarPieza(s.modelo, AMOR));
    await cambio;
    expect(s.modelo.arcos.has(AMOR)).toBe(false);
  });

  it("lo que se escribe mientras se pone al día la ficha no se pierde", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    const cambio = s.cambiarEstado(ID, "descartado");
    s.editar<Temporada>(ID, (t) => (t.logline = "Escrita mientras tanto"));
    await cambio;
    expect(estadoDe(temporada(s))).toBe("descartado");
    expect(temporada(s).logline).toBe("Escrita mientras tanto");
  });

  it("al deshacer el paso a borrador, avisa de que la ficha y el Log se quedan en la wiki", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await s.deshacer();
    expect(temporada(s).wiki).toBe("");
    expect(await fs.existe(fichaDe(s))).toBe(true);
    expect(s.avisosCambio.join(" ")).toMatch(/ficha.*se queda en la wiki.*Log/);
  });

  it("al deshacer un cambio de estado con ficha, avisa de que el Log no se deshace", async () => {
    const { s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await s.cambiarEstado(ID, "descartado");
    await s.deshacer();
    expect(s.avisosCambio.join(" ")).toMatch(/Log no se deshace/);
  });

  it("deshacer devuelve también el estado de la ficha", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await s.cambiarEstado(ID, "descartado");
    await s.deshacer();
    expect(estadoDe(temporada(s))).toBe("borrador");
    expect(await fs.leer(fichaDe(s))).toContain("estado_canon: borrador");
  });

  it("si la ficha ya no está, la pieza cambia en la mesa, no se recrea y avisa", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await fs.borrar(fichaDe(s));
    const r = await s.cambiarEstado(ID, "descartado");
    expect(r.hecho).toBe(true);
    expect(estadoDe(temporada(s))).toBe("descartado");
    expect(await fs.existe(fichaDe(s))).toBe(false);
    expect(r.avisos.join(" ")).toMatch(/ya no está/);
  });

  it("nunca se borra nada al cambiar de estado (RF-31)", async () => {
    const { fs, s } = await abrir();
    await s.guardado.vaciar();
    const antes = fs.rutas();
    for (const e of ["borrador", "canon"] as const) await s.cambiarEstado(ID, e);
    s.desbloquear(ID);
    for (const e of ["descartado", "idea", "aparcado", "propuesta", "borrador"] as const) await s.cambiarEstado(ID, e);
    await s.guardado.vaciar();
    expect(antes.filter((r) => !fs.rutas().includes(r))).toEqual([]);
  });
});

describe("canon bloqueado (RF-28 a RF-30)", () => {
  async function enCanon() {
    const a = await abrir();
    await a.s.cambiarEstado(ID, "canon");
    return a;
  }

  it("una pieza canon no se edita ni cambia de estado, y avisa", async () => {
    const { s } = await enCanon();
    expect(s.estaBloqueada(ID)).toBe(true);
    s.editar<Temporada>(ID, (t) => (t.titulo = "Otro"));
    await Promise.resolve();
    expect(temporada(s).titulo).not.toBe("Otro");
    const r = await s.cambiarEstado(ID, "borrador");
    expect(r.hecho).toBe(false);
    expect(r.avisos.join(" ")).toMatch(/canon/);
  });

  it("canon puesto en Obsidian también bloquea", async () => {
    const { fs, s } = await abrir();
    await s.cambiarEstado(ID, "borrador");
    await fs.cambiarDesdeFuera(fichaDe(s), (await fs.leer(fichaDe(s))).replace("estado_canon: borrador", "estado_canon: canon"));
    await s.revisarFichas();
    expect(estadoDe(temporada(s))).toBe("canon");
    expect(s.estaBloqueada(ID)).toBe(true);
  });

  it("desbloquear deja editar sin cambiar el estado", async () => {
    const { s } = await enCanon();
    s.desbloquear(ID);
    expect(s.estaBloqueada(ID)).toBe(false);
    s.editar<Temporada>(ID, (t) => (t.titulo = "Otro"));
    expect(temporada(s).titulo).toBe("Otro");
    expect(estadoDe(temporada(s))).toBe("canon");
  });

  it("si la ficha no se puede escribir al quitar canon, la pieza sigue en canon y avisa", async () => {
    const { fs, s } = await enCanon();
    s.desbloquear(ID);
    fs.fallo = (op, ruta) => (op === "escribir" && ruta.includes("/Temporadas/") ? "entero" : null);
    const r = await s.cambiarEstado(ID, "borrador");
    fs.fallo = null;
    expect(estadoDe(temporada(s))).toBe("canon");
    expect(r.avisos.join(" ")).toMatch(/No se pudo cambiar la ficha/);
    expect(await fs.leer(fichaDe(s))).toContain("estado_canon: canon");
    await s.revisarFichas();
    expect(estadoDe(temporada(s))).toBe("canon");
  });

  it("al cerrar y volver a abrir la serie, vuelve a estar bloqueada", async () => {
    const { fs, s } = await enCanon();
    s.desbloquear(ID);
    await s.cerrar();
    abiertas = abiertas.filter((x) => x !== s);
    const { s: otra } = await abrir(fs);
    expect(otra.estaBloqueada(ID)).toBe(true);
  });
});
