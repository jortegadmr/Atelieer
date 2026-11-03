<script lang="ts">
  // Causa y efecto (spec 011, RF-15 a RF-25): las cadenas de la temporada, de
  // cada inicio hacia lo que provoca, con los enlaces de fuera como referencia y
  // las escenas sueltas aparte. Clic abre la escena en el panel, en «Editar».
  import { usarEstado } from "../../lib/app/contexto";
  import { cadenas, type NodoCadena } from "../../lib/vistas/causas";
  import { dondeSeEmite } from "../../lib/vistas/historia";

  const { temporada }: { temporada: string } = $props();
  const estado = usarEstado();

  /** Un nodo con los que provoca debajo, para las listas anidadas */
  interface Rama {
    n: NodoCadena;
    hijos: Rama[];
  }

  // Las cadenas llegan en preorden con su nivel: se rehacen como árbol
  function arbol(cadena: NodoCadena[]): Rama[] {
    const raiz: Rama[] = [];
    const pila: Rama[] = [];
    for (const n of cadena) {
      const r = { n, hijos: [] };
      pila.length = n.nivel;
      (n.nivel ? pila[n.nivel - 1].hijos : raiz).push(r);
      pila.push(r);
    }
    return raiz;
  }

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const r = cadenas(m, temporada);
    const ev = (id: string) => m.eventos.get(id)!;
    return {
      ramas: r.cadenas.map(arbol),
      sueltas: r.sueltas,
      titulo: (id: string) => ev(id).titulo.trim() || "Sin título",
      donde: (id: string) => dondeSeEmite(m, ev(id)),
    };
  });

  // RF-24: con lente, cada escena no relacionada
  const fuera = (id: string) => !!estado.relacionLente && !estado.relacionLente.escenas.has(id);
  const abrir = (id: string) => estado.elegir(id, "editar");

  // «ver arriba» pasa el foco a la primera vez que sale la escena (RF-18), sin
  // ids en el documento: los de las escenas pueden venir de nombres de fichero
  const primeras = new Map<string, HTMLElement>();
  function primera(nodo: HTMLElement, id: string) {
    primeras.set(id, nodo);
    const quitar = () => {
      if (primeras.get(id) === nodo) primeras.delete(id);
    };
    return {
      // La fila se reutiliza con otra escena cuando cambia la cadena
      update(nuevo: string) {
        quitar();
        id = nuevo;
        primeras.set(id, nodo);
      },
      destroy: quitar,
    };
  }
  function verArriba(id: string) {
    const nodo = primeras.get(id);
    nodo?.scrollIntoView({ block: "nearest" });
    nodo?.focus();
  }

  const conMarcas = (texto: string, marcas: string[]) => (marcas.length ? `${texto} (${marcas.join(", ")})` : texto);
</script>

{#snippet escena(id: string, marcas: string[])}
  {@const f = fuera(id)}
  <button class="enlace-escena" class:fuera-lente={f} title="Abrir en el panel" onclick={() => abrir(id)}>
    {d.titulo(id)}{#if f}<span class="solo-lector">, fuera de la lente</span>{/if}
  </button>
  <span class="donde">{d.donde(id)}</span>
  {#each marcas as mk (mk)}<span class="marca">{mk}</span>{/each}
{/snippet}

{#snippet ramas(lista: Rama[])}
  <ul>
    {#each lista as r, i (i)}
      <li>
        {#if r.n.verArriba}
          <div class="fila">
            {@render escena(r.n.id, r.n.marcas)}
            <button class="ver-arriba" onclick={() => verArriba(r.n.id)}>ver arriba</button>
          </div>
        {:else}
          <div class="fila" tabindex="-1" use:primera={r.n.id}>
            {@render escena(r.n.id, r.n.marcas)}
            {#each r.n.fuera as x (x.sentido + x.id)}
              <span class="ref" class:fuera-lente={fuera(x.id)}>{conMarcas(`${x.sentido === "viene" ? "viene de" : "provoca"} ${x.donde}`, x.marcas)}</span>
            {/each}
          </div>
          {#if r.hijos.length}{@render ramas(r.hijos)}{/if}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if !d.ramas.length}
  <p class="hint">Aún no hay causas en esta temporada</p>
  <p class="nota">Se apuntan en «Viene de», en el panel de cada escena.</p>
{:else}
  <div class="causas">
    {#each d.ramas as cadena, i (i)}
      <section class="cadena" aria-label="Cadena {i + 1}">
        {@render ramas(cadena)}
      </section>
    {/each}
    {#if d.sueltas.length}
      <section class="sueltas">
        <h2>Sin causa ni efecto</h2>
        <ul>
          {#each d.sueltas as id (id)}
            <li><div class="fila">{@render escena(id, [])}</div></li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}

<style>
  .causas {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 760px;
  }
  .cadena {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px 10px;
    background: var(--surface);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  /* Lo que provoca, sangrado debajo (RF-17) */
  li li {
    padding-left: 18px;
    border-left: 1px solid var(--line);
    margin-left: 8px;
  }
  .fila {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
    padding: 3px 0;
    border-radius: 6px;
    min-width: 0;
  }
  .fila:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .enlace-escena {
    padding: 2px 6px;
    margin-left: -6px;
    border-radius: 6px;
    text-align: left;
    font-size: 13px;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .enlace-escena:hover {
    background: var(--hover);
  }
  .donde,
  .ref {
    font: 10.5px var(--mono);
    color: var(--ink-3);
  }
  .ref {
    color: var(--ink-2);
  }
  .marca {
    font-size: 11px;
    color: var(--warn);
  }
  .ver-arriba {
    font-size: 11.5px;
    color: var(--ink-3);
    text-decoration: underline;
    padding: 0 4px;
  }
  .ver-arriba:hover {
    color: var(--ink);
  }
  /* Lo de fuera de la lente, sin color propio (spec 010, RF-4) */
  .enlace-escena.fuera-lente,
  .ref.fuera-lente {
    color: var(--ink-3);
  }
  .sueltas h2 {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-3);
    margin: 4px 0 6px;
  }
  .nota {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--ink-3);
  }
</style>
