<script lang="ts">
  import FolderOpen from "@lucide/svelte/icons/folder-open";
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Layers2 from "@lucide/svelte/icons/layers-2";
  import { carpetaParaTitulo } from "../lib/almacen/almacen";
  import { usarEstado } from "../lib/app/contexto";
  import { rutasWikiPorDefecto } from "../lib/app/estado.svelte";
  import { elegirCarpeta } from "../lib/app/plataforma";

  const estado = usarEstado();

  let creando = $state(false);
  let titulo = $state("");
  let carpeta = $state("");
  let carpetaTocada = $state(false);
  let raizWiki = $state("");
  let raizTocada = $state(false);
  let errorNueva = $state<string | null>(null);

  const carpetaFinal = $derived(carpetaTocada ? carpeta : carpetaParaTitulo(titulo));
  const raizFinal = $derived(raizTocada ? raizWiki : carpetaParaTitulo(titulo) ? `${carpetaParaTitulo(titulo)}/01_Wiki` : "");
  const rutas = $derived(rutasWikiPorDefecto(raizFinal));

  async function elegir() {
    const r = await elegirCarpeta("Elige la carpeta appDatos (dentro de Vault)");
    if (r) await estado.ponerRaiz(r);
  }

  // Dónde vive la serie nueva: en la vault de ahora o en una vault nueva (spec 016)
  let donde = $state<"aqui" | "vault">("aqui");
  let vaultNueva = $state("");
  async function elegirVaultNueva() {
    const r = await elegirCarpeta("Elige una carpeta vacía para la vault nueva");
    if (r) vaultNueva = r;
  }

  async function crear(e: SubmitEvent) {
    e.preventDefault();
    errorNueva = null;
    if (!titulo.trim()) {
      errorNueva = "Ponle un título.";
      return;
    }
    if (!carpetaFinal) {
      errorNueva = "La carpeta no puede quedar vacía.";
      return;
    }
    try {
      if (donde === "vault") {
        if (!vaultNueva) {
          errorNueva = "Elige la carpeta de la vault nueva.";
          return;
        }
        await estado.crearSerieEnVaultNueva(titulo, vaultNueva);
      } else await estado.crearSerie(titulo, carpetaFinal, rutas);
    } catch (err) {
      errorNueva = (err as Error).message;
    }
  }
</script>

