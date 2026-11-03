<script lang="ts">
  // Desglose del guion (spec 014): una fila por escena con su locación,
  // interior/exterior, momento, personajes y minutos, sacados del guion; datos por
  // personaje y por lugar; la serie contra su duración objetivo; y el cuadre entre
  // el guion y los campos de cada escena. Lee los guiones en segundo plano y no
  // cambia nada, salvo «Añadir a la escena» y la duración objetivo, que se piden a mano.
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import { onMount } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import type { SubvistaDesglose } from "../../lib/app/estado-desglose.svelte";
  import * as c from "../../lib/modelo/consultas";
  import { cuadrarEscena } from "../../lib/desglose/cuadre";
  import { datosLugares, datosPersonajes, datosSerie } from "../../lib/desglose/datos";
  import { aTablaMarkdown, construirFilas, crearResolutor, filtrar, opcionesDe, sinFiltros } from "../../lib/desglose/desglose";
  import { objetivoDe, objetivoVacio } from "../../lib/desglose/objetivo";
  import type { Ambito } from "../../lib/guion/indice";
  import CopiarTexto from "../comunes/CopiarTexto.svelte";
  import CuadreVista from "./DesgloseCuadre.svelte";
  import DesgloseDatos from "./DesgloseDatos.svelte";
  import DesgloseEscenas from "./DesgloseEscenas.svelte";
  import DesgloseFiltros from "./DesgloseFiltros.svelte";
  import DesgloseSerie from "./DesgloseSerie.svelte";

  const estado = usarEstado();
  const d = estado.desglose;

  const SUBVISTAS: Array<{ id: SubvistaDesglose; texto: string }> = [
    { id: "escenas", texto: "Escenas" },
    { id: "personajes", texto: "Personajes" },
    { id: "lugares", texto: "Lugares" },
    { id: "serie", texto: "Serie" },
    { id: "cuadre", texto: "Cuadre" },
  ];

  onMount(() => {
    void d.cargar();
  });

  const calc = $derived.by(() => {
    void estado.version;
    const s = estado.sesionSerie;
    const textos = d.textos;
    if (!s || !textos) return null;
    const m = s.modelo;
    const filas = construirFilas(m, s.wiki, textos, d.cache);
    const nombreEp = (id: string) => {
      const e = m.episodios.get(id);
      return e ? `${c.codigo(m, id)} · ${e.titulo.trim() || "Sin título"}` : id;
    };
    return {
      s,
      m,
      filas,
      visibles: filtrar(filas, d.filtros),
      opciones: opcionesDe(filas),
      temporadas: c.temporadasEnOrden(m).map((t) => ({ id: t.id, texto: `${c.codigo(m, t.id)}${t.titulo.trim() ? ` · ${t.titulo.trim()}` : ""}` })),
      episodios: c.episodiosEnOrden(m).map((e) => ({ id: e.id, texto: nombreEp(e.id), temporada: e.temporada })),
      nombreEp,
    };
  });

  // Solo se calcula lo de la vista elegida
  const personajes = $derived(calc && d.subvista === "personajes" ? datosPersonajes(calc.visibles) : []);
  const lugares = $derived(calc && d.subvista === "lugares" ? datosLugares(calc.visibles) : []);

  const ambito = $derived.by((): Ambito => {
    const f = d.filtros;
    if (f.episodio) return { que: "episodio", id: f.episodio };
    if (f.temporada) return { que: "temporada", id: f.temporada };
    return { que: "serie" };
  });
  const etiquetaAmbito = $derived.by(() => {
    if (!calc) return "la serie";
    if (ambito.que === "episodio") return `el episodio ${c.codigo(calc.m, ambito.id)}`;
    if (ambito.que === "temporada") return `la temporada ${c.codigo(calc.m, ambito.id)}`;
    return "la serie";
  });
  const serie = $derived(calc && d.subvista === "serie" ? datosSerie(calc.visibles) : null);
  const previsto = $derived(calc && d.objetivo ? objetivoDe(d.objetivo.objetivo ?? objetivoVacio(), calc.m, ambito) : null);
  // Se compara solo si los filtros dejan el ámbito entero (temporada, episodio y estado)
  const comparable = $derived(!d.filtros.locaciones.length && !d.filtros.personajes.length && !d.filtros.ie.length && !d.filtros.momentos.length);

  const cuadres = $derived.by(() => {
    if (!calc || d.subvista !== "cuadre") return { entradas: [], sinGuion: 0 };
    const res = crearResolutor(calc.s.wiki);
    const entradas = [];
    let sinGuion = 0;
    for (const f of calc.visibles) {
      const ev = calc.m.eventos.get(f.id);
      const texto = d.textos?.get(f.id) ?? null;
      const cuadre = ev ? cuadrarEscena(ev, texto, res) : null;
      if (!cuadre) sinGuion++;
      else entradas.push({ id: f.id, codigo: f.codigo, titulo: f.titulo || "Sin título", cuadre });
    }
    return { entradas, sinGuion };
  });

  function copiar(): string | { error: string } {
    if (!calc) return { error: "Aún no se han leído los guiones." };
    if (!calc.visibles.length) return { error: "No hay escenas que copiar con estos filtros." };
    const r = aTablaMarkdown(calc.visibles, d.columnas);
    return r.texto ? r.texto : { error: "Elige alguna columna para copiar." };
  }

  function teclas(e: KeyboardEvent) {
    const i = SUBVISTAS.findIndex((t) => t.id === d.subvista);
    const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const sig = SUBVISTAS[(i + paso + SUBVISTAS.length) % SUBVISTAS.length]!;
    d.subvista = sig.id;
    document.getElementById(`desglose-${sig.id}`)?.focus();
  }
