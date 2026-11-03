import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { IndiceGuion } from "../src/lib/guion/indice";
import { esIdEscena, vacio } from "../src/lib/guion/tipos";
import { borrarPieza } from "../src/lib/modelo/operaciones";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 013, T11: páginas por escena y sumas por episodio, temporada y serie.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

/** 55 líneas de acción = exactamente 1 página = 60 s */
const PAGINA = Array.from({ length: 55 }, () => "x").join("\n");

async function abrir() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  const indice = new IndiceGuion(s.guion, () => s.modelo);
  return { fs, s, indice };
}

async function escribir(s: Sesion, id: string, texto: string) {
  await s.guion.cargar(id);
  s.guardadoGuion.cambiar(id, { ...vacio(id), texto });
  await s.guardadoGuion.vaciar();
}

/** Un episodio con al menos 2 escenas que cuentan (las no canon primero), y su temporada */
function episodioConEscenas(s: Sesion) {
  const idx = s.modelo.indice();
  for (const ep of idx.episodios) {
    const evs = (idx.porEpisodio.get(ep) ?? []).filter((e) => esIdEscena(e.id) && e.madurez !== "descartado");
    if (evs.length >= 2) return { ep, temporada: s.modelo.episodios.get(ep)!.temporada, ids: evs.sort((a, b) => Number(a.madurez === "canon") - Number(b.madurez === "canon")).map((e) => e.id) };
  }
  throw new Error("la serie de prueba no tiene un episodio con 2 escenas");
}

