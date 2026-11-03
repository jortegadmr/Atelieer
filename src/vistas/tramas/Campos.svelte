<script lang="ts">
  // Campos guiados del arco según su tipo (spec 4.2, 5.2; maqueta #z=tramas).
  import ArrowLeftRight from "@lucide/svelte/icons/arrow-left-right";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import Bomb from "@lucide/svelte/icons/bomb";
  import HeartCrack from "@lucide/svelte/icons/heart-crack";
  import Link from "@lucide/svelte/icons/link";
  import Quote from "@lucide/svelte/icons/quote";
  import Repeat2 from "@lucide/svelte/icons/repeat-2";
  import ShieldHalf from "@lucide/svelte/icons/shield-half";
  import Table2 from "@lucide/svelte/icons/table-2";
  import Target from "@lucide/svelte/icons/target";
  import UserRound from "@lucide/svelte/icons/user-round";
  import { usarEstado } from "../../lib/app/contexto";
  import { abrirUrl } from "../../lib/app/plataforma";
  import * as c from "../../lib/modelo/consultas";
  import type { Arco } from "../../lib/modelo/tipos";
  import { aEnlaces, sinCorchetes } from "../../lib/vistas/textos";
  import ConGuia from "../panel/campos/ConGuia.svelte";
  import TarjetaCampo from "./TarjetaCampo.svelte";
  import TarjetaDoble from "./TarjetaDoble.svelte";
  import type { ConFuente } from "../../lib/consecuencias/fuente";
  import type { MarcasTramas } from "../../lib/consecuencias/vistas";

  const { arco, marcas = null }: { arco: Arco; marcas?: ConFuente<MarcasTramas> | null } = $props();
  const estado = usarEstado();
  const editar = (fn: (a: Arco) => void) => estado.sesion!.editar<Arco>(arco.id, fn);

  const sub = $derived(arco.tipo_trama !== "A");
  const nombres = $derived(arco.protagonistas.map(sinCorchetes).filter(Boolean));

  const temporadas = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return c.temporadasEnOrden(m).map((t) => ({ id: t.id, codigo: c.codigo(m, t.id) }));
  });

  function estadoEn(temporada: string) {
    return arco.estados.find((e) => e.temporada === temporada) ?? { temporada, inicio: "", fin: "" };
  }

  function ponerEstado(temporada: string, campo: "inicio" | "fin", v: string) {
    editar((a) => {
      let e = a.estados.find((x) => x.temporada === temporada);
      if (!e) {
        e = { temporada, inicio: "", fin: "" };
        a.estados.push(e);
      }
      e[campo] = v;
      a.estados = a.estados.filter((x) => x.inicio || x.fin || x.temporada === temporada);
    });
  }

  // T8.2: lo que ya está en la ficha del personaje se lee de ella, no se copia
  const ficha = $derived.by(() => {
    void estado.version;
    return arco.tipo_arco === "personaje" && arco.personaje ? estado.sesion!.wiki.buscar(arco.personaje) : null;
  });
  const deFicha = (k: "quiere" | "necesita" | "herida" | "mentira") => ficha?.motor[k] ?? "";
  const abrirFicha = () => ficha && abrirUrl(estado.sesion!.wiki.urlObsidian(ficha));

  // Cómo estaba cada campo (spec 009, RF-30): «antes: …», por su etiqueta en «Lo cambiado»
  const antes = (campo: string) => {
    const t = marcas?.campos.get(campo);
    return t ? `${marcas!.textos.antes}: ${t}` : null;
  };
  const fantasma = $derived(!!marcas?.fantasma);
  const antesEstado = (t: string) => {
    const x = marcas?.estados.get(t);
    return x ? `${marcas!.textos.antes}: ${x}` : null;
  };

  const ini = (n: string) =>
    n
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
</script>

