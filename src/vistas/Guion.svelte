<script lang="ts">
  // La vista del guion (spec 013): a la izquierda la lista de escenas, en el
  // centro el documento del episodio como una hoja de guion (Courier 12, una
  // escena tras otra) y, si se pide, la ficha de lectura de una referencia.
  // Abrir la vista no escribe nada. Todo el texto pasa por EstadoGuion.
  import { untrack } from "svelte";
  import PanelLeft from "@lucide/svelte/icons/panel-left";
  import CopiarTexto from "./comunes/CopiarTexto.svelte";
  import EditorGuion from "./guion/EditorGuion.svelte";
  import FichaLectura from "./guion/FichaLectura.svelte";
  import SinFicha from "./guion/SinFicha.svelte";
  import { usarEstado } from "../lib/app/contexto";
  import { abrirUrl } from "../lib/app/plataforma";
  import { formatoMedida } from "../lib/guion/paginas";
  import { candidatas, type Ref } from "../lib/guion/referencias";
  import type { Evento } from "../lib/modelo/tipos";
  import type { Ficha, TipoFicha } from "../lib/wiki/fichas";

  const estado = usarEstado();
  const g = estado.guion;

  let panel = $state(true);
  let tamano = $state(12);
  let abierta = $state<Ficha | null>(null);
  /** Referencia sin ficha o ambigua, a la vista (spec 019, RF-4 y RF-5) */
  let sinFicha = $state<{ nombre: string; candidatas: { nombre: string; ruta: string }[]; crear: boolean; aviso: string } | null>(null);
  /** La última referencia pinchada: una búsqueda que acaba tarde no pisa a la siguiente */
  let peticion = 0;
  /** Dónde estaba el foco al pinchar, para devolverlo al cerrar la tarjeta */
  let volverA: HTMLElement | null = null;
  const editores = new Map<string, ReturnType<typeof EditorGuion>>();

  try {
    const t = Number(localStorage.getItem("atelier.guion.tamano"));
    if (t >= 10 && t <= 16) tamano = t;
  } catch {
    // Sin almacenamiento del navegador: se queda en 12
  }
  function ponerTamano(n: number) {
    tamano = n;
    try {
      localStorage.setItem("atelier.guion.tamano", String(n));
    } catch {
      // Es solo comodidad
    }
  }

  // Solo se vuelve a abrir si cambia la serie o el modelo (escenas nuevas), no con cada tecla
  $effect(() => {
    void estado.sesionSerie;
    void estado.version;
    untrack(() => void g.abrir());
  });

  const sesion = $derived.by(() => {
    void estado.version;
    return estado.sesionSerie;
  });
  const fichas = $derived.by(() => {
    void estado.version;
    const w = sesion?.wiki;
    return w ? [...w.de("personaje"), ...w.de("lugar"), ...w.de("era")] : [];
  });
  const buscar = (tipos: TipoFicha[], q: string) => sesion?.wiki.listar(tipos, q) ?? [];

  const modelo = $derived.by(() => {
    void estado.version;
    return sesion?.modelo ?? null;
  });
  const escenas = $derived.by(() => {
    void estado.version;
    return g.escenas;
  });
  const todas = $derived([...escenas.activas, ...escenas.descartadas]);

  /** Los documentos que se pueden elegir: cada episodio y la bandeja de cada temporada */
  const documentos = $derived.by(() => {
    void estado.version;
    const m = modelo;
    if (!m) return [];
    const idx = m.indice();
    const r: Array<{ clave: string; texto: string; d: { tipo: "episodio"; id: string } | { tipo: "bandeja"; temporada: string } }> = [];
    for (const t of idx.temporadas) {
      for (const e of idx.episodiosDe.get(t) ?? []) {
        const ep = m.episodios.get(e);
        r.push({ clave: `e:${e}`, texto: `${idx.codigos.get(e) ?? ""} · ${ep?.titulo.trim() || "Sin título"}`, d: { tipo: "episodio", id: e } });
      }
      r.push({ clave: `b:${t}`, texto: `${idx.codigos.get(t) ?? ""} · Bandeja de la temporada`, d: { tipo: "bandeja", temporada: t } });
    }
    return r;
  });
  const claveActual = $derived(g.enPantalla ? (g.enPantalla.tipo === "episodio" ? `e:${g.enPantalla.id}` : `b:${g.enPantalla.temporada}`) : "");

  const lugar = (ev: Evento) => ev.lugares.filter((l) => l.trim()).join(", ");
  const titulo = (ev: Evento) => ev.titulo.trim() || "Sin título";

  const temporadaDeAqui = $derived(g.enPantalla ? (g.enPantalla.tipo === "bandeja" ? g.enPantalla.temporada : (modelo?.episodios.get(g.enPantalla.id)?.temporada ?? null)) : null);
  const totales = $derived.by(() => {
    void estado.version;
    if (!g.enPantalla) return [];
    const r = [];
    if (g.enPantalla.tipo === "episodio") r.push({ nombre: "Episodio", r: g.resumen({ que: "episodio", id: g.enPantalla.id }) });
    if (temporadaDeAqui) r.push({ nombre: "Temporada", r: g.resumen({ que: "temporada", id: temporadaDeAqui }) });
    r.push({ nombre: "Serie", r: g.resumen({ que: "serie" }) });
    return r;
  });

  function textoTotal(t: NonNullable<(typeof totales)[number]["r"]>): string {
    const cuenta = `${t.conGuion} de ${t.escenas} escenas con guion`;
    return t.calculando ? `calculando… (${cuenta} hasta ahora)` : `${t.conGuion ? formatoMedida(t) : "0,0 págs"} · ${cuenta}`;
  }

  function irA(id: string) {
    const ev = modelo?.eventos.get(id);
    if (!ev) return;
    const enDoc = todas.some((e) => e.id === id);
    const ir = () => {
      const el = document.getElementById(`escena-${id}`);
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
      editores.get(id)?.enfocar("ini");
    };
    if (enDoc) ir();
    else {
      // Una escena de la bandeja o de otro episodio: se cambia de documento
      const d = ev.episodio && modelo?.episodios.has(ev.episodio) ? { tipo: "episodio" as const, id: ev.episodio } : { tipo: "bandeja" as const, temporada: ev.temporada };
      void g.elegir(d).then(() => setTimeout(ir, 0));
    }
  }

  // Llegar a una escena pedida desde fuera (el desglose): cuando su guion ya está cargado
  $effect(() => {
    const id = g.pendienteIr;
    void g.bloques;
    void estado.version;
    if (!id) return;
    untrack(() => {
      if (!modelo?.eventos.has(id)) {
        g.pendienteIr = null;
        return;
      }
      if (!todas.some((e) => e.id === id) || !g.bloque(id)) return;
      g.pendienteIr = null;
      setTimeout(() => irA(id), 0);
    });
  });

  function mover(id: string, dir: -1 | 1) {
    const i = todas.findIndex((e) => e.id === id);
    const otro = todas[i + dir];
    if (otro) editores.get(otro.id)?.enfocar(dir === 1 ? "ini" : "fin");
  }

  async function abrirRef(ref: Ref, ficha: Ficha | null, obsidian: boolean) {
    const mia = ++peticion;
    sinFicha = null;
    if (ficha) {
      if (obsidian) void abrirFicha(ficha);
      else {
        abierta = ficha;
        g.anuncio = `Ficha de ${ficha.nombre} abierta.`;
      }
      return;
    }
    volverA = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nombre = ref.alias ?? ref.nombre;
    // Una ruta que sale de la wiki no apunta a nada: ni se busca por el nombre ni se crea (spec 013, RF-17)
    const rutaMala = !!ref.ruta && ref.ruta.split("/").some((t) => t === ".." || t === ".");
    let c: { nombre: string; ruta: string }[] = [];
    if (!rutaMala) {
      // Las de personaje, lugar y época, y las de cualquier otra categoría del mundo (spec 019, RF-3 y RF-5)
      const vistas = new Set<string>();
      let delMundo: { nombre: string; ruta: string }[] = [];
      try {
        delMundo = await estado.mundo.buscarTodasPorNombre(ref.nombre);
      } catch {
        // Sin poder leer el mundo, quedan las de la wiki
      }
      if (mia !== peticion || estado.vista !== "guion") return;
      for (const f of [...candidatas(ref, fichas), ...delMundo]) {
        const k = f.ruta.toLowerCase();
        if (vistas.has(k)) continue;
        vistas.add(k);
        c.push({ nombre: f.nombre, ruta: f.ruta });
      }
    }
    if (c.length === 1) {
      const url = sesion?.wiki.urlObsidian(c[0]!.ruta) ?? "";
      if (obsidian && url) void abrirUrl(url);
      else void estado.abrirFichaPorRuta(c[0]!.ruta);
      return;
    }
    abierta = null;
    sinFicha = { nombre, candidatas: c, crear: !rutaMala && c.length === 0, aviso: "" };
    g.anuncio = c.length > 1 ? `Hay ${c.length} fichas para «${nombre}».` : `«${nombre}» no tiene ficha en la wiki.`;
  }

  function cerrarSinFicha() {
    sinFicha = null;
    volverA?.focus();
    volverA = null;
  }

  async function crearDesdeRef(tipo: "personaje" | "lugar") {
    const t = sinFicha;
    if (!t) return;
    if (!(await estado.crearFichaDelMundo(tipo, t.nombre)) && sinFicha === t)
      sinFicha = { ...t, aviso: `No se puede crear una ficha con el nombre «${t.nombre}»: cambia la referencia o créala desde Mundo.` };
  }

  // Al cambiar de documento, la tarjeta de otra referencia deja de valer
  $effect(() => {
    void g.enPantalla;
    untrack(() => (sinFicha = null));
  });

  async function abrirFicha(f: Ficha) {
    const url = sesion?.wiki.urlObsidian(f) ?? "";
    if (url) await abrirUrl(url);
    else g.anuncio = "Esta ficha no se puede abrir en Obsidian.";
  }

  const etiquetaDe = (ev: Evento) => {
    const c = g.codigoDe(ev.id)?.completo;
    return `Guion de ${c ? `${c}, ` : ""}${titulo(ev)}`;
  };

  /** Aviso de solo lectura de todo el documento */
  const lectura = $derived(estado.variante ? "Con una variante abierta el guion se ve, pero no se escribe." : null);
