<script lang="ts">
  // Editar del arco (spec 4.2 Arco, T3.3; maqueta #z=tramas&t=tor&sel=trama:tor).
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import type { Arco } from "../../lib/modelo/tipos";
  import {
    etiqueta,
    NIVEL_ARCO,
    TIPO_ARCO,
    TIPO_TRAMA,
    type NivelArco,
    type TipoArco,
    type TipoTrama,
  } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import CampoWiki from "../comunes/CampoWiki.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import SelectorPieza from "./campos/SelectorPieza.svelte";
  import SelectorPosicion from "./campos/SelectorPosicion.svelte";
  import CampoEstado from "./CampoEstado.svelte";
  import FichaWiki from "./FichaWiki.svelte";
  import Siembras from "./Siembras.svelte";

  const { arco }: { arco: Arco } = $props();
  const estado = usarEstado();
  const editar = (fn: (a: Arco) => void) => estado.sesion!.editar<Arco>(arco.id, fn);

  const tipos = TIPO_ARCO.map((v) => ({ valor: v, texto: mayus(etiqueta(TIPO_ARCO, v)) }));
  const niveles = NIVEL_ARCO.map((v) => ({ valor: v, texto: v === "serie" ? "Serie" : "Temporada" }));
  const abc = TIPO_TRAMA.map((v) => ({ valor: v, texto: v }));

  const listas = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return {
      temporadas: c.temporadasEnOrden(m).map((t) => ({ id: t.id, texto: `${c.codigo(m, t.id)} · ${t.titulo || t.estado}` })),
      deSerie: c
        .arcosEnOrden(m)
        .filter((a) => a.nivel === "serie" && a.id !== arco.id && a.madurez !== "descartado")
        .map((a) => ({ id: a.id, texto: a.titulo || "Sin título" })),
    };
  });
</script>

<div class="ib-body">
  <CampoTexto etiqueta="Título" valor={arco.titulo} pista="El eco" alCambiar={(v) => editar((a) => (a.titulo = v))} />
  <CampoEstado pieza={arco} />
  {#if arco.tipo_arco === "personaje"}
    <CampoWiki etiqueta="Personaje" ref="Ficha" uno tipos={["personaje"]} valores={arco.personaje ? [arco.personaje] : []} alCambiar={(v) => editar((a) => (a.personaje = v[0] ?? ""))} />
  {:else}
    <ConGuia pieza={arco} clave="arco.protagonistas">
      <CampoWiki etiqueta={arco.tipo_arco === "relacion" ? "Protagonistas del vínculo" : "Protagonistas"} tipos={["personaje"]} valores={arco.protagonistas} alCambiar={(v) => editar((a) => (a.protagonistas = v))} />
    </ConGuia>
  {/if}
  <Conmutador etiqueta="Tipo de arco" ref="Plantilla Arco" opciones={tipos} valor={arco.tipo_arco} alCambiar={(v: TipoArco) => editar((a) => (a.tipo_arco = v))} />
  <div class="f2">
    <ConGuia pieza={arco} clave="arco.nivel">
      <Conmutador
        etiqueta="Nivel"
        opciones={niveles}
        valor={arco.nivel}
        alCambiar={(v: NivelArco) =>
          editar((a) => {
            a.nivel = v;
            if (v === "serie") {
              a.temporada = "";
              a.tramo_de = "";
            }
          })}
      />
    </ConGuia>
    <Conmutador etiqueta="Tipo" mono opciones={abc} valor={arco.tipo_trama} alCambiar={(v: TipoTrama) => editar((a) => (a.tipo_trama = v))} />
  </div>
  {#if arco.nivel === "temporada"}
    <div class="f2">
      <SelectorPieza etiqueta="Temporada" opciones={listas.temporadas} valor={arco.temporada} alCambiar={(id) => editar((a) => (a.temporada = id))} />
      <SelectorPieza
        etiqueta="Es tramo de"
        opciones={listas.deSerie}
        valor={arco.tramo_de}
        vacio="De ninguno: va suelto"
        alCambiar={(id) => editar((a) => (a.tramo_de = id))}
      />
    </div>
  {/if}
  <div class="f">
    <span class="lbl">Color</span>
    <div class="colores" role="radiogroup" aria-label="Color">
      {#each [1, 2, 3, 4, 5, 6] as n (n)}
        <button
          role="radio"
          aria-checked={arco.color === n}
          aria-label="Color {n}"
          class="color"
          class:on={arco.color === n}
          style:background="var(--t{n})"
          style:--c="var(--t{n})"
          onclick={() => editar((a) => (a.color = n))}
        ></button>
      {/each}
    </div>
  </div>
  <div class="f2">
    <ConGuia pieza={arco} clave="arco.inicio">
      <SelectorPosicion etiqueta="Empieza (a mano)" valor={arco.inicio} alCambiar={(p) => editar((a) => (a.inicio = p))} />
    </ConGuia>
    <ConGuia pieza={arco} clave="arco.fin">
      <SelectorPosicion etiqueta="Acaba (a mano)" valor={arco.fin} alCambiar={(p) => editar((a) => (a.fin = p))} />
    </ConGuia>
  </div>
  {#if arco.tipo_arco !== "personaje"}
    <ConGuia pieza={arco} clave="arco.bomba">
      <SelectorPosicion etiqueta="Vence la bomba" ref="§10" valor={arco.bomba_vence} alCambiar={(p) => editar((a) => (a.bomba_vence = p))} />
    </ConGuia>
  {/if}
  <Siembras {arco} />
  <FichaWiki pieza={arco} />
</div>

<style>
  .lbl {
    display: block;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .colores {
    display: flex;
    gap: 8px;
  }
  .color {
    width: 22px;
    height: 22px;
    border-radius: 6px;
  }
  .color.on {
    box-shadow:
      0 0 0 2px var(--surface),
      0 0 0 4px var(--c);
  }
</style>
