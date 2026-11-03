<script lang="ts">
  import FileWarning from "@lucide/svelte/icons/file-x";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Users from "@lucide/svelte/icons/users";
  import { usarEstado } from "../../lib/app/contexto";

  const estado = usarEstado();

  const s = $derived.by(() => {
    void estado.version;
    const x = estado.sesion!;
    return { aviso: x.avisoUso, conflictos: x.conflictos.length, problemas: x.problemas.length };
  });
</script>

{#if estado.vista !== "sincronizacion" && (s.aviso || s.conflictos || s.problemas)}
  <div class="avisos">
    {#if s.aviso}
      <div class="warnbox">
        <Users class="i" />
        <span>{s.aviso}. Si editas aquí a la vez, el servicio de sincronización puede crear conflictos.</span>
      </div>
    {/if}
    {#if s.conflictos}
      <div class="warnbox">
        <TriangleAlert class="i" />
        <span>
          Hay {s.conflictos}
          {s.conflictos === 1 ? "conflicto" : "conflictos"} de sincronización. Atelier no junta nada solo.
          <button class="enlace" onclick={() => estado.cambiarVista("sincronizacion")}>Ver las dos versiones</button>
        </span>
      </div>
    {/if}
    {#if s.problemas}
      <div class="warnbox">
        <FileWarning class="i" />
        <span>
          {s.problemas}
          {s.problemas === 1 ? "fichero no se puede leer y se ha dejado fuera" : "ficheros no se pueden leer y se han dejado fuera"}.
          <button class="enlace" onclick={() => estado.cambiarVista("sincronizacion")}>Ver cuáles</button>
        </span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .avisos {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 22px;
  }
  .enlace {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
    margin-left: 4px;
  }
</style>
