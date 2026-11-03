<script lang="ts">
  // Los avisos de la pieza elegida, arriba de su Editar (maqueta: checksFor).
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";

  const { piezaId }: { piezaId: string } = $props();
  const estado = usarEstado();

  const avisos = $derived.by(() => {
    void estado.version;
    return estado.sesion!.resultado().avisos.filter((a) => a.pieza === piezaId);
  });
</script>

{#if avisos.length}
  <div class="avisos">
    {#each avisos as a (a.id + a.mensaje)}
      <div class="warnbox" class:info={a.clase === "sugerencia"}>
        {#if a.clase === "sugerencia"}<Lightbulb class="i" />{:else}<TriangleAlert class="i" />{/if}
        <span>
          {a.mensaje} <b>{a.fuente}</b>
          <button class="lose" onclick={() => estado.sesion!.loSe(a, true)}>Lo sé</button>
        </span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .avisos {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 20px 0;
  }
  b {
    font-weight: 500;
  }
  .lose {
    color: var(--ink-3);
    font-size: 11.5px;
    margin-left: 6px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .lose:hover {
    color: var(--ink);
  }
</style>
