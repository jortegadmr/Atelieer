<script lang="ts">
  // Un evento en una celda de la rejilla (spec 5.4): la parada de su papel en
  // el color del arco, su título y, si es de otro tiempo, un reloj con su época.
  // Un triángulo si no pasa el test de relleno (C08).
  import { estadoDe } from "../../lib/modelo/estados";
  import History from "@lucide/svelte/icons/history";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Evento } from "../../lib/modelo/tipos";
  import type { Papel } from "../../lib/modelo/vocabulario";
  import { sinCorchetes } from "../../lib/vistas/textos";
  import { acabarArrastre, empezarArrastre, hayEvento, soltarEvento } from "../comunes/arrastre";
  import Parada from "../comunes/Parada.svelte";

  // `antes` y `nueva`: los textos de las marcas (spec 009, RF-30, RF-31); `fantasma`, en acento
  const {
    evento,
    papel,
    color,
    indice,
    antes = null,
    nueva = null,
    fantasma = false,
  }: {
    evento: Evento;
    papel: Papel | undefined;
    color: number;
    indice: number;
    antes?: string | null;
    nueva?: string | null;
    fantasma?: boolean;
  } = $props();
  const estado = usarEstado();
  let encima = $state(false);

  // "C1 · hace mil años": la época y su "desde" de la Timeline (T5.1, T8.1)
  const epoca = $derived.by(() => {
    void estado.version;
    const f = evento.mundo ? estado.sesion!.wiki.buscar(evento.mundo) : null;
    return [sinCorchetes(evento.mundo), f?.detalle].filter(Boolean).join(" · ");
  });

  // La lente (spec 010, RF-4): la escena no relacionada y su parada, atenuadas con color
  const fueraLente = $derived(!!estado.relacionLente && !estado.relacionLente.escenas.has(evento.id));

  const relleno = $derived.by(() => {
    void estado.version;
    return estado.sesion!.resultado().avisos.some((a) => a.id === "C08" && a.pieza === evento.id);
  });
</script>

<button
  class="ev m-{evento.madurez}"
  class:on={estado.seleccion === evento.id}
  class:encima
  class:descartado={evento.madurez === "descartado"}
  class:aparcado={estadoDe(evento) === "aparcado"}
  class:fuera-lente={fueraLente}
  draggable="true"
  ondragstart={(e) => empezarArrastre(e, evento.id)}
  ondragend={() => {
    acabarArrastre();
    encima = false;
  }}
  ondragover={(e) => {
    if (!hayEvento(e)) return;
    e.preventDefault();
    e.stopPropagation();
    encima = true;
  }}
  ondragleave={() => (encima = false)}
  ondrop={(e) => {
    encima = false;
    void soltarEvento(e, estado.sesion!, evento.episodio, indice);
  }}
  onclick={(e) => {
    e.stopPropagation();
    estado.pulsarEscena(evento.id);
  }}
>
  {#if papel}<Parada {papel} color={fueraLente ? "var(--ink-3)" : `var(--t${color})`} tam={15} />{/if}
  <span class="txt">
    {evento.titulo || "Sin título"}
    {#if evento.mundo}<small class="when"><History class="i" style="width:11px;height:11px" />{epoca}</small>{/if}
    {#if antes || nueva}
      <small class="marcas">
        {#if antes}<span class="marca-antes" class:fantasma>{antes}</span>{/if}
        {#if nueva}<span class="marca-antes" class:fantasma>{nueva}</span>{/if}
      </small>
    {/if}
    {#if fueraLente}<span class="solo-lector">, fuera de la lente</span>{/if}
  </span>
  {#if relleno}<span class="fl" title="Posible relleno"><TriangleAlert class="i" style="width:12px;height:12px" /></span>{/if}
</button>

<style>
  .ev {
    text-align: left;
    width: 100%;
    font: inherit;
    color: inherit;
  }
  .txt {
    min-width: 0;
  }
  .ev.fuera-lente {
    color: var(--ink-3);
  }
  .encima {
    box-shadow: 0 -3px 0 var(--accent);
  }
  .marcas {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 3px;
  }
  .descartado .txt {
    text-decoration: line-through;
    color: var(--ink-3);
  }
</style>