</script>

<div class="guion" style:--pt="{tamano}pt">
  <div class="barra">
    <button class="btn ghost" aria-pressed={panel} aria-label="Lista de escenas" title="Lista de escenas" onclick={() => (panel = !panel)}><PanelLeft class="i" /></button>
    <label class="sel">
      <span class="oculto">Documento</span>
      <select value={claveActual} onchange={(e) => { const d = documentos.find((x) => x.clave === e.currentTarget.value); if (d) void g.elegir(d.d); }}>
        {#each documentos as d (d.clave)}<option value={d.clave}>{d.texto}</option>{/each}
      </select>
    </label>
    <label class="sel">
      <span class="oculto">Tamaño de letra</span>
      <select value={String(tamano)} onchange={(e) => ponerTamano(Number(e.currentTarget.value))} title="Solo ayuda de lectura: las páginas se cuentan siempre igual">
        {#each [10, 11, 12, 13, 14, 16] as n (n)}<option value={String(n)}>{n} pt</option>{/each}
      </select>
    </label>
    <div class="totales" aria-live="polite">
      {#each totales as t (t.nombre)}
        {#if t.r}<span><b>{t.nombre}</b> {textoTotal(t.r)}</span>{/if}
      {/each}
    </div>
  </div>

  {#if lectura}<p class="aviso" role="status">{lectura}</p>{/if}
  {#if g.errorCarga}<p class="aviso malo" role="alert">No se pudo leer el guion: {g.errorCarga}</p>{/if}
  {#each g.errores as [id, msg] (id)}
    <p class="aviso malo" role="alert">
      No se pudo guardar el guion de {g.codigoDe(id)?.completo ?? id}: {msg}. Tu texto sigue aquí.
      <button class="btn" onclick={() => g.reintentar()}>Reintentar</button>
    </p>
  {/each}
  {#if g.huerfanos.length}
    <p class="aviso" role="status">
      {g.huerfanos.length === 1 ? "Hay 1 guion" : `Hay ${g.huerfanos.length} guiones`} de escenas que ya no existen ({g.huerfanos.join(", ")}). Se conserva{g.huerfanos.length === 1 ? "" : "n"} en <code>_guion/</code>.
    </p>
  {/if}
  {#if g.ignorados.length}
    <p class="aviso" role="status">
      {g.ignorados.length === 1 ? "Hay 1 fichero" : `Hay ${g.ignorados.length} ficheros`} en <code>_guion/</code> que no {g.ignorados.length === 1 ? "es" : "son"} guion{g.ignorados.length === 1 ? "" : "es"}: {g.ignorados.map((i) => i.nombre).join(", ")}. No se tocan.
    </p>
  {/if}

  <div class="cuerpo">
    {#if panel}
      <nav class="lista" aria-label="Escenas">
        {#each escenas.activas as ev (ev.id)}
          {@render fila(ev)}
        {:else}
          <p class="vacio">Este documento no tiene escenas.</p>
        {/each}
        {#if escenas.descartadas.length}
          <h4>Descartadas</h4>
          {#each escenas.descartadas as ev (ev.id)}
            {@render fila(ev, true)}
          {/each}
        {/if}
        {#if g.enPantalla?.tipo === "episodio" && temporadaDeAqui && modelo}
          {@const bandeja = modelo.indice().bandeja.get(temporadaDeAqui) ?? []}
          {#if bandeja.length}
            <h4>Bandeja de la temporada</h4>
            {#each bandeja as ev (ev.id)}
              {@render fila(ev, false, true)}
            {/each}
          {/if}
        {/if}
        <p class="nota">El código se calcula por el orden y cambia al reordenar las escenas.</p>
      </nav>
    {/if}

    <div class="hoja-marco">
      <div class="hoja">
        {#each todas as ev (ev.id)}
          {@const b = g.bloque(ev.id)}
          {@const descartada = escenas.descartadas.includes(ev)}
          <section class="escena" class:descartada id="escena-{ev.id}" aria-label={etiquetaDe(ev)}>
            <header>
              <span class="cod">{g.codigoDe(ev.id)?.completo ?? "bandeja"}</span>
              <span class="tit">{titulo(ev)}</span>
              {#if lugar(ev)}<span class="lug">{lugar(ev)}</span>{/if}
              <span class="med">{g.medidaDe(ev.id) ?? "sin guion"}</span>
            </header>
            {#if g.cambiadasFuera.includes(ev.id)}
              <div class="aviso malo" role="alert">
                <p>Este guion cambió fuera de Atelier. Tu versión sigue aquí, sin perderse, y no se guarda hasta que elijas.</p>
                <div class="acciones">
                  <button class="btn pri" onclick={() => g.quedarmeConLaMia(ev.id)}>Quedarme con la mía</button>
                  <button class="btn" onclick={() => g.usarLaDeFuera(ev.id)}>Usar la de fuera</button>
                  <CopiarTexto etiqueta="Copiar la mía" hecho="Tu versión se copió al portapapeles" ariaCaja="Tu versión del guion" obtener={() => g.localDeFuera(ev.id) ?? { error: "No hay nada que copiar." }} compacto />
                </div>
                <p class="nota">Cada camino guarda antes una copia de la otra versión en la papelera del guion.</p>
              </div>
            {/if}
            {#if g.borradaFuera(ev.id)}
              <p class="aviso" role="status">El fichero de este guion se borró fuera de Atelier. Lo que ves se vuelve a guardar con tu siguiente cambio.</p>
            {/if}
            {#if b}
              {#if b.avisos.length}<p class="aviso" role="status">{b.avisos.join(" ")}</p>{/if}
              {#if b.soloLectura && !estado.variante}<p class="aviso" role="status">Este guion se puede leer, pero no editar.</p>{/if}
              <EditorGuion
                bind:this={() => editores.get(ev.id), (c) => (c ? editores.set(ev.id, c) : editores.delete(ev.id))}
                id={ev.id}
                doc={b.doc}
                pos={b.pos}
                soloLectura={g.soloLectura(ev.id)}
                etiqueta={etiquetaDe(ev)}
                {fichas}
                buscarFichas={buscar}
                alEditar={(r, clave) => g.editar(ev.id, r, clave)}
                alPegar={(r) => g.pegar(ev.id, r)}
                alCursor={(p) => g.fijarCursor(ev.id, p)}
                alDeshacer={() => g.deshacer(ev.id)}
                alRehacer={() => g.rehacer(ev.id)}
                alMover={(dir) => mover(ev.id, dir)}
                alAbrirRef={abrirRef}
                alDecir={(t) => (g.anuncio = t)}
                alEnfocar={() => g.proponerEncabezado(ev.id)}
                alDesenfocar={() => g.alSalirEscena(ev.id)}
              />
            {:else}
              <p class="vacio">Leyendo…</p>
            {/if}
          </section>
        {:else}
          <p class="vacio">No hay escenas que escribir aquí. Crea escenas en el visor y vuelve.</p>
        {/each}
      </div>
    </div>

    {#if sinFicha}
      <div class="ficha-marco">
        <SinFicha
          nombre={sinFicha.nombre}
          candidatas={sinFicha.candidatas}
          aviso={sinFicha.aviso}
          alElegir={(ruta) => {
            sinFicha = null;
            void estado.abrirFichaPorRuta(ruta);
          }}
          alCrear={estado.variante || !sinFicha.crear ? undefined : (tipo) => void crearDesdeRef(tipo)}
          alCerrar={cerrarSinFicha}
        />
      </div>
    {:else if abierta}
      <div class="ficha-marco">
        <FichaLectura ficha={abierta} url={sesion?.wiki.urlObsidian(abierta) ?? ""} alAbrir={() => abrirFicha(abierta!)} alCerrar={() => (abierta = null)} alEditar={estado.variante ? undefined : () => void estado.abrirFichaPorRuta(abierta!.ruta)} />
      </div>
    {/if}
  </div>

  <p class="oculto" role="status" aria-live="polite">{g.anuncio}</p>
</div>

{#snippet fila(ev: Evento, descartada = false, bandeja = false)}
  <button class="fila" class:on={g.escenaActual === ev.id} class:descartada onclick={() => irA(ev.id)}>
    <span class="cod">{bandeja ? "—" : (g.codigoDe(ev.id)?.corto ?? "")}</span>
    <span class="tit">{titulo(ev)}</span>
    <span class="med" class:falta={g.tieneGuion(ev.id) === false}>{g.tieneGuion(ev.id) === false ? "sin guion" : (g.medidaDe(ev.id) ?? "…")}</span>
    {#if lugar(ev)}<span class="lug">{lugar(ev)}</span>{/if}
  </button>
{/snippet}

<style>
  .guion {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .barra {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--line);
    flex-wrap: wrap;
  }
  .totales {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    color: var(--ink-2);
    margin-left: auto;
    font-size: 12.5px;
  }
  .totales b {
    color: var(--ink);
    font-weight: 600;
  }
  .sel select {
    font: inherit;
    padding: 5px 8px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    max-width: 280px;
  }
  .oculto {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .aviso {
    margin: 8px 14px 0;
    padding: 8px 12px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink-2);
  }
  .aviso.malo {
    border-color: var(--warn);
    color: var(--ink);
  }
  .aviso p {
    margin: 0 0 6px;
  }
  .acciones {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .cuerpo {
    display: flex;
    flex: 1;
    min-height: 0;
    gap: 0;
  }
  .lista {
    width: 270px;
    flex: none;
    overflow: auto;
    padding: 10px 8px;
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lista h4 {
    margin: 12px 8px 4px;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-2);
  }
  .fila {
    display: grid;
    grid-template-columns: 38px 1fr auto;
    gap: 0 8px;
    text-align: left;
    padding: 6px 8px;
    border-radius: 7px;
  }
  .fila:hover,
  .fila.on {
    background: var(--sel);
  }
  .fila.descartada,
  .escena.descartada {
    opacity: 0.6;
  }
  .fila .cod,
  .escena .cod {
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--ink-2);
  }
  .fila .tit {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fila .med {
    font-size: 11.5px;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .fila .med.falta {
    color: var(--ink-3);
    font-style: italic;
  }
  .fila .lug {
    grid-column: 2 / -1;
    font-size: 11.5px;
    color: var(--ink-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nota {
    margin: 12px 8px 0;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .vacio {
    color: var(--ink-3);
    margin: 10px 8px;
  }
  /* La hoja: como una página de guion, centrada y sin cajas */
  .hoja-marco {
    flex: 1;
    min-width: 0;
    overflow: auto;
    padding: 0 0 80px;
    background: var(--surface);
  }
  .hoja {
    margin: 0 auto;
    box-sizing: content-box;
    width: 60ch;
    max-width: calc(100% - 20ch);
    padding: 48px 8ch 72px 14ch;
    background: transparent;
    font: 400 var(--pt, 12pt) / 1.25 "Courier Prime", "Courier New", Courier, monospace;
    color: var(--ink);
  }
  .escena {
    position: relative;
    margin-bottom: 2.4em;
  }
  .escena header {
    display: flex;
    flex-wrap: wrap;
    gap: 0 10px;
    align-items: baseline;
    font: 400 11px/1.4 var(--sans);
    color: var(--ink-3);
    margin-bottom: 4px;
    padding-bottom: 3px;
    border-bottom: 1px solid var(--line);
  }
  .escena:focus-within header {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .escena header .tit {
    color: var(--ink-2);
    font-weight: 500;
  }
  .escena header .med {
    margin-left: auto;
  }
  .escena :global(.aviso) {
    font: 400 12px/1.4 var(--sans);
  }
  .ficha-marco {
    width: 320px;
    flex: none;
    overflow: auto;
    padding: 14px 14px 14px 0;
    background: var(--bg);
  }
  @media (max-width: 1100px) {
    .hoja {
      padding-left: 6ch;
      padding-right: 3ch;
      max-width: calc(100% - 9ch);
    }
    .lista {
      width: 210px;
    }
  }
</style>
