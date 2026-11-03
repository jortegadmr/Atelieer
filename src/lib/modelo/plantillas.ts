// Plantillas de estructura (spec 011, RF-26 a RF-35): cuatro esquemas fijos de
// momentos con su sitio previsto en la temporada. Cada momento tiene texto,
// episodio y escena. Lo de hoy sigue donde está, para que la v1.0 lo vea igual
// (RF-32): texto y episodio de Tres actos en `estructura`, texto del Story
// Circle en `story_circle`. Lo nuevo va en `extra`, una propiedad por plantilla:
//
//   estructura_escenas: { detonante: ev-1 }
//   story_circle_sitios: { tu: { episodio: ep-1, escena: ev-2 } }
//   save_the_cat: { catalizador: { texto: "…", episodio: ep-2 } }
//   viaje_heroe: { odisea: { texto: "…", episodio: ep-4 } }
//
// Solo se leen y escriben las claves de PLANTILLAS; lo demás se conserva.

import type { Modelo } from "./modelo";
import type { Temporada } from "./tipos";
import { textoCrudo } from "./viene-de";

export type IdPlantilla = "tres_actos" | "story_circle" | "save_the_cat" | "viaje_heroe";

/** Sitio previsto en la temporada, en % */
export type Sitio = { punto: number } | { tramo: [number, number] };

export interface DefMomento {
  clave: string;
  nombre: string;
  explicacion: string;
  sitio: Sitio;
}

export interface Plantilla {
  id: IdPlantilla;
  nombre: string;
  momentos: readonly DefMomento[];
}

const pt = (clave: string, nombre: string, p: number, explicacion: string): DefMomento => ({ clave, nombre, explicacion, sitio: { punto: p } });
const tr = (clave: string, nombre: string, a: number, b: number, explicacion: string): DefMomento => ({ clave, nombre, explicacion, sitio: { tramo: [a, b] } });

export const PLANTILLAS: readonly Plantilla[] = [
  {
    id: "tres_actos",
    nombre: "Tres actos",
    momentos: [
      tr("detonante", "Detonante", 10, 15, "Lo que rompe la normalidad y pone la temporada en marcha"),
      pt("punto_medio", "Punto medio", 50, "Giro que cambia lo que está en juego"),
      pt("crisis", "Crisis", 75, "El peor momento; todo parece perdido"),
      tr("climax", "Clímax", 85, 95, "El enfrentamiento final que resuelve la pregunta dramática"),
    ],
  },
  {
    id: "story_circle",
    nombre: "Story Circle",
    momentos: [
      tr("tu", "1 · Tú", 0, 12.5, "Su zona de confort"),
      tr("necesidad", "2 · Necesidad", 12.5, 25, "Quiere algo"),
      tr("ir", "3 · Ir", 25, 37.5, "Entra en lo desconocido"),
      tr("buscar", "4 · Buscar", 37.5, 50, "Se adapta"),
      tr("encontrar", "5 · Encontrar", 50, 62.5, "Consigue lo que quería"),
      tr("pagar", "6 · Pagar", 62.5, 75, "Le cuesta caro"),
      tr("volver", "7 · Volver", 75, 87.5, "Regresa a lo conocido"),
      tr("cambiar", "8 · Cambiar", 87.5, 100, "Ya no es el mismo"),
    ],
  },
  {
    id: "save_the_cat",
    nombre: "Save the Cat",
    momentos: [
      pt("imagen_apertura", "Imagen de apertura", 1, "Cómo está el protagonista antes del cambio"),
      pt("tema", "Tema expuesto", 5, "Alguien dice de qué va la historia"),
      tr("planteamiento", "Planteamiento", 1, 10, "Su mundo, lo que le falta y quién le rodea"),
      pt("catalizador", "Catalizador", 10, "Lo que lo cambia todo"),
      tr("debate", "Debate", 10, 20, "Duda: ¿va o no va?"),
      pt("segundo_acto", "Paso al segundo acto", 20, "Decide y entra en el mundo nuevo"),
      pt("trama_b", "Trama B", 22, "Llega la historia secundaria, a menudo de amor o amistad"),
      tr("diversion", "Diversión y juegos", 20, 50, "La promesa de la premisa"),
      pt("punto_medio", "Punto medio", 50, "Falsa victoria o falsa derrota; sube lo que está en juego"),
      tr("cerco", "Los malos estrechan el cerco", 50, 75, "Presión de fuera y dudas de dentro"),
      pt("todo_perdido", "Todo está perdido", 75, "El golpe más bajo; algo muere"),
      tr("noche_oscura", "Noche oscura del alma", 75, 80, "Toca fondo"),
      pt("tercer_acto", "Paso al tercer acto", 80, "Encuentra la solución, a menudo gracias a la trama B"),
      tr("final", "Final", 80, 99, "Aplica lo aprendido y vence"),
      pt("imagen_final", "Imagen final", 100, "El reflejo de la imagen de apertura: el cambio"),
    ],
  },
  {
    id: "viaje_heroe",
    nombre: "Viaje del héroe",
    momentos: [
      tr("mundo_ordinario", "Mundo ordinario", 0, 10, "El héroe en su vida de siempre"),
      pt("llamada", "Llamada a la aventura", 10, "Aparece el problema o el reto"),
      pt("rechazo", "Rechazo de la llamada", 12, "Miedo o duda"),
      tr("mentor", "Encuentro con el mentor", 15, 20, "Alguien le da consejo, ayuda o un objeto"),
      pt("umbral", "Cruce del primer umbral", 25, "Entra en el mundo especial"),
      tr("pruebas", "Pruebas, aliados y enemigos", 25, 50, "Aprende las reglas del mundo nuevo"),
      tr("acercamiento", "Acercamiento a la caverna", 50, 60, "Se prepara para la prueba mayor"),
      pt("odisea", "Odisea", 60, "La prueba suprema; roza la muerte"),
      tr("recompensa", "Recompensa", 65, 75, "Consigue lo que buscaba"),
      pt("camino_vuelta", "El camino de vuelta", 75, "Las consecuencias le persiguen"),
      pt("resurreccion", "Resurrección", 90, "Última prueba; renace cambiado"),
      tr("elixir", "Regreso con el elixir", 95, 100, "Vuelve con algo que cambia su mundo"),
    ],
  },
];

