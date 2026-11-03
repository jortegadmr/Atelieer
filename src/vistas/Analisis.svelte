<script lang="ts">
  // Vista «Análisis» (spec 010, RF-12 a RF-16): presencia de personajes, quién
  // sabe qué, esquema y causa y efecto (spec 011, RF-15) de una temporada.
  // Solo lee: no cambia nada en disco.
  import { usarEstado } from "../lib/app/contexto";
  import * as c from "../lib/modelo/consultas";
  import CausaEfecto from "./analisis/CausaEfecto.svelte";
  import Desglose from "./analisis/Desglose.svelte";
  import Esquema from "./analisis/Esquema.svelte";
  import Presencia from "./analisis/Presencia.svelte";
  import QuienSabe from "./analisis/QuienSabe.svelte";

  const estado = usarEstado();

  const PESTANAS = [
    { p: "presencia", texto: "Presencia" },
    { p: "sabe", texto: "Quién sabe qué" },
    { p: "esquema", texto: "Esquema" },
    { p: "causas", texto: "Causa y efecto" },
    { p: "desglose", texto: "Desglose" },
  ] as const;

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const temporadas = c.temporadasEnOrden(m).map((t) => ({ id: t.id, codigo: c.codigo(m, t.id), titulo: t.titulo }));
    return { temporadas, temporada: estado.temporadaDeAnalisis };
  });

  // Flechas entre pestañas (patrón de pestañas de ARIA)
  function teclas(e: KeyboardEvent) {
    const i = PESTANAS.findIndex((t) => t.p === estado.pestanaAnalisis);
    const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const sig = PESTANAS[(i + paso + PESTANAS.length) % PESTANAS.length];
    estado.pestanaAnalisis = sig.p;
    document.getElementById(`pestana-${sig.p}`)?.focus();
  }
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Estructura · análisis</div>
    <h1 class="t">Análisis</h1>
    <p class="logline">Quién sale, quién sabe qué, cómo queda cada temporada, qué provoca qué y dónde se rueda cada escena. Se mira; solo cambia algo si lo pides tú (añadir a una escena, duración objetivo).</p>
  </div>
  {#if d.temporadas.length && estado.pestanaAnalisis !== "desglose"}
    <div class="meta">
      <label class="filtro">
        <span class="nom">Temporada</span>
        <select value={d.temporada} onchange={(e) => (estado.temporadaAnalisis = e.currentTarget.value)}>
          {#each d.temporadas as t (t.id)}<option value={t.id}>{t.codigo}{t.titulo ? ` · ${t.titulo}` : ""}</option>{/each}
        </select>
      </label>
    </div>
  {/if}
</div>

<!-- El foco va en cada pestaña, no en la lista: las flechas pasan de una a otra -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="tabs" role="tablist" aria-label="Análisis" onkeydown={teclas}>
  {#each PESTANAS as t (t.p)}
    <button
      id="pestana-{t.p}"
      role="tab"
      aria-selected={estado.pestanaAnalisis === t.p}
      aria-controls="panel-analisis"
      tabindex={estado.pestanaAnalisis === t.p ? 0 : -1}
      class:on={estado.pestanaAnalisis === t.p}
      onclick={() => (estado.pestanaAnalisis = t.p)}
    >
      {t.texto}
    </button>
  {/each}
</div>

<div class="panel-analisis" id="panel-analisis" role="tabpanel" aria-labelledby="pestana-{estado.pestanaAnalisis}">
  {#if estado.pestanaAnalisis === "desglose"}
    <Desglose />
  {:else if !d.temporada}
    <p class="hint">Aún no hay temporadas</p>
  {:else if estado.pestanaAnalisis === "presencia"}
    <Presencia temporada={d.temporada} />
  {:else if estado.pestanaAnalisis === "sabe"}
    <QuienSabe temporada={d.temporada} />
  {:else if estado.pestanaAnalisis === "esquema"}
    <Esquema temporada={d.temporada} />
  {:else}
    <CausaEfecto temporada={d.temporada} />
  {/if}
</div>

<style>
  /* En pantallas estrechas el selector baja, no ensancha la vista (como la línea de la historia) */
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
  .tabs {
    border-bottom: 1px solid var(--line);
    margin-bottom: 16px;
  }
  .panel-analisis {
    min-width: 0;
  }
</style>
