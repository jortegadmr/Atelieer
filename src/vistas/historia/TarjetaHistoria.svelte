<script lang="ts">
  // Una escena en la línea de la historia (spec 009, RF-8, RF-16): título,
  // dónde se emite, cómo se cuenta y su estado, también en texto.
  import { usarEstado } from "../../lib/app/contexto";
  import { estadoDe } from "../../lib/modelo/estados";
  import type { Evento } from "../../lib/modelo/tipos";
  import { ESTADO, etiqueta, MODO } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import Madurez from "../comunes/Madurez.svelte";

  // `nueva`: el texto de la marca de escena nueva (spec 009, RF-30, RF-31); `fantasma`, en acento
  const {
    ev,
    emision,
    nueva = null,
    fantasma = false,
    ondragstart,
  }: { ev: Evento; emision: string; nueva?: string | null; fantasma?: boolean; ondragstart: (e: DragEvent) => void } = $props();
  const estado = usarEstado();
  const e = $derived(estadoDe(ev));
  // La lente (spec 010, RF-4): la escena no relacionada, atenuada con color
  const fueraLente = $derived(!!estado.relacionLente && !estado.relacionLente.escenas.has(ev.id));
</script>

<button
  class="tarjeta"
  class:on={estado.seleccion === ev.id}
  class:aparcado={e === "aparcado"}
  class:descartado={e === "descartado"}
  class:fuera-lente={fueraLente}
  data-id={ev.id}
  draggable="true"
  aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
  {ondragstart}
  onclick={() => estado.pulsarEscena(ev.id)}
>
  <span class="ti">{ev.titulo || "Sin título"}</span>
  <span class="pie">
    <span class="em">{emision}</span>
    <span class="modo">{mayus(etiqueta(MODO, ev.modo))}</span>
    <span class="est"><Madurez madurez={e} />{etiqueta(ESTADO, e)}</span>
    {#if nueva}<span class="marca-antes" class:fantasma>{nueva}</span>{/if}
  </span>
  {#if fueraLente}<span class="solo-lector">Fuera de la lente</span>{/if}
</button>

<style>
  .tarjeta {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
  }
  .tarjeta:hover {
    border-color: var(--line-2);
  }
  .tarjeta.on {
    border-color: var(--accent);
  }
  .ti {
    font: 400 15px/1.25 var(--serif);
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .tarjeta.fuera-lente {
    background: var(--bg);
  }
  .fuera-lente .ti {
    color: var(--ink-3);
  }
  .descartado .ti {
    text-decoration: line-through;
    text-decoration-color: var(--ink-3);
    color: var(--ink-3);
  }
  .pie {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .em {
    font-family: var(--mono);
  }
  .est {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
</style>
