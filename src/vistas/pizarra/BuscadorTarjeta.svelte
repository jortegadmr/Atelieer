<script lang="ts">
  import { usarEstado } from "../../lib/app/contexto";
  import { ETIQUETA_TIPO, piezasParaTarjeta } from "../../lib/pizarra/resolver";

  type Props = {
    /** El buscador pide poner la tarjeta de esta pieza; devuelve false si no cupo (y lo dice) */
    alElegir: (pieza: string) => boolean;
    alCerrar: () => void;
  };
  let { alElegir, alCerrar }: Props = $props();

  const estado = usarEstado();
  const pz = estado.pizarra;

  let texto = $state("");
  let activa = $state(0);
  let campo = $state<HTMLInputElement>();

  const resultados = $derived.by(() => {
    void estado.version;
    const m = estado.sesionSerie?.modelo;
    return m ? piezasParaTarjeta(m, pz.pizarra, texto) : [];
  });

  $effect(() => {
    campo?.focus();
  });
  $effect(() => {
    void texto;
    activa = 0;
  });

  function teclas(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      alCerrar();
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      activa = Math.min(resultados.length - 1, activa + 1);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      activa = Math.max(0, activa - 1);
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const r = resultados[activa];
      if (r) elegir(r.id);
    }
  }

  function elegir(id: string) {
    if (alElegir(id)) alCerrar();
  }
</script>

<div class="buscador" role="dialog" aria-label="Añadir tarjeta de una pieza">
  <input
    bind:this={campo}
    bind:value={texto}
    type="text"
    role="combobox"
    aria-expanded="true"
    aria-controls="piezas-tarjeta"
    aria-activedescendant={resultados[activa] ? `pieza-${resultados[activa].id}` : undefined}
    placeholder="Episodio, escena, arco o secreto…"
    onkeydown={teclas}
  />
  <ul id="piezas-tarjeta" role="listbox" aria-label="Piezas">
    {#each resultados as r, i (r.id)}
      <li id="pieza-{r.id}" role="option" aria-selected={i === activa} class:on={i === activa} class:descartada={r.descartada}>
        <button tabindex="-1" onclick={() => elegir(r.id)}>
          <span class="tipo">{ETIQUETA_TIPO[r.tipo]}{r.detalle ? ` · ${r.detalle}` : ""}</span>
          <span class="tit">{r.titulo}</span>
          {#if r.descartada}<span class="desc">Descartada</span>{/if}
        </button>
      </li>
    {:else}
      <li class="vacio" role="presentation">{texto ? "Nada con eso. Quizá ya tiene tarjeta." : "No quedan piezas sin tarjeta."}</li>
    {/each}
  </ul>
</div>

<style>
  .buscador {
    position: absolute;
    z-index: 30;
    margin-top: 6px;
    width: 340px;
    background: var(--surface);
    border: 1px solid var(--line-2);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 8px;
  }
  input {
    width: 100%;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 6px 10px;
    background: var(--surface-2);
    color: var(--ink);
    font: inherit;
  }
  ul {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    max-height: 260px;
    overflow: auto;
  }
  li button {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border-radius: 6px;
    align-items: baseline;
  }
  li.on button,
  li button:hover {
    background: var(--hover);
  }
  li.on button {
    background: var(--sel);
  }
  .tipo {
    font-size: 11.5px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .desc {
    font-size: 11.5px;
    color: var(--warn);
  }
  .descartada .tit {
    text-decoration: line-through;
    color: var(--ink-3);
  }
  .vacio {
    padding: 8px;
    color: var(--ink-3);
    font-size: 12.5px;
  }
</style>
