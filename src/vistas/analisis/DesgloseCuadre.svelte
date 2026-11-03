<script lang="ts">
  // El cuadre guion–escena de todas las escenas con guion (spec 014, RF-16 a RF-19).
  // «Añadir a la escena» escribe por el camino de siempre, un solo paso del
  // deshacer; con una variante abierta solo informa.
  import { usarEstado } from "../../lib/app/contexto";
  import type { EstadoDesglose } from "../../lib/app/estado-desglose.svelte";
  import type { CuadreEscena, Lista } from "../../lib/desglose/cuadre";
  import CuadreVista from "./CuadreEscena.svelte";

  type Entrada = { id: string; codigo: string; titulo: string; cuadre: CuadreEscena };
  const { d, entradas, sinGuion }: { d: EstadoDesglose; entradas: Entrada[]; sinGuion: number } = $props();
  const estado = usarEstado();

  let soloDiferencias = $state(true);
  let mensaje = $state("");

  const mostradas = $derived(soloDiferencias ? entradas.filter((e) => !e.cuadre.cuadra) : entradas);
  const cuadran = $derived(entradas.filter((e) => e.cuadre.cuadra).length);

  async function anadir(id: string, items: Partial<Lista>) {
    const r = await d.anadir(id, items);
    mensaje = r.mensaje;
  }
</script>

<section class="cuadre-lista" aria-label="Cuadre entre el guion y las escenas">
  <p class="estima">
    Compara lo que dice cada guion con los personajes y lugares de su escena. Es información: no es un aviso de las guías.
    {#if sinGuion}{sinGuion} {sinGuion === 1 ? "escena sin guion no se compara" : "escenas sin guion no se comparan"}.{/if}
  </p>
  <label class="solo">
    <input type="checkbox" bind:checked={soloDiferencias} />
    Solo las que tienen diferencias ({entradas.length - cuadran} de {entradas.length})
  </label>
  <p class="estado" role="status">{mensaje || d.anuncio}</p>

  {#if !entradas.length}
    <p class="hint">Ninguna escena de las que se ven tiene guion.</p>
  {:else if !mostradas.length}
    <p class="hint">Todo cuadra: el guion y las escenas dicen lo mismo.</p>
  {:else}
    <ul class="escenas">
      {#each mostradas as e (e.id)}
        <li>
          <h3>
            <button class="enlace" title="Abrir en Guion" onclick={() => estado.irAGuionDe(e.id, true)}>{e.codigo ? `${e.codigo} · ` : ""}{e.titulo}</button>
          </h3>
          <CuadreVista
            cuadre={e.cuadre}
            bloqueada={estado.sesionSerie?.estaBloqueada(e.id) ?? false}
            puedeAnadir={!d.conVariante}
            alAnadir={(items) => void anadir(e.id, items)}
            alDesbloquear={() => estado.sesionSerie?.desbloquear(e.id)}
          />
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .cuadre-lista {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 900px;
  }
  .estima {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .solo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
  }
  .estado {
    margin: 0;
    min-height: 1.2em;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .escenas {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .escenas li {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 14px;
    background: var(--surface);
  }
  h3 {
    margin: 0 0 8px;
    font-size: 13.5px;
  }
  .enlace {
    text-align: left;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .enlace:hover {
    color: var(--accent);
  }
</style>
