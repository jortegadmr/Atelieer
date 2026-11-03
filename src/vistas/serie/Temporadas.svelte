<script lang="ts">
  // Franja de temporadas (spec 5.1): ancho según sus episodios, las previstas
  // con borde discontinuo, cada una con su carga. Se arrastran para cambiar el
  // orden de emisión (M2: solo se reescribe la serie).
  import { usarEstado } from "../../lib/app/contexto";
  import { estadoDe } from "../../lib/modelo/estados";
  import { moverTemporada } from "../../lib/modelo/operaciones";
  import type { EscalaSerie } from "../../lib/vistas/escala";
  import Carga from "../comunes/Carga.svelte";

  const { escala }: { escala: EscalaSerie } = $props();
  const estado = usarEstado();

  let arrastrando = $state<string | null>(null);
  let encima = $state<string | null>(null);

  const actual = $derived(
    escala.temporadas.find((x) => x.t.id === estado.seleccion)?.t.id ?? escala.temporadas.find((x) => x.t.estado === "en marcha")?.t.id,
  );

  async function soltar(destino: string) {
    const origen = arrastrando;
    arrastrando = encima = null;
    if (!origen || origen === destino) return;
    const indice = escala.temporadas.findIndex((x) => x.t.id === destino);
    await estado.sesion!.aplicar(moverTemporada(estado.sesion!.modelo, origen, indice));
  }
</script>

<div class="row">
  <div class="rl">Temporadas</div>
  <div class="trk">
    {#each escala.temporadas as s (s.t.id)}
      <button
        class="seas"
        class:cur={s.t.id === actual}
        class:plan={s.t.estado === "prevista"}
        class:aparcado={estadoDe(s.t) === "aparcado"}
        class:arrastrando={arrastrando === s.t.id}
        class:encima={encima === s.t.id && arrastrando !== s.t.id}
        style:left="{escala.pct(s.desde)}%"
        style:width="calc({escala.pct(s.ancho)}% - 4px)"
        title="{s.codigo}{s.t.titulo ? ` · ${s.t.titulo}` : ''} · arrastra para cambiar el orden"
        draggable="true"
        ondragstart={(e) => {
          arrastrando = s.t.id;
          e.dataTransfer?.setData("text/plain", s.t.id);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        }}
        ondragend={() => (arrastrando = encima = null)}
        ondragover={(e) => {
          if (!arrastrando) return;
          e.preventDefault();
          encima = s.t.id;
        }}
        ondragleave={() => {
          if (encima === s.t.id) encima = null;
        }}
        ondrop={(e) => {
          e.preventDefault();
          void soltar(s.t.id);
        }}
        onclick={() => estado.elegir(s.t.id)}
      >
        {s.codigo}
        <small>{s.episodios ? `${s.episodios} ep` : `${s.t.episodios_previstos || "¿?"} ep`}{s.t.estado === "prevista" ? " · prevista" : ""}</small>
        {#if s.t.carga[0] || s.t.carga[1]}<span class="cg"><Carga carga={s.t.carga} texto={false} /></span>{/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .seas {
    text-align: left;
    color: var(--ink);
  }
  .seas.plan {
    color: var(--ink-3);
  }
  .arrastrando {
    opacity: 0.4;
  }
  .encima {
    box-shadow: inset 3px 0 0 var(--accent);
  }
</style>
