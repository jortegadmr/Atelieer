<script lang="ts">
  // Las 10-11 preguntas de la serie (§2 §29) como lista con progreso (T2.2).
  // El resto de la pestaña Guía llega en el paso 6.
  import Check from "@lucide/svelte/icons/check";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Serie } from "../../lib/modelo/tipos";

  const { serie }: { serie: Serie } = $props();
  const estado = usarEstado();

  const hechas = $derived(serie.preguntas.filter((p) => p.respuesta.trim()).length);

  function responder(i: number, v: string) {
    estado.sesion!.editar<Serie>(serie.id, (s) => (s.preguntas[i].respuesta = v));
  }

  function ajustar(el: HTMLTextAreaElement) {
    const medir = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    medir();
    el.addEventListener("input", medir);
  }
</script>

<div class="ib-body">
  <div class="f">
    <span class="lbl">Las 10-11 preguntas · {hechas}/{serie.preguntas.length}<span class="ref">§2 · §29</span></span>
    <div class="v lista">
      {#each serie.preguntas as p, i (i)}
        {@const hecha = !!p.respuesta.trim()}
        <div class="chk">
          <span class="bx2" class:on={hecha}>{#if hecha}<Check class="i" />{/if}</span>
          <div class="cuerpo">
            <span>{p.pregunta}{#if i === 10}<small>de bonus</small>{/if}</span>
            <textarea
              rows="1"
              class="resp"
              placeholder="Sin responder"
              value={p.respuesta}
              oninput={(e) => responder(i, e.currentTarget.value)}
              use:ajustar
            ></textarea>
          </div>
        </div>
      {/each}
    </div>
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
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
  .lista {
    display: block;
    padding: 2px 10px;
  }
  .cuerpo {
    flex: 1;
    min-width: 0;
  }
  .cuerpo small {
    display: inline;
    margin-left: 6px;
  }
  .resp {
    display: block;
    width: 100%;
    margin-top: 3px;
    border: 0;
    background: transparent;
    resize: none;
    overflow: hidden;
    font: 400 14.5px/1.35 var(--serif);
    color: var(--ink);
    padding: 0;
    outline: none;
  }
  .resp::placeholder {
    color: var(--ink-3);
    font-style: italic;
  }
</style>
