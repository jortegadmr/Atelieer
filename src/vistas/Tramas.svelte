<script lang="ts">
  // Paso 2 · Tramas y arcos, el taller (spec 5.2; maqueta #z=tramas&t=…).
  import { estadoDe } from "../lib/modelo/estados";
  import Copy from "@lucide/svelte/icons/copy";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import Plus from "@lucide/svelte/icons/plus";
  import { usarEstado } from "../lib/app/contexto";
  import * as c from "../lib/modelo/consultas";
  import { crearTramo } from "../lib/modelo/operaciones";
  import { ESTADO, etiqueta, TIPO_ARCO } from "../lib/modelo/vocabulario";
  import { mayus } from "../lib/vistas/textos";
  import Leyenda from "./comunes/Leyenda.svelte";
  import Madurez from "./comunes/Madurez.svelte";
  import Beats from "./tramas/Beats.svelte";
  import Campos from "./tramas/Campos.svelte";
  import ListaArcos from "./tramas/ListaArcos.svelte";
  import Recorrido from "./tramas/Recorrido.svelte";
  import { fuenteMarcas } from "../lib/consecuencias/fuente";
  import { marcasTramas } from "../lib/consecuencias/vistas";

  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    // Elegir un arco lo pone también en `arcoActual`; con «Si lo dejas así…» abierta, ver otro solo cambia este (RF-33b)
    const elegido = estado.arcoActual && m.arcos.has(estado.arcoActual) ? estado.arcoActual : estado.seleccion;
    const arco = (elegido && m.arcos.get(elegido)) || c.arcosEnOrden(m).find((a) => a.madurez !== "descartado") || null;
    // «Si lo dejas así…» en gris, o la variante en acento (spec 009, RF-30 a RF-32)
    const f = fuenteMarcas(estado);
    const marcas = f ? { ...marcasTramas(f.base, f.actual, f.ids, arco?.id ?? null), fantasma: f.fantasma, textos: f.textos } : null;
    if (!arco) return { titulo: m.serie.titulo, arco: null, marcas };
    const padre = arco.tramo_de ? m.arcos.get(arco.tramo_de) : undefined;
    const tramos = arco.nivel === "serie" ? c.tramos(m, arco.id).map((t) => ({ t, codigo: c.codigo(m, t.temporada) })) : [];
    const conTramo = new Set(tramos.map((x) => x.t.temporada));
    const libres = arco.nivel === "serie" ? c.temporadasEnOrden(m).filter((t) => !conTramo.has(t.id)).map((t) => ({ id: t.id, codigo: c.codigo(m, t.id) })) : [];
    return {
      titulo: m.serie.titulo,
      arco,
      padre,
      temporada: c.codigo(m, arco.temporada),
      tramos,
      libres,
      marcas,
    };
  });

  async function nuevoTramo(temporada: string) {
    if (!d.arco) return;
    const { pieza, cambio } = crearTramo(estado.sesion!.modelo, d.arco.id, temporada);
    await estado.sesion!.aplicar(cambio);
    estado.elegir(pieza.id);
  }
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Paso 2 · Tramas y arcos · el taller</div>
    <h1 class="t">Tramas de {d.titulo || "la serie"}</h1>
    <p class="logline">Primero qué quiere cada una y qué arriesga; luego dónde cae.</p>
  </div>
</div>

<div class="tw">
  <ListaArcos actual={d.arco?.id ?? null} marcas={d.marcas} />
  <div>
    {#if d.arco}
      {@const a = d.arco}
      <div class="vh centro">
        <div>
          <div class="eyebrow">
            <span class="dot" style:background="var(--t{a.color})"></span>
            Arco de {etiqueta(TIPO_ARCO, a.tipo_arco)} · {a.tipo_trama} ·
            {#if d.padre}tramo de <b class="padre">{d.padre.titulo || "sin título"}</b> en {d.temporada}
            {:else if a.nivel === "serie"}de serie{:else}de temporada{#if d.temporada}&nbsp;· {d.temporada}{/if}{/if}
            · <Madurez madurez={estadoDe(a)} /> {mayus(etiqueta(ESTADO, estadoDe(a)))}
          </div>
          <button class="titulo" onclick={() => estado.elegir(a.id)}><h1 class="t" class:tachado={a.madurez === "descartado"}>{a.titulo || "Sin título"}</h1></button>
          {#if a.quiere}<p class="logline">{a.quiere}</p>{/if}
        </div>
        <div class="meta">
          <button class="btn ghost" disabled title="Llega en la fase 2"><Copy class="i" />¿Y si…?</button>
          <button class="btn" onclick={() => estado.cambiarVista("episodios")}><LayoutGrid class="i" />Ver en la rejilla</button>
        </div>
      </div>

      {#if a.madurez === "descartado" && a.motivo_descarte}
        <div class="warnbox info descarte"><span><b>Descartado:</b> {a.motivo_descarte}</span></div>
      {/if}

      <Recorrido arco={a} />
      <Beats arco={a} marcas={d.marcas} />
      <Campos arco={a} marcas={d.marcas} />

      {#if a.nivel === "serie"}
        <div class="sec">
          <div class="sec-h"><h2>Tramos por temporada</h2></div>
          <div class="children">
            {#each d.tramos as { t, codigo } (t.id)}
              <button class="chip" onclick={() => estado.verArco(t.id)}>
                <span class="dot" style:background="var(--t{t.color})"></span>{t.titulo || "Sin título"}<span class="tipo">{codigo || "¿?"}</span>
              </button>
            {/each}
            {#each d.libres as t (t.id)}
              <button class="chip add" onclick={() => nuevoTramo(t.id)}><Plus class="i" />Tramo en {t.codigo}</button>
            {/each}
          </div>
        </div>
      {/if}
      <Leyenda />
    {:else}
      <div class="card vacio">
        <p>Todavía no hay arcos. Empieza por la trama principal: «+ Nueva» en «De serie».</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .centro {
    margin-bottom: 18px;
  }
  .centro .t {
    font-size: 36px;
  }
  .centro .logline {
    font-size: 17px;
  }
  .titulo {
    display: block;
    text-align: left;
  }
  .padre {
    font-weight: 500;
    color: var(--ink-2);
  }
  .tachado {
    text-decoration: line-through;
    text-decoration-color: var(--ink-3);
    color: var(--ink-2);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .descarte {
    margin-bottom: 12px;
  }
  .chip {
    cursor: pointer;
  }
  .vacio {
    padding: 24px;
    color: var(--ink-2);
    font: italic 17px/1.4 var(--serif);
  }
</style>
