<script lang="ts">
  // El recorrido guiado de una serie (spec 016): los pasos en el orden en que se
  // suele hacer, con el siguiente sugerido. No obliga a nada ni guarda nada: se
  // calcula de lo que ya hay y se puede plegar o saltar.
  import Check from "@lucide/svelte/icons/check";
  import Circle from "@lucide/svelte/icons/circle";
  import { usarEstado } from "../lib/app/contexto";
  import { recorrido, type Paso } from "../lib/app/serie-nueva";

  const estado = usarEstado();

  const sesion = $derived.by(() => {
    void estado.version;
    return estado.sesionSerie;
  });
  const r = $derived.by(() => {
    void estado.version;
    const s = sesion;
    if (!s) return null;
    return recorrido(s.modelo, {
      personajes: s.wiki.de("personaje").length,
      lugares: s.wiki.de("lugar").length,
      conGuion: estado.guion.resumen({ que: "serie" })?.conGuion ?? 0,
    });
  });

  const clave = $derived(`atelier.recorrido.${sesion?.carpetaEnVault ?? ""}`);
  let plegado = $state(false);
  $effect(() => {
    try {
      plegado = localStorage.getItem(clave) === "1";
    } catch {
      plegado = false;
    }
  });
  function plegar(v: boolean) {
    plegado = v;
    try {
      localStorage.setItem(clave, v ? "1" : "0");
    } catch {
      // Es solo comodidad
    }
  }

  const s0 = () => sesion?.modelo.serie.id;
  function ir(p: Paso) {
    if (p.id === "premisa" && s0()) {
      // Ya en Serie: el foco va al campo Premisa del panel (spec 019, RF-2)
      estado.cambiarVista("serie");
      estado.elegir(s0()!, "editar");
      estado.irAlCampo(s0()!, "serie.premisa");
    } else if (p.vista === "wiki") {
      estado.cambiarVista("wiki");
      void estado.mundo.abrirCategoria(p.categoria ?? "personaje");
    } else estado.cambiarVista(p.vista);
  }
</script>

{#if r && r.siguiente}
  <section class="rec" aria-label="Recorrido de la serie">
    <header>
      <div>
        <strong>Tu serie, paso a paso</strong>
        <span class="av">{r.hechos} de {r.pasos.length}</span>
      </div>
      <button class="btn ghost" onclick={() => plegar(!plegado)} aria-expanded={!plegado}>{plegado ? "Ver pasos" : "Ocultar"}</button>
    </header>
    {#if !plegado}
      <p class="nota">Es un orden sugerido: puedes saltar a lo que quieras y volver cuando te apetezca.</p>
      <ol>
        {#each r.pasos as p (p.id)}
          <li class:hecho={p.hecho} class:sig={r.siguiente.id === p.id}>
            {#if p.hecho}<Check class="i" />{:else}<Circle class="i" />{/if}
            <button class="enlace" onclick={() => ir(p)}>{p.titulo}</button>
            <span class="ayuda">{p.ayuda}</span>
            {#if r.siguiente.id === p.id}<span class="sug">Siguiente</span>{/if}
          </li>
        {/each}
      </ol>
    {:else}
      <p class="nota">Siguiente: <button class="enlace" onclick={() => ir(r.siguiente!)}>{r.siguiente.titulo}</button></p>
    {/if}
  </section>
{/if}

<style>
  .rec {
    border: 1px solid var(--line-2);
    border-radius: 12px;
    background: var(--surface);
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .av {
    margin-left: 8px;
    font: 500 12px var(--mono);
    color: var(--ink-3);
  }
  .nota {
    margin: 6px 0;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    flex-wrap: wrap;
  }
  li.hecho {
    color: var(--ink-3);
  }
  .ayuda {
    color: var(--ink-3);
    font-size: 12px;
  }
  .sug {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
  }
  .enlace {
    background: none;
    border: 0;
    padding: 0;
    color: var(--ink);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
</style>
