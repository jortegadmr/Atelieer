<script lang="ts">
  // Estado de una pieza (spec 001): los seis estados; borrador y canon crean la
  // ficha si falta; canon y descartar se confirman aquí mismo, nunca con
  // ventanas del sistema (RF-32). Lo que no salió bien se dice debajo.
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import type { ResultadoEstado } from "../../lib/app/sesion";
  import { estadoDe, tieneFicha, type ConEstado } from "../../lib/modelo/estados";
  import { ESTADO, etiqueta, type Estado } from "../../lib/modelo/vocabulario";
  import { mayus } from "../../lib/vistas/textos";
  import Madurez from "../comunes/Madurez.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import EstadoAntiguo from "./EstadoAntiguo.svelte";

  const { pieza }: { pieza: ConEstado } = $props();
  const estado = usarEstado();

  const opciones = ESTADO.map((v) => ({ valor: v, texto: mayus(etiqueta(ESTADO, v)) }));
  const actual = $derived(estadoDe(pieza));
  const conFicha = $derived(tieneFicha(pieza.tipo));
  const enlazada = $derived("wiki" in pieza && !!pieza.wiki.trim());

  /** Canon o descartado a la espera de confirmar */
  let pendiente = $state<Estado | null>(null);
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => {
    if (pendiente) return estado.capas.abrir(() => (pendiente = null));
  });
  let motivo = $state("");
  let trabajando = $state(false);
  let resultado = $state<ResultadoEstado | null>(null);
  let otroNombre = $state("");

  function elegir(v: Estado) {
    // Un segundo clic mientras se escribe la ficha no lanza otro cambio
    if (trabajando) return;
    resultado = null;
    if (v === actual) return;
    if (v === "canon" || v === "descartado") {
      pendiente = v;
      motivo = pieza.motivo_descarte;
      return;
    }
    void cambiar(v);
  }

  async function cambiar(v: Estado, nombre?: string) {
    trabajando = true;
    try {
      resultado = await estado.sesion!.cambiarEstado(pieza.id, v, { motivo: v === "descartado" ? motivo : undefined, nombre });
      if (resultado.pasar?.estado === "nombre repetido") otroNombre = `${resultado.pasar.nombre} (${estado.sesion!.modelo.serie.titulo || "serie"})`;
      if (resultado.hecho) pendiente = null;
    } finally {
      trabajando = false;
    }
  }

  // Los avisos del último cambio ya salen en el pie del panel: aquí, solo los demás
  const propios = $derived.by(() => {
    void estado.version;
    const enPie = estado.sesion!.avisosCambio;
    return (resultado?.avisos ?? []).filter((a) => !enPie.includes(a));
  });

  const textoConfirmar = $derived(
    pendiente === "canon"
      ? conFicha
        ? enlazada
          ? "Pasa a canon y su ficha de la wiki también. Después queda bloqueada: cambiarla será un retcon."
          : "Pasa a canon: se crea su ficha en la wiki, ya en canon. Después queda bloqueada: cambiarla será un retcon."
        : "Pasa a canon. Después queda bloqueada: cambiarla será un retcon."
      : enlazada
        ? "Se descarta y su ficha de la wiki también. No se borra nada: se puede recuperar."
        : "Se descarta. No se borra nada: se puede recuperar.",
  );
</script>

<Conmutador etiqueta="Estado" ref="como estado_canon" {opciones} valor={actual} alCambiar={(v: Estado) => elegir(v)}>
  {#snippet marca(v: Estado)}<Madurez madurez={v} />{/snippet}
</Conmutador>

<!-- Junto al estado, para verlo antes de cambiarlo (spec 009, RF-55c) -->
{#if conFicha}<EstadoAntiguo id={pieza.id} />{/if}

{#if conFicha && !enlazada && actual !== "borrador" && actual !== "canon" && !pendiente}
  <p class="nota">Al ponerla en borrador se crea su ficha en la wiki.</p>
{/if}

{#if pendiente}
  <div class="warnbox info confirmar" role="alertdialog" aria-label="Confirmar el cambio de estado">
    <div>
      <p>{textoConfirmar}</p>
      {#if pendiente === "descartado"}
        <CampoTexto etiqueta="Por qué se descarta (si quieres)" largo valor={motivo} pista="Para no volver a proponerlo sin saber por qué." alCambiar={(v) => (motivo = v)} />
      {/if}
      <div class="botones">
        <button class="btn" onclick={() => (pendiente = null)} disabled={trabajando}>Cancelar</button>
        <button class="btn pri" onclick={() => cambiar(pendiente!)} disabled={trabajando}>
          {pendiente === "canon" ? "Pasar a canon" : "Descartar"}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if actual === "descartado" && !pendiente}
  <CampoTexto
    etiqueta="Por qué se descartó"
    ref="D10"
    largo
    valor={pieza.motivo_descarte}
    pista="Para no volver a proponerlo sin saber por qué."
    alCambiar={(v) => estado.sesion!.editar<ConEstado>(pieza.id, (p) => (p.motivo_descarte = v))}
  />
{/if}

{#if resultado?.pasar?.estado === "nombre repetido"}
  <div class="warnbox">
    <TriangleAlert class="i" />
    <span>Ya hay otra nota «{resultado.pasar.nombre}» en el vault ({resultado.pasar.repetidas.join(", ")}). Por la Guía §6, elige otro nombre para la ficha:</span>
  </div>
  <div class="otro">
    <input class="v" bind:value={otroNombre} aria-label="Otro nombre para la ficha" />
    <button class="btn pri" disabled={!otroNombre.trim() || trabajando} onclick={() => cambiar(pendiente ?? "borrador", otroNombre.trim())}>Usar este nombre</button>
  </div>
{/if}

{#each propios as aviso (aviso)}
  <div class="warnbox"><TriangleAlert class="i" /><span>{aviso}</span></div>
{/each}

<style>
  .nota {
    margin: -4px 0 10px;
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .confirmar {
    margin-bottom: 12px;
  }
  .confirmar p {
    margin: 0 0 10px;
  }
  .botones {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .otro {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }
  .otro input {
    flex: 1;
  }
</style>
