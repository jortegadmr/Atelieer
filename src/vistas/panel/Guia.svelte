<script lang="ts">
  // Pestaña Guía (spec 5.5, T6.4): las máximas que aplican a la pieza, con su
  // referencia y una marca: se cumple, no se cumple o no se puede comprobar.
  import BookOpenText from "@lucide/svelte/icons/book-open-text";
  import FilePlus from "@lucide/svelte/icons/file-plus";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import { tick } from "svelte";
  import { estadoRegla, reglasDe } from "../../lib/guia/marcas";
  import type { Pieza } from "../../lib/modelo/tipos";
  import GuiaSerie from "./GuiaSerie.svelte";
  import MarcaRegla from "./campos/MarcaRegla.svelte";

  const { pieza }: { pieza: Pieza } = $props();
  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    if (!s.guia) return null;
    const r = s.resultado();
    return {
      reglas: reglasDe(s.guia, pieza).map((regla) => ({ regla, marca: estadoRegla(s.guia!, regla, pieza, r, s.modelo).marca })),
      avisos: s.guia.avisos,
    };
  });

  // «Ver en la Guía» (spec 004, RF-16): desplaza, enfoca y resalta la regla
  let lista = $state<HTMLElement | null>(null);
  let senalada = $state<string | null>(null);
  $effect(() => {
    const id = estado.reglaSenalada;
    if (!id || !lista) return;
    estado.reglaSenalada = null;
    senalada = id;
    void tick().then(() => {
      // Por dataset, no por selector: el id viene de un archivo editado a mano
      const el = [...lista!.querySelectorAll<HTMLElement>(".maxim")].find((x) => x.dataset.regla === id);
      el?.scrollIntoView({ block: "nearest" });
      el?.focus();
    });
  });
</script>

<div class="ib-body">
  <div class="gsrc">
    <BookOpenText class="i" style="width:13px;height:13px" />Máximas de <span class="wkpath">Chuleta de escritura</span>, plantillas y reglas del vault
  </div>

  {#if pieza.tipo === "serie"}<GuiaSerie serie={pieza} />{/if}

  {#if !d}
    <div class="warnbox">
      <TriangleAlert class="i" />
      <span>No hay <span class="wkpath">appDatos/guia.md</span>. Atelier puede crearlo con el primer juego de reglas, sacado de la chuleta.</span>
    </div>
    <button class="btn" disabled={!!estado.variante} title={estado.variante ? "Sal de la variante para crear guia.md." : undefined} onclick={() => estado.sesion!.crearGuia()}><FilePlus class="i" />Crear guia.md</button>
  {:else}
    <div bind:this={lista}>
      {#each d.reglas as { regla, marca: m } (regla.id)}
        <div class="maxim" class:senalada={senalada === regla.id} data-regla={regla.id} tabindex="-1">
          <span class="ref">{regla.id}</span>
          <div class="cuerpo">
            <p>{regla.texto}</p>
            <small><span class="fuente">{regla.fuente}</span><MarcaRegla marca={m} /></small>
          </div>
        </div>
      {:else}
        <p class="nada">Ninguna máxima de guia.md aplica a esta pieza.</p>
      {/each}
    </div>
    {#each d.avisos as a, i (i)}
      <div class="warnbox"><TriangleAlert class="i" /><span>guia.md: {a}</span></div>
    {/each}
    <div class="warnbox info">
      <PencilLine class="i" />
      <span>Las máximas viven en <span class="wkpath">appDatos/guia.md</span>. Si amplías una chuleta, añades la regla ahí.</span>
    </div>
    <button class="btn ghost" onclick={() => estado.sesion!.leerGuia()}><RefreshCw class="i" />Volver a leer guia.md</button>
  {/if}
</div>

<style>
  .cuerpo {
    min-width: 0;
  }
  small {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .fuente {
    overflow-wrap: anywhere;
  }
  .nada {
    color: var(--ink-3);
    font-size: 12.5px;
    margin: 0;
  }
  .btn {
    align-self: flex-start;
  }
</style>
