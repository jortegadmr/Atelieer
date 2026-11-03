<script lang="ts">
  // Un apartado de plantilla en Editar de la temporada (spec 011, RF-28 a
  // RF-34): por momento, su nombre, su sitio previsto, su explicación, un texto,
  // un episodio de la temporada y una escena. Lo cambia `ponerMomento`.
  import X from "@lucide/svelte/icons/x";
  import { tick } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import type { ClaveCampo } from "../../lib/guia/campos";
  import * as c from "../../lib/modelo/consultas";
  import { estadoDe } from "../../lib/modelo/estados";
  import { momento, plantilla, ponerMomento, soloLectura, type CambioMomento, type IdPlantilla } from "../../lib/modelo/plantillas";
  import type { Evento, Temporada } from "../../lib/modelo/tipos";
  import { dondeSeEmite } from "../../lib/vistas/historia";
  import { estadoEscena, textoSitio } from "../../lib/vistas/plantillas";
  import BuscarEscena from "../comunes/BuscarEscena.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";
  import SelectorPieza from "./campos/SelectorPieza.svelte";

  const {
    temporada,
    id,
    guias = {},
  }: {
    temporada: Temporada;
    id: IdPlantilla;
    /** Las reglas de la guía de algunos momentos (Crisis y Clímax, spec 004) */
    guias?: Partial<Record<string, ClaveCampo>>;
  } = $props();
  const estado = usarEstado();

  const poner = (clave: string, cambio: CambioMomento) =>
    estado.sesion!.editar<Temporada>(temporada.id, (t) => ponerMomento(estado.sesion!.modelo, t, id, clave, cambio));

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const episodios = c.episodiosDeTemporada(m, temporada.id);
    const enTemporada = new Set(episodios.map((e) => e.id));
    const ro = soloLectura(temporada, id);
    return {
      episodios: episodios.map((e) => ({ id: e.id, texto: c.codigo(m, e.id).slice(3) })),
      // RF-29: escenas no descartadas de la temporada que tienen episodio
      filtro: (ev: Evento) => enTemporada.has(ev.episodio) && estadoDe(ev) !== "descartado",
      ro,
      // Con la propiedad escrita a mano de otra forma, solo se cambia lo que vive en los campos de hoy
      soloHoy: ro !== null,
      momentos: plantilla(id).momentos.map((def) => {
        const v = momento(temporada, id, def.clave);
        const ev = v.escena ? m.eventos.get(v.escena) : undefined;
        const marca = estadoEscena(m, v.escena, v.episodio);
        return { def, v, sitio: textoSitio(def.sitio), escena: ev ? { titulo: ev.titulo.trim() || "Sin título", donde: dondeSeEmite(m, ev) } : null, marca };
      }),
    };
  });

  // Tres actos guarda texto y episodio en `estructura`; el Story Circle, el texto en `story_circle`
  const textoHoy = $derived(id === "tres_actos" || id === "story_circle");
  const episodioHoy = $derived(id === "tres_actos");

  // Al llegar desde la rejilla (RF-41): se despliega, se enfoca y se ve
  let caja = $state<HTMLElement | null>(null);
  $effect(() => {
    const quiero = estado.apartadoTemporada;
    if (!quiero || quiero.temporada !== temporada.id || quiero.plantilla !== id || !caja) return;
    estado.apartadoTemporada = null;
    const c = caja;
    for (let d = c.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
    void tick().then(() => {
      c.querySelector<HTMLElement>("input, textarea, select")?.focus();
      c.scrollIntoView({ block: "nearest" });
    });
  });

  function abrir(e: MouseEvent, ev: string) {
    e.preventDefault();
    estado.elegir(ev, "editar");
  }
</script>

<div class="grupo" bind:this={caja}>
  {#if d.ro !== null}
    <p class="crudo">{d.ro}</p>
    <p class="nota">Lo nuevo de «{plantilla(id).nombre}» está escrito a mano de otra forma: cámbialo en Obsidian.</p>
  {/if}
  {#each d.momentos as mo (mo.def.clave)}
    {#snippet uno()}
      <div class="momento">
        <div class="fila">
          {#if !d.soloHoy || textoHoy}
            <CampoTexto etiqueta={mo.def.nombre} ref={mo.sitio} valor={mo.v.texto} pista="Qué pasa" alCambiar={(v) => poner(mo.def.clave, { texto: v })} />
          {:else}
            <div class="f">
              <span class="lbl">{mo.def.nombre}<span class="ref">{mo.sitio}</span></span>
            </div>
          {/if}
          {#if !d.soloHoy || episodioHoy}
            <SelectorPieza etiqueta="Episodio" opciones={d.episodios} valor={mo.v.episodio} vacio="—" alCambiar={(ep) => poner(mo.def.clave, { episodio: ep })} />
          {/if}
        </div>
        <p class="explica">{mo.def.explicacion}</p>
        {#if !d.soloHoy}
          {#if mo.v.escena}
            <div class="escena">
              <span class="nm">
                {#if mo.escena}
                  <a class="enlace" href="#{mo.v.escena}" onclick={(e) => abrir(e, mo.v.escena)} draggable="false">{mo.escena.titulo}</a>
                  <span class="donde">{mo.escena.donde}</span>
                {/if}
                {#if mo.marca}<span class="marca">({mo.marca})</span>{/if}
              </span>
              <button
                class="quitar"
                aria-label="Quitar la escena de {mo.def.nombre}"
                title="Quitar"
                onclick={() => poner(mo.def.clave, { escena: "" })}><X class="i" /></button
              >
            </div>
          {:else}
            <BuscarEscena etiqueta="Escena de {mo.def.nombre}" pista="Escena: buscar por título o T01E03…" filtro={d.filtro} alElegir={(ev) => poner(mo.def.clave, { escena: ev })} />
          {/if}
        {/if}
      </div>
    {/snippet}
    {#if guias[mo.def.clave]}
      <ConGuia pieza={temporada} clave={guias[mo.def.clave]!}>{@render uno()}</ConGuia>
    {:else}
      {@render uno()}
    {/if}
  {/each}
</div>

<style>
  .grupo {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-left: 10px;
    border-left: 2px solid var(--line);
  }
  .fila {
    display: grid;
    grid-template-columns: 1fr 74px;
    gap: 6px;
    align-items: end;
  }
  .lbl {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
  .explica {
    margin: 3px 0 4px;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .escena {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
  }
  .nm {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
  }
  .donde {
    font: 10.5px var(--mono);
    color: var(--ink-3);
  }
  .marca {
    font-size: 11px;
    color: var(--warn);
  }
  .quitar {
    color: var(--ink-3);
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
  }
  .quitar:hover {
    background: var(--hover);
    color: var(--ink);
  }
  .crudo {
    margin: 0;
    font: 12px var(--mono);
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
  .nota {
    font-size: 11.5px;
    color: var(--warn);
    margin: 0;
  }
</style>
