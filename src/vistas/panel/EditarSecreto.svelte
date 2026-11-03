<script lang="ts">
  // Editar del secreto (spec 4.2 Secreto, T4.4; maqueta #z=temporada&sel=secreto:s1).
  import Eye from "@lucide/svelte/icons/eye";
  import Ghost from "@lucide/svelte/icons/ghost";
  import Lock from "@lucide/svelte/icons/lock";
  import Plus from "@lucide/svelte/icons/plus";
  import Sprout from "@lucide/svelte/icons/sprout";
  import X from "@lucide/svelte/icons/x";
  import { usarEstado } from "../../lib/app/contexto";
  import { cambiarConocen, cambiarFecha, escritaDeOtraForma, fechaVista } from "../../lib/modelo/conocen-desde";
  import * as c from "../../lib/modelo/consultas";
  import type { Secreto } from "../../lib/modelo/tipos";
  import { CLASE_PISTA, etiqueta, NIVEL_SECRETO, type ClasePista, type NivelSecreto } from "../../lib/modelo/vocabulario";
  import { mayus, sinCorchetes } from "../../lib/vistas/textos";
  import CampoWiki from "../comunes/CampoWiki.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import CampoEstado from "./CampoEstado.svelte";
  import FichaWiki from "./FichaWiki.svelte";

  const { secreto }: { secreto: Secreto } = $props();
  const estado = usarEstado();
  const editar = (fn: (s: Secreto) => void) => estado.sesion!.editar<Secreto>(secreto.id, fn);

  const niveles = NIVEL_SECRETO.map((v) => ({ valor: v, texto: mayus(v) }));

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return {
      episodios: c.episodiosEnOrden(m).map((e) => ({ id: e.id, texto: c.codigo(m, e.id) })),
      eventosDe: (ep: string) => c.eventosDeEpisodio(m, ep).map((e) => ({ id: e.id, texto: e.titulo || "Sin título" })),
    };
  });

  // «Lo sabe desde» (spec 010, RF-26, RF-29): episodios por temporada, y los que no tienen temporada al final
  const desde = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const grupos = c
      .temporadasEnOrden(m)
      .map((t) => ({
        nombre: [c.codigo(m, t.id), t.titulo.trim()].filter(Boolean).join(" · ") || "Temporada",
        episodios: c.episodiosDeTemporada(m, t.id).map((e) => ({ id: e.id, texto: [c.codigo(m, e.id), e.titulo.trim()].filter(Boolean).join(" · ") })),
      }))
      .filter((g) => g.episodios.length);
    const vistos = new Set(grupos.flatMap((g) => g.episodios.map((e) => e.id)));
    const sueltos = [...m.episodios.values()].filter((e) => !vistos.has(e.id));
    if (sueltos.length) grupos.push({ nombre: "Sin temporada", episodios: sueltos.map((e) => ({ id: e.id, texto: e.titulo.trim() || e.id })) });
    const fechas = secreto.conocen.map((n) => fechaVista(m, secreto, n));
    return { grupos, fechas, aMano: escritaDeOtraForma(secreto), rotas: secreto.conocen.filter((_, i) => typeof fechas[i] === "object" && "rota" in fechas[i]) };
  });

</script>

