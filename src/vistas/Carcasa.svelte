<script lang="ts">
  import { usarEstado } from "../lib/app/contexto";
  import { queHaceEsc } from "../lib/app/esc";
  import { quienDeshace } from "../lib/app/deshacer";
  import Avisos from "./comunes/Avisos.svelte";
  import Buscar from "./comunes/Buscar.svelte";
  import BuscarLente from "./comunes/BuscarLente.svelte";
  import Analisis from "./Analisis.svelte";
  import Guion from "./Guion.svelte";
  import Mundo from "./Mundo.svelte";
  import Pizarra from "./Pizarra.svelte";
  import MenuContextual from "./comunes/MenuContextual.svelte";
  import BarraSuperior from "./comunes/BarraSuperior.svelte";
  import MenuIzquierdo from "./comunes/MenuIzquierdo.svelte";
  import Panel from "./panel/Panel.svelte";
  import Recorrido from "./Recorrido.svelte";
  import GuiaEscritura from "./GuiaEscritura.svelte";
  import Rejilla from "./Rejilla.svelte";
  import Serie from "./Serie.svelte";
  import Temporada from "./Temporada.svelte";
  import Tramas from "./Tramas.svelte";
  import Sincronizacion from "./Sincronizacion.svelte";
  import Historia from "./Historia.svelte";
  import BarraNuevo from "./visor/BarraNuevo.svelte";
  import Captura from "./visor/Captura.svelte";
  import Tostada from "./visor/Tostada.svelte";
  import NuevaPieza from "./visor/NuevaPieza.svelte";
  import Visor from "./visor/Visor.svelte";
  import BarraVariante from "./variantes/BarraVariante.svelte";
  import LadoALado from "./variantes/LadoALado.svelte";

  const estado = usarEstado();

  /** ¿Está el foco en un sitio donde se escribe? Ahí Ctrl Z es el del propio campo */
  const escribiendo = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");

  /**
   * Esc (spec 002, spec 010 RF-8): lo decide `queHaceEsc`. Lo que un campo o
   * una caja ya usó (preventDefault) no cuenta.
   */
  function escape(e: KeyboardEvent) {
    if (e.defaultPrevented) return;
    const que = queHaceEsc({ capas: estado.capas.hayAbiertas, campo: escribiendo(e.target), arrastrando: estado.arrastrando, lente: !!estado.lente });
    if (que === "capa") {
      estado.capas.cerrarUltima();
      e.preventDefault();
    } else if (que === "campo") (e.target as HTMLElement).blur();
    else if (que === "lente") estado.quitarLente();
    else if (que === "subir") estado.subirNivel();
  }

  function teclas(e: KeyboardEvent) {
    if (e.key === "Escape") {
      escape(e);
      return;
    }
    // Alt + flechas solo mueven escenas: fuera de los campos no hacen nada más (WebView2: Alt + ← es «atrás»)
    if (e.altKey && e.key.startsWith("Arrow") && !escribiendo(e.target)) e.preventDefault();
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    // Captura rápida, también desde un campo (spec 002, RF-36, RF-37)
    if (k === "i" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (!e.repeat) estado.abrirCaptura();
      return;
    }
    if (k === "k") {
      e.preventDefault();
      estado.buscando = !estado.buscando;
      return;
    }
    // Con una ventana o una confirmación abiertas, deshacer no actúa detrás
    const foco = !escribiendo(e.target) ? "otro" : e.target instanceof HTMLElement && e.target.closest("[data-editor-guion]") ? "editor-guion" : "campo";
    const quien = quienDeshace({ foco, vista: estado.vista, capas: estado.capas.hayAbiertas });
    if (quien === "guion" || quien === "campo" || quien === "nada") return;
    if (k === "z" && !e.shiftKey) {
      e.preventDefault();
      void estado.deshacerActual();
    } else if (k === "y" || (k === "z" && e.shiftKey)) {
      e.preventDefault();
      void estado.rehacerActual();
    }
  }
</script>

<svelte:window onkeydown={teclas} />

<div class="app">
  <MenuIzquierdo />
  <div class="main" class:ysi-on={!!estado.variante}>
    <BarraSuperior />
    <BarraVariante />
    <div class="body" class:pleno={estado.vista === "guion"}>
      <main class="view" class:pleno={estado.vista === "guion"}>
        {#if estado.vista !== "guion"}
          <Visor />
          <BarraNuevo />
        {/if}
        <Avisos />
        {#if estado.vista === "sincronizacion"}
          <Sincronizacion />
        {:else if estado.vista === "serie"}
          <Recorrido />
          <Serie />
        {:else if estado.vista === "tramas"}
          <Tramas />
        {:else if estado.vista === "temporada"}
          <Temporada />
        {:else if estado.vista === "episodios"}
          <Rejilla />
        {:else if estado.vista === "wiki"}
          <Mundo />
        {:else if estado.vista === "historia"}
          <Historia />
        {:else if estado.vista === "analisis"}
          <Analisis />
        {:else if estado.vista === "guion"}
          <Guion />
        {:else if estado.vista === "pizarra"}
          <Pizarra />
        {:else if estado.vista === "guia"}
          <GuiaEscritura />
        {/if}
      </main>
      {#if estado.vista !== "guion"}<Panel />{/if}
    </div>
  </div>
</div>
{#if estado.buscando}<Buscar />{/if}
{#if estado.buscandoLente}<BuscarLente />{/if}
{#if estado.menuLente}{#key estado.menuLente}<MenuContextual />{/key}{/if}
{#if estado.nueva}<NuevaPieza />{/if}
{#if estado.capturando}<Captura />{/if}
{#if estado.ladoALado}<LadoALado />{/if}
<Tostada />
