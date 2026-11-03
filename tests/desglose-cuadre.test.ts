import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { cambioAnadir, comoEnCampo, cuadrarEscena, nombreBonito } from "../src/lib/desglose/cuadre";
import { crearResolutor, type FuenteFichas } from "../src/lib/desglose/desglose";
import { esIdEscena } from "../src/lib/guion/tipos";
import type { Ficha, TipoFicha } from "../src/lib/wiki/fichas";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 014, T4: cuadre guion–escena y «Añadir a la escena» (RF-16 a RF-19).

let abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas) await s.cerrar();
  abiertas = [];
});

async function abrir() {
  const s = await Sesion.abrir(new Almacen(await vaultDePrueba(), APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  const idx = s.modelo.indice();
  const id = idx.episodios.flatMap((e) => idx.porEpisodio.get(e) ?? []).find((ev) => esIdEscena(ev.id) && ev.madurez !== "canon")!.id;
  const ev = s.modelo.eventos.get(id)!;
  ev.personajes = [];
  ev.lugares = [];
  return { s, id, ev };
}

const ficha = (tipo: TipoFicha, nombre: string, aliases: string[] = []): Ficha => ({ nombre, tipo, ruta: `01_Wiki/${nombre}.md`, aliases, resumen: "", detalle: "", motor: { quiere: "", necesita: "", herida: "", mentira: "" } });
const mundo: FuenteFichas = (() => {
  const f = [ficha("lugar", "Casa de Telmo"), ficha("lugar", "Lonja Vieja"), ficha("personaje", "Telmo", ["El técnico"]), ficha("personaje", "Sabela"), ficha("personaje", "Vera")];
  return { de: (tipo) => f.filter((x) => x.tipo === tipo) };
})();
const res = crearResolutor(mundo);

const GUION = ["INT. CASA DE TELMO - NOCHE", "", "[[Telmo]] entra. [[Sabela]] espera.", "", "TELMO", "Ya está."].join("\n");

describe("cuadre guion–escena (RF-16, RF-18)", () => {
  it("una escena sin guion no se cuadra", async () => {
    const { ev } = await abrir();
    expect(cuadrarEscena(ev, null, res)).toBeNull();
    expect(cuadrarEscena(ev, "  \n ", res)).toBeNull();
  });

  it("lo que dice el guion y la escena no tiene sale para añadir", async () => {
    const { ev } = await abrir();
    const c = cuadrarEscena(ev, GUION, res)!;
    expect(c.enGuionNoEscena.personajes.map((x) => x.nombre).sort()).toEqual(["Sabela", "Telmo"]);
    expect(c.enGuionNoEscena.lugares.map((x) => x.nombre)).toEqual(["Casa de Telmo"]);
    expect(c.enEscenaNoGuion).toEqual({ personajes: [], lugares: [] });
    expect(c.cuadra).toBe(false);
  });

  it("lo que la escena tiene y el guion no dice solo se informa; un alias o un nombre sin corchetes en la acción cuenta como dicho", async () => {
    const { ev } = await abrir();
    ev.personajes = ["[[Vera]]", "[[Sabela]]", "[[El técnico]]"];
    ev.lugares = ["[[Lonja Vieja]]"];
    const c = cuadrarEscena(ev, "INT. CASA DE TELMO - NOCHE\n\nTelmo mira a SABELA sin hablar.\n\nTELMO\nHola.", res)!;
    // Telmo (por alias «El técnico») habla; Sabela se nombra sin corchetes: las dos cuentan como dichas
    expect(c.enEscenaNoGuion.personajes.map((x) => x.nombre)).toEqual(["Vera"]);
    expect(c.enEscenaNoGuion.lugares.map((x) => x.nombre)).toEqual(["Lonja Vieja"]);
  });

  it("cuando todo cuadra, lo dice", async () => {
    const { ev } = await abrir();
    ev.personajes = ["[[Telmo]]", "[[Sabela]]"];
    ev.lugares = ["[[Casa de Telmo]]"];
    expect(cuadrarEscena(ev, GUION, res)!.cuadra).toBe(true);
  });

  it("un nombre sin ficha y en mayúsculas se propone con buen aspecto", async () => {
    const { ev } = await abrir();
    const c = cuadrarEscena(ev, "EXT. PUERTO VIEJO DEL NORTE - DÍA\n\nDON RAMÓN\nBuenas.", res)!;
    expect(c.enGuionNoEscena.lugares[0]).toMatchObject({ nombre: "Puerto Viejo del Norte", ficha: false });
    expect(c.enGuionNoEscena.personajes[0]).toMatchObject({ nombre: "Don Ramón", ficha: false });
  });

  it("nombreBonito deja en paz lo que ya tiene minúsculas", () => {
    expect(nombreBonito("Casa de Telmo")).toBe("Casa de Telmo");
    expect(nombreBonito("CASA DE TELMO")).toBe("Casa de Telmo");
    expect(nombreBonito("123")).toBe("123");
  });

  it("calcular el cuadre no cambia la escena", async () => {
    const { ev } = await abrir();
    const antes = JSON.stringify(ev);
    cuadrarEscena(ev, GUION, res);
    expect(JSON.stringify(ev)).toBe(antes);
  });
});

describe("«Añadir a la escena» (RF-17)", () => {
  it("añade lo elegido sin quitar lo que había y en un solo paso del deshacer", async () => {
    const { s, id, ev } = await abrir();
    ev.personajes = ["[[Vera]]"];
    const c = cuadrarEscena(ev, GUION, res)!;
    const cambio = cambioAnadir(s.modelo, id, c.enGuionNoEscena)!;
    expect(cambio.guardar).toHaveLength(1);
    expect(await s.aplicar(cambio, true)).toBe(true);
    const ahora = s.modelo.eventos.get(id)!;
    expect(ahora.personajes).toEqual(["[[Vera]]", "[[Telmo]]", "[[Sabela]]"]);
    expect(ahora.lugares).toEqual(["[[Casa de Telmo]]"]);
    expect(cuadrarEscena(ahora, GUION, res)!.enGuionNoEscena).toEqual({ personajes: [], lugares: [] });
    // Un solo Ctrl Z lo devuelve todo
    await s.deshacer();
    const antes = s.modelo.eventos.get(id)!;
    expect(antes.personajes).toEqual(["[[Vera]]"]);
    expect(antes.lugares).toEqual([]);
  });

  it("uno por uno: añade solo el elegido; sin nada nuevo no hay cambio; no duplica", async () => {
    const { s, id, ev } = await abrir();
    const c = cuadrarEscena(ev, GUION, res)!;
    const telmo = c.enGuionNoEscena.personajes.find((x) => x.nombre === "Telmo")!;
    expect(cambioAnadir(s.modelo, id, { personajes: [] })).toBeNull();
    await s.aplicar(cambioAnadir(s.modelo, id, { personajes: [telmo] })!, true);
    expect(s.modelo.eventos.get(id)!.personajes).toEqual(["[[Telmo]]"]);
    expect(s.modelo.eventos.get(id)!.lugares).toEqual([]);
    expect(cambioAnadir(s.modelo, id, { personajes: [telmo] })).toBeNull();
  });

  it("una escena canon bloqueada no se cambia, y se puede desbloquear a propósito", async () => {
    const { s, id } = await abrir();
    const canon = s.modelo.eventos.get(id)!;
    canon.madurez = "canon";
    const c = cuadrarEscena({ id: canon.id, lugares: [], personajes: [] }, GUION, res)!;
    const cambio = cambioAnadir(s.modelo, canon.id, c.enGuionNoEscena)!;
    const antes = [...canon.personajes];
    expect(s.estaBloqueada(canon.id)).toBe(true);
    expect(await s.aplicar(cambio, true)).toBe(false);
    expect(s.modelo.eventos.get(canon.id)!.personajes).toEqual(antes);
    s.desbloquear(canon.id);
    expect(await s.aplicar(cambio, true)).toBe(true);
  });

  it("el valor que se escribe no puede romper el campo", () => {
    expect(comoEnCampo("A]]B|C\nD")).toBe("[[A  B C D]]".replace("A  B C D", "A B C D"));
    expect(comoEnCampo("  Telmo  ")).toBe("[[Telmo]]");
  });
});
