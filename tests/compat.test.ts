import { describe, expect, it } from "vitest";
import { piezasDePrueba } from "../scripts/datos-prueba";
import { Almacen } from "../src/lib/almacen/almacen";
import { EstadoApp } from "../src/lib/app/estado.svelte";
import { escribirPieza, leerPieza } from "../src/lib/modelo/ficheros";
import { guardadoPorV1, leidoPorV1 } from "./compat/uso-v1";
import { Almacen as AlmacenV1 } from "./compat/v1/almacen";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

// Compatibilidad con la v1.0 (constitución 9, spec 001): lo que escribe la v2
// lo lee la v1.0, y si la v1.0 lo guarda, la v2 no pierde nada.

describe("compatibilidad con la v1.0", () => {
  it("la v1.0 lee todas las piezas de la serie de prueba que escribe la v2", () => {
    for (const p of piezasDePrueba()) {
      expect(() => leidoPorV1(escribirPieza(p), p.tipo), p.id).not.toThrow();
    }
  });

  it("ida y vuelta v2 → v1.0 → v2: la pieza queda igual", () => {
    for (const p of piezasDePrueba()) {
      const vuelta = leerPieza(guardadoPorV1(escribirPieza(p), p.tipo), p.tipo);
      expect(vuelta, p.id).toEqual(leerPieza(escribirPieza(p), p.tipo));
    }
  });
});

describe("la v1.0 abre la serie tras lo de la spec 009 (RNF)", () => {
  it("después de mover épocas, guardar un apartado, descartar y recuperar, confirmar y «Dejarlo así»", async () => {
    const fs = await vaultDePrueba();
    const e = new EstadoApp(fs, async () => "PC");
    await e.ponerRaiz(APPDATOS);
    await e.abrir("_prueba");
    const s = e.sesion!;
    const v1 = new AlmacenV1(fs, APPDATOS);
    type DatosV1 = Awaited<ReturnType<AlmacenV1["abrirSerie"]>>;
    const ids = (d: DatosV1) => [d.serie, ...d.puntos, ...d.temporadas, ...d.episodios, ...d.arcos, ...d.eventos, ...d.secretos].map((p) => p.id).sort();
    const abrirV1 = async () => {
      await s.guardado.vaciar();
      const d = await v1.abrirSerie("_prueba");
      expect(d.problemas).toEqual([]);
      return d;
    };
    const todas = ids(await abrirV1());

    // Mover de época
    expect(await e.cambiarEpoca("ev-e002", "e:c1")).toBe(true);
    expect((await abrirV1()).eventos.find((x) => x.id === "ev-e002")?.mundo).toBe("[[C1]]");

    // Guardar un apartado: la copia va a _fichas/, dentro de la carpeta de la serie
    expect((await s.cambiarEstado("te-t001", "borrador")).hecho).toBe(true);
    const leida = (await s.leerFichaDe("te-t001"))!;
    expect((await s.guardarApartado("te-t001", leida, 0, "Texto nuevo.")).ok).toBe(true);
    expect((await fs.listar(`${APPDATOS}/_prueba/_fichas`)).length).toBeGreaterThan(0);
    expect(ids(await abrirV1())).toEqual(todas);

    // Descartar y recuperar
    expect((await s.cambiarEstado("ev-e005", "descartado", { motivo: "No encaja" })).hecho).toBe(true);
    expect(ids(await abrirV1())).toEqual(todas);
    expect((await s.cambiarEstado("ev-e005", "borrador")).hecho).toBe(true);
    expect(ids(await abrirV1())).toEqual(todas);

    // Confirmar una equivalencia y «Dejarlo así»
    const ficha = `${VAULT}/${s.modelo.serie.wiki.narrativa}/Temporadas/T01 - Cerrar la emisora.md`;
    const ponerFicha = async (valor: string) => {
      await fs.escribir(ficha, (await fs.leer(ficha)).replace(/estado_canon: .*/, `estado_canon: ${valor}`));
      await s.revisarFichas();
    };
    await ponerFicha("boceto");
    expect((await s.confirmarEquivalencia("te-t001", "idea")).hecho).toBe(true);
    expect(ids(await abrirV1())).toEqual(todas);
    await ponerFicha("semilla");
    expect(await s.dejarAsi("te-t001", "semilla")).toBe(true);
    const d = await abrirV1();
    expect(ids(d)).toEqual(todas);
    const t1 = d.temporadas.find((x) => x.id === "te-t001")!;
    expect(t1.avisos_silenciados).toContain("ficha:semilla");

    // Si la v1.0 la guarda, la v2 no pierde el «Dejarlo así»
    await e.cerrar();
    await v1.guardar("_prueba", t1);
    const v2 = await new Almacen(fs, APPDATOS).abrirSerie("_prueba");
    expect(v2.temporadas.find((x) => x.id === "te-t001")?.avisos_silenciados).toContain("ficha:semilla");
  });
});
