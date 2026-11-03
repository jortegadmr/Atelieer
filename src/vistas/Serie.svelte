<script lang="ts">
  // Paso 1 · Serie (spec 5.1, maqueta #z=serie).
  import CircleHelp from "@lucide/svelte/icons/circle-question-mark";
  import Flag from "@lucide/svelte/icons/flag";
  import Layers2 from "@lucide/svelte/icons/layers-2";
  import ListChecks from "@lucide/svelte/icons/list-checks";
  import Plus from "@lucide/svelte/icons/plus";
  import Scale from "@lucide/svelte/icons/scale";
  import { usarEstado } from "../lib/app/contexto";
  import type { ClaveCampo } from "../lib/guia/campos";
  import * as c from "../lib/modelo/consultas";
  import { crearPunto, crearTemporada } from "../lib/modelo/operaciones";
  import { escalaSerie } from "../lib/vistas/escala";
  import Leyenda from "./comunes/Leyenda.svelte";
  import Temporadas from "./serie/Temporadas.svelte";
  import TramaGlobal from "./serie/TramaGlobal.svelte";

  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const s = m.serie;
    return {
      serie: s,
      hechas: s.preguntas.filter((p) => p.respuesta.trim()).length,
      temporadas: c.temporadasEnOrden(m).length,
      escala: escalaSerie(m),
    };
  });

  const elegirSerie = (pestana: "editar" | "guia" = "editar") => estado.elegir(d.serie.id, pestana);

  /** Lleva el foco a ese campo de la serie en el panel (spec 019, RF-1) */
  function irAlCampo(clave: ClaveCampo) {
    estado.elegir(d.serie.id, "editar");
    estado.irAlCampo(d.serie.id, clave);
  }

  async function nuevaTemporada() {
    const { pieza, cambio } = crearTemporada(estado.sesion!.modelo);
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id, "editar");
  }

  async function nuevoPunto() {
    const m = estado.sesion!.modelo;
    const primera = c.temporadasEnOrden(m)[0];
    const { pieza, cambio } = crearPunto(m, { posicion: { temporada: primera?.id ?? "", episodio: "" } });
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id, "editar");
  }
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Paso 1 · Serie</div>
    <button class="titulo" onclick={() => irAlCampo("serie.titulo")}><h1 class="t">{d.serie.titulo || "Sin título"}</h1></button>
    {#if d.serie.premisa}
      <p class="logline">{d.serie.premisa}</p>
    {:else}
      <button class="logline vacia" onclick={() => irAlCampo("serie.premisa")}>¿Cuál es la premisa? Una o dos frases (§4).</button>
    {/if}
  </div>
  <div class="meta">
    <button class="pill" onclick={() => elegirSerie("guia")}><ListChecks class="i" />{d.hechas}/{d.serie.preguntas.length} preguntas</button>
    <span class="pill"><Layers2 class="i" />{d.temporadas} {d.temporadas === 1 ? "temporada" : "temporadas"}</span>
  </div>
</div>

<div class="g3 tarjetas">
  <button class="bx" class:empty={!d.serie.pregunta_oro} onclick={() => irAlCampo("serie.pregunta")}>
    <h3><CircleHelp class="i" />Pregunta de oro<span class="ref">§18</span></h3>
    {#if d.serie.pregunta_oro}<p>{d.serie.pregunta_oro}</p>{:else}<p class="hint">La pregunta que el final responde.</p>{/if}
  </button>
  <button class="bx" class:empty={!d.serie.final_decidido} onclick={() => irAlCampo("serie.final")}>
    <h3><Flag class="i" />Final decidido<span class="ref">§18</span></h3>
    {#if d.serie.final_decidido}<p>{d.serie.final_decidido}</p>{:else}<p class="hint">Decide el final antes de escribir, aunque sea en una línea.</p>{/if}
  </button>
  <button class="bx" class:empty={!d.serie.preguntas_filosoficas[0]} onclick={() => irAlCampo("serie.filosoficas")}>
    <h3><Scale class="i" />Pregunta filosófica<span class="ref">§3</span></h3>
    {#if d.serie.preguntas_filosoficas[0]}
      <p>{d.serie.preguntas_filosoficas[0]}</p>
      {#if d.serie.preguntas_filosoficas.length > 1}<small class="mas">y {d.serie.preguntas_filosoficas.length - 1} más</small>{/if}
    {:else}<p class="hint">¿Qué creencia pone a prueba la serie?</p>{/if}
  </button>
</div>

<div class="sec">
  <div class="sec-h">
    <h2>Arco de la serie · orden de emisión</h2>
    <div class="tools">
      <button class="btn" onclick={nuevaTemporada}><Plus class="i" />Temporada</button>
      <button class="btn" onclick={nuevoPunto}><Plus class="i" />Punto clave</button>
    </div>
  </div>
  <div class="card board">
    <Temporadas escala={d.escala} />
    <TramaGlobal escala={d.escala} />
  </div>
  <Leyenda puntos />
</div>

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
  .tarjetas {
    margin-bottom: 24px;
  }
  .tarjetas .bx {
    text-align: left;
    width: 100%;
  }
  .mas {
    color: var(--ink-3);
    font-size: 11.5px;
    margin-top: auto;
  }
</style>
