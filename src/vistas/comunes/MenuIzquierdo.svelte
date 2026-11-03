<script lang="ts">
  import ChartNoAxesGantt from "@lucide/svelte/icons/chart-no-axes-gantt";
  import BookOpenText from "@lucide/svelte/icons/book-open-text";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import FileText from "@lucide/svelte/icons/file-text";
  import Globe from "@lucide/svelte/icons/globe";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import CloudAlert from "@lucide/svelte/icons/cloud-alert";
  import CloudCheck from "@lucide/svelte/icons/cloud-check";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import GitBranch from "@lucide/svelte/icons/git-branch";
  import Hourglass from "@lucide/svelte/icons/hourglass";
  import Layers2 from "@lucide/svelte/icons/layers-2";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import NotebookPen from "@lucide/svelte/icons/notebook-pen";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Orbit from "@lucide/svelte/icons/orbit";
  import Plus from "@lucide/svelte/icons/plus";
  import UsersRound from "@lucide/svelte/icons/users-round";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Vista } from "../../lib/app/estado.svelte";
  import * as c from "../../lib/modelo/consultas";
  import { estadoDe } from "../../lib/modelo/estados";
  import { crearSecreto } from "../../lib/modelo/operaciones";
  import type { Arco } from "../../lib/modelo/tipos";
  import { etiqueta, TIPO_ARCO } from "../../lib/modelo/vocabulario";

  const estado = usarEstado();

  const datos = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const m = s.modelo;
    const temporadas = c.temporadasEnOrden(m).map((t) => ({
      t,
      codigo: c.codigo(m, t.id),
      episodios: c.episodiosDeTemporada(m, t.id).length,
    }));
    const vivos = c.arcosEnOrden(m).filter((a) => a.madurez !== "descartado");
    const deSerie = vivos.filter((a) => a.nivel === "serie");
    const arcos: { a: Arco; tramo: boolean }[] = [];
    for (const a of deSerie) {
      arcos.push({ a, tramo: false });
      for (const t of vivos) if (t.tramo_de === a.id) arcos.push({ a: t, tramo: true });
    }
    for (const a of vivos) if (!arcos.some((x) => x.a.id === a.id)) arcos.push({ a, tramo: false });
    return {
      titulo: m.serie.titulo || s.carpeta,
      temporadas,
      totalEpisodios: m.episodios.size,
      arcos,
      secretos: [...m.secretos.values()],
      alerta: !!s.avisoUso || s.conflictos.length > 0 || s.problemas.length > 0,
      avisoUso: s.avisoUso,
      conflictos: s.conflictos.length,
      problemas: s.problemas.length,
      carpeta: s.carpeta,
      wiki: { personajes: s.wiki.de("personaje").length, lugares: s.wiki.de("lugar").length, reglas: s.guia?.reglas.length ?? 0 },
    };
  });

  async function nuevoSecreto() {
    const { pieza, cambio } = crearSecreto(estado.sesion!.modelo, { madurez: "idea" });
    await estado.sesion!.aplicar(cambio);
    ir("temporada", pieza.id);
  }

  function ir(vista: Vista, id: string, pestana: "editar" | "guia" = "editar") {
    estado.elegir(id, pestana);
    estado.cambiarVista(vista);
  }

  const nivelCorto = (a: Arco) => (a.tipo_arco === "trama" ? a.tipo_trama : etiqueta(TIPO_ARCO, a.tipo_arco).slice(0, 3));
</script>

