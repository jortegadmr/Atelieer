// Entrada al final del Log.md de la serie (regla 5): "## [AAAA-MM-DD] atelier | Título".

import { carpetaDe, escribirSeguro, unir, type Fs } from "../almacen/fs";
import type { RutasWiki } from "../modelo/tipos";

export async function anotarLog(fs: Fs, vault: string, rutas: RutasWiki, fecha: string, titulo: string, texto: string): Promise<void> {
  if (!rutas.log) return;
  const ruta = unir(vault, rutas.log);
  const leerLog = async () => ((await fs.existe(ruta)) ? fs.leer(ruta) : null);
  const conEntrada = (actual: string) => `${actual}${actual.endsWith("\n") ? "\n" : "\n\n"}## [${fecha}] atelier | ${titulo}\n\n${texto}\n`;
  let leido = await leerLog();
  // Si otro apunta en el Log mientras tanto, la entrada va detrás de lo suyo
  for (let intento = 0; intento < 3; intento++) {
    const ahora = await leerLog();
    if (ahora === leido) break;
    leido = ahora;
  }
  if (leido === null) await fs.crearDir(carpetaDe(ruta));
  await escribirSeguro(fs, ruta, conEntrada(leido ?? "# Log\n"));
}
