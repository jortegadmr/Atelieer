// Crea <appDatos>/guia.md con el primer juego de reglas (T6.1), si no existe.
// Uso: npm run crear-guia -- "<ruta de appDatos>"

import { unir } from "../src/lib/almacen/fs";
import { GUIA_INICIAL } from "../src/lib/guia/guia-inicial";
import { FsNode, rutaDeArgumento } from "./fs-node";

async function main() {
  const fs = new FsNode();
  const ruta = unir(rutaDeArgumento(), "guia.md");
  if (await fs.existe(ruta)) throw new Error(`${ruta} ya existe: no se toca.`);
  await fs.escribir(ruta, GUIA_INICIAL);
  console.log(`Creado ${ruta}`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
