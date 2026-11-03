<script lang="ts">
  // Editar del episodio (spec 4.2 Episodio, T4.2; maqueta #z=temporada&sel=episodio:1).
  import ListOrdered from "@lucide/svelte/icons/list-ordered";
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { abrirUrl } from "../../lib/app/plataforma";
  import { escaletaAlDia } from "../../lib/wiki/escaleta";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { tramaDominante } from "../../lib/modelo/dominante";
  import { insertarEpisodio } from "../../lib/modelo/operaciones";
  import type { Episodio } from "../../lib/modelo/tipos";
  import { ESTADO_ESCRITURA, etiqueta, type EstadoEscritura } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import CampoCarga from "./campos/CampoCarga.svelte";
  import CampoWiki from "../comunes/CampoWiki.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import SelectorPieza from "./campos/SelectorPieza.svelte";
  import CampoEstado from "./CampoEstado.svelte";
  import FichaWiki from "./FichaWiki.svelte";

  const { episodio }: { episodio: Episodio } = $props();
  const estado = usarEstado();
  const editar = (fn: (e: Episodio) => void) => estado.sesion!.editar<Episodio>(episodio.id, fn);

  const estados = ESTADO_ESCRITURA.map((v) => ({ valor: v, texto: mayus(etiqueta(ESTADO_ESCRITURA, v)) }));

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const m = s.modelo;
    const calculada = tramaDominante(m, episodio.id, { sinManual: true });
    // La ficha ya no coincide con el orden o los actos de sus escenas (spec 003, RF-39): enlace para abrirla
    const ficha = s.fichas.get(episodio.id);
    const desfasada = !!ficha?.existe && !!ficha.escaleta && !escaletaAlDia(m, episodio.id, ficha.escaleta);
    return {
      calculada: calculada ? m.arcos.get(calculada)?.titulo || "Sin título" : "",
      arcos: c
        .arcosPresentes(m, episodio.temporada)
        .filter((a) => a.madurez !== "descartado")
        .map((a) => ({ id: a.id, texto: a.titulo || "Sin título" })),
      indice: c.episodiosDeTemporada(m, episodio.temporada).findIndex((e) => e.id === episodio.id),
      escaleta: desfasada ? s.wiki.urlObsidian(ficha!.ruta) : "",
    };
  });

  // Enlace y no botón: abrir la ficha es leer, también con el panel bloqueado
  const abrirFicha = (e: MouseEvent) => {
    e.preventDefault();
    if (d.escaleta) abrirUrl(d.escaleta);
  };

  async function insertarDespues() {
    const { pieza, cambio } = insertarEpisodio(estado.sesion!.modelo, episodio.temporada, d.indice + 1);
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id, "editar");
  }
</script>

