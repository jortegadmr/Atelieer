// Un vault mínimo en memoria: la serie de prueba con su wiki falsa y unas
// plantillas con la misma forma que las de _Plantillas (abreviadas).

import { FsMemoria } from "../../src/lib/almacen/fs-memoria";
import { crearPrueba } from "../../scripts/datos-prueba";

export const VAULT = "/Vault";
export const APPDATOS = `${VAULT}/appDatos`;

const fm = (tipo: string, extra = "") => `---
tipo: ${tipo}
estado_canon: idea
${extra}aliases: []
tags:
  - ${tipo}
creado: "{{date}}"
actualizado: "{{date}}"
---
`;

const FUENTES = `
## Fuentes

- \`00_Raw/...\` —
`;

export const PLANTILLAS: Record<string, string> = {
  "Personajes/Plantilla - Personaje.md": `${fm("personaje", "rol: \"\"\n")}
<!-- PLANTILLA DE PERSONAJE -->

# {{title}}

> **Resumen:** [PENDIENTE]

## Núcleo

### Motor interno

| Campo | Respuesta |
| --- | --- |
| Quiere (objetivo consciente) | |
| Necesita (lo que de verdad le falta) | |
${FUENTES}`,
  "Mundo/Plantilla - Lugar.md": `${fm("lugar")}
# {{title}}

> **Resumen:** [PENDIENTE]
${FUENTES}`,
  "Mundo/Plantilla - Era.md": `${fm("era")}
# {{title}}

> **Resumen:** [PENDIENTE]
${FUENTES}`,
  "Narrativa/Plantilla - Temporada.md": `---
tipo: temporada
estado_canon: idea
numero:
episodios: []
arcos: []
aliases: []
tags:
  - temporada
creado: "{{date}}"
actualizado: "{{date}}"
---

# {{title}}

> **Logline de temporada:** [PENDIENTE]

## Núcleo

- **Pregunta dramática:**
- **Tema de la temporada:**
- **Punto de partida:**
- **Punto de llegada:**
- **Cierre / cliffhanger:**

### Tramas

| Trama | Ficha de arco | Qué pasa esta temporada |
| --- | --- | --- |
| A | | |

### Episodios

| Nº | Título | Logline | Trama dominante | Estado |
| --- | --- | --- | --- | --- |
| E01 | | | | idea |

## Profundizar

### Personajes: estado inicial y final

| Personaje | Al empezar | Al terminar | Cambio clave |
| --- | --- | --- | --- |
| | | | |

### Revelaciones y siembras

| Tipo | Qué | Episodio | Se conecta con |
| --- | --- | --- | --- |
| Revelación | | | |

## Preguntas abiertas

- [PENDIENTE]
${FUENTES}`,
  "Narrativa/Plantilla - Episodio.md": `---
tipo: episodio
estado_canon: idea
id: T01E01
temporada: ""
numero:
estado: idea
personajes: []
lugares: []
arcos: []
tags:
  - episodio
creado: "{{date}}"
actualizado: "{{date}}"
---

# {{title}}

> **Logline:** [PENDIENTE]

## Núcleo

- **Pregunta del episodio:**
- **Trama A:**
- **Trama B:**
- **Qué cambia al final:**
- **Botón final:**

### Escaleta

| Escena | Lugar | Qué pasa | Trama | Duración | Estado |
| --- | --- | --- | --- | --- | --- |
| ESC01 | | | A | | idea |

## Profundizar

### Estructura por actos

| Acto | Escenas | Qué ocurre | Termina con |
| --- | --- | --- | --- |
| Teaser / cold open | | | |
| Acto 1 | | | |
| Acto 2 | | | |
| Acto 3 | | | |
${FUENTES}`,
  "Narrativa/Plantilla - Arco.md": `---
tipo: arco
estado_canon: idea
tipo_arco: trama
trama: A
personajes: []
temporadas: []
aliases: []
tags:
  - arco
creado: "{{date}}"
actualizado: "{{date}}"
---

# {{title}}

> **Resumen:** [PENDIENTE]

## Núcleo

- **Punto de partida:**
- **Punto de llegada:**
- **Conflicto que lo mueve:**
- **Tema que explora:**

### Beats

| # | Beat | Temporada / episodio | Qué pasa | Qué cambia |
| --- | --- | --- | --- | --- |
| 1 | Planteamiento | | | |

## Profundizar

### Siembras y recogidas

| Siembra | Escena | Recogida | Escena |
| --- | --- | --- | --- |
| | | | |

### Alternativas descartadas

| Idea | Por qué se descartó |
| --- | --- |
| | |
${FUENTES}`,
  "Narrativa/Plantilla - Secreto.md": `---
tipo: secreto
estado_canon: idea
nivel: mayor
conocen: []
se_siembra_en: ""
revelado_en: ""
aliases: []
tags:
  - secreto
  - spoiler
creado: "{{date}}"
actualizado: "{{date}}"
---

# {{title}}

> **Resumen (sin spoiler):** [PENDIENTE]

## Núcleo

### La verdad

<!-- Lo que realmente ocurre u ocurrió. -->

### Qué cree la audiencia hasta la revelación

### Momento de revelación

- **Dónde:**
- **Cómo se revela:**

## Profundizar

### Quién lo sabe

| Personaje | Lo sabe desde | Cómo lo supo | Qué hace con ello |
| --- | --- | --- | --- |
| | | | |

### Pistas sembradas

| Escena | Pista | Obvia / sutil | Canal |
| --- | --- | --- | --- |
| | | | |

### Pistas falsas

| Escena | Pista falsa | A qué conclusión lleva |
| --- | --- | --- |
| | | |
${FUENTES}`,
};

/** Vault en memoria con la serie de prueba, su wiki falsa y las plantillas */
export async function vaultDePrueba(): Promise<FsMemoria> {
  const fs = new FsMemoria();
  await fs.crearDir(APPDATOS);
  await crearPrueba(fs, APPDATOS);
  for (const [ruta, texto] of Object.entries(PLANTILLAS)) await fs.escribir(`${VAULT}/_Plantillas/${ruta}`, texto);
  return fs;
}
