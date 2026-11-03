import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { agrupar, aTablaMarkdown, construirFilas, ESTADOS_POR_DEFECTO, filtrar, hayFiltros, opcionesDe, sinFiltros, TOPE_COPIA, type FuenteFichas } from "../src/lib/desglose/desglose";
import { esIdEscena } from "../src/lib/guion/tipos";
import type { Ficha, TipoFicha } from "../src/lib/wiki/fichas";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 014, T2: filas del desglose, resolución contra el mundo, filtros, grupos y tabla Markdown.

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

async function abrir() {
  const s = await Sesion.abrir(new Almacen(await vaultDePrueba(), APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return s;
}

const ficha = (tipo: TipoFicha, nombre: string, aliases: string[] = []): Ficha => ({
  nombre,
  tipo,
  ruta: `01_Wiki/${nombre}.md`,
  aliases,
  resumen: "",
  detalle: "",
  motor: { quiere: "", necesita: "", herida: "", mentira: "" },
});

const mundo = (fichas: Ficha[]): FuenteFichas => ({ de: (tipo) => fichas.filter((f) => f.tipo === tipo) });

/** Las tres primeras escenas con código (de episodios), en orden */
function escenas(s: Sesion) {
  const idx = s.modelo.indice();
  const r: string[] = [];
  for (const ep of idx.episodios) for (const ev of idx.porEpisodio.get(ep) ?? []) if (esIdEscena(ev.id)) r.push(ev.id);
  return r;
}

/** Deja sin lugares ni personajes las escenas dadas, para que solo cuente el guion */
function vaciar(s: Sesion, ids: string[]) {
  for (const id of ids) {
    const ev = s.modelo.eventos.get(id)!;
    ev.lugares = [];
    ev.personajes = [];
  }
}

const GUION_A = ["INT. CASA DE TELMO - NOCHE", "", "[[Telmo]] entra. [[Sabela]] mira el [[Baúl]].", "", "TELMO", "Ya está hecho."].join("\n");
const GUION_B = ["EXT. LONJA VIEJA - DÍA", "", "Nadie en la plaza."].join("\n");

const MUNDO = mundo([ficha("lugar", "Casa de Telmo", ["Hogar"]), ficha("lugar", "Lonja Vieja"), ficha("personaje", "Telmo", ["El técnico"]), ficha("personaje", "Sabela")]);

describe("desglose: filas (spec 014, RF-1, RF-2, RF-5)", () => {
  it("con guion: locación, interior/exterior, momento y personajes salen del guion", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    const filas = construirFilas(s.modelo, MUNDO, new Map([[a!, GUION_A]]));
    const f = filas.find((x) => x.id === a)!;
    expect(f).toMatchObject({ conGuion: true, ie: "INT", momento: "noche", origenLocaciones: "guion", origenPersonajes: "guion" });
    expect(f.locaciones).toEqual([{ clave: "casa de telmo", nombre: "Casa de Telmo", ficha: true }]);
    // Telmo habla (ficha) y se nombra a Sabela en la acción (ficha); el Baúl no es personaje
    expect(f.personajes.map((p) => p.nombre).sort()).toEqual(["Sabela", "Telmo"]);
    expect(f.personajes.find((p) => p.nombre === "Telmo")!.habla).toBeGreaterThan(0);
    expect(f.personajes.find((p) => p.nombre === "Sabela")!.habla).toBe(0);
    expect(f.segundos).toBeGreaterThan(0);
  });

  it("un nombre sin tildes ni mayúsculas, o un alias, se resuelve a la ficha", async () => {
    const s = await abrir();
    const [a, b] = escenas(s);
    const filas = construirFilas(s.modelo, MUNDO, new Map([[a!, "INT. HOGAR - DÍA\n\nEL TÉCNICO\nHola."], [b!, "INT. lonja vieja - día\n\nTexto."]]));
    expect(filas.find((x) => x.id === a)!.locaciones[0]).toMatchObject({ nombre: "Casa de Telmo", ficha: true });
    expect(filas.find((x) => x.id === a)!.personajes[0]).toMatchObject({ nombre: "Telmo", ficha: true });
    expect(filas.find((x) => x.id === b)!.locaciones[0]).toMatchObject({ nombre: "Lonja Vieja", ficha: true });
  });

  it("un lugar sin ficha queda con el texto literal", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    const f = construirFilas(s.modelo, mundo([]), new Map([[a!, "INT. SÓTANO OSCURO - NOCHE\n\nAlgo."]])).find((x) => x.id === a)!;
    expect(f.locaciones).toEqual([{ clave: "sotano oscuro", nombre: "Sótano Oscuro", ficha: false }]);
  });

  it("un personaje con ficha escrito sin corchetes en una acción también está en la escena; en un diálogo, no", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    vaciar(s, [a!]);
    const texto = ["INT. CASA DE TELMO - NOCHE", "", "Entra sabela con el abrigo mojado. El técnico no dice nada.", "", "VERA", "Dile a Telmo que no venga."].join("\n");
    const f = construirFilas(s.modelo, MUNDO, new Map([[a!, texto]])).find((x) => x.id === a)!;
    // Sabela (por su nombre) y Telmo (por su alias «El técnico») están en la acción; Vera habla
    expect(f.personajes.map((p) => p.nombre).sort()).toEqual(["Sabela", "Telmo", "Vera"]);
    expect(f.personajes.find((p) => p.nombre === "Vera")!.habla).toBeGreaterThan(0);
    // Un nombre que solo sale dentro de un diálogo ajeno no cuenta
    const soloDialogo = construirFilas(s.modelo, MUNDO, new Map([[a!, "INT. CASA DE TELMO - NOCHE\n\nVERA\nDile a Telmo que no venga."]])).find((x) => x.id === a)!;
    expect(soloDialogo.personajes.map((p) => p.nombre)).toEqual(["Vera"]);
  });

  it("un nombre de tres letras o menos no se busca suelto en las acciones, y una palabra contenida en otra no cuenta", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    vaciar(s, [a!]);
    const mundoCorto = mundo([ficha("personaje", "Ana"), ficha("personaje", "Sabela"), ficha("personaje", "Al")]);
    const texto = "INT. SALA - DÍA\n\nAl entrar, la gitana canta. Rosalía mira.";
    const f = construirFilas(s.modelo, mundoCorto, new Map([[a!, texto]])).find((x) => x.id === a)!;
    expect(f.personajes.map((p) => p.nombre)).toEqual([]);
  });

  it("si el guion no dice locación ni personajes, salen de la ficha de la escena y se marca", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    const ev = s.modelo.eventos.get(a!)!;
    ev.lugares = ["Lonja Vieja"];
    ev.personajes = ["Sabela"];
    const f = construirFilas(s.modelo, MUNDO, new Map([[a!, "Solo una acción sin nadie."]])).find((x) => x.id === a)!;
    expect(f).toMatchObject({ conGuion: true, origenLocaciones: "escena", origenPersonajes: "escena", ie: null, momento: null });
    expect(f.locaciones[0]!.nombre).toBe("Lonja Vieja");
    expect(f.personajes.map((p) => p.nombre)).toEqual(["Sabela"]);
  });

  it("sin guion usa solo la ficha de la escena y no tiene minutos", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    s.modelo.eventos.get(a!)!.lugares = ["Casa de Telmo"];
    const f = construirFilas(s.modelo, MUNDO, new Map()).find((x) => x.id === a)!;
    expect(f).toMatchObject({ conGuion: false, segundos: null, origenLocaciones: "escena", ie: null, momento: null });
  });

  it("un guion con varios encabezados da varias locaciones; interior/exterior sale del primero", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    const texto = "INT. CASA DE TELMO - NOCHE\n\nSale.\n\nEXT. LONJA VIEJA - DÍA\n\nLlega.";
    const f = construirFilas(s.modelo, MUNDO, new Map([[a!, texto]])).find((x) => x.id === a)!;
    expect(f.locaciones.map((l) => l.nombre)).toEqual(["Casa de Telmo", "Lonja Vieja"]);
    expect(f.ie).toBe("INT");
  });

  it("construir las filas no cambia nada del modelo ni de las escenas", async () => {
    const s = await abrir();
    const antes = JSON.stringify([...s.modelo.eventos.values()]);
    construirFilas(s.modelo, MUNDO, new Map(escenas(s).map((id) => [id, GUION_A] as const)));
    expect(JSON.stringify([...s.modelo.eventos.values()])).toBe(antes);
  });
});