{#snippet lugar(ep: string, ev: string, cambiar: (ep: string, ev: string) => void)}
  <select class="v" class:ph={!ep} aria-label="Episodio" value={ep} onchange={(e) => cambiar(e.currentTarget.value, "")}>
    <option value="">Episodio</option>
    {#each d.episodios as o (o.id)}<option value={o.id}>{o.texto}</option>{/each}
  </select>
  <select class="v" class:ph={!ev} aria-label="Escena" value={ev} disabled={!ep} onchange={(e) => cambiar(ep, e.currentTarget.value)}>
    <option value="">Todo el episodio</option>
    {#each ep ? d.eventosDe(ep) : [] as o (o.id)}<option value={o.id}>{o.texto}</option>{/each}
  </select>
{/snippet}

<div class="ib-body">
  <CampoTexto etiqueta="Título sin spoiler" valor={secreto.titulo} pista="Quién grabó la cinta" alCambiar={(v) => editar((s) => (s.titulo = v))} />
  <CampoEstado pieza={secreto} />
  <Conmutador etiqueta="Nivel" ref="Plantilla Secreto" opciones={niveles} valor={secreto.nivel} alCambiar={(v: NivelSecreto) => editar((s) => (s.nivel = v))} />
  <ConGuia pieza={secreto} clave="secreto.verdad">
    <CampoTexto etiqueta="La verdad · solo autor" ref="Regla 10" largo valor={secreto.verdad} pista="Lo que de verdad pasó. Nunca sale en loglines ni escaletas anteriores a su revelación." alCambiar={(v) => editar((s) => (s.verdad = v))}>
      {#snippet icono()}<Lock class="i" style="width:12px;height:12px" />{/snippet}
    </CampoTexto>
  </ConGuia>
  <ConGuia pieza={secreto} clave="secreto.conocen">
    <CampoTexto etiqueta="Qué cree la audiencia hasta entonces" largo valor={secreto.cree_audiencia} pista="Lo que el público da por cierto" alCambiar={(v) => editar((s) => (s.cree_audiencia = v))} />
  </ConGuia>
  <ConGuia pieza={secreto} clave="secreto.conocen">
    <CampoWiki etiqueta="Lo conocen" tipos={["personaje"]} valores={secreto.conocen} alCambiar={(v) => editar((s) => cambiarConocen(s, v))}>
      {#snippet junto(n)}
        {@const k = secreto.conocen.findIndex((x) => sinCorchetes(x) === n)}
        {@const f = desde.fechas[k]}
        <select
          class="desde"
          class:ph={typeof f !== "object" || !("episodio" in f)}
          aria-label="Lo sabe desde ({n})"
          title="Lo sabe desde"
          disabled={desde.aMano}
          value={typeof f === "object" && "episodio" in f ? f.episodio : typeof f === "object" ? "rota" : ""}
          onchange={(e) => editar((s) => cambiarFecha(s, secreto.conocen[k] ?? `[[${n}]]`, e.currentTarget.value))}
        >
          <option value="">Sin fecha</option>
          <!-- Fecha rota (RF-29): elegir «Sin fecha» la quita en un paso -->
          {#if typeof f === "object" && "rota" in f}<option value="rota" disabled>Fecha no válida</option>{/if}
          {#each desde.grupos as g, gi (gi)}
            <optgroup label={g.nombre}>
              {#each g.episodios as o (o.id)}<option value={o.id}>{o.texto}</option>{/each}
            </optgroup>
          {/each}
        </select>
      {/snippet}
    </CampoWiki>
    {#if desde.aMano}
      <p class="nota">«Lo sabe desde» está escrito a mano de otra forma: cámbialo en Obsidian.</p>
    {:else if desde.rotas.length}
      <p class="nota">La fecha guardada de {desde.rotas.map(sinCorchetes).join(", ")} no es un episodio de la serie: cuenta como Sin fecha.</p>
    {/if}
  </ConGuia>

  <ConGuia pieza={secreto} clave="secreto.revela">
    <div class="f">
      <span class="lbl"><Eye class="i ojo" />Se revela en</span>
      <div class="dos">{@render lugar(secreto.revelado_en.episodio, secreto.revelado_en.evento, (ep, ev) => editar((s) => (s.revelado_en = { episodio: ep, evento: ev })))}</div>
    </div>
  </ConGuia>

  <ConGuia pieza={secreto} clave="secreto.pistas">
    <div class="f">
      <span class="lbl">Pistas sembradas<span class="ref">§15</span></span>
      <div class="lista">
        {#each secreto.pistas as p, i (i)}
          <div class="pista">
            <Sprout class="i brote" />
            <div class="cuerpo">
              <input class="v" placeholder="Qué ve el público" value={p.texto} oninput={(e) => editar((s) => (s.pistas[i].texto = e.currentTarget.value))} />
              <div class="dos">
                {@render lugar(p.episodio, p.evento, (ep, ev) =>
                  editar((s) => {
                    s.pistas[i].episodio = ep;
                    s.pistas[i].evento = ev;
                  }),
                )}
              </div>
              <span class="tg sm">
                {#each CLASE_PISTA as k (k)}
                  <button class:on={p.clase === k} onclick={() => editar((s) => (s.pistas[i].clase = k as ClasePista))}>{mayus(etiqueta(CLASE_PISTA, k))}</button>
                {/each}
              </span>
            </div>
            <button class="quitar" aria-label="Quitar pista" onclick={() => editar((s) => s.pistas.splice(i, 1))}><X class="i" /></button>
          </div>
        {:else}
          <p class="ninguna">Ninguna todavía.</p>
        {/each}
        <button class="mas" onclick={() => editar((s) => s.pistas.push({ episodio: "", evento: "", texto: "", clase: "sutil" }))}><Plus class="i" />Añadir pista</button>
      </div>
    </div>
  </ConGuia>

  <ConGuia pieza={secreto} clave="secreto.pistas">
    <div class="f">
      <span class="lbl">Pistas falsas</span>
      <div class="lista">
        {#each secreto.falsas as p, i (i)}
          <div class="pista">
            <Ghost class="i fantasma" />
            <div class="cuerpo">
              <input class="v" placeholder="Qué ve el público" value={p.texto} oninput={(e) => editar((s) => (s.falsas[i].texto = e.currentTarget.value))} />
              <div class="dos">
                {@render lugar(p.episodio, p.evento, (ep, ev) =>
                  editar((s) => {
                    s.falsas[i].episodio = ep;
                    s.falsas[i].evento = ev;
                  }),
                )}
              </div>
              <input class="v" placeholder="Qué concluye (equivocado)" value={p.conclusion} oninput={(e) => editar((s) => (s.falsas[i].conclusion = e.currentTarget.value))} />
            </div>
            <button class="quitar" aria-label="Quitar pista falsa" onclick={() => editar((s) => s.falsas.splice(i, 1))}><X class="i" /></button>
          </div>
        {/each}
        <button class="mas" onclick={() => editar((s) => s.falsas.push({ episodio: "", evento: "", texto: "", conclusion: "" }))}><Plus class="i" />Añadir pista falsa</button>
      </div>
    </div>
  </ConGuia>

  <FichaWiki pieza={secreto} />
</div>

<style>
  .desde {
    font: inherit;
    font-size: 11px;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    max-width: 120px;
    padding: 0 2px;
    cursor: pointer;
  }
  .desde.ph {
    color: var(--ink-3);
    font-style: italic;
  }
  .desde:disabled {
    cursor: default;
  }
  .nota {
    font-size: 11.5px;
    color: var(--warn);
    margin: 4px 0 0;
  }
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
  .lbl :global(.ojo) {
    color: var(--accent);
  }
  .dos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .lista {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pista {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--line);
  }
  .pista :global(.brote) {
    color: var(--ok);
    margin-top: 9px;
  }
  .pista :global(.fantasma) {
    color: var(--ink-3);
    margin-top: 9px;
  }
  .cuerpo {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  select:disabled {
    opacity: 0.5;
  }
  .quitar {
    color: var(--ink-3);
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    margin-top: 4px;
  }
  .quitar:hover {
    background: var(--hover);
    color: var(--ink);
  }
  .mas {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-3);
    font-size: 12px;
    align-self: flex-start;
  }
  .mas:hover {
    color: var(--ink);
  }
  .ninguna {
    color: var(--warn);
    font-size: 12.5px;
    margin: 0;
  }
</style>
