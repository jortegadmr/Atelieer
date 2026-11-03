<script lang="ts">
  // Texto visual (spec 018): el texto se ve formateado y se edita sin saber
  // Markdown: botones para negrita, cursiva, título, lista, cita y enlace, y las
  // tablas como formulario. El fichero sigue siendo Markdown. Nada del texto se
  // interpreta como HTML: se pinta con elementos normales.
  import { tick } from "svelte";
  import { aplicar, type Accion } from "../../lib/texto/edicion";
  import { bloques, conCelda, conFilaNueva, partirTrozos, type Inline } from "../../lib/texto/markdown";

  type Props = {
    valor: string;
    /**
     * Guarda un cambio: recibe cómo cambiar el texto que haya EN ESE MOMENTO (así dos cambios seguidos
     * no se pisan). Devuelve si se pudo; si no, se sigue editando para no perder nada.
     */
    alCambiar: (cambio: (actual: string) => string) => Promise<boolean> | boolean;
    soloLectura?: boolean;
    alEnlace?: (nombre: string) => void;
    etiqueta: string;
  };
  let { valor, alCambiar, soloLectura = false, alEnlace, etiqueta }: Props = $props();

  let editando = $state(false);
  let guardando = false;
  let borrador = $state("");
  let aviso = $state("");
  let area = $state<HTMLTextAreaElement>();
  let caja = $state<HTMLDivElement>();

  const trozos = $derived(partirTrozos(valor));
  const vacio = $derived(bloques(valor).length === 0 && !trozos.some((t) => t.tipo === "tabla"));

  async function editar() {
    if (soloLectura || editando) return;
    borrador = valor;
    aviso = "";
    editando = true;
    await tick();
    area?.focus();
    ajustar();
  }

  function ajustar() {
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.max(area.scrollHeight + 4, 90)}px`;
  }

  /** Guarda lo escrito y vuelve a la vista formateada. Si no se puede guardar, se queda editando y lo dice */
  async function terminar() {
    if (!editando || guardando) return;
    if (borrador === valor) {
      void salir();
      return;
    }
    guardando = true;
    try {
      const ok = await alCambiar(() => borrador);
      if (ok !== false) void salir();
      else aviso = "No se pudo guardar. Mira el aviso de la ficha: puede haber cambiado por fuera. Tu texto sigue aquí.";
    } catch (e) {
      aviso = `No se pudo guardar: ${(e as Error).message}`;
    } finally {
      guardando = false;
    }
  }

  /** Vuelve a la vista y deja el foco en el texto, para quien usa teclado */
  async function salir() {
    editando = false;
    aviso = "";
    await tick();
    (caja?.querySelector(".editar, .vacio") as HTMLElement | null)?.focus();
  }

  function alSalir(e: FocusEvent) {
    if (caja && e.relatedTarget instanceof Node && caja.contains(e.relatedTarget)) return;
    void terminar();
  }

  async function boton(a: Accion) {
    if (!area) return;
    const r = aplicar(a, { texto: borrador, ini: area.selectionStart, fin: area.selectionEnd });
    borrador = r.texto;
    await tick();
    area.focus();
    area.setSelectionRange(r.ini, r.fin);
    ajustar();
  }

  const BOTONES: Array<{ a: Accion; nombre: string; etiqueta: string }> = [
    { a: "negrita", nombre: "Negrita", etiqueta: "N" },
    { a: "cursiva", nombre: "Cursiva", etiqueta: "C" },
    { a: "titulo", nombre: "Título", etiqueta: "Título" },
    { a: "lista", nombre: "Lista", etiqueta: "Lista" },
    { a: "cita", nombre: "Cita", etiqueta: "Cita" },
    { a: "enlace", nombre: "Enlace a una ficha", etiqueta: "[[ ]]" },
  ];

  /** Un clic con el ratón en el texto lo edita; con teclado está el botón «Editar» */
  function alClicTexto(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("button, a")) return;
    void editar();
  }

  function ajustarCelda(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }
  function crece(el: HTMLTextAreaElement) {
    ajustarCelda(el);
  }

  /** Número de tabla (entre las tablas del texto) de cada trozo, para ubicarla en el texto que haya al guardar */
  const numeroDeTabla = $derived.by(() => {
    let n = 0;
    return trozos.map((t) => (t.tipo === "tabla" ? n++ : -1));
  });

  async function celda(n: number, f: number, c: number, nuevo: string, antes: string) {
    if (soloLectura || antes === nuevo) return;
    await alCambiar((actual) => conCelda(actual, n, f, c, nuevo));
  }

  async function filaNueva(n: number) {
    await alCambiar((actual) => conFilaNueva(actual, n));
  }
</script>

{#snippet ins(lista: Inline[])}
  {#each lista as x, i (i)}
    {#if x.t === "txt"}{x.s}
    {:else if x.t === "neg"}<strong>{@render ins(x.c)}</strong>
    {:else if x.t === "cur"}<em>{@render ins(x.c)}</em>
    {:else if x.t === "cod"}<code>{x.s}</code>
    {:else if x.t === "pend"}<mark class="pend">[PENDIENTE]</mark>
    {:else if x.t === "enl"}
      {#if alEnlace}<button type="button" class="enl" onclick={() => alEnlace(x.nombre)}>{x.texto}</button>{:else}<span class="enl">{x.texto}</span>{/if}
    {/if}
  {/each}
{/snippet}

<div class="tv" bind:this={caja} onfocusout={alSalir}>
  {#if editando}
    <div class="barra" role="toolbar" aria-label="Formato de {etiqueta}">
      {#each BOTONES as b (b.a)}
        <button type="button" class="bt" class:neg={b.a === "negrita"} class:cur={b.a === "cursiva"} title={b.nombre} aria-label={b.nombre} onmousedown={(e) => e.preventDefault()} onclick={() => boton(b.a)}>{b.etiqueta}</button>
      {/each}
      <button type="button" class="bt listo" onmousedown={(e) => e.preventDefault()} onclick={terminar}>Listo</button>
    </div>
    <textarea
      bind:this={area}
      bind:value={borrador}
      aria-label={etiqueta}
      oninput={ajustar}
      onkeydown={(e) => {
        // Escape sale y guarda (la app guarda sola, como el resto): no se pierde nada
        if (e.key === "Escape") {
          e.preventDefault();
          void terminar();
        }
      }}
    ></textarea>
    {#if aviso}<p class="aviso" role="alert">{aviso}</p>{/if}
  {:else}
    {#each trozos as t, n (n)}
      {#if t.tipo === "tabla"}
        {@const nt = numeroDeTabla[n]!}
        <div class="tabla">
          <table>
            <thead>
              <tr>{#each t.tabla.filas[0]! as c, j (j)}<th scope="col">{c}</th>{/each}</tr>
            </thead>
            <tbody>
              {#each t.tabla.filas.slice(1) as fila, i (i)}
                <tr>
                  {#each fila as c, j (j)}
                    <td><textarea rows="1" class="cel" use:crece aria-label="{t.tabla.filas[0]![j] || 'Columna ' + (j + 1)}, fila {i + 1}" value={c} disabled={soloLectura} onchange={(e) => celda(nt, i + 1, j, e.currentTarget.value, c)} oninput={(e) => ajustarCelda(e.currentTarget)}></textarea></td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
          {#if !soloLectura}<button type="button" class="mas" onclick={() => filaNueva(nt)}>+ Fila</button>{/if}
        </div>
      {:else}
        {@const b = bloques(t.fuente)}
        {#if b.length}
          <!-- Un clic con el ratón edita; el teclado usa el botón «Editar» de abajo -->
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <div class="md" class:editable={!soloLectura} onclick={alClicTexto}>
            {#each b as x, i (i)}
              {#if x.t === "h"}
                {#if x.n === 1}<h3 class="h1">{@render ins(x.c)}</h3>
                {:else if x.n === 2}<h4 class="h2">{@render ins(x.c)}</h4>
                {:else}<h5 class="h3">{@render ins(x.c)}</h5>{/if}
              {:else if x.t === "p"}<p>{@render ins(x.c)}</p>
              {:else if x.t === "ul"}<ul>{#each x.items as it, k (k)}<li>{@render ins(it)}</li>{/each}</ul>
              {:else if x.t === "ol"}<ol>{#each x.items as it, k (k)}<li>{@render ins(it)}</li>{/each}</ol>
              {:else if x.t === "cita"}<blockquote>{@render ins(x.c)}</blockquote>
              {:else}<hr />{/if}
            {/each}
          </div>
        {/if}
      {/if}
    {/each}
    {#if vacio && !soloLectura}
      <button type="button" class="vacio" onclick={editar}>Pulsa para escribir…</button>
    {:else if !soloLectura}
      <button type="button" class="editar" aria-label="Editar {etiqueta}" onclick={editar}>Editar el texto</button>
    {/if}
  {/if}
</div>

<style>
  .tv {
    display: grid;
    gap: 8px;
  }
  .md {
    font: 400 15px/1.55 var(--sans);
    color: var(--ink);
    border-radius: 8px;
    padding: 2px 4px;
  }
  .md.editable {
    cursor: text;
  }
  .md.editable:hover {
    background: var(--surface-2);
  }
  .md :is(p, ul, ol, blockquote, hr) {
    margin: 0 0 10px;
  }
  .md h3,
  .md h4,
  .md h5 {
    margin: 14px 0 6px;
    font-family: var(--serif);
    font-weight: 400;
  }
  .md h3 {
    font-size: 26px;
  }
  .md h4 {
    font-size: 21px;
  }
  .md h5 {
    font-size: 17px;
    color: var(--ink-2);
  }
  blockquote {
    border-left: 3px solid var(--accent);
    padding: 2px 0 2px 12px;
    color: var(--ink-2);
    font-style: italic;
  }
  ul,
  ol {
    padding-left: 22px;
  }
  hr {
    border: 0;
    border-top: 1px solid var(--line-2);
  }
  code {
    font: 13px var(--mono);
    background: var(--surface-2);
    padding: 1px 5px;
    border-radius: 4px;
  }
  .pend {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--accent);
    border-radius: 4px;
    padding: 0 4px;
  }
  .enl {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  span.enl {
    cursor: default;
  }
  .tabla {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    text-align: left;
    font: 500 12px var(--sans);
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 6px;
    border-bottom: 1px solid var(--line-2);
  }
  td {
    padding: 3px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  td .cel {
    resize: none;
    overflow: hidden;
    min-height: 0;
    height: auto;
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    font: inherit;
    padding: 5px 6px;
    border-radius: 6px;
  }
  td .cel:hover {
    background: var(--surface-2);
  }
  td .cel:focus {
    border-color: var(--accent);
    background: var(--surface);
    outline: none;
  }
  .mas,
  .editar,
  .vacio {
    justify-self: start;
    background: none;
    border: 0;
    color: var(--ink-3);
    font: 12.5px var(--sans);
    cursor: pointer;
    padding: 2px 4px;
  }
  .mas:hover,
  .editar:hover,
  .vacio:hover {
    color: var(--ink);
  }
  .vacio {
    font-style: italic;
    font-size: 14px;
  }
  .aviso {
    margin: 0;
    font-size: 12.5px;
    color: var(--warn, #c0504d);
  }
  .barra {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .bt {
    border: 1px solid var(--line-2);
    background: var(--surface);
    color: var(--ink);
    border-radius: 7px;
    padding: 4px 10px;
    font: 500 12.5px var(--sans);
    cursor: pointer;
  }
  .bt:hover {
    background: var(--surface-2);
  }
  .bt.neg {
    font-weight: 800;
  }
  .bt.cur {
    font-style: italic;
  }
  .bt.listo {
    margin-left: auto;
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent, #fff);
  }
  textarea {
    width: 100%;
    min-height: 90px;
    resize: none;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    font: 400 15px/1.55 var(--sans);
    padding: 10px 12px;
    box-sizing: border-box;
  }
  textarea:focus {
    outline: none;
  }
</style>