describe("desglose: filtros (RF-3, RF-8)", () => {
  async function filasDe() {
    const s = await abrir();
    const [a, b, c] = escenas(s);
    vaciar(s, [a!, b!, c!]);
    const textos = new Map<string, string | null>([[a!, GUION_A], [b!, GUION_B], [c!, "Sin encabezado, solo acción."]]);
    const todas = construirFilas(s.modelo, MUNDO, textos);
    return { s, ids: [a!, b!, c!], todas, filas: todas.filter((x) => [a, b, c].includes(x.id)) };
  }

  it("por interior/exterior y momento; lo que no se reconoce no entra en ese filtro", async () => {
    const { filas, ids } = await filasDe();
    const f = sinFiltros();
    f.ie = ["INT"];
    expect(filtrar(filas, f).map((x) => x.id)).toEqual([ids[0]]);
    f.ie = [];
    f.momentos = ["día"];
    expect(filtrar(filas, f).map((x) => x.id)).toEqual([ids[1]]);
  });

  it("por locación y por personajes: alguno o todos", async () => {
    const { filas, ids } = await filasDe();
    const f = sinFiltros();
    f.locaciones = ["casa de telmo", "lonja vieja"];
    expect(filtrar(filas, f).map((x) => x.id)).toEqual([ids[0], ids[1]]);
    f.modoLocaciones = "todos";
    expect(filtrar(filas, f)).toEqual([]);
    const g = sinFiltros();
    g.personajes = ["telmo", "sabela"];
    expect(filtrar(filas, g).map((x) => x.id)).toEqual([ids[0]]);
    g.personajes = ["telmo", "nadie"];
    g.modoPersonajes = "todos";
    expect(filtrar(filas, g)).toEqual([]);
  });

  it("por defecto no salen las descartadas, y se ven si se piden", async () => {
    const { s, filas, ids } = await filasDe();
    const ev = s.modelo.eventos.get(ids[0]!)!;
    ev.madurez = "descartado";
    const nuevas = construirFilas(s.modelo, MUNDO, new Map([[ids[0]!, GUION_A]]));
    expect(filtrar(nuevas, sinFiltros()).some((x) => x.id === ids[0])).toBe(false);
    const todas = sinFiltros();
    todas.estados = [...todas.estados, "descartado"];
    expect(filtrar(nuevas, todas).some((x) => x.id === ids[0])).toBe(true);
    expect(filas.length).toBeGreaterThan(0);
  });

  it("por temporada y episodio", async () => {
    const { s, todas, ids } = await filasDe();
    const ev = s.modelo.eventos.get(ids[0]!)!;
    const f = sinFiltros();
    f.temporada = ev.temporada;
    f.episodio = ev.episodio;
    const r = filtrar(todas, f);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.episodio === ev.episodio)).toBe(true);
  });

  it("hayFiltros ignora el estado por defecto y lo detecta si cambia", () => {
    const f = sinFiltros();
    expect(hayFiltros(f)).toBe(false);
    f.estados = [...ESTADOS_POR_DEFECTO, "descartado"];
    expect(hayFiltros(f)).toBe(true);
    const g = sinFiltros();
    g.personajes = ["telmo"];
    expect(hayFiltros(g)).toBe(true);
  });

  it("las opciones de locación y personaje salen de las filas, alfabéticas", async () => {
    const { filas } = await filasDe();
    const o = opcionesDe(filas);
    expect(o.locaciones.map((x) => x.nombre)).toEqual(["Casa de Telmo", "Lonja Vieja"]);
    expect(o.personajes.map((x) => x.nombre)).toEqual(["Sabela", "Telmo"]);
  });
});

