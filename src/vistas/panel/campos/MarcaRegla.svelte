<script lang="ts">
  // Marca de una regla en una pieza (spec 004): icono y texto, nunca solo color.
  import BellOff from "@lucide/svelte/icons/bell-off";
  import Check from "@lucide/svelte/icons/check";
  import CirclePause from "@lucide/svelte/icons/circle-pause";
  import CircleDashed from "@lucide/svelte/icons/circle-dashed";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import type { EstadoMarca } from "../../../lib/guia/marcas";

  const { marca }: { marca: EstadoMarca } = $props();

  const TEXTO: Record<EstadoMarca, string> = {
    ok: "Se cumple",
    no: "No se cumple",
    sugerencia: "Sugerencia",
    lose: "Lo sé",
    juzgas: "La juzgas tú",
    aparcada: "No se comprueba: está aparcada",
    descartada: "No se comprueba: está descartada",
  };
</script>

<span class="marca-regla {marca}">
  {#if marca === "ok"}<Check class="i" />
  {:else if marca === "no"}<TriangleAlert class="i" />
  {:else if marca === "sugerencia"}<Lightbulb class="i" />
  {:else if marca === "lose"}<BellOff class="i" />
  {:else if marca === "juzgas"}<CircleDashed class="i" />
  {:else}<CirclePause class="i" />{/if}
  {TEXTO[marca]}
</span>

<style>
  .marca-regla {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .marca-regla :global(.i) {
    width: 13px;
    height: 13px;
  }
  .ok {
    color: var(--ok);
  }
  .no {
    color: var(--warn);
  }
  .sugerencia {
    color: var(--ink-2);
  }
</style>
