import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { construirFilas, type CacheAnalisis } from "../src/lib/desglose/desglose";
import { leerTexto, leerTextos } from "../src/lib/desglose/lectura";
import { esIdEscena, vacio } from "../src/lib/guion/tipos";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 014, T5 (lógica de la interfaz): lectura de los guiones en segundo plano.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

async function abrir() {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  const idx = s.modelo.indice();
  const ids = idx.episodios.flatMap((e) => idx.porEpisodio.get(e) ?? []).filter((ev) => esIdEscena(ev.id)).map((ev) => ev.id);
  return { fs, s, ids };
}

async function escribir(s: Sesion, id: string, texto: string) {
  await s.guion.cargar(id);
  s.guardadoGuion.cambiar(id, { ...vacio(id), texto });
  await s.guardadoGuion.vaciar();
}

describe("lectura de guiones para el desglose", () => {
  it("lee el texto de los que existen y deja null los demás", async () => {
    const { s, ids } = await abrir();
    await escribir(s, ids[0]!, "INT. CASA - DÍA\n\nHola.");
    await escribir(s, ids[1]!, "   \n");
    const r = await leerTextos(s.guion, ids.slice(0, 3));
    expect(r.get(ids[0]!)).toBe("INT. CASA - DÍA\n\nHola.");
    expect(r.get(ids[1]!)).toBeNull();
    expect(r.get(ids[2]!)).toBeNull();
  });

  it("un fichero ilegible cuenta como sin guion y no se toca", async () => {
    const { fs, s, ids } = await abrir();
    await escribir(s, ids[0]!, "texto");
    const ruta = s.guion.ruta(ids[0]!);
    await fs.escribir(ruta, "---\nesto: [no se cierra\n---\nx");
    expect(await leerTexto(s.guion, ids[0]!)).toBeNull();
    expect(await fs.leer(ruta)).toBe("---\nesto: [no se cierra\n---\nx");
    expect(await fs.existe(s.guion.dir + "/" + ids[0] + " rota")).toBe(false);
  });

  it("leer no cambia lo «conocido» del almacén: un cambio de fuera sigue detectándose al editar", async () => {
    const { fs, s, ids } = await abrir();
    await escribir(s, ids[0]!, "uno");
    await leerTextos(s.guion, [ids[0]!]);
    expect(await s.guion.comprobarFuera(ids[0]!)).toBe(false);
    const ruta = s.guion.ruta(ids[0]!);
    const actual = await fs.leer(ruta);
    await fs.escribir(ruta, actual.replace("uno", "otro"));
    await leerTextos(s.guion, [ids[0]!]);
    expect(await s.guion.comprobarFuera(ids[0]!)).toBe(true);
  });

  it("avisa del avance, lee de cuatro en cuatro como mucho y se puede cancelar", async () => {
    const { s, ids } = await abrir();
    const avances: number[] = [];
    await leerTextos(s.guion, ids, { alAvanzar: (h) => avances.push(h) });
    expect(avances.length).toBe(ids.length);
    expect(avances[avances.length - 1]).toBe(ids.length);
    let n = 0;
    const parcial = await leerTextos(s.guion, ids, { lecturas: 1, cancelado: () => n++ >= 2 });
    expect(parcial.size).toBe(2);
  });

  it("con la caché, el texto que no cambió no se vuelve a analizar", async () => {
    const { s, ids } = await abrir();
    const textos = new Map<string, string | null>([[ids[0]!, "INT. CASA - DÍA\n\nHola."]]);
    const cache: CacheAnalisis = new Map();
    construirFilas(s.modelo, null, textos, cache);
    const primero = cache.get(ids[0]!)!.analisis;
    construirFilas(s.modelo, null, textos, cache);
    expect(cache.get(ids[0]!)!.analisis).toBe(primero);
    textos.set(ids[0]!, "EXT. PLAZA - NOCHE\n\nHola.");
    construirFilas(s.modelo, null, textos, cache);
    expect(cache.get(ids[0]!)!.analisis).not.toBe(primero);
    expect(cache.get(ids[0]!)!.analisis.encabezado?.ie).toBe("EXT");
  });
});
