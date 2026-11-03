// Serie de prueba `appDatos/_prueba/` (T1.8, M8): los datos ficticios de la
// maqueta (constantes TR, EPS, EV, SECS y TRAY) y una wiki falsa en `_wiki/`
// con la misma forma que la de Cabo Sal. Todo es inventado.

import { Almacen } from "../src/lib/almacen/almacen";
import { unir, type Fs } from "../src/lib/almacen/fs";
import { crearPieza } from "../src/lib/modelo/ficheros";
import type { Arco, Episodio, Evento, Pieza, Posicion, Punto, Secreto, Serie, Temporada } from "../src/lib/modelo/tipos";
import { CARPETA, type Papel } from "../src/lib/modelo/vocabulario";

const CARPETA_SERIE = "_prueba";

// Ids fijos: así, rehacer la serie deja los mismos ficheros.
const T = ["te-t001", "te-t002", "te-t003"];
const E1 = Array.from({ length: 8 }, (_, i) => `ep-a1${String(i + 1).padStart(2, "0")}`);
const E2 = Array.from({ length: 8 }, (_, i) => `ep-b2${String(i + 1).padStart(2, "0")}`);
const A = { ven: "ar-ecos", tor: "ar-torm", her: "ar-amis", sec: "ar-cint", tel: "ar-telm", amo: "ar-voce", desc: "ar-desc" };

const p1 = (i: number): Posicion => ({ temporada: T[0], episodio: i < 0 ? "" : E1[i] });
const p2 = (i: number): Posicion => ({ temporada: T[1], episodio: i < 0 ? "" : E2[i] });
const p3: Posicion = { temporada: T[2], episodio: "" };
const nada: Posicion = { temporada: "", episodio: "" };
const beat = (p: Posicion) => ({ ...p, texto: "" });
const enlace = (n: string) => `[[${n}]]`;

const WIKI = "appDatos/_prueba/_wiki";

function serie(): Serie {
  return crearPieza("serie", {
    id: "se-prue",
    titulo: "Cabo Sal · prueba",
    premisa: "Un técnico de radio vuelve a su pueblo para cerrar la emisora de su madre y descubre que cada noche capta una voz que lee las noticias del día siguiente.",
    pregunta_oro: "¿Podrá Telmo avisar de lo que va a pasar sin provocarlo?",
    final_decidido: "Avisa, y la emisora enmudece para siempre.",
    preguntas_filosoficas: ["¿Se puede evitar lo que ya se ha oído?"],
    tema: "Lo que se avisa y a quién.",
    preguntas: [
      { pregunta: "Protagonista", respuesta: "Telmo Costa, el técnico que vuelve." },
      { pregunta: "Dónde", respuesta: "Cabo Sal, pueblo de faros, niebla y una emisora de onda media." },
      { pregunta: "Antagonista", respuesta: "El Alcalde, que quiere el solar de la emisora." },
      { pregunta: "Conflicto", respuesta: "Una voz que anuncia desgracias antes de que ocurran." },
      { pregunta: "Acción principal", respuesta: "Escuchar cada noche y decidir qué avisa." },
      { pregunta: "Objetivo", respuesta: "Evitar cada desgracia sin que nadie sepa de dónde lo sabe." },
      { pregunta: "Riesgos", respuesta: "Perder la emisora y la confianza del pueblo." },
      { pregunta: "Punto de crisis", respuesta: "" },
      { pregunta: "Cómo se resuelve el clímax", respuesta: "" },
      { pregunta: "Cómo cambia el protagonista", respuesta: "De técnico que escucha a locutor que habla." },
      { pregunta: "Mensaje", respuesta: "" },
    ],
    temporadas: [...T],
    arcos: [A.ven, A.tor, A.tel, A.her, A.sec, A.amo, A.desc],
    wiki: {
      raiz: WIKI,
      personajes: `${WIKI}/02_Personajes/Personajes`,
      lugares: `${WIKI}/03_Mundo/Lugares`,
      eras: `${WIKI}/03_Mundo/Eras`,
      timeline: `${WIKI}/03_Mundo/Timeline.md`,
      narrativa: `${WIKI}/01_Narrativa`,
      log: `${WIKI}/Log.md`,
    },
  });
}

