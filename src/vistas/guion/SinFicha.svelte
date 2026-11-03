<script lang="ts">
  // Una referencia del guion sin ficha, o con varias (spec 019, RF-4 y RF-5):
  // lo dice a la vista y deja crearla o elegir cuál abrir. No escribe nada por
  // sí misma: crear va por el Mundo (spec 015).
  import X from "@lucide/svelte/icons/x";

  type Props = {
    nombre: string;
    /** Las fichas con ese nombre, si es ambiguo (ruta relativa al vault) */
    candidatas: { nombre: string; ruta: string }[];
    alElegir: (ruta: string) => void;
    /** Sin él (variante abierta, ruta no válida), no se ofrece crear */
    alCrear?: (tipo: "personaje" | "lugar") => void;
    /** Lo que salió mal al crear, si algo */
    aviso?: string;
    alCerrar: () => void;
  };
  let { nombre, candidatas, alElegir, alCrear, aviso = "", alCerrar }: Props = $props();

  // El foco entra una vez, al aparecer la tarjeta
  let cerrar = $state<HTMLButtonElement>();
  $effect(() => {
    cerrar?.focus();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<aside class="ficha" aria-label="Referencia sin ficha" onkeydown={(e) => e.key === "Escape" && (e.stopPropagation(), alCerrar())}>
  <header>
    <h3>«{nombre}»</h3>
    <button bind:this={cerrar} class="btn ghost" aria-label="Cerrar" onclick={alCerrar}><X class="i" /></button>
  </header>
  {#if candidatas.length > 1}
    <p>Hay {candidatas.length} fichas con ese nombre. ¿Cuál abrir?</p>
    {#each candidatas as f (f.ruta)}
      <button class="btn" onclick={() => alElegir(f.ruta)}>{f.nombre} <small>{f.ruta}</small></button>
    {/each}
  {:else}
    <p>No tiene ficha en la wiki.</p>
    {#if alCrear}
      <div class="acciones">
        <button class="btn pri" onclick={() => alCrear("personaje")}>Crear personaje</button>
        <button class="btn" onclick={() => alCrear("lugar")}>Crear lugar</button>
      </div>
    {/if}
  {/if}
  {#if aviso}<p class="aviso" role="alert">{aviso}</p>{/if}
  <button class="btn ghost cerrar" onclick={alCerrar}>Cerrar</button>
</aside>

<style>
  .ficha {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--line-2);
    border-radius: 10px;
    background: var(--surface);
    font-size: 13px;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  h3 {
    margin: 2px 0 0;
    font: 400 22px/1.15 var(--serif);
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
    color: var(--ink-2);
  }
  .aviso {
    color: var(--ink);
  }
  small {
    color: var(--ink-3);
    font: 400 11px var(--mono);
  }
  .acciones {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cerrar {
    align-self: flex-start;
  }
</style>
