<script lang="ts">
  // Guía de escritura (spec 019, RF-6 a RF-12): todas las reglas de guia.md por
  // pieza, con buscador, y al lado el apartado «§N» de la chuleta del vault,
  // de solo lectura. Nada de aquí escribe, salvo crear guia.md si no existe.
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import FilePlus from "@lucide/svelte/icons/file-plus";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Search from "@lucide/svelte/icons/search";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import X from "@lucide/svelte/icons/x";
  import { usarEstado } from "../lib/app/contexto";
  import { abrirUrl } from "../lib/app/plataforma";
  import { agruparReglas, apartadoDe, leerChuleta, RUTA_CHULETA, trozosFuente } from "../lib/guia/chuleta";
  import TextoVisual from "./comunes/TextoVisual.svelte";

  const estado = usarEstado();

  let q = $state("");
  /** null: nada abierto; "": la chuleta entera; "18": el apartado §18 */
  let leyendo = $state<string | null>(null);
  let chuleta = $state<string | null | undefined>(undefined);

  const d = $derived.by(() => {
    void estado.version;
    const g = estado.sesion?.guia;
    return g ? { grupos: agruparReglas(g.reglas, q), total: g.reglas.length, avisos: g.avisos } : null;
  });

  const serie = $derived.by(() => {
    void estado.version;
    return estado.sesionSerie;
  });

  /** La vault de la que se leyó la chuleta: si se abre una serie de otra, se vuelve a leer */
  let leidaDe = $state<string | null>(null);
  async function cargar() {
    const s = serie;
    if (!s) return;
    const vault = s.vault;
    leidaDe = vault;
    const t = await leerChuleta(s.almacen.fs, vault);
    if (leidaDe === vault) chuleta = t;
  }
  $effect(() => {
    if (serie && serie.vault !== leidaDe) {
      chuleta = undefined;
      void cargar();
    }
  });

  // Al abrir un apartado, el foco va a su título (RF-8, accesible con teclado)
  let tituloLectura = $state<HTMLElement>();
  let volverA: HTMLElement | null = null;
  function leer(n: string) {
    volverA = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    leyendo = n;
  }
  function cerrarLectura() {
    leyendo = null;
    volverA?.focus();
    volverA = null;
  }
  $effect(() => {
    void leyendo;
    tituloLectura?.focus();
  });

  const lectura = $derived.by(() => {
    if (leyendo === null || chuleta === undefined) return null;
    if (chuleta === null) return { titulo: "Sin chuleta", cuerpo: null };
    if (leyendo === "") return { titulo: "Chuleta de escritura de series", cuerpo: chuleta };
    const a = apartadoDe(chuleta, leyendo);
    return a ?? { titulo: `§${leyendo}`, cuerpo: null };
  });

  const urlChuleta = $derived(serie?.wiki.urlObsidian(RUTA_CHULETA) ?? "");
  const urlGuia = $derived.by(() => {
    const s = serie;
    if (!s) return "";
    return s.wiki.urlObsidian(s.rutaGuia.slice(s.vault.length + 1));
  });

  const NOMBRE: Record<string, string> = {
    serie: "Serie",
    "arco de trama": "Arcos de trama",
    "arco de personaje": "Arcos de personaje",
    "arco de relación": "Arcos de relación",
    subtrama: "Subtramas",
    temporada: "Temporadas",
    episodio: "Episodios",
    evento: "Escenas",
    secreto: "Secretos",
  };
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Mundo · guía</div>
    <h1 class="t">Guía de escritura</h1>
    <p class="logline">Las máximas que Atelier comprueba, y la chuleta de donde salen.</p>
  </div>
  <div class="meta">
    <button class="btn" aria-pressed={leyendo === ""} onclick={() => leer("")}>Leer la chuleta entera</button>
    <button class="btn ghost" disabled={!urlGuia} onclick={() => abrirUrl(urlGuia)}>guia.md en Obsidian <ArrowUpRight class="i" /></button>
  </div>
</div>