function puntos(): Punto[] {
  const pt = (id: string, clase: Punto["clase"], posicion: Posicion, que_pasa = "") =>
    crearPieza("punto", { id, clase, posicion, que_pasa });
  return [
    pt("pt-ini1", "inicio", p1(0), "Telmo vuelve a Cabo Sal."),
    pt("pt-det2", "detonante", p1(2), "Nando se niega a seguir callando."),
    pt("pt-gir3", "giro", p2(4)),
    pt("pt-cli4", "climax", p3),
    pt("pt-fin5", "fin", p3),
  ];
}

function temporadas(): Temporada[] {
  return [
    crearPieza("temporada", {
      id: T[0],
      titulo: "Cerrar la emisora",
      madurez: "borrador",
      estado: "en marcha",
      logline: "Telmo se queda para cerrar la emisora y descubre que la voz de las noticias del mañana no le deja irse.",
      pregunta_dramatica: "¿Hasta dónde llegará Telmo para avisar sin que nadie sospeche de él?",
      tema: "Lo que se avisa y a quién.",
      partida: "Llega a cerrar la emisora y capta una voz imposible.",
      estructura: {
        detonante: { texto: "El Alcalde firma el cierre", episodio: E1[1] },
        punto_medio: { texto: "Apagón en el pueblo", episodio: E1[4] },
        crisis: { texto: "Nando se va", episodio: E1[4] },
        climax: { texto: "Emite en directo", episodio: E1[7] },
      },
      llegada: "Emite el primer aviso y deja de ser invisible.",
      cierre: "La voz no sale de la torre.",
      carga: ["+", "-"],
      episodios: [...E1],
    }),
    crearPieza("temporada", { id: T[1], madurez: "idea", estado: "en marcha", carga: ["-", "+"], episodios: [...E2] }),
    crearPieza("temporada", { id: T[2], madurez: "idea", estado: "prevista" }),
  ];
}

function episodios(): Episodio[] {
  const datos: [string, Episodio["estado"], Episodio["carga"], string][] = [
    ["La señal", "guion", ["+", "-"], "Telmo vuelve a Cabo Sal para cerrar la emisora y capta una voz que lee las noticias de mañana."],
    ["El aviso", "escaleta", ["-", "+"], "Pide una prórroga al Alcalde; la tormenta es su única oportunidad."],
    ["Dos micrófonos", "escaleta", ["+", "-"], "Nando se niega a seguir callando y le da la espalda."],
    ["Primera guardia", "escaleta", ["-", "+"], "Telmo aguanta la primera guardia contra todo pronóstico."],
    ["El apagón", "escaleta", ["+", "-"], "La tormenta corta la luz; el amigo desaparece esa misma noche."],
    ["La cinta", "idea", ["-", "+"], "Una cinta sin etiqueta promete explicar la voz."],
    ["Voz vieja", "idea", ["+", "+"], "Ella publica el reportaje, pero Telmo consigue la prórroga."],
    ["El pleno", "idea", ["+", "-"], "Lee el aviso en el pleno y el pueblo lo oye."],
  ];
  const t1 = datos.map(([titulo, estado, carga, idea_central], i) =>
    crearPieza("episodio", { id: E1[i], temporada: T[0], titulo, estado, carga, idea_central }),
  );
  const t2 = E2.map((id) => crearPieza("episodio", { id, temporada: T[1] }));
  return [...t1, ...t2];
}

