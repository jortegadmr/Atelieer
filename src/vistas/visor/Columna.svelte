<script lang="ts">
  // Una columna del visor (spec 002, RF-5 a RF-9): temporada, episodio o escena.
  // Pinchar o Intro baja (o elige, si es una escena); el resto, en el panel.
  // Lo demás que reciba (arrastrar, spec 003) va al botón.
  // El lector de pantalla lee la columna entera; lo que solo se ve por el
  // color (estado, avisos) va además en texto oculto.
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import { ESTADO, etiqueta } from "../../lib/modelo/vocabulario";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import type { Columna } from "../../lib/vistas/visor";
  import Carga from "../comunes/Carga.svelte";
  import Madurez from "../comunes/Madurez.svelte";
  import { usarMarcas } from "./marcas";
  import { fueraDeLente } from "../../lib/vistas/lente";

  // `destino`: se está arrastrando una escena de la bandeja encima (spec 003)
  const { col, destino = false, ...resto }: { col: Columna; destino?: boolean } & HTMLButtonAttributes = $props();
  const estado = usarEstado();

  const apartada = $derived(col.estado === "aparcado" || col.estado === "descartado");
  const decidida = $derived(col.carga[0] !== "" || col.carga[1] !== "");

  // «Si lo dejas así…» (spec 005, RF-27): lo afectado se resalta; lo demás se atenúa con color
  const marcas = usarMarcas();
  const m = $derived(marcas());
  const afectada = $derived(!!m && m.resaltadas.has(col.id));
  // RF-28: cómo estaba lo que cambió, en discontinuo gris y con texto
  const antes = $derived(m?.antes.get(col.id));
  const nueva = $derived(!!m && m.nuevas.has(col.id));
  // RF-34: el arco o el secreto elegido pasa por aquí solo en un lado
  const solo = $derived(m?.solo?.get(col.id));
  // La lente (spec 010, RF-4): lo no relacionado, atenuado con color
  const fuera = $derived.by(() => {
    const rel = estado.relacionLente;
    return !!rel && fueraDeLente(estado.sesion!.modelo, rel, col.tipo, col.id);
  });
  const carga = (c: [string, string]) => c.map((x) => x || "·").join(" ");
</script>

{#snippet viejo(texto: string)}
  {@const t = m?.textos?.antes ?? "antes"}
  <span class="antes" class:fantasma={m?.fantasma}><span aria-hidden="true">{t} {texto}</span><span class="solo-lector">, {t}: {texto}</span></span>
{/snippet}

<button
  class="colv {col.tipo}"
  class:cur={estado.seleccion === col.id}
  class:mal={col.avisos > 0}
  class:aparcado={col.estado === "aparcado"}
  class:descartado={col.estado === "descartado"}
  class:destino
  class:afectada
  class:dim={!!m && !afectada}
  class:fuera-lente={fuera}
  data-id={col.id}
  title={col.tipo === "evento" ? "Elegir la escena" : "Bajar a este nivel"}
  onclick={() => estado.bajar(col)}
  {...resto}
>
  <span class="cab">
    <span title={col.tipo === "evento" ? "Código calculado por el orden: cambia si reordenas las escenas" : undefined}>{#if col.tipo === "evento"}<span class="solo-lector">Escena </span>{/if}{col.codigo}</span>
    {#if antes?.numero !== undefined}{@render viejo(String(antes.numero))}{/if}
    {#if nueva}<span class="nueva">{m?.textos?.nueva ?? "Nueva"}</span>{/if}
    {#if solo}<span class="antes fantasma">{solo === "ahora" ? "solo ahora" : "solo en la variante"}</span>{/if}
    <Madurez madurez={col.estado} />
    {#if apartada}<span class="est">{etiqueta(ESTADO, col.estado)}</span>{:else}<span class="solo-lector">{etiqueta(ESTADO, col.estado)}</span>{/if}
    {#if afectada}<span class="solo-lector">, afectada</span>{/if}
    {#if fuera}<span class="solo-lector">, fuera de la lente</span>{/if}
    {#if col.avisos}<span class="av"><TriangleAlert class="i" />{col.avisos}<span class="solo-lector"> {col.avisos === 1 ? "aviso" : "avisos"}</span></span>{/if}
  </span>
  <span class="ti">{col.titulo || "Sin título"}</span>
  <span class="det">
    {#each col.detalle as x (x)}<span>{x}<span class="solo-lector">{", "}</span></span>{/each}
    {#if antes?.episodios !== undefined}{@render viejo(`${antes.episodios} ep`)}{/if}
    {#if decidida}<Carga carga={col.carga} />{/if}
    {#if antes?.carga}{@render viejo(carga(antes.carga))}{/if}
    {#if col.igual}<span class="igual">Empieza y acaba igual</span>{/if}
    {#if col.dominante}
      <span class="dom"><span class="dot" style:background={`var(--t${col.dominante.color})`}></span>{col.dominante.nombre || "Sin título"}</span>
    {/if}
    {#if antes?.dominante !== undefined}{@render viejo(antes.dominante || "ninguna")}{/if}
  </span>
  {#if col.texto}<span class="tx">{col.texto}</span>{/if}
</button>
