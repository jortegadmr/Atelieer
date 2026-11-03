<script lang="ts">
  // Una columna de acto del nivel episodio (spec 003, RF-7 a RF-13, RF-17):
  // cabecera con nombre, número y resumen; sus escenas como tarjetas que se
  // arrastran; «+ Escena» al final. Soltar marca el puesto con una línea.
  import Plus from "@lucide/svelte/icons/plus";
  import { usarEstado } from "../../lib/app/contexto";
  import { puestoAlSoltar } from "../../lib/vistas/actos";
  import { TEXTO_ACTO_VACIO, type ColumnaActo } from "../../lib/vistas/visor";
  import { arrastrada, empezar, limpiar } from "./arrastre-visor";
  import Columna from "./Columna.svelte";
  import type { EstabaAqui } from "../../lib/consecuencias/visor";
  import { usarMarcas } from "./marcas";

  const {
    col,
    episodio,
    bloqueo,
    alArrastrar,
  }: { col: ColumnaActo; episodio: string; bloqueo: string | null; alArrastrar: (desde: ColumnaActo["acto"] | null) => void } = $props();
  const estado = usarEstado();
  const serie = $derived(estado.sesion!.carpeta);
  // Escenas que estaban en este acto y se fueron (spec 005, RF-28)
  const marcas = usarMarcas();
  const estaban = $derived(marcas()?.estabanAqui.filter((x) => x.acto === col.acto) ?? []);

  let lista: HTMLElement;
  /** Puesto donde caería la tarjeta; null si no se arrastra sobre esta columna */
  let marca = $state<number | null>(null);
  /** La arrastrada, para no contarla al calcular el puesto */
  let arrastrandoId = $state<string | null>(null);

  function puesto(e: DragEvent, id: string): number {
    const tarjetas = [...lista.querySelectorAll<HTMLElement>(".colv")].filter((t) => t.dataset.id !== id);
    return puestoAlSoltar(
      tarjetas.map((t) => {
        const r = t.getBoundingClientRect();
        return r.top + r.height / 2;
      }),
      e.clientY,
    );
  }

  function encima(e: DragEvent) {
    const id = arrastrada(e, serie);
    if (!id) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    marca = puesto(e, id);
    arrastrandoId = id;
  }

  function fuera(e: DragEvent) {
    if (!lista.contains(e.relatedTarget as Node)) marca = null;
  }

  async function soltar(e: DragEvent) {
    const id = arrastrada(e, serie);
    const p = id ? puesto(e, id) : null;
    marca = null;
    if (!id || p === null) return;
    e.preventDefault();
    limpiar();
    estado.arrastrando = false;
    alArrastrar(null);
    await estado.moverEscena(id, episodio, col.acto, p);
  }

  // La marca, contando sin la arrastrada: el índice de la tarjeta antes de la que cae
  const visibles = $derived(col.escenas.filter((x) => x.id !== arrastrandoId));
  // La lente (spec 010, RF-4): el acto sin ninguna escena relacionada, atenuado
  const sinLente = $derived(!!estado.relacionLente && !col.escenas.some((x) => estado.relacionLente!.escenas.has(x.id)));
  const antesDe = $derived(marca === null ? null : (visibles[marca]?.id ?? "fin"));
</script>

{#snippet estabaAqui(x: EstabaAqui)}
  {@const t = marcas()?.textos?.estaba ?? "Estaba aquí"}
  <div class="estaba" class:fantasma={marcas()?.fantasma} title="{t}: «{x.titulo}»">{t}: «{x.titulo}»</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="acto" class:sin-acto={col.acto === ""} data-acto={col.acto} ondragover={encima} ondragleave={fuera} ondrop={soltar} bind:this={lista}>
  <div class="cab-acto" class:fuera-lente={sinLente}>
    <span class="nom">{col.nombre}{#if sinLente}<span class="solo-lector">, fuera de la lente</span>{/if}</span>
    <span class="n">{col.escenas.length}<span class="solo-lector">{col.escenas.length === 1 ? " escena" : " escenas"}</span></span>
    {#if col.resumen}<span class="res">{col.resumen}</span>{/if}
  </div>
  {#each col.escenas as esc, i (esc.id)}
    {#each estaban.filter((x) => x.puesto === i) as x (x.id)}{@render estabaAqui(x)}{/each}
    {#if antesDe === esc.id}<div class="marca" aria-hidden="true"></div>{/if}
    <Columna
      col={esc}
      draggable={!bloqueo}
      aria-keyshortcuts={bloqueo ? undefined : "Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"}
      ondragstart={(e: DragEvent) => {
        empezar(e, esc.id, serie);
        estado.arrastrando = true;
        arrastrandoId = esc.id;
        alArrastrar(col.acto);
      }}
      ondragend={() => {
        limpiar();
        estado.arrastrando = false;
        arrastrandoId = null;
        marca = null;
        alArrastrar(null);
      }}
    />
  {/each}
  {#each estaban.filter((x) => x.puesto >= col.escenas.length) as x (x.id)}{@render estabaAqui(x)}{/each}
  {#if antesDe === "fin"}<div class="marca" aria-hidden="true"></div>{/if}
  {#if !col.escenas.length}<span class="vacio-acto">{TEXTO_ACTO_VACIO}</span>{/if}
  {#if bloqueo}
    <button class="btn mas" aria-disabled="true" title={bloqueo}><Plus class="i" />Escena<span class="solo-lector">: {bloqueo}</span></button>
  {:else}
    <button class="btn mas" onclick={() => estado.abrirNueva("evento", { acto: col.acto })}><Plus class="i" />Escena<span class="solo-lector"> en {col.nombre}</span></button>
  {/if}
</div>
