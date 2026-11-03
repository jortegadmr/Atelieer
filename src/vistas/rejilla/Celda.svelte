<script lang="ts">
  // Una celda de la rejilla: los eventos de un arco en un episodio. Vacía,
  // un clic crea un evento ahí (T5.2). Recibe eventos arrastrados (T5.4).
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { crearEvento } from "../../lib/modelo/operaciones";
  import type { Evento } from "../../lib/modelo/tipos";
  import { hayEvento, soltarEvento } from "../comunes/arrastre";
  import TarjetaEvento from "./TarjetaEvento.svelte";
  import { casilla } from "../../lib/vistas/lente";
  import type { MarcasRejilla } from "../../lib/consecuencias/vistas";
  import type { ConFuente } from "../../lib/consecuencias/fuente";

  const {
    eventos,
    arcoId,
    color,
    episodioId,
    temporadaId,
    marcas = null,
    fila,
    columna,
  }: {
    eventos: Evento[];
    arcoId: string;
    color: number;
    episodioId: string;
    temporadaId: string;
    /** Las de «Si lo dejas así…» o la variante (spec 009, RF-30, RF-31) */
    marcas?: ConFuente<MarcasRejilla> | null;
    /** Su sitio en la cuadrícula, explícito (spec 011, T13b) */
    fila: number;
    columna: number;
  } = $props();
  const estado = usarEstado();
  let encima = $state(false);

  async function crear() {
    const { pieza, cambio } = crearEvento(estado.sesion!.modelo, {
      temporada: temporadaId,
      episodio: episodioId,
      arcos: arcoId ? [{ arco: arcoId, papel: "avanza" }] : [],
    });
    await estado.sesion!.aplicar(cambio);
    estado.enfocar = pieza.id;
    estado.elegir(pieza.id, "editar");
  }

  // Posición en la celda de verdad (el episodio entero), no solo en esta fila
  const indiceEnEpisodio = (ev: Evento) => c.eventosDeEpisodio(estado.sesion!.modelo, episodioId).findIndex((x) => x.id === ev.id);

  // Escenas que estaban en esta celda y se fueron: al final, sin mover las que hay (RF-33)
  const estaban = $derived(marcas?.estabanAqui.get(`${arcoId}|${episodioId}`) ?? []);
  // La lente (spec 010, RF-4): la casilla no relacionada, atenuada; en «Sin trama», si no tiene escenas relacionadas
  const fueraLente = $derived.by(() => {
    const rel = estado.relacionLente;
    if (!rel) return false;
    return arcoId ? !rel.casillas.has(casilla(arcoId, episodioId)) : !eventos.some((ev) => rel.escenas.has(ev.id));
  });
  const papelAntes = (ev: Evento) => marcas?.papelAntes.get(`${ev.id}|${arcoId}`);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="g-c"
  class:empty={!eventos.length}
  class:encima
  class:fuera-lente={fueraLente}
  style:grid-row={fila}
  style:grid-column={columna}
  ondragover={(e) => {
    if (!hayEvento(e)) return;
    e.preventDefault();
    encima = true;
  }}
  ondragleave={() => (encima = false)}
  ondrop={(e) => {
    encima = false;
    void soltarEvento(e, estado.sesion!, episodioId);
  }}
  onclick={() => {
    if (!eventos.length) void crear();
  }}
>
  {#each eventos as ev (ev.id)}
    {@const antes = papelAntes(ev)}
    <TarjetaEvento
      evento={ev}
      papel={c.papelEn(ev, arcoId)}
      {color}
      indice={indiceEnEpisodio(ev)}
      antes={antes && marcas ? `${marcas.textos.antes}: ${antes}` : null}
      nueva={marcas?.nuevas.has(ev.id) ? marcas.textos.nueva : null}
      fantasma={marcas?.fantasma}
    />
  {/each}
  {#each estaban as x (x.id)}
    {@const t = `${marcas!.textos.estaba}: «${x.titulo}»`}
    <div class="estaba" class:fantasma={marcas!.fantasma} title={t}>{t}</div>
  {/each}
</div>

<style>
  .g-c.empty {
    cursor: pointer;
  }
  .encima {
    background: var(--accent-soft) !important;
  }
</style>
