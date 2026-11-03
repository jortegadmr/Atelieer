<script lang="ts">
  // Datos por personaje o por lugar (spec 014, RF-9, RF-10, RF-13, RF-14): se
  // ordenan por cualquier columna y cada nombre abre su lista de escenas con el
  // filtro puesto. Son cifras estimadas sobre el guion escrito.
  import type { EstadoDesglose } from "../../lib/app/estado-desglose.svelte";
  import { ordenar, type DatosLugar, type DatosPersonaje } from "../../lib/desglose/datos";
  import { minutos } from "../../lib/desglose/desglose";

  const { d, que, personajes, lugares }: { d: EstadoDesglose; que: "personajes" | "lugares"; personajes: DatosPersonaje[]; lugares: DatosLugar[] } = $props();

  type Col<T> = { id: string; texto: string; valor: (x: T) => number | string; mostrar: (x: T) => string; num?: boolean };

  const pct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;
  const min = (s: number) => minutos(s);

  const COL_PERSONAJES: Col<DatosPersonaje>[] = [
    { id: "nombre", texto: "Personaje", valor: (x) => x.nombre, mostrar: (x) => x.nombre },
    { id: "escenas", texto: "Escenas", valor: (x) => x.escenas, mostrar: (x) => String(x.escenas), num: true },
    { id: "episodios", texto: "Episodios", valor: (x) => x.episodios, mostrar: (x) => String(x.episodios), num: true },
    { id: "presencia", texto: "Presencia (min)", valor: (x) => x.presencia, mostrar: (x) => min(x.presencia), num: true },
    { id: "pctp", texto: "% presencia", valor: (x) => x.pctPresencia, mostrar: (x) => pct(x.pctPresencia), num: true },
    { id: "habla", texto: "Habla (min)", valor: (x) => x.habla, mostrar: (x) => min(x.habla), num: true },
    { id: "pcth", texto: "% habla", valor: (x) => x.pctHabla, mostrar: (x) => pct(x.pctHabla), num: true },
    { id: "primera", texto: "Primera", valor: (x) => x.primera, mostrar: (x) => x.primera || "—" },
    { id: "ultima", texto: "Última", valor: (x) => x.ultima, mostrar: (x) => x.ultima || "—" },
    { id: "solo", texto: "Solo en escena", valor: (x) => x.solo, mostrar: (x) => String(x.solo), num: true },
    { id: "coincide", texto: "Coincide más con", valor: (x) => x.coincide.map((c) => c.nombre).join(", "), mostrar: (x) => x.coincide.map((c) => `${c.nombre} (${c.escenas})`).join(", ") || "—" },
  ];
  const COL_LUGARES: Col<DatosLugar>[] = [
    { id: "nombre", texto: "Lugar", valor: (x) => x.nombre, mostrar: (x) => x.nombre },
    { id: "escenas", texto: "Escenas", valor: (x) => x.escenas, mostrar: (x) => String(x.escenas), num: true },
    { id: "minutos", texto: "Minutos", valor: (x) => x.segundos, mostrar: (x) => min(x.segundos), num: true },
    { id: "pct", texto: "% del total", valor: (x) => x.pct, mostrar: (x) => pct(x.pct), num: true },
    { id: "ie", texto: "Int/Ext habitual", valor: (x) => x.ie ?? "", mostrar: (x) => x.ie ?? "—" },
    { id: "momento", texto: "Momento habitual", valor: (x) => x.momento ?? "", mostrar: (x) => x.momento ?? "—" },
    { id: "personajes", texto: "Quién pasa por él", valor: (x) => x.personajes.join(", "), mostrar: (x) => x.personajes.join(", ") || "—" },
  ];

  let orden = $state({ col: "", desc: true });
  // Al cambiar de tabla se vuelve al orden de siempre
  $effect(() => {
    void que;
    orden = { col: "", desc: true };
  });

  function pulsar(id: string, num?: boolean) {
    orden = orden.col === id ? { col: id, desc: !orden.desc } : { col: id, desc: !!num };
  }
  const aria = (id: string) => (orden.col !== id ? "none" : orden.desc ? "descending" : "ascending");

  function filasOrdenadas<T extends { nombre: string }>(filas: T[], cols: Col<T>[]): T[] {
    const c = cols.find((x) => x.id === orden.col);
    return c ? ordenar(filas, c.valor, orden.desc) : filas;
  }
  const ps = $derived(filasOrdenadas(personajes, COL_PERSONAJES));
  const ls = $derived(filasOrdenadas(lugares, COL_LUGARES));

  function verEscenas(clave: string) {
    d.filtros = { ...d.filtros, [que === "personajes" ? "personajes" : "locaciones"]: [clave] };
    d.subvista = "escenas";
  }
