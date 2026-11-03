<script lang="ts">
  // Carga inicial y final (§12): dorada si sube, acero si baja, discontinua
  // y en color de aviso si no cambia. Como `charge()` de la maqueta.
  import type { ParCarga } from "../../lib/modelo/tipos";
  import { signoCarga as signo } from "../../lib/vistas/textos";

  const { carga, texto = true }: { carga: ParCarga; texto?: boolean } = $props();

  const y = (v: string) => (v === "+" ? 3 : v === "-" ? 11 : 7);
  const decidida = $derived(carga[0] !== "" && carga[1] !== "");
  const plana = $derived(decidida && carga[0] === carga[1]);
  const color = $derived(!decidida ? "var(--line-2)" : plana ? "var(--warn)" : carga[1] === "+" ? "var(--plus)" : "var(--minus)");
</script>

<span class="cg">
  <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
    <path
      d="M3 {y(carga[0])}L23 {y(carga[1])}"
      stroke={color}
      stroke-width="2"
      stroke-linecap="round"
      stroke-dasharray={plana || !decidida ? "2 3" : undefined}
    />
    <circle cx="3" cy={y(carga[0])} r="2" fill={color} />
    <circle cx="23" cy={y(carga[1])} r="2" fill={color} />
  </svg>
  {#if texto}{signo(carga[0])}<span class="flecha">→</span>{signo(carga[1])}{/if}
</span>

<style>
  .flecha {
    color: var(--ink-3);
  }
</style>
