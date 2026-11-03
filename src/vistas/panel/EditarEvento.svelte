<script lang="ts">
  // Editar del evento (spec 4.2 Evento, regla 13, D9; T5.3;
  // maqueta #z=episodios&sel=evento:e13 y e6).
  import Check from "@lucide/svelte/icons/check";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { moverEvento } from "../../lib/modelo/operaciones";
  import type { Evento } from "../../lib/modelo/tipos";
  import { ACTO, etiqueta, MODO, PAPEL, type Acto, type Modo, type Papel } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import CampoCarga from "./campos/CampoCarga.svelte";
  import CampoWiki from "../comunes/CampoWiki.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import ConGuia from "./campos/ConGuia.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import CampoEstado from "./CampoEstado.svelte";
  import CausasEscena from "./CausasEscena.svelte";
  import CuadrePanel from "./CuadrePanel.svelte";

  const { evento }: { evento: Evento } = $props();
  const estado = usarEstado();
  const editar = (fn: (e: Evento) => void) => estado.sesion!.editar<Evento>(evento.id, fn);

  const actos = ACTO.map((v) => ({ valor: v, texto: mayus(etiqueta(ACTO, v)) }));
  const modos = MODO.map((v) => ({ valor: v, texto: mayus(etiqueta(MODO, v)) }));

  // Enfocar el título si se acaba de crear desde una celda (T5.2). El panel
  // vuelve a montar este Editar para cada evento, así que basta el valor inicial.
  // svelte-ignore state_referenced_locally
  const enfocar = estado.enfocar === evento.id;
  if (enfocar) estado.enfocar = null;

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const tocados = new Set(evento.arcos.map((x) => x.arco));
    return {
      episodios: c.episodiosDeTemporada(m, evento.temporada).map((e) => ({ id: e.id, texto: `${c.codigo(m, e.id)} · ${e.titulo || "sin título"}` })),
      arcos: evento.arcos.map((x) => ({ ...x, a: m.arcos.get(x.arco) })),
      otros: c
        .arcosEnOrden(m)
        .filter((a) => !tocados.has(a.id) && a.madurez !== "descartado")
        .map((a) => ({ id: a.id, texto: a.titulo || "Sin título" })),
    };
  });


  async function cambiarEpisodio(sel: HTMLSelectElement) {
    // Rechazado (canon): el selector vuelve a enseñar el episodio de verdad
    if (!(await estado.sesion!.aplicar(moverEvento(estado.sesion!.modelo, evento.id, sel.value)))) sel.value = evento.episodio;
  }
</script>

