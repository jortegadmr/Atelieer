<script lang="ts">
  import { onMount } from "svelte";
  import { FsTauri } from "./lib/almacen/fs-tauri";
  import { EstadoApp } from "./lib/app/estado.svelte";
  import { alCerrarVentana, nombreEquipo, ponerMenuMac } from "./lib/app/plataforma";
  import Raiz from "./vistas/Raiz.svelte";

  let estado = $state.raw<EstadoApp | null>(null);

  const enTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  onMount(async () => {
    if (import.meta.env.DEV && !enTauri()) {
      // Solo al programar, en un navegador normal: serie de prueba en memoria
      const { estadoDemo } = await import("./lib/app/demo");
      estado = await estadoDemo();
      return;
    }
    const e = new EstadoApp(new FsTauri(), nombreEquipo);
    estado = e;
    void ponerMenuMac().catch(() => undefined);
    void alCerrarVentana(() => e.cerrar()).catch(() => undefined);
    void e.listar();
  });
</script>

{#if estado}
  <Raiz {estado} />
{/if}
