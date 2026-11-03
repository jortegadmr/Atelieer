<script lang="ts">
  // Captura rápida de ideas (spec 002, RF-36 a RF-42): una frase e Intro. La
  // idea va donde diga el visor al pulsar Intro; al cerrar, el foco vuelve a
  // donde estaba.
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import { onDestroy } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { destinoIdea } from "../../lib/vistas/crear";

  const estado = usarEstado();
  let texto = $state("");
  let campo = $state<HTMLInputElement | null>(null);
  const antes = document.activeElement as HTMLElement | null;

  const destino = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const d = destinoIdea(s.modelo, estado.nivel, (id) => s.estaBloqueada(id));
    return "error" in d ? d.error : d.donde.replace(/^Idea /, "Irá ");
  });

  // Esc la cierra sin crear nada (RF-42)
  $effect(() => estado.capas.abrir(() => estado.cerrarCaptura()));
  onDestroy(() => {
    if (antes && antes.isConnected) antes.focus();
  });

  // Pinchar fuera no pierde lo escrito: solo cierra si está vacía
  function fuera() {
    if (texto.trim()) campo?.focus();
    else estado.cerrarCaptura();
  }

  function tecla(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      estado.cerrarCaptura();
    } else if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      void estado.guardarIdea(texto);
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fondo" onclick={fuera}>
  <div class="caja card" role="dialog" aria-label="Apuntar una idea" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <div class="entrada">
      <Lightbulb class="i" />
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:this={campo} autofocus placeholder="Una idea, en una frase…" bind:value={texto} onkeydown={tecla} aria-label="Idea" aria-describedby="idea-destino" autocomplete="off" />
      <kbd>Intro</kbd>
    </div>
    {#if estado.errorCaptura}
      <p class="aviso" role="alert">{estado.errorCaptura}</p>
    {:else}
      <p class="ayuda" id="idea-destino">{destino} · Esc para salir</p>
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
    width: min(560px, 92vw);
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
  .ayuda,
  .aviso {
    margin: 0;
    padding: 10px 14px;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .aviso {
    color: var(--warn);
  }
</style>
