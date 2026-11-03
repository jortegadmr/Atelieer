<script lang="ts">
  // La bandeja de la temporada en el visor (spec 003, RF-29 a RF-32): las
  // escenas sin episodio, en su orden. Se arrastran a la columna de un
  // episodio; pinchar o Intro las elige (desde el panel se les pone episodio).
  import { usarEstado } from "../../lib/app/contexto";
  import { TEXTO_BANDEJA_VACIA, type Columna as Col } from "../../lib/vistas/visor";
  import { empezar, limpiar } from "./arrastre-visor";
  import Columna from "./Columna.svelte";
  import type { EstabaAqui } from "../../lib/consecuencias/visor";
  import { usarMarcas } from "./marcas";

  const { escenas }: { escenas: Col[] } = $props();
  const estado = usarEstado();
  // Escenas que estaban en la bandeja y se fueron (spec 005, RF-28)
  const marcas = usarMarcas();
  const estaban = $derived(marcas()?.estabanAqui ?? []);
</script>

{#snippet estabaAqui(x: EstabaAqui)}
  {@const t = marcas()?.textos?.estaba ?? "Estaba aquí"}
  <div class="estaba" class:fantasma={marcas()?.fantasma} title="{t}: «{x.titulo}»">{t}: «{x.titulo}»</div>
{/snippet}


<div class="bandeja-v" role="group" aria-label="Bandeja de la temporada">
  <div class="cab-acto">
    <span class="nom">Bandeja</span>
    <span class="n">{escenas.length}<span class="solo-lector">{escenas.length === 1 ? " escena" : " escenas"}</span></span>
  </div>
  {#each escenas as esc, i (esc.id)}
    {#each estaban.filter((x) => x.puesto === i) as x (x.id)}{@render estabaAqui(x)}{/each}
    <Columna
      col={esc}
      draggable="true"
      ondragstart={(e: DragEvent) => {
        empezar(e, esc.id, estado.sesion!.carpeta);
        estado.arrastrando = true;
      }}
      ondragend={() => {
        limpiar();
        estado.arrastrando = false;
      }}
    />
  {:else}
    <span class="vacio-acto">{TEXTO_BANDEJA_VACIA}</span>
  {/each}
  {#each estaban.filter((x) => x.puesto >= escenas.length) as x (x.id)}{@render estabaAqui(x)}{/each}
</div>