<aside class="side">
  <div class="brand"><b>Atelier</b><span>· pizarra de serie</span></div>
  <button
    class="switch"
    title={estado.variante ? "Sal de la variante para cambiar de serie." : "Volver a la lista de series"}
    aria-disabled={!!estado.variante}
    onclick={() => (estado.variante ? (estado.avisoVariante = "Sal de la variante para cambiar de serie.") : estado.volverAInicio())}
  >
    <span class="av">{datos.titulo.slice(0, 1).toUpperCase()}</span>
    <span class="nm">
      {datos.titulo}
      <small>{datos.temporadas.length} temporadas · {datos.totalEpisodios} episodios</small>
    </span>
    <ChevronsUpDown class="i" />
  </button>

  <div class="sh">Estructura</div>
  <button class="nav" class:on={estado.vista === "serie"} onclick={() => ir("serie", estado.sesion!.modelo.serie.id)}>
    <Orbit class="i" />Serie
  </button>
  <button class="nav" class:on={estado.vista === "tramas"} onclick={() => estado.cambiarVista("tramas")}>
    <GitBranch class="i" />Tramas y arcos<span class="ct">{datos.arcos.length}</span>
  </button>
  {#each datos.temporadas as { t, codigo, episodios } (t.id)}
    <button
      class="nav"
      class:ghost={t.estado === "prevista" && episodios === 0}
      class:on={estado.seleccion === t.id}
      class:aparcado={estadoDe(t) === "aparcado"}
      onclick={() => estado.irANivel({ tipo: "temporada", temporada: t.id })}
    >
      <Layers2 class="i" />{codigo} · {t.titulo || (t.estado === "prevista" ? "prevista" : "sin título")}
      <span class="ct">{episodios || t.episodios_previstos || "¿?"}</span>
    </button>
  {/each}
  <button class="nav" class:on={estado.vista === "historia"} onclick={() => estado.abrirHistoria()}>
    <Hourglass class="i" />Línea de la historia
  </button>
  <button class="nav" class:on={estado.vista === "analisis"} onclick={() => estado.abrirAnalisis()}>
    <ChartNoAxesGantt class="i" />Análisis
  </button>
  <button class="nav" class:on={estado.vista === "guion"} onclick={() => estado.cambiarVista("guion")}>
    <ScrollText class="i" />Guion
  </button>
  <button class="nav" class:on={estado.vista === "pizarra"} onclick={() => estado.cambiarVista("pizarra")}>
    <NotebookPen class="i" />Pizarra
  </button>

  <div class="sh">Arcos</div>
  {#each datos.arcos as { a, tramo } (a.id)}
    <button class="nav" class:on={estado.seleccion === a.id} class:aparcado={estadoDe(a) === "aparcado"} onclick={() => ir("tramas", a.id)}>
      <span class="dot" style:background={`var(--t${a.color})`}></span>
      {#if tramo}<span class="tramo">↳</span>{/if}
      <span class="txt">{a.titulo || "Sin título"}</span>
      <span class="lv">{nivelCorto(a)}</span>
    </button>
  {:else}
    <p class="vacio">Ninguno todavía</p>
  {/each}

  <div class="sh">Secretos <button aria-label="Nuevo secreto" title="Nuevo secreto" onclick={nuevoSecreto}><Plus class="i" /></button></div>
  {#each datos.secretos as s (s.id)}
    <button class="nav" class:on={estado.seleccion === s.id} class:aparcado={estadoDe(s) === "aparcado"} onclick={() => ir("temporada", s.id)}>
      <EyeOff class="i" /><span class="txt">{s.titulo || "Sin título"}</span><span class="lv">{s.nivel}</span>
    </button>
  {:else}
    <p class="vacio">Ninguno todavía</p>
  {/each}

  <div class="sh">Mundo</div>
  <button class="nav" class:on={estado.vista === "wiki" && !estado.mundo.categoria} onclick={() => { estado.cambiarVista("wiki"); estado.mundo.volverARejilla(); }}>
    <Globe class="i" />Todo el mundo
  </button>
  <button class="nav" class:on={estado.vista === "wiki" && estado.mundo.categoria === "personaje"} onclick={() => { estado.cambiarVista("wiki"); void estado.mundo.abrirCategoria("personaje"); }}>
    <UsersRound class="i" />Personajes<span class="ct">{datos.wiki.personajes}</span>
  </button>
  <button class="nav" class:on={estado.vista === "wiki" && estado.mundo.categoria === "lugar"} onclick={() => { estado.cambiarVista("wiki"); void estado.mundo.abrirCategoria("lugar"); }}><MapPin class="i" />Lugares<span class="ct">{datos.wiki.lugares}</span></button>
  <button class="nav" class:on={estado.vista === "wiki" && estado.mundo.categoria === "glosario"} onclick={() => { estado.cambiarVista("wiki"); void estado.mundo.abrirCategoria("glosario"); }}><BookOpen class="i" />Glosario</button>
  <button class="nav" class:on={estado.vista === "wiki" && estado.mundo.categoria === "documento"} onclick={() => { estado.cambiarVista("wiki"); void estado.mundo.abrirCategoria("documento"); }}><FileText class="i" />Notas y documentos</button>
  <button class="nav" class:on={estado.vista === "guia"} onclick={() => estado.cambiarVista("guia")}>
    <BookOpenText class="i" />Guía de escritura<span class="ct">{datos.wiki.reglas}</span>
  </button>

  <button class="sync" class:alerta={datos.alerta} onclick={() => estado.cambiarVista("sincronizacion")}>
    {#if datos.alerta}<CloudAlert class="i" />{:else}<CloudCheck class="i" />{/if}
    <div>
      {#if datos.avisoUso}
        {datos.avisoUso}
      {:else if datos.conflictos}
        {datos.conflictos} {datos.conflictos === 1 ? "conflicto" : "conflictos"} de sincronización
      {:else if datos.problemas}
        {datos.problemas} {datos.problemas === 1 ? "fichero no se puede leer" : "ficheros no se pueden leer"}
      {:else}
        Abierta solo en este equipo
      {/if}
      <code>appDatos/{datos.carpeta}</code>
    </div>
  </button>
</aside>

<style>
  .switch {
    width: 100%;
  }
  .txt {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tramo {
    color: var(--ink-3);
    margin-left: -4px;
  }
  .vacio {
    color: var(--ink-3);
    font-size: 12px;
    margin: 2px 8px;
  }
  .sync {
    text-align: left;
    width: 100%;
  }
  .sync:hover {
    color: var(--ink-2);
  }
  .sync.alerta :global(.i) {
    color: var(--warn);
  }
</style>
