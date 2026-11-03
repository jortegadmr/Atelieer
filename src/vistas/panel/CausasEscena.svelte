<script lang="ts">
  // «Viene de» y «Provoca» de la escena (spec 011, RF-1 a RF-10, RF-12).
  // Con canon bloqueado el panel va en un <fieldset disabled>: los botones se
  // apagan solos y las escenas son enlaces, porque abrirlas es leer.
  import X from "@lucide/svelte/icons/x";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Evento } from "../../lib/modelo/tipos";
  import { anadirCausa, leerVieneDe, ponerVieneDe, quitarCausa, type Entrada } from "../../lib/modelo/viene-de";
  import { filasProvoca, filasVieneDe } from "../../lib/vistas/causas";
  import BuscarEscena from "../comunes/BuscarEscena.svelte";

  const { evento }: { evento: Evento } = $props();
  const estado = usarEstado();
  const editar = (fn: (e: Evento) => void) => estado.sesion!.editar<Evento>(evento.id, fn);

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const l = leerVieneDe(evento);
    const filas = filasVieneDe(m, evento);
    return { l, filas, provoca: filasProvoca(m, evento), excluir: new Set([evento.id, ...filas.flatMap((f) => (f.id ? [f.id] : []))]) };
  });

  const anadir = (id: string) => editar((e) => ponerVieneDe(e, anadirCausa(e, id)));
  const quitar = (x: Entrada) => editar((e) => ponerVieneDe(e, quitarCausa(e, x)));

  function abrir(e: MouseEvent, id: string) {
    e.preventDefault();
    estado.elegir(id, "editar");
  }
</script>

<div class="f">
  <span class="lbl">Viene de</span>
  <div class="v bloque">
    {#if !d.l.editable}
      <p class="crudo">{d.l.crudo}</p>
      <p class="nota">«Viene de» está escrito a mano de otra forma: cámbialo en Obsidian.</p>
    {:else}
      {#if d.filas.length}
        <ul>
          {#each d.filas as f (f.entrada!.i)}
            <li>
              <span class="nm">
                {#if f.id}
                  <a class="enlace" href="#{f.id}" onclick={(e) => abrir(e, f.id!)} draggable="false">{f.titulo}</a>
                  <span class="donde">{f.donde}</span>
                {:else}
                  <span class="raro">{f.titulo}</span>
                {/if}
                {#each f.marcas as mk (mk)}<span class="marca">{mk}</span>{/each}
              </span>
              <button class="quitar" aria-label="Quitar «{f.titulo}» de Viene de" title="Quitar" onclick={() => quitar(f.entrada!)}><X class="i" /></button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="vacio">Ninguna todavía: ¿de qué escenas viene esta?</p>
      {/if}
      <BuscarEscena etiqueta="Añadir causa a Viene de" excluir={d.excluir} alElegir={anadir} />
    {/if}
  </div>
</div>

<div class="f">
  <span class="lbl">Provoca</span>
  <div class="v bloque">
    {#if d.provoca.length}
      <ul>
        {#each d.provoca as f (f.id)}
          <li>
            <span class="nm">
              <a class="enlace" href="#{f.id}" onclick={(e) => abrir(e, f.id!)} draggable="false">{f.titulo}</a>
              <span class="donde">{f.donde}</span>
              {#each f.marcas as mk (mk)}<span class="marca">{mk}</span>{/each}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="vacio">Ninguna escena viene de esta todavía.</p>
    {/if}
  </div>
</div>

<style>
  .lbl {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .bloque {
    display: block;
    padding: 2px 10px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
  }
  .nm {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
  }
  .donde {
    font: 10.5px var(--mono);
    color: var(--ink-3);
  }
  .raro {
    font: 11.5px var(--mono);
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  .marca {
    font-size: 11px;
    color: var(--warn);
  }
  .quitar {
    color: var(--ink-3);
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
  }
  .quitar:hover {
    background: var(--hover);
    color: var(--ink);
  }
  .vacio,
  .crudo {
    margin: 4px 0;
    color: var(--ink-3);
    font-size: 12px;
  }
  .crudo {
    font-family: var(--mono);
    overflow-wrap: anywhere;
  }
  .nota {
    font-size: 11.5px;
    color: var(--warn);
    margin: 4px 0 0;
  }
</style>
