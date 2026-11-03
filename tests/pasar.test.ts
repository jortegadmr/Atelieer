import { describe, expect, it } from "vitest";
import { Almacen } from "../src/lib/almacen/almacen";
import { codigo } from "../src/lib/modelo/consultas";
import { Modelo } from "../src/lib/modelo/modelo";
import { separar } from "../src/lib/wiki/md";
import { pasarAWiki } from "../src/lib/wiki/pasar";
import { APPDATOS, VAULT, vaultDePrueba } from "./fixtures/wiki";

const OP = { fecha: "2026-10-20", carpetaSerie: "appDatos/_prueba" };
const NARR = "appDatos/_prueba/_wiki/01_Narrativa";
const VERDAD = "Don Anselmo emite cada noche una cinta que grabó la madre antes de morir.";

async function preparar() {
  const fs = await vaultDePrueba();
  const m = new Modelo(await new Almacen(fs, APPDATOS).abrirSerie("_prueba"));
  const leer = (rel: string) => fs.leer(`${VAULT}/${rel}`);
  return { fs, m, leer };
}

describe("Pasar a la wiki (spec 10.2, 14; T8.4)", () => {
  it("temporada: su plantilla, en su carpeta, con su nombre y en borrador", async () => {
    const { fs, m, leer } = await preparar();
    const r = await pasarAWiki(fs, VAULT, m, "te-t001", OP);
    expect(r.estado).toBe("creada");
    expect(r.ruta).toBe(`${NARR}/Temporadas/T01 - Cerrar la emisora.md`);
    const { propiedades, cuerpo } = separar(await leer(r.ruta));
    expect(propiedades.tipo).toBe("temporada");
    expect(propiedades.estado_canon).toBe("borrador");
    expect(cuerpo).toContain("# T01 - Cerrar la emisora");
    expect(cuerpo).toContain("> **Logline de temporada:** Telmo se queda para cerrar la emisora y descubre que la voz de las noticias del mañana no le deja irse.");
    expect(cuerpo).toContain("- **Pregunta dramática:** ¿Hasta dónde llegará Telmo para avisar sin que nadie sospeche de él?");
    // Tabla de episodios con logline y trama dominante
    expect(cuerpo).toMatch(/\| E01 \| La señal \| Telmo vuelve a Cabo Sal[^|]*\| El eco \| guion \|/);
    // Tabla de tramas
    expect(cuerpo).toMatch(/\| A \| El eco \|/);
    // Estado de personajes y revelaciones
    expect(cuerpo).toMatch(/\| \[\[Telmo\]\] \| Escucha y calla \| Avisa por primera vez y lo oculta \|/);
    expect(cuerpo).toMatch(/\| Siembra \| Sabela sabe copiar la frecuencia de la torre \| E03 \| Quién grabó la cinta \|/);
  });

  it("episodio: escaleta con una fila por evento, propiedades y estructura por actos (D9)", async () => {
    const { fs, m, leer } = await preparar();
    const ev = structuredClone(m.eventos.get("ev-e003")!);
    ev.acto = "1";
    m.poner(ev);
    const ep = structuredClone(m.episodios.get("ep-a102")!);
    ep.actos.inicio = "Pide una prórroga para ganar tiempo.";
    ep.gancho = "El aviso se mueve sola.";
    m.poner(ep);
    const r = await pasarAWiki(fs, VAULT, m, "ep-a102", OP);
    expect(r.ruta).toBe(`${NARR}/Episodios/T01E02 - El aviso.md`);
    const { propiedades, cuerpo } = separar(await leer(r.ruta));
    expect(propiedades.id).toBe("T01E02");
    expect(propiedades.estado_canon).toBe("borrador");
    expect(propiedades.personajes).toEqual(["[[Telmo]]", "Don Anselmo"]);
    expect(propiedades.lugares).toEqual(["[[El Ayuntamiento]]", "[[Torre de la emisora]]"]);
    expect(cuerpo).toMatch(/\| ESC01 \| \[\[El Ayuntamiento\]\] \| El Alcalde firma el cierre \| A \|/);
    expect(cuerpo).toMatch(/\| ESC02 \| \[\[Torre de la emisora\]\] \| Se enciende el transmisor \| A \|/);
    expect(cuerpo).toMatch(/\| Acto 1 \| ESC01 \| Pide una prórroga para ganar tiempo\. \|/);
    expect(cuerpo).toContain("- **Botón final:** El aviso se mueve sola.");
  });

  it("arco: beats, siembras de su campo y alternativas descartadas (D10)", async () => {
    const { fs, m, leer } = await preparar();
    const a = structuredClone(m.arcos.get("ar-ecos")!);
    a.siembras = [{ siembra: "La cinta", donde: "T01E06", recogida: "Quién la envió", donde_recogida: "T02E03" }];
    a.beats[0].texto = "Telmo llega al pueblo";
    m.poner(a);
    const desc = structuredClone(m.arcos.get("ar-desc")!);
    desc.tramo_de = "ar-ecos";
    m.poner(desc);
    const r = await pasarAWiki(fs, VAULT, m, "ar-ecos", OP);
    expect(r.ruta).toBe(`${NARR}/Arcos/El eco.md`);
    const { propiedades, cuerpo } = separar(await leer(r.ruta));
    expect(propiedades).toMatchObject({ tipo_arco: "trama", trama: "A", estado_canon: "borrador", personajes: ["[[Telmo]]"] });
    expect(cuerpo).toMatch(/\| 1 \| Planteamiento \| T01 · E01 \| Telmo llega al pueblo \|/);
    expect(cuerpo).toMatch(/\| 5 \| Resolución \| T03 \|/);
    expect(cuerpo).toMatch(/\| La cinta \| T01E06 \| Quién la envió \| T02E03 \|/);
    expect(cuerpo).toMatch(/\| Nando se va en E05 \| Variante B de T1/);
  });

  it("secreto: la verdad, quién lo conoce, pistas y revelado_en", async () => {
    const { fs, m, leer } = await preparar();
    const r = await pasarAWiki(fs, VAULT, m, "sc-voz1", OP);
    expect(r.ruta).toBe(`${NARR}/Secretos/Quién grabó la cinta.md`);
    const { propiedades, cuerpo } = separar(await leer(r.ruta));
    expect(propiedades).toMatchObject({ nivel: "mayor", conocen: ["[[Sabela]]"], revelado_en: "T02E03", se_siembra_en: "T01E03" });
    expect(cuerpo).toMatch(/### La verdad\n\n(<!--.*-->\n\n)?La grabó la madre/);
    expect(cuerpo).toMatch(/\| T01E03 \| Sabela sabe copiar la frecuencia de la torre \| sutil \|/);
    expect(cuerpo).toMatch(/\| T01E06 \| Una emisora pirata en el mar \| Que es una emisora pirata del mar. \|/);
  });

  it("Fuentes con la ruta de appDatos y la fecha, y una entrada en el Log", async () => {
    const { fs, m, leer } = await preparar();
    const r = await pasarAWiki(fs, VAULT, m, "te-t001", OP);
    expect(await leer(r.ruta)).toContain("- `appDatos/_prueba/temporadas/te-t001.md` — pasada desde Atelier el 2026-10-20");
    expect(await leer("appDatos/_prueba/_wiki/Log.md")).toContain("## [2026-10-20] atelier | Pasar a la wiki: T01 - Cerrar la emisora");
  });

  it("solo enlaza fichas que existen; las demás van como texto", async () => {
    const { fs, m, leer } = await preparar();
    const r = await pasarAWiki(fs, VAULT, m, "ep-a106", OP);
    const { propiedades } = separar(await leer(r.ruta));
    expect(propiedades.personajes).toEqual(["[[Telmo]]", "Don Anselmo"]);
    expect(r.sinFicha).toContain("Don Anselmo");
  });

  it("devuelve la pieza enlazada a su ficha, con la fecha de la ficha", async () => {
    const { fs, m } = await preparar();
    const r = await pasarAWiki(fs, VAULT, m, "te-t001", OP);
    expect(r.pieza).toMatchObject({ wiki: "[[T01 - Cerrar la emisora]]" });
    expect(r.pieza && "wiki_mtime" in r.pieza && Date.parse(r.pieza.wiki_mtime)).toBeGreaterThan(0);
  });

  it("la verdad de un secreto no aparece en la temporada ni en sus episodios", async () => {
    const { fs, m, leer } = await preparar();
    for (const id of ["te-t001", "ep-a102", "ep-a103", "ep-a105", "ep-a106", "ar-cint"]) {
      const r = await pasarAWiki(fs, VAULT, m, id, OP);
      expect(await leer(r.ruta), id).not.toContain(VERDAD);
    }
  });

  it("si la ficha ya existe, no la toca: solo la enlaza y lo dice", async () => {
    const { fs, m, leer } = await preparar();
    const primera = await pasarAWiki(fs, VAULT, m, "sc-solr", OP);
    await fs.cambiarDesdeFuera(`${VAULT}/${primera.ruta}`, "Editada a mano en Obsidian");
    const log = await leer("appDatos/_prueba/_wiki/Log.md");
    const r = await pasarAWiki(fs, VAULT, m, "sc-solr", OP);
    expect(r.estado).toBe("ya existía");
    expect(await leer(r.ruta)).toBe("Editada a mano en Obsidian");
    expect(await leer("appDatos/_prueba/_wiki/Log.md")).toBe(log);
    expect(r.pieza).toMatchObject({ wiki: "[[El solar nunca fue del Ayuntamiento]]" });
  });

  it("si otra nota del vault se llama igual, avisa y no crea nada hasta que el autor elija otro nombre", async () => {
    const { fs, m } = await preparar();
    await fs.escribir(`${VAULT}/OtraSerie/01_Wiki/01_Narrativa/Arcos/El eco.md`, "de otra serie");
    const r = await pasarAWiki(fs, VAULT, m, "ar-ecos", OP);
    expect(r.estado).toBe("nombre repetido");
    expect(r.repetidas).toEqual(["OtraSerie/01_Wiki/01_Narrativa/Arcos/El eco.md"]);
    expect(await fs.existe(`${VAULT}/${NARR}/Arcos/El eco.md`)).toBe(false);
    const r2 = await pasarAWiki(fs, VAULT, m, "ar-ecos", { ...OP, nombre: "El eco (Cabo Sal)" });
    expect(r2.estado).toBe("creada");
    expect(r2.ruta).toBe(`${NARR}/Arcos/El eco (Cabo Sal).md`);
  });
});

describe("Lo sabe desde al pasar el secreto (spec 010, RF-30, T6)", () => {
  const PLANTILLA = `${VAULT}/_Plantillas/Narrativa/Plantilla - Secreto.md`;

  /** El secreto sc-voz1 con estos personajes y fechas */
  async function conFechas(conocen: string[], desde: unknown[]) {
    const p = await preparar();
    const s = structuredClone(p.m.secretos.get("sc-voz1")!);
    s.conocen = conocen;
    s.extra = { ...s.extra, conocen_desde: desde };
    p.m.poner(s);
    const ep = [...p.m.episodios.keys()].find((id) => codigo(p.m, id) === "T01E03")!;
    return { ...p, ep };
  }

  it("la fecha va en la columna de su cabecera aunque cambie el orden", async () => {
    const p = await preparar();
    const ep = [...p.m.episodios.keys()].find((id) => codigo(p.m, id) === "T01E03")!;
    const plantilla = await p.fs.leer(PLANTILLA);
    await p.fs.escribir(
      PLANTILLA,
      plantilla.replace("| Personaje | Lo sabe desde | Cómo lo supo | Qué hace con ello |", "| Personaje | Cómo lo supo | Qué hace con ello | Lo sabe desde |"),
    );
    const s = structuredClone(p.m.secretos.get("sc-voz1")!);
    s.extra = { ...s.extra, conocen_desde: [{ personaje: "[[Sabela]]", episodio: ep }] };
    p.m.poner(s);
    const r = await pasarAWiki(p.fs, VAULT, p.m, "sc-voz1", OP);
    expect(separar(await p.leer(r.ruta)).cuerpo).toContain("| [[Sabela]] |  |  | T01E03 |");
  });

  it("sin esa columna no se escribe en otra", async () => {
    const p = await preparar();
    const ep = [...p.m.episodios.keys()].find((id) => codigo(p.m, id) === "T01E03")!;
    const plantilla = await p.fs.leer(PLANTILLA);
    await p.fs.escribir(PLANTILLA, plantilla.replace("| Personaje | Lo sabe desde | Cómo lo supo |", "| Personaje | Desde cuándo | Cómo lo supo |"));
    const s = structuredClone(p.m.secretos.get("sc-voz1")!);
    s.extra = { ...s.extra, conocen_desde: [{ personaje: "[[Sabela]]", episodio: ep }] };
    p.m.poner(s);
    const r = await pasarAWiki(p.fs, VAULT, p.m, "sc-voz1", OP);
    const cuerpo = separar(await p.leer(r.ruta)).cuerpo;
    expect(cuerpo).toContain("| [[Sabela]] |  |  |  |");
    expect(cuerpo).not.toContain("T01E03 |  |  |");
  });

  it("`[[X|alias]]` y saltos de línea escapados", async () => {
    const { fs, m, leer, ep } = await conFechas(["[[Telmo|el técnico]]", "Lia\nla otra"], []);
    const s = structuredClone(m.secretos.get("sc-voz1")!);
    s.extra = { ...s.extra, conocen_desde: [{ personaje: "[[Telmo|el técnico]]", episodio: ep }] };
    m.poner(s);
    const r = await pasarAWiki(fs, VAULT, m, "sc-voz1", OP);
    const cuerpo = separar(await leer(r.ruta)).cuerpo;
    const tabla = cuerpo.slice(cuerpo.indexOf("### Quién lo sabe"), cuerpo.indexOf("### Pistas sembradas"));
    // Cada personaje en una sola fila, con las barras escapadas
    const lineas = tabla.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Personaje") && !l.startsWith("| ---"));
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toMatch(/^\| .*Telmo\\|el técnico.* \| T01E03 \|  \|  \|$/);
    expect(lineas[1]).toMatch(/^\| Lia la otra \|  \|  \|  \|$/);
  });

  it("retorno suelto, U+2028 y bidi en una celda quedan en una línea", async () => {
    const { fs, m, leer } = await conFechas(["Lia\rla otra", "Ana\u2028Bel\u202e"], []);
    const r = await pasarAWiki(fs, VAULT, m, "sc-voz1", OP);
    const cuerpo = separar(await leer(r.ruta)).cuerpo;
    expect(cuerpo).toContain("| Lia la otra |  |  |  |");
    expect(cuerpo).toContain("| Ana Bel |  |  |  |");
    expect(cuerpo).not.toMatch(/[\r\u2028\u202e]/);
  });

  it("Sin fecha deja la celda vacía", async () => {
    const { fs, m, leer } = await conFechas(["[[Sabela]]", "[[Telmo]]"], [{ personaje: "[[Telmo]]", episodio: 7 }]);
    const r = await pasarAWiki(fs, VAULT, m, "sc-voz1", OP);
    const cuerpo = separar(await leer(r.ruta)).cuerpo;
    expect(cuerpo).toContain("| [[Sabela]] |  |  |  |");
    expect(cuerpo).toMatch(/\| (\[\[)?Telmo(\]\])? \|  \|  \|  \|/);
  });
});
