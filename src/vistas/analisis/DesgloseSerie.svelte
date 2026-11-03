<script lang="ts">
  // Datos de la serie o del filtro y duración objetivo (spec 014, RF-11 a RF-13):
  // los minutos con guion contra los previstos, las escenas que faltan y lo que
  // llama la atención (lugares y personajes de una sola escena, quien habla sin
  // ficha). La duración objetivo es lo único que se escribe aquí, en su fichero.
  import type { EstadoDesglose } from "../../lib/app/estado-desglose.svelte";
  import type { DatosSerie } from "../../lib/desglose/datos";
  import { minutos } from "../../lib/desglose/desglose";
  import type { Ambito } from "../../lib/guion/indice";
  import { objetivoVacio, type Objetivo } from "../../lib/desglose/objetivo";

  const {
    d,
    datos,
    ambito,
    etiqueta,
    previsto,
    comparable,
  }: {
    d: EstadoDesglose;
    datos: DatosSerie;
    ambito: Ambito;
    /** «la serie», «la temporada T01», «el episodio T01E03» */
    etiqueta: string;
    /** Segundos previstos para el ámbito, o null si no hay objetivo */
    previsto: number | null;
    /** Los filtros dejan el ámbito entero (solo temporada, episodio y estado): se puede comparar */
    comparable: boolean;
  } = $props();

  const lectura = $derived(d.objetivo);
  const propio = $derived.by(() => {
    const o = lectura?.objetivo ?? objetivoVacio();
    if (ambito.que === "serie") return o.serie;
    const mapa = ambito.que === "temporada" ? o.temporadas : o.episodios;
    return Object.hasOwn(mapa, ambito.id) ? mapa[ambito.id]! : null;
  });

  let texto = $state("");
  let mensaje = $state("");
  // El campo sigue al ámbito: al cambiar de temporada o episodio se rellena con el valor de ese ámbito
  // (se mira la clave y el valor, no el objeto, para no borrar lo que se está escribiendo)
  const claveAmbito = $derived(ambito.que === "serie" ? "serie" : `${ambito.que}:${ambito.id}`);
  $effect(() => {
    void claveAmbito;
    texto = propio === null ? "" : String(propio).replace(".", ",");
  });
  $effect(() => {
    void claveAmbito;
    mensaje = "";
  });

  const escenas = (n: number) => (n === 1 ? "1 escena" : `${n} escenas`);
  const lista = (l: string[]) => l.join(", ");

  const diferencia = $derived(previsto === null ? null : datos.segundos - previsto);

  function con(valor: number | null): Objetivo {
    const o = lectura?.objetivo ?? objetivoVacio();
    const nuevo: Objetivo = { ...o, temporadas: { ...o.temporadas }, episodios: { ...o.episodios } };
    if (ambito.que === "serie") nuevo.serie = valor;
    else {
      const mapa = ambito.que === "temporada" ? nuevo.temporadas : nuevo.episodios;
      if (valor === null) delete mapa[ambito.id];
      else mapa[ambito.id] = valor;
    }
    return nuevo;
  }

  async function guardar(valor: number | null) {
    const r = await d.guardarObjetivo(con(valor));
    mensaje = r.mensaje;
    if (r.hecho && valor === null) texto = "";
  }
  function alGuardar(e: Event) {
    e.preventDefault();
    const n = Number(texto.trim().replace(",", "."));
    if (!texto.trim() || !Number.isFinite(n) || n <= 0) {
      mensaje = "Escribe los minutos como un número mayor que cero, por ejemplo 45.";
      return;
    }
    void guardar(n);
  }
</script>

