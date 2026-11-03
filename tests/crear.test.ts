import { describe, expect, it } from "vitest";
import * as c from "../src/lib/modelo/consultas";
import { estadoDe } from "../src/lib/modelo/estados";
import type { Modelo } from "../src/lib/modelo/modelo";
import type { Arco, Episodio, Evento, Pieza, Secreto, Temporada } from "../src/lib/modelo/tipos";
import { crearIdea, crearPieza, destinoIdea, limpiarIdea, opcionesNuevo, type QueCrear } from "../src/lib/vistas/crear";
import { Constructor } from "./fixtures/constructor";
import type { Nivel } from "../src/lib/vistas/visor";
import { modeloDePrueba } from "./fixtures/modelo-prueba";

// Spec 002: la barra «Nuevo…» y la ventana «Nueva pieza».

const T1 = "te-t001";
const E1 = "ep-a101";
const SERIE: Nivel = { tipo: "serie" };
const enT1: Nivel = { tipo: "temporada", temporada: T1 };
const enE1: Nivel = { tipo: "episodio", temporada: T1, episodio: E1 };
const nada = () => false;
const BLOQUEO = "Es canon: desbloquéala para añadir";

function aplicar(m: Modelo, cambio: { guardar: Pieza[]; borrar: Pieza[] }) {
  for (const p of cambio.guardar) m.poner(p);
}

describe("opciones de «Nuevo…» por nivel (RF-26)", () => {
  it("serie: temporada, trama, secreto e idea", () => {
    expect(opcionesNuevo(modeloDePrueba(), SERIE, nada).map((o) => o.nombre)).toEqual(["Temporada", "Trama", "Secreto", "Idea"]);
  });

  it("temporada: episodio, trama de temporada, secreto e idea", () => {
    expect(opcionesNuevo(modeloDePrueba(), enT1, nada).map((o) => o.nombre)).toEqual(["Episodio", "Trama de temporada", "Secreto", "Idea"]);
  });

  it("episodio: evento e idea", () => {
    expect(opcionesNuevo(modeloDePrueba(), enE1, nada).map((o) => o.que)).toEqual(["evento", "idea"]);
  });
});

describe("canon bloqueado (RF-33, RF-34)", () => {
  it("episodio en una temporada canon bloqueada: bloqueado, con su texto; lo demás no", () => {
    const ops = opcionesNuevo(modeloDePrueba(), enT1, (id) => id === T1);
    expect(ops.find((o) => o.que === "episodio")?.bloqueo).toBe(BLOQUEO);
    expect(ops.filter((o) => o.bloqueo).map((o) => o.que)).toEqual(["episodio"]);
  });

  it("evento en un episodio canon bloqueado: bloqueado; la idea no", () => {
    const ops = opcionesNuevo(modeloDePrueba(), enE1, (id) => id === E1);
    expect(ops.map((o) => [o.que, o.bloqueo ?? ""])).toEqual([
      ["evento", BLOQUEO],
      ["idea", ""],
    ]);
  });

  it("desbloqueada: activa", () => {
    expect(opcionesNuevo(modeloDePrueba(), enT1, nada).every((o) => !o.bloqueo)).toBe(true);
  });
});

describe("crear cada pieza en su sitio, en estado idea (RF-29 a RF-32, RF-47)", () => {
  const crear = (n: Nivel, que: Exclude<QueCrear, "idea">, datos = {}) => {
    const m = modeloDePrueba();
    const r = crearPieza(m, n, que, datos);
    aplicar(m, r.cambio);
    return { m, pieza: m.pieza(r.pieza.id)! };
  };

  it("temporada: al final de la serie", () => {
    const { m, pieza } = crear(SERIE, "temporada", { titulo: "Pagar" });
    expect(c.temporadasEnOrden(m).at(-1)?.id).toBe(pieza.id);
    expect(estadoDe(pieza as Temporada)).toBe("idea");
    expect((pieza as Temporada).titulo).toBe("Pagar");
  });

  it("episodio: al final de su temporada", () => {
    const { m, pieza } = crear(enT1, "episodio");
    expect(c.episodiosDeTemporada(m, T1).at(-1)?.id).toBe(pieza.id);
    expect(estadoDe(pieza as Episodio)).toBe("idea");
  });

  it("evento: al final de su episodio", () => {
    const { m, pieza } = crear(enE1, "evento", { titulo: "Llegada" });
    const fila = c.eventosDeEpisodio(m, E1);
    expect(fila.at(-1)?.id).toBe(pieza.id);
    expect((pieza as Evento).temporada).toBe(T1);
    expect(estadoDe(pieza as Evento)).toBe("idea");
  });

  it("trama de serie con el tipo elegido; trama por defecto (RF-29)", () => {
    const a = crear(SERIE, "trama").pieza as Arco;
    expect([a.nivel, a.tipo_arco, estadoDe(a)]).toEqual(["serie", "trama", "idea"]);
    expect((crear(SERIE, "trama", { tipoArco: "relacion" }).pieza as Arco).tipo_arco).toBe("relacion");
  });

  it("trama de temporada nueva, en la temporada actual (RF-30)", () => {
    const a = crear(enT1, "trama-temporada", { titulo: "Nando" }).pieza as Arco;
    expect([a.nivel, a.temporada, a.titulo, a.tramo_de, estadoDe(a)]).toEqual(["temporada", T1, "Nando", "", "idea"]);
  });

  it("tramo en la temporada actual de una trama de serie (RF-30)", () => {
    const a = crear(enT1, "trama-temporada", { tramoDe: "ar-ecos" }).pieza as Arco;
    expect([a.nivel, a.temporada, a.tramo_de, estadoDe(a)]).toEqual(["temporada", T1, "ar-ecos", "idea"]);
    expect(a.titulo).toMatch(/en T01$/);
    expect((crear(enT1, "trama-temporada", { tramoDe: "ar-ecos", titulo: "Otro" }).pieza as Arco).titulo).toBe("Otro");
  });

  it("secreto: un secreto de la serie, también desde una temporada", () => {
    const s = crear(enT1, "secreto").pieza as Secreto;
    expect(s.tipo).toBe("secreto");
    expect(estadoDe(s)).toBe("idea");
  });

  it("sin título también se crea (constitución 3)", () => {
    for (const [n, que] of [
      [SERIE, "temporada"],
      [SERIE, "trama"],
      [enT1, "episodio"],
      [enE1, "evento"],
    ] as const) {
      expect(crear(n, que).pieza).toBeTruthy();
    }
  });

  it("el título se guarda sin espacios a los lados", () => {
    expect((crear(SERIE, "temporada", { titulo: "  Pagar  " }).pieza as Temporada).titulo).toBe("Pagar");
  });
});