</script>

{#if que === "personajes"}
  {#if !personajes.length}
    <p class="hint">Ninguna escena tiene personajes.</p>
  {:else}
    <div class="caja-tabla">
      <table class="tabla-d">
        <thead>
          <tr>
            {#each COL_PERSONAJES as c (c.id)}
              <th scope="col" aria-sort={aria(c.id)} class:num={c.num}>
                <button onclick={() => pulsar(c.id, c.num)} title="Ordenar por {c.texto}">{c.texto}{#if orden.col === c.id}<span aria-hidden="true">{orden.desc ? " ▼" : " ▲"}</span>{/if}</button>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each ps as x (x.clave)}
            <tr>
              {#each COL_PERSONAJES as c (c.id)}
                {#if c.id === "nombre"}
                  <th scope="row">
                    <button class="enlace" title="Ver sus escenas" onclick={() => verEscenas(x.clave)}>{x.nombre}</button>{#if !x.ficha}<span class="sinficha" title="No tiene ficha de personaje en el mundo">sin ficha</span>{/if}
                  </th>
                {:else}
                  <td class:num={c.num}>{c.mostrar(x)}</td>
                {/if}
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{:else if !lugares.length}
  <p class="hint">Ninguna escena tiene locación.</p>
{:else}
  <div class="caja-tabla">
    <table class="tabla-d">
      <thead>
        <tr>
          {#each COL_LUGARES as c (c.id)}
            <th scope="col" aria-sort={aria(c.id)} class:num={c.num}>
              <button onclick={() => pulsar(c.id, c.num)} title="Ordenar por {c.texto}">{c.texto}{#if orden.col === c.id}<span aria-hidden="true">{orden.desc ? " ▼" : " ▲"}</span>{/if}</button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each ls as x (x.clave)}
          <tr>
            {#each COL_LUGARES as c (c.id)}
              {#if c.id === "nombre"}
                <th scope="row">
                  <button class="enlace" title="Ver sus escenas" onclick={() => verEscenas(x.clave)}>{x.nombre}</button>{#if !x.ficha}<span class="sinficha" title="No tiene ficha de lugar en el mundo">sin ficha</span>{/if}
                </th>
              {:else}
                <td class:num={c.num}>{c.mostrar(x)}</td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .tabla-d {
    border-collapse: collapse;
    font-size: 12.5px;
    min-width: 100%;
  }
  .tabla-d th,
  .tabla-d td {
    text-align: left;
    vertical-align: top;
    padding: 6px 10px;
    border-bottom: 1px solid var(--line);
  }
  .tabla-d thead th {
    font: 500 11px var(--mono);
    color: var(--ink-2);
    background: var(--surface-2);
    white-space: nowrap;
    padding: 0;
  }
  .tabla-d thead th button {
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    font: inherit;
  }
  .tabla-d thead th button:hover {
    color: var(--ink);
    background: var(--hover);
  }
  .tabla-d tbody th {
    font-weight: 500;
    min-width: 130px;
  }
  .num {
    text-align: right !important;
    font: 12px var(--mono);
    white-space: nowrap;
  }
  .enlace {
    text-align: left;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .enlace:hover {
    color: var(--accent);
  }
  .sinficha {
    margin-left: 6px;
    font: 10.5px var(--mono);
    color: var(--ink-3);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 5px;
  }
</style>
