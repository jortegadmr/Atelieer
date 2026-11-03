<script lang="ts">
  // Carga + o − (§12). Pulsar la que ya está elegida la deja sin decidir.
  import type { Carga } from "../../../lib/modelo/vocabulario";

  const { etiqueta, valor, alCambiar }: { etiqueta: string; valor: Carga | ""; alCambiar: (v: Carga | "") => void } = $props();
  const elegir = (v: Carga) => alCambiar(valor === v ? "" : v);
</script>

<div class="f">
  <span class="lbl">{etiqueta}</span>
  <span class="tg" role="radiogroup" aria-label={etiqueta}>
    <button type="button" role="radio" aria-checked={valor === "+"} class:on={valor === "+"} onclick={() => elegir("+")}>+</button>
    <button type="button" role="radio" aria-checked={valor === "-"} class:on={valor === "-"} onclick={() => elegir("-")}>−</button>
  </span>
</div>

<style>
  .lbl {
    display: block;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
</style>
