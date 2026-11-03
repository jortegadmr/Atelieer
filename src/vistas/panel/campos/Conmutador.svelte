<script lang="ts" generics="V extends string">
  // Elegir uno entre pocos valores (madurez, estado, tipo…), como en la maqueta.
  import type { Snippet } from "svelte";

  const {
    etiqueta = "",
    ref = "",
    opciones,
    valor,
    alCambiar,
    mono = false,
    marca,
  }: {
    etiqueta?: string;
    ref?: string;
    opciones: readonly { valor: V; texto: string }[];
    valor: V;
    alCambiar: (v: V) => void;
    /** A, B, C con letra fija en vez de botones pequeños */
    mono?: boolean;
    /** Algo antes del texto de cada opción (un punto de madurez, un icono) */
    marca?: Snippet<[V]>;
  } = $props();
</script>

<div class="f">
  {#if etiqueta}<span class="lbl">{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</span>{/if}
  <span class="tg" class:sm={!mono} role="radiogroup" aria-label={etiqueta}>
    {#each opciones as o (o.valor)}
      <button type="button" role="radio" aria-checked={o.valor === valor} class:on={o.valor === valor} onclick={() => alCambiar(o.valor)}>
        {#if marca}{@render marca(o.valor)}{/if}{o.texto}
      </button>
    {/each}
  </span>
</div>

<style>
  .lbl {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
</style>
