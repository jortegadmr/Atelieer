import { afterEach, describe, expect, it } from "vitest";
import { queHaceEsc } from "../src/lib/app/esc";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { borrarPieza } from "../src/lib/modelo/operaciones";
import { APPDATOS, vaultDePrueba } from "./fixtures/wiki";

// La lente en el estado de la app (spec 010, RF-3, RF-6 a RF-11b, T11)

let abiertos: EstadoApp[] = [];
afterEach(async () => {
  for (const e of abiertos) await e.cerrar();
  abiertos = [];
});

async function abrir() {
  const fs = await vaultDePrueba();
  const e = new EstadoApp(fs, async () => "PC");
  abiertos.push(e);
  await e.ponerRaiz(APPDATOS);
  await e.abrir("_prueba");
  return { e, fs };
}

describe("estado de la lente (spec 010, T11)", () => {
  it("la lente no escribe nada en disco", async () => {
    const { e, fs } = await abrir();
    const arco = [...e.sesion!.modelo.arcos.keys()][0];
    const escrituras: string[] = [];
    for (const k of ["escribir", "escribirBytes", "renombrar", "borrar", "crearDir"] as const) {
      const original = fs[k].bind(fs) as (...a: unknown[]) => Promise<void>;
      (fs as unknown as Record<string, unknown>)[k] = (...a: unknown[]) => {
        escrituras.push(`${k} ${a[0]}`);
        return original(...a);
      };
    }
    e.ponerLente({ tipo: "arco", id: arco });
    expect(e.relacionLente?.arcos.has(arco)).toBe(true);
    e.revisarLente();
    e.quitarLente();
    await new Promise((r) => setTimeout(r, 50));
    expect(escrituras).toEqual([]);
  });

  it("queHaceEsc: capa, campo, arrastre, lente y subir, en ese orden", () => {
    const todo = { capas: true, campo: true, arrastrando: true, lente: true };
    expect(queHaceEsc(todo)).toBe("capa");
    expect(queHaceEsc({ ...todo, capas: false })).toBe("campo");
    expect(queHaceEsc({ ...todo, capas: false, campo: false })).toBe("nada");
    expect(queHaceEsc({ capas: false, campo: false, arrastrando: false, lente: true })).toBe("lente");
    expect(queHaceEsc({ capas: false, campo: false, arrastrando: false, lente: false })).toBe("subir");
  });

  it("leer la wiki a medias no quita la lente; leída, sí y dice por qué", async () => {
    const { e } = await abrir();
    e.ponerLente({ tipo: "personaje", clave: "nadie de nada", nombre: "Nadie" });
    const lectura = e.sesion!.wiki.lectura;
    e.sesion!.wiki.lectura = 0;
    e.revisarLente();
    expect(e.lente).not.toBeNull();
    e.sesion!.wiki.lectura = lectura;
    e.revisarLente();
    expect(e.lente).toBeNull();
    expect(e.avisoLente).toBe("Se quitó la lente: Nadie ya no está en la serie");
  });

  it("borrar el arco enfocado quita la lente con su nombre", async () => {
    const { e } = await abrir();
    // Un arco sin tramos y sin escenas canon (si no, borrarlo pediría desbloquear antes)
    const a = e.sesion!.modelo.arcos.get("ar-voce")!;
    e.ponerLente({ tipo: "arco", id: a.id });
    await e.sesion!.aplicar(borrarPieza(e.sesion!.modelo, a.id));
    await Promise.resolve();
    expect(e.lente).toBeNull();
    expect(e.avisoLente).toBe(`Se quitó la lente: ${a.titulo} ya no está en la serie`);
  });

  it("se mantiene al cambiar de vista y de nivel; cerrar la serie la quita", async () => {
    const { e } = await abrir();
    const arco = [...e.sesion!.modelo.arcos.keys()][0];
    e.ponerLente({ tipo: "arco", id: arco });
    e.cambiarVista("tramas");
    e.irANivel({ tipo: "temporada", temporada: "te-t001" });
    expect(e.lente).toEqual({ tipo: "arco", id: arco });
    await e.cerrar();
    expect(e.lente).toBeNull();
  });
});