{#snippet leida(etiqueta: string, ref: string, texto: string, Icono: typeof Target)}
  <div class="bx leida">
    <h3><Icono class="i" />{etiqueta}<span class="ref">{ref}</span></h3>
    <p>{texto}</p>
    <button class="de-ficha" title="Abrir la ficha en Obsidian" onclick={abrirFicha}>de la ficha <ArrowUpRight class="i" style="width:12px;height:12px" /></button>
  </div>
{/snippet}

{#snippet chips(lista: string[])}
  <p class="chips">
    {#each lista as n (n)}<span class="wk"><span class="ini">{ini(n)}</span>{n}<ArrowUpRight class="i" /></span>{/each}
  </p>
{/snippet}

<div class="gp">
  {#if arco.tipo_arco === "personaje"}
    <TarjetaCampo
      etiqueta="Personaje"
      ref="Ficha"
      alSalir
      valor={sinCorchetes(arco.personaje)}
      pista="¿De quién es este arco? Su nombre en la wiki."
      antes={antes("Personaje")}
      {fantasma}
      alCambiar={(v) => editar((a) => (a.personaje = v.trim() ? `[[${sinCorchetes(v)}]]` : ""))}
    >
      {#snippet icono()}<UserRound class="i" />{/snippet}
      {#snippet vista()}{@render chips([sinCorchetes(arco.personaje)])}{/snippet}
    </TarjetaCampo>
    {#if deFicha("quiere")}
      {@render leida("Qué quiere", "Met. 1.5", deFicha("quiere"), Target)}
    {:else}
      <ConGuia pieza={arco} clave="arco.quiere">
        <TarjetaCampo
          etiqueta="Qué quiere"
          ref="Met. 1.5"
          valor={arco.quiere}
          pista="Su objetivo consciente."
          antes={antes("Qué quiere")}
          {fantasma}
          alCambiar={(v) => editar((a) => (a.quiere = v))}
        >
          {#snippet icono()}<Target class="i" />{/snippet}
        </TarjetaCampo>
      </ConGuia>
    {/if}
    {#if deFicha("necesita")}
      {@render leida("Qué necesita", "Met. 1.6", deFicha("necesita"), HeartCrack)}
    {:else}
      <ConGuia pieza={arco} clave="arco.necesita">
        <TarjetaCampo
          etiqueta="Qué necesita"
          ref="Met. 1.6"
          valor={arco.necesita}
          pista="Lo que de verdad le falta. El choque con lo que quiere es su arco."
          antes={antes("Qué necesita")}
          {fantasma}
          alCambiar={(v) => editar((a) => (a.necesita = v))}
        >
          {#snippet icono()}<HeartCrack class="i" />{/snippet}
        </TarjetaCampo>
      </ConGuia>
    {/if}
    {#if deFicha("herida") && deFicha("mentira")}
      {@render leida("Herida y mentira que cree", "Met. 1.7-1.8", `${deFicha("herida")}
«${deFicha("mentira")}»`, Quote)}
    {:else}
      <TarjetaDoble
        etiqueta="Herida y mentira que cree"
        ref="Met. 1.7-1.8"
        pista="Lo que le marcó y la mentira que se cuenta por ello."
        {fantasma}
        a={{ etiqueta: "Herida", valor: deFicha("herida") || arco.herida, pista: "Lo que le marcó", antes: deFicha("herida") ? null : antes("Herida"), alCambiar: (v) => editar((x) => (x.herida = v)) }}
        b={{
          etiqueta: "Mentira que cree",
          valor: deFicha("mentira") || arco.mentira,
          pista: "Lo que cree por esa herida",
          cursiva: true,
          antes: deFicha("mentira") ? null : antes("Mentira que cree"),
          alCambiar: (v) => editar((x) => (x.mentira = v)),
        }}
      >
        {#snippet icono()}<Quote class="i" />{/snippet}
      </TarjetaDoble>
    {/if}
    <ConGuia pieza={arco} clave="arco.cambia">
      <TarjetaCampo
        etiqueta="Cómo cambia"
        ref="§3"
        valor={arco.cambia}
        pista="¿Cómo queda distinto al final?"
        antes={antes("Cómo cambia")}
        {fantasma}
        alCambiar={(v) => editar((a) => (a.cambia = v))}
      >
        {#snippet icono()}<Repeat2 class="i" />{/snippet}
      </TarjetaCampo>
    </ConGuia>
    <ConGuia pieza={arco} clave="arco.estados">
      <div class="bx">
        <h3><Table2 class="i" />Estado por temporada<span class="ref">Temporada</span></h3>
        <div class="estados">
          <b></b><b>Al empezar</b><b>Al terminar</b>
          {#each temporadas as t (t.id)}
            {@const e = estadoEn(t.id)}
            <span class="wkpath">{t.codigo}</span>
            <input value={e.inicio} placeholder="—" aria-label="{t.codigo}: al empezar" oninput={(ev) => ponerEstado(t.id, "inicio", ev.currentTarget.value)} />
            <input value={e.fin} placeholder="—" aria-label="{t.codigo}: al terminar" oninput={(ev) => ponerEstado(t.id, "fin", ev.currentTarget.value)} />
            {@const estaba = antesEstado(t.id)}
            {#if estaba}<span class="marca-antes fila" class:fantasma>{t.codigo} · {estaba}</span>{/if}
          {/each}
        </div>
      </div>
    </ConGuia>
  {:else}
    <ConGuia pieza={arco} clave="arco.protagonistas">
      <TarjetaCampo
        etiqueta={arco.tipo_arco === "relacion" ? "Protagonistas del vínculo" : "Protagonista de la trama"}
        ref={sub ? "§13" : "§2"}
        alSalir
        valor={nombres.join(", ")}
        pista="¿De quién es esta trama? Separa los nombres con comas."
        antes={antes("Protagonistas")}
        {fantasma}
        alCambiar={(v) => editar((a) => (a.protagonistas = aEnlaces(v)))}
      >
        {#snippet icono()}<UserRound class="i" />{/snippet}
        {#snippet vista()}{@render chips(nombres)}{/snippet}
      </TarjetaCampo>
    </ConGuia>
    <ConGuia pieza={arco} clave="arco.quiere">
      <TarjetaCampo
        etiqueta="Qué quiere y por qué"
        ref="§10"
        valor={arco.quiere}
        pista="Deja muy claro qué quiere y por qué lo quiere."
        antes={antes("Qué quiere")}
        {fantasma}
        alCambiar={(v) => editar((a) => (a.quiere = v))}
      >
        {#snippet icono()}<Target class="i" />{/snippet}
      </TarjetaCampo>
    </ConGuia>
    <TarjetaCampo
      etiqueta="Qué se lo impide"
      ref="§2 · §9"
      valor={arco.impide}
      pista="¿Quién o qué causa el problema? Que esté a su altura."
      antes={antes("Qué se lo impide")}
      {fantasma}
      alCambiar={(v) => editar((a) => (a.impide = v))}
    >
      {#snippet icono()}<ShieldHalf class="i" />{/snippet}
    </TarjetaCampo>
    <ConGuia pieza={arco} clave="arco.gana">
      <TarjetaDoble
        etiqueta="Qué gana / qué pierde"
        ref="§10"
        pista="Todo conflicto trae algo que ganar y algo que perder."
        {fantasma}
        a={{ etiqueta: "Qué gana", valor: arco.gana, pista: "Algo que ganar…", signo: "+", antes: antes("Qué gana"), alCambiar: (v) => editar((x) => (x.gana = v)) }}
        b={{ etiqueta: "Qué pierde", valor: arco.pierde, pista: "…y algo que perder", signo: "−", antes: antes("Qué pierde"), alCambiar: (v) => editar((x) => (x.pierde = v)) }}
      >
        {#snippet icono()}<ArrowLeftRight class="i" />{/snippet}
      </TarjetaDoble>
    </ConGuia>
    <ConGuia pieza={arco} clave="arco.bomba">
      <TarjetaCampo
        etiqueta="Bomba de tiempo"
        ref="§10"
        clase="bombx"
        valor={arco.bomba}
        antes={antes("Bomba de tiempo")}
        {fantasma}
        pista={arco.tipo_trama === "A" ? "¿Qué cuenta atrás le obliga a correr? ¿Qué estalla al llegar a cero?" : "Opcional en B y C. ¿Hay algún plazo?"}
        alCambiar={(v) => editar((a) => (a.bomba = v))}
      >
        {#snippet icono()}<Bomb class="i" />{/snippet}
      </TarjetaCampo>
    </ConGuia>
    <ConGuia pieza={arco} clave="arco.cambia">
      <TarjetaCampo
        etiqueta="Cómo cambia"
        ref="§3"
        valor={arco.cambia}
        pista="¿Cómo queda distinto al final? Empieza por lo que cree."
        antes={antes("Cómo cambia")}
        {fantasma}
        alCambiar={(v) => editar((a) => (a.cambia = v))}
      >
        {#snippet icono()}<Repeat2 class="i" />{/snippet}
      </TarjetaCampo>
    </ConGuia>
    {#if sub || arco.pegamento.texto}
      <ConGuia pieza={arco} clave="arco.pegamento">
        <TarjetaCampo
          etiqueta="Pegamento con la principal"
          ref="§13"
          valor={arco.pegamento.texto}
          pista="Por trama (personajes o hechos) o, mejor, por tema."
          antes={antes("Pegamento con la principal")}
          {fantasma}
          alCambiar={(v) => editar((a) => (a.pegamento.texto = v))}
        >
          {#snippet icono()}<Link class="i" />{/snippet}
          {#snippet vista()}
            <p>{#if arco.pegamento.por}<span class="por">Por {arco.pegamento.por}:</span>{/if} {arco.pegamento.texto}</p>
          {/snippet}
        </TarjetaCampo>
        <!-- En la misma caja que la tarjeta: sus reglas no se cierran al pasar a los botones -->
        <div class="pegamento-por">
          <span>Pegamento</span>
          <span class="tg sm">
            <button class:on={arco.pegamento.por === "trama"} onclick={() => editar((a) => (a.pegamento.por = a.pegamento.por === "trama" ? "" : "trama"))}>Por trama</button>
            <button class:on={arco.pegamento.por === "tema"} onclick={() => editar((a) => (a.pegamento.por = a.pegamento.por === "tema" ? "" : "tema"))}>Por tema</button>
          </span>
          {#if antes("Pegamento")}<span class="marca-antes" class:fantasma>{antes("Pegamento")}</span>{/if}
        </div>
      </ConGuia>
    {/if}
  {/if}
</div>

<style>
  .gp {
    margin-bottom: 12px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .estados {
    font-size: 12.5px;
    display: grid;
    grid-template-columns: 34px 1fr 1fr;
    gap: 4px 10px;
    align-items: center;
  }
  .estados .fila {
    grid-column: 2 / -1;
  }
  .estados b {
    font-weight: 500;
    color: var(--ink-3);
  }
  .estados input {
    border: 0;
    border-bottom: 1px dashed var(--line);
    background: transparent;
    font: inherit;
    color: var(--ink);
    padding: 3px 0;
    outline: none;
    min-width: 0;
  }
  .estados input:focus {
    border-bottom-color: var(--accent);
  }
  .leida p {
    white-space: pre-line;
  }
  .de-ficha {
    margin-top: auto;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--ok);
  }
  .de-ficha:hover {
    text-decoration: underline;
  }
  .por {
    color: var(--ink-3);
    font-style: italic;
  }
  .pegamento-por {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0 0;
    font-size: 11.5px;
    color: var(--ink-3);
  }
</style>