<section class="serie" aria-label="Datos de {etiqueta}">
  <p class="estima">
    Son cifras estimadas sobre el guion escrito (una página es un minuto).
    {#if datos.sinGuion}
      {escenas(datos.sinGuion)} {datos.sinGuion === 1 ? "queda" : "quedan"} fuera de los minutos por no tener guion.
    {:else if datos.escenas}
      Todas las escenas tienen guion.
    {/if}
  </p>

  <dl class="cifras">
    <div><dt>Minutos con guion</dt><dd>{minutos(datos.segundos)}</dd></div>
    <div><dt>Escenas</dt><dd>{datos.escenas}</dd></div>
    <div><dt>Con guion</dt><dd>{datos.conGuion}</dd></div>
    <div><dt>Sin guion</dt><dd>{datos.sinGuion}</dd></div>
  </dl>

  {#if previsto !== null && comparable}
    <p class="compara" role="status">
      Previsto para {etiqueta}: <strong>{minutos(previsto)} min</strong>.
      {#if diferencia !== null && Math.abs(diferencia) < 3}
        Lo escrito encaja con lo previsto.
      {:else if diferencia !== null && diferencia < 0}
        Faltan <strong>{minutos(-diferencia)} min</strong> por escribir.
      {:else if diferencia !== null}
        Se pasa en <strong>{minutos(diferencia)} min</strong>.
      {/if}
    </p>
  {:else if previsto !== null}
    <p class="nota">Hay una duración prevista para {etiqueta}, pero no se compara mientras haya filtros de locación, personaje, interior/exterior o momento.</p>
  {/if}

  <form class="objetivo" onsubmit={alGuardar} aria-label="Duración objetivo de {etiqueta}">
    <label>
      <span>Duración objetivo de {etiqueta} (minutos, opcional)</span>
      <input type="text" inputmode="decimal" bind:value={texto} placeholder="Sin objetivo" disabled={d.conVariante || !!lectura?.soloLectura} />
    </label>
    <button class="btn pri" type="submit" disabled={d.conVariante || !!lectura?.soloLectura}>Guardar</button>
    {#if propio !== null}<button class="btn" type="button" disabled={d.conVariante || !!lectura?.soloLectura} onclick={() => void guardar(null)}>Quitar</button>{/if}
  </form>
  {#if lectura?.soloLectura}<p class="nota">{lectura.avisos[0] ?? "El fichero de la duración objetivo solo se mira."}</p>{/if}
  {#if d.conVariante}<p class="nota">Con una variante abierta no se cambia la duración objetivo.</p>{/if}
  <p class="nota" role="status">{mensaje}</p>
  <p class="nota fichero">Se guarda en su propio fichero de la serie (<code>_desglose/objetivo.md</code>), no en las notas de los episodios.</p>

  <div class="avisos">
    <div>
      <h3>Lugares con una sola escena</h3>
      <p>{datos.lugaresUnaEscena.length ? lista(datos.lugaresUnaEscena) : "Ninguno"}</p>
    </div>
    <div>
      <h3>Personajes con una sola escena</h3>
      <p>{datos.personajesUnaEscena.length ? lista(datos.personajesUnaEscena) : "Ninguno"}</p>
    </div>
    <div>
      <h3>Hablan y no tienen ficha en el mundo</h3>
      <p>{datos.hablanSinFicha.length ? lista(datos.hablanSinFicha) : "Ninguno"}</p>
    </div>
  </div>
</section>

<style>
  .serie {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 900px;
  }
  .estima,
  .nota,
  .compara {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .nota {
    color: var(--ink-3);
  }
  .compara {
    font-size: 13.5px;
    color: var(--ink);
  }
  .cifras {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0;
  }
  .cifras div {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px 14px;
    background: var(--surface);
    min-width: 110px;
  }
  .cifras dt {
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .cifras dd {
    margin: 2px 0 0;
    font: 600 20px var(--mono);
    color: var(--ink);
  }
  .objetivo {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 8px 10px;
  }
  .objetivo label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .objetivo input {
    width: 160px;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 6px 9px;
    background: var(--surface);
    color: var(--ink);
    font: 13px var(--mono);
  }
  .objetivo button:disabled,
  .objetivo input:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .avisos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .avisos h3 {
    margin: 0 0 4px;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .avisos p {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  code {
    font: 11.5px var(--mono);
  }
</style>
