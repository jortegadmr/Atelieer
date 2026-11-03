<script lang="ts">
  import { tick } from "svelte";
  // Paso 4 · Episodios: la rejilla (spec 5.4; maqueta #z=episodios). Filas =
  // arcos, columnas = episodios; en cada celda, sus eventos.
  import { estadoDe } from "../lib/modelo/estados";
  import MousePointerClick from "@lucide/svelte/icons/mouse-pointer-click";
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../lib/app/contexto";
  import * as c from "../lib/modelo/consultas";
  import { crearArco } from "../lib/modelo/operaciones";
  import type { Arco, Evento } from "../lib/modelo/tipos";
  import { ESTADO_ESCRITURA, etiqueta, MADUREZ, TIPO_ARCO } from "../lib/modelo/vocabulario";
  import { mayus } from "../lib/vistas/textos";
  import { temporadaVisible } from "../lib/vistas/visor";
  import Bandeja from "./comunes/Bandeja.svelte";
  import Carga from "./comunes/Carga.svelte";
  import Leyenda from "./comunes/Leyenda.svelte";
  import Celda from "./rejilla/Celda.svelte";
  import { enfocable, lenteDeArco } from "./comunes/enfocable";
  import { fuenteMarcas } from "../lib/consecuencias/fuente";
  import { marcasRejilla } from "../lib/consecuencias/vistas";
  import { PLANTILLAS } from "../lib/modelo/plantillas";
  import { esPlantilla } from "../lib/app/plantilla-vista";
  import { columnasPlantilla, episodiosPlantilla, type Columna } from "../lib/vistas/plantillas";

  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const ts = c.temporadasEnOrden(m);
    const t = temporadaVisible(m, estado.temporadaActual);
    if (!t) return null;
    const episodios = c.episodiosDeTemporada(m, t.id);
    const presentes = new Set(c.arcosPresentes(m, t.id).map((a) => a.id));
    const presentesOrden = c.arcosEnOrden(m).filter((a) => presentes.has(a.id));
    const arcos = [...presentesOrden.filter((a) => a.madurez !== "descartado"), ...presentesOrden.filter((a) => a.madurez === "descartado")];
    const celda = (a: Arco, ep: string) => c.eventosDeEpisodio(m, ep).filter((ev) => ev.arcos.some((x) => x.arco === a.id));
    const sinArco = (ep: string) => c.eventosDeEpisodio(m, ep).filter((ev) => !ev.arcos.some((x) => m.arcos.has(x.arco)));
    const filas = arcos.map((a) => ({ a, celdas: episodios.map((e) => celda(a, e.id)) }));
    const huerfanos = episodios.map((e) => sinArco(e.id));
    // «Si lo dejas así…» en gris, o la variante en acento (spec 009, RF-30 a RF-32)
    const f = fuenteMarcas(estado);
    const marcas = f ? { ...marcasRejilla(f.base, f.actual, f.ids, t.id), fantasma: f.fantasma, textos: f.textos } : null;
    // «Sin trama» sigue a la vista si una escena estaba ahí y se fue (RF-30)
    const estabaSinTrama = !!marcas && [...marcas.estabanAqui.keys()].some((k) => k.startsWith("|"));
    // La plantilla a la vista (spec 011, RF-36 a RF-40, RF-43)
    const { n } = episodiosPlantilla(m, t);
    const plantilla = n ? estado.plantillaVista(t.id) : null;
    const columnas = plantilla ? columnasPlantilla(m, t, plantilla) : [];
    const previstos = columnas.find((x) => x.tipo === "previstos") ?? null;
    return {
      t,
      codigoT: c.codigo(m, t.id),
      episodios: episodios.map((e) => ({ e, codigo: c.codigo(m, e.id) })),
      filas,
      huerfanos: huerfanos.some((l) => l.length) || estabaSinTrama ? huerfanos : null,
      marcas,
      ts: ts.map((x) => ({ id: x.id, codigo: c.codigo(m, x.id) })),
      n,
      plantilla,
      columnas,
      previstos,
      carga: new Set(estado.sesion!.resultado().avisos.filter((a) => a.id.startsWith("C01")).map((a) => a.pieza)),
    };
  });

  async function nuevaTrama() {
    if (!d) return;
    const { pieza, cambio } = crearArco(estado.sesion!.modelo, { nivel: "temporada", temporada: d.t.id, tipo_trama: "B" });
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id, "editar");
  }

  // La lente (spec 010, RF-4): con lente de arco, las filas de los otros arcos se atenúan
  const filaFuera = (id: string) => estado.lente?.tipo === "arco" && !!estado.relacionLente && !estado.relacionLente.arcos.has(id);
  const sub = (a: Arco) => `${a.tipo_arco === "trama" ? a.tipo_trama : `arco de ${etiqueta(TIPO_ARCO, a.tipo_arco)}`} · ${etiqueta(MADUREZ, a.madurez)}`;
  const vacio: Evento[] = [];

  // Filas: cabeceras, la de la plantilla si la hay, y luego los arcos y «Sin trama»
  const primera = $derived(d?.plantilla && d.columnas.length ? 3 : 2);
  const colPrevistos = $derived(d ? d.episodios.length + 2 : 0);

  // «+N más» (RF-39): al pulsarlo o enfocarlo enseña todas, y el foco sigue en la primera nueva
  let abiertas = $state(new Set<string>());
  // Por temporada y plantilla: al cambiar de plantilla, las columnas vuelven plegadas
  const claveCol = (x: Columna) => `${d?.t.id}|${d?.plantilla}|${x.tipo === "episodio" ? x.id : "previstos"}`;
  function verTodas(x: Columna, e: Event) {
    const caja = (e.currentTarget as HTMLElement).parentElement;
    abiertas = new Set([...abiertas, claveCol(x)]);
    void tick().then(() => caja?.querySelectorAll<HTMLElement>(".franja")[x.visibles.length]?.focus());
  }
  const franjasDe = (x: Columna) => (abiertas.has(claveCol(x)) ? x.franjas : x.visibles);

  // RF-41: la temporada en el panel, en el apartado de la plantilla
  function abrirApartado() {
    if (d?.plantilla) estado.abrirApartado(d.t.id, d.plantilla);
  }

  function elegirPlantilla(v: string) {
    if (d) estado.ponerPlantillaVista(d.t.id, esPlantilla(v) ? v : null);
  }

  // El episodio del visor, marcado y a la vista (spec 002, RF-20)
  let rejilla = $state<HTMLElement | null>(null);
  $effect(() => {
    const id = estado.episodioActual;
    if (!id || !rejilla) return;
    void tick().then(() => rejilla?.querySelector(".g-h.marcado")?.scrollIntoView({ block: "nearest", inline: "center" }));
  });
