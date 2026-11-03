// Crea la serie de prueba en <appDatos>/_prueba con su wiki falsa (T1.8).
// Uso: npm run crear-prueba -- "<ruta de appDatos>" [--rehacer]

import { crearPrueba } from "./datos-prueba";
import { FsNode, rutaDeArgumento } from "./fs-node";

const raiz = rutaDeArgumento();
const rehacer = process.argv.includes("--rehacer");

crearPrueba(new FsNode(), raiz, { rehacer })
  .then(() => console.log(`Serie de prueba creada en ${raiz}/_prueba`))
  .catch((e) => {
    console.error((e as Error).message);
    process.exit(1);
  });
