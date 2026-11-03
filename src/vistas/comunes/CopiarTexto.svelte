<script lang="ts">
  // Un botón que lleva un texto al portapapeles (spec 010, RF-41b; spec 012,
  // RF-22 y RF-29). Dice lo que hizo en una región de estado, con el número de
  // caracteres; si el portapapeles falla, enseña el texto seleccionado para
  // copiarlo a mano. Quien lo usa da el texto (o el motivo de no tenerlo).
  import Copy from "@lucide/svelte/icons/copy";
  import type { Component } from "svelte";
  import { esMac } from "../../lib/app/plataforma";

  const {
    etiqueta,
    hecho,
    obtener,
    ariaCaja,
    reiniciar = null,
    icono: Icono = Copy,
    titulo,
    compacto = false,
    flota = false,
  }: {
    etiqueta: string;
    /** Lo que se dice al copiar, sin el número: «Esquema copiado al portapapeles» */
    hecho: string;
    /** El texto, o `{ error }` si no hay nada que copiar: entonces se dice por qué y no se copia nada */
    obtener: () => string | { error: string } | Promise<string | { error: string }>;
    /** Nombre de la caja de respaldo para lectores de pantalla */
    ariaCaja: string;
    /** Cuando esto cambia, se olvida el último aviso y la caja de respaldo */
    reiniciar?: unknown;
    icono?: Component<{ class?: string }>;
    titulo?: string;
    /** Sin márgenes, para meterlo en una fila de botones */
    compacto?: boolean;
    /** La caja de respaldo sale flotando bajo el botón, para no mover la barra donde está */
    flota?: boolean;
  } = $props();

  const tecla = esMac() ? "Cmd" : "Ctrl";

  let aviso = $state("");
  let respaldo = $state("");
  let ocupado = $state(false);
  let caja: HTMLTextAreaElement | undefined = $state();
  /** Cuenta las pulsaciones y los reinicios: lo que llega de una anterior ya no vale */
  let vuelta = 0;

  $effect(() => {
    void reiniciar;
    vuelta++;
    aviso = "";
    respaldo = "";
  });
  $effect(() => {
    if (caja) {
      caja.focus();
      caja.select();
    }
  });

  async function copiar() {
    if (ocupado) return;
    ocupado = true;
    respaldo = "";
    const mia = ++vuelta;
    try {
      const r = await obtener();
      // Cambió el origen mientras se reunía: no se copia ni se dice nada de lo viejo
      if (mia !== vuelta) return;
      if (typeof r !== "string") {
        aviso = r.error;
        return;
      }
      // En unidades de texto, igual que el tope del planteamiento (RF-22)
      const cuenta = `${r.length} caracteres`;
      try {
        await navigator.clipboard.writeText(r);
        if (mia !== vuelta) return;
        aviso = `${hecho} (${cuenta})`;
      } catch {
        respaldo = r;
        aviso = `No se pudo copiar solo (${cuenta}): el texto está seleccionado abajo, cópialo con ${tecla} C`;
      }
    } catch (e) {
      aviso = `No se pudo reunir el texto: ${(e as Error).message || "error desconocido"}`;
    } finally {
      ocupado = false;
    }
  }
</script>

{#snippet mensaje()}
  <span class="aviso" role="status">{aviso}</span>
{/snippet}
{#snippet cajaRespaldo()}
  {#if respaldo}
    <textarea class="respaldo" class:flota readonly rows="10" aria-label={ariaCaja} bind:this={caja} value={respaldo}></textarea>
  {/if}
{/snippet}

<div class="acciones" class:compacto>
  <button class="btn" title={titulo} disabled={ocupado} onclick={copiar}><Icono class="i" /><span class="nom">{etiqueta}</span></button>
  {#if !flota}{@render mensaje()}{/if}
</div>
{#if flota}
  <!-- Bajo el botón, para no ensanchar la barra donde está -->
  <div class="pop" class:con={!!aviso}>
    {@render mensaje()}
    {@render cajaRespaldo()}
  </div>
{:else}
  {@render cajaRespaldo()}
{/if}

<style>
  .acciones {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }
  .acciones.compacto {
    margin: 0;
    gap: 6px;
    flex-wrap: nowrap;
  }
  .aviso {
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .respaldo {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 14px;
    padding: 10px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    font: 12px/1.5 var(--mono);
    resize: vertical;
  }
  .pop {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 30;
    width: max-content;
    max-width: min(440px, 90vw);
    margin-top: 6px;
    border-radius: 8px;
    white-space: normal;
  }
  .pop.con {
    padding: 6px 8px;
    border: 1px solid var(--line-2);
    background: var(--surface);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
  }
  .respaldo.flota {
    width: min(420px, 80vw);
    margin: 6px 0 0;
  }
</style>