</script>

<div class="desglose">
  {#if estado.variante}
    <p class="warnbox info" role="note">Hay una variante abierta: el desglose lee la serie principal, no «Cómo quedaría». El cuadre solo informa y no se cambia nada.</p>
  {/if}

  {#if d.error}
    <p class="warnbox" role="alert">{d.error}</p>
    <button class="btn" onclick={() => void d.cargar()}>Reintentar</button>
  {:else if !calc}
    <p class="hint" role="status">Leyendo los guiones… {d.total ? `${d.hechas} de ${d.total}` : ""}</p>
  {:else}
    <div class="cabecera">
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div class="seg subvistas" role="tablist" aria-label="Qué mirar del desglose" onkeydown={teclas}>
        {#each SUBVISTAS as t (t.id)}
          <button
            id="desglose-{t.id}"
            role="tab"
            aria-selected={d.subvista === t.id}
            tabindex={d.subvista === t.id ? 0 : -1}
            class:on={d.subvista === t.id}
            onclick={() => (d.subvista = t.id)}>{t.texto}</button
          >
        {/each}
      </div>
      <div class="acciones">
        {#if d.subvista === "escenas"}
          <CopiarTexto etiqueta="Copiar tabla" hecho="Desglose copiado al portapapeles" obtener={copiar} ariaCaja="Desglose en Markdown, para copiar a mano" reiniciar={d.filtros} compacto />
        {/if}
        <button class="btn" disabled={d.cargando} onclick={() => void d.cargar()} title="Volver a leer los guiones del disco">
          <RefreshCw class="i" />{d.cargando ? `Leyendo ${d.hechas} de ${d.total}…` : "Actualizar"}
        </button>
      </div>
    </div>

    <DesgloseFiltros {d} temporadas={calc.temporadas} episodios={calc.episodios} locaciones={calc.opciones.locaciones} personajes={calc.opciones.personajes} visibles={calc.visibles.length} total={calc.filas.length} />

    <div role="tabpanel" aria-labelledby="desglose-{d.subvista}">
      {#if d.subvista === "escenas"}
        <DesgloseEscenas {d} filas={calc.visibles} nombreEpisodio={calc.nombreEp} />
      {:else if d.subvista === "personajes"}
        <DesgloseDatos {d} que="personajes" {personajes} lugares={[]} />
      {:else if d.subvista === "lugares"}
        <DesgloseDatos {d} que="lugares" personajes={[]} {lugares} />
      {:else if d.subvista === "serie" && serie}
        <DesgloseSerie {d} datos={serie} {ambito} etiqueta={etiquetaAmbito} {previsto} {comparable} />
      {:else if d.subvista === "cuadre"}
        <CuadreVista {d} entradas={cuadres.entradas} sinGuion={cuadres.sinGuion} />
      {/if}
    </div>

    <p class="pie">Los minutos son una estimación sobre el guion escrito.{#if calc.filas.some((f) => !f.conGuion)} Las escenas sin guion cuentan como escenas, no como minutos.{/if}</p>
  {/if}
  <p class="oculto" role="status" aria-live="polite">{d.anuncio}</p>
</div>

<style>
  .desglose {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .cabecera {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }
  .subvistas {
    margin-left: 0;
  }
  .acciones {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .warnbox {
    margin: 0 0 10px;
  }
  .pie {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--ink-3);
  }
  .oculto {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
