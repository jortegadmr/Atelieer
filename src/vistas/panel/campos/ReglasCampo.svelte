<script lang="ts">
  // Reglas de la guía bajo un campo (spec 004, RF-10 a RF-16): código, texto,
  // fuente, marca, avisos y lo que se puede hacer. Todo como texto plano.
  import type { Aviso } from "../../../lib/comprobaciones";
  import type { Regla } from "../../../lib/guia/guia-md";
  import type { EstadoRegla } from "../../../lib/guia/marcas";
  import MarcaRegla from "./MarcaRegla.svelte";

  const {
    reglas,
    idZona,
    alLoSe,
    alVer,
  }: {
    reglas: { regla: Regla; e: EstadoRegla }[];
    /** Prefijo de los ids que describen el campo (solo el texto, sin los botones) */
    idZona: string;
    /** Silenciar (true) o volver a activar (false) los avisos de esa regla */
    alLoSe: (regla: Regla, aviso: Aviso, silenciar: boolean) => void;
    alVer: (regla: Regla) => void;
  } = $props();

  const avisa = (e: EstadoRegla) => e.marca === "no" || e.marca === "sugerencia";
</script>

{#each reglas as { regla, e }, n (regla.id)}
  <div class="regla">
    <div id="{idZona}-{n}">
      <div class="cab">
        <span class="ref">{regla.id}</span>
        <p>{regla.texto}</p>
      </div>
      <small><span class="fuente">{regla.fuente}</span><MarcaRegla marca={e.marca} /></small>
      {#if e.avisos.length}
        <ul>
          {#each e.avisos as a, i (i)}<li>{a.mensaje}</li>{/each}
        </ul>
      {/if}
    </div>
    {#if avisa(e) || e.marca === "lose"}
      <div class="acciones">
        {#if avisa(e)}
          <button class="btn ghost" data-accion="lose" data-regla={regla.id} onclick={() => alLoSe(regla, e.avisos[0], true)}>
            Lo sé<span class="solo-lector">&nbsp;({regla.id})</span>{#if e.comparten.length}&nbsp;· también {e.comparten.join(", ")}{/if}
          </button>
        {:else}
          <button class="btn ghost" data-accion="quitar" data-regla={regla.id} onclick={() => alLoSe(regla, e.avisos[0], false)}>Quitar «lo sé»<span class="solo-lector">&nbsp;({regla.id})</span></button>
        {/if}
        <button class="btn ghost" data-accion="ver" data-regla={regla.id} onclick={() => alVer(regla)}>Ver en la Guía<span class="solo-lector">&nbsp;({regla.id})</span></button>
      </div>
    {/if}
  </div>
{/each}

<style>
  .regla + .regla {
    border-top: 1px solid var(--line);
    padding-top: 8px;
    margin-top: 8px;
  }
  .cab {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .cab p {
    margin: 0;
    font: 400 14px/1.35 var(--serif);
    color: var(--ink);
  }
  .ref {
    font: 500 10.5px var(--mono);
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 4px;
    padding: 2px 5px;
    flex: none;
    margin-top: 1px;
  }
  small {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .fuente {
    overflow-wrap: anywhere;
  }
  ul {
    margin: 6px 0 0;
    padding-left: 16px;
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }
  .acciones .btn {
    min-height: 28px;
    padding: 3px 8px;
    font-size: 12px;
    white-space: normal;
    text-align: left;
  }
</style>
