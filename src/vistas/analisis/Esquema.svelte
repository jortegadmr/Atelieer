<script lang="ts">
  // Esquema (spec 010, RF-38 a RF-44): la temporada como texto, episodio →
  // acto → escena. Clic en una escena la abre en el panel; «Copiar» lleva el
  // Markdown al portapapeles o, si no se puede, lo enseña seleccionado.
  import { usarEstado } from "../../lib/app/contexto";
  import CopiarTexto from "../comunes/CopiarTexto.svelte";
  import { esquema, esquemaMarkdown, estaVacio, lineaEscena, type EscenaEsquema } from "../../lib/vistas/esquema";

  const { temporada }: { temporada: string } = $props();
  const estado = usarEstado();

  const e = $derived.by(() => {
    void estado.version;
    return esquema(estado.sesion!.modelo, temporada);
  });

  // RF-43: con lente, las escenas no relacionadas
  const fuera = (id: string) => !!estado.relacionLente && !estado.relacionLente.escenas.has(id);

  const abrir = (x: EscenaEsquema) => estado.elegir(x.id, "editar");
</script>

{#snippet escenas(lista: EscenaEsquema[])}
  <ul class="escenas">
    {#each lista as x (x.id)}
      {@const f = fuera(x.id)}
      <li>
        <button class:fuera-lente={f} title="Abrir en el panel" onclick={() => abrir(x)}>
          {lineaEscena(x)}{#if f}<span class="solo-lector">, fuera de la lente</span>{/if}
        </button>
      </li>
    {/each}
  </ul>
{/snippet}

{#if estaVacio(e)}
  <p class="hint">Esta temporada está vacía</p>
{:else}
  <CopiarTexto etiqueta="Copiar" hecho="Esquema copiado al portapapeles" obtener={() => esquemaMarkdown(e)} ariaCaja="Esquema en Markdown para copiar" reiniciar={temporada} />
  <div class="esquema">
    <h2>{[e.codigo, e.titulo].filter(Boolean).join(" · ")}</h2>
    {#each e.episodios as ep (ep.id)}
      <section>
        <h3>{[ep.codigo, ep.titulo].filter(Boolean).join(" · ") || "Sin título"}</h3>
        {#each ep.actos as a (a.acto)}
          <h4>{a.nombre}</h4>
          {@render escenas(a.escenas)}
        {/each}
      </section>
    {/each}
    {#if e.bandeja.length}
      <section>
        <h3>Bandeja</h3>
        {@render escenas(e.bandeja)}
      </section>
    {/if}
  </div>
{/if}

<style>
  .esquema {
    max-width: 760px;
  }
  h2 {
    margin: 0 0 6px;
    font: 400 22px/1.2 var(--serif);
  }
  h3 {
    margin: 18px 0 4px;
    font: 500 14px var(--sans);
    color: var(--ink);
  }
  h4 {
    margin: 8px 0 2px;
    font: 500 11px var(--mono);
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .escenas {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .escenas button {
    display: block;
    width: 100%;
    padding: 4px 8px;
    border-radius: 6px;
    text-align: left;
    font-size: 13px;
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  .escenas button:hover {
    background: var(--hover);
    color: var(--ink);
  }
  .escenas button.fuera-lente {
    color: var(--ink-3);
  }
</style>
