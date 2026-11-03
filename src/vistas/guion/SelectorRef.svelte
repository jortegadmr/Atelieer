<script lang="ts">
  // La lista de fichas que sale junto al cursor al escribir `@` o en una línea de
  // personaje (spec 013, RF-11, RF-12). Solo pinta: la lógica y las teclas están
  // en el editor, que es quien conserva el foco. Cada opción dice su tipo.
  import type { Ficha, TipoFicha } from "../../lib/wiki/fichas";

  type Props = {
    id: string;
    resultados: Ficha[];
    activa: number;
    consulta: string;
    /** y: el borde de abajo de la línea del cursor; arriba: el de arriba */
    xy: { x: number; y: number; arriba: number };
    alElegir: (f: Ficha) => void;
    nombreTipo: Record<TipoFicha, string>;
  };
  let { id, resultados, activa, consulta, xy, alElegir, nombreTipo }: Props = $props();

  // Al final de la ventana no cabe debajo: sale encima del cursor, y nunca se corta por los lados
  let alto = $state(typeof window === "undefined" ? 800 : window.innerHeight);
  let ancho = $state(typeof window === "undefined" ? 1200 : window.innerWidth);
  const ALTO_LISTA = 260;
  const sitio = $derived.by(() => {
    const abajo = alto - xy.y - 16;
    const encima = xy.arriba > abajo && abajo < ALTO_LISTA;
    const hueco = Math.max(120, Math.min(ALTO_LISTA, (encima ? xy.arriba - 16 : abajo) - 10));
    return { encima, hueco };
  });
</script>

<svelte:window bind:innerHeight={alto} bind:innerWidth={ancho} />

<div
  class="selector"
  style:left="{Math.max(8, Math.min(xy.x, ancho - 388))}px"
  style:top={sitio.encima ? undefined : `${xy.y + 4}px`}
  style:bottom={sitio.encima ? `${alto - xy.arriba + 4}px` : undefined}
  style:--hueco="{sitio.hueco}px"
>
  <ul {id} role="listbox" aria-label="Fichas de la wiki">
    {#each resultados as f, i (f.ruta)}
      <li id="{id}-{i}" role="option" aria-selected={i === activa} class:on={i === activa}>
        <!-- El mousedown no le quita el foco al editor -->
        <button tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => alElegir(f)}>
          <span class="nom">{f.nombre}</span>
          <span class="tipo">{nombreTipo[f.tipo]}</span>
          <span class="ruta">{f.ruta.replace(/\.md$/i, "")}</span>
        </button>
      </li>
    {:else}
      <li class="vacio" role="presentation">{consulta ? "Ninguna ficha coincide." : "La wiki no tiene fichas."}</li>
    {/each}
  </ul>
</div>

<style>
  .selector {
    position: fixed;
    z-index: 40;
    min-width: 240px;
    max-width: 380px;
    background: var(--surface);
    border: 1px solid var(--line-2);
    border-radius: 8px;
    box-shadow: var(--shadow);
    padding: 4px;
    font: 13px/1.35 var(--sans);
    color: var(--ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: var(--hueco, 260px);
    overflow: auto;
  }
  li button {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0 10px;
    text-align: left;
    padding: 5px 8px;
    border-radius: 6px;
  }
  li.on button,
  li button:hover {
    background: var(--sel);
  }
  .nom {
    font-weight: 500;
  }
  .tipo {
    color: var(--ink-2);
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ruta {
    grid-column: 1 / -1;
    color: var(--ink-3);
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vacio {
    padding: 6px 8px;
    color: var(--ink-3);
  }
</style>
