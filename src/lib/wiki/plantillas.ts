// Crear ficha (spec 10.1, 10.3, reglas 7 y 14; T8.3): solo si el autor lo
// pulsa. Usa la plantilla del vault (solo lectura) con {{title}} y {{date}}
// puestos, añade Fuentes y una entrada en el Log. Si ya existe, no hace nada.

import { carpetaDe, unir, type Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";
import { anotarLog } from "./log";
import type { TipoFicha } from "./fichas";

export const PLANTILLA: Record<TipoFicha | "temporada" | "episodio" | "arco" | "secreto", string> = {
  personaje: "_Plantillas/Personajes/Plantilla - Personaje.md",
  lugar: "_Plantillas/Mundo/Plantilla - Lugar.md",
  era: "_Plantillas/Mundo/Plantilla - Era.md",
  temporada: "_Plantillas/Narrativa/Plantilla - Temporada.md",
  episodio: "_Plantillas/Narrativa/Plantilla - Episodio.md",
  arco: "_Plantillas/Narrativa/Plantilla - Arco.md",
  secreto: "_Plantillas/Narrativa/Plantilla - Secreto.md",
};

const CARPETA: Record<TipoFicha, keyof RutasWiki> = { personaje: "personajes", lugar: "lugares", era: "eras" };
const NOMBRE_TIPO: Record<TipoFicha, string> = { personaje: "personaje", lugar: "lugar", era: "época" };

export interface Opciones {
  /** AAAA-MM-DD */
  fecha: string;
  /** De dónde sale, para Fuentes: "appDatos/_prueba" */
  origen: string;
  /** Qué la pide (por ejemplo, el evento donde aparece) */
  motivo?: string;
}

export function nombreValido(nombre: string): boolean {
  return !!nombre.trim() && !/[\\/:*?"<>|#^[\]]/.test(nombre);
}

/** Plantilla con {{title}} y {{date}} sustituidos (regla 7) */
export function rellenar(plantilla: string, titulo: string, fecha: string): string {
  return plantilla.replace(/\{\{title\}\}/g, titulo).replace(/\{\{date\}\}/g, fecha);
}

/** Pone la línea de Fuentes en el sitio del ejemplo de la plantilla, o añade la sección (regla 2) */
export function ponerFuentes(texto: string, linea: string): string {
  const ejemplo = /^- `00_Raw\/\.\.\.` — ?.*$/m;
  if (/^## Fuentes\s*$/m.test(texto)) {
    if (ejemplo.test(texto)) return texto.replace(ejemplo, linea);
    return texto.replace(/^## Fuentes\s*$/m, `## Fuentes\n\n${linea}`);
  }
  return `${texto.replace(/\s*$/, "")}\n\n## Fuentes\n\n${linea}\n`;
}

export async function crearFicha(
  fs: Fs,
  vault: string,
  rutas: RutasWiki,
  tipo: TipoFicha,
  nombre: string,
  op: Opciones,
): Promise<{ estado: "creada" | "ya existe"; ruta: string }> {
  const limpio = nombre.replace(/^\s*\[\[|\]\]\s*$/g, "").trim();
  if (!nombreValido(limpio)) throw new Error(`El nombre «${nombre}» no vale para un fichero (sin / \\ : * ? " < > | # ^ [ ]).`);
  const dir = rutas[CARPETA[tipo]];
  if (!dir) throw new Error(`La serie no tiene carpeta de ${NOMBRE_TIPO[tipo]} en la wiki.`);
  const ruta = `${dir.replace(/\/+$/, "")}/${limpio}.md`;
  const abs = unir(vault, ruta);
  if (await fs.existe(abs)) return { estado: "ya existe", ruta };

  const plantilla = await fs.leer(unir(vault, PLANTILLA[tipo]));
  let texto = rellenar(plantilla, limpio, op.fecha);
  texto = ponerFuentes(texto, `- \`${op.origen}\` — creada desde Atelier el ${op.fecha}${op.motivo ? ` (${op.motivo})` : ""}`);
  await fs.crearDir(carpetaDe(abs));
  await fs.escribir(abs, texto);
  await anotarLog(fs, vault, rutas, op.fecha, `Crear ficha: ${limpio}`, `Ficha de ${NOMBRE_TIPO[tipo]} creada desde Atelier, a petición del autor, con su plantilla (\`${ruta}\`). Origen: \`${op.origen}\`.`);
  return { estado: "creada", ruta };
}
