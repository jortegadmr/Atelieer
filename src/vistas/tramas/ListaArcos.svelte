<script lang="ts">
  // Columna izquierda del taller (spec 5.2, T3.1): de serie arriba con sus
  // tramos sangrados; sueltos de temporada; descartados tachados y visibles.
  // Se reordenan arrastrando (el orden lo guarda la serie).
  import { enfocable, lenteDeArco as lenteDe } from "../comunes/enfocable";
  import { estadoDe } from "../../lib/modelo/estados";
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { crearArco, moverArco } from "../../lib/modelo/operaciones";
  import type { Arco } from "../../lib/modelo/tipos";
  import { subtituloArco } from "../../lib/vistas/textos";
  import Madurez from "../comunes/Madurez.svelte";
  import type { ConFuente } from "../../lib/consecuencias/fuente";
  import type { MarcasTramas } from "../../lib/consecuencias/vistas";

  // `marcas`: «Nueva» y «Ya no está» de «Si lo dejas así…» o la variante (spec 009, RF-30, RF-31)
  const { actual, marcas = null }: { actual: string | null; marcas?: ConFuente<MarcasTramas> | null } = $props();
  const estado = usarEstado();

  const grupos = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const todos = c.arcosEnOrden(m);
    const vivos = todos.filter((a) => a.madurez !== "descartado");
    const deSerie = vivos.filter((a) => a.nivel === "serie");
    const idsSerie = new Set(deSerie.map((a) => a.id));
    const serie: { a: Arco; tramo: boolean }[] = [];
    for (const a of deSerie) {
      serie.push({ a, tramo: false });
      for (const t of vivos) if (t.tramo_de === a.id && t.nivel === "temporada") serie.push({ a: t, tramo: true });
    }
    const sueltos = vivos.filter((a) => a.nivel === "temporada" && !idsSerie.has(a.tramo_de));
    const descartados = todos.filter((a) => a.madurez === "descartado");
    const sub = new Map(todos.map((a) => [a.id, subtituloArco(m, a)]));
    const conAviso = new Set(estado.sesion!.resultado().avisos.filter((a) => a.clase === "aviso").map((a) => a.pieza));
    return { serie, sueltos, descartados, sub, orden: todos.map((a) => a.id), conAviso };
  });

  async function nuevo(nivel: "serie" | "temporada") {
    const m = estado.sesion!.modelo;
    const ts = c.temporadasEnOrden(m);
    const temporada = nivel === "temporada" ? (ts.find((t) => t.estado === "en marcha") ?? ts[0])?.id ?? "" : "";
    const { pieza, cambio } = crearArco(m, { nivel, temporada, tipo_trama: nivel === "serie" ? "A" : "B" });
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id);
  }

  let arrastrando = $state<string | null>(null);
  let encima = $state<string | null>(null);

  async function soltar(destino: string) {
    const origen = arrastrando;
    arrastrando = encima = null;
    if (!origen || origen === destino) return;
    const indice = grupos.orden.indexOf(destino);
    await estado.sesion!.aplicar(moverArco(estado.sesion!.modelo, origen, indice));
  }
</script>

{#snippet fila(a: Arco, tramo: boolean)}
  <button
    class="tl"
    class:on={a.id === actual}
    class:ch={tramo}
    class:desc={a.madurez === "descartado"}
    class:aparcado={estadoDe(a) === "aparcado"}
    class:arrastrando={arrastrando === a.id}
    class:encima={encima === a.id && arrastrando !== a.id}
    draggable="true"
    ondragstart={(e) => {
      arrastrando = a.id;
      e.dataTransfer?.setData("text/plain", a.id);
    }}
    ondragend={() => (arrastrando = encima = null)}
    ondragover={(e) => {
      if (!arrastrando) return;
      e.preventDefault();
      encima = a.id;
    }}
    ondrop={(e) => {
      e.preventDefault();
      void soltar(a.id);
    }}
    onclick={() => estado.verArco(a.id)}
    use:enfocable={{ estado, lente: lenteDe(a) }}
  >
    <span class="bar" style:background={a.madurez === "descartado" ? "var(--line-2)" : `var(--t${a.color})`}></span>
    <span class="txt">
      <span class="nm">{a.titulo || "Sin título"}</span>
      {#if marcas?.nuevos.has(a.id)}<span class="marca-antes" class:fantasma={marcas.fantasma}>{marcas.textos.nueva}</span>{/if}
      <small>{a.madurez === "descartado" && a.motivo_descarte ? a.motivo_descarte : grupos.sub.get(a.id)}</small>
    </span>
    <span class="r">{#if grupos.conAviso.has(a.id)}<span class="wn" title="Tiene avisos"><TriangleAlert class="i" style="width:13px;height:13px" /></span>{/if}<Madurez madurez={estadoDe(a)} />{#if a.madurez !== "descartado"}<span class="tipo">{a.tipo_trama}</span>{/if}</span>
  </button>
{/snippet}

<div class="card tlist">
  <div class="tl-h">De serie<button onclick={() => nuevo("serie")}><Plus class="i" style="width:13px;height:13px" />Nueva</button></div>
  {#each grupos.serie as { a, tramo } (a.id)}{@render fila(a, tramo)}{/each}
  {#if !grupos.serie.length}<p class="vacio">Ninguno todavía.</p>{/if}

  <div class="tl-h">Sueltas de temporada<button onclick={() => nuevo("temporada")}><Plus class="i" style="width:13px;height:13px" />Nueva</button></div>
  {#each grupos.sueltos as a (a.id)}{@render fila(a, false)}{/each}
  {#if !grupos.sueltos.length}<p class="vacio">Ninguna.</p>{/if}

  {#if grupos.descartados.length}
    <div class="tl-h">Descartadas · {grupos.descartados.length}</div>
    {#each grupos.descartados as a (a.id)}{@render fila(a, false)}{/each}
  {/if}

  {#if marcas?.yaNoEsta.length}
    <ul class="ya-no">
      {#each marcas.yaNoEsta as x (x.id)}<li><span class="marca-antes" class:fantasma={marcas.fantasma}>{marcas.textos.yaNo}: «{x.titulo}»</span></li>{/each}
    </ul>
  {/if}

  <div class="legend">
    <span><Madurez madurez="idea" />Idea</span><span><Madurez madurez="propuesta" />Propuesta</span><span><Madurez madurez="aparcado" />Aparcado</span><span><Madurez madurez="borrador" />Borrador</span><span><Madurez madurez="canon" />Canon</span>
  </div>
</div>

<style>
  .txt {
    min-width: 0;
  }
  .txt .nm,
  .txt small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tl.desc {
    cursor: pointer;
  }
  .vacio {
    color: var(--ink-3);
    font-size: 12px;
    margin: 0 10px 6px;
  }
  .ya-no {
    margin: 8px 10px 0;
  }
  .legend {
    margin: 10px 10px 6px;
    gap: 12px;
  }
  .arrastrando {
    opacity: 0.4;
  }
  .encima {
    box-shadow: inset 0 2px 0 var(--accent);
  }
</style>
