<script lang="ts">
  import { tick } from "svelte";
  import Lienzo from "./pizarra/Lienzo.svelte";
  import BuscadorTarjeta from "./pizarra/BuscadorTarjeta.svelte";
  import ListaPizarra from "./pizarra/ListaPizarra.svelte";
  import LlevarSala from "./comunes/LlevarSala.svelte";
  import { usarEstado } from "../lib/app/contexto";
  import { sitioLibre } from "../lib/pizarra/geometria";
  import { anuncios } from "../lib/pizarra/lista";
  import { COLORES, MAX_ETIQUETA, type ColorNota } from "../lib/pizarra/tipos";
  import { limpiarIdea } from "../lib/vistas/crear";

  const estado = usarEstado();
  const pz = estado.pizarra;

  let lienzo = $state<ReturnType<typeof Lienzo>>();
  let buscando = $state(false);
  /** «Ver como lista» (RF-12): lo mismo en texto */
  let modo = $state<"lienzo" | "lista">("lienzo");
  let aviso = $state("");
  /** «Pasar a idea» a medias: la nota y el título que se propone */
  let pasando = $state<{ nota: string; titulo: string } | null>(null);
  let campoTitulo = $state<HTMLInputElement>();
  let botonNota = $state<HTMLButtonElement>();

  // Se carga al entrar; si ya estaba cargada no hace nada
  $effect(() => {
    void pz.abrir();
  });

  const decir = (t: string) => (aviso = t);

  const seleccionado = $derived.by(() => {
    void pz.pizarra;
    const id = pz.seleccion;
    if (!id) return null;
    const e = pz.pizarra.elementos.find((x) => x.id === id);
    if (e) return e;
    const f = pz.pizarra.flechas.find((x) => x.id === id);
    return f ?? null;
  });

  const zoom = $derived(Math.round(pz.encuadre.zoom * 100));
  const vacia = $derived(!pz.pizarra.elementos.length && !pz.pizarra.flechas.length);

  function ponerTarjeta(pieza: string): boolean {
    const c = lienzo?.centroVisible() ?? { x: 110, y: 70 };
    const r = pz.anadirTarjeta(pieza, sitioLibre(pz.pizarra, { x: c.x - 110, y: c.y - 70 }));
    if ("error" in r) {
      decir(r.error);
      return false;
    }
    decir(anuncios.tarjetaAnadida());
    return true;
  }

  async function quitar(id: string) {
    const antes = pz.pizarra;
    const que = antes.flechas.some((f) => f.id === id) ? "flecha" : antes.elementos.find((e) => e.id === id)?.tipo;
    const r = await pz.quitar(id);
    if ("error" in r) {
      decir(r.error);
      return;
    }
    decir(`${anuncios.quitado(que ?? "nota", r.flechasQuitadas)} Ctrl Z lo devuelve.`);
    await tick();
    // El botón que se pulsó ya no está: el foco no se pierde en el documento
    if (typeof document !== "undefined" && (!document.activeElement || document.activeElement === document.body)) botonNota?.focus();
  }

  /** En el lienzo cae en el centro de lo que se ve; en la lista, cerca del origen */
  function notaNueva() {
    if (lienzo) return void lienzo.crearNotaAqui();
    const r = pz.crearNota(sitioLibre(pz.pizarra, { x: 0, y: 0 }));
    decir("error" in r ? r.error : anuncios.notaCreada());
  }

  function colorear(id: string, c: ColorNota) {
    pz.colorear(id, c);
    decir(anuncios.coloreada(c));
  }

  function etiquetar(id: string, ev: Event) {
    const campo = ev.currentTarget as HTMLInputElement;
    if (pz.etiquetar(id, campo.value)) decir(`La etiqueta se cortó en ${MAX_ETIQUETA} caracteres`);
    const f = pz.pizarra.flechas.find((x) => x.id === id);
    if (f) {
      campo.value = f.etiqueta;
      decir(anuncios.etiquetada(f.etiqueta));
    }
  }

  function abrirPasar(id: string) {
    const nota = pz.pizarra.elementos.find((x) => x.id === id);
    if (!nota || nota.tipo !== "nota") return;
    const s = estado.sesionSerie;
    const previa = pz.pizarra.elementos.find((e) => e.tipo === "tarjeta" && e.origen === id && s?.modelo.pieza(e.pieza));
    if (previa && previa.tipo === "tarjeta") {
      decir("Esta nota ya tiene su idea: se abre en el panel.");
      estado.elegir(previa.pieza);
      return;
    }
    const primera = nota.texto.split("\n").find((l) => l.trim()) ?? "";
    pasando = { nota: id, titulo: limpiarIdea(primera)?.titulo ?? "" };
    void tick().then(() => campoTitulo?.focus());
  }

  async function pasar() {
    const p = pasando;
    if (!p) return;
    const r = await estado.pasarAIdea(p.nota, p.titulo);
    if ("error" in r) return decir(r.error);
    pasando = null;
    decir(`Idea creada. ${r.donde}.`);
  }

  function teclasPasar(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      pasando = null;
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      void pasar();
    }
  }
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Estructura · pizarra</div>
    <h1 class="t">Pizarra</h1>
    <p class="logline">Notas sueltas y tarjetas de tus piezas, unidas con flechas, para pensar sin ordenar. Se guarda sola.</p>
  </div>
