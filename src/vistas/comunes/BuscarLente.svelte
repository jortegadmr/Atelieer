<script lang="ts">
  // Buscador de la lente (spec 010, RF-1): personajes, arcos y secretos de la
  // serie; cada uno dice qué es. Copia reducida de Buscar o crear.
  import Focus from "@lucide/svelte/icons/focus";
  import { usarEstado } from "../../lib/app/contexto";
  import { objetivosLente, type Objetivo } from "../../lib/vistas/lente";
  import { clave } from "../../lib/wiki/md";

  const estado = usarEstado();
  let texto = $state("");
  let activo = $state(0);

  const todos = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    return objetivosLente(s.modelo, s.wiki);
  });
  const opciones = $derived.by(() => {
    const k = clave(texto);
    return (k ? todos.filter((o) => clave(o.nombre).includes(k)) : todos).slice(0, 30);
  });

  $effect(() => {
    void texto;
    activo = 0;
  });

  function cerrar() {
    estado.buscandoLente = false;
  }
  // Esc lo cierra antes de quitar la lente o subir de nivel (RF-8)
  $effect(() => estado.capas.abrir(cerrar));

  function elegir(o: Objetivo) {
    cerrar();
    estado.ponerLente(o.lente);
  }

  function tecla(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      activo = Math.min(activo + 1, opciones.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activo = Math.max(activo - 1, 0);
    } else if (e.key === "Enter" && opciones[activo]) {
      e.preventDefault();
      elegir(opciones[activo]);
    }
  }

  const idDe = (o: Objetivo) => (o.lente.tipo === "personaje" ? `p:${o.lente.clave}` : `${o.lente.tipo}:${o.lente.id}`);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fondo" onclick={cerrar}>
  <div class="caja card" role="dialog" aria-label="Poner la lente" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <div class="entrada">
      <Focus class="i" />
      <!-- svelte-ignore a11y_autofocus -->
      <input
        autofocus
        placeholder="Personaje, arco o secreto…"
        bind:value={texto}
        onkeydown={tecla}
        aria-label="Buscar personaje, arco o secreto"
        role="combobox"
        aria-expanded={opciones.length > 0}
        aria-controls="lente-opciones"
        aria-activedescendant={opciones[activo] ? `lente-op-${activo}` : undefined}
      />
      <kbd>Esc</kbd>
    </div>
    {#if opciones.length}
      <ul role="listbox" id="lente-opciones" aria-label="Resultados">
        {#each opciones as o, i (idDe(o))}
          <li role="option" id="lente-op-{i}" aria-selected={i === activo}>
            <button class:on={i === activo} onmouseenter={() => (activo = i)} onclick={() => elegir(o)}>
              <span class="tipo">{o.tipo}</span>
              <span class="titulo">{o.nombre}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="ayuda">{todos.length ? "Nada con ese nombre." : "La serie aún no tiene personajes, arcos ni secretos."}</p>
    {/if}
  </div>
</div>

<style>
  .fondo {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    z-index: 50;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
  }
  .caja {
    width: min(480px, 92vw);
    overflow: hidden;
  }
  .entrada {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--line);
  }
  .entrada input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    font: 400 18px/1.3 var(--serif);
    color: var(--ink);
  }
  kbd {
    font: 10.5px var(--mono);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0 5px;
    color: var(--ink-3);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 50vh;
    overflow: auto;
  }
  li button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    text-align: left;
  }
  li button.on {
    background: var(--sel);
  }
  .tipo {
    font: 10.5px var(--mono);
    color: var(--ink-3);
    min-width: 72px;
  }
  .titulo {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ayuda {
    margin: 0;
    padding: 14px;
    color: var(--ink-3);
    font-size: 12.5px;
  }
</style>