</script>

{#snippet celdaPlantilla(x: Columna, columna: number)}
  <!-- La fila de la plantilla no es zona de soltar -->
  <div class="g-p" style:grid-row={2} style:grid-column={columna}>
    {#each franjasDe(x) as f (f.clave)}
      <button class="franja {f.parte}" title={f.explicacion} onclick={abrirApartado}>
        <span class="nm">{f.nombre}</span><span class="cu">{f.texto}</span>
      </button>
    {/each}
    {#if x.resto && !abiertas.has(claveCol(x))}
      <button class="mas" onclick={(e) => verTodas(x, e)} onfocus={(e) => verTodas(x, e)}>+{x.resto} más</button>
    {/if}
    {#each x.atados as a (a.clave)}
      <button class="atado" class:aviso={!!a.estadoEscena} onclick={abrirApartado}>
        <span class="nm">{a.nombre}</span>
        {#if a.estadoEscena}<span class="cu">({a.estadoEscena})</span>{/if}
        {#if a.texto}<span class="txt">{a.texto}</span>{/if}
      </button>
    {/each}
  </div>
{/snippet}

{#if !d}
  <div class="card vacio"><p>Todavía no hay temporadas. Crea la primera en el paso 1 (Serie).</p></div>
{:else}
  <div class="vh">
    <div>
      <div class="eyebrow">Paso 4 · Temporada {d.codigoT.slice(1).replace(/^0/, "")} · rejilla de episodios</div>
      <h1 class="t">{d.t.titulo || "Sin título"}</h1>
    </div>
    <div class="meta">
      {#if d.ts.length > 1}
        <span class="tg" role="radiogroup" aria-label="Temporada">
          {#each d.ts as x (x.id)}
            <button role="radio" aria-checked={x.id === d.t.id} class:on={x.id === d.t.id} onclick={() => estado.cambiarTemporada(x.id)}>{x.codigo}</button>
          {/each}
        </span>
      {/if}
      <label class="filtro">
        <span class="nom">Plantilla</span>
        {#if d.n}
          <select class="v" value={d.plantilla ?? ""} onchange={(e) => elegirPlantilla(e.currentTarget.value)}>
            <option value="">Ninguna</option>
            {#each PLANTILLAS as p (p.id)}<option value={p.id}>{p.nombre}</option>{/each}
          </select>
        {:else}
          <select class="v" disabled><option>Añade episodios para ver la plantilla</option></select>
        {/if}
      </label>
      <span class="pill"><MousePointerClick class="i" />Clic en una celda vacía para crear</span>
      <button class="btn" onclick={nuevaTrama}><Plus class="i" />Trama</button>
    </div>
  </div>

  {#if !d.episodios.length && !d.previstos}
    <div class="card vacio"><p>Esta temporada aún no tiene episodios. Añádelos en el paso 3 (Temporada).</p></div>
  {:else}
    <div class="grid-wrap" bind:this={rejilla}>
      <div class="grid" style:grid-template-columns="184px repeat({d.episodios.length + (d.previstos ? 1 : 0)}, 156px)">
        <div class="g-corner" style:grid-row={1} style:grid-column={1}>Trama \ episodio</div>
        {#if primera === 3}
          <div class="g-l pl" style:grid-row={2} style:grid-column={1}><span class="bar"></span><span><span class="nm">Plantilla</span><small>{PLANTILLAS.find((p) => p.id === d.plantilla)?.nombre}</small></span></div>
        {/if}
        <!-- Cada cabecera y, justo detrás, su celda de la plantilla: el foco pasa de una a otra (RF-37) -->
        {#each d.episodios as { e, codigo }, i (e.id)}
          <button
            class="g-h"
            class:on={estado.seleccion === e.id}
            class:marcado={estado.episodioActual === e.id}
            class:aparcado={estadoDe(e) === "aparcado"}
            aria-current={estado.episodioActual === e.id ? "location" : undefined}
            style:grid-row={1}
            style:grid-column={i + 2}
            onclick={() => estado.elegir(e.id)}
          >
            <span class="id">{codigo}{#if d.carga.has(e.id)}<TriangleAlert class="i" style="width:12px;height:12px;color:var(--warn)" />{/if}</span>
            <span class="ti">{e.titulo || "Sin título"}</span>
            <span class="ft">
              <span class="state {e.estado}">{mayus(etiqueta(ESTADO_ESCRITURA, e.estado))}</span>
              {#if e.carga[0] || e.carga[1]}<Carga carga={e.carga} texto={false} />{/if}
            </span>
          </button>
          {#if primera === 3 && d.columnas[i]}
            {@render celdaPlantilla(d.columnas[i], i + 2)}
          {/if}
        {/each}
        {#if d.previstos}
          <div class="g-h previstos" style:grid-row={1} style:grid-column={colPrevistos}>
            <span class="id">Previstos</span>
            <span class="ti">{d.previstos.texto.replace("Previstos: ", "")}</span>
            <span class="ft"><span class="nota-prev">sin crear</span></span>
          </div>
          {@render celdaPlantilla(d.previstos, colPrevistos)}
        {/if}

        {#each d.filas as { a, celdas }, k (a.id)}
          <button
            class="g-l"
            class:on={estado.seleccion === a.id}
            class:descartado={a.madurez === "descartado"}
            class:aparcado={estadoDe(a) === "aparcado"}
            class:fuera-lente={filaFuera(a.id)}
            style:grid-row={primera + k}
            style:grid-column={1}
            onclick={() => estado.elegir(a.id)}
            use:enfocable={{ estado, lente: lenteDeArco(a) }}
          >
            <span class="bar" style:background="var(--t{a.color})"></span>
            <span><span class="nm">{a.titulo || "Sin título"}</span><small>{sub(a)}</small>{#if filaFuera(a.id)}<span class="solo-lector">, fuera de la lente</span>{/if}</span>
          </button>
          {#each d.episodios as { e }, i (e.id)}
            <Celda eventos={celdas[i]} arcoId={a.id} color={a.color} episodioId={e.id} temporadaId={d.t.id} marcas={d.marcas} fila={primera + k} columna={i + 2} />
          {/each}
          {#if d.previstos}<div class="g-c prev" style:grid-row={primera + k} style:grid-column={colPrevistos}></div>{/if}
        {/each}

        {#if d.huerfanos}
          {@const fila = primera + d.filas.length}
          <div class="g-l sin" class:fuera-lente={filaFuera("")} style:grid-row={fila} style:grid-column={1}><span class="bar"></span><span><span class="nm">Sin trama</span><small>escenas que no tocan ningún arco</small></span></div>
          {#each d.episodios as { e }, i (e.id)}
            <Celda eventos={d.huerfanos[i] ?? vacio} arcoId="" color={0} episodioId={e.id} temporadaId={d.t.id} marcas={d.marcas} {fila} columna={i + 2} />
          {/each}
          {#if d.previstos}<div class="g-c prev" style:grid-row={fila} style:grid-column={colPrevistos}></div>{/if}
        {/if}
      </div>
    </div>
    {#if !d.filas.length}
      <p class="nota">Ningún arco pasa por esta temporada todavía. Crea uno con «+ Trama» o en el paso 2.</p>
    {/if}
  {/if}
  <Leyenda />

  <div class="sec bandeja">
    <Bandeja temporadaId={d.t.id} />
  </div>
{/if}

<style>
  .g-h,
  .g-l {
    text-align: left;
    font: inherit;
    color: inherit;
  }
  .g-h.on,
  .g-l.on {
    background: var(--sel);
  }
  .g-h.marcado {
    box-shadow: inset 0 -3px 0 var(--accent);
  }
  .g-l.sin .bar {
    background: var(--line-2);
  }
  .bandeja {
    margin-top: 22px;
  }
  /* A 900 px la cabecera se parte en dos líneas antes que ensanchar la página */
  .vh {
    flex-wrap: wrap;
  }
  .vh .meta {
    flex-wrap: wrap;
    flex-shrink: 1;
    min-width: 0;
  }
  .filtro {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .filtro select {
    width: auto;
    max-width: 240px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background-color: var(--surface);
    color: var(--ink);
    font: inherit;
    padding: 6px 26px 6px 10px;
  }
  .filtro select:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .g-h.previstos {
    cursor: default;
    background: var(--bg);
  }
  .g-h.previstos .ti {
    color: var(--ink-2);
  }
  .nota-prev {
    font-size: 11px;
    color: var(--ink-3);
  }
  .g-c.prev {
    background: var(--bg);
  }
  .g-l.pl {
    cursor: default;
  }
  .g-l.pl .bar {
    background: var(--accent);
  }
  .g-p {
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line-2);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface-2);
  }
  .franja,
  .atado,
  .mas {
    font: inherit;
    font-size: 11.5px;
    text-align: left;
    color: var(--ink);
    border-radius: 6px;
    padding: 3px 7px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 6px;
  }
  .franja {
    background: var(--accent-soft);
    border-left: 2px solid var(--accent);
  }
  .franja.sigue,
  .franja.hasta {
    border-left-style: dashed;
  }
  .franja:hover,
  .atado:hover {
    filter: brightness(0.97);
  }
  .cu {
    font: 10.5px var(--mono);
    color: var(--ink-3);
  }
  .mas {
    color: var(--ink-3);
  }
  .mas:hover {
    color: var(--ink);
    background: var(--hover);
  }
  .atado {
    border: 1px solid var(--accent);
    background: var(--surface);
  }
  .atado.aviso .cu {
    color: var(--warn);
  }
  /* El texto del momento, al pasar el ratón o con el foco (RF-40) */
  .atado .txt {
    display: none;
    flex-basis: 100%;
    color: var(--ink-2);
  }
  .atado:hover .txt,
  .atado:focus-visible .txt {
    display: block;
  }
  .nota {
    color: var(--ink-3);
    font-size: 12px;
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
