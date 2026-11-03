<script lang="ts">
  // Los cinco beats del arco (plantilla Arco), con su temporada o episodio.
  // Se pulsan para fijarlos y escribir qué pasa.
  import CloudRain from "@lucide/svelte/icons/cloud-rain";
  import Flag from "@lucide/svelte/icons/flag";
  import Split from "@lucide/svelte/icons/split";
  import Sunrise from "@lucide/svelte/icons/sunrise";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import X from "@lucide/svelte/icons/x";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Arco } from "../../lib/modelo/tipos";
  import { BEATS, etiqueta } from "../../lib/modelo/vocabulario";
  import { donde, mayus } from "../../lib/vistas/textos";
  import CampoTexto from "../panel/campos/CampoTexto.svelte";
  import SelectorPosicion from "../panel/campos/SelectorPosicion.svelte";

  import type { ConFuente } from "../../lib/consecuencias/fuente";
  import type { MarcasTramas } from "../../lib/consecuencias/vistas";

  // `marcas`: cómo estaba cada beat (spec 009, RF-30, RF-31)
  const { arco, marcas = null }: { arco: Arco; marcas?: ConFuente<MarcasTramas> | null } = $props();
  const estado = usarEstado();
  const ICONOS = [Sunrise, TrendingUp, Split, CloudRain, Flag];

  let abierto = $state<number | null>(null);
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => {
    if (abierto !== null) return estado.capas.abrir(() => (abierto = null));
  });
  $effect(() => {
    void arco.id;
    abierto = null;
  });

  const textos = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return arco.beats.map((b) => donde(m, b));
  });

  const editar = (i: number, fn: (b: Arco["beats"][number]) => void) => estado.sesion!.editar<Arco>(arco.id, (a) => fn(a.beats[i]));
</script>

<div class="beats5">
  {#each BEATS as b, i (b)}
    {@const Icono = ICONOS[i]}
    <button class="b5" class:empty={!textos[i]} class:abierto={abierto === i} title={arco.beats[i]?.texto || undefined} onclick={() => (abierto = abierto === i ? null : i)}>
      <span class="k"><Icono class="i" />{mayus(etiqueta(BEATS, b))}</span>
      <b>{textos[i] || "sin fijar"}</b>
      {#if marcas?.beats.has(i)}<span class="marca-antes" class:fantasma={marcas.fantasma}>{marcas.textos.antes}: {marcas.beats.get(i)}</span>{/if}
    </button>
  {/each}
</div>

{#if abierto !== null && arco.beats[abierto]}
  {@const i = abierto}
  <div class="card editor">
    <div class="cab">
      <span>{mayus(etiqueta(BEATS, BEATS[i]))}</span>
      <button class="ib" aria-label="Cerrar" onclick={() => (abierto = null)}><X class="i" /></button>
    </div>
    <SelectorPosicion
      etiqueta="Dónde cae"
      valor={arco.beats[i]}
      alCambiar={(p) =>
        editar(i, (b) => {
          b.temporada = p.temporada;
          b.episodio = p.episodio;
        })}
    />
    <CampoTexto etiqueta="Qué pasa" largo valor={arco.beats[i].texto} pista="¿Qué ocurre en este beat?" alCambiar={(v) => editar(i, (b) => (b.texto = v))} />
  </div>
{/if}

<style>
  .b5 {
    text-align: left;
    cursor: pointer;
  }
  .b5:hover {
    border-color: var(--line-2);
  }
  .b5.abierto {
    border-color: var(--accent);
    border-style: solid;
  }
  .editor {
    padding: 12px 16px;
    margin: -4px 0 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cab {
    display: flex;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .cab .ib {
    margin-left: auto;
    width: 26px;
    height: 26px;
  }
</style>
