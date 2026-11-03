<script lang="ts">
  // El mundo de la serie (spec 015): las categorías como carpetas, cada una con
  // su listado y buscador, y la ficha a ancho completo. Todo son notas de la
  // vault; Obsidian queda como copia y visor. Escribir pasa por EstadoMundo.
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Network from "@lucide/svelte/icons/network";
  import Calendar from "@lucide/svelte/icons/calendar";
  import Dna from "@lucide/svelte/icons/dna";
  import FileText from "@lucide/svelte/icons/file-text";
  import Folder from "@lucide/svelte/icons/folder";
  import Hourglass from "@lucide/svelte/icons/hourglass";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import Users from "@lucide/svelte/icons/users";
  import Zap from "@lucide/svelte/icons/zap";
  import UsersRound from "@lucide/svelte/icons/users-round";
  import type { Component } from "svelte";
  import { untrack } from "svelte";
  import Conexiones from "./mundo/Conexiones.svelte";
  import EditorFicha from "./mundo/EditorFicha.svelte";
  import Portada from "./mundo/Portada.svelte";
  import { usarEstado } from "../lib/app/contexto";
  import { categoria, type Categoria } from "../lib/wiki/mundo";

  const estado = usarEstado();
  const m = estado.mundo;

  const ICONOS: Record<Categoria, Component> = {
    personaje: Users as unknown as Component,
    glosario: BookOpen as unknown as Component,
    lugar: MapPin as unknown as Component,
    grupo: UsersRound as unknown as Component,
    poder: Zap as unknown as Component,
    evento: Calendar as unknown as Component,
    especie: Dna as unknown as Component,
    era: Hourglass as unknown as Component,
    documento: FileText as unknown as Component,
  };

  // Al abrir la vista cuenta las fichas (no escribe nada)
  $effect(() => {
    void estado.sesionSerie;
    untrack(() => void m.entrar());
  });

  function enfocar(nodo: HTMLInputElement) {
    nodo.focus();
  }

  let nombreNuevo = $state("");
  let creando = $state(false);

  async function crear(e: SubmitEvent) {
    e.preventDefault();
    if (!m.categoria || !nombreNuevo.trim()) return;
    const ok = await m.crear(m.categoria, nombreNuevo);
    if (ok) {
      nombreNuevo = "";
      creando = false;
    }
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  function buscar(texto: string) {
    m.filtro = texto;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => void m.buscar(texto), 200);
  }
</script>

