<script lang="ts">
  // Editar de la serie (spec 4.2 Serie, T2.2).
  import Folder from "@lucide/svelte/icons/folder";
  import { usarEstado } from "../../lib/app/contexto";
  import { nOlvido } from "../../lib/comprobaciones/olvido";
  import type { RutasWiki, Serie } from "../../lib/modelo/tipos";
  import CampoLista from "./campos/CampoLista.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";

  const { serie }: { serie: Serie } = $props();
  const estado = usarEstado();

  const editar = (fn: (s: Serie) => void) => estado.sesion!.editar<Serie>(serie.id, fn);
  const logline = (k: keyof Serie["logline"], v: string) => editar((s) => (s.logline[k] = v));
  const ruta = (k: keyof RutasWiki, v: string) => editar((s) => (s.wiki[k] = v));

  const PIEZAS_LOGLINE: { k: keyof Serie["logline"]; texto: string; pista: string }[] = [
    { k: "protagonista", texto: "Protagonista", pista: "¿De quién es la historia?" },
    { k: "objetivo", texto: "Objetivo", pista: "¿Qué quiere conseguir?" },
    { k: "problema", texto: "Problema", pista: "¿Qué se lo impide?" },
    { k: "accion", texto: "Acción", pista: "¿Qué hace para lograrlo?" },
    { k: "catalizador", texto: "Catalizador", pista: "¿Qué lo pone todo en marcha?" },
  ];

  const RUTAS: { k: keyof RutasWiki; texto: string }[] = [
    { k: "raiz", texto: "Raíz de la wiki" },
    { k: "personajes", texto: "Personajes" },
    { k: "lugares", texto: "Lugares" },
    { k: "eras", texto: "Épocas" },
    { k: "timeline", texto: "Timeline" },
    { k: "narrativa", texto: "Narrativa" },
    { k: "log", texto: "Log" },
  ];

  // Fracción de olvido (D5): ejemplos de N con la fracción actual
  const n = (eps: number) => nOlvido(eps, serie.olvido_fraccion);
  let fraccionTexto = $state("");
  $effect(() => {
    fraccionTexto = String(serie.olvido_fraccion);
  });
  function fraccion(v: string) {
    fraccionTexto = v;
    const x = Number(v.replace(",", "."));
    if (Number.isFinite(x) && x > 0 && x <= 1) editar((s) => (s.olvido_fraccion = x));
  }
</script>

<div class="ib-body">
  <ConGuia pieza={serie} clave="serie.titulo">
    <CampoTexto etiqueta="Título" valor={serie.titulo} pista="Título de la serie" alCambiar={(v) => editar((s) => (s.titulo = v))} />
  </ConGuia>
  <ConGuia pieza={serie} clave="serie.premisa">
    <CampoTexto
      etiqueta="Premisa"
      ref="§4"
      largo
      valor={serie.premisa}
      pista="La idea de la serie en una o dos frases."
      alCambiar={(v) => editar((s) => (s.premisa = v))}
    />
  </ConGuia>

  <ConGuia pieza={serie} clave="serie.logline">
    <div class="f">
      <span class="lbl">Logline en 5 piezas<span class="ref">§4</span></span>
      <div class="logline5">
        {#each PIEZAS_LOGLINE as p (p.k)}
          <CampoTexto etiqueta={p.texto} valor={serie.logline[p.k]} pista={p.pista} alCambiar={(v) => logline(p.k, v)} />
        {/each}
      </div>
    </div>
  </ConGuia>

  <ConGuia pieza={serie} clave="serie.pregunta">
    <CampoTexto
      etiqueta="Pregunta de oro"
      ref="§18"
      largo
      valor={serie.pregunta_oro}
      pista="La pregunta que la serie plantea al inicio y el final responde."
      alCambiar={(v) => editar((s) => (s.pregunta_oro = v))}
    />
  </ConGuia>
  <ConGuia pieza={serie} clave="serie.final">
    <CampoTexto
      etiqueta="Final decidido"
      ref="§18 · F1.6"
      largo
      valor={serie.final_decidido}
      pista="Decide el final antes de escribir, aunque sea en una línea."
      alCambiar={(v) => editar((s) => (s.final_decidido = v))}
    />
  </ConGuia>
  <ConGuia pieza={serie} clave="serie.filosoficas">
    <CampoLista
      etiqueta="Preguntas filosóficas"
      ref="§3"
      valores={serie.preguntas_filosoficas}
      pista="¿Se puede evitar lo que ya se ha oído?"
      otro="Añadir pregunta"
      alCambiar={(v) => editar((s) => (s.preguntas_filosoficas = v))}
    />
  </ConGuia>
  <CampoTexto
    etiqueta="Tema"
    ref="§19"
    largo
    valor={serie.tema}
    pista="¿Qué dice la historia con todo esto?"
    alCambiar={(v) => editar((s) => (s.tema = v))}
  />
  <ConGuia pieza={serie} clave="serie.dinamica">
    <CampoTexto
      etiqueta="Dinámica de la historia"
      ref="§25"
      valor={serie.dinamica}
      pista="Siempre conflicto, cada vez más difícil."
      alCambiar={(v) => editar((s) => (s.dinamica = v))}
    />
  </ConGuia>

  <div class="f">
    <label for="olvido">Arco olvidado: fracción de la temporada<span class="ref">D5</span></label>
    <input id="olvido" class="v mono" inputmode="decimal" value={fraccionTexto} oninput={(e) => fraccion(e.currentTarget.value)} />
    <p class="ayuda">Avisa si un arco pasa más de N episodios seguidos sin escenas. Ahora: 8 ep → {n(8)}; 10 → {n(10)}; 6 → {n(6)}.</p>
  </div>

  <div class="f">
    <span class="lbl"><Folder class="i" />Wiki de la serie<span class="ref">desde la raíz del vault</span></span>
    <div class="rutas">
      {#each RUTAS as r (r.k)}
        <CampoTexto etiqueta={r.texto} mono valor={serie.wiki[r.k]} pista="Sin fijar" alCambiar={(v) => ruta(r.k, v)} />
      {/each}
    </div>
  </div>
</div>

<style>
  .lbl {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 6px;
  }
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
  .logline5,
  .rutas {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 10px;
    border-left: 2px solid var(--line);
  }
  .ayuda {
    margin: 5px 0 0;
    font-size: 11.5px;
    color: var(--ink-3);
  }
</style>
