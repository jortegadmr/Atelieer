<script lang="ts">
  // Campo de texto de una línea o largo (serif). Vacío, enseña su pista.
  import type { Snippet } from "svelte";

  const {
    etiqueta,
    valor,
    alCambiar,
    ref = "",
    pista = "Sin rellenar",
    largo = false,
    mono = false,
    icono,
    enfocar = false,
  }: {
    etiqueta: string;
    valor: string;
    alCambiar: (v: string) => void;
    ref?: string;
    pista?: string;
    largo?: boolean;
    mono?: boolean;
    icono?: Snippet;
    /** Enfocar y seleccionar al aparecer (un evento recién creado) */
    enfocar?: boolean;
  } = $props();

  function foco(el: HTMLInputElement | HTMLTextAreaElement) {
    if (!enfocar) return;
    el.focus();
    el.select();
  }

  const id = `campo-${Math.random().toString(36).slice(2, 9)}`;

  function ajustar(el: HTMLTextAreaElement) {
    const medir = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    medir();
    $effect(() => {
      void valor;
      medir();
    });
  }
</script>

<div class="f">
  <label for={id}>{#if icono}{@render icono()}{/if}{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</label>
  {#if largo}
    <textarea
      {id}
      class="v ta"
      class:ph={!valor}
      rows="2"
      placeholder={pista}
      value={valor}
      oninput={(e) => alCambiar(e.currentTarget.value)}
      use:ajustar
    ></textarea>
  {:else}
    <input
      {id}
      class="v"
      class:ph={!valor}
      class:mono
      placeholder={pista}
      value={valor}
      oninput={(e) => alCambiar(e.currentTarget.value)}
      use:foco
    />
  {/if}
</div>
