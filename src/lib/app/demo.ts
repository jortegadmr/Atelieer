// Modo demostración, solo al programar en un navegador normal (sin Tauri):
// la serie de prueba en un disco en memoria. No entra en la app compilada.

import { crearPrueba } from "../../../scripts/datos-prueba";
import { PLANTILLAS } from "../../../tests/fixtures/wiki";
import { RUTA_CHULETA } from "../guia/chuleta";
import { GUIA_INICIAL } from "../guia/guia-inicial";
import { FsMemoria } from "../almacen/fs-memoria";
import { EstadoApp } from "./estado.svelte";

export async function estadoDemo(): Promise<EstadoApp> {
  const fs = new FsMemoria();
  const raiz = "/demo/appDatos";
  await fs.crearDir(raiz);
  await crearPrueba(fs, raiz);
  await fs.escribir(`${raiz}/guia.md`, GUIA_INICIAL);
  // Plantillas abreviadas (las de las pruebas), para Crear ficha y Pasar a la wiki
  for (const [ruta, texto] of Object.entries(PLANTILLAS)) await fs.escribir(`/demo/_Plantillas/${ruta}`, texto);
  // Una chuleta corta, para leer sus apartados en la Guía de escritura (spec 019)
  await fs.escribir(
    `/demo/${RUTA_CHULETA}`,
    `# Chuleta de escritura de series

## §4 La premisa
Una o dos frases: quién, qué quiere y qué se lo impide.

## §18 El final
Decide el final **antes** de escribir, aunque sea en una línea.
- La pregunta de oro nace al inicio.
- El final la responde.

## §29 Las preguntas
Repasa las 10-11 preguntas antes de dar la historia por planeada.
`,
  );
  // Un conflicto y un fichero roto, para ver los avisos
  await fs.escribir(`${raiz}/_prueba/eventos/ev-e006 (# Edit conflict 2026-10-19 aB3dE9x #).md`, "---\nid: ev-e006\ntipo: evento\ntitulo: Primera guardia (versión del Mac)\n---\n");
  const e = new EstadoApp(fs, async () => "navegador");
  await e.ponerRaiz(raiz);
  return e;
}
