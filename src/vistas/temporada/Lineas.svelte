<script lang="ts">
  // Una línea por arco presente en la temporada, con sus paradas (spec 5.3, T4.3).
  import { estadoDe } from "../../lib/modelo/estados";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import { usarEstado } from "../../lib/app/contexto";
  import { etiqueta, TIPO_ARCO } from "../../lib/modelo/vocabulario";
  import { lineasTemporada } from "../../lib/vistas/lineas";
  import Parada from "../comunes/Parada.svelte";

  const { temporadaId, n }: { temporadaId: string; n: number } = $props();
  const estado = usarEstado();

  const lineas = $derived.by(() => {
    void estado.version;
    return lineasTemporada(estado.sesion!.modelo, temporadaId);
  });

  const p = (i: number) => ((i + 0.5) / n) * 100;
</script>

{#each lineas as l (l.arco.id)}
  {@const a = l.arco}
  {@const izq = l.desde < 0 ? 0 : p(l.desde)}
  {@const der = l.hasta >= n ? 100 : p(l.hasta)}
  <div class="row">
    <button class="rl click" class:descartado={a.madurez === "descartado"} class:aparcado={estadoDe(a) === "aparcado"} onclick={() => estado.elegir(a.id)}>
      <span class="sw" style:background="var(--t{a.color})"></span>
      <span style="min-width:0">
        <span class="nm">{l.tramo ? "↳ " : ""}{a.titulo || "Sin título"}</span>
        <small>{a.tipo_arco === "trama" ? `${a.tipo_trama} · ${l.tramo ? "tramo" : a.nivel === "serie" ? "de serie" : "de temporada"}` : `arco de ${etiqueta(TIPO_ARCO, a.tipo_arco)}`}</small>
      </span>
    </button>
    <div class="trk">
      <div class="ticks" style:grid-template-columns="repeat({n},1fr)">{#each Array(n) as _, i (i)}<i></i>{/each}</div>
      {#if der > izq}
        <div class="ln m-{a.madurez}" class:fade={l.sigue !== null} style:left="{izq}%" style:width="{der - izq}%" style:background="var(--t{a.color})"></div>
      {/if}
      {#each l.paradas as s (s.ev.id)}
        <button class="st" style:left="calc({p(s.i)}% + {s.k * 10}px)" title={s.ev.titulo} onclick={() => estado.elegir(s.ev.id)}>
          <Parada papel={s.papel} color="var(--t{a.color})" tam={18} />
        </button>
      {/each}
    </div>
    <div class="gut">{#if l.sigue}<ArrowRight class="i" style="width:12px;height:12px" />{l.sigue}{/if}</div>
  </div>
{/each}

<style>
  .rl.click {
    text-align: left;
  }
</style>