<div class="cuerpo" class:con-lectura={!!lectura}>
  <section class="reglas" aria-label="Reglas de la guía">
    {#if !d}
      <div class="warnbox">
        <TriangleAlert class="i" />
        <span>No hay <span class="wkpath">appDatos/guia.md</span>. Atelier puede crearlo con el primer juego de reglas, sacado de la chuleta.</span>
      </div>
      <button class="btn" disabled={!!estado.variante} title={estado.variante ? "Sal de la variante para crear guia.md." : undefined} onclick={() => estado.sesion!.crearGuia()}><FilePlus class="i" />Crear guia.md</button>
    {:else}
      <label class="buscar">
        <Search class="i" />
        <input type="search" bind:value={q} placeholder="Buscar en {d.total} reglas" aria-label="Buscar en las reglas" />
      </label>
      {#each d.grupos as g (g.pieza)}
        <h2>{NOMBRE[g.pieza] ?? g.pieza} <span class="ct">{g.reglas.length}</span></h2>
        {#each g.reglas as r (r.id)}
          <div class="maxim">
            <span class="ref">{r.id}</span>
            <div class="txt">
              <p>{r.texto}</p>
              {#if r.fuente}
                <small>
                  {#each trozosFuente(r.fuente) as t, i (i)}
                    {#if t.tipo === "apartado"}
                      <button class="enlace" class:on={leyendo === t.numero} aria-pressed={leyendo === t.numero} onclick={() => leer(t.numero)} title="Leer el apartado {t.texto} de la chuleta">{t.texto}</button>
                    {:else}{t.texto}{/if}
                  {/each}
                </small>
              {/if}
            </div>
          </div>
        {/each}
      {:else}
        <p class="nada">Ninguna regla con «{q}».</p>
      {/each}
      {#each d.avisos as a, i (i)}
        <div class="warnbox"><TriangleAlert class="i" /><span>guia.md: {a}</span></div>
      {/each}
      <button class="btn ghost" onclick={() => estado.sesion!.leerGuia()}><RefreshCw class="i" />Volver a leer guia.md</button>
    {/if}
  </section>

  {#if lectura}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <aside class="lectura" aria-label="Chuleta de escritura" onkeydown={(e) => e.key === "Escape" && (e.stopPropagation(), cerrarLectura())}>
      <header>
        <strong bind:this={tituloLectura} tabindex="-1">{lectura.titulo}</strong>
        <button class="btn ghost" aria-label="Cerrar la chuleta" onclick={cerrarLectura}><X class="i" /></button>
      </header>
      {#if lectura.cuerpo === null}
        <p class="nada">
          {#if chuleta === null}No está <span class="wkpath">{RUTA_CHULETA}</span> en el vault.{:else}Este apartado no está en la chuleta.{/if}
        </p>
      {:else}
        {#key leyendo}
          <TextoVisual valor={lectura.cuerpo} soloLectura etiqueta={lectura.titulo} alCambiar={() => false} />
        {/key}
      {/if}
      <footer>
        <button class="btn" disabled={!urlChuleta} onclick={() => abrirUrl(urlChuleta)}>Abrir en Obsidian <ArrowUpRight class="i" /></button>
        <button class="btn ghost" onclick={() => { chuleta = undefined; void cargar(); }}><RefreshCw class="i" />Volver a leer</button>
      </footer>
    </aside>
  {/if}
</div>

<style>
  .meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cuerpo {
    display: grid;
    gap: 20px;
    align-items: start;
  }
  .cuerpo.con-lectura {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  @media (max-width: 1100px) {
    .cuerpo.con-lectura {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .buscar {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 6px 10px;
    background: var(--surface);
    margin-bottom: 8px;
  }
  .buscar input {
    flex: 1;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    outline: none;
  }
  h2 {
    margin: 18px 0 2px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-3);
    font-weight: 500;
  }
  .ct {
    font: 500 11px var(--mono);
  }
  .txt {
    min-width: 0;
  }
  .txt p {
    margin: 0;
  }
  small {
    display: block;
    margin-top: 4px;
    font-size: 11.5px;
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
  .enlace {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
  .enlace.on {
    font-weight: 600;
  }
  .nada {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .lectura {
    position: sticky;
    top: 0;
    border: 1px solid var(--line-2);
    border-radius: 12px;
    background: var(--surface);
    padding: 12px 16px;
    max-height: calc(100vh - 140px);
    overflow: auto;
  }
  .lectura header,
  .lectura footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .lectura footer {
    margin-top: 12px;
    justify-content: flex-start;
  }
</style>
