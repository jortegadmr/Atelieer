<script lang="ts">
  // «Lado a lado» (spec 006, RF-23, RF-44): una pieza en dos columnas, con
  // todos sus campos y lo que cambia marcado con texto. Esc o «Cerrar» la
  // cierran y el foco vuelve a donde estaba.
  import { onDestroy } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { comprobar } from "../../lib/comprobaciones";
  import { ladoALado } from "../../lib/variantes/lado-a-lado";

  const estado = usarEstado();

  const datos = $derived.by(() => {
    void estado.version;
    const l = estado.ladoALado!;
    // Si los dos modelos son los de la sesión, sus avisos ya están calculados
    const avisos = (m: typeof l.izq.modelo) =>
      m === estado.sesionSerie?.modelo ? estado.sesionSerie.resultado().avisos : m === estado.variante?.modelo ? estado.variante.resultado().avisos : comprobar(m).avisos;
    return ladoALado(l.pieza, l.izq.modelo, l.der.modelo, avisos(l.izq.modelo), avisos(l.der.modelo), l.enSerie);
  });
  const l = $derived(estado.ladoALado!);

  $effect(() => estado.capas.abrir(() => estado.cerrarLadoALado()));
  const antes = document.activeElement as HTMLElement | null;
  onDestroy(() => {
    if (antes && antes.isConnected) antes.focus();
  });

  let caja = $state<HTMLElement | null>(null);
  $effect(() => {
    caja?.querySelector<HTMLElement>(".cerrar")?.focus();
  });
  function atrapar(e: KeyboardEvent) {
    if (e.key !== "Tab" || !caja) return;
    const enfocables = [...caja.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']")];
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
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="velo" onclick={() => estado.cerrarLadoALado()}>
  <div class="card lado" role="dialog" aria-modal="true" aria-labelledby="titulo-lado" tabindex="-1" bind:this={caja} onkeydown={atrapar} onclick={(e) => e.stopPropagation()}>
    <div class="cab">
      <h2 id="titulo-lado">Lado a lado</h2>
      <span class="nombre">{l.nombre}</span>
      <button class="btn cerrar" onclick={() => estado.cerrarLadoALado()}>Cerrar</button>
    </div>
    <!-- La tabla se desplaza: con el foco se baja con el teclado -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="cuerpo" tabindex="0" role="region" aria-label="Las dos versiones">
      <table>
        <thead>
          <tr>
            <th scope="col"><span class="solo-lector">Campo</span></th>
            <th scope="col">{l.izq.titulo}{datos.izquierda ? ` · ${datos.izquierda.titulo}` : ""}</th>
            <th scope="col">{l.der.titulo}{datos.derecha ? ` · ${datos.derecha.titulo}` : ""}</th>
          </tr>
        </thead>
        <tbody>
          {#if !datos.izquierda || !datos.derecha}
            <tr class="falta">
              <td></td>
              <td>{datos.izquierda ? "" : "No existe ahora"}</td>
              <td>{datos.derecha ? "" : "Sale en la variante"}</td>
            </tr>
          {/if}
          {#each datos.filas as f, i (i)}
            <tr class:cambia={f.cambia}>
              <th scope="row">
                {f.etiqueta}
                {#if f.cambia}<span class="marca">cambia</span>{/if}
                {#if f.enSerie}<span class="marca serie">cambió en la serie</span>{/if}
              </th>
              <td>{f.izquierda}</td>
              <td>{f.derecha}</td>
            </tr>
          {/each}
          <tr class="avisos">
            <th scope="row">Avisos</th>
            <td>{#each datos.izquierda?.avisos ?? [] as a, j (j)}<p>{a.mensaje}</p>{:else}<p class="nada">Ninguno</p>{/each}</td>
            <td>{#each datos.derecha?.avisos ?? [] as a, j (j)}<p>{a.mensaje}</p>{:else}<p class="nada">Ninguno</p>{/each}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .lado {
    width: min(980px, 96vw);
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    padding: 18px 20px;
    gap: 12px;
  }
  .cab {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .cab h2 {
    font: 400 26px/1.1 var(--serif);
    margin: 0;
  }
  .nombre {
    color: var(--ink-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .cerrar {
    margin-left: auto;
  }
  .cuerpo {
    overflow: auto;
    min-height: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    table-layout: fixed;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
    overflow-wrap: anywhere;
  }
  thead th {
    color: var(--ink-2);
    font-weight: 500;
    position: sticky;
    top: 0;
    background: var(--surface);
  }
  thead th:first-child,
  tbody th {
    width: 26%;
  }
  tbody th {
    font-weight: 500;
    color: var(--ink-2);
  }
  tr.cambia td {
    color: var(--ink);
    background: var(--surface-2);
  }
  tr.cambia td:last-child {
    border-left: 2px dashed var(--accent);
  }
  .marca {
    display: inline-block;
    margin-left: 6px;
    font-size: 11px;
    color: var(--accent);
  }
  .marca.serie {
    color: var(--warn);
  }
  .falta td {
    color: var(--ink-2);
    font-style: italic;
  }
  .avisos p {
    margin: 0 0 4px;
  }
  .nada {
    color: var(--ink-3);
  }
</style>