<div class="inicio">
  <div class="col">
    <div class="brand"><b>Atelier</b><span>· pizarra de serie</span></div>

    {#if !estado.raiz}
      <div class="card hueco">
        <h1 class="t">Elige tu carpeta de datos</h1>
        <p class="logline">
          Atelier guarda cada serie en <span class="wkpath">Vault/appDatos</span>, dentro de una carpeta sincronizada. Elígela una vez en
          cada equipo.
        </p>
        <div><button class="btn pri" onclick={elegir}><FolderOpen class="i" />Elegir carpeta appDatos</button></div>
      </div>
    {:else}
      <div class="vh">
        <div>
          <div class="eyebrow">Inicio</div>
          <h1 class="t">Series</h1>
          <p class="logline">Elige una serie para seguir, o empieza una nueva.</p>
        </div>
        <div class="meta">
          <button class="btn pri" onclick={() => (creando = !creando)}><Plus class="i" />Nueva serie</button>
        </div>
      </div>

      {#if estado.error}
        <div class="warnbox"><TriangleAlert class="i" /><span>{estado.error}</span></div>
      {/if}

      {#if creando}
        <form class="card nueva" onsubmit={crear}>
          <div class="f">
            <label for="n-titulo">Título de la serie</label>
            <input id="n-titulo" class="v" bind:value={titulo} placeholder="Mi serie" />
          </div>
          <fieldset class="f donde">
            <legend>¿Dónde va la serie?</legend>
            <label><input type="radio" name="donde" value="aqui" bind:group={donde} />Dentro de la vault de ahora</label>
            <label><input type="radio" name="donde" value="vault" bind:group={donde} />En una vault nueva de Obsidian</label>
          </fieldset>
          {#if donde === "vault"}
            <div class="f">
              <label for="n-vault">Carpeta de la vault nueva<span class="ref">vacía; Obsidian la abre como vault</span></label>
              <div class="acciones">
                <input id="n-vault" class="v mono" bind:value={vaultNueva} placeholder="Elige una carpeta vacía" />
                <button type="button" class="btn ghost" onclick={elegirVaultNueva}><FolderOpen class="i" />Elegir…</button>
              </div>
            </div>
          {/if}
          {#if donde === "aqui"}
          <div class="f2">
            <div class="f">
              <label for="n-carpeta">Carpeta en appDatos</label>
              <input
                id="n-carpeta"
                class="v mono"
                value={carpetaFinal}
                oninput={(e) => {
                  carpetaTocada = true;
                  carpeta = e.currentTarget.value;
                }}
              />
            </div>
            <div class="f">
              <label for="n-wiki">Wiki de la serie<span class="ref">desde la raíz del vault</span></label>
              <input
                id="n-wiki"
                class="v mono"
                value={raizFinal}
                oninput={(e) => {
                  raizTocada = true;
                  raizWiki = e.currentTarget.value;
                }}
              />
            </div>
          </div>
          <details>
            <summary>Carpetas de la wiki</summary>
            <dl>
              <dt>Personajes</dt><dd class="wkpath">{rutas.personajes}</dd>
              <dt>Lugares</dt><dd class="wkpath">{rutas.lugares}</dd>
              <dt>Épocas</dt><dd class="wkpath">{rutas.eras}</dd>
              <dt>Timeline</dt><dd class="wkpath">{rutas.timeline}</dd>
              <dt>Narrativa</dt><dd class="wkpath">{rutas.narrativa}</dd>
              <dt>Log</dt><dd class="wkpath">{rutas.log}</dd>
            </dl>
            <p class="nota">Se pueden cambiar después en la serie.</p>
          </details>
          {/if}
          {#if errorNueva}<div class="warnbox"><TriangleAlert class="i" /><span>{errorNueva}</span></div>{/if}
          <div class="acciones">
            <button type="button" class="btn ghost" onclick={() => (creando = false)}>Cancelar</button>
            <button type="submit" class="btn pri">Crear serie</button>
          </div>
        </form>
      {/if}

      <div class="card lista">
        {#if estado.cargando && !estado.series.length}
          <p class="vacio">Leyendo appDatos…</p>
        {:else if !estado.series.length}
          <p class="vacio">Todavía no hay ninguna serie en esta carpeta.</p>
        {/if}
        {#each estado.series as s (s.carpeta)}
          <button class="serie" disabled={!!s.problema} onclick={() => estado.abrir(s.carpeta)}>
            <span class="av">{s.titulo.slice(0, 1).toUpperCase()}</span>
            <span class="nm">
              {s.titulo}
              <small class="wkpath">appDatos/{s.carpeta}</small>
            </span>
            {#if s.problema}
              <span class="problema"><TriangleAlert class="i" />{s.problema}</span>
            {:else}
              <Layers2 class="i" />
            {/if}
          </button>
        {/each}
      </div>

      <div class="raiz">
        <span class="wkpath">{estado.raiz}</span>
        <button class="btn ghost" onclick={elegir}>Cambiar carpeta</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .inicio {
    height: 100vh;
    overflow: auto;
    background: var(--bg);
  }
  .col {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 32px 60px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-3);
    font-size: 12px;
    margin-bottom: 36px;
  }
  .brand b {
    font: 400 24px/1 var(--serif);
    color: var(--ink);
  }
  .hueco {
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .hueco h1 {
    margin: 0;
  }
  .lista {
    padding: 6px;
    display: flex;
    flex-direction: column;
  }
  .serie {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 9px;
    text-align: left;
    width: 100%;
  }
  .serie:hover:not(:disabled) {
    background: var(--hover);
  }
  .serie:disabled {
    cursor: default;
    opacity: 0.85;
  }
  .serie + .serie {
    border-top: 1px solid var(--line);
  }
  .serie .av {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: var(--accent);
    color: var(--accent-ink);
    display: grid;
    place-items: center;
    font: 400 20px/1 var(--serif);
    flex: none;
  }
  .serie .nm {
    font: 400 20px/1.15 var(--serif);
    flex: 1;
    min-width: 0;
  }
  .serie .nm small {
    display: block;
    margin-top: 2px;
  }
  .serie :global(.i) {
    color: var(--ink-3);
  }
  .problema {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--warn);
    font-size: 12px;
    max-width: 50%;
  }
  .problema :global(.i) {
    color: var(--warn);
  }
  .vacio {
    color: var(--ink-3);
    padding: 14px 12px;
    margin: 0;
  }
  .raiz {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
  }
  .nueva {
    padding: 18px 20px;
    margin-bottom: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  input.v {
    width: 100%;
    font: inherit;
    color: var(--ink);
    outline: none;
  }
  input.v:focus {
    border-color: var(--accent);
  }
  input.mono {
    font: 12px var(--mono);
  }
  details summary {
    cursor: pointer;
    color: var(--ink-3);
    font-size: 12px;
  }
  dl {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 4px 12px;
    margin: 10px 0 0;
    font-size: 12px;
  }
  dt {
    color: var(--ink-3);
  }
  dd {
    margin: 0;
  }
  .nota {
    color: var(--ink-3);
    font-size: 11.5px;
    margin: 8px 0 0;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .warnbox {
    margin-bottom: 14px;
  }
  .donde {
    border: 0;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
  }
  .donde legend {
    font-size: 12px;
    color: var(--ink-2);
    margin-bottom: 4px;
  }
  .donde label {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
  }
</style>
