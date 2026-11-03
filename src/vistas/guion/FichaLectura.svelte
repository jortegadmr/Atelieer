<script lang="ts">
  // La ficha de una referencia, en solo lectura (spec 013, RF-14): nombre, tipo,
  // resumen y motor, con «Abrir en Obsidian». Usa solo la ficha que la wiki ya
  // leyó: nunca construye una ruta con el texto del guion (RF-17). No escribe nada.
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import X from "@lucide/svelte/icons/x";
  import type { Ficha } from "../../lib/wiki/fichas";

  type Props = {
    ficha: Ficha;
    /** obsidian://… ya construida por la wiki, o "" si no se puede abrir */
    url: string;
    alAbrir: () => void;
    alCerrar: () => void;
    /** Abre la ficha editable en el Mundo (spec 015, RF-10); sin él, solo se lee */
    alEditar?: () => void;
  };
  let { ficha, url, alAbrir, alCerrar, alEditar }: Props = $props();

  const TIPO = { personaje: "Personaje", lugar: "Lugar", era: "Época" } as const;
  const motor = $derived(
    (
      [
        ["Quiere", ficha.motor.quiere],
        ["Necesita", ficha.motor.necesita],
        ["Herida", ficha.motor.herida],
        ["Mentira", ficha.motor.mentira],
      ] as const
    ).filter(([, v]) => v.trim()),
  );

  let cerrar = $state<HTMLButtonElement>();
  $effect(() => {
    void ficha;
    cerrar?.focus();
  });
</script>

<aside class="ficha" aria-label="Ficha de {ficha.nombre}" onkeydown={(e) => e.key === "Escape" && (e.stopPropagation(), alCerrar())}>
  <header>
    <div>
      <span class="tipo">{TIPO[ficha.tipo]}</span>
      <h3>{ficha.nombre}</h3>
      {#if ficha.aliases.length}<p class="alias">También: {ficha.aliases.join(", ")}</p>{/if}
    </div>
    <button bind:this={cerrar} class="btn ghost" aria-label="Cerrar la ficha" onclick={alCerrar}><X class="i" /></button>
  </header>
  {#if ficha.resumen.trim()}<p class="resumen">{ficha.resumen}</p>{:else}<p class="vacio">Esta ficha no tiene resumen.</p>{/if}
  {#if ficha.detalle}<p class="det">{ficha.detalle}</p>{/if}
  {#if motor.length}
    <dl>
      {#each motor as [k, v] (k)}
        <dt>{k}</dt>
        <dd>{v}</dd>
      {/each}
    </dl>
  {/if}
  <footer>
    {#if alEditar}<button class="btn pri" onclick={alEditar}>Editar la ficha</button>{/if}
    <button class="btn" class:pri={!alEditar} disabled={!url} onclick={alAbrir}>Abrir en Obsidian <ArrowUpRight class="i" /></button>
    <p class="nota">{alEditar ? "Aquí solo se lee; «Editar» abre la ficha en el mundo de la serie." : "Solo lectura: desde aquí no se cambia la ficha."}</p>
  </footer>
</aside>

<style>
  .ficha {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--line-2);
    border-radius: 10px;
    background: var(--surface);
    font-size: 13px;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  h3 {
    margin: 2px 0 0;
    font: 400 22px/1.15 var(--serif);
  }
  .tipo {
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-2);
  }
  .alias,
  .det,
  .nota,
  .vacio {
    margin: 0;
    color: var(--ink-3);
  }
  .resumen {
    margin: 0;
    white-space: pre-wrap;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
    margin: 0;
  }
  dt {
    color: var(--ink-2);
    font-weight: 500;
  }
  dd {
    margin: 0;
    white-space: pre-wrap;
  }
  footer {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
