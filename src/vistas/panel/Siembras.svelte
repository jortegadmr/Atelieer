<script lang="ts">
  // Siembras y recogidas del arco (D10), con "Sugerir": propone candidatas y el
  // autor acepta cada una con un clic. Nada se copia solo.
  import Check from "@lucide/svelte/icons/check";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { sugerirSiembras } from "../../lib/modelo/siembras";
  import type { Arco, Siembra } from "../../lib/modelo/tipos";

  const { arco }: { arco: Arco } = $props();
  const estado = usarEstado();
  const editar = (fn: (a: Arco) => void) => estado.sesion!.editar<Arco>(arco.id, fn);

  let sugeridas = $state<Siembra[] | null>(null);
  $effect(() => {
    void arco.id;
    sugeridas = null;
  });

  const descartados = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    if (!sugeridas) return [];
    return [
      ...c.tramos(m, arco.id).filter((t) => t.madurez === "descartado").map((t) => t.titulo || "Tramo sin título"),
      ...c.eventosDeArco(m, arco.id).filter((e) => e.madurez === "descartado").map((e) => e.titulo || "Escena sin título"),
    ];
  });

  function sugerir() {
    sugeridas = sugerirSiembras(estado.sesion!.modelo, arco.id);
  }

  function aceptar(s: Siembra) {
    editar((a) => a.siembras.push({ ...s }));
    sugeridas = sugeridas?.filter((x) => x !== s) ?? null;
  }

  const cambiar = (i: number, k: keyof Siembra, v: string) => editar((a) => (a.siembras[i][k] = v));
</script>

<div class="f">
  <span class="lbl">Siembras y recogidas<span class="ref">D10</span></span>
  <div class="lista">
    {#each arco.siembras as s, i (i)}
      <div class="siembra">
        <input class="v" placeholder="Qué se siembra" value={s.siembra} oninput={(e) => cambiar(i, "siembra", e.currentTarget.value)} />
        <input class="v mono" placeholder="Dónde" value={s.donde} oninput={(e) => cambiar(i, "donde", e.currentTarget.value)} />
        <input class="v" placeholder="Cómo se recoge" value={s.recogida} oninput={(e) => cambiar(i, "recogida", e.currentTarget.value)} />
        <input class="v mono" placeholder="Dónde" value={s.donde_recogida} oninput={(e) => cambiar(i, "donde_recogida", e.currentTarget.value)} />
        <button class="quitar" aria-label="Quitar" title="Quitar" onclick={() => editar((a) => a.siembras.splice(i, 1))}><X class="i" /></button>
      </div>
    {/each}
    <div class="acciones">
      <button class="mas" onclick={() => editar((a) => a.siembras.push({ siembra: "", donde: "", recogida: "", donde_recogida: "" }))}>
        <Plus class="i" />Añadir
      </button>
      <button class="mas" onclick={sugerir}><Lightbulb class="i" />Sugerir</button>
    </div>
    {#if sugeridas}
      <div class="sugeridas">
        {#each sugeridas as s (s.siembra + s.donde)}
          <div class="sug">
            <span><b>{s.siembra}</b><small>{s.donde} → {s.recogida} · {s.donde_recogida}</small></span>
            <button class="btn" onclick={() => aceptar(s)}><Check class="i" />Aceptar</button>
          </div>
        {:else}
          <p class="nota">Sin candidatas: ningún secreto se revela en las escenas de este arco, o sus pistas ya están aquí.</p>
        {/each}
        {#if descartados.length}
          <p class="nota">Irán a «Alternativas descartadas» al pasar el arco a la wiki: {descartados.join(", ")}.</p>
        {/if}
      </div>
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
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
  .lista {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .siembra {
    display: grid;
    grid-template-columns: 1fr 72px 26px;
    gap: 4px 6px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .siembra .quitar {
    grid-row: 1 / span 2;
    grid-column: 3;
  }
  .quitar {
    color: var(--ink-3);
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
  }
  .quitar:hover {
    background: var(--hover);
    color: var(--ink);
  }
  .acciones {
    display: flex;
    gap: 14px;
  }
  .mas {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-3);
    font-size: 12px;
  }
  .mas:hover {
    color: var(--ink);
  }
  .sugeridas {
    border: 1px dashed var(--line-2);
    border-radius: 8px;
    padding: 6px 10px;
  }
  .sug {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
  }
  .sug + .sug {
    border-top: 1px solid var(--line);
  }
  .sug span {
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
  }
  .sug b {
    font-weight: 500;
    display: block;
  }
  .sug small {
    color: var(--ink-3);
    font-size: 11px;
  }
  .nota {
    color: var(--ink-3);
    font-size: 11.5px;
    margin: 6px 0;
  }
</style>