function arcos(): Arco[] {
  return [
    crearPieza("arco", {
      id: A.ven,
      titulo: "El eco",
      madurez: "canon",
      tipo_arco: "trama",
      nivel: "serie",
      tipo_trama: "A",
      color: 1,
      inicio: p1(0),
      fin: p3,
      beats: [beat(p1(0)), beat(p1(1)), beat(p1(4)), beat(p2(-1)), beat(p3)],
      protagonistas: [enlace("Telmo")],
      quiere: "Averiguar de dónde sale la voz y qué quiere de él.",
      impide: "El Alcalde, que quiere el solar de la emisora, y la orden de apagarla.",
      gana: "Que la emisora siga en el aire.",
      pierde: "La vida que tenía en la ciudad.",
      bomba: "Cada noche la voz anuncia una desgracia más cercana a casa.",
      bomba_vence: p1(7),
      cambia: "De técnico que escucha a locutor que habla.",
    }),
    crearPieza("arco", {
      id: A.tor,
      titulo: "La tormenta",
      madurez: "canon",
      tipo_arco: "trama",
      nivel: "temporada",
      temporada: T[0],
      tipo_trama: "A",
      color: 4,
      tramo_de: A.ven,
      inicio: p1(1),
      fin: p1(4),
      beats: [beat(p1(1)), beat(p1(2)), beat(p1(3)), beat(p1(4)), beat(p1(4))],
      protagonistas: [enlace("Telmo")],
      quiere: "Mantener la emisora en el aire durante el temporal.",
      impide: "Cortes de luz y un Alcalde que ordena apagar.",
      gana: "Una noche de emisión.",
      pierde: "El transmisor principal.",
      bomba: "El temporal llega tres días antes de la marea viva.",
      bomba_vence: p1(4),
      cambia: "Aprende que en Cabo Sal nadie escucha hasta que es tarde.",
    }),
    crearPieza("arco", {
      id: A.her,
      titulo: "Amistad rota",
      madurez: "borrador",
      tipo_arco: "relacion",
      nivel: "serie",
      tipo_trama: "B",
      color: 2,
      inicio: p1(2),
      fin: p2(5),
      beats: [beat(p1(2)), beat(p1(4)), beat(p2(1)), beat(nada), beat(nada)],
      protagonistas: [enlace("Telmo"), enlace("Nando")],
      quiere: "Nando quiere dejar de callar lo que oye; Telmo, no perderle.",
      impide: "El miedo de Telmo a que lo tomen por loco.",
      gana: "Un amigo de verdad.",
      pierde: "Su único amigo en el pueblo.",
      cambia: "Del silencio a la confianza: vuelven a elegirse.",
      pegamento: { por: "trama", texto: "Nando es quien podría contárselo todo al pueblo." },
    }),
    crearPieza("arco", {
      id: A.sec,
      titulo: "La cinta oculta",
      madurez: "idea",
      tipo_arco: "trama",
      nivel: "serie",
      tipo_trama: "B",
      color: 3,
      inicio: p1(5),
      beats: [beat(p1(5)), beat(nada), beat(nada), beat(nada), beat(nada)],
      protagonistas: [enlace("Telmo")],
      quiere: "Saber quién emite la voz y por qué le avisa.",
    }),
    crearPieza("arco", {
      id: A.tel,
      titulo: "Telmo: callar o avisar",
      madurez: "borrador",
      tipo_arco: "personaje",
      nivel: "serie",
      tipo_trama: "A",
      color: 6,
      inicio: p1(0),
      fin: p3,
      beats: [beat(p1(0)), beat(p1(4)), beat(p2(5)), beat(p3), beat(p3)],
      personaje: enlace("Telmo"),
      quiere: "Evitar cada desgracia sin que nadie más pague por ello.",
      necesita: "Confiar en alguien.",
      herida: "Vio cómo su madre callaba un aviso hasta que fue tarde.",
      mentira: "«Si aviso, me tomarán por loco.»",
      cambia: "De callar a avisar y a elegir qué avisa.",
      estados: [
        { temporada: T[0], inicio: "Escucha y calla", fin: "Avisa por primera vez y lo oculta" },
        { temporada: T[1], inicio: "Busca solo quién emite la voz", fin: "Pide ayuda a Nando" },
        { temporada: T[2], inicio: "", fin: "" },
      ],
    }),
    crearPieza("arco", {
      id: A.amo,
      titulo: "Voces cruzadas",
      madurez: "borrador",
      tipo_arco: "relacion",
      nivel: "temporada",
      temporada: T[0],
      tipo_trama: "C",
      color: 5,
      inicio: p1(0),
      fin: p1(6),
      beats: [beat(p1(0)), beat(p1(3)), beat(nada), beat(p1(6)), beat(p1(6))],
      protagonistas: [enlace("Sabela"), enlace("Telmo")],
      quiere: "Sabela quiere publicar la verdad sin traicionar a Telmo.",
      impide: "Su director, que exige el reportaje.",
      gana: "Una fuente de verdad.",
      pierde: "A Telmo.",
      bomba: "El reportaje sale el día de la marea viva.",
      bomba_vence: p1(6),
      pegamento: { por: "tema", texto: "Lo que se cuenta a quien te quiere." },
    }),
    crearPieza("arco", {
      id: A.desc,
      titulo: "Nando se va en E05",
      madurez: "descartado",
      tipo_arco: "trama",
      nivel: "temporada",
      temporada: T[0],
      tipo_trama: "B",
      color: 2,
      protagonistas: [enlace("Nando")],
      motivo_descarte: "Variante B de T1 · descartada el 19-10: sin Nando no hay segunda temporada.",
    }),
  ];
}

