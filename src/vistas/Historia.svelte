<script lang="ts">
  // La línea de la historia (spec 009, A): las escenas por época del mundo, en
  // el orden de la Timeline. Mover de época solo cambia `mundo`.
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import { usarEstado } from "../lib/app/contexto";
  import { abrirUrl } from "../lib/app/plataforma";
  import { tick } from "svelte";
  import * as c from "../lib/modelo/consultas";
  import { dondeSeEmite, type Columna, type IdColumna } from "../lib/vistas/historia";
  import { fuenteMarcas } from "../lib/consecuencias/fuente";
  import { marcasHistoria } from "../lib/consecuencias/vistas";
  import { arrastrada, empezar, limpiar } from "./historia/arrastre-historia";
  import TarjetaHistoria from "./historia/TarjetaHistoria.svelte";

  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const m = s.modelo;
    // Si la temporada elegida ya no existe, vuelve a «Toda la serie» (RF-15)
    const filtro = m.temporadas.has(estado.filtroHistoria) ? estado.filtroHistoria : "";
    const columnas = estado.columnasLinea();
    return {
      filtro,
      columnas,
      temporadas: c.temporadasEnOrden(m).map((t) => ({ id: t.id, codigo: c.codigo(m, t.id), titulo: t.titulo })),
      sinEpocas: s.wiki.epocas().length === 0,
      sinEscenas: columnas.every((x) => x.escenas.length === 0),
      timeline: s.wiki.rutaTimeline ? s.wiki.urlObsidian(s.wiki.rutaTimeline) : null,
    };
  });

  // «Si lo dejas así…» en gris, o la variante en acento (spec 009, RF-30 a RF-32)
  const marcas = $derived.by(() => {
    void estado.version;
    const f = fuenteMarcas(estado);
    if (!f) return null;
    return { ...marcasHistoria(f.base, f.actual, f.ids, estado.sesion!.wiki, d.filtro), fantasma: f.fantasma, textos: f.textos };
  });

  // Tras Ctrl Z el anuncio deja de ser verdad y se calla (RF-29)
  const anuncio = $derived.by(() => {
    void estado.version;
    void estado.anuncioHistoria;
    return estado.anuncioVigente();
  });

  const serie = $derived(estado.sesion!.carpeta);
  let caja: HTMLElement;
  /** La columna sobre la que se arrastra, y si acepta la tarjeta */
  let encima = $state<{ id: IdColumna; vale: boolean } | null>(null);

  /** Tras mover, Svelte crea la tarjeta en la otra columna: el foco va a la nueva (RF-19) */
  async function enfocar(id: string) {
    await tick();
    caja?.querySelector<HTMLElement>(`.tarjeta[data-id="${CSS.escape(id)}"]`)?.focus();
  }

  function sobre(e: DragEvent, col: Columna) {
    const a = arrastrada(e, serie);
    // Textos, ficheros o tarjetas de otro sitio: no se pueden soltar (RF-24)
    if (!a) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
      return;
    }
    encima = { id: col.id, vale: col.soltable };
    if (!col.soltable) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function salir(e: DragEvent, col: Columna) {
    if (encima?.id === col.id && !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) encima = null;
  }

  async function soltar(e: DragEvent, col: Columna) {
    const a = arrastrada(e, serie);
    encima = null;
    if (!a || !col.soltable) return;
    e.preventDefault();
    acabar();
    if (await estado.cambiarEpoca(a.id, col.id, a.lectura)) await enfocar(a.id);
  }

  // Esc, soltar fuera o la tarjeta que desaparece: se suelta sin cambiar nada (RF-23)
  function acabar() {
    limpiar();
    estado.arrastrando = false;
    encima = null;
  }

  async function teclas(e: KeyboardEvent) {
    if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.ctrlKey || e.metaKey) return;
    const el = document.activeElement as HTMLElement | null;
    const id = el?.classList.contains("tarjeta") && caja.contains(el) ? el.dataset.id : undefined;
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    // Mantener la tecla no repite, como en el visor
    if (e.repeat) return;
    await estado.moverEpocaConTecla(id, e.key === "ArrowLeft" ? "izq" : "der");
    await enfocar(id);
  }

  let leyendo = $state(false);
  async function releer() {
    if (leyendo) return;
    leyendo = true;
    try {
      await estado.sesion?.leerWiki();
      estado.version++;
    } finally {
      leyendo = false;
    }
  }
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Estructura · línea de la historia</div>
    <h1 class="t">Línea de la historia</h1>
    <p class="logline">Cuándo pasa cada escena en el mundo, de la época más antigua al presente.</p>
  </div>
  <div class="meta">
    <label class="filtro">
      <span class="nom">Temporada</span>
      <select class="v" value={d.filtro} onchange={(e) => (estado.filtroHistoria = e.currentTarget.value)}>
        <option value="">Toda la serie</option>
        {#each d.temporadas as t (t.id)}<option value={t.id}>{t.codigo}{t.titulo ? ` · ${t.titulo}` : ""}</option>{/each}
      </select>
    </label>
    <button class="btn" disabled={leyendo} onclick={releer}><RefreshCw class="i" />Volver a leer la wiki</button>
  </div>
</div>

<div class="aviso" role="status" aria-live="polite">
  {#if estado.avisoHistoria}
    <div class="warnbox"><span>{estado.avisoHistoria}</span><button class="enlace" onclick={() => estado.quitarAvisoHistoria()}>Vale</button></div>
  {:else if anuncio}
    <div class="warnbox info"><span>{anuncio}</span></div>
  {/if}
</div>

{#if d.sinEpocas}
  <div class="warnbox info vacio">
    <span>Las épocas salen de la Timeline de la wiki.</span>
    {#if d.timeline}<button class="enlace" onclick={() => abrirUrl(d.timeline!)}>Abrir la Timeline <ArrowUpRight class="i" /></button>{/if}
  </div>
{/if}
{#if d.sinEscenas}
  <p class="hint">{d.filtro ? "Esta temporada aún no tiene escenas." : "Aún no hay escenas."}</p>
{/if}

<svelte:window ondragend={acabar} ondrop={acabar} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="linea" role="list" aria-label="Épocas" onkeydown={teclas} bind:this={caja}>
  {#each d.columnas as col (col.id)}
    <section
      class="col"
      class:fuera={col.id === "fuera"}
      class:destino={encima?.id === col.id && encima.vale}
      class:rechaza={encima?.id === col.id && !encima.vale}
      role="listitem"
      aria-label="{col.nombre}, {col.escenas.length} {col.escenas.length === 1 ? 'escena' : 'escenas'}"
      ondragover={(e) => sobre(e, col)}
      ondragleave={(e) => salir(e, col)}
      ondrop={(e) => soltar(e, col)}
    >
      <header>
        <h2>{col.nombre}</h2>
        <span class="n">{col.escenas.length}</span>
      </header>
      {#if col.porQueNo && (col.id !== "fuera" || encima?.id === col.id)}<p class="porque">{col.porQueNo}</p>{/if}
      <div class="tarjetas">
        {#each col.escenas as ev (ev.id)}
          <TarjetaHistoria
            {ev}
            emision={dondeSeEmite(estado.sesion!.modelo, ev)}
            nueva={marcas?.nuevas.has(ev.id) ? marcas.textos.nueva : null}
            fantasma={marcas?.fantasma}
            ondragstart={(e: DragEvent) => {
              empezar(e, ev.id, serie, estado.sesion!.wiki.lectura);
              estado.arrastrando = true;
            }}
          />
        {/each}
        {#each marcas?.estabanAqui.get(col.id) ?? [] as x (x.id)}
          {@const t = `${marcas!.textos.estaba}: «${x.titulo}»`}
          <div class="estaba" class:fantasma={marcas!.fantasma} title={t}>{t}</div>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  /* En pantallas estrechas el selector y el botón bajan, no ensanchan la vista */
  .vh {
    flex-wrap: wrap;
  }
  .vh .meta {
    flex-wrap: wrap;
    flex-shrink: 1;
    min-width: 0;
  }
  .filtro {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--ink-3);
  }
  /* Como los campos del panel (.f .v), que aquí no aplican */
  .filtro select {
    width: auto;
    max-width: 260px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background-color: var(--surface);
    color: var(--ink);
    font: inherit;
    padding: 6px 26px 6px 10px;
  }
  .filtro select:hover {
    border-color: var(--line-2);
  }
  .aviso:empty {
    display: none;
  }
  .aviso {
    margin-bottom: 14px;
  }
  .aviso .warnbox,
  .vacio {
    align-items: center;
  }
  .aviso .enlace,
  .vacio .enlace {
    margin-left: auto;
  }
  .vacio {
    margin-bottom: 14px;
  }
  .hint {
    font: italic 15px/1.35 var(--serif);
    color: var(--ink-3);
    margin: 0 0 14px;
  }
  /* RF-10: la línea se desplaza a lo ancho dentro de su caja; la página no */
  .linea {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    overflow-x: auto;
    min-width: 0;
    max-width: 100%;
    padding-bottom: 8px;
  }
  .col {
    flex: 0 0 220px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--line);
  }
  .col.fuera {
    border-style: dashed;
    background: transparent;
  }
  .col.destino {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, var(--surface-2));
  }
  .col.rechaza {
    cursor: no-drop;
    border-color: var(--line-2);
  }
  .col header {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .col h2 {
    margin: 0;
    font: 400 17px/1.2 var(--serif);
    color: var(--ink);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .col .n {
    margin-left: auto;
    font: 11px var(--mono);
    color: var(--ink-3);
  }
  .porque {
    margin: 0;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .tarjetas {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