<div class="ib-body">
  <CampoTexto etiqueta="Título" valor={episodio.titulo} pista="La cinta" alCambiar={(v) => editar((e) => (e.titulo = v))} />
  <CampoEstado pieza={episodio} />
  <ConGuia pieza={episodio} clave="episodio.idea">
    <CampoTexto
      etiqueta="Idea central en una frase"
      ref="§12"
      largo
      valor={episodio.idea_central}
      pista="¿De qué va este capítulo?"
      alCambiar={(v) => editar((e) => (e.idea_central = v))}
    />
  </ConGuia>
  <ConGuia pieza={episodio} clave="episodio.carga">
    <div class="f2">
      <CampoCarga etiqueta="Carga al empezar" valor={episodio.carga[0]} alCambiar={(v) => editar((e) => (e.carga[0] = v))} />
      <CampoCarga etiqueta="Carga al acabar" valor={episodio.carga[1]} alCambiar={(v) => editar((e) => (e.carga[1] = v))} />
    </div>
  </ConGuia>
  <Conmutador etiqueta="Estado de escritura" ref="Guía §6" opciones={estados} valor={episodio.estado} alCambiar={(v: EstadoEscritura) => editar((e) => (e.estado = v))} />
  <ConGuia pieza={episodio} clave="episodio.motor">
    <CampoWiki etiqueta="Protagonista del capítulo" ref="§12" uno tipos={["personaje"]} valores={episodio.protagonista ? [episodio.protagonista] : []} alCambiar={(v) => editar((e) => (e.protagonista = v[0] ?? ""))} />
    <div class="f2">
      <CampoTexto etiqueta="Qué quiere" valor={episodio.deseo} pista="Su deseo en este capítulo" alCambiar={(v) => editar((e) => (e.deseo = v))} />
      <CampoTexto etiqueta="Fuerza antagónica" valor={episodio.fuerza_antagonica} pista="Quién o qué se opone" alCambiar={(v) => editar((e) => (e.fuerza_antagonica = v))} />
    </div>
    <div class="f2">
      <CampoTexto etiqueta="Conflicto" valor={episodio.conflicto} pista="El choque" alCambiar={(v) => editar((e) => (e.conflicto = v))} />
      <CampoTexto etiqueta="Acción" valor={episodio.accion} pista="El verbo: firma, huye…" alCambiar={(v) => editar((e) => (e.accion = v))} />
    </div>
    <CampoTexto etiqueta="Contexto" ref="§12" valor={episodio.contexto} pista="Dónde y cuándo" alCambiar={(v) => editar((e) => (e.contexto = v))} />
  </ConGuia>
  <ConGuia pieza={episodio} clave="episodio.gancho">
    <CampoTexto etiqueta="Gancho final" ref="§12" largo valor={episodio.gancho} pista="¿Con qué se queda el público?" alCambiar={(v) => editar((e) => (e.gancho = v))} />
  </ConGuia>

  <div class="f">
    <span class="lbl">Actos<span class="ref">§12 · D9</span></span>
    <div class="grupo">
      <CampoTexto etiqueta="Teaser (opcional)" largo valor={episodio.actos.teaser} pista="—" alCambiar={(v) => editar((e) => (e.actos.teaser = v))} />
      <CampoTexto etiqueta="Inicio" largo valor={episodio.actos.inicio} pista="—" alCambiar={(v) => editar((e) => (e.actos.inicio = v))} />
      <CampoTexto etiqueta="Desarrollo" largo valor={episodio.actos.desarrollo} pista="—" alCambiar={(v) => editar((e) => (e.actos.desarrollo = v))} />
      <ConGuia pieza={episodio} clave="episodio.desenlace">
        <CampoTexto etiqueta="Desenlace" largo valor={episodio.actos.desenlace} pista="—" alCambiar={(v) => editar((e) => (e.actos.desenlace = v))} />
      </ConGuia>
    </div>
  </div>

  <SelectorPieza
    etiqueta="Trama dominante"
    ref="D8"
    opciones={d.arcos}
    valor={episodio.dominante_manual}
    vacio={d.calculada ? `Calculada: ${d.calculada}` : "Calculada: ninguna (sin escenas)"}
    alCambiar={(id) => editar((e) => (e.dominante_manual = id))}
  />

  {#if d.escaleta}
    <div class="warnbox aviso-escaleta" role="status">
      <TriangleAlert class="i" /><span>La escaleta de la wiki no está al día. <a class="enlace" href={d.escaleta} onclick={abrirFicha} onauxclick={abrirFicha} draggable="false">Abrir la ficha en Obsidian</a></span>
    </div>
  {/if}
  <div class="warnbox info">
    <ListOrdered class="i" /><span>Al pasarlo a la wiki, sus escenas rellenan la <b>escaleta</b> de la ficha (escena, lugar, qué pasa, trama), sin la verdad de los secretos.</span>
  </div>
  <FichaWiki pieza={episodio} />
  <div class="botones">
    <button class="btn" onclick={insertarDespues}><Plus class="i" />Episodio después</button>
  </div>
</div>

<style>
  .lbl {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 6px;
  }
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
  .grupo {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 10px;
    border-left: 2px solid var(--line);
  }
  .botones {
    display: flex;
    gap: 8px;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  b {
    font-weight: 500;
  }
</style>
