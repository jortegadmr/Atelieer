<script lang="ts">
  // Fila de episodios con su estado de escritura (spec 5.3, T4.2). Se pulsan
  // para editarlos y se arrastran para cambiar el orden.
  import { usarEstado } from "../../lib/app/contexto";
  import { estadoDe } from "../../lib/modelo/estados";
  import { moverEpisodio } from "../../lib/modelo/operaciones";
  import type { Episodio } from "../../lib/modelo/tipos";
  import { ESTADO_ESCRITURA, etiqueta } from "../../lib/modelo/vocabulario";

  const { episodios, codigos }: { episodios: Episodio[]; codigos: string[] } = $props();
  const estado = usarEstado();

  const COLOR = { guion: "var(--ok)", escaleta: "var(--t2)", idea: "var(--line-2)" } as const;

  let arrastrando = $state<string | null>(null);
  let encima = $state<string | null>(null);

  async function soltar(destino: string) {
    const origen = arrastrando;
    arrastrando = encima = null;
    if (!origen || origen === destino) return;
    const indice = episodios.findIndex((e) => e.id === destino);
    await estado.sesion!.aplicar(moverEpisodio(estado.sesion!.modelo, origen, indice));
  }
</script>

<div class="row" style="min-height:0">
  <div class="rl"></div>
  <div class="epcols" style:grid-template-columns="repeat({episodios.length}, 1fr)">
    {#each episodios as e, i (e.id)}
      <button
        class="eph"
        class:on={estado.seleccion === e.id}
        class:aparcado={estadoDe(e) === "aparcado"}
        class:arrastrando={arrastrando === e.id}
        class:encima={encima === e.id && arrastrando !== e.id}
        title="{codigos[i]}{e.titulo ? ` · ${e.titulo}` : ''} · {etiqueta(ESTADO_ESCRITURA, e.estado)}"
        draggable="true"
        ondragstart={(ev) => {
          arrastrando = e.id;
          ev.dataTransfer?.setData("text/plain", e.id);
        }}
        ondragend={() => (arrastrando = encima = null)}
        ondragover={(ev) => {
          if (!arrastrando) return;
          ev.preventDefault();
          encima = e.id;
        }}
        ondrop={(ev) => {
          ev.preventDefault();
          void soltar(e.id);
        }}
        onclick={() => estado.elegir(e.id)}
      >
        <b>{codigos[i].slice(3)}</b>
        <span class="sd" style:background={COLOR[e.estado]}></span>
      </button>
    {/each}
  </div>
  <div></div>
</div>

<style>
  .eph.on {
    background: var(--sel);
  }
  .arrastrando {
    opacity: 0.4;
  }
  .encima {
    box-shadow: inset 2px 0 0 var(--accent);
  }
</style>
