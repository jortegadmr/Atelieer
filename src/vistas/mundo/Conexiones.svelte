<script lang="ts">
  // El mapa de conexiones (spec 017): personajes y grupos como puntos, las
  // relaciones de sus fichas como líneas, con filtro por tipo. Solo se lee;
  // las relaciones se escriben en la ficha. Un clic en un punto abre su ficha.
  import { usarEstado } from "../../lib/app/contexto";
  import { CLASES_CONEXION, colocarEnCirculo, filtrarGrafo, type ClaseConexion } from "../../lib/wiki/conexiones";

  const estado = usarEstado();
  const m = estado.mundo;

  let activas = $state(new Set<ClaseConexion>(CLASES_CONEXION.map((c) => c.id)));
  function alternar(id: ClaseConexion) {
    const n = new Set(activas);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    activas = n;
  }

  const g = $derived(m.grafo ? filtrarGrafo(m.grafo, activas) : { nodos: [], aristas: [] });
  const puestos = $derived(colocarEnCirculo(g.nodos.length));
  const posDe = $derived(new Map(g.nodos.map((n, i) => [n.nombre, puestos[i]!])));
  const ANCHO = 640;

  const COLOR: Record<ClaseConexion, string> = {
    romantica: "var(--accent)",
    amistad: "var(--ok, #6aa84f)",
    rivalidad: "var(--warn, #c0504d)",
    otra: "var(--ink-3)",
  };
</script>

<section class="con" aria-label="Mapa de conexiones">
  <div class="filtros" role="group" aria-label="Filtrar por tipo">
    {#each CLASES_CONEXION as c (c.id)}
      <button class="btn" class:pri={activas.has(c.id)} class:ghost={!activas.has(c.id)} aria-pressed={activas.has(c.id)} onclick={() => alternar(c.id)}>
        <span class="punto" style:background={COLOR[c.id]}></span>{c.nombre}
      </button>
    {/each}
  </div>

  {#if !m.grafo?.aristas.length}
    <div class="warnbox info"><span>Aún no hay conexiones. Se escriben en la ficha de un personaje, en «Relaciones»: con quién y de qué tipo (romántica, amistad, rivalidad…).</span></div>
  {:else if !g.aristas.length}
    <div class="warnbox info"><span>Ninguna conexión de los tipos marcados.</span></div>
  {:else}
    <svg viewBox="0 0 {ANCHO} {ANCHO}" role="img" aria-label="Conexiones entre personajes">
      {#each g.aristas as a (JSON.stringify([a.de, a.a, a.tipo]))}
        {@const p = posDe.get(a.de)}
        {@const q = posDe.get(a.a)}
        {#if p && q}
          <line x1={p.x * ANCHO} y1={p.y * ANCHO} x2={q.x * ANCHO} y2={q.y * ANCHO} stroke={COLOR[a.clase]} stroke-width="2" opacity="0.8">
            <title>{a.de} — {a.a}{a.tipo ? ` (${a.tipo})` : ""}</title>
          </line>
        {/if}
      {/each}
      {#each g.nodos as n (n.nombre)}
        {@const p = posDe.get(n.nombre)!}
        <g transform="translate({p.x * ANCHO} {p.y * ANCHO})">
          <circle r="9" class="nodo" class:sinficha={!n.ruta} />
          <text y="26" text-anchor="middle">{n.nombre}</text>
        </g>
      {/each}
    </svg>

    <ul class="lista" aria-label="Lista de conexiones">
      {#each g.aristas as a (JSON.stringify([a.de, a.a, a.tipo]))}
        <li>
          <button class="enlace" onclick={() => m.abrirPorNombre(a.de)}>{a.de}</button>
          <span class="tipo" style:color={COLOR[a.clase]}>{a.tipo || "sin tipo"}</span>
          <button class="enlace" onclick={() => m.abrirPorNombre(a.a)}>{a.a}</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .con {
    display: grid;
    gap: 14px;
  }
  .filtros {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .punto {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 6px;
  }
  svg {
    width: 100%;
    max-width: 640px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
  }
  .nodo {
    fill: var(--accent-soft);
    stroke: var(--accent);
    stroke-width: 2;
  }
  .nodo.sinficha {
    stroke-dasharray: 3 3;
  }
  text {
    fill: var(--ink);
    font: 12px var(--sans);
  }
  .lista {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
    font-size: 13px;
  }
  .lista li {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .tipo {
    font-size: 12px;
  }
  .enlace {
    background: none;
    border: 0;
    padding: 0;
    color: var(--ink);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
</style>
