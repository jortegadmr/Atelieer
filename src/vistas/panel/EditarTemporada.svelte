<script lang="ts">
  // Editar de la temporada (spec 4.2 Temporada, T4.1; maqueta #z=temporada).
  import { untrack } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import type { Temporada } from "../../lib/modelo/tipos";
  import { momento, plantilla, soloLectura, type IdPlantilla } from "../../lib/modelo/plantillas";
  import { ESTADO_TEMPORADA, etiqueta, type EstadoTemporada } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import CampoCarga from "./campos/CampoCarga.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import SelectorPieza from "./campos/SelectorPieza.svelte";
  import ApartadoPlantilla from "./ApartadoPlantilla.svelte";
  import CampoEstado from "./CampoEstado.svelte";
  import FichaWiki from "./FichaWiki.svelte";

  const { temporada }: { temporada: Temporada } = $props();
  const estado = usarEstado();
  const editar = (fn: (t: Temporada) => void) => estado.sesion!.editar<Temporada>(temporada.id, fn);

  const estados = ESTADO_TEMPORADA.map((v) => ({ valor: v, texto: mayus(etiqueta(ESTADO_TEMPORADA, v)) }));

  // Save the Cat y Viaje del héroe van plegados mientras no tengan nada (spec 011, RF-28)
  const PLEGADAS: IdPlantilla[] = ["save_the_cat", "viaje_heroe"];
  const conAlgo = (id: IdPlantilla) =>
    soloLectura(temporada, id) !== null ||
    plantilla(id).momentos.some((x) => {
      const v = momento(temporada, id, x.clave);
      return !!(v.texto.trim() || v.episodio || v.escena);
    });

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return {
      // D7: la principal se elige entre los arcos A presentes en la temporada
      principales: c
        .arcosPresentes(m, temporada.id)
        .filter((a) => a.tipo_trama === "A" && a.madurez !== "descartado")
        .map((a) => ({ id: a.id, texto: a.titulo || "Sin título" })),
    };
  });
</script>

<div class="ib-body">
  <CampoTexto etiqueta="Título" valor={temporada.titulo} pista="Cerrar la emisora" alCambiar={(v) => editar((t) => (t.titulo = v))} />
  <CampoTexto etiqueta="Logline" largo valor={temporada.logline} pista="La temporada en una frase." alCambiar={(v) => editar((t) => (t.logline = v))} />
  <ConGuia pieza={temporada} clave="temporada.pregunta">
    <CampoTexto
      etiqueta="Pregunta dramática"
      largo
      valor={temporada.pregunta_dramatica}
      pista="¿Qué pregunta responde el final de la temporada?"
      alCambiar={(v) => editar((t) => (t.pregunta_dramatica = v))}
    />
  </ConGuia>
  <CampoTexto etiqueta="Tema de la temporada" valor={temporada.tema} pista="Lo que se avisa y a quién." alCambiar={(v) => editar((t) => (t.tema = v))} />
  <ConGuia pieza={temporada} clave="temporada.principal">
    <SelectorPieza
      etiqueta="Trama principal"
      ref="D7"
      opciones={d.principales}
      valor={temporada.principal}
      vacio="Sin elegir"
      alCambiar={(id) => editar((t) => (t.principal = id))}
    />
  </ConGuia>
  <ConGuia pieza={temporada} clave="temporada.carga">
    <div class="f2">
      <CampoCarga etiqueta="Carga al empezar" valor={temporada.carga[0]} alCambiar={(v) => editar((t) => (t.carga[0] = v))} />
      <CampoCarga etiqueta="Carga al acabar" valor={temporada.carga[1]} alCambiar={(v) => editar((t) => (t.carga[1] = v))} />
    </div>
  </ConGuia>
  <Conmutador etiqueta="Estado" opciones={estados} valor={temporada.estado} alCambiar={(v: EstadoTemporada) => editar((t) => (t.estado = v))} />
  <CampoEstado pieza={temporada} />

  <CampoTexto etiqueta="Punto de partida" ref="§12" largo valor={temporada.partida} pista="¿Cómo empieza todo?" alCambiar={(v) => editar((t) => (t.partida = v))} />
  <div class="f">
    <span class="lbl">Estructura (tres actos)<span class="ref">§17</span></span>
    <ApartadoPlantilla {temporada} id="tres_actos" guias={{ crisis: "temporada.crisis", climax: "temporada.climax" }} />
  </div>
  <ConGuia pieza={temporada} clave="temporada.llegada">
    <CampoTexto etiqueta="Punto de llegada" ref="§12" largo valor={temporada.llegada} pista="¿Cómo queda todo al final?" alCambiar={(v) => editar((t) => (t.llegada = v))} />
  </ConGuia>
  <ConGuia pieza={temporada} clave="temporada.cierre">
    <CampoTexto etiqueta="Cierre / cliffhanger" ref="§12" largo valor={temporada.cierre} pista="El gancho hacia la siguiente." alCambiar={(v) => editar((t) => (t.cierre = v))} />
  </ConGuia>

  <ConGuia pieza={temporada} clave="temporada.story_circle">
    <div class="f">
      <span class="lbl">Story Circle<span class="ref">§12</span></span>
      <ApartadoPlantilla {temporada} id="story_circle" />
    </div>
  </ConGuia>

  <!-- Abierto o plegado al abrir la temporada; no se pliega mientras el autor escribe -->
  {#key temporada.id}
    {#each PLEGADAS as p (p)}
      <details class="f plegable" open={untrack(() => conAlgo(p))}>
        <summary class="lbl">{plantilla(p).nombre}</summary>
        <ApartadoPlantilla {temporada} id={p} />
      </details>
    {/each}
  {/key}

  <!-- Siempre a la vista: la plantilla cuenta con los previstos (spec 011, RF-38) -->
  <div class="f">
    <label for="previstos">Episodios previstos</label>
    <input
      id="previstos"
      class="v mono"
      type="number"
      min="0"
      max="99"
      value={temporada.episodios_previstos || ""}
      placeholder="¿?"
      oninput={(e) => {
        const n = Math.max(0, Math.min(99, Math.round(Number(e.currentTarget.value) || 0)));
        editar((t) => (t.episodios_previstos = n));
      }}
    />
  </div>

  <FichaWiki pieza={temporada} />
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
  .plegable summary {
    cursor: pointer;
    list-style: revert;
    display: list-item;
  }
  .plegable[open] summary {
    margin-bottom: 8px;
  }
</style>
