<script lang="ts">
  import { darEstado } from "../lib/app/contexto";
  import type { EstadoApp } from "../lib/app/estado.svelte";
  import Carcasa from "./Carcasa.svelte";
  import Inicio from "./Inicio.svelte";

  const { estado }: { estado: EstadoApp } = $props();
  // svelte-ignore state_referenced_locally
  darEstado(estado);
</script>

{#if estado.sesion}
  <Carcasa />
{:else}
  <Inicio />
{/if}