describe("desglose: grupos (RF-4)", () => {
  it("por locación: una escena con dos lugares sale en los dos; sin lugar, al final", async () => {
    const s = await abrir();
    const [a, b, c] = escenas(s);
    vaciar(s, [a!, b!, c!]);
    const textos = new Map<string, string | null>([
      [a!, "INT. CASA DE TELMO - NOCHE\n\nSale.\n\nEXT. LONJA VIEJA - DÍA\n\nLlega."],
      [b!, GUION_B],
      [c!, "Solo acción."],
    ]);
    const grupos = agrupar(construirFilas(s.modelo, MUNDO, textos).filter((x) => [a, b, c].includes(x.id)), "locacion");
    const nombres = grupos.map((g) => g.nombre);
    expect(nombres.slice(0, 2)).toEqual(["Casa de Telmo", "Lonja Vieja"]);
    expect(grupos.find((g) => g.nombre === "Lonja Vieja")!.filas.map((x) => x.id)).toEqual([a, b]);
    expect(nombres[nombres.length - 1]).toBe("Sin locación");
    const sin = grupos[grupos.length - 1]!;
    expect(sin.sinGuion).toBe(0);
  });

  it("por personaje y por episodio; cuenta minutos, personajes y escenas sin guion", async () => {
    const s = await abrir();
    const [a, b] = escenas(s);
    vaciar(s, [a!, b!]);
    const filas = construirFilas(s.modelo, MUNDO, new Map([[a!, GUION_A]])).filter((x) => x.id === a || x.id === b);
    const porPersonaje = agrupar(filas, "personaje");
    expect(porPersonaje.find((g) => g.nombre === "Telmo")!.segundos).toBeGreaterThan(0);
    const porEpisodio = agrupar(filas, "episodio", (id) => `ep ${id}`);
    const g = porEpisodio[0]!;
    expect(g.filas.length).toBe(filas.length);
    expect(g.sinGuion).toBe(filas.length - 1);
    expect(g.personajes).toEqual(["Sabela", "Telmo"]);
  });
});