<div class="ib-body">
  <CampoTexto etiqueta="Título" valor={evento.titulo} pista="Qué pasa, en pocas palabras" {enfocar} alCambiar={(v) => editar((e) => (e.titulo = v))} />
  <CampoEstado pieza={evento} />

  <div class="f">
    <label for="ev-episodio">Episodio</label>
    <select id="ev-episodio" class="v" class:ph={!evento.episodio} value={evento.episodio} onchange={(e) => cambiarEpisodio(e.currentTarget)}>
      <option value="">En la bandeja (sin episodio)</option>
      {#each d.episodios as o (o.id)}<option value={o.id}>{o.texto}</option>{/each}
    </select>
  </div>
  <Conmutador etiqueta="Acto" ref="D9" opciones={actos} valor={evento.acto as Acto} alCambiar={(v: Acto) => editar((e) => (e.acto = e.acto === v ? "" : v))} />

  <div class="f2">
    <ConGuia pieza={evento} clave="evento.cuando">
      <CampoWiki etiqueta="Cuándo ocurre en el mundo" ref="Regla 13" pista="Presente" uno tipos={["era"]} valores={evento.mundo ? [evento.mundo] : []} motivo="aparece en «{evento.titulo}»" alCambiar={(v) => editar((e) => (e.mundo = v[0] ?? ""))} />
    </ConGuia>
    <Conmutador etiqueta="Cómo se cuenta" opciones={modos} valor={evento.modo} alCambiar={(v: Modo) => editar((e) => (e.modo = v))} />
  </div>

  <div class="f">
    <span class="lbl">Tramas que toca</span>
    <div class="v bloque">
      {#each d.arcos as x, i (x.arco)}
        <div class="rolrow">
          <span class="nm"><span class="dot" style:background={x.a ? `var(--t${x.a.color})` : "var(--line-2)"}></span>{x.a?.titulo || "Arco borrado"}</span>
          <span class="tg sm">
            {#each PAPEL as p (p)}
              <button class:on={x.papel === p} onclick={() => editar((e) => (e.arcos[i].papel = p as Papel))}>{mayus(etiqueta(PAPEL, p))}</button>
            {/each}
          </span>
          <button class="quitar" aria-label="Quitar trama" title="Quitar" onclick={() => editar((e) => e.arcos.splice(i, 1))}><X class="i" /></button>
        </div>
      {/each}
      {#if d.otros.length}
        <div class="rolrow anadir">
          <Plus class="i" />
          <select
            aria-label="Añadir trama"
            value=""
            onchange={(e) => {
              const id = e.currentTarget.value;
              if (id) editar((ev) => ev.arcos.push({ arco: id, papel: "avanza" }));
            }}
          >
            <option value="">Añadir trama</option>
            {#each d.otros as o (o.id)}<option value={o.id}>{o.texto}</option>{/each}
          </select>
        </div>
      {/if}
    </div>
  </div>

  <ConGuia pieza={evento} clave="evento.valor">
    <div class="f2">
      <CampoTexto etiqueta="Valor en juego" ref="Escena 1.3" valor={evento.valor} pista="Confianza, esperanza…" alCambiar={(v) => editar((e) => (e.valor = v))} />
      <div class="f2 cambio">
        <CampoCarga etiqueta="Empieza" valor={evento.cambio[0]} alCambiar={(v) => editar((e) => (e.cambio[0] = v))} />
        <CampoCarga etiqueta="Acaba" valor={evento.cambio[1]} alCambiar={(v) => editar((e) => (e.cambio[1] = v))} />
      </div>
    </div>
  </ConGuia>
  <ConGuia pieza={evento} clave="evento.gana">
    <div class="f2">
      <CampoTexto etiqueta="Qué gana" ref="§10" valor={evento.gana} pista="Algo que ganar…" alCambiar={(v) => editar((e) => (e.gana = v))} />
      <CampoTexto etiqueta="Qué pierde" ref="§10" valor={evento.pierde} pista="…y algo que perder" alCambiar={(v) => editar((e) => (e.pierde = v))} />
    </div>
  </ConGuia>

  <ConGuia pieza={evento} clave="evento.relleno">
    <div class="f">
      <span class="lbl">Test de relleno<span class="ref">§25</span></span>
      <div class="v bloque">
        <button class="chk" onclick={() => editar((e) => (e.relleno.avanza = !e.relleno.avanza))}>
          <span class="bx2" class:on={evento.relleno.avanza}>{#if evento.relleno.avanza}<Check class="i" />{/if}</span>
          <span>Hace avanzar a un protagonista de las tramas que toca<small>aunque sea un poco</small></span>
        </button>
        <button class="chk" onclick={() => editar((e) => (e.relleno.revela = !e.relleno.revela))}>
          <span class="bx2" class:on={evento.relleno.revela}>{#if evento.relleno.revela}<Check class="i" />{/if}</span>
          <span>Da información importante o desarrolla a un personaje</span>
        </button>
      </div>
    </div>
  </ConGuia>
  <CampoTexto
    etiqueta="Si quito esta escena, se pierde"
    ref="Escena 1.2"
    largo
    valor={evento.eliminacion}
    pista="Test de eliminación: ¿qué se pierde?"
    alCambiar={(v) => editar((e) => (e.eliminacion = v))}
  />
  <CampoWiki etiqueta="Personajes · de la wiki" tipos={["personaje"]} valores={evento.personajes} motivo="aparece en «{evento.titulo}»" alCambiar={(v) => editar((e) => (e.personajes = v))} />
  <CampoWiki etiqueta="Lugares · de la wiki" tipos={["lugar"]} valores={evento.lugares} motivo="aparece en «{evento.titulo}»" alCambiar={(v) => editar((e) => (e.lugares = v))} />
  <CuadrePanel {evento} />
  <CausasEscena {evento} />
  <ConGuia pieza={evento} clave="evento.descripcion">
    <CampoTexto etiqueta="Descripción" largo valor={evento.texto} pista="Qué pasa, con más detalle (texto libre del fichero)" alCambiar={(v) => editar((e) => (e.texto = v))} />
  </ConGuia>
</div>

<style>
  .lbl {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .lbl .ref {
    margin-left: auto;
    font: 10.5px var(--mono);
    opacity: 0.8;
  }
  .bloque {
    display: block;
    padding: 2px 10px;
  }
  .chk {
    width: 100%;
    text-align: left;
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
  .anadir {
    color: var(--ink-3);
  }
  .anadir select {
    border: 0;
    background: transparent;
    color: var(--ink-3);
    font: inherit;
    cursor: pointer;
    outline: none;
  }
  .cambio {
    gap: 6px;
  }
</style>
