import { afterEach, describe, expect, it } from "vitest";
import type { Sesion } from "../../src/lib/app/sesion";
import { SesionVariante } from "../../src/lib/app/sesion-variante";
import { camposCambiados } from "../../src/lib/consecuencias/campos-vistos";
import { copiaModelo } from "../../src/lib/consecuencias/copia";
import { ponerFecha } from "../../src/lib/modelo/conocen-desde";
import { codigo } from "../../src/lib/modelo/consultas";
import type { Modelo } from "../../src/lib/modelo/modelo";
import { editar } from "../../src/lib/modelo/operaciones";
import type { Pieza, Secreto } from "../../src/lib/modelo/tipos";
import { ladoALado } from "../../src/lib/variantes/lado-a-lado";
import { modeloQuedaria } from "../../src/lib/variantes/quedaria";
import { variante } from "../../src/lib/variantes/tipos";
import { abrir, serieBasica } from "./ayuda";

// «Lo sabe desde» se ve como un campo por personaje (spec 010, RF-27, T3)

/** Pone la fecha a `personaje` en la pieza (como hará la sesión) */
function fecha(s: Secreto, personaje: string, episodio: string) {
  const v = ponerFecha(s, personaje, episodio);
  if (v === undefined) delete s.extra.conocen_desde;
  else s.extra.conocen_desde = v;
}

function conSecreto() {
  const x = serieBasica();
  const sc = x.b.secreto({ titulo: "El acuerdo", conocen: ["[[Telmo]]", "[[Ana]]"] });
  return { ...x, sc };
}

function cambiar(m: Modelo, id: string, fn: (s: Secreto) => void) {
  const p = structuredClone(m.pieza(id)) as Secreto;
  fn(p);
  m.poner(p);
}

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

describe("Lo sabe desde en lo que se ve (spec 010, T3)", () => {
  it("Si lo dejas así dice Lo sabe desde (Telmo): E3 → E5", () => {
    const x = conSecreto();
    const m = x.b.modelo();
    cambiar(m, x.sc, (s) => fecha(s, "[[Telmo]]", x.e1));
    const base = copiaModelo(m);
    cambiar(m, x.sc, (s) => fecha(s, "[[Telmo]]", x.e2));
    expect(camposCambiados(base.pieza(x.sc)!, m.pieza(x.sc)!, base, m)).toEqual([`Lo sabe desde (Telmo): ${codigo(m, x.e1)} → ${codigo(m, x.e2)}`]);
    cambiar(m, x.sc, (s) => fecha(s, "[[Telmo]]", ""));
    expect(camposCambiados(base.pieza(x.sc)!, m.pieza(x.sc)!, base, m)).toEqual([`Lo sabe desde (Telmo): ${codigo(m, x.e1)} → Sin fecha`]);
    // Quitar a Telmo: cambia Lo conocen y su fecha
    cambiar(m, x.sc, (s) => (s.conocen = ["[[Ana]]"]));
    expect(camposCambiados(base.pieza(x.sc)!, m.pieza(x.sc)!, base, m)).toEqual([
      "Lo conocen: 2 → 1 · quitada «Telmo»",
      `Lo sabe desde (Telmo): ${codigo(m, x.e1)} → Sin fecha`,
    ]);
  });

  async function preparar() {
    const x = conSecreto();
    const r = await abrir(x.b);
    abiertas.push(r.s);
    const v = await SesionVariante.abrirSobre(r.s, variante("va-prue", "Prueba", ""));
    abiertas.push(v);
    const en = (ses: Sesion | SesionVariante, fn: (s: Secreto) => void) => ses.aplicar(editar(ses.modelo, x.sc, (p) => fn(p as Secreto)));
    return { ...x, ...r, v, en };
  }

  it("Telmo cambiado fuera y Ana en la variante: Telmo solo en la serie, no de los dos lados", async () => {
    const { s, v, sc, e1, e2, en } = await preparar();
    await en(v, (p) => fecha(p, "[[Ana]]", e2));
    await en(s, (p) => fecha(p, "[[Telmo]]", e1));
    const [c] = v.choques();
    expect(c).toMatchObject({ clase: "pieza", id: sc, soloSerie: ["Lo sabe desde (Telmo)"], dosLados: [] });
  });

  it("Telmo en los dos lados: de los dos lados", async () => {
    const { s, v, sc, e1, e2, en } = await preparar();
    await en(v, (p) => fecha(p, "[[Telmo]]", e2));
    await en(s, (p) => fecha(p, "[[Telmo]]", e1));
    const [c] = v.choques();
    expect(c).toMatchObject({ clase: "pieza", id: sc, soloSerie: [], dosLados: ["Lo sabe desde (Telmo)"] });
  });

  it("lado a lado tiene una fila por personaje", () => {
    const x = conSecreto();
    const m = x.b.modelo();
    const q = modeloQuedaria(m, variante("va-aaaa", "x", ""));
    const p = structuredClone(q.secretos.get(x.sc)!) as Secreto;
    fecha(p, "[[Ana]]", x.e2);
    p.conocen = [...p.conocen, "[[Lia]]"];
    q.poner(p as Pieza);
    const l = ladoALado(x.sc, m, q, [], []);
    const filas = l.filas.filter((f) => f.etiqueta.startsWith("Lo sabe desde"));
    expect(filas.map((f) => f.etiqueta)).toEqual(["Lo sabe desde (Telmo)", "Lo sabe desde (Ana)", "Lo sabe desde (Lia)"]);
    expect(filas[1]).toMatchObject({ izquierda: "Sin fecha", derecha: codigo(q, x.e2), cambia: true });
    expect(filas[0].cambia).toBe(false);
  });
});
