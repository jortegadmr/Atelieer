import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { Sesion } from "../src/lib/app/sesion";
import { planteamiento, type EntradaSala } from "../src/lib/sala/planteamiento";
import { NO_ESTA_LENTE, reunirSala } from "../src/lib/sala/reunir";
import { personajesDeSerie } from "../src/lib/vistas/lente";
import { claveLimpia } from "../src/lib/wiki/md";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// Spec 012, T13d: el personaje que enfoca la lente (RF-24, RF-28).

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const CTX = { pizarra: null, conVariante: false };
const TELMO = { tipo: "personaje" as const, clave: claveLimpia("Telmo"), nombre: "Telmo" };

async function abrir(conFicha: boolean) {
  const fs = await vaultDePrueba();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  if (conFicha && !s.wiki.de("personaje").some((f) => claveLimpia(f.nombre) === TELMO.clave)) {
    await s.crearFicha("personaje", "Telmo");
  }
  return { fs, s };
}

const entrada = (r: EntradaSala | { error: string }): EntradaSala => {
  if ("error" in r) throw new Error(r.error);
  return r;
};

describe("reunirSala: personaje de la lente", () => {
  it("lleva el nombre, las escenas en las que aparece y los secretos que conoce", async () => {
    const { s } = await abrir(false);
    const r = entrada(await reunirSala(s, TELMO, CTX));
    const t = planteamiento(r).texto;
    expect(r.tipo).toBe("Personaje");
    expect(t.split("\n")[0]).toBe("# Planteamiento para la sala: Telmo");
    expect(t).toContain("## Con qué se relaciona");
    expect(t).toMatch(/^- Aparece en: /m);
    expect(t).toMatch(/^- Arco: /m);
    expect(t.trimEnd().endsWith("Quiero decidir:")).toBe(true);
  });

  it("sin ficha en la wiki solo lleva el nombre y la relación, sin sección de ficha", async () => {
    const { s } = await abrir(false);
    const conFicha = new Set(s.wiki.de("personaje").map((f) => claveLimpia(f.nombre)));
    const [clave, p] = [...personajesDeSerie(s.modelo, s.wiki)].find(([k]) => !conFicha.has(k))!;
    const r = entrada(await reunirSala(s, { tipo: "personaje", clave, nombre: p.nombre }, CTX));
    expect(r.titulo).toBe(p.nombre);
    expect(r.secciones.some((x) => x.clave === "ficha")).toBe(false);
    expect(r.secciones.some((x) => x.clave === "causas")).toBe(true);
  });

  it("con ficha lleva su texto sin las propiedades de arriba", async () => {
    const { s } = await abrir(true);
    const r = entrada(await reunirSala(s, TELMO, CTX));
    const ficha = r.secciones.find((x) => x.clave === "ficha");
    expect(ficha && "lineas" in ficha).toBe(true);
    expect(planteamiento(r).texto).not.toMatch(/^estado_canon:/m);
  });

  it("si la ficha ya no se puede leer lo dice en su sección y sigue con el resto", async () => {
    const { fs, s } = await abrir(true);
    const f = s.wiki.de("personaje").find((x) => claveLimpia(x.nombre) === TELMO.clave)!;
    await fs.borrar(`${s.vault}/${f.ruta}`);
    const r = entrada(await reunirSala(s, TELMO, CTX));
    const ficha = r.secciones.find((x) => x.clave === "ficha");
    expect(ficha && "nolee" in ficha).toBe(true);
    expect(planteamiento(r).texto).toContain("## Con qué se relaciona");
  });

  it("un personaje que ya no está da un error y no reúne nada", async () => {
    const { s } = await abrir(false);
    const r = await reunirSala(s, { tipo: "personaje", clave: claveLimpia("Nadie"), nombre: "Nadie" }, CTX);
    expect(r).toEqual({ error: NO_ESTA_LENTE });
  });

  it("no escribe nada en el disco", async () => {
    const { fs, s } = await abrir(true);
    const foto = async () => JSON.stringify(await Promise.all(fs.rutas().map(async (r) => [r, await fs.leer(r)])));
    const antes = await foto();
    await reunirSala(s, TELMO, CTX);
    expect(await foto()).toBe(antes);
  });
});
