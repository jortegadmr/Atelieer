<script lang="ts">
  // «Si lo dejas así…» (spec 005, RF-4 a RF-17): lo que cambia si la pieza se
  // queda como está, desde que se abrió. Todo como texto; las acciones, con teclado.
  import { tick } from "svelte";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Aviso } from "../../lib/comprobaciones";
  import * as c from "../../lib/modelo/consultas";

  const estado = usarEstado();

  /** Más de esto por grupo: «y N más» (RF-10) */
  const CORTE = 20;

  const e = $derived.by(() => {
    void estado.version;
    return estado.sesion!.efectos();
  });

  /** Código y título de otra pieza, como en la lista */
  function nombre(id: string): string {
    const m = estado.sesion!.modelo;
    const p = m.pieza(id);
    if (!p) return "Ya no está";
    const t = ("titulo" in p && p.titulo.trim()) || "Sin título";
    const codigo = c.codigo(m, id);
    return codigo ? `${codigo} · ${t}` : t;
  }

  // «y N más»: los grupos desplegados
  let desplegados = $state(new Set<string>());
  const corte = <T,>(grupo: string, l: T[]) => (desplegados.has(grupo) ? l : l.slice(0, CORTE));
  let lista: HTMLElement | undefined = $state();
  function desplegar(grupo: string) {
    desplegados = new Set([...desplegados, grupo]);
    // El foco, en la entrada 21 (RF-10)
    queueMicrotask(() => lista?.querySelector<HTMLElement>(`[data-grupo="${grupo}"] [data-entrada="${CORTE}"]`)?.focus());
  }

  const loSe = (a: Aviso) => estado.sesion!.loSe(a, true);
  /** Frases con clave única: la frase, y su número si se repite */
  function frasesConClave(l: string[]): { f: string; clave: string }[] {
    const vistos = new Map<string, number>();
    return l.map((f) => {
      const n = (vistos.get(f) ?? 0) + 1;
      vistos.set(f, n);
      return { f, clave: n > 1 ? `${f}#${n}` : f };
    });
  }

  /** Claves estables (no cambian al quitar otra entrada); los avisos repetidos, con su número */
  function conClave<T extends { aviso: Aviso }>(l: T[]): (T & { clave: string })[] {
    const vistos = new Map<string, number>();
    return l.map((x) => {
      const base = `${x.aviso.pieza}|${x.aviso.id}|${x.aviso.sobre ?? ""}`;
      const n = (vistos.get(base) ?? 0) + 1;
      vistos.set(base, n);
      return { ...x, clave: n > 1 ? `${base}#${n}` : base };
    });
  }

  // RF-11, RF-12: la lista se pone al día sin mover el foco; si la entrada que lo
  // tenía desaparece, pasa a la siguiente, al título del grupo o al de la pestaña
  let recuerdo: { clave: string; siguiente: string | null; grupo: string } | null = null;
  $effect.pre(() => {
    void e;
    const activo = document.activeElement;
    const entrada = activo instanceof HTMLElement && lista?.contains(activo) ? activo.closest<HTMLElement>("[data-clave]") : null;
    if (!entrada) return void (recuerdo = activo instanceof HTMLElement && activo.closest(".volver") ? { clave: "volver", siguiente: null, grupo: "" } : null);
    const sig = entrada.nextElementSibling instanceof HTMLElement ? entrada.nextElementSibling.dataset.clave ?? null : null;
    recuerdo = { clave: entrada.dataset.clave!, siguiente: sig, grupo: entrada.closest<HTMLElement>("[data-grupo]")?.dataset.grupo ?? "" };
  });
  $effect(() => {
    void e;
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
  const DE_FUERA = { fuera: "Cambió fuera de Atelier", "canon-wiki": "Pasó a canon desde la wiki" } as const;
</script>

{#snippet mas(grupo: string, total: number)}
  {#if total > CORTE && !desplegados.has(grupo)}
    <li><button class="enlace mas" onclick={() => desplegar(grupo)}>y {total - CORTE} más</button></li>
  {/if}
{/snippet}

<div class="ib-body efectos" bind:this={lista}>
  {#if !e}
    <p class="nada">Nada ha cambiado desde que abriste la pieza.</p>
  {:else}
    {#if e.puedeVolver}
      <div class="volver">
        <button class="btn" disabled={estado.volviendo} onclick={() => estado.volverAComoEstaba()}><RotateCcw class="i" />Volver a como estaba</button>
      </div>
    {/if}
    {#if !e.total && !e.yaNoAvisan.length}
      <p class="nada">Nada ha cambiado desde que abriste la pieza.</p>
    {/if}

    {#if e.avisosNuevos.length}
      <section data-grupo="avisos">
        <h3 tabindex="-1">Avisos nuevos</h3>
        <ul>
          {#each corte("avisos", conClave(e.avisosNuevos)) as x, i (x.clave)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={x.clave}>
              <div class="warnbox" class:info={x.aviso.clase === "sugerencia"}>
                {#if x.aviso.clase === "sugerencia"}<Lightbulb class="i" /><span class="solo-lector">Sugerencia:</span>
                {:else}<TriangleAlert class="i" /><span class="solo-lector">Aviso:</span>{/if}
                <div>
                  {#if x.deOtra}<p class="de">{nombre(x.aviso.pieza)}</p>{/if}
                  <p>{x.aviso.mensaje} <b>{x.aviso.fuente}</b></p>
                  {#if x.reglas.length}
                    <p class="reglas">
                      {#each x.reglas as r, j (r.id)}<span class="regla"><b>{r.id}</b> {r.texto}</span>{#if j < x.reglas.length - 1}<br />{/if}{/each}
                    </p>
                  {/if}
                  <p class="acciones">
                    {#if x.campo}<button class="enlace" onclick={() => estado.irAlCampo(x.aviso.pieza, x.campo!)}>Ir al campo</button>{/if}
                    {#if x.deOtra}
                      <button class="enlace" onclick={() => estado.irAPieza(x.aviso.pieza)}>Ir a la pieza</button>
                      <span class="nota">La comparación empezará de cero</span>
                    {/if}
                    <button class="enlace" onclick={() => loSe(x.aviso)}>
                      Lo sé{#if x.reglas.length > 1}&nbsp;· también {x.reglas.slice(1).map((r) => r.id).join(", ")}{/if}
                    </button>
                  </p>
                </div>
              </div>
            </li>
          {/each}
          {@render mas("avisos", e.avisosNuevos.length)}
        </ul>
      </section>
    {/if}

    {#if e.afectadas.length}
      <section data-grupo="afectadas">
        <h3 tabindex="-1">Otras piezas afectadas</h3>
        <ul>
          {#each corte("afectadas", e.afectadas) as a, i (a.id)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={a.id}>
              <p class="de">{a.codigo ? `${a.codigo} · ${a.titulo}` : a.titulo}</p>
              {#if a.deFuera}<p class="fuera">{DE_FUERA[a.deFuera]}</p>{/if}
              <ul class="frases">
                {#each a.frases as f, j (j)}<li>{f}</li>{/each}
              </ul>
              {#if !a.borrada}
                <p class="acciones">
                  <button class="enlace" onclick={() => estado.irAPieza(a.id)}>Ir a la pieza</button>
                  <span class="nota">La comparación empezará de cero</span>
                </p>
              {/if}
            </li>
          {/each}
          {@render mas("afectadas", e.afectadas.length)}
        </ul>
      </section>
    {/if}

    {#if e.cambios.length || e.abiertaDeFuera}
      <section data-grupo="cambios">
        <h3 tabindex="-1">Lo que has cambiado en esta pieza</h3>
        {#if e.abiertaDeFuera}<p class="fuera">{DE_FUERA[e.abiertaDeFuera]}</p>{/if}
        <ul>
          {#each corte("cambios", frasesConClave(e.cambios)) as x, i (x.clave)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={x.clave}>{x.f}</li>
          {/each}
          {@render mas("cambios", e.cambios.length)}
        </ul>
      </section>
    {/if}

    {#if e.yaNoAvisan.length}
      <section data-grupo="dejan">
        <h3 tabindex="-1">Ya no avisan</h3>
        <ul>
          {#each corte("dejan", conClave(e.yaNoAvisan)) as x, i (x.clave)}
            <li class="entrada" tabindex="-1" data-entrada={i} data-clave={x.clave}>
              {#if x.deOtra}<p class="de">{nombre(x.aviso.pieza)}</p>{/if}
              <p class="tachado">{x.aviso.mensaje}</p>
            </li>
          {/each}
          {@render mas("dejan", e.yaNoAvisan.length)}
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
  .volver {
    display: flex;
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
  .nota {
    color: var(--ink-3);
    font-size: 11.5px;
  }
  .frases {
    gap: 2px;
    color: var(--ink-2);
  }
  .fuera {
    color: var(--warn);
    font-size: 12px;
  }
  .tachado {
    color: var(--ink-2);
  }
  .enlace {
    color: var(--ink-2);
    font-size: 11.5px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .enlace:hover {
    color: var(--ink);
  }
  .mas {
    font-size: 12px;
  }
</style>
