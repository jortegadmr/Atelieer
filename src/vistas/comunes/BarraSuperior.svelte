<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import Focus from "@lucide/svelte/icons/focus";
  import X from "@lucide/svelte/icons/x";
  import MenuVariantes from "../variantes/MenuVariantes.svelte";
  import LlevarSala from "./LlevarSala.svelte";
  import type { OrigenSala } from "../../lib/sala/reunir";
  import History from "@lucide/svelte/icons/history";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import ListChecks from "@lucide/svelte/icons/list-checks";
  import Search from "@lucide/svelte/icons/search";
  import SunMoon from "@lucide/svelte/icons/sun-moon";
  import Redo2 from "@lucide/svelte/icons/redo-2";
  import Undo2 from "@lucide/svelte/icons/undo-2";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Vista } from "../../lib/app/estado.svelte";
  import { esMac } from "../../lib/app/plataforma";
  import { migas, vistaDeNivel, type Nivel } from "../../lib/vistas/visor";
  import { sinNadaQueVer, textoSinNada, visiblesDeNivel } from "../../lib/vistas/lente";

  const estado = usarEstado();
  /** El menú de «¿Y si…?» (spec 006, RF-1) */
  let menuYSi = $state(false);
  const tecla = esMac() ? "Cmd" : "Ctrl";

  const PASOS: { vista: Vista; n: number; nombre: string }[] = [
    { vista: "serie", n: 1, nombre: "Serie" },
    { vista: "tramas", n: 2, nombre: "Tramas" },
    { vista: "temporada", n: 3, nombre: "Temporada" },
    { vista: "episodios", n: 4, nombre: "Episodios" },
  ];

  const titulo = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    return s.modelo.serie.titulo || s.carpeta;
  });
  const puede = $derived.by(() => {
    void estado.version;
    const h = estado.sesion!.historial;
    return { deshacer: h.puedeDeshacer, rehacer: h.puedeRehacer };
  });
  const nAvisos = $derived.by(() => {
    void estado.version;
    return estado.sesion!.resultado().avisos.filter((a) => a.clase === "aviso").length;
  });
  // Miga del visor (spec 002, RF-14): sustituye a la de la v1
  const miga = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    return { tramos: migas(s.modelo, estado.nivel), enSuVista: vistaDeNivel(estado.nivel) === estado.vista };
  });
  // La lente (spec 010, RF-5, RF-10, RF-11)
  const lente = $derived.by(() => {
    void estado.version;
    const l = estado.lente;
    const rel = estado.relacionLente;
    if (!l || !rel) return null;
    const m = estado.sesion!.modelo;
    // Lo que se ve: el visor y, en «Análisis» o la línea de la historia, su temporada (o la serie)
    const deVista: Nivel | null =
      estado.vista === "analisis" && estado.temporadaDeAnalisis
        ? { tipo: "temporada", temporada: estado.temporadaDeAnalisis }
        : estado.vista === "historia"
          ? m.temporadas.has(estado.filtroHistoria)
            ? { tipo: "temporada", temporada: estado.filtroHistoria }
            : { tipo: "serie" }
          : null;
    const nivel = deVista ?? estado.nivel;
    const vacia = [estado.nivel, ...(deVista ? [deVista] : [])].every((n) => sinNadaQueVer(rel, visiblesDeNivel(m, n)));
    return { nombre: estado.nombreLente, tipo: l.tipo, aviso: vacia ? textoSinNada(estado.nombreLente, nivel) : "" };
  });
  /** Lo que «Llevar a la sala» lleva desde la lente (spec 012, RF-21) */
  const origenLente: OrigenSala | null = $derived.by(() => {
    const l = estado.lente;
    if (!l) return null;
    return l.tipo === "personaje" ? { tipo: "personaje", clave: l.clave, nombre: l.nombre } : { tipo: "pieza", id: l.id };
  });
</script>

