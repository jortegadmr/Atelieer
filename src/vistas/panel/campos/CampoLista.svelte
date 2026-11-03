<script lang="ts">
  // Lista de textos que se añaden y se quitan.
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";

  const {
    etiqueta,
    valores,
    alCambiar,
    ref = "",
    pista = "",
    otro = "Añadir",
  }: {
    etiqueta: string;
    valores: string[];
    alCambiar: (v: string[]) => void;
    ref?: string;
    pista?: string;
    otro?: string;
  } = $props();

  const cambiar = (i: number, v: string) => alCambiar(valores.map((x, j) => (j === i ? v : x)));
  const quitar = (i: number) => alCambiar(valores.filter((_, j) => j !== i));
</script>

<div class="f">
  <span class="lbl">{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</span>
  <div class="lista">
    {#each valores as v, i (i)}
      <div class="fila">
        <input class="v" class:ph={!v} value={v} placeholder={pista} oninput={(e) => cambiar(i, e.currentTarget.value)} />
        <button type="button" class="quitar" aria-label="Quitar" title="Quitar" onclick={() => quitar(i)}><X class="i" /></button>
      </div>
    {/each}
    <button type="button" class="mas" onclick={() => alCambiar([...valores, ""])}><Plus class="i" />{otro}</button>
  </div>
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
  .lista {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fila {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .fila .v {
    flex: 1;
  }
  .quitar {
    color: var(--ink-3);
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
  }
  .quitar:hover {
    background: var(--hover);
    color: var(--ink);
  }
  .mas {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-3);
    font-size: 12px;
    align-self: flex-start;
    padding: 2px 0;
  }
  .mas:hover {
    color: var(--ink);
  }
</style>
