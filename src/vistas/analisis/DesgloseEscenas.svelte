<script lang="ts">
  // La tabla del desglose (spec 014, RF-1, RF-4 a RF-8): una fila por escena,
  // en grupos por locación, episodio o personaje. Una marca dice de dónde sale
  // cada dato: del guion o de los campos de la escena. Pinchar una escena la abre
  // en «Guion» (o en el panel si no tiene guion); aquí no se cambia nada.
  import { usarEstado } from "../../lib/app/contexto";
  import type { EstadoDesglose } from "../../lib/app/estado-desglose.svelte";
  import { COLUMNAS, agrupar, minutos, valorDe, type Agrupar, type FilaDesglose, type Origen } from "../../lib/desglose/desglose";

  const { d, filas, nombreEpisodio }: { d: EstadoDesglose; filas: FilaDesglose[]; nombreEpisodio: (id: string) => string } = $props();
  const estado = usarEstado();

  const AGRUPAR: Array<{ id: Agrupar; texto: string }> = [
    { id: "locacion", texto: "Por locación" },
    { id: "episodio", texto: "Por episodio" },
    { id: "personaje", texto: "Por personaje" },
  ];

  const cols = $derived(COLUMNAS.filter((c) => d.columnas.includes(c.id)));
  const grupos = $derived(agrupar(filas, d.agrupar, nombreEpisodio));

  const escenas = (n: number) => (n === 1 ? "1 escena" : `${n} escenas`);
  const TEXTO_ORIGEN: Record<Exclude<Origen, "guion">, string> = {
    escena: "Sale de los campos de la escena: el guion no lo dice",
    ninguno: "Ni el guion ni la escena lo dicen",
  };
  const titulo = (x: FilaDesglose) => x.titulo || "Sin título";

  function alternarColumna(id: (typeof COLUMNAS)[number]["id"]) {
    d.columnas = d.columnas.includes(id) ? d.columnas.filter((c) => c !== id) : COLUMNAS.map((c) => c.id).filter((c) => c === id || d.columnas.includes(c));
  }
</script>

<div class="barra">
  <div class="seg agrupar" role="group" aria-label="Agrupar escenas">
    {#each AGRUPAR as a (a.id)}
      <button class:on={d.agrupar === a.id} aria-pressed={d.agrupar === a.id} onclick={() => (d.agrupar = a.id)}>{a.texto}</button>
    {/each}
  </div>
  <details class="columnas">
    <summary>Columnas</summary>
    <div class="lista-cols">
      {#each COLUMNAS as c (c.id)}
        <label><input type="checkbox" checked={d.columnas.includes(c.id)} onchange={() => alternarColumna(c.id)} />{c.nombre}</label>
      {/each}
    </div>
  </details>
</div>

{#if !filas.length}
  <div class="vacio">
    <p class="hint">Ninguna escena cumple los filtros.</p>
    <button class="btn" onclick={() => d.quitarFiltros()}>Quitar los filtros</button>
  </div>
{:else if !cols.length}
  <p class="hint">Elige alguna columna para ver la tabla.</p>
{:else}
  {#each grupos as g (g.clave + "|" + g.nombre)}
    <section class="grupo" aria-label={g.nombre}>
      <h3>
        <span class="nombre">{g.nombre}</span>
        <span class="resumen">
          {escenas(g.filas.length)} · {minutos(g.segundos)} min{g.sinGuion ? ` · ${g.sinGuion} sin guion` : ""}
        </span>
      </h3>
      {#if g.personajes.length && d.agrupar !== "personaje"}<p class="quienes">{g.personajes.join(", ")}</p>{/if}
      <div class="caja-tabla">
        <table class="tabla-d">
          <thead>
            <tr>
              {#each cols as c (c.id)}<th scope="col" class={c.id}>{c.nombre}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each g.filas as x (x.id)}
              <tr class:sin={!x.conGuion} class:descartada={x.estado === "descartado"}>
                {#each cols as c (c.id)}
                  <td class={c.id}>
                    {#if c.id === "titulo"}
                      <button class="enlace" title={x.conGuion ? "Abrir en Guion" : "Abrir en el panel (no tiene guion)"} onclick={() => estado.irAGuionDe(x.id, x.conGuion)}>{titulo(x)}</button>
                    {:else if c.id === "locacion"}
                      {valorDe(x, c.id) || "—"}{#if x.origenLocaciones !== "guion" && x.locaciones.length}<span class="origen" title={TEXTO_ORIGEN[x.origenLocaciones as "escena"]}>escena</span>{/if}
                    {:else if c.id === "personajes"}
                      {valorDe(x, c.id) || "—"}{#if x.origenPersonajes !== "guion" && x.personajes.length}<span class="origen" title={TEXTO_ORIGEN[x.origenPersonajes as "escena"]}>escena</span>{/if}
                    {:else}
                      {valorDe(x, c.id) || "—"}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/each}
{/if}

<style>
  .barra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    margin-bottom: 10px;
  }
  .agrupar {
    margin-left: 0;
  }
  .columnas {
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .columnas summary {
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 6px;
  }
  .columnas summary:hover {
    background: var(--hover);
  }
  .lista-cols {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    padding: 8px 6px;
  }
  .lista-cols label {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .vacio {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 0;
  }
  .grupo {
    margin-bottom: 18px;
  }
  .grupo h3 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    margin: 0 0 4px;
    font-size: 14px;
  }
  .grupo .resumen {
    font: 12px var(--mono);
    color: var(--ink-3);
    font-weight: 400;
  }
  .quienes {
    margin: 0 0 6px;
    font-size: 12.5px;
    color: var(--ink-3);
  }
  .tabla-d {
    border-collapse: collapse;
    font-size: 12.5px;
    min-width: 100%;
  }
  .tabla-d th,
  .tabla-d td {
    text-align: left;
    vertical-align: top;
    padding: 6px 10px;
    border-bottom: 1px solid var(--line);
  }
  .tabla-d thead th {
    font: 500 11px var(--mono);
    color: var(--ink-2);
    background: var(--surface-2);
    white-space: nowrap;
  }
  .tabla-d td.codigo,
  .tabla-d td.episodio,
  .tabla-d td.minutos,
  .tabla-d td.ie {
    font: 12px var(--mono);
    white-space: nowrap;
  }
  .tabla-d td.minutos {
    text-align: right;
  }
  .tabla-d tr.sin td {
    color: var(--ink-2);
  }
  .tabla-d tr.descartada td {
    color: var(--ink-3);
    text-decoration: line-through;
    text-decoration-color: var(--line-2);
  }
  .enlace {
    text-align: left;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .enlace:hover {
    color: var(--accent);
  }
  .origen {
    margin-left: 6px;
    font: 10.5px var(--mono);
    color: var(--ink-3);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 5px;
  }
</style>
