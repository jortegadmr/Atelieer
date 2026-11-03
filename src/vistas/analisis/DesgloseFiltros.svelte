<script lang="ts">
  // Filtros del desglose (spec 014, RF-3): temporada, episodio, locaciones y
  // personajes (alguno o todos), interior/exterior, momento y estado. Los filtros
  // puestos se ven siempre y se quitan de uno en uno o todos a la vez.
  import X from "@lucide/svelte/icons/x";
  import type { Estado } from "../../lib/modelo/vocabulario";
  import { ESTADO } from "../../lib/modelo/vocabulario";
  import type { InteriorExterior, Momento } from "../../lib/desglose/analisis";
  import { hayFiltros, type Filtros } from "../../lib/desglose/desglose";
  import type { EstadoDesglose } from "../../lib/app/estado-desglose.svelte";

  const {
    d,
    temporadas,
    episodios,
    locaciones,
    personajes,
    visibles,
    total,
  }: {
    d: EstadoDesglose;
    temporadas: Array<{ id: string; texto: string }>;
    episodios: Array<{ id: string; texto: string; temporada: string }>;
    locaciones: Array<{ clave: string; nombre: string }>;
    personajes: Array<{ clave: string; nombre: string }>;
    visibles: number;
    total: number;
  } = $props();

  const IE: InteriorExterior[] = ["INT", "EXT", "INT/EXT"];
  const MOMENTOS: Momento[] = ["día", "noche", "amanecer", "atardecer", "continuo"];

  const f = $derived(d.filtros);
  const episodiosDe = $derived(episodios.filter((e) => !f.temporada || e.temporada === f.temporada));
  const nombreLoc = (k: string) => locaciones.find((x) => x.clave === k)?.nombre ?? k;
  const nombrePers = (k: string) => personajes.find((x) => x.clave === k)?.nombre ?? k;
  const sinElegir = <T extends { clave: string }>(todas: T[], elegidas: string[]): T[] => todas.filter((x) => !elegidas.includes(x.clave));

  function poner<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    d.filtros = { ...d.filtros, [k]: v };
  }
  function cambiaTemporada(id: string) {
    // Si el episodio elegido no es de esa temporada, se quita
    const ep = episodios.find((e) => e.id === f.episodio);
    d.filtros = { ...d.filtros, temporada: id, episodio: ep && id && ep.temporada !== id ? "" : f.episodio };
  }
  function cambiaEpisodio(id: string) {
    const ep = episodios.find((e) => e.id === id);
    d.filtros = { ...d.filtros, episodio: id, temporada: ep ? ep.temporada : f.temporada };
  }

  // Los filtros puestos, como pastillas con su aspa (el estado por defecto no cuenta como puesto)
  const puestos = $derived.by(() => {
    const r: Array<{ clave: string; texto: string; quitar: () => void }> = [];
    if (f.temporada) r.push({ clave: "t", texto: `Temporada: ${temporadas.find((t) => t.id === f.temporada)?.texto ?? f.temporada}`, quitar: () => poner("temporada", "") });
    if (f.episodio) r.push({ clave: "e", texto: `Episodio: ${episodios.find((e) => e.id === f.episodio)?.texto ?? f.episodio}`, quitar: () => poner("episodio", "") });
    for (const k of f.locaciones) r.push({ clave: `l${k}`, texto: `Locación: ${nombreLoc(k)}`, quitar: () => d.alternar("locaciones", k) });
    for (const k of f.personajes) r.push({ clave: `p${k}`, texto: `Personaje: ${nombrePers(k)}`, quitar: () => d.alternar("personajes", k) });
    for (const v of f.ie) r.push({ clave: `i${v}`, texto: `Interior/exterior: ${v}`, quitar: () => d.alternar("ie", v) });
    for (const v of f.momentos) r.push({ clave: `m${v}`, texto: `Momento: ${v}`, quitar: () => d.alternar("momentos", v) });
    const porDefecto = ESTADO.filter((e) => e !== "descartado");
    if (f.estados.length !== porDefecto.length || !porDefecto.every((e) => f.estados.includes(e))) {
      r.push({ clave: "estados", texto: `Estados: ${f.estados.length ? f.estados.join(", ") : "ninguno"}`, quitar: () => poner("estados", [...porDefecto]) });
    }
    return r;
  });
</script>

