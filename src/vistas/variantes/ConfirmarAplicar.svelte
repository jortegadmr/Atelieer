<script lang="ts">
  // La confirmación de «Aplicar» (spec 006, RF-32 a RF-35): junto a la variante
  // desde donde se pidió (pie de la barra, menú o «Versiones»). Dice el resumen
  // o por qué no se aplica; con canon, «Desbloquear y aplicar».
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import type { ConfirmarAplicar } from "../../lib/app/estado.svelte";

  let { id, donde }: { id: string; donde: ConfirmarAplicar["donde"] } = $props();
  const estado = usarEstado();
  const c = $derived(estado.confirmarAplicar?.id === id && estado.confirmarAplicar.donde === donde ? estado.confirmarAplicar : null);

  let caja = $state<HTMLDivElement>();
  $effect(() => {
    if (c) queueMicrotask(() => (caja?.querySelector<HTMLButtonElement>(".pri") ?? caja?.querySelector<HTMLButtonElement>("button"))?.focus());
  });

  function teclas(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      estado.cancelarAplicar();
    }
  }
</script>

{#if c}
  <div class="warnbox confirmar" class:info={c.boton === "aplicar"} role="alertdialog" tabindex="-1" aria-label="Aplicar «{c.nombre}»" bind:this={caja} onkeydown={teclas}>
    {#if c.boton === "aplicar"}<FlaskConical class="i" />{:else}<TriangleAlert class="i" />{/if}
    <div>
      {#each c.frases as f, i (i)}<p>{f}</p>{/each}
      <div class="botones">
        <button class="btn ghost" onclick={() => estado.cancelarAplicar()}>{c.boton ? "Cancelar" : "Cerrar"}</button>
        {#if c.boton === "aplicar"}
          <button class="btn pri" disabled={c.aplicando} onclick={() => estado.aplicarVariante()}>{c.aplicando ? "Aplicando…" : "Aplicar"}</button>
        {:else if c.boton === "desbloquear"}
          <button class="btn pri" disabled={c.aplicando} onclick={() => estado.aplicarVariante(true)}>{c.aplicando ? "Aplicando…" : "Desbloquear y aplicar"}</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .confirmar {
    flex-basis: 100%;
  }
  .confirmar.info :global(.i) {
    color: var(--accent);
  }
  p {
    margin: 0 0 4px;
  }
  .botones {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 6px;
  }
</style>
