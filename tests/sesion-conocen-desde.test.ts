import { afterEach, describe, expect, it } from "vitest";
import { juntar, type Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import { cambiarConocen, cambiarFecha, fechasDe } from "../src/lib/modelo/conocen-desde";
import { crearPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { editar } from "../src/lib/modelo/operaciones";
import type { Secreto } from "../src/lib/modelo/tipos";
import { variante } from "../src/lib/variantes/tipos";
import { abrir, RAIZ, serieBasica } from "./consecuencias/ayuda";

// «Lo sabe desde» en la sesión (spec 010, RF-27, RF-28, T4)

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

async function preparar(datos: Partial<Secreto> = {}) {
  const x = serieBasica();
  const sc = x.b.secreto({ titulo: "El acuerdo", conocen: ["[[Telmo]]", "[[Ana]]"], ...datos });
  const r = await abrir(x.b);
  abiertas.push(r.s);
  const secreto = (ses: { modelo: Sesion["modelo"] } = r.s) => ses.modelo.secretos.get(sc)!;
  const nota = async () => leerPieza(await r.fs.leer(`${RAIZ}/s/secretos/${sc}.md`), "secreto") as Secreto;
  const en = (ses: Sesion | SesionVariante, fn: (s: Secreto) => void) => ses.aplicar(editar(ses.modelo, sc, (p) => fn(p as Secreto)));
  return { ...x, ...r, sc, secreto, nota, en };
}

describe("Lo sabe desde en la sesión (spec 010, T4)", () => {
  it("un paso de Ctrl Z al quitar personaje y fecha", async () => {
    const { s, e1, secreto, nota, en } = await preparar();
    await en(s, (p) => cambiarFecha(p, "[[Telmo]]", e1));
    await en(s, (p) => cambiarConocen(p, ["[[Ana]]"]));
    expect(secreto().conocen).toEqual(["[[Ana]]"]);
    expect(secreto().extra.conocen_desde).toBeUndefined();
    await s.guardado.vaciar();
    expect(Object.hasOwn((await nota()).extra, "conocen_desde")).toBe(false);
    await s.deshacer();
    expect(secreto().conocen).toEqual(["[[Telmo]]", "[[Ana]]"]);
    expect(fechasDe(secreto()).get("telmo")).toEqual({ episodio: e1 });
    await s.guardado.vaciar();
    expect(fechasDe(await nota()).get("telmo")).toEqual({ episodio: e1 });
  });

  it("canon bloqueado no cambia la fecha", async () => {
    const { s, e1, secreto, en } = await preparar({ madurez: "canon" });
    const r = await en(s, (p) => cambiarFecha(p, "[[Telmo]]", e1));
    expect(r).toBe(false);
    expect(fechasDe(secreto()).size).toBe(0);
  });

  it("en la variante no escribe en la serie", async () => {
    const { s, e1, secreto, nota, en } = await preparar();
    const v = await SesionVariante.abrirSobre(s, variante("va-prue", "Prueba", ""));
    abiertas.push(v);
    await en(v, (p) => cambiarFecha(p, "[[Telmo]]", e1));
    expect(fechasDe(secreto(v)).get("telmo")).toEqual({ episodio: e1 });
    await s.guardado.vaciar();
    expect(fechasDe(secreto()).size).toBe(0);
    expect(fechasDe(await nota()).size).toBe(0);
  });

  it("una fecha cambiada en la app no pisa otro campo desconocido cambiado fuera", () => {
    const base = crearPieza("secreto", { id: "sc-1", conocen: ["[[Telmo]]"], extra: { mio: "antes", otro: 1 } });
    const mio = structuredClone(base);
    cambiarFecha(mio, "[[Telmo]]", "ep-1");
    // Mientras tanto, fuera cambian «mio» y quitan «otro»
    const ahora = { ...structuredClone(base), extra: { mio: "fuera" } };
    const r = juntar(base, mio, ahora) as Secreto;
    expect(r.extra).toEqual({ mio: "fuera", conocen_desde: [{ personaje: "[[Telmo]]", episodio: "ep-1" }] });
    // Y quitar la fecha en la app no se lleva lo de fuera
    const sinFecha = structuredClone(r);
    cambiarFecha(sinFecha, "[[Telmo]]", "");
    const r2 = juntar(r, sinFecha, { ...structuredClone(r), extra: { ...r.extra, nuevo: true } }) as Secreto;
    expect(r2.extra).toEqual({ mio: "fuera", nuevo: true });
  });
});