<section class="filtros" aria-label="Filtros del desglose">
  <div class="fila-filtros">
    <label class="campo">
      <span class="nom">Temporada</span>
      <select value={f.temporada} onchange={(e) => cambiaTemporada(e.currentTarget.value)}>
        <option value="">Todas</option>
        {#each temporadas as t (t.id)}<option value={t.id}>{t.texto}</option>{/each}
      </select>
    </label>
    <label class="campo">
      <span class="nom">Episodio</span>
      <select value={f.episodio} onchange={(e) => cambiaEpisodio(e.currentTarget.value)}>
        <option value="">Todos</option>
        {#each episodiosDe as e (e.id)}<option value={e.id}>{e.texto}</option>{/each}
      </select>
    </label>
    <label class="campo">
      <span class="nom">Locación</span>
      <select
        value=""
        disabled={!sinElegir(locaciones, f.locaciones).length}
        onchange={(e) => {
          if (e.currentTarget.value) d.alternar("locaciones", e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      >
        <option value="">Añadir una…</option>
        {#each sinElegir(locaciones, f.locaciones) as l (l.clave)}<option value={l.clave}>{l.nombre}</option>{/each}
      </select>
    </label>
    {#if f.locaciones.length > 1}
      <div class="seg modo" role="group" aria-label="Locaciones: alguna o todas">
        <button aria-pressed={f.modoLocaciones === "alguno"} class:on={f.modoLocaciones === "alguno"} onclick={() => poner("modoLocaciones", "alguno")}>Alguna</button>
        <button aria-pressed={f.modoLocaciones === "todos"} class:on={f.modoLocaciones === "todos"} onclick={() => poner("modoLocaciones", "todos")}>Todas</button>
      </div>
    {/if}
    <label class="campo">
      <span class="nom">Personaje</span>
      <select
        value=""
        disabled={!sinElegir(personajes, f.personajes).length}
        onchange={(e) => {
          if (e.currentTarget.value) d.alternar("personajes", e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      >
        <option value="">Añadir uno…</option>
        {#each sinElegir(personajes, f.personajes) as p (p.clave)}<option value={p.clave}>{p.nombre}</option>{/each}
      </select>
    </label>
    {#if f.personajes.length > 1}
      <div class="seg modo" role="group" aria-label="Personajes: alguno o todos">
        <button aria-pressed={f.modoPersonajes === "alguno"} class:on={f.modoPersonajes === "alguno"} onclick={() => poner("modoPersonajes", "alguno")}>Alguno</button>
        <button aria-pressed={f.modoPersonajes === "todos"} class:on={f.modoPersonajes === "todos"} onclick={() => poner("modoPersonajes", "todos")}>Todos</button>
      </div>
    {/if}
  </div>

  <div class="fila-filtros">
    <div class="grupo" role="group" aria-label="Interior o exterior">
      {#each IE as v (v)}
        <button class="ficha-f" aria-pressed={f.ie.includes(v)} class:on={f.ie.includes(v)} onclick={() => d.alternar("ie", v)}>{v}</button>
      {/each}
    </div>
    <div class="grupo" role="group" aria-label="Momento del día">
      {#each MOMENTOS as v (v)}
        <button class="ficha-f" aria-pressed={f.momentos.includes(v)} class:on={f.momentos.includes(v)} onclick={() => d.alternar("momentos", v)}>{v}</button>
      {/each}
    </div>
    <div class="grupo" role="group" aria-label="Estado de la escena">
      {#each ESTADO as v (v)}
        <button class="ficha-f" aria-pressed={f.estados.includes(v as Estado)} class:on={f.estados.includes(v as Estado)} onclick={() => d.alternar("estados", v as Estado)}>{v}</button>
      {/each}
    </div>
  </div>

  <div class="puestos" aria-label="Filtros puestos">
    <span class="cuenta" role="status">{visibles === total ? `${total} escenas` : `${visibles} de ${total} escenas`}</span>
    {#each puestos as p (p.clave)}
      <span class="pill">
        {p.texto}
        <button class="aspa" aria-label="Quitar el filtro «{p.texto}»" onclick={p.quitar}><X class="i" /></button>
      </span>
    {/each}
    {#if puestos.length > 1 || hayFiltros(f)}
      <button class="btn ghost" onclick={() => d.quitarFiltros()}>Quitar todos los filtros</button>
    {/if}
  </div>
</section>

<style>
  .filtros {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }
  .fila-filtros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
  }
  .campo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .campo select {
    width: auto;
    max-width: 220px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background-color: var(--surface);
    color: var(--ink);
    font: inherit;
    padding: 5px 24px 5px 9px;
  }
  .campo select:hover:not(:disabled) {
    border-color: var(--line-2);
  }
  .modo {
    margin-left: 0;
  }
  .grupo {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .ficha-f {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12px;
    color: var(--ink-2);
    background: var(--surface);
    text-transform: lowercase;
  }
  .ficha-f:hover {
    border-color: var(--line-2);
  }
  .ficha-f.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--ink);
    font-weight: 500;
  }
  .puestos {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    min-height: 28px;
  }
  .cuenta {
    font: 12px var(--mono);
    color: var(--ink-2);
    margin-right: 4px;
  }
  .aspa {
    display: inline-flex;
    align-items: center;
    color: var(--ink-3);
    border-radius: 50%;
    padding: 1px;
  }
  .aspa:hover {
    color: var(--ink);
    background: var(--hover);
  }
</style>