describe("desglose: tabla Markdown (RF-7)", () => {
  it("lleva las columnas pedidas y escapa el texto del autor", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    vaciar(s, [a!]);
    s.modelo.eventos.get(a!)!.titulo = "Barra | y \\ otra\nlínea";
    const filas = construirFilas(s.modelo, MUNDO, new Map([[a!, GUION_A]])).filter((x) => x.id === a);
    const t = aTablaMarkdown(filas, ["titulo", "locacion", "personajes", "guion"]);
    const lineas = t.texto.split("\n");
    expect(lineas[0]).toBe("| Título | Locación | Personajes | Guion |");
    expect(lineas[1]).toBe("| --- | --- | --- | --- |");
    expect(lineas[2]).toBe("| Barra \\| y \\\\ otra línea | Casa de Telmo | Telmo, Sabela | sí |");
    expect(t.recortada).toBe(false);
  });

  it("pasa del tope: recorta por filas y avisa", async () => {
    const s = await abrir();
    const [a] = escenas(s);
    const base = construirFilas(s.modelo, MUNDO, new Map([[a!, GUION_A]])).find((x) => x.id === a)!;
    const muchas = Array.from({ length: 3000 }, (_, i) => ({ ...base, titulo: `Escena ${i} ${"x".repeat(60)}` }));
    const t = aTablaMarkdown(muchas, ["titulo", "locacion", "personajes"]);
    expect(t.recortada).toBe(true);
    expect(t.texto.length).toBeLessThanOrEqual(TOPE_COPIA);
    expect(t.texto).toContain("Recortada");
    expect(t.filas).toBeLessThan(3000);
  });

  it("sin columnas no hay tabla", async () => {
    expect(aTablaMarkdown([], []).texto).toBe("");
  });
});
