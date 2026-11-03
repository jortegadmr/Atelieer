<script lang="ts">
  // La barra de la variante abierta (spec 006, RF-7): su nombre (se cambia
  // pinchándolo, RF-2b), qué se ve, «Ver ahora», «Aparcar variante»,
  // «Descartar variante» (con su porqué, RF-41) y «Aplicar» (la confirmación
  // sale en el pie, RF-32). Sin
  // variante abierta, solo el último aviso de las variantes, si lo hay.
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import X from "@lucide/svelte/icons/x";
  import { tick } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import ConfirmarAplicar from "./ConfirmarAplicar.svelte";

  const estado = usarEstado();

  let editando = $state(false);
  let campo = $state<HTMLInputElement>();
  let recorte = $state<string | null>(null);
  let descartando = $state(false);
  let porque = $state<HTMLTextAreaElement>();

  const nombre = $derived.by(() => {
    void estado.version;
    return estado.variante?.datos.nombre ?? "";
  });

  // Choques con la serie (RF-29): con su icono, lleva a la pestaña «¿Y si…?»
  const nChoques = $derived.by(() => {
    void estado.version;
    return estado.variante?.choques().length ?? 0;
  });

  // Sin diferencias no se ofrece «Aplicar» (RF-35)
  const cambia = $derived.by(() => {
    void estado.version;
    return (estado.variante?.diferencias().enVariante ?? 0) > 0;
  });

  async function editar() {
    editando = true;
    recorte = null;
    await tick();
    campo?.select();
  }

  function guardar() {
    if (!editando) return;
    editando = false;
    // Vacío: vuelve el nombre de antes (RF-2b)
    if (campo) recorte = estado.renombrarVariante(campo.value);
  }

  async function pedirDescartar() {
    estado.cancelarAplicar();
    descartando = true;
    await tick();
    porque?.focus();
  }

  function teclasDescartar(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      descartando = false;
    }
  }

  async function descartar() {
    const texto = porque?.value ?? "";
    descartando = false;
    await estado.descartarVariante(texto);
  }

  function teclas(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      guardar();
    } else if (e.key === "Escape") {
      e.preventDefault();
      editando = false;
    }
  }
</script>

{#if estado.variante}
  <div class="ysibar" role="region" aria-label="Variante «¿Y si…?» abierta">
    <FlaskConical class="i" /><b>¿Y si…?</b>
    {#if editando}
      <input class="nombre" bind:this={campo} value={nombre} aria-label="Nombre de la variante" onkeydown={teclas} onblur={guardar} />
    {:else}
      <button class="pill" title="{nombre} · pincha para cambiar el nombre" onclick={editar}>{nombre}</button>
    {/if}
    {#if nChoques}
      <button
        class="pill warn"
        aria-label="{nChoques} {nChoques === 1 ? 'choque' : 'choques'} con la serie: míralos en la pestaña «¿Y si…?»"
        title="La serie cambió algo que la variante también toca: míralo en la pestaña «¿Y si…?»"
        onclick={() => (estado.pestana = "ysi")}
      >
        <TriangleAlert class="i" />{nChoques} {nChoques === 1 ? "choque" : "choques"}
      </button>
    {/if}
    <span class="frase">
      {#if estado.viendoAhora}
        Ves la serie de ahora, sin la variante.
      {:else}
        Ves cómo quedaría. Nada toca la serie hasta que pulses «Aplicar».
      {/if}
    </span>
    <div class="sp">
      <button class="btn ghost" aria-pressed={estado.viendoAhora} disabled={estado.operando} onclick={() => estado.verAhora(!estado.viendoAhora)}>
        {estado.viendoAhora ? "Ver cómo quedaría" : "Ver ahora"}
      </button>
      <button class="btn" disabled={estado.operando} onclick={() => estado.aparcar()}>Aparcar variante</button>
      <button class="btn" aria-expanded={descartando} disabled={estado.operando} onclick={pedirDescartar}>Descartar variante</button>
      <button
        class="btn pri"
        disabled={!cambia || estado.operando}
        title={cambia ? "Pasa la variante a la serie, con confirmación" : "No cambia nada"}
        onclick={() => estado.variante && ((descartando = false), estado.pedirAplicar(estado.variante.datos.id, "barra"))}>Aplicar</button
      >
    </div>
    {#if descartando}
      <div class="warnbox descartar" role="alertdialog" tabindex="-1" aria-label="Descartar «{nombre}»" onkeydown={teclasDescartar}>
        <TriangleAlert class="i" />
        <div>
          <p>Descartar «{nombre}»: se cierra y queda en «Aplicadas y descartadas». No se borra nada y se puede recuperar.</p>
          <textarea bind:this={porque} rows="2" maxlength="500" placeholder="Por qué (opcional)" aria-label="Por qué la descartas (opcional)"></textarea>
          <div class="botones">
            <button class="btn ghost" onclick={() => (descartando = false)}>Cancelar</button>
            <button class="btn pri" onclick={descartar}>Descartar</button>
          </div>
        </div>
      </div>
    {/if}
    <ConfirmarAplicar id={estado.variante.datos.id} donde="barra" />
    {#if recorte || estado.avisoVariante}
      <p class="aviso" role="status">
        <span>{recorte ?? estado.avisoVariante}</span>
        <button class="ib" aria-label="Cerrar el aviso" title="Cerrar el aviso" onclick={() => ((recorte = null), (estado.avisoVariante = null))}><X class="i" /></button>
      </p>
    {/if}
  </div>
{:else if estado.avisoVariante}
  <p class="ysi-aviso" role="status">
    <FlaskConical class="i" /><span>{estado.avisoVariante}</span>
    <button class="ib" aria-label="Cerrar el aviso" title="Cerrar el aviso" onclick={() => (estado.avisoVariante = null)}><X class="i" /></button>
  </p>
{/if}

<style>
  .pill {
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: text;
  }
  .pill:hover {
    border-color: var(--accent);
  }
  .nombre {
    width: 320px;
    padding: 3px 10px;
    border: 1px solid var(--accent);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
  }
  .aviso {
    flex-basis: 100%;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-2);
  }
  .descartar {
    flex-basis: 100%;
  }
  .descartar p {
    margin: 0 0 6px;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    resize: vertical;
  }
  .botones {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 6px;
  }
  .ysi-aviso {
    margin: 0;
  }
  .ib {
    width: 24px;
    height: 24px;
  }
</style>
