<script lang="ts">
  // Recorrido del arco por toda la serie, con sus paradas y su bomba (spec
  // 5.2). Sin cierre, la línea sigue hasta el final con una flecha (4.4).
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Bomb from "@lucide/svelte/icons/bomb";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import type { Arco } from "../../lib/modelo/tipos";
  import { escalaSerie } from "../../lib/vistas/escala";
  import { donde } from "../../lib/vistas/textos";
  import Parada from "../comunes/Parada.svelte";

  const { arco }: { arco: Arco } = $props();
  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const e = escalaSerie(m);
    const { inicio, fin } = c.inicioFin(m, arco.id);
    const porEp = new Map<string, number>();
    const paradas = c.eventosColocadosDeArco(m, arco.id).map((ev) => {
      const k = porEp.get(ev.episodio) ?? 0;
      porEp.set(ev.episodio, k + 1);
      return { ev, papel: c.papelEn(ev, arco.id)!, x: e.x({ temporada: ev.temporada, episodio: ev.episodio })! + k * 0.28 };
    });
    const xs = paradas.map((p) => p.x);
    const xIni = inicio ? e.x(inicio, "inicio") : xs.length ? Math.min(...xs) : null;
    const xFin = fin ? e.x(fin, "fin") : null;
    const bomba = arco.bomba_vence.temporada ? e.x(arco.bomba_vence) : null;
    const desde = inicio ? donde(m, inicio) : "sin fijar";
    const hasta = fin ? donde(m, fin) : "sin cierre";
    return { e, paradas, xIni, xFin, bomba, texto: `${desde} → ${hasta}` };
  });
</script>

<div class="card board recorrido">
  <div class="row">
    <div class="rl"><span><span class="nm">Recorrido</span><small>{d.texto}</small></span></div>
    <div class="trk">
      {#each d.e.temporadas as t, i (t.t.id)}
        {#if i > 0}<i class="corte" style:left="{d.e.pct(t.desde)}%"></i>{/if}
        <span class="slab" style:left="calc({d.e.pct(t.desde)}% + 6px)">{t.codigo}</span>
      {/each}
      {#if d.xIni !== null}
        <div
          class="ln m-{arco.madurez}"
          class:fade={d.xFin === null}
          style:left="{d.e.pct(d.xIni)}%"
          style:width="{d.e.pct((d.xFin ?? d.e.total) - d.xIni)}%"
          style:background="var(--t{arco.color})"
        ></div>
      {/if}
      {#each d.paradas as s (s.ev.id)}
        <button class="st" style:left="{d.e.pct(s.x)}%" title={s.ev.titulo} onclick={() => estado.elegir(s.ev.id)}>
          <Parada papel={s.papel} color="var(--t{arco.color})" tam={18} />
        </button>
      {/each}
      {#if d.bomba !== null && arco.bomba}
        <span class="bomb" style:left="{d.e.pct(d.bomba)}%" title="Bomba de tiempo: {arco.bomba}"><Bomb class="i" /></span>
      {/if}
      {#if d.xFin === null && d.xIni !== null}
        <span class="cont fin">sin cierre <ArrowRight class="i" style="width:12px;height:12px" /></span>
      {/if}
    </div>
  </div>
</div>

<style>
  .recorrido {
    margin-bottom: 12px;
  }
  .corte {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid var(--line);
  }
  .cont.fin {
    right: 0;
  }
</style>
