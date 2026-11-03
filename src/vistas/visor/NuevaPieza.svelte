<script lang="ts">
  // Ventana «Nueva pieza» (spec 002, RF-28 a RF-32, RF-35): título opcional,
  // dónde se guarda y estado inicial. Dentro de la app, nunca del sistema.
  import { onDestroy, untrack } from "svelte";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { simularNueva, type SimulacionNueva } from "../../lib/consecuencias/nueva";
  import { usarEstado } from "../../lib/app/contexto";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import { reglasNueva } from "../../lib/guia/campos";
  import * as c from "../../lib/modelo/consultas";
  import { CARPETA, TIPO_ARCO, etiqueta, type TipoArco } from "../../lib/modelo/vocabulario";
  import { NOMBRE_ACTO, ORDEN_ACTOS, type ActoVisor } from "../../lib/vistas/actos";

  const estado = usarEstado();
  const que = $derived(estado.nueva!);

  const TITULO = {
    temporada: "Nueva temporada",
    trama: "Nueva trama",
    secreto: "Nuevo secreto",
    episodio: "Nuevo episodio",
    "trama-temporada": "Nueva trama de temporada",
    evento: "Nueva escena",
  } as const;
  const TIPO = { temporada: "temporada", trama: "arco", secreto: "secreto", episodio: "episodio", "trama-temporada": "arco", evento: "evento" } as const;
  const AYUDA: Record<TipoArco, string> = { trama: "Lo que pasa", personaje: "Cómo cambia alguien", relacion: "Entre dos personajes" };

  let titulo = $state("");
  let tipoArco = $state<TipoArco>("trama");
  let tramo = $state(false);
  let tramoDe = $state("");
  let trabajando = $state(false);
  // «Sin acto» salvo que se abra desde una columna (spec 003, RF-36)
  let acto = $state<ActoVisor>(estado.actoNueva);

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const n = estado.nivel;
    return {
      ruta: `appDatos/${s.carpeta}/${CARPETA[TIPO[que]]}/`,
      donde: n.tipo === "serie" ? "" : c.codigo(s.modelo, n.tipo === "episodio" ? n.episodio : n.temporada),
      tramas: c.arcosEnOrden(s.modelo).filter((a) => a.nivel === "serie" && a.madurez !== "descartado"),
    };
  });

  // Lo que pedirán las guías a la pieza (spec 004, RF-21 a RF-24)
  const guias = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    if (!s.guia) return { propias: [], subtrama: [] };
    return reglasNueva(s.guia, s.modelo, { que, tipoArco, tramoDe: que === "trama-temporada" && tramo ? tramoDe || undefined : undefined });
  });
  // Un tramo es como su trama madre: sin madre no se sabe qué pedirá
  const faltaMadre = $derived(que === "trama-temporada" && tramo && !tramoDe);

  // «Si la creas así…» (spec 005, RF-30 a RF-32): sobre una copia, sin escribir
  // nada; 300 ms después del último cambio, así escribir el título no espera
  const datosNueva = $derived({
    titulo,
    tipoArco: que === "trama" || (que === "trama-temporada" && !tramo) ? tipoArco : undefined,
    tramoDe: que === "trama-temporada" && tramo ? tramoDe || undefined : undefined,
    acto: que === "evento" ? acto : undefined,
  });
  let simulacion = $state<SimulacionNueva | null>(null);
  $effect(() => {
    void estado.version;
    const [nivel, datos, falta] = [estado.nivel, datosNueva, faltaMadre];
    const t = setTimeout(() => {
      untrack(() => {
        const s = estado.sesion;
        if (!s) return;
        simulacion = falta
          ? { error: "Elige la trama de la que es tramo." }
          : simularNueva(s.modelo, nivel, que, datos, (id) => s.estaBloqueada(id), s.guia, s.resultado());
      });
    }, 300);
    return () => clearTimeout(t);
  });

  // Esc la cierra sin crear nada (RF-35); al cerrar, el foco vuelve a donde estaba
  $effect(() => estado.capas.abrir(() => estado.cerrarNueva()));
  const antes = document.activeElement as HTMLElement | null;
  onDestroy(() => {
    if (antes && antes.isConnected) antes.focus();
  });

  // Tab no sale de la ventana mientras está abierta
  let caja = $state<HTMLElement | null>(null);
  function atrapar(e: KeyboardEvent) {
    if (e.key !== "Tab" || !caja) return;
    const enfocables = [...caja.querySelectorAll<HTMLElement>("input, select, button:not(:disabled)")];
    const [primero, ultimo] = [enfocables[0], enfocables.at(-1)];
    if (!primero || !ultimo) return;
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  async function crear(e: SubmitEvent) {
    e.preventDefault();
    if (trabajando) return;
    trabajando = true;
    try {
      await estado.crearNueva(datosNueva);
    } finally {
      trabajando = false;
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="velo" onclick={() => estado.cerrarNueva()}>
  <div class="card nueva" role="dialog" aria-modal="true" aria-labelledby="titulo-nueva" tabindex="-1" bind:this={caja} onkeydown={atrapar} onclick={(e) => e.stopPropagation()}>
  <form class="vent" onsubmit={crear}>
    <h2 id="titulo-nueva">{TITULO[que]}{#if d.donde}<small class="en"> en {d.donde}</small>{/if}</h2>

    <div class="f">
      <label for="nueva-titulo">Título (opcional)</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input id="nueva-titulo" class="campo" autofocus bind:value={titulo} placeholder="Sin título" autocomplete="off" />
    </div>

    {#if que === "trama-temporada"}
      <div class="opc dos" role="group" aria-label="Qué trama">
        <button type="button" aria-pressed={!tramo} class:on={!tramo} onclick={() => (tramo = false)}>Trama nueva<small>Solo de esta temporada</small></button>
        <button type="button" aria-pressed={tramo} class:on={tramo} disabled={!d.tramas.length} onclick={() => (tramo = true)}>
          Tramo de una trama de serie<small>{d.tramas.length ? "Su parte en esta temporada" : "Aún no hay tramas de serie"}</small>
        </button>
      </div>
      {#if tramo}
        <div class="f">
          <label for="nueva-tramo">Trama de serie</label>
          <select id="nueva-tramo" class="campo" bind:value={tramoDe}>
            <option value="" disabled>Elige una</option>
            {#each d.tramas as a (a.id)}<option value={a.id}>{a.titulo || "Sin título"}</option>{/each}
          </select>
        </div>
      {/if}
    {/if}

    {#if que === "trama" || (que === "trama-temporada" && !tramo)}
      <div class="opc" role="group" aria-label="Tipo">
        {#each TIPO_ARCO as t (t)}
          <button type="button" aria-pressed={tipoArco === t} class:on={tipoArco === t} onclick={() => (tipoArco = t)}>
            {etiqueta(TIPO_ARCO, t)[0].toUpperCase() + etiqueta(TIPO_ARCO, t).slice(1)}<small>{AYUDA[t]}</small>
          </button>
        {/each}
      </div>
    {/if}

    {#if que === "evento"}
      <div class="opc actos-opc" role="group" aria-label="Acto">
        {#each ORDEN_ACTOS as a (a)}
          <button type="button" aria-pressed={acto === a} class:on={acto === a} onclick={() => (acto = a)}>{NOMBRE_ACTO[a]}</button>
        {/each}
      </div>
    {/if}

    <div class="ruta">Se guarda en la mesa: {d.ruta} · estado: idea</div>

    {#if estado.errorNueva}<div class="warnbox" role="alert">{estado.errorNueva}</div>{/if}

    <div class="botones">
      <button type="button" class="btn ghost" onclick={() => estado.cerrarNueva()}>Cancelar</button>
      <button type="submit" class="btn pri" disabled={trabajando || (que === "trama-temporada" && tramo && !tramoDe)}>Crear</button>
    </div>
  </form>
  <aside class="guias" aria-labelledby="titulo-guias">
    <h3 id="titulo-guias"><BookOpen class="i" />Lo que te pedirán tus guías</h3>
    {#if faltaMadre}
      <p class="libre">Elige la trama de la que es tramo para ver lo que te pedirán.</p>
    {:else if guias.propias.length || guias.subtrama.length}
      {#each guias.propias as r (r.id)}
        <div class="maxim"><span class="ref">{r.id}</span><div><p>{r.texto}</p><small>{r.fuente}</small></div></div>
      {/each}
      {#if guias.subtrama.length}
        <h4>Si es subtrama (B o C)</h4>
        {#each guias.subtrama as r (r.id)}
          <div class="maxim"><span class="ref">{r.id}</span><div><p>{r.texto}</p><small>{r.fuente}</small></div></div>
        {/each}
      {/if}
    {:else}
      <p class="libre">Tus guías no piden nada para esta pieza: escribe libre.</p>
    {/if}

    <section class="si-la-creas" aria-labelledby="titulo-si-la-creas">
      <h3 id="titulo-si-la-creas">Si la creas así…</h3>
      {#if !simulacion}
        <p class="libre">Calculando…</p>
      {:else if "error" in simulacion}
        <p class="libre">{simulacion.error}</p>
      {:else}
        <p>Aparecerá en <b>{simulacion.donde}</b>.</p>
        {#if simulacion.afectadas.length}
          <h4>Cambiarán</h4>
          <ul>
            {#each simulacion.afectadas as a (a.id)}
              <li><b>{a.codigo ? `${a.codigo} · ${a.titulo}` : a.titulo}</b>: {a.frases.join("; ")}</li>
            {/each}
          </ul>
        {/if}
        {#if simulacion.avisos.length}
          <h4>Saltarán estos avisos</h4>
          <ul>
            {#each simulacion.avisos as x, i (`${x.aviso.pieza}|${x.aviso.id}|${x.aviso.sobre ?? ""}|${i}`)}
              <li class="aviso">
                {#if x.aviso.clase === "sugerencia"}<Lightbulb class="i" /><span class="solo-lector">Sugerencia:</span>
                {:else}<TriangleAlert class="i" /><span class="solo-lector">Aviso:</span>{/if}
                <span>{x.aviso.mensaje}{#if x.reglas.length} <small>({x.reglas.map((r) => r.id).join(", ")})</small>{/if}</span>
              </li>
            {/each}
          </ul>
        {/if}
        {#if !simulacion.afectadas.length && !simulacion.avisos.length}<p class="libre">No cambia nada más ni salta ningún aviso.</p>{/if}
      {/if}
    </section>
  </aside>
  </div>
</div>

<style>
  .si-la-creas {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .si-la-creas ul {
    list-style: none;
    margin: 4px 0 8px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .si-la-creas b {
    font-weight: 500;
    color: var(--ink);
  }
  .si-la-creas .aviso {
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  .si-la-creas .aviso :global(.i) {
    width: 13px;
    height: 13px;
    flex: none;
    margin-top: 2px;
    color: var(--warn);
  }
  .nueva {
    display: flex;
    max-width: 96vw;
    max-height: 90vh;
  }
  .guias {
    width: 320px;
    flex: none;
    border-left: 1px solid var(--line);
    padding: 20px 20px 12px;
    overflow-y: auto;
    background: var(--surface-2);
  }
  .guias h3 {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 4px;
    font: 500 11.5px var(--sans);
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .guias h4 {
    margin: 14px 0 0;
    font: 500 12px var(--sans);
    color: var(--ink-2);
  }
  .guias .maxim p {
    font-size: 14px;
  }
  .guias small {
    display: block;
    margin-top: 3px;
    font-size: 11.5px;
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
  .libre {
    margin: 10px 0 0;
    font: italic 400 15px/1.4 var(--serif);
    color: var(--ink-2);
  }
  .en {
    font: 13px var(--mono);
    color: var(--ink-2);
  }
  .campo {
    width: 100%;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    padding: 7px 10px;
    font: 400 15px/1.3 var(--sans);
  }
  .opc.dos {
    grid-template-columns: 1fr 1fr;
  }
  .opc.actos-opc {
    grid-template-columns: repeat(5, 1fr);
  }
  .opc button:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .botones {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .btn:disabled {
    cursor: default;
    background: var(--hover);
    color: var(--ink-2);
  }
</style>