describe("limpiar el texto de una idea (RF-41, RF-44 a RF-46)", () => {
  it("vacío o solo espacios: nada", () => {
    expect(limpiarIdea("")).toBeNull();
    expect(limpiarIdea("   \n\t ")).toBeNull();
  });

  it("tal cual, también con dos puntos, comillas, ---, # o [[...]]", () => {
    const t = 'Telmo: "no es mío" --- # duda [[Acuerdo]]';
    expect(limpiarIdea(t)).toEqual({ titulo: t, recortada: false });
  });

  it("saltos de línea y caracteres de control se cambian por espacios", () => {
    expect(limpiarIdea("uno\ndos\r\ntres\tcuatro\u0007cinco seis")?.titulo).toBe("uno dos  tres cuatro cinco seis");
  });

  it("más de 300 caracteres: los 300 primeros, y lo dice", () => {
    const r = limpiarIdea("a".repeat(310));
    expect(r).toEqual({ titulo: "a".repeat(300), recortada: true });
    expect(limpiarIdea("a".repeat(300))?.recortada).toBe(false);
  });

  it("no parte un emoji compuesto ni una letra con acento combinado", () => {
    const familia = "👨‍👩‍👧";
    const r = limpiarIdea("a".repeat(299) + familia + "bbb");
    expect(r?.titulo).toBe("a".repeat(299) + familia);
    const acento = "é";
    expect(limpiarIdea("a".repeat(299) + acento + "x")?.titulo).toBe("a".repeat(299) + acento);
  });
});

describe("dónde va la idea (RF-39, RF-40)", () => {
  it("mirando un episodio que no es canon bloqueado: al final de ese episodio", () => {
    const m = modeloDePrueba();
    expect(destinoIdea(m, enE1, nada)).toEqual({ temporada: T1, episodio: E1, donde: "Idea al final de T01E01" });
  });

  it("mirando un episodio canon bloqueado: en la bandeja de su temporada", () => {
    expect(destinoIdea(modeloDePrueba(), enE1, (id) => id === E1)).toEqual({ temporada: T1, episodio: "", donde: "Idea en la bandeja de T01" });
  });

  it("mirando una temporada, canon o no: en su bandeja", () => {
    expect(destinoIdea(modeloDePrueba(), enT1, (id) => id === T1)).toEqual({ temporada: T1, episodio: "", donde: "Idea en la bandeja de T01" });
  });

  it("mirando la serie: la bandeja de la primera temporada en marcha", () => {
    // En la serie de prueba están en marcha T01 y T02: va a la primera
    expect(destinoIdea(modeloDePrueba(), SERIE, nada)).toMatchObject({ temporada: T1, episodio: "" });
  });

  it("mirando la serie sin ninguna en marcha: la bandeja de la última", () => {
    const m = modeloDePrueba();
    for (const t of m.temporadas.values()) m.poner({ ...t, estado: "cerrada" });
    expect(destinoIdea(m, SERIE, nada)).toMatchObject({ temporada: "te-t003", episodio: "", donde: "Idea en la bandeja de T03" });
  });

  it("sin temporadas: «Crea primero una temporada»", () => {
    expect(destinoIdea(new Constructor().modelo(), SERIE, nada)).toEqual({ error: "Crea primero una temporada" });
  });

  it("si la pieza del nivel ya no existe, va donde diga el nivel válido", () => {
    const m = modeloDePrueba();
    m.quitar(E1);
    expect(destinoIdea(m, enE1, nada)).toMatchObject({ temporada: T1, episodio: "" });
  });
});

describe("crear la idea (RF-38)", () => {
  it("un evento en estado idea, con el texto como título, al final de su sitio", () => {
    const m = modeloDePrueba();
    const r = crearIdea(m, enE1, "  Telmo duda  ", nada);
    if (!r || "error" in r) throw new Error("no se creó");
    aplicar(m, r.cambio);
    const ev = m.eventos.get(r.pieza.id)!;
    expect([ev.titulo, ev.madurez, ev.madurez_mesa, ev.temporada, ev.episodio]).toEqual(["Telmo duda", "idea", "", T1, E1]);
    expect(c.eventosDeEpisodio(m, E1).at(-1)?.id).toBe(ev.id);
    expect(r.recortada).toBe(false);
  });

  it("vacío: nada; sin temporadas: el error", () => {
    expect(crearIdea(modeloDePrueba(), SERIE, "  ", nada)).toBeNull();
    expect(crearIdea(new Constructor().modelo(), SERIE, "x", nada)).toEqual({ error: "Crea primero una temporada" });
  });
});