type DatosEvento = {
  id: string;
  titulo: string;
  ep: number;
  arcos: [keyof typeof A, Papel][];
  pj: string[];
  lu: string[];
  madurez: Evento["madurez"];
  gana: string;
  pierde: string;
  valor: string;
  cambio: Evento["cambio"];
  avanza: boolean;
  revela: boolean;
  mundo?: string;
  modo?: Evento["modo"];
};

function eventos(): Evento[] {
  const d: DatosEvento[] = [
    { id: "ev-e001", titulo: "Telmo llega al pueblo", ep: 0, arcos: [["ven", "abre"], ["tel", "abre"]], pj: ["Telmo", "La madre"], lu: ["Casa del Muelle"], madurez: "canon", gana: "Una pista.", pierde: "Su vida en la ciudad.", valor: "Seguridad", cambio: ["+", "-"], avanza: true, revela: true },
    { id: "ev-e002", titulo: "Se conocen en la lonja", ep: 0, arcos: [["amo", "abre"]], pj: ["Telmo", "Sabela"], lu: ["Lonja vieja"], madurez: "borrador", gana: "Una aliada.", pierde: "Tiempo que no tiene.", valor: "Esperanza", cambio: ["-", "+"], avanza: false, revela: true },
    { id: "ev-e003", titulo: "El Alcalde firma el cierre", ep: 1, arcos: [["ven", "avanza"]], pj: ["Telmo"], lu: ["El Ayuntamiento"], madurez: "canon", gana: "Un mes de prórroga.", pierde: "Su margen.", valor: "Libertad", cambio: ["+", "-"], avanza: true, revela: true },
    { id: "ev-e004", titulo: "Se enciende el transmisor", ep: 1, arcos: [["tor", "abre"]], pj: ["Telmo", "Don Anselmo"], lu: ["Torre de la emisora"], madurez: "canon", gana: "Una señal.", pierde: "Poder fingir que no oye nada.", valor: "Esperanza", cambio: ["-", "+"], avanza: true, revela: false },
    { id: "ev-e005", titulo: "Nando se niega a callar", ep: 2, arcos: [["her", "abre"]], pj: ["Telmo", "Nando"], lu: ["Casa del Muelle"], madurez: "borrador", gana: "Ayuda.", pierde: "A su amigo.", valor: "Confianza", cambio: ["+", "-"], avanza: true, revela: true },
    { id: "ev-e006", titulo: "Primera guardia", ep: 3, arcos: [["tor", "avanza"]], pj: ["Telmo"], lu: ["Torre de la emisora"], madurez: "idea", gana: "", pierde: "", valor: "", cambio: ["+", "+"], avanza: false, revela: false },
    { id: "ev-e007", titulo: "Primera confidencia", ep: 3, arcos: [["amo", "avanza"]], pj: ["Telmo", "Sabela"], lu: ["Azotea"], madurez: "borrador", gana: "Una confidente.", pierde: "La reserva antes del temporal.", valor: "Cercanía", cambio: ["-", "+"], avanza: false, revela: true },
    { id: "ev-e008", titulo: "Corte de luz en la torre", ep: 4, arcos: [["tor", "cierra"], ["ven", "gira"], ["tel", "gira"]], pj: ["Telmo", "Don Anselmo"], lu: ["Torre de la emisora"], madurez: "canon", gana: "La emisión.", pierde: "La fe en Don Anselmo.", valor: "Confianza", cambio: ["+", "-"], avanza: true, revela: true },
    { id: "ev-e009", titulo: "Nando se va del pueblo", ep: 4, arcos: [["her", "gira"]], pj: ["Nando"], lu: ["Paso del Espigón"], madurez: "borrador", gana: "Su tranquilidad.", pierde: "A Telmo.", valor: "Amistad", cambio: ["+", "-"], avanza: true, revela: true },
    { id: "ev-e010", titulo: "Llega la cinta oculta", ep: 5, arcos: [["sec", "abre"]], pj: ["Telmo"], lu: ["Casa del Muelle"], madurez: "idea", gana: "Esperanza.", pierde: "", valor: "Esperanza", cambio: ["-", "+"], avanza: true, revela: true },
    { id: "ev-e013", titulo: "La leyenda del Faro Ciego, junto al fuego", ep: 5, arcos: [["sec", "avanza"]], pj: ["Don Anselmo", "Telmo"], lu: ["Torre de la emisora"], madurez: "borrador", gana: "Una pista.", pierde: "", valor: "Verdad", cambio: ["-", "+"], avanza: false, revela: true, mundo: enlace("C1"), modo: "leyenda" },
    { id: "ev-e011", titulo: "Sabela publica el reportaje", ep: 6, arcos: [["amo", "cierra"]], pj: ["Sabela"], lu: ["Lonja vieja"], madurez: "idea", gana: "", pierde: "La confianza de Telmo.", valor: "Confianza", cambio: ["+", "-"], avanza: false, revela: true },
    { id: "ev-e012", titulo: "Lee el aviso en el pleno", ep: 7, arcos: [["ven", "avanza"], ["her", "avanza"], ["tel", "avanza"]], pj: ["Telmo", "Nando"], lu: ["El Ayuntamiento"], madurez: "canon", gana: "Que el pueblo escuche.", pierde: "Su anonimato.", valor: "Anonimato", cambio: ["+", "-"], avanza: true, revela: true },
  ];
  const orden = new Map<number, number>();
  const colocados = d.map((e) => {
    const n = (orden.get(e.ep) ?? 0) + 1;
    orden.set(e.ep, n);
    return crearPieza("evento", {
      id: e.id,
      titulo: e.titulo,
      madurez: e.madurez,
      temporada: T[0],
      episodio: E1[e.ep],
      orden: n,
      arcos: e.arcos.map(([k, papel]) => ({ arco: A[k], papel })),
      personajes: e.pj.map(enlace),
      lugares: e.lu.map(enlace),
      mundo: e.mundo ?? "",
      modo: e.modo ?? "escena",
      valor: e.valor,
      cambio: e.cambio,
      gana: e.gana,
      pierde: e.pierde,
      relleno: { avanza: e.avanza, revela: e.revela },
    });
  });
  const bandeja = [
    crearPieza("evento", { id: "ev-b001", titulo: "Subida a la azotea", temporada: T[0], orden: 1, arcos: [{ arco: A.ven, papel: "avanza" }] }),
    crearPieza("evento", { id: "ev-b002", titulo: "Alguien conoce la frecuencia", temporada: T[0], orden: 2, arcos: [{ arco: A.sec, papel: "avanza" }] }),
  ];
  return [...colocados, ...bandeja];
}

