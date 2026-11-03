<script lang="ts">
  // La curva del cambio de valor del episodio (spec 003, RF-16): un tramo por
  // escena, de su valor al empezar al de acabar (+ arriba, − abajo). Es solo
  // un apoyo visual: lo mismo va en texto en cada tarjeta (aria-hidden).
  import type { TramoCurva } from "../../lib/vistas/actos";

  const { tramos }: { tramos: TramoCurva[] } = $props();

  const ANCHO = 40;
  const y = (v: "+" | "-" | null) => (v === "+" ? 4 : 20);
  const color = (t: TramoCurva) => (t.igual ? "var(--warn)" : t.hasta === "+" ? "var(--plus)" : "var(--minus)");
</script>

{#if tramos.length}
  <svg class="curva" viewBox="0 0 {tramos.length * ANCHO} 24" preserveAspectRatio="none" aria-hidden="true">
    {#each tramos as t, i (t.id)}
      {#if t.desde && t.hasta}
        <path
          d="M{i * ANCHO + 4} {y(t.desde)}L{(i + 1) * ANCHO - 4} {y(t.hasta)}"
          stroke={color(t)}
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray={t.igual ? "3 3" : undefined}
          vector-effect="non-scaling-stroke"
        />
        {#if t.igual}<rect x={i * ANCHO + ANCHO / 2 - 3} y={y(t.desde) - 3} width="6" height="6" fill="var(--warn)" />{/if}
      {/if}
    {/each}
  </svg>
{/if}