/** Dónde guarda cada plantilla lo nuevo, en `extra` */
export const PROPIEDADES: Readonly<Record<IdPlantilla, string>> = {
  tres_actos: "estructura_escenas",
  story_circle: "story_circle_sitios",
  save_the_cat: "save_the_cat",
  viaje_heroe: "viaje_heroe",
};

export interface ValorMomento {
  texto: string;
  episodio: string;
  escena: string;
}

export const plantilla = (id: IdPlantilla): Plantilla => PLANTILLAS.find((p) => p.id === id)!;

const defDe = (id: IdPlantilla, clave: string) => plantilla(id).momentos.find((x) => x.clave === clave);

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const propio = (o: Objeto, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined);
const cadena = (v: unknown) => (typeof v === "string" ? v : "");

/** La propiedad de la plantilla en disco, si la hay */
const propiedad = (t: Temporada, id: IdPlantilla): unknown => propio(t.extra, PROPIEDADES[id]);

/** Si la propiedad está escrita a mano de otra forma (no es objeto), lo escrito; si no, null (como RF-9) */
export function soloLectura(t: Temporada, id: IdPlantilla): string | null {
  const v = propiedad(t, id);
  return v === undefined || esObjeto(v) ? null : textoCrudo(v);
}

/** La entrada del momento en la propiedad de su plantilla */
function entrada(t: Temporada, id: IdPlantilla, clave: string): unknown {
  const p = propiedad(t, id);
  return esObjeto(p) ? propio(p, clave) : undefined;
}

/** Texto, episodio y escena de un momento; lo que no es texto cuenta como vacío */
export function momento(t: Temporada, id: IdPlantilla, clave: string): ValorMomento {
  const r: ValorMomento = { texto: "", episodio: "", escena: "" };
  const def = defDe(id, clave);
  if (!def) return r;
  const e = entrada(t, id, clave);
  if (id === "tres_actos") {
    const k = clave as keyof Temporada["estructura"];
    r.texto = t.estructura[k].texto;
    r.episodio = t.estructura[k].episodio;
    r.escena = cadena(e);
    return r;
  }
  if (id === "story_circle") r.texto = cadena(t.story_circle[PLANTILLAS[1].momentos.indexOf(def)]);
  if (esObjeto(e)) {
    if (id !== "story_circle") r.texto = cadena(propio(e, "texto"));
    r.episodio = cadena(propio(e, "episodio"));
    r.escena = cadena(propio(e, "escena"));
  }
  return r;
}

