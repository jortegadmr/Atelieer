<script lang="ts">
  // Ficha en la wiki de una temporada, episodio, arco o secreto (spec 10.2,
  // T8.4-T8.5): "Pasar a la wiki" desde borrador; si ya está, el enlace para
  // abrirla, si es canon (retcon) y si cambió en la wiki después de pasarla.
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import BookCheck from "@lucide/svelte/icons/book-check";
  import BookDashed from "@lucide/svelte/icons/book-dashed";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import { abrirUrl } from "../../lib/app/plataforma";
  import type { Arco, Episodio, Secreto, Temporada } from "../../lib/modelo/tipos";
  import type { ResultadoPasar } from "../../lib/wiki/pasar";

  const { pieza }: { pieza: Temporada | Episodio | Arco | Secreto } = $props();
  const estado = usarEstado();

  let trabajando = $state(false);
  let resultado = $state<ResultadoPasar | null>(null);
  let otroNombre = $state("");
  let error = $state<string | null>(null);

  const ficha = $derived.by(() => {
    void estado.version;
    return estado.sesion!.fichas.get(pieza.id) ?? null;
  });
  const nombre = $derived(pieza.wiki.replace(/^\s*\[\[|\]\]\s*$/g, "").trim());
  const madurez = $derived("madurez" in pieza ? pieza.madurez : "borrador");

  async function pasar(n?: string) {
    error = null;
    trabajando = true;
    try {
      resultado = await estado.sesion!.pasar(pieza.id, n);
      if (resultado.estado === "nombre repetido") otroNombre = `${resultado.nombre} (${estado.sesion!.modelo.serie.titulo || "serie"})`;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      trabajando = false;
    }
  }

  // Enlaces y no botones: con canon bloqueado el panel va en un <fieldset
  // disabled>, que desactiva los botones pero no los enlaces, y abrir la
  // ficha es leer, no editar (RF-29).
  const url = $derived(ficha ? estado.sesion!.wiki.urlObsidian(ficha.ruta) : "");
  const abrir = (e: MouseEvent) => {
    e.preventDefault();
    if (url) abrirUrl(url);
  };
</script>

<div class="f">
  <span class="lbl">Ficha en la wiki</span>
  {#if nombre}
    <div class="v">
      <BookCheck class="i" />
      {#if ficha?.existe}
        <a class="enlace" href={url} onclick={abrir} onauxclick={abrir} draggable="false" title="Abrir en Obsidian">[[{nombre}]] <ArrowUpRight class="i" /></a>
      {:else}
        <span class="enlace off">[[{nombre}]] <ArrowUpRight class="i" /></span>
      {/if}
    </div>
    {#if ficha && !ficha.existe}
      <div class="warnbox"><TriangleAlert class="i" /><span>La ficha ya no está en <span class="wkpath">{ficha.ruta}</span>: ¿la has renombrado o borrado en Obsidian?</span></div>
    {:else if ficha?.cambio}
      <div class="warnbox info">
        <TriangleAlert class="i" />
        <span>Cambió en la wiki después de pasarla. Atelier no junta nada solo: <a class="enlace" href={url} onclick={abrir} onauxclick={abrir} draggable="false">ábrela en Obsidian</a>.</span>
      </div>
    {/if}
    {#if madurez === "canon"}
      <div class="warnbox info"><BookCheck class="i" /><span>Está en la wiki como canon. Si lo cambias aquí, es un <b>retcon</b>: anótalo en Canon y reglas.</span></div>
    {/if}
  {:else}
    <div class="v ph"><BookDashed class="i" />Aún no existe · al pasarla se crea en borrador</div>
    <button class="btn pri" disabled={madurez !== "borrador" || trabajando} onclick={() => pasar()}>
      <BookOpen class="i" />Pasar a la wiki
    </button>
    {#if madurez !== "borrador"}<p class="nota">Se pasa desde borrador (ahora está en {madurez}).</p>{/if}
  {/if}

  {#if resultado?.estado === "nombre repetido"}
    <div class="warnbox">
      <TriangleAlert class="i" />
      <span>
        Ya hay otra nota «{resultado.nombre}» en el vault ({resultado.repetidas.join(", ")}). Por la Guía §6, elige otro nombre:
      </span>
    </div>
    <div class="otro">
      <input class="v" bind:value={otroNombre} aria-label="Otro nombre para la ficha" />
      <button class="btn" disabled={!otroNombre.trim() || trabajando} onclick={() => pasar(otroNombre)}>Crear con este nombre</button>
    </div>
  {:else if resultado?.estado === "creada"}
    <p class="nota ok">
      Creada en borrador en <span class="wkpath">{resultado.ruta}</span>, con Fuentes y una línea en el Log.
      {#if resultado.sinFicha.length}Sin ficha (van como texto): {resultado.sinFicha.join(", ")}.{/if}
    </p>
  {:else if resultado?.estado === "ya existía"}
    <p class="nota">Ya existía una ficha con ese nombre: no se ha tocado, solo se ha enlazado.</p>
  {/if}
  {#if error}<div class="warnbox"><TriangleAlert class="i" /><span>{error}</span></div>{/if}
</div>

<style>
  .lbl {
    display: block;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .enlace {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ink);
  }
  .enlace {
    text-decoration: none;
  }
  .enlace:hover:not(.off) {
    text-decoration: underline;
  }
  .enlace.off {
    opacity: 0.5;
  }
  .btn {
    margin-top: 8px;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .nota {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 6px 0 0;
  }
  .warnbox {
    margin-top: 8px;
  }
  .otro {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
  .otro .v {
    flex: 1;
  }
  b {
    font-weight: 500;
  }
</style>
