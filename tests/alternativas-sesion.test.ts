import { afterEach, describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import type { FsMemoria } from "../src/lib/almacen/fs-memoria";
import { Sesion } from "../src/lib/app/sesion";
import { SesionVariante } from "../src/lib/app/sesion-variante";
import { estadoDe } from "../src/lib/modelo/estados";
import type { Evento } from "../src/lib/modelo/tipos";
import { variante } from "../src/lib/variantes/tipos";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Spec 009, RF-45, RF-45b, RF-50 a RF-52: descartar y recuperar en la app
// apunta la alternativa en la ficha del arco.

const abiertas: Sesion[] = [];
afterEach(async () => {
  for (const s of abiertas.splice(0)) await s.cerrar();
});

const VEN = "ar-ecos";
const TOR = "ar-torm";
const HER = "ar-amis";
const TEL = "ar-telm";
const ESCENA = "ev-e005";
const FILA = "| Nando se niega a callar | No pegaba |";

const log = (fs: FsMemoria, s: Sesion) => fs.leer(`${VAULT}/${s.modelo.serie.wiki.log}`).catch(() => "");
const rutaDe = async (s: Sesion, id: string) => `${VAULT}/${(await s.leerFichaDe(id))!.ruta}`;
const ficha = async (fs: FsMemoria, s: Sesion, id: string) => fs.leer(await rutaDe(s, id));
const evento = (s: Sesion, id: string) => s.modelo.eventos.get(id)!;

/**
 * La serie de prueba con ficha para Amistad rota, Telmo y El eco (canon,
 * bloqueada otra vez al volver a abrir); «Nando se niega a callar» toca Amistad y Telmo
 */
async function preparar() {
  const fs = await vaultDePrueba();
  const antes = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  antes.desbloquear(VEN);
  for (const id of [HER, TEL, VEN]) expect((await antes.pasar(id, id === TEL ? "Telmo - callar o avisar" : undefined)).pieza).toBeTruthy();
  antes.editar<Evento>(ESCENA, (p) => p.arcos.push({ arco: TEL, papel: "avanza" }));
  await antes.cerrar();
  const s = await Sesion.abrir(new Almacen(fs, APPDATOS), "_prueba", "PC");
  abiertas.push(s);
  return { fs, s };
}

describe("alternativas descartadas al cambiar el estado (spec 009, RF-45, RF-50)", () => {
  it("descartar una escena de dos arcos escribe en las dos fichas y en el Log", async () => {
    const { fs, s } = await preparar();
    const antes = await log(fs, s);
    expect((await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" })).hecho).toBe(true);
    expect(await ficha(fs, s, HER)).toContain(FILA);
    expect(await ficha(fs, s, TEL)).toContain(FILA);
    const nuevo = (await log(fs, s)).slice(antes.length);
    expect(nuevo.match(/Alternativa descartada/g)?.length).toBe(2);
    expect(nuevo).toContain(FILA);
  });

  it("un acento grave en el título no abre el código del Log (revisión de seguridad)", async () => {
    const { codigoEnLinea } = await import("../src/lib/wiki/md");
    expect(codigoEnLinea("| a `b` [[C]] | |")).toBe("``| a `b` [[C]] | |``");
    expect(codigoEnLinea("`x`")).toBe("`` `x` ``");
    expect(codigoEnLinea("sin")).toBe("`sin`");
  });

  it("recuperar la quita", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, HER);
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    expect((await s.cambiarEstado(ESCENA, "borrador")).hecho).toBe(true);
    expect(await ficha(fs, s, HER)).toBe(antes);
    expect(await log(fs, s)).toContain("Alternativa recuperada");
  });

  it("si otra pieza descartada del arco da la misma fila, recuperar no la quita y lo dice", async () => {
    const { fs, s } = await preparar();
    s.editar<Evento>("ev-e009", (p) => (p.titulo = "Nando se niega a callar"));
    await s.cambiarEstado("ev-e009", "descartado", { motivo: "No pegaba" });
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    const r = await s.cambiarEstado(ESCENA, "borrador");
    expect(await ficha(fs, s, HER)).toContain(FILA);
    expect(r.avisos.join(" ")).toContain("se queda");
  });

  it("escena en un tramo va a la ficha del arco de serie; el tramo, también", async () => {
    const { fs, s } = await preparar();
    s.desbloquear(VEN);
    s.desbloquear(TOR);
    expect((await s.cambiarEstado("ev-e006", "descartado", { motivo: "Sobra" })).hecho).toBe(true);
    expect(await ficha(fs, s, VEN)).toContain("| Primera guardia | Sobra |");
    expect((await s.cambiarEstado(TOR, "descartado", { motivo: "Otra tormenta" })).hecho).toBe(true);
    expect(await ficha(fs, s, VEN)).toContain("| La tormenta | Otra tormenta |");
  });

  it("arco canon bloqueado no se toca", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, VEN);
    const r = await s.cambiarEstado("ev-e006", "descartado", { motivo: "Sobra" });
    expect(r.hecho).toBe(true);
    expect(await ficha(fs, s, VEN)).toBe(antes);
    expect(r.avisos).toContain("El arco «El eco» es canon: desbloquéalo para apuntar la alternativa.");
  });

  it("si la ficha cambió fuera, no escribe y la escena sí se descarta", async () => {
    const { fs, s } = await preparar();
    const ruta = await rutaDe(s, HER);
    // Obsidian la cambia justo después de que Atelier la lea
    const leer = fs.leer.bind(fs);
    let una = false;
    fs.leer = async (r: string) => {
      const t = await leer(r);
      if (r === ruta && !una) {
        una = true;
        await fs.escribir(r, `${t}\nDe Obsidian.\n`);
      }
      return t;
    };
    const r = await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    fs.leer = leer;
    expect(r.hecho).toBe(true);
    expect(estadoDe(evento(s, ESCENA))).toBe("descartado");
    const texto = await fs.leer(ruta);
    expect(texto).toContain("De Obsidian.");
    expect(texto).not.toContain(FILA);
    expect(r.avisos.join(" ")).toContain("Amistad rota");
    // La otra ficha sí
    expect(await ficha(fs, s, TEL)).toContain(FILA);
  });

  it("releer la wiki no escribe filas", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, HER);
    // La escena se descarta fuera de Atelier
    const nota = `${APPDATOS}/_prueba/eventos/${ESCENA}.md`;
    await fs.escribir(nota, (await fs.leer(nota)).replace(/madurez: borrador/, "madurez: descartado"));
    await s.releer([nota]);
    await s.leerWiki();
    await s.revisarFichas();
    expect(estadoDe(evento(s, ESCENA))).toBe("descartado");
    expect(await ficha(fs, s, HER)).toBe(antes);
  });
});

