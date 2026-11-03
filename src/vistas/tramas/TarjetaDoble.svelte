<script lang="ts">
  // Tarjeta con dos campos (qué gana / qué pierde; herida y mentira).
  import type { Snippet } from "svelte";

  interface Parte {
    etiqueta: string;
    valor: string;
    pista: string;
    alCambiar: (v: string) => void;
    /** "+" o "−" delante, en su color */
    signo?: "+" | "−";
    cursiva?: boolean;
    /** Cómo estaba (spec 009, RF-30) */
    antes?: string | null;
  }

  const {
    etiqueta,
    ref = "",
    pista,
    icono,
    a,
    b,
    fantasma = false,
  }: { etiqueta: string; ref?: string; pista: string; icono: Snippet; a: Parte; b: Parte; fantasma?: boolean } = $props();

  let editando = $state(false);
  let caja: HTMLDivElement | undefined = $state();

  // Solo se cierra si el foco sale de la tarjeta y de sus reglas de la guía
  // (spec 004), no al pasar de un campo al otro ni a «Lo sé», ni porque su
  // botón se sustituya o desaparezca (el foco lo recoloca ConGuia)
  $effect(() => {
    const cont = caja?.closest<HTMLElement>("[data-con-guia]") ?? caja;
    if (!cont) return;
    const fuera = (e: FocusEvent) => {
      if (!(e.target as Node).isConnected) return;
      if (e.relatedTarget instanceof Node && cont.contains(e.relatedTarget)) return;
      // Después del evento: si la tarjeta se está quitando, no se toca su estado
      setTimeout(() => {
        if (caja?.isConnected && !cont.contains(document.activeElement)) editando = false;
      }, 0);
    };
    cont.addEventListener("focusout", fuera);
    return () => cont.removeEventListener("focusout", fuera);
  });

  function ajustar(el: HTMLTextAreaElement, enfocar: boolean) {
    const medir = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    medir();
    el.addEventListener("input", medir);
    if (enfocar) el.focus();
  }

  const vacia = $derived(!a.valor && !b.valor);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="bx"
  class:empty={vacia && !editando}
  bind:this={caja}
  role="button"
  tabindex="0"
  onclick={(e) => {
    // Pulsar la cabecera de la tarjeta abierta devuelve el foco al primer texto
    if (editando && !(e.target as HTMLElement).closest("label")) caja?.querySelector("textarea")?.focus();
    else editando = true;
  }}
  onkeydown={(e) => {
    if (e.key === "Enter" && !editando) editando = true;
  }}
>
  <h3>{@render icono()}{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</h3>
  {#if editando}
    {#each [a, b] as x, i (i)}
      <label class="parte">
        <small>{x.etiqueta}</small>
        <textarea
          rows="1"
          placeholder={x.pista}
          value={x.valor}
          oninput={(e) => x.alCambiar(e.currentTarget.value)}
          use:ajustar={i === 0}
        ></textarea>
      </label>
    {/each}
  {:else if vacia}
    <p class="hint">{pista}</p>
  {:else}
    <p>
      {#each [a, b] as x, i (i)}
        {#if x.valor}
          {#if i > 0}<br />{/if}
          {#if x.signo}<span class={x.signo === "+" ? "mas" : "menos"}>{x.signo}</span>{" "}{/if}
          {#if x.cursiva}<i>{x.valor}</i>{:else}{x.valor}{/if}
        {/if}
      {/each}
    </p>
  {/if}
  {#each [a, b] as x, i (i)}
    {#if x.antes}<span class="marca-antes" class:fantasma>{x.etiqueta} · {x.antes}</span>{/if}
  {/each}
</div>

<style>
  .parte {
    display: block;
  }
  .parte small {
    display: block;
    font-size: 11px;
    color: var(--ink-3);
  }
  textarea {
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
  .mas {
    color: var(--ok);
  }
  .menos {
    color: var(--warn);
  }
</style>
