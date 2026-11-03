<script lang="ts">
  // Las cuatro cajas de la temporada (spec 5.3, T4.1): punto de partida,
  // estructura, punto de llegada y cierre / cliffhanger.
  import CloudRain from "@lucide/svelte/icons/cloud-rain";
  import FishSymbol from "@lucide/svelte/icons/fish-symbol";
  import Flag from "@lucide/svelte/icons/flag";
  import Milestone from "@lucide/svelte/icons/milestone";
  import Mountain from "@lucide/svelte/icons/mountain";
  import Split from "@lucide/svelte/icons/split";
  import Sunrise from "@lucide/svelte/icons/sunrise";
  import Zap from "@lucide/svelte/icons/zap";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import type { Temporada } from "../../lib/modelo/tipos";
  import TarjetaCampo from "../tramas/TarjetaCampo.svelte";

  const { temporada }: { temporada: Temporada } = $props();
  const estado = usarEstado();
  const editar = (fn: (t: Temporada) => void) => estado.sesion!.editar<Temporada>(temporada.id, fn);

  const MOMENTOS = [
    { k: "detonante", texto: "Detonante", Icono: Zap },
    { k: "punto_medio", texto: "Punto medio", Icono: Split },
    { k: "crisis", texto: "Crisis", Icono: CloudRain },
    { k: "climax", texto: "Clímax", Icono: Mountain },
  ] as const;

  const eps = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return Object.fromEntries(MOMENTOS.map((mo) => [mo.k, c.codigo(m, temporada.estructura[mo.k].episodio).slice(3)]));
  });
  const hayEstructura = $derived(MOMENTOS.some((mo) => temporada.estructura[mo.k].texto));
</script>

<div class="beats4">
  <TarjetaCampo etiqueta="Punto de partida" ref="§12" valor={temporada.partida} pista="¿Cómo empieza todo?" alCambiar={(v) => editar((t) => (t.partida = v))}>
    {#snippet icono()}<Sunrise class="i" />{/snippet}
  </TarjetaCampo>
  <button class="bx estructura" class:empty={!hayEstructura} onclick={() => estado.elegir(temporada.id)}>
    <h3><Milestone class="i" />Estructura<span class="ref">§17</span></h3>
    {#if hayEstructura}
      <ul>
        {#each MOMENTOS as { k, texto, Icono } (k)}
          {#if temporada.estructura[k].texto}
            <li><Icono class="i" style="color:var(--t1)" />{texto}: {temporada.estructura[k].texto}{#if eps[k]} · {eps[k]}{/if}</li>
          {/if}
        {/each}
      </ul>
    {:else}
      <p class="hint">Detonante, punto medio, crisis y clímax, con su episodio.</p>
    {/if}
  </button>
  <TarjetaCampo etiqueta="Punto de llegada" ref="§12" valor={temporada.llegada} pista="¿Cómo queda todo al final?" alCambiar={(v) => editar((t) => (t.llegada = v))}>
    {#snippet icono()}<Flag class="i" />{/snippet}
  </TarjetaCampo>
  <TarjetaCampo etiqueta="Cierre / cliffhanger" ref="§12" clase="hook" valor={temporada.cierre} pista="El gancho hacia la siguiente." alCambiar={(v) => editar((t) => (t.cierre = v))}>
    {#snippet icono()}<FishSymbol class="i" />{/snippet}
  </TarjetaCampo>
</div>

<style>
  .estructura {
    text-align: left;
    cursor: pointer;
  }
</style>