</div>

{#if pz.soloLectura && pz.cargada}
  <p class="nota-lectura" role="status">
    {estado.variante ? "Con una variante abierta la pizarra solo se mira: es de la serie." : "Esta pizarra viene de una versión más nueva de Atelier: solo se mira."}
  </p>
{/if}
{#each pz.avisos as a, i (i + a)}
  <p class="aviso-pz" role="status">{a}</p>
{/each}
{#if pz.error}
  <div class="error-pz" role="alert">
    <span>No se pudo guardar la pizarra: {pz.error}. Lo que ves sigue aquí.</span>
    <button class="btn" onclick={() => pz.reintentar()}>Reintentar</button>
  </div>
{/if}
{#if pz.avisoGuardado}<p class="aviso-pz" role="status">{pz.avisoGuardado}</p>{/if}

<div class="barra" role="toolbar" aria-label="Pizarra">
  <button class="btn pri" bind:this={botonNota} disabled={pz.soloLectura} onclick={notaNueva}>Nota nueva</button>
  <span class="grupo">
    <button class="btn" disabled={pz.soloLectura} aria-expanded={buscando} onclick={() => (buscando = !buscando)}>Añadir tarjeta</button>
    {#if buscando}
      <BuscadorTarjeta alElegir={ponerTarjeta} alCerrar={() => (buscando = false)} />
    {/if}
  </span>
  <button class="btn ghost" disabled={!pz.puedeDeshacer} onclick={() => estado.deshacerActual()}>Deshacer</button>
  <button class="btn ghost" disabled={!pz.puedeRehacer} onclick={() => estado.rehacerActual()}>Rehacer</button>
  <span class="sep"></span>
  {#if modo === "lienzo"}
    <button class="btn ghost" aria-label="Alejar" onclick={() => lienzo?.acercarCentro(1 / 1.25)}>−</button>
    <span class="zoom" aria-label="Zoom">{zoom} %</span>
    <button class="btn ghost" aria-label="Acercar" onclick={() => lienzo?.acercarCentro(1.25)}>+</button>
    <button class="btn ghost" onclick={() => lienzo?.encajarTodo()}>Encajar todo</button>
    <span class="sep"></span>
  {/if}
  <button class="btn ghost" aria-pressed={modo === "lista"} onclick={() => (modo = modo === "lista" ? "lienzo" : "lista")}>
    {modo === "lista" ? "Ver en el lienzo" : "Ver como lista"}
  </button>
</div>

<div class="seleccion" role="toolbar" aria-label="Lo seleccionado">
  {#if seleccionado && !pz.soloLectura}
    {#if "texto" in seleccionado}
      <span class="grupo-colores" role="group" aria-label="Color de la nota">
        {#each COLORES as c (c.id)}
          <button
            class="color"
            style:background="var(--nota-{c.id})"
            aria-label={c.nombre}
            title={c.nombre}
            aria-pressed={seleccionado.color === c.id}
            onclick={() => colorear(seleccionado.id, c.id)}
          ></button>
        {/each}
        <span class="nombre-color">{COLORES.find((c) => c.id === seleccionado.color)?.nombre}</span>
      </span>
      <button class="btn" onclick={() => abrirPasar(seleccionado.id)} disabled={!seleccionado.texto.trim()}>Pasar a idea</button>
      <button class="btn" onclick={() => quitar(seleccionado.id)}>Quitar</button>
    {:else if "pieza" in seleccionado}
      <button class="btn" onclick={() => estado.elegir(seleccionado.pieza)}>Abrir pieza</button>
      <button class="btn" onclick={() => quitar(seleccionado.id)}>Quitar</button>
    {:else}
      <label class="etiqueta-flecha">
        <span>Etiqueta de la flecha</span>
        <input type="text" value={seleccionado.etiqueta} maxlength={MAX_ETIQUETA} onchange={(ev) => etiquetar(seleccionado.id, ev)} />
      </label>
      <button class="btn" onclick={() => quitar(seleccionado.id)}>Quitar flecha</button>
    {/if}
  {/if}
  <!-- Llevar a la sala no escribe nada: también con la pizarra en solo lectura -->
  {#if seleccionado && "pieza" in seleccionado}
    <LlevarSala origen={{ tipo: "pieza", id: seleccionado.pieza }} compacto />
  {/if}
</div>

{#if pasando}
  <div class="pasar" role="group" aria-label="Pasar a idea">
    <label>
      <span>Título de la idea</span>
      <input bind:this={campoTitulo} type="text" bind:value={pasando.titulo} onkeydown={teclasPasar} />
    </label>
    <button class="btn pri" onclick={pasar}>Crear idea</button>
    <button class="btn ghost" onclick={() => (pasando = null)}>Cancelar</button>
  </div>
{/if}

<p class="aviso" role="status" aria-live="polite">{aviso}</p>

{#if pz.errorCarga}
  <div class="error-pz" role="alert">
    <span>No se pudo leer la pizarra: {pz.errorCarga}.</span>
    <button class="btn" onclick={() => void pz.abrir()}>Reintentar</button>
  </div>
{:else if !pz.cargada}
  <p class="vacio">Leyendo la pizarra…</p>
{:else}
  {#if vacia}
    <p class="vacio">Vacía. Pulsa «Nota nueva» o haz doble clic en el lienzo.</p>
  {/if}
  {#if modo === "lienzo"}
    <Lienzo bind:this={lienzo} {decir} {quitar} />
  {:else}
    <ListaPizarra {decir} {quitar} />
  {/if}
{/if}

<style>
  .barra,
  .seleccion,
  .pasar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .seleccion {
    min-height: 38px;
  }
  .grupo {
    position: relative;
  }
  .sep {
    width: 1px;
    height: 20px;
    background: var(--line-2);
    margin: 0 4px;
  }
  .zoom {
    min-width: 48px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .grupo-colores {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .color {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid var(--line-2);
  }
  .color[aria-pressed="true"] {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .nombre-color {
    font-size: 12px;
    color: var(--ink-2);
  }
  .etiqueta-flecha,
  .pasar label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .etiqueta-flecha input,
  .pasar input {
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    padding: 6px 10px;
    min-width: 280px;
  }
  .aviso {
    min-height: 18px;
    margin: 0 0 6px;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .aviso-pz,
  .nota-lectura {
    margin: 0 0 8px;
    padding: 8px 12px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface);
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .error-pz {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 8px;
    padding: 8px 12px;
    border: 1px solid var(--warn);
    border-radius: 8px;
    color: var(--warn);
    font-size: 12.5px;
  }
  .vacio {
    color: var(--ink-3);
    margin: 0 0 8px;
  }
</style>
