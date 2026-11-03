<script lang="ts">
  // El menú de «¿Y si…?» (spec 006, RF-1): nueva variante, las aparcadas (la
  // más reciente primero) y las aplicadas y descartadas, con «Recuperar» y
  // «Ver» (RF-42 a RF-44).
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { onMount } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { fechaCorta } from "../../lib/variantes/nombres";
  import type { CabeceraVariante } from "../../lib/variantes/tipos";
  import ConfirmarAplicar from "./ConfirmarAplicar.svelte";

  let { cerrar }: { cerrar: () => void } = $props();
  const estado = usarEstado();
  const MAXIMO = 20;

  let caja: HTMLDivElement;
  let todas = $state(false);
  let verOtras = $state(false);
  let todasOtras = $state(false);
  let viendo = $state<string | null>(null);
  let piezasViendo = $state<{ id: string; titulo: string; que: string }[]>([]);

  $effect(() => estado.capas.abrir(cerrar));
  onMount(() => caja.querySelector<HTMLButtonElement>("button")?.focus());

  const datos = $derived.by(() => {
    void estado.version;
    const s = estado.sesionSerie;
    const lista = s ? [...s.variantes.lista.values()] : [];
    const aparcadas = lista.filter((c) => c.estado === "aparcada").sort((a, b) => b.cambiada.localeCompare(a.cambiada));
    const otras = lista.filter((c) => c.estado !== "aparcada").sort((a, b) => fecha(b).localeCompare(fecha(a)));
    return { aparcadas, otras };
  });
  const visibles = $derived(todas ? datos.aparcadas : datos.aparcadas.slice(0, MAXIMO));
  const otrasVisibles = $derived(todasOtras ? datos.otras : datos.otras.slice(0, MAXIMO));

  function fecha(c: CabeceraVariante): string {
    return c.estado === "aplicada" ? c.aplicada : c.descartada;
  }

  // Choques de cada aparcada (RF-29): se calculan al enseñar el menú
  let nChoques = $state<Record<string, number>>({});
  $effect(() => {
    for (const c of visibles) void estado.choquesDeAparcada(c.id).then((n) => (nChoques = { ...nChoques, [c.id]: n }));
  });

  async function nueva() {
    cerrar();
    await estado.nuevaVariante();
  }

  async function abrir(id: string) {
    cerrar();
    await estado.abrirVariante(id);
  }

  async function ver(id: string) {
    if (viendo === id) {
      viendo = null;
      return;
    }
    piezasViendo = await estado.piezasDeAplicada(id);
    viendo = id;
  }

  function ladoALado(variante: string, pieza: string) {
    cerrar();
    void estado.verLadoALado(pieza, variante);
  }

  function fuera(e: PointerEvent) {
    const t = e.target as Node;
    if (!caja.contains(t) && !(t instanceof Element && t.closest(".ysi-boton"))) cerrar();
  }
</script>

<svelte:window onpointerdown={fuera} />

<div class="menu-ysi" role="dialog" aria-label="Variantes «¿Y si…?»" bind:this={caja}>
  <button class="btn pri" onclick={nueva}><Plus class="i" />Nueva variante</button>
  <p class="nota">Pruebas aparte de la serie: nada la toca hasta que aplicas una.</p>
  <h3>Aparcadas</h3>
  {#if datos.aparcadas.length}
    <ul>
      {#each visibles as c (c.id)}
        <li>
          <span class="nm" title={c.nombre}>
            {#if nChoques[c.id]}<TriangleAlert class="i choque" /><span class="solo-lector">Con choques: </span>{/if}{c.nombre}
          </span>
          <small>{fechaCorta(c.cambiada)}{estado.variante?.datos.id === c.id ? " · abierta" : ""}</small>
          <span class="acc">
            <button class="btn ghost" onclick={() => estado.pedirAplicar(c.id, "menu")}>Aplicar</button>
            <button class="btn" disabled={estado.variante?.datos.id === c.id} onclick={() => abrir(c.id)}>Abrir</button>
          </span>
          <ConfirmarAplicar id={c.id} donde="menu" />
        </li>
      {/each}
    </ul>
    {#if !todas && datos.aparcadas.length > MAXIMO}
      <button class="enlace" onclick={() => (todas = true)}>y {datos.aparcadas.length - MAXIMO} más</button>
    {/if}
  {:else}
    <p class="vacio">No hay variantes aparcadas.</p>
  {/if}
  {#if datos.otras.length}
    <button class="enlace" aria-expanded={verOtras} onclick={() => (verOtras = !verOtras)}>Aplicadas y descartadas ({datos.otras.length})</button>
    {#if verOtras}
      <ul>
        {#each otrasVisibles as c (c.id)}
          <li>
            <span class="nm" title={c.nombre}>{c.nombre}</span>
            <small>{c.estado === "aplicada" ? "Aplicada" : "Descartada"} {fechaCorta(fecha(c))} · {c.piezas.length} {c.piezas.length === 1 ? "pieza" : "piezas"}</small>
            <span class="acc">
              {#if c.estado === "descartada"}
                <button class="btn ghost" onclick={() => estado.recuperarVariante(c.id)}>Recuperar</button>
              {:else}
                <button class="btn ghost" aria-expanded={viendo === c.id} onclick={() => ver(c.id)}>Ver</button>
              {/if}
            </span>
            {#if c.porque}<p class="porque">{c.porque}</p>{/if}
            {#if viendo === c.id}
              <ul class="piezas" aria-label="Piezas que cambió «{c.nombre}»">
                {#each piezasViendo as p (p.id)}
                  <li>
                    <span class="nm" title={p.titulo}>{p.titulo}</span>
                    <small>{p.que}</small>
                    <span class="acc"><button class="btn ghost" onclick={() => ladoALado(c.id, p.id)}>Lado a lado</button></span>
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
      {#if !todasOtras && datos.otras.length > MAXIMO}
        <button class="enlace" onclick={() => (todasOtras = true)}>y {datos.otras.length - MAXIMO} más</button>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .menu-ysi {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    width: 340px;
    max-height: 70vh;
    overflow-y: auto;
    padding: 12px;
    border: 1px solid var(--line-2);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h3 {
    margin: 6px 0 0;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    column-gap: 8px;
    align-items: center;
    padding: 6px 4px;
    border-radius: 8px;
  }
  li:hover {
    background: var(--hover);
  }
  .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink);
  }
  small {
    grid-row: 2;
    color: var(--ink-3);
    font-size: 11px;
  }
  .acc {
    grid-row: 1 / 3;
    grid-column: 2;
    display: flex;
    gap: 4px;
  }
  li :global(.confirmar) {
    grid-column: 1 / 3;
    margin-top: 6px;
  }
  .porque,
  .piezas {
    grid-column: 1 / 3;
  }
  .porque {
    margin: 4px 0 0;
    font: italic 12px var(--serif);
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  .piezas {
    margin-top: 4px;
    padding-left: 10px;
    border-left: 2px solid var(--line-2);
  }
  .nm :global(.choque) {
    width: 13px;
    height: 13px;
    color: var(--warn);
    vertical-align: -2px;
    margin-right: 4px;
  }
  .nota,
  .vacio {
    margin: 0;
    font-size: 12px;
    color: var(--ink-3);
  }
  .vacio {
    font: italic 13px var(--serif);
  }
  .enlace {
    align-self: flex-start;
    color: var(--accent);
    font-size: 12px;
  }
  .enlace:hover {
    text-decoration: underline;
  }
</style>
