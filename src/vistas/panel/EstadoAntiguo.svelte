<script lang="ts">
  // Estado antiguo de la ficha (spec 009, RF-53 a RF-57): la ficha dice algo que
  // no es un estado de la regla 9. Se propone una equivalencia, que solo se
  // aplica al confirmar; «Dejarlo así» lo apunta en la pieza y deja de avisar
  // mientras la ficha diga ese mismo valor.
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import { AVISO_BLOQUEADA } from "../../lib/app/sesion";
  import { SAL_DE_LA_VARIANTE } from "../../lib/app/sesion-variante";
  import { MADUREZ, etiqueta, type Madurez } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import MadurezPunto from "../comunes/Madurez.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import Conmutador from "./campos/Conmutador.svelte";

  const { id }: { id: string } = $props();
  const estado = usarEstado();

  const opciones: { valor: Madurez | ""; texto: string }[] = MADUREZ.map((v) => ({ valor: v, texto: mayus(etiqueta(MADUREZ, v)) }));

  const antiguo = $derived.by(() => {
    void estado.version;
    return estado.sesion!.estadoAntiguo(id);
  });
  const dejado = $derived.by(() => {
    void estado.version;
    return estado.sesion!.dejadoAsi(id);
  });

  /** La equivalencia elegida: la propuesta, hasta que el autor elija otra */
  let elegida = $state<Madurez | "" | null>(null);
  const valor = $derived<Madurez | "">(elegida ?? antiguo?.propuesta ?? "");
  let motivo = $state("");
  let trabajando = $state(false);
  let avisos = $state<string[]>([]);

  // Por qué no se puede confirmar ahora (RF-55b): se ve, pero no se confirma
  const porQueNo = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    if (s !== estado.sesionSerie) return SAL_DE_LA_VARIANTE("cambiar la wiki");
    if (s.edicionBloqueada) return s.edicionBloqueada;
    if (valor && valor !== "canon" && s.estaBloqueada(id)) return AVISO_BLOQUEADA;
    return null;
  });

  async function confirmar() {
    if (!valor || trabajando) return;
    trabajando = true;
    try {
      const r = await estado.sesion!.confirmarEquivalencia(id, valor, valor === "descartado" ? motivo : undefined);
      avisos = r.avisos;
      if (r.hecho) {
        elegida = null;
        motivo = "";
      }
    } finally {
      trabajando = false;
    }
  }

  async function dejarAsi() {
    if (!antiguo) return;
    avisos = [];
    await estado.sesion!.dejarAsi(id, antiguo.valor);
  }
</script>

{#if antiguo}
  <div class="warnbox info antiguo" role="status">
    <TriangleAlert class="i" />
    <div>
      <p>La ficha dice «{antiguo.texto}», que no es un estado de la regla 9.</p>
      <p class="nota">
        {#if antiguo.propuesta}Se propone {antiguo.propuesta}.{:else}No hay una equivalencia propuesta: elige una.{/if}
        Nada cambia hasta que lo confirmes.
      </p>
      <Conmutador etiqueta="Pasar la ficha a" {opciones} {valor} alCambiar={(v) => (elegida = v)}>
        {#snippet marca(v: Madurez | "")}{#if v}<MadurezPunto madurez={v} />{/if}{/snippet}
      </Conmutador>
      {#if valor === "descartado"}
        <CampoTexto etiqueta="Por qué se descarta (si quieres)" largo valor={motivo} pista="Para no volver a proponerlo sin saber por qué." alCambiar={(v) => (motivo = v)} />
      {/if}
      {#if porQueNo}<p class="nota">{porQueNo}</p>{/if}
      <div class="botones">
        <button class="btn" onclick={dejarAsi} disabled={trabajando}>Dejarlo así</button>
        <button class="btn pri" onclick={confirmar} disabled={!valor || !!porQueNo || trabajando}>Confirmar</button>
      </div>
    </div>
  </div>
{:else if dejado !== null}
  <p class="nota dejado">
    Dejado así: «{dejado}»
    <button class="enlace" onclick={() => estado.sesion!.quitarDejarAsi(id)}>Quitar</button>
  </p>
{/if}
{#each avisos as aviso (aviso)}
  <div class="warnbox"><TriangleAlert class="i" /><span>{aviso}</span></div>
{/each}

<style>
  .antiguo {
    margin-bottom: 12px;
  }
  .antiguo p {
    margin: 0 0 8px;
  }
  .nota {
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .dejado {
    margin: -4px 0 10px;
  }
  .botones {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .enlace {
    background: none;
    border: 0;
    padding: 0;
    margin-left: 4px;
    color: var(--ink-2);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
</style>
