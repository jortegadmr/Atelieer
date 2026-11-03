<script lang="ts">
  // Buscador de escena (spec 011, RF-2, RF-29): por título o por dónde se
  // emite, en línea, como combobox. Lo usan «Viene de» y los momentos de las
  // plantillas (con `filtro`).
  import Plus from "@lucide/svelte/icons/plus";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Evento } from "../../lib/modelo/tipos";
  import { buscarEscenas, type EscenaEncontrada } from "../../lib/vistas/buscar";

  const {
    etiqueta,
    pista = "Buscar escena por título o T01E03…",
    excluir,
    filtro,
    alElegir,
  }: {
    etiqueta: string;
    pista?: string;
    excluir?: Set<string>;
    filtro?: (ev: Evento) => boolean;
    alElegir: (id: string) => void;
  } = $props();

  const estado = usarEstado();
  const uid = $props.id();
  let texto = $state("");
  let abierto = $state(false);
  let activo = $state(0);

  const opciones = $derived.by(() => {
    void estado.version;
    if (!abierto) return [];
    return buscarEscenas(estado.sesion!.modelo, texto, { excluir, filtro });
  });

  $effect(() => {
    void texto;
    activo = 0;
  });

  function elegir(o: EscenaEncontrada) {
    texto = "";
    abierto = false;
    alElegir(o.id);
  }

  function tecla(e: KeyboardEvent) {
    if (e.key === "Escape" && abierto) {
      e.preventDefault();
      e.stopPropagation();
      abierto = false;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!abierto) abierto = true;
      else activo = Math.min(activo + 1, opciones.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activo = Math.max(activo - 1, 0);
    } else if (e.key === "Enter" && abierto && opciones[activo]) {
      e.preventDefault();
      elegir(opciones[activo]);
    }
  }
</script>

<div class="buscar">
  <div class="entrada">
    <Plus class="i" />
    <input
      placeholder={pista}
      bind:value={texto}
      onfocus={() => (abierto = true)}
      oninput={() => (abierto = true)}
      onblur={() => (abierto = false)}
      onkeydown={tecla}
      aria-label={etiqueta}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={abierto && opciones.length > 0}
      aria-controls="{uid}-opciones"
      aria-activedescendant={abierto && opciones[activo] ? `${uid}-op-${activo}` : undefined}
    />
  </div>
  {#if abierto}
    {#if opciones.length}
      <ul role="listbox" id="{uid}-opciones" aria-label="Escenas">
        {#each opciones as o, i (o.id)}
          <!-- Se elige al pulsar, antes de que el campo pierda el foco -->
          <li role="option" id="{uid}-op-{i}" aria-selected={i === activo}>
            <button type="button" tabindex="-1" class:on={i === activo} onmouseenter={() => (activo = i)} onmousedown={(e) => (e.preventDefault(), elegir(o))}>
              <span class="titulo">{o.titulo}</span>
              <span class="donde">{o.donde}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="ayuda">{texto.trim() ? "Ninguna escena con eso." : "No hay escenas que añadir."}</p>
    {/if}
  {/if}
</div>

<style>
  .buscar {
    position: relative;
  }
  .entrada {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-3);
    padding: 4px 0;
  }
  .entrada input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    color: var(--ink);
  }
  ul,
  .ayuda {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    z-index: 20;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: var(--shadow);
  }
  ul {
    list-style: none;
    margin: 2px 0 0;
    padding: 4px;
    max-height: 260px;
    overflow: auto;
  }
  li button {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    text-align: left;
  }
  li button.on {
    background: var(--sel);
  }
  .titulo {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .donde {
    font: 10.5px var(--mono);
    color: var(--ink-3);
    white-space: nowrap;
  }
  .ayuda {
    margin: 2px 0 0;
    padding: 10px;
    color: var(--ink-3);
    font-size: 12px;
  }
</style>
