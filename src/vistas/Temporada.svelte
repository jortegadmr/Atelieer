<script lang="ts">
  // Paso 3 · Temporada (spec 5.3; maqueta #z=temporada).
  import { estadoDe } from "../lib/modelo/estados";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Copy from "@lucide/svelte/icons/copy";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../lib/app/contexto";
  import * as c from "../lib/modelo/consultas";
  import { insertarEpisodio } from "../lib/modelo/operaciones";
  import { ESTADO, etiqueta } from "../lib/modelo/vocabulario";
  import { mayus } from "../lib/vistas/textos";
  import { temporadaVisible } from "../lib/vistas/visor";
  import Carga from "./comunes/Carga.svelte";
  import Leyenda from "./comunes/Leyenda.svelte";
  import Madurez from "./comunes/Madurez.svelte";
  import Cajas from "./temporada/Cajas.svelte";
  import Curva from "./temporada/Curva.svelte";
  import FilaEpisodios from "./temporada/FilaEpisodios.svelte";
  import Lineas from "./temporada/Lineas.svelte";
  import Secretos from "./temporada/Secretos.svelte";

  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const ts = c.temporadasEnOrden(m);
    const t = temporadaVisible(m, estado.temporadaActual);
    if (!t) return null;
    const episodios = c.episodiosDeTemporada(m, t.id);
    const ids = new Set([t.id, ...episodios.map((e) => e.id)]);
    const carga = estado.sesion!.resultado().avisos.filter((a) => a.id.startsWith("C01") && ids.has(a.pieza));
    return { carga, t, codigo: c.codigo(m, t.id), episodios, codigos: episodios.map((e) => c.codigo(m, e.id)), hayOtras: ts.length > 1, ts: ts.map((x) => ({ id: x.id, codigo: c.codigo(m, x.id) })) };
  });

  async function nuevoEpisodio() {
    if (!d) return;
    const { pieza, cambio } = insertarEpisodio(estado.sesion!.modelo, d.t.id, d.episodios.length);
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id, "editar");
  }
</script>

{#if !d}
  <div class="card vacio"><p>Todavía no hay temporadas. Crea la primera en el paso 1 (Serie).</p></div>
{:else}
  {@const t = d.t}
  {@const n = d.episodios.length}
  <div class="vh">
    <div>
      <div class="eyebrow">
        Paso 3 · Temporada {d.codigo.slice(1).replace(/^0/, "")} · {n} episodios
        {#if t.carga[0] || t.carga[1]}· <Carga carga={t.carga} />{/if}
        · <Madurez madurez={estadoDe(t)} /> {mayus(etiqueta(ESTADO, estadoDe(t)))}
      </div>
      <button class="titulo" onclick={() => estado.elegir(t.id)}><h1 class="t">{t.titulo || "Sin título"}</h1></button>
      {#if t.logline}<p class="logline">{t.logline}</p>{:else}<button class="logline vacia" onclick={() => estado.elegir(t.id)}>La temporada en una frase…</button>{/if}
    </div>
    <div class="meta">
      {#if d.carga.length}
        <button class="pill warn" onclick={() => estado.elegir(d.carga[0].pieza)}>
          <TriangleAlert class="i" />{d.carga.length} {d.carga.length === 1 ? "aviso" : "avisos"} de carga
        </button>
      {/if}
      {#if d.hayOtras}
        <span class="tg" role="radiogroup" aria-label="Temporada">
          {#each d.ts as x (x.id)}
            <button role="radio" aria-checked={x.id === t.id} class:on={x.id === t.id} onclick={() => estado.cambiarTemporada(x.id)}>{x.codigo}</button>
          {/each}
        </span>
      {/if}
      <button class="btn ghost" disabled title="Llega en la fase 2"><Copy class="i" />¿Y si…?</button>
      <button class="btn" title={t.wiki ? "Ya está en la wiki" : "Pasar a la wiki (en el panel)"} onclick={() => estado.elegir(t.id)}>
        <BookOpen class="i" />{t.wiki ? "En la wiki" : "Pasar a la wiki"}
      </button>
    </div>
  </div>

  <button class="q" onclick={() => estado.elegir(t.id)}>
    <b>Pregunta dramática</b><span>{t.pregunta_dramatica || "—"}</span>
    <b class="tema">Tema</b><span>{t.tema || "—"}</span>
  </button>

  <Cajas temporada={t} />

  <div class="sec">
    <div class="sec-h">
      <h2>Episodios, tramas y secretos</h2>
      <div class="tools">
        <button class="btn" onclick={() => estado.cambiarVista("episodios")}><LayoutGrid class="i" />Abrir rejilla</button>
        <button class="btn" onclick={nuevoEpisodio}><Plus class="i" />Episodio</button>
      </div>
    </div>
    {#if n}
      <div class="card board r3">
        <FilaEpisodios episodios={d.episodios} codigos={d.codigos} />
        <div class="row">
          <div class="rl"><span><span class="nm">Carga</span><small>montaña rusa + / −</small></span></div>
          <div><Curva episodios={d.episodios} /></div>
          <div class="gut">{#if t.carga[0] || t.carga[1]}<Carga carga={t.carga} texto={false} />{/if}</div>
        </div>
        <Lineas temporadaId={t.id} {n} />
        <div class="row sepr"><div class="rl secretos">Secretos</div><div></div><div></div></div>
        <Secretos temporadaId={t.id} {n} />
      </div>
    {:else}
      <div class="card vacio"><p>Esta temporada aún no tiene episodios. Añade el primero con «+ Episodio».</p></div>
    {/if}
  </div>

  <div class="sec">
    <!-- La bandeja va en el visor de la temporada (spec 003, RF-34) -->
    <Leyenda secretos carga />
  </div>
{/if}

<style>
  .titulo {
    display: block;
    text-align: left;
  }
  .logline.vacia {
    display: block;
    text-align: left;
    color: var(--ink-3);
  }
  .q {
    text-align: left;
    width: 100%;
  }
  .q .tema {
    margin-left: 18px;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .secretos {
    color: var(--ink-3);
    font-size: 11px;
  }
  .vacio {
    padding: 24px;
  }
  .vacio p {
    margin: 0;
    color: var(--ink-2);
    font: italic 17px/1.4 var(--serif);
  }
</style>
