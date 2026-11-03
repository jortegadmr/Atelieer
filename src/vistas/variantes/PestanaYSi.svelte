<script lang="ts">
  // La pestaña «¿Y si…?» (spec 006, RF-19 a RF-23): lo que distingue «Cómo
  // quedaría» de «Ahora». Todo como texto; las acciones, con teclado.
  import { tick } from "svelte";
  import Columns2 from "@lucide/svelte/icons/columns-2";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Undo2 from "@lucide/svelte/icons/undo-2";
  import Download from "@lucide/svelte/icons/download";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Aviso } from "../../lib/comprobaciones";
  import * as c from "../../lib/modelo/consultas";
  import { frasesChoque } from "../../lib/variantes/choques";
  import type { Quitar } from "../../lib/variantes/quitar";
  import type { Choque } from "../../lib/variantes/tipos";

  const estado = usarEstado();

  /** Más de esto por grupo: «y N más» (como la spec 005, RF-10) */
  const CORTE = 20;

  const d = $derived.by(() => {
    void estado.version;
    return estado.variante?.diferencias() ?? null;
  });
  const choques = $derived.by(() => {
    void estado.version;
    return estado.variante?.choques() ?? [];
  });
  const claveChoque = (ch: Choque) => (ch.clase === "sitio" ? `sitio|${ch.contenedor}` : ch.clase === "referencia" ? `ref|${ch.id}|${ch.apunta}` : `pieza|${ch.id}`);
  const piezaDeChoque = (ch: Choque) => (ch.clase === "sitio" ? null : ch.id);

  /** Código y título de una pieza en «Cómo quedaría» (o en la serie, si ya no está) */
  function nombre(id: string): string {
    const v = estado.variante;
    const m = v?.modelo.pieza(id) ? v.modelo : estado.sesionSerie?.modelo;
    const p = m?.pieza(id);
    if (!m || !p) return "Ya no está";
    const t = ("titulo" in p && p.titulo.trim()) || "Sin título";
    const codigo = c.codigo(m, id);
    return codigo ? `${codigo} · ${t}` : t;
  }

  // «Quitar de la variante» (RF-24, RF-24b): si arrastra otras, se confirma antes
  let quitando = $state<({ id: string } & Quitar) | null>(null);
  $effect(() => {
    if (quitando) return estado.capas.abrir(() => (quitando = null));
  });
  function pedirQuitar(id: string) {
    const v = estado.variante;
    if (!v) return;
    const q = v.quitar(id);
    if (q.otras.length) quitando = { id, ...q };
    else void v.quitarYa(q.ids, q.recortes);
  }
  function confirmarQuitar() {
    const q = quitando;
    quitando = null;
    if (q) void estado.variante?.quitarYa(q.ids, q.recortes);
  }

  let desplegados = $state(new Set<string>());
  const corte = <T,>(grupo: string, l: T[]) => (desplegados.has(grupo) ? l : l.slice(0, CORTE));
  let lista: HTMLElement | undefined = $state();
  function desplegar(grupo: string) {
    desplegados = new Set([...desplegados, grupo]);
    queueMicrotask(() => lista?.querySelector<HTMLElement>(`[data-grupo="${grupo}"] [data-entrada="${CORTE}"]`)?.focus());
  }

  function conClave<T extends { aviso: Aviso }>(l: T[]): (T & { clave: string })[] {
    const vistos = new Map<string, number>();
    return l.map((x) => {
      const base = `${x.aviso.pieza}|${x.aviso.id}|${x.aviso.sobre ?? ""}`;
      const n = (vistos.get(base) ?? 0) + 1;
      vistos.set(base, n);
      return { ...x, clave: n > 1 ? `${base}#${n}` : base };
    });
  }

  // La lista se pone al día sin mover el foco; si la entrada que lo tenía desaparece,
  // pasa a la siguiente, al título del grupo o al de la pestaña (como la spec 005, RF-11, RF-12)
  let recuerdo: { clave: string; siguiente: string | null; grupo: string } | null = null;
  $effect.pre(() => {
    void d;
    const activo = document.activeElement;
    const entrada = activo instanceof HTMLElement && lista?.contains(activo) ? activo.closest<HTMLElement>("[data-clave]") : null;
    if (!entrada) return void (recuerdo = null);
    const sig = entrada.nextElementSibling instanceof HTMLElement ? (entrada.nextElementSibling.dataset.clave ?? null) : null;
    recuerdo = { clave: entrada.dataset.clave!, siguiente: sig, grupo: entrada.closest<HTMLElement>("[data-grupo]")?.dataset.grupo ?? "" };
  });
  $effect(() => {
    void d;
    const r = recuerdo;
    if (!r || !lista) return;
    void tick().then(() => {
      const activo = document.activeElement;
      if (activo && activo !== document.body && activo.isConnected) return;
      const sel = (x: string) => lista?.querySelector<HTMLElement>(`[data-clave="${CSS.escape(x)}"]`);
      const destino =
        (r.siguiente && sel(r.siguiente)) ||
        (r.grupo && lista?.querySelector<HTMLElement>(`[data-grupo="${r.grupo}"] h3`)) ||
        lista?.closest(".insp")?.querySelector<HTMLElement>('.tabs [aria-selected="true"]');
      destino?.focus();
    });
  });
