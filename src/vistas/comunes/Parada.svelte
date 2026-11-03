<script lang="ts">
  // Papel del evento como parada de metro (spec 5.7): abre = anillo;
  // avanza = punto; gira = círculo medio relleno; cierra = barra.
  import { etiqueta, PAPEL, type Papel } from "../../lib/modelo/vocabulario";

  const { papel, color, tam = 16 }: { papel: Papel; color: string; tam?: number } = $props();
</script>

<svg width={tam} height={tam} viewBox="0 0 16 16" role="img" aria-label={etiqueta(PAPEL, papel)}>
  {#if papel === "abre"}
    <circle cx="8" cy="8" r="5.2" fill="var(--surface)" stroke={color} stroke-width="2.6" />
  {:else if papel === "avanza"}
    <circle cx="8" cy="8" r="3.6" fill={color} />
  {:else if papel === "gira"}
    <circle cx="8" cy="8" r="5.2" fill="var(--surface)" stroke={color} stroke-width="2" />
    <path d="M8 2.8A5.2 5.2 0 0 1 8 13.2Z" fill={color} />
  {:else}
    <rect x="5.6" y="1.4" width="4.8" height="13.2" rx="2.4" fill={color} />
  {/if}
</svg>