function secretos(): Secreto[] {
  return [
    crearPieza("secreto", {
      id: "sc-voz1",
      titulo: "Quién grabó la cinta",
      madurez: "borrador",
      nivel: "mayor",
      verdad: "La grabó la madre antes de morir y Sabela la emite cada noche para que Telmo no cierre la emisora.",
      cree_audiencia: "Que es una emisora pirata del mar.",
      conocen: [enlace("Sabela")],
      revelado_en: { episodio: E2[2], evento: "" },
      pistas: [
        { episodio: E1[2], evento: "", texto: "Sabela sabe copiar la frecuencia de la torre", clase: "sutil" },
        { episodio: E1[4], evento: "", texto: "La cinta huele a gasoil del espigón", clase: "sutil" },
      ],
      falsas: [{ episodio: E1[5], evento: "", texto: "Una emisora pirata en el mar", conclusion: "Que es una emisora pirata del mar." }],
    }),
    crearPieza("secreto", {
      id: "sc-solr",
      titulo: "El solar nunca fue del Ayuntamiento",
      madurez: "borrador",
      nivel: "central",
      verdad: "La madre dejó el solar de la emisora a Telmo y el Alcalde ocultó el testamento.",
      cree_audiencia: "Que el solar es del pueblo.",
      conocen: [enlace("El Alcalde")],
      revelado_en: { episodio: E2[3], evento: "" },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Wiki falsa

interface Motor {
  resumen: string;
  rol: string;
  quiere: string;
  necesita: string;
  herida: string;
  mentira: string;
  aliases?: string[];
}

const P = "[PENDIENTE]";

const PERSONAJES: Record<string, Motor> = {
  Telmo: {
    resumen: "El técnico de radio que vuelve a Cabo Sal y capta una voz imposible.",
    rol: "protagonista",
    quiere: "Evitar cada desgracia sin que nadie más pague por ello.",
    necesita: "Confiar en alguien.",
    herida: "Vio cómo su madre callaba un aviso hasta que fue tarde.",
    mentira: "Si aviso, me tomarán por loco.",
    aliases: ["Telmo Costa"],
  },
  Nando: {
    resumen: "El mejor amigo de Telmo, técnico de sonido, que se niega a callar.",
    rol: "secundario",
    quiere: "No callar lo que oye en la emisora.",
    necesita: P,
    herida: "Se fue del pueblo y nadie lo echó de menos.",
    mentira: P,
  },
  Sabela: {
    resumen: "Una periodista del diario local que investiga la emisora.",
    rol: "secundario",
    quiere: "Publicar la verdad sin perder a su fuente.",
    necesita: P,
    herida: P,
    mentira: P,
  },
  "El Alcalde": {
    resumen: "El alcalde de Cabo Sal, que quiere el solar de la emisora.",
    rol: "antagonista",
    quiere: "Cerrar la emisora antes de las elecciones.",
    necesita: P,
    herida: P,
    mentira: "Lo que no se cierra, se desborda.",
  },
  "La madre": {
    resumen: "La madre de Telmo, fundadora de la emisora, fallecida hace un año.",
    rol: "secundario",
    quiere: P,
    necesita: P,
    herida: P,
    mentira: P,
  },
};

const LUGARES: Record<string, string> = {
  "Casa del Muelle": "La casa de la familia, con vistas al puerto y la antena en el tejado.",
  "Lonja vieja": "La antigua lonja, donde el pueblo se reúne a escuchar la radio.",
  "Torre de la emisora": "La torre desde donde sale la señal.",
  "El Ayuntamiento": "Donde el Alcalde firma sus decretos.",
  "Paso del Espigón": "El camino del espigón, que lleva al faro.",
};

function fichaPersonaje(nombre: string, m: Motor): string {
  const aliases = m.aliases?.length ? `aliases:\n${m.aliases.map((a) => `  - ${a}`).join("\n")}\n` : "aliases: []\n";
  return `---
tipo: personaje
estado_canon: borrador
rol: ${m.rol}
estado_vital: ${nombre === "La madre" ? "muerto" : "vivo"}
${aliases}tags:
  - personaje
creado: "2026-10-19"
actualizado: "2026-10-19"
---

# ${nombre}

> **Resumen:** ${m.resumen}

> Ficha falsa de la serie de prueba de Atelier.

## Núcleo

### Función en la historia

- **Rol dramático:** ${P}

### Motor interno

| Campo | Respuesta |
| --- | --- |
| Quiere (objetivo consciente) | ${m.quiere} |
| Necesita (lo que de verdad le falta) | ${m.necesita} |
| Herida (lo que le marcó) | ${m.herida} |
| Mentira que cree | ${m.mentira} |
| Miedo principal | ${P} |
| Contradicción central | ${P} |
`;
}

function fichaLugar(nombre: string, resumen: string): string {
  return `---
tipo: lugar
estado_canon: borrador
escala: asentamiento
aliases: []
tags:
  - lugar
creado: "2026-10-19"
actualizado: "2026-10-19"
---

# ${nombre}

> **Resumen:** ${resumen}

> Ficha falsa de la serie de prueba de Atelier.
`;
}

const TIMELINE = `---
tipo: timeline
estado_canon: borrador
creado: "2026-10-19"
actualizado: "2026-10-19"
---

# Timeline

> **Resumen:** Cronología falsa de la serie de prueba de Atelier.

## Eras

| Era | Desde | Hasta | Rasgo principal |
| --- | --- | --- | --- |
| C1 | hace cien años | la inundación del puerto | El faro todavía guía a los barcos con su luz. |
| Presente | la vuelta de Telmo | | Cabo Sal vive de la pesca y de la radio. |

## Cronología
`;

const LOG = `# Log

Registro append-only de operaciones de la wiki falsa de prueba. Formato: \`## [FECHA] operación | Título\`.

## [2026-10-19] setup | Wiki falsa de Atelier

Creada por scripts/crear-prueba.ts para probar el puente con la wiki sin tocar la de verdad.
`;

async function crearWiki(fs: Fs, rutaSerie: string): Promise<void> {
  const w = unir(rutaSerie, "_wiki");
  const personajes = unir(w, "02_Personajes", "Personajes");
  const lugares = unir(w, "03_Mundo", "Lugares");
  for (const dir of [personajes, lugares, unir(w, "03_Mundo", "Eras"), unir(w, "01_Narrativa")]) await fs.crearDir(dir);
  for (const [n, m] of Object.entries(PERSONAJES)) await fs.escribir(unir(personajes, `${n}.md`), fichaPersonaje(n, m));
  for (const [n, r] of Object.entries(LUGARES)) await fs.escribir(unir(lugares, `${n}.md`), fichaLugar(n, r));
  await fs.escribir(unir(w, "03_Mundo", "Timeline.md"), TIMELINE);
  await fs.escribir(unir(w, "Log.md"), LOG);
}

/** Borra los ficheros de una carpeta y de las de dentro (las carpetas quedan vacías) */
async function vaciar(fs: Fs, dir: string): Promise<void> {
  if (!(await fs.existe(dir))) return;
  for (const e of await fs.listar(dir)) {
    const r = unir(dir, e.nombre);
    if (e.esDir) await vaciar(fs, r);
    else await fs.borrar(r);
  }
}

/** Todas las piezas de la serie de prueba */
export function piezasDePrueba(): Pieza[] {
  return [serie(), ...puntos(), ...temporadas(), ...episodios(), ...arcos(), ...eventos(), ...secretos()];
}

/**
 * Crea `appDatos/_prueba/`. Si ya existe, falla, salvo con `rehacer`: entonces
 * vacía sus carpetas de piezas y su wiki falsa y las vuelve a crear. Lo demás
 * (por ejemplo `enlace.md` de T0.4) se queda.
 */
export async function crearPrueba(fs: Fs, raizAppDatos: string, opciones: { rehacer?: boolean } = {}): Promise<void> {
  const almacen = new Almacen(fs, raizAppDatos);
  const ruta = almacen.rutaSerie(CARPETA_SERIE);
  if (await fs.existe(unir(ruta, "serie.md"))) {
    if (!opciones.rehacer) throw new Error(`La serie ${ruta} ya existe. Usa --rehacer para crearla de nuevo.`);
    for (const c of [...Object.values(CARPETA), "_wiki"]) await vaciar(fs, unir(ruta, c));
  }
  for (const c of Object.values(CARPETA)) await fs.crearDir(unir(ruta, c));
  for (const p of piezasDePrueba()) await almacen.guardar(CARPETA_SERIE, p);
  await crearWiki(fs, ruta);
}
