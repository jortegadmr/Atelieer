<script lang="ts">
  // Curva de carga + / − de los episodios (spec 4.5, 5.3; `curve()` de la
  // maqueta): dorada si sube, acero si baja, discontinua y en color de aviso
  // si no cambia; con un triángulo encima si tiene avisos de carga (C01).
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Episodio, ParCarga } from "../../lib/modelo/tipos";

  const { episodios }: { episodios: Episodio[] } = $props();
  const estado = usarEstado();

  const y = (v: string) => (v === "+" ? 6 : v === "-" ? 34 : 20);
  const color = (c: ParCarga) =>
    !c[0] || !c[1] ? "var(--line-2)" : c[0] === c[1] ? "var(--warn)" : c[1] === "+" ? "var(--plus)" : "var(--minus)";
  const plana = (c: ParCarga) => !c[0] || !c[1] || c[0] === c[1];

  // Avisos de carga (C01) de cada episodio
  const avisos = $derived.by(() => {
    void estado.version;
    const r = estado.sesion!.resultado().avisos.filter((a) => a.id.startsWith("C01"));
    return episodios.map((e) => r.filter((a) => a.pieza === e.id).map((a) => a.mensaje));
  });
</script>

<div class="curve">
  <svg viewBox="0 0 {Math.max(episodios.length, 1) * 100} 40" preserveAspectRatio="none" aria-label="Curva de carga">
    {#each episodios as e, i (e.id)}
      {@const x0 = i * 100 + 6}
      {@const x1 = i * 100 + 94}
      {@const k = color(e.carga)}
      <polygon points="{x0},{y(e.carga[0])} {x1},{y(e.carga[1])} {x1},40 {x0},40" fill={k} opacity=".10" />
      <path
        d="M{x0} {y(e.carga[0])}L{x1} {y(e.carga[1])}"
        stroke={k}
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        stroke-linecap="round"
        fill="none"
        stroke-dasharray={plana(e.carga) ? "3 4" : undefined}
      />
      {#if i < episodios.length - 1}
        <path
          d="M{x1} {y(e.carga[1])}L{x1 + 12} {y(episodios[i + 1].carga[0])}"
          stroke="var(--line-2)"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
          fill="none"
        />
      {/if}
    {/each}
  </svg>
  {#each episodios as e, i (e.id)}
    {#if avisos[i]?.length}
      <button class="wm" style:left="{((i + 0.5) / episodios.length) * 100}%" title={avisos[i].join(" · ")} onclick={() => estado.elegir(e.id)}>
        <TriangleAlert class="i" />
      </button>
    {/if}
    <button
      class="zona"
      style:left="{(i / episodios.length) * 100}%"
      style:width="{100 / episodios.length}%"
      aria-label="Carga de {e.titulo || 'este episodio'}"
      onclick={() => estado.elegir(e.id)}
    ></button>
  {/each}
</div>

<style>
  .zona {
    position: absolute;
    top: 0;
    bottom: 0;
  }
  .zona:hover {
    background: var(--hover);
  }
</style>