describe("Índice de páginas del guion (spec 013, T11)", () => {
  it("suma por episodio, temporada y serie, y dice cuántas escenas faltan", async () => {
    const { s, indice } = await abrir();
    const { ep, temporada, ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, PAGINA);
    await escribir(s, ids[1]!, `${PAGINA}\n${PAGINA}`);
    await indice.calcular();
    const e = indice.resumen({ que: "episodio", id: ep });
    expect(e.escenas).toBe(ids.length);
    expect(e.conGuion).toBe(2);
    expect(e.paginas).toBeCloseTo(3.04, 1); // 55 + 109 líneas
    expect(e.segundos).toBeGreaterThan(175);
    expect(e.calculando).toBe(false);
    const t = indice.resumen({ que: "temporada", id: temporada });
    expect(t.conGuion).toBe(2);
    expect(t.escenas).toBeGreaterThanOrEqual(e.escenas);
    const total = indice.resumen({ que: "serie" });
    expect(total.conGuion).toBe(2);
    expect(total.paginas).toBeCloseTo(e.paginas, 5);
  });

  it("la bandeja cuenta en temporada y serie y no en episodio", async () => {
    const { s, indice } = await abrir();
    const { ep, temporada, ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, PAGINA);
    await indice.calcular();
    const antes = indice.resumen({ que: "temporada", id: temporada });
    const antesEp = indice.resumen({ que: "episodio", id: ep });
    // La escena sale a la bandeja de su temporada
    const ev = s.modelo.eventos.get(ids[0]!)!;
    s.desbloquear(ids[0]!);
    await s.aplicar({ guardar: [{ ...ev, episodio: "" }], borrar: [] });
    expect(s.modelo.eventos.get(ids[0]!)!.episodio).toBe("");
    const despuesEp = indice.resumen({ que: "episodio", id: ep });
    expect(despuesEp.conGuion).toBe(antesEp.conGuion - 1);
    expect(despuesEp.escenas).toBe(antesEp.escenas - 1);
    const despues = indice.resumen({ que: "temporada", id: temporada });
    expect(despues.conGuion).toBe(antes.conGuion);
    expect(despues.paginas).toBeCloseTo(antes.paginas, 5);
    expect(indice.resumen({ que: "serie" }).conGuion).toBe(1);
  });

  it("una escena sin guion, o con solo espacios, no suma y se cuenta como falta", async () => {
    const { s, indice } = await abrir();
    const { ep, ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, "  \n\n ");
    await indice.calcular();
    const e = indice.resumen({ que: "episodio", id: ep });
    expect(e.conGuion).toBe(0);
    expect(e.paginas).toBe(0);
    expect(e.escenas).toBeGreaterThan(0);
    expect(indice.medidaDe(ids[0]!)).toBeNull();
  });

  it("las escenas descartadas no suman ni cuentan como falta", async () => {
    const { s, indice } = await abrir();
    const { ep, ids } = episodioConEscenas(s);
    await indice.calcular();
    const antes = indice.resumen({ que: "episodio", id: ep }).escenas;
    await escribir(s, ids[0]!, PAGINA);
    s.desbloquear(ids[0]!);
    await s.cambiarEstado(ids[0]!, "descartado", { motivo: "no pega" });
    indice.invalidar([ids[0]!]);
    await indice.calcular();
    const e = indice.resumen({ que: "episodio", id: ep });
    expect(e.escenas).toBe(antes - 1);
    expect(e.conGuion).toBe(0);
  });

  it("dice «calculando» hasta terminar", async () => {
    const { s, indice } = await abrir();
    const { ep, ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, PAGINA);
    expect(indice.resumen({ que: "episodio", id: ep }).calculando).toBe(true);
    const listo = indice.calcular();
    expect(indice.calculando).toBe(true);
    await listo;
    expect(indice.calculando).toBe(false);
    expect(indice.resumen({ que: "episodio", id: ep }).calculando).toBe(false);
  });

  it("escribir en pantalla se mide al momento, sin esperar al disco", async () => {
    const { s, indice } = await abrir();
    const { ep, ids } = episodioConEscenas(s);
    await indice.calcular();
    indice.ponerTexto(ids[0]!, PAGINA);
    const e = indice.resumen({ que: "episodio", id: ep });
    expect(e.conGuion).toBe(1);
    expect(e.paginas).toBeCloseTo(1, 5);
    indice.ponerTexto(ids[0]!, "");
    expect(indice.resumen({ que: "episodio", id: ep }).conGuion).toBe(0);
  });

  it("un cambio de fuera, mover, borrar y restaurar invalidan lo medido", async () => {
    const { fs, s, indice } = await abrir();
    const { ep, ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, PAGINA);
    await indice.calcular();
    expect(indice.resumen({ que: "episodio", id: ep }).conGuion).toBe(1);

    // De fuera: otro equipo reescribe el fichero y la sesión avisa por la vigilancia
    s.alCambiarGuion = (cambios) => indice.invalidarRutas(cambios.map((c) => c.ruta));
    const ruta = s.guion.ruta(ids[0]!);
    const crudo = await fs.leer(ruta);
    await fs.cambiarDesdeFuera(ruta, crudo.replace(PAGINA, `${PAGINA}\n${PAGINA}`));
    await s.releer([ruta]);
    await indice.calcular();
    expect(indice.resumen({ que: "episodio", id: ep }).paginas).toBeGreaterThan(1.5);

    // Borrar la escena: el guion se mueve y ya no cuenta (la escena ya no está)
    s.alMoverGuiones = (movidos) => indice.invalidar(movidos);
    await s.aplicar(borrarPieza(s.modelo, ids[0]!));
    await indice.calcular();
    expect(indice.resumen({ que: "episodio", id: ep }).conGuion).toBe(0);
    await s.deshacer();
    await indice.calcular();
    expect(indice.resumen({ que: "episodio", id: ep }).conGuion).toBe(1);

    // Restaurar: todo se vuelve a leer
    await fs.borrar(ruta);
    indice.invalidar();
    await indice.calcular();
    expect(indice.resumen({ que: "episodio", id: ep }).conGuion).toBe(0);
  });

  it("una lectura que empezó antes de un cambio no pisa lo nuevo", async () => {
    const { s, indice } = await abrir();
    const { ep, ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, PAGINA);
    const listo = indice.calcular();
    indice.ponerTexto(ids[0]!, `${PAGINA}\n${PAGINA}`);
    await listo;
    expect(indice.resumen({ que: "episodio", id: ep }).paginas).toBeGreaterThan(1.5);
  });

  it("cambiar de serie cancela: lo que estaba leyéndose no escribe nada", async () => {
    const { s, indice } = await abrir();
    const { ids } = episodioConEscenas(s);
    await escribir(s, ids[0]!, PAGINA);
    const listo = indice.calcular();
    indice.cancelar();
    await listo;
    expect(indice.medidaDe(ids[0]!)).toBeUndefined();
    expect(indice.calculando).toBe(false);
  });

  it("máximo 4 lecturas a la vez", async () => {
    const { s, indice } = await abrir();
    const total = [...s.modelo.eventos.values()].filter((e) => esIdEscena(e.id)).length;
    expect(total).toBeGreaterThan(4);
    await indice.calcular();
    expect(indice.maximoSimultaneas).toBeLessThanOrEqual(4);
    expect(indice.maximoSimultaneas).toBeGreaterThan(1);
  });
});

export type { FsMemoria };
