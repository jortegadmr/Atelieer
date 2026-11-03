<script lang="ts">
  // Trama global con sus puntos clave, y una línea por arco de serie con su
  // bomba de tiempo (spec 5.1). Las líneas de los arcos se editan en el paso 3.
  import { estadoDe } from "../../lib/modelo/estados";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Bomb from "@lucide/svelte/icons/bomb";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { CLASE_PUNTO, etiqueta, TIPO_ARCO, MADUREZ } from "../../lib/modelo/vocabulario";
  import type { EscalaSerie } from "../../lib/vistas/escala";
  import IconoPunto from "../comunes/IconoPunto.svelte";
  import Parada from "../comunes/Parada.svelte";

  const { escala }: { escala: EscalaSerie } = $props();
  const estado = usarEstado();

  const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;

    const puntos = [...m.puntos.values()]
      .map((p) => {
        const donde = p.clase === "inicio" ? "inicio" : p.clase === "fin" ? "fin" : "centro";
        let x = escala.x(p.posicion, donde);
        if (x !== null && !p.posicion.episodio && donde !== "centro") x += donde === "inicio" ? 0.4 : -0.4;
        return { p, x };
      })
      .filter((x): x is { p: (typeof x)["p"]; x: number } => x.x !== null)
      .sort((a, b) => a.x - b.x);

    const deSerie = c.arcosEnOrden(m).filter((a) => a.nivel === "serie");
    const arcos = [...deSerie.filter((a) => a.madurez !== "descartado"), ...deSerie.filter((a) => a.madurez === "descartado")]
      .map((a) => {
        const { inicio, fin } = c.inicioFin(m, a.id);
        const eventos = c.eventosColocadosDeArco(m, a.id);
        // Paradas: en el centro de su episodio, separadas si hay varias en el mismo
        const porEp = new Map<string, number>();
        const paradas = eventos.map((ev) => {
          const k = porEp.get(ev.episodio) ?? 0;
          porEp.set(ev.episodio, k + 1);
          return { ev, papel: c.papelEn(ev, a.id)!, x: escala.x({ temporada: ev.temporada, episodio: ev.episodio })! + k * 0.28 };
        });
        const xs = paradas.map((p) => p.x);
        const xIni = inicio ? escala.x(inicio, "inicio") : xs.length ? Math.min(...xs) : null;
        const xFin = fin ? escala.x(fin, "fin") : null;
        const finLinea = xFin ?? escala.total;
        const bomba = a.bomba && a.bomba_vence.temporada ? escala.x(a.bomba_vence) : null;
        const sub = a.tipo_arco === "trama" ? `trama ${a.tipo_trama}` : `arco de ${etiqueta(TIPO_ARCO, a.tipo_arco)}`;
        return { a, xIni, finLinea, sinFin: xFin === null, paradas, bomba, sub: `${sub} · ${etiqueta(MADUREZ, a.madurez)}` };
      });

    return { puntos, arcos, cortes: escala.temporadas.slice(1).map((t) => t.desde) };
  });
</script>

<div class="row">
  <div class="rl">Trama global</div>
  <div class="trk tall">
    {#each d.cortes as x (x)}<i class="corte" style:left="{escala.pct(x)}%"></i>{/each}
    {#if d.puntos.length > 1}
      <div
        class="ln"
        style:left="{escala.pct(d.puntos[0].x)}%"
        style:width="{escala.pct(d.puntos[d.puntos.length - 1].x - d.puntos[0].x)}%"
        style:background="var(--t1)"
        style:opacity=".35"
      ></div>
    {/if}
    {#each d.puntos as { p, x }, i (p.id)}
      <button
        class="beat"
        class:key={p.clase === "climax"}
        class:up={i % 2 === 1}
        class:on={estado.seleccion === p.id}
        style:left="{escala.pct(x)}%"
        title={p.que_pasa || undefined}
        onclick={() => estado.elegir(p.id)}
      >
        <span class="bd"><IconoPunto clase={p.clase} /></span>
        <span class="bl">{mayus(etiqueta(CLASE_PUNTO, p.clase))}</span>
      </button>
    {/each}
    {#if !d.puntos.length}<span class="vacio">Sin puntos clave todavía: añade el inicio, el detonante, el clímax…</span>{/if}
  </div>
</div>

{#each d.arcos as x (x.a.id)}
  <div class="row">
    <button class="rl click" class:descartado={x.a.madurez === "descartado"} class:aparcado={estadoDe(x.a) === "aparcado"} onclick={() => estado.elegir(x.a.id)}>
      <span class="sw" style:background="var(--t{x.a.color})"></span>
      <span style="min-width:0"><span class="nm">{x.a.titulo || "Sin título"}</span><small>{x.sub}</small></span>
    </button>
    <div class="trk">
      {#if x.xIni !== null}
        <div
          class="ln m-{x.a.madurez}"
          class:fade={x.sinFin}
          style:left="{escala.pct(x.xIni)}%"
          style:width="{escala.pct(x.finLinea - x.xIni)}%"
          style:background="var(--t{x.a.color})"
        ></div>
      {/if}
      {#each x.paradas as s (s.ev.id)}
        <button class="st" style:left="{escala.pct(s.x)}%" title={s.ev.titulo} onclick={() => estado.elegir(s.ev.id)}>
          <Parada papel={s.papel} color="var(--t{x.a.color})" tam={18} />
        </button>
      {/each}
      {#if x.bomba !== null}
        <span class="bomb" style:left="{escala.pct(x.bomba)}%" title="Bomba de tiempo: {x.a.bomba}"><Bomb class="i" /></span>
      {/if}
      {#if x.sinFin && x.xIni !== null}
        <span class="cont" style:left="{Math.min(escala.pct(x.finLinea), 92)}%">sin cierre <ArrowRight class="i" style="width:12px;height:12px" /></span>
      {/if}
    </div>
  </div>
{/each}

<style>
  .corte {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid var(--line);
  }
  .rl.click {
    text-align: left;
  }
  .beat.on .bd {
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .vacio {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-3);
    font-size: 12px;
  }
  .cont {
    right: 0;
    left: auto !important;
  }
</style>