<div class="mundo">
  <div class="sr" role="status" aria-live="polite">{m.aviso}</div>

  {#if m.pantalla === "ficha" && m.abierta}
    <EditorFicha />
  {:else}
    <div class="vh">
      <div>
        <div class="eyebrow">Mundo de la serie</div>
        <h1 class="t">{m.pantalla === "lista" && m.categoria ? categoria(m.categoria).nombre : m.pantalla === "conexiones" ? "Conexiones" : "El mundo"}</h1>
        <p class="logline">
          {#if m.pantalla === "conexiones"}
            Cómo se relacionan los personajes y los grupos, según las relaciones de sus fichas.
          {:else if m.pantalla === "lista"}
            Todo lo que escribes aquí es una nota de Obsidian: queda guardado en la vault.
          {:else}
            Personajes, lugares y todo lo que compone el mundo de tu serie. Crea y edita aquí; Obsidian queda como copia.
          {/if}
        </p>
      </div>
      <div class="meta">
        {#if m.pantalla === "conexiones"}
          <button class="btn ghost" onclick={() => m.volverARejilla()}><ArrowLeft class="i" />Categorías</button>
        {:else if m.pantalla === "lista"}
          <button class="btn ghost" onclick={() => m.volverARejilla()}><ArrowLeft class="i" />Categorías</button>
          {#if !m.soloLectura}<button class="btn pri" onclick={() => (creando = !creando)}><Plus class="i" />Nueva ficha</button>{/if}
        {/if}
      </div>
    </div>

    {#if m.error}<div class="warnbox" role="alert"><span>{m.error}</span></div>{/if}
    {#if m.soloLectura}<div class="warnbox info"><span>Con una variante abierta el mundo es de solo lectura.</span></div>{/if}
    {#if m.sinWiki}
      <div class="warnbox info"><span>La serie no tiene carpeta de wiki: pon la raíz en el «Editar» de la serie para crear fichas.</span></div>
    {/if}

    {#if m.pantalla === "conexiones"}
      <Conexiones />
    {:else}
    <label class="buscador">
      <Search class="i" />
      <span class="solo-lector">Buscar en el mundo</span>
      <input type="search" placeholder="Buscar por nombre o por texto…" value={m.filtro} oninput={(e) => buscar(e.currentTarget.value)} />
    </label>

    {#if m.filtro.trim() && m.pantalla === "rejilla"}
      <div class="g3">
        {#each m.resultados as f (f.ruta)}
          <button class="bx ficha" onclick={() => m.abrirFicha(f.ruta, f.categoria)}>
            <h3>{f.nombre}<span class="det">· {categoria(f.categoria).singular}</span></h3>
            {#if f.resumen}<p>{f.resumen}</p>{/if}
          </button>
        {:else}
          <div class="warnbox info"><span>Ninguna ficha coincide con «{m.filtro}».</span></div>
        {/each}
      </div>
    {:else if m.pantalla === "rejilla"}
      <Portada />
      <div class="carpetas">
        {#each m.categorias as c (c.id)}
          {@const Icono = ICONOS[c.id]}
          <button class="carpeta" onclick={() => m.abrirCategoria(c.id)} aria-label="{c.nombre}, {m.conteos?.[c.id] ?? 0} fichas">
            <span class="solapa"><Icono class="i" /></span>
            <strong>{c.nombre}</strong>
            <span class="ct">{m.conteos?.[c.id] ?? 0}</span>
          </button>
        {/each}
        <button class="carpeta" onclick={() => m.abrirConexiones()}>
          <span class="solapa"><Network class="i" /></span>
          <strong>Conexiones</strong>
          <span class="ct">mapa</span>
        </button>
      </div>
    {:else}
      {#if creando && !m.soloLectura && m.categoria}
        <form class="nueva" onsubmit={crear}>
          <label>
            <span>Nombre de {categoria(m.categoria).singular === "término" ? "el término" : `la ficha (${categoria(m.categoria).singular})`}</span>
            <input type="text" bind:value={nombreNuevo} use:enfocar placeholder="Solo el nombre: lo demás, cuando quieras" />
          </label>
          <button class="btn pri" type="submit" disabled={!nombreNuevo.trim()}>Crear</button>
          <button class="btn ghost" type="button" onclick={() => (creando = false)}>Cancelar</button>
        </form>
      {/if}
      {#if m.filtradas.length}
        <div class="g3">
          {#each m.filtradas as f (f.ruta)}
            <button class="bx ficha" onclick={() => m.abrirFicha(f.ruta, f.categoria)}>
              <h3>{f.nombre}{#if f.estado}<span class="det">· {f.estado}</span>{/if}</h3>
              {#if f.subcarpeta}<span class="sub"><Folder class="i" />{f.subcarpeta}</span>{/if}
              {#if f.resumen && f.resumen !== "[PENDIENTE]"}<p>{f.resumen}</p>{/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="warnbox info">
          <span>{m.filtro.trim() ? `Ninguna ficha coincide con «${m.filtro}».` : "Aún no hay fichas aquí. Crea la primera con «Nueva ficha»: basta con el nombre."}</span>
        </div>
      {/if}
    {/if}
    {/if}
  {/if}
</div>

<style>
  .mundo {
    max-width: 1100px;
    margin: 0 auto;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .buscador {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--line-2);
    border-radius: 10px;
    padding: 7px 12px;
    background: var(--surface);
    margin-bottom: 20px;
    max-width: 420px;
    color: var(--ink-2);
  }
  .buscador input {
    flex: 1;
    border: 0;
    background: transparent;
    color: var(--ink);
    outline: none;
    font: inherit;
  }
  .carpetas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 18px;
  }
  .carpeta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 18px 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
  }
  .carpeta:hover {
    background: var(--surface-2);
    border-color: var(--line-2);
  }
  .solapa {
    width: 84px;
    height: 62px;
    border-radius: 6px 14px 8px 8px;
    background: var(--accent-soft);
    border: 1px solid var(--line-2);
    display: grid;
    place-items: center;
    color: var(--accent);
  }
  .carpeta strong {
    font: 500 15px/1.2 var(--sans);
    text-align: center;
  }
  .ct {
    font: 500 12px var(--mono);
    color: var(--ink-3);
  }
  .ficha {
    text-align: left;
    cursor: pointer;
    min-height: 0;
    color: var(--ink);
  }
  .ficha h3 {
    font: 400 19px/1.2 var(--serif);
  }
  .det {
    font: 400 12px var(--sans);
    color: var(--ink-3);
    margin-left: 6px;
  }
  .sub {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    font-size: 12px;
    color: var(--ink-3);
  }
  .nueva {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .nueva label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 240px;
    font-size: 12px;
    color: var(--ink-2);
  }
  .nueva input {
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 8px 10px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
  }
</style>
