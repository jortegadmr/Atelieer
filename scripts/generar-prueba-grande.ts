// Genera <appDatos>/_prueba_grande para medir el rendimiento (M7), o la borra.
// Uso: npm run prueba-grande -- "<ruta de appDatos>"            (crearla)
//      npm run prueba-grande -- "<ruta de appDatos>" --borrar   (borrarla)

import { promises as fsp } from "node:fs";
import { Almacen } from "../src/lib/almacen/almacen";
import { unir } from "../src/lib/almacen/fs";
import { CARPETA } from "../src/lib/modelo/vocabulario";
import { generarPruebaGrande } from "./datos-grande";
import { FsNode, rutaDeArgumento } from "./fs-node";

const CARPETA_SERIE = "_prueba_grande";

async function main() {
  const raiz = rutaDeArgumento();
  const ruta = unir(raiz, CARPETA_SERIE);
  if (process.argv.includes("--borrar")) {
    await fsp.rm(ruta, { recursive: true, force: true });
    console.log(`Borrada ${ruta}`);
    return;
  }
  const fs = new FsNode();
  if (await fs.existe(ruta)) throw new Error(`${ruta} ya existe. Bórrala antes con --borrar.`);
  const almacen = new Almacen(fs, raiz);
  for (const c of Object.values(CARPETA)) await fs.crearDir(unir(ruta, c));
  const d = generarPruebaGrande();
  const piezas = [d.serie, ...d.temporadas, ...d.episodios, ...d.arcos, ...d.eventos, ...d.secretos];
  // De 50 en 50, para no abrir miles de ficheros a la vez
  for (let i = 0; i < piezas.length; i += 50) {
    await Promise.all(piezas.slice(i, i + 50).map((p) => almacen.guardar(CARPETA_SERIE, p)));
  }
  console.log(`Creada ${ruta} con ${piezas.length} ficheros`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