describe("alternativas descartadas al deshacer, rehacer y volver (spec 009, RF-49)", () => {
  it("Ctrl Z quita la fila y avisa de que el Log no se deshace", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, HER);
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    await s.deshacer();
    expect(estadoDe(evento(s, ESCENA))).toBe("borrador");
    expect(await ficha(fs, s, HER)).toBe(antes);
    expect(s.avisosCambio.join(" ")).toContain("el Log no se deshace");
  });

  it("Ctrl Y la vuelve a poner", async () => {
    const { fs, s } = await preparar();
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    await s.deshacer();
    await s.rehacer();
    expect(estadoDe(evento(s, ESCENA))).toBe("descartado");
    expect(await ficha(fs, s, HER)).toContain(FILA);
    expect(await ficha(fs, s, TEL)).toContain(FILA);
  });

  it("Ctrl Z mientras se escribe la fila: la fila no se queda (revisión)", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, HER);
    const ruta = await rutaDe(s, HER);
    // La escritura de la ficha tarda
    const escribir = fs.escribir.bind(fs);
    fs.escribir = async (r: string, t: string) => {
      if (r.startsWith(ruta)) await new Promise((ok) => setTimeout(ok, 30));
      return escribir(r, t);
    };
    const descartar = s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    while (estadoDe(evento(s, ESCENA)) !== "descartado") await new Promise((ok) => setTimeout(ok, 0));
    await s.deshacer();
    await descartar;
    fs.escribir = escribir;
    expect(estadoDe(evento(s, ESCENA))).toBe("borrador");
    expect(await ficha(fs, s, HER)).toBe(antes);
    expect(s.avisosCambio.join(" ")).not.toContain("no está tal cual");
  });

  it("«Volver a como estaba» quita la fila", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, HER);
    s.empezarComparacion(ESCENA);
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    expect(await s.volverAComoEstaba()).toMatchObject({ devueltas: 1 });
    expect(await ficha(fs, s, HER)).toBe(antes);
    expect(s.avisosCambio.join(" ")).toContain("el Log no se deshace");
  });
});

describe("alternativas descartadas con una variante (spec 009, RF-51)", () => {
  it("en la variante no toca la wiki hasta aplicar", async () => {
    const { fs, s } = await preparar();
    const antes = await ficha(fs, s, HER);
    const v = await SesionVariante.abrirSobre(s, variante("va-alt", "Sin el amigo", ""));
    abiertas.push(v);
    expect((await v.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" })).hecho).toBe(true);
    await v.escritor.vaciar();
    expect(await ficha(fs, s, HER)).toBe(antes);
    expect((await s.aplicarVariante(v.datos, v.modelo)).hecho).toBe(true);
    expect(await ficha(fs, s, HER)).toContain(FILA);
    expect(await ficha(fs, s, TEL)).toContain(FILA);
  });

  it("recuperar a la vez dos piezas que dan la misma fila la quita una vez y no avisa en falso (revisión)", async () => {
    const { fs, s } = await preparar();
    s.editar<Evento>("ev-e009", (p) => (p.titulo = "Nando se niega a callar"));
    await s.cambiarEstado("ev-e009", "descartado", { motivo: "No pegaba" });
    await s.cambiarEstado(ESCENA, "descartado", { motivo: "No pegaba" });
    expect(await ficha(fs, s, HER)).toContain(FILA);
    const v = await SesionVariante.abrirSobre(s, variante("va-alt", "Con el amigo", ""));
    abiertas.push(v);
    await v.cambiarEstado("ev-e009", "borrador");
    await v.cambiarEstado(ESCENA, "borrador");
    await v.escritor.vaciar();
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r.hecho).toBe(true);
    expect(await ficha(fs, s, HER)).not.toContain(FILA);
    expect((r.avisos ?? []).join(" ")).not.toContain("no está tal cual");
  });

  it("una fila que no se puede escribir no deshace la variante y se dice", async () => {
    const { s } = await preparar();
    const v = await SesionVariante.abrirSobre(s, variante("va-alt", "Sin el amigo", ""));
    abiertas.push(v);
    await v.cambiarEstado("ev-e006", "descartado", { motivo: "Sobra" });
    await v.escritor.vaciar();
    const r = await s.aplicarVariante(v.datos, v.modelo);
    expect(r.hecho).toBe(true);
    expect(estadoDe(evento(s, "ev-e006"))).toBe("descartado");
    expect(r.avisos ?? []).toContain("El arco «El eco» es canon: desbloquéalo para apuntar la alternativa.");
  });
});
