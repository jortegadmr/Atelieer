<script lang="ts">
  // Tarjeta de un campo guiado (spec 5.2): vacía, con borde discontinuo y su
  // pista; al pulsarla se edita en el sitio.
  import type { Snippet } from "svelte";

  const {
    etiqueta,
    ref = "",
    valor,
    pista,
    alCambiar,
    clase = "",
    icono,
    vista,
    alSalir = false,
    antes = null,
    fantasma = false,
  }: {
    etiqueta: string;
    ref?: string;
    valor: string;
    pista: string;
    alCambiar: (v: string) => void;
    clase?: string;
    icono: Snippet;
    /** Cómo se ve cuando no se edita (si no, el texto tal cual) */
    vista?: Snippet;
    /** Guardar al salir del campo y no a cada tecla (para listas como "Telmo, Nando") */
    alSalir?: boolean;
    /** Cómo estaba, de «Si lo dejas así…» o la variante (spec 009, RF-30): debajo, fuera de lo que se edita */
    antes?: string | null;
    fantasma?: boolean;
  } = $props();

  let editando = $state(false);
  let borrador = $state("");

  function empezar() {
    if (editando) return;
    borrador = valor;
    editando = true;
  }

  function terminar() {
    if (alSalir && borrador !== valor) alCambiar(borrador);
    editando = false;
  }

  // Se deja de editar cuando el foco sale de la tarjeta y de sus reglas de la
  // guía (spec 004): pasar con Tab a «Lo sé» no la cierra, ni que su botón se
  // sustituya o desaparezca (el foco lo recoloca ConGuia)
  let caja = $state<HTMLDivElement | null>(null);
  $effect(() => {
    const cont = caja?.closest<HTMLElement>("[data-con-guia]") ?? caja;
    if (!cont) return;
    const fuera = (e: FocusEvent) => {
      if (!(e.target as Node).isConnected) return;
      if (e.relatedTarget instanceof Node && cont.contains(e.relatedTarget)) return;
      // Después del evento: si la tarjeta se está quitando de la página, no se
      // toca su estado ni se guarda en la pieza que la sustituye
      setTimeout(() => {
        if (editando && caja?.isConnected && !cont.contains(document.activeElement)) terminar();
      }, 0);
    };
    cont.addEventListener("focusout", fuera);
    return () => cont.removeEventListener("focusout", fuera);
  });

  function enfocar(el: HTMLTextAreaElement) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    const medir = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    medir();
    el.addEventListener("input", medir);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={caja}
  class="bx {clase}"
  class:empty={!valor && !editando}
  role="button"
  tabindex="0"
  onclick={(e) => {
    // Pulsar la cabecera de la tarjeta abierta devuelve el foco al texto
    if (editando && !(e.target instanceof HTMLTextAreaElement)) caja?.querySelector("textarea")?.focus();
    else empezar();
  }}
  onkeydown={(e) => {
    if (e.key === "Enter" && !editando) empezar();
  }}
>
  <h3>{@render icono()}{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</h3>
  {#if editando}
    <textarea
      class="edit"
      rows="2"
      placeholder={pista}
      value={alSalir ? borrador : valor}
      oninput={(e) => {
        if (alSalir) borrador = e.currentTarget.value;
        else alCambiar(e.currentTarget.value);
      }}
      onkeydown={(e) => {
        if (e.key === "Escape") (e.currentTarget as HTMLTextAreaElement).blur();
      }}
      use:enfocar
    ></textarea>
  {:else if valor}
    {#if vista}{@render vista()}{:else}<p>{valor}</p>{/if}
  {:else}
    <p class="hint">{pista}</p>
  {/if}
  {#if antes}<span class="marca-antes" class:fantasma>{antes}</span>{/if}
</div>

<style>
  .edit {
    border: 0;
    background: transparent;
    resize: none;
    overflow: hidden;
    padding: 0;
    outline: none;
    font: 400 16px/1.3 var(--serif);
    color: var(--ink);
    width: 100%;
  }
  .bx:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
