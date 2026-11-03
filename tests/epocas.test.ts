import { describe, expect, it } from "vitest";
import { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { celdas, clave, claveLimpia, nombreLimpio } from "../src/lib/wiki/md";
import { Wiki } from "../src/lib/wiki/fichas";

const RUTAS = { raiz: "", personajes: "", lugares: "", eras: "W/Eras", timeline: "W/Timeline.md", narrativa: "", log: "" };

const timeline = (filas: string[]) => `---
tipo: timeline
---

# Timeline

## Eras

| Era | Desde | Hasta | Rasgo principal |
| --- | --- | --- | --- |
${filas.map((f) => `| ${f} | | | |`).join("\n")}

## Cronología
`;

const ficha = (aliases: string[] = []) => `---
tipo: era
aliases: [${aliases.map((a) => `"${a}"`).join(", ")}]
---

# Era
`;

async function wiki(filas: string[] | null, fichas: Record<string, string[]> = {}) {
  const fs = new FsMemoria();
  if (filas) await fs.escribir("/V/W/Timeline.md", timeline(filas));
  for (const [ruta, aliases] of Object.entries(fichas)) await fs.escribir(`/V/W/Eras/${ruta}`, ficha(aliases));
  const w = new Wiki(fs, "/V", RUTAS);
  await w.cargar();
  return w;
}

describe("nombres limpios de la wiki (spec 009)", () => {
  it("[[La Inundación]], negritas y \\| dan el nombre limpio", () => {
    expect(nombreLimpio("[[La Inundación]]")).toBe("La Inundación");
    expect(nombreLimpio("[[La Inundación|la inundación]]")).toBe("La Inundación");
    expect(nombreLimpio("**La  Inundación**")).toBe("La Inundación");
    expect(nombreLimpio(" _[[La Inundación]]_ ")).toBe("La Inundación");
    expect(nombreLimpio("Edad de **hierro**")).toBe("Edad de **hierro**");
    expect(celdas("| [[La Inundación\\|inundación]] | hace cien años |")).toEqual(["[[La Inundación|inundación]]", "hace cien años"]);
    expect(nombreLimpio(celdas("| [[La Inundación\\|inundación]] | x |")[0])).toBe("La Inundación");
    expect(claveLimpia("**[[La Inundación|x]]**")).toBe("la inundacion");
    expect(nombreLimpio("a|b")).toBe("a|b");
    // La clave de siempre no cambia: _Notas y Notas siguen siendo distintas (pasar.ts)
    expect(clave("_Notas")).not.toBe(clave("Notas"));
    expect(clave("a  b")).not.toBe(clave("a b"));
  });
});

describe("épocas de la wiki en orden (spec 009, RF-4 y RF-5)", () => {
  it("orden de las filas y Presente en su fila", async () => {
    const w = await wiki(["C1", "**[[La Inundación]]**", "Presente", "Después"]);
    expect(w.epocas().map((e) => [e.nombre, e.presente])).toEqual([
      ["C1", false],
      ["La Inundación", false],
      ["Presente", true],
      ["Después", false],
    ]);
    expect(w.epocas()[1].ruta).toBe("W/Timeline.md");
    expect(w.rutaTimeline).toBe("W/Timeline.md");
  });

  it("fichas sin fila detrás, por nombre", async () => {
    const w = await wiki(["C1"], { "Zeta.md": [], "Ánfora.md": [], "C1.md": [] });
    expect(w.epocas().map((e) => e.nombre)).toEqual(["C1", "Ánfora", "Zeta"]);
    expect(w.epocas()[0].ruta).toBe("W/Eras/C1.md");
  });

  it("alias y subcarpetas se juntan", async () => {
    const w = await wiki(["la inundacion", "C1"], { "La Inundación.md": ["El Desbordamiento"], "Viejas/La Inundación.md": [], "Edad.md": ["c1"] });
    const e = w.epocas();
    expect(e.map((x) => x.nombre)).toEqual(["La Inundación", "Edad"]);
    expect([...e[0].claves].sort()).toEqual(["el desbordamiento", "la inundacion"]);
    expect(e[1].claves.has("c1")).toBe(true);
  });

  it("Presente sin fila no es época", async () => {
    const w = await wiki(["C1"], { "Presente.md": ["Hoy"] });
    expect(w.epocas().map((e) => e.nombre)).toEqual(["C1"]);
    expect(w.esPresente("hoy")).toBe(true);
    expect(w.esPresente("")).toBe(true);
    expect(w.esPresente("[[Presente]]")).toBe(true);
    expect(w.esPresente("C1")).toBe(false);
  });

  it("sin Timeline ni fichas, ninguna época; lectura sube en cada carga", async () => {
    const w = await wiki(null);
    expect(w.epocas()).toEqual([]);
    expect(w.rutaTimeline).toBeNull();
    const antes = w.lectura;
    await w.cargar();
    expect(w.lectura).not.toBe(antes);
    const otra = await wiki(null);
    expect(otra.lectura).not.toBe(w.lectura);
  });
});
