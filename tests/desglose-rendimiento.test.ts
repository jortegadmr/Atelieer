import { describe, expect, it } from "vitest";
import { analizarGuion } from "../src/lib/desglose/analisis";
import { crearResolutor, delGuion, type FuenteFichas } from "../src/lib/desglose/desglose";
import type { Ficha, TipoFicha } from "../src/lib/wiki/fichas";

// Spec 014, RNF-2: analizar 1500 escenas de unas dos páginas, sin leer disco, en menos de 500 ms.

const ficha = (tipo: TipoFicha, nombre: string): Ficha => ({ nombre, tipo, aliases: [], ruta: `${nombre}.md` }) as unknown as Ficha;

const fichas: Ficha[] = [
  ...["Telmo", "Sabela", "Vera", "Rufino", "Olalla"].map((n) => ficha("personaje", n)),
  ...Array.from({ length: 40 }, (_, i) => ficha("lugar", `Lugar ${i}`)),
];
const wiki: FuenteFichas = { de: (tipo) => fichas.filter((f) => f.tipo === tipo) };

function escena(n: number): string {
  const trozos = [`INT. LUGAR ${n % 40} - NOCHE`, ""];
  for (let i = 0; i < 12; i++) {
    trozos.push(`Telmo cruza la sala despacio y mira a Sabela, número ${i}, sin decir nada.`, "", i % 2 ? "TELMO" : "SABELA", "No pienso volver a pedirlo.", "");
  }
  trozos.push("CORTE A:");
  return trozos.join("\n");
}

describe("rendimiento del desglose (spec 014, RNF-2)", () => {
  it("analiza y resuelve 1500 escenas en menos de 500 ms", () => {
    const textos = Array.from({ length: 1500 }, (_, i) => escena(i + 1));
    const res = crearResolutor(wiki);
    const t0 = performance.now();
    let personajes = 0;
    for (const t of textos) personajes += delGuion(analizarGuion(t), res).personajes.length;
    const ms = performance.now() - t0;
    expect(personajes).toBeGreaterThan(0);
    expect(ms).toBeLessThan(500);
  });
});