</script>

{#snippet mas(grupo: string, total: number)}
  {#if total > CORTE && !desplegados.has(grupo)}
    <li><button class="enlace mas" onclick={() => desplegar(grupo)}>y {total - CORTE} más</button></li>
  {/if}
{/snippet}

<div class="ib-body efectos" bind:this={lista}>
  {#if choques.length}
    <section data-grupo="choques">
      <h3 tabindex="-1">Choques</h3>
      <p class="leyenda">La serie cambió después algo que la variante también toca. Mientras haya choques no se puede aplicar.</p>
      <ul>
        {#each corte("choques", choques) as ch, i (claveChoque(ch))}
          <li class="entrada" tabindex="-1" data-entrada={i} data-clave={claveChoque(ch)}>
            <div class="warnbox">
              <TriangleAlert class="i" /><span class="solo-lector">Choque:</span>
              <div>
                <p class="de">{nombre(ch.clase === "sitio" ? ch.contenedor : ch.id)}</p>
                <ul class="frases">
                  {#each frasesChoque(ch, nombre) as f, j (j)}<li>{f}</li>{/each}
                </ul>
                <p class="acciones">
                  {#if piezaDeChoque(ch)}
                    <button class="enlace" onclick={() => estado.verLadoALado(piezaDeChoque(ch)!)}><Columns2 class="i" />Lado a lado</button>
                  {/if}
                  {#if estado.variante?.sePuedeTraer(ch)}
                    <button class="enlace" onclick={() => estado.variante?.traer(ch)}><Download class="i" />Traer lo de ahora</button>
                  {:else if piezaDeChoque(ch) && estado.variante?.datos.piezas.has(piezaDeChoque(ch)!)}
                    <button class="enlace" onclick={() => pedirQuitar(piezaDeChoque(ch)!)}><Undo2 class="i" />Quitar de la variante</button>
                    <span class="nota">O edita la variante para que no lo use.</span>
                  {/if}
                </p>
              </div>
            </div>
          </li>
        {/each}
        {@render mas("choques", choques.length)}
      </ul>
    </section>
  {/if}
  {#if !d || (!d.total && !d.dejan.length)}
    <p class="nada">La variante no cambia nada todavía.</p>
  {:else}
    <p class="leyenda">Cada cambio dice cómo está ahora → cómo quedaría.</p>

    {#if d.avisos.length}
      <section data-grupo="avisos">
        <h3 tabindex="-1">Avisos que saltarían</h3>
        <ul>
          {#each corte("avisos", conClave(d.avisos)) as x, i (x.clave)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={x.clave}>
              <div class="warnbox" class:info={x.aviso.clase === "sugerencia"}>
                {#if x.aviso.clase === "sugerencia"}<Lightbulb class="i" /><span class="solo-lector">Sugerencia:</span>
                {:else}<TriangleAlert class="i" /><span class="solo-lector">Aviso:</span>{/if}
                <div>
                  <p class="de">{nombre(x.aviso.pieza)}</p>
                  <p>{x.aviso.mensaje} <b>{x.aviso.fuente}</b></p>
                  {#if x.reglas.length}
                    <p class="reglas">
                      {#each x.reglas as r, j (r.id)}<span class="regla"><b>{r.id}</b> {r.texto}</span>{#if j < x.reglas.length - 1}<br />{/if}{/each}
                    </p>
                  {/if}
                  <p class="acciones">
                    <button class="enlace" onclick={() => estado.verLadoALado(x.aviso.pieza)}>Lado a lado</button>
                    <button class="enlace" onclick={() => estado.sesion!.loSe(x.aviso, true)}>
                      Lo sé{#if x.reglas.length > 1}&nbsp;· también {x.reglas.slice(1).map((r) => r.id).join(", ")}{/if}
                    </button>
                  </p>
                </div>
              </div>
            </li>
          {/each}
          {@render mas("avisos", d.avisos.length)}
        </ul>
      </section>
    {/if}

    {#if d.piezas.length}
      <section data-grupo="piezas">
        <h3 tabindex="-1">Lo que cambia la variante</h3>
        <ul>
          {#each corte("piezas", d.piezas) as p, i (p.id)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={p.id}>
              <p class="de">
                {p.codigo ? `${p.codigo} · ${p.titulo}` : p.titulo}
                {#if !p.deLaVariante}<span class="afectada">afectada</span>{/if}
              </p>
              <ul class="frases">
                {#each p.frases as f, j (j)}<li>{f}</li>{/each}
                {#each p.campos as f, j (`c${j}`)}<li>{f}</li>{/each}
                {#each p.pisa as f, j (`p${j}`)}<li class="pisa">{f}</li>{/each}
              </ul>
              <p class="acciones">
                <button class="enlace" onclick={() => estado.verLadoALado(p.id)}><Columns2 class="i" />Lado a lado</button>
                {#if p.deLaVariante}<button class="enlace" onclick={() => pedirQuitar(p.id)}><Undo2 class="i" />Quitar de la variante</button>{/if}
              </p>
              {#if quitando?.id === p.id}
                <div class="warnbox" role="alertdialog" aria-label="Confirmar quitar de la variante">
                  <div>
                    <p>Para que la variante siga entera, también se quitan: {quitando.otras.map(nombre).join(", ")}.</p>
                    <p class="acciones">
                      <button class="btn ghost" onclick={() => (quitando = null)}>Cancelar</button>
                      <button class="btn pri" onclick={confirmarQuitar}>Quitar {quitando.ids.length}</button>
                    </p>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
          {@render mas("piezas", d.piezas.length)}
        </ul>
      </section>
    {/if}

    {#if d.dejan.length}
      <section data-grupo="dejan">
        <h3 tabindex="-1">Dejarían de avisar</h3>
        <ul>
          {#each corte("dejan", conClave(d.dejan.map((aviso) => ({ aviso })))) as x, i (x.clave)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={x.clave}>
              <p class="de">{nombre(x.aviso.pieza)}</p>
              <p class="tachado">{x.aviso.mensaje}</p>
            </li>
          {/each}
          {@render mas("dejan", d.dejan.length)}
        </ul>
      </section>
    {/if}
  {/if}
</div>

<style>
  .efectos {
    gap: 18px;
  }
  .nada {
    color: var(--ink-3);
    font-style: italic;
    margin: 0;
  }
  .leyenda {
    color: var(--ink-3);
    font-size: 12px;
  }
  section h3 {
    font: 500 11px/1.4 var(--sans);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin: 0 0 8px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .entrada {
    font-size: 13px;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .entrada:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 6px;
  }
  p {
    margin: 0;
  }
  .de {
    font-weight: 500;
  }
  .afectada {
    margin-left: 6px;
    font-weight: 400;
    font-size: 11px;
    color: var(--ink-3);
  }
  .reglas {
    margin-top: 4px;
    color: var(--ink-2);
    font-size: 12px;
  }
  .acciones {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: baseline;
  }
  .frases {
    gap: 2px;
    color: var(--ink-2);
  }
  .pisa {
    color: var(--warn);
  }
  .nota {
    color: var(--ink-3);
    font-size: 11.5px;
  }
  .tachado {
    color: var(--ink-2);
  }
  .enlace {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ink-2);
    font-size: 11.5px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .enlace:hover {
    color: var(--ink);
  }
  .enlace :global(.i) {
    width: 12px;
    height: 12px;
  }
  .mas {
    font-size: 12px;
  }
</style>