<header class="top">
  <nav class="crumb" aria-label="Dónde estás">
    {#each miga.tramos as x, i (i)}
      {#if i}<ChevronRight class="i" />{/if}
      {#if i === miga.tramos.length - 1 && miga.enSuVista}
        <span class="cur" aria-current="location" title={i === 0 ? titulo : undefined}>{x.texto}</span>
      {:else}
        <button title={i === 0 ? `Subir a la serie (${titulo})` : "Ir a este nivel"} onclick={() => estado.irANivel(x.nivel, false)}>{x.texto}</button>
      {/if}
    {/each}
  </nav>
  <div class="seg">
    {#each PASOS as p (p.vista)}
      <button class:on={estado.vista === p.vista} title={p.nombre} onclick={() => estado.cambiarVista(p.vista)}>
        <span class="n">{p.n}</span><span class="nom">{p.nombre}</span>
      </button>
    {/each}
  </div>
  <button class="cmd" title="Buscar o crear · {tecla} K" onclick={() => (estado.buscando = true)}>
    <Search class="i" /><span class="lbl">Buscar o crear…</span><kbd>{tecla} K</kbd>
  </button>
  {#if lente}
    <span class="lente" role="status" title="Lente: {lente.nombre} · {lente.tipo}{lente.aviso ? ` · ${lente.aviso}` : ''}">
      <Focus class="i" />
      <!-- Cambiar de lente sin quitarla antes (RF-3) -->
      <button class="lnom" title="Cambiar de lente" onclick={() => (estado.buscandoLente = true)}>Lente: {lente.nombre} <span class="ltipo">· {lente.tipo}</span></button>
      {#if lente.aviso}<span class="laviso">· {lente.aviso}</span>{/if}
      {#if origenLente}<span class="llevar"><LlevarSala origen={origenLente} compacto flota /></span>{/if}
      <button class="lquitar" aria-label="Quitar lente" title="Quitar lente · Esc" onclick={() => estado.quitarLente()}><X class="i" /></button>
    </span>
  {:else}
    <button class="btn ghost" title="Lente: ver solo lo de un personaje, un arco o un secreto" onclick={() => (estado.buscandoLente = true)}>
      <Focus class="i" /><span class="nom">Lente</span>
    </button>
    {#if estado.avisoLente}
      <span class="lente aviso" role="status" title={estado.avisoLente}>
        <span class="lnom">{estado.avisoLente}</span>
        <button class="lquitar" aria-label="Cerrar aviso" onclick={() => (estado.avisoLente = null)}><X class="i" /></button>
      </span>
    {/if}
  {/if}
  <div class="ysi-boton">
    <button class="btn" class:on={!!estado.variante} aria-expanded={menuYSi} title="¿Y si…? Probar cambios sin tocar la serie" onclick={() => (menuYSi = !menuYSi)}>
      <FlaskConical class="i" /><span class="nom">¿Y si…?</span>
    </button>
    {#if menuYSi}<MenuVariantes cerrar={() => (menuYSi = false)} />{/if}
  </div>
  <button class="btn ghost idea" title="Apuntar una idea · {tecla} I" onclick={() => estado.abrirCaptura()}><Lightbulb class="i" /><span class="nom">+ Idea</span></button>
  <button class="ib" disabled={!puede.deshacer} aria-label="Deshacer" title="Deshacer · {tecla} Z" onclick={() => estado.sesion!.deshacer()}><Undo2 class="i" /></button>
  <button class="ib" disabled={!puede.rehacer} aria-label="Rehacer" title="Rehacer · {tecla === 'Cmd' ? 'Cmd Mayús Z' : 'Ctrl Y'}" onclick={() => estado.sesion!.rehacer()}><Redo2 class="i" /></button>
  <button class="ib" aria-label="Instantáneas" title="Instantáneas: volver a una versión anterior" onclick={() => estado.cambiarVista("sincronizacion")}><History class="i" /></button>
  <button class="ib" aria-label="Comprobar" title="Comprobar: avisos y sugerencias" onclick={() => (estado.pestana = "comprobar")}>
    <ListChecks class="i" />{#if nAvisos}<span class="bdg">{nAvisos}</span>{/if}
  </button>
  <span class="vsep"></span>
  <button class="ib" aria-label="Cambiar tema" title="Cambiar entre claro y oscuro" onclick={() => estado.cambiarTema()}>
    <SunMoon class="i" />
  </button>
</header>

<style>
  .lente {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    max-width: 320px;
    padding: 3px 4px 3px 9px;
    border: 1px solid var(--accent);
    border-radius: 999px;
    color: var(--accent);
    font-size: 12px;
    white-space: nowrap;
  }
  .llevar {
    position: relative;
    display: inline-flex;
    white-space: normal;
  }
  .llevar :global(.btn) {
    font-size: 11.5px;
    padding: 2px 8px;
  }
  .lente.aviso {
    border-color: var(--warn);
    color: var(--warn);
  }
  button.lnom {
    display: block;
    color: inherit;
    font: inherit;
    padding: 0;
  }
  button.lnom:hover {
    text-decoration: underline;
  }
  .lnom,
  .laviso {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .laviso {
    color: var(--ink-3);
  }
  .ltipo {
    color: var(--ink-3);
  }
  .lquitar {
    display: inline-grid;
    place-items: center;
    padding: 2px;
    border-radius: 999px;
    flex: none;
  }
  .lquitar:hover {
    background: var(--sel);
  }
  @media (max-width: 1000px) {
    .lente {
      max-width: 90px;
    }
    .ltipo {
      display: none;
    }
  }
  .ysi-boton {
    position: relative;
  }
  .ysi-boton > .btn.on {
    border-color: var(--accent);
    color: var(--accent);
  }
  .ib:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .ib:disabled:hover {
    background: none;
  }
  .cmd {
    text-align: left;
  }
  .cmd:hover {
    border-color: var(--line-2);
    color: var(--ink-2);
  }
</style>