export type CambioMomento = Partial<ValorMomento>;

/**
 * Cambia un momento de `t` (dentro de `editar`). Poner escena pone su episodio
 * (RF-29); cambiar el episodio quita la escena si es de otro (RF-30), en la
 * misma mutación. Del cambio solo se leen texto, episodio y escena. Un campo
 * vacío se borra; un momento vacío, su clave; una plantilla vacía, su propiedad.
 */
export function ponerMomento(m: Modelo, t: Temporada, id: IdPlantilla, clave: string, cambio: CambioMomento): void {
  const def = defDe(id, clave);
  if (!def) return;
  const nuevo = momento(t, id, clave);
  const texto = propio(cambio, "texto");
  const episodio = propio(cambio, "episodio");
  const escena = propio(cambio, "escena");
  const cambia = { texto: typeof texto === "string", episodio: typeof episodio === "string", escena: typeof escena === "string" };
  if (cambia.texto) nuevo.texto = texto as string;
  if (cambia.escena) {
    nuevo.escena = escena as string;
    const ep = nuevo.escena ? m.eventos.get(nuevo.escena)?.episodio : undefined;
    if (ep) {
      nuevo.episodio = ep;
      cambia.episodio = true;
    } else if (cambia.episodio) nuevo.episodio = episodio as string;
  } else if (cambia.episodio) {
    nuevo.episodio = episodio as string;
    const ev = nuevo.escena ? m.eventos.get(nuevo.escena) : undefined;
    if (ev && ev.episodio !== nuevo.episodio) {
      nuevo.escena = "";
      cambia.escena = true;
    }
  }

  if (id === "tres_actos") {
    const k = clave as keyof Temporada["estructura"];
    if (cambia.texto) t.estructura[k].texto = nuevo.texto;
    if (cambia.episodio) t.estructura[k].episodio = nuevo.episodio;
    if (cambia.escena) escribirEnPropiedad(t, id, clave, (p) => (nuevo.escena ? (p[clave] = nuevo.escena) : delete p[clave]));
    return;
  }
  if (id === "story_circle" && cambia.texto) {
    const i = PLANTILLAS[1].momentos.indexOf(def);
    while (t.story_circle.length < i) t.story_circle.push("");
    t.story_circle[i] = nuevo.texto;
    // Vaciar un paso no deja la lista de la v1.0 rellena de huecos al final
    if (!nuevo.texto) while (t.story_circle.length && t.story_circle.at(-1) === "") t.story_circle.pop();
    cambia.texto = false;
  }
  const campos = (["texto", "episodio", "escena"] as const).filter((c) => cambia[c]);
  if (!campos.length) return;
  escribirEnPropiedad(t, id, clave, (p) => {
    const e = propio(p, clave);
    // Una entrada que no es objeto se sustituye: el autor la está cambiando
    const obj: Objeto = esObjeto(e) ? e : {};
    for (const c of campos) {
      if (nuevo[c]) obj[c] = nuevo[c];
      else delete obj[c];
    }
    if (Object.keys(obj).length) p[clave] = obj;
    else delete p[clave];
  });
}

/** Cambia la propiedad de la plantilla; si no es objeto, no se toca (solo lectura) */
function escribirEnPropiedad(t: Temporada, id: IdPlantilla, clave: string, fn: (p: Objeto) => void) {
  const nombre = PROPIEDADES[id];
  const actual = propio(t.extra, nombre);
  if (actual !== undefined && !esObjeto(actual)) return;
  // Las claves son de PLANTILLAS: nunca «__proto__» ni las de Object
  if (!defDe(id, clave)) return;
  const p: Objeto = actual ?? {};
  fn(p);
  if (Object.keys(p).length) t.extra[nombre] = p;
  else delete t.extra[nombre];
}
