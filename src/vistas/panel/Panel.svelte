<script lang="ts">
  // Panel derecho (spec 5.5, M4): la pieza elegida, con Editar · Guía ·
  // Ficha (si tiene ficha en la wiki, spec 009) · Comprobar. Guía y Comprobar llegan en el paso 6, salvo la lista de las
  // 10-11 preguntas de la serie (T2.2).
  import { enfocable, lenteDeSecreto } from "../comunes/enfocable";
  import Check from "@lucide/svelte/icons/check";
  import Clapperboard from "@lucide/svelte/icons/clapperboard";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Layers2 from "@lucide/svelte/icons/layers-2";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import MousePointerClick from "@lucide/svelte/icons/mouse-pointer-click";
  import Orbit from "@lucide/svelte/icons/orbit";
  import Sparkle from "@lucide/svelte/icons/sparkle";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import X from "@lucide/svelte/icons/x";
  import BookAlert from "@lucide/svelte/icons/book-alert";
  import LockKeyhole from "@lucide/svelte/icons/lock-keyhole";
  import Eye from "@lucide/svelte/icons/eye";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import { onDestroy, untrack } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { VIENDO_AHORA, type Pestana } from "../../lib/app/estado.svelte";
  import { fechaCorta } from "../../lib/variantes/nombres";
  import { versionesDe } from "../../lib/variantes/versiones";
  import * as c from "../../lib/modelo/consultas";
  import { borrarPieza } from "../../lib/modelo/operaciones";
  import { rutaFicha } from "../../lib/wiki/estado-ficha";
  import { CLASE_PUNTO, etiqueta, TIPO_ARCO } from "../../lib/modelo/vocabulario";
  import IconoPunto from "../comunes/IconoPunto.svelte";
  import LlevarSala from "../comunes/LlevarSala.svelte";
  import EditarArco from "./EditarArco.svelte";
  import EditarEpisodio from "./EditarEpisodio.svelte";
  import EditarEvento from "./EditarEvento.svelte";
  import EditarSecreto from "./EditarSecreto.svelte";
  import EditarPunto from "./EditarPunto.svelte";
  import EditarSerie from "./EditarSerie.svelte";
  import EditarTemporada from "./EditarTemporada.svelte";
  import AvisosPieza from "./AvisosPieza.svelte";
  import Comprobar from "./Comprobar.svelte";
  import Guia from "./Guia.svelte";
  import PestanaFicha from "./PestanaFicha.svelte";
  import SiLoDejas from "./SiLoDejas.svelte";
  import PestanaYSi from "../variantes/PestanaYSi.svelte";
  import ConfirmarAplicar from "../variantes/ConfirmarAplicar.svelte";

  const estado = usarEstado();

  const pieza = $derived.by(() => {
    void estado.version;
    const id = estado.seleccion;
    return id ? (estado.sesion?.modelo.pieza(id) ?? null) : null;
  });

  const cabecera = $derived.by(() => {
    void estado.version;
    const p = pieza;
    const m = estado.sesion!.modelo;
    if (!p) return null;
    switch (p.tipo) {
      case "serie":
        return { etiqueta: "Serie", titulo: p.titulo || "Sin título" };
      case "temporada":
        return { etiqueta: `Temporada · ${c.codigo(m, p.id)}`, titulo: p.titulo || (p.estado === "prevista" ? "Prevista" : "Sin título") };
      case "punto": {
        const donde = p.posicion.episodio ? c.codigo(m, p.posicion.episodio) : c.codigo(m, p.posicion.temporada);
        const clase = etiqueta(CLASE_PUNTO, p.clase);
        return { etiqueta: "Punto clave de la serie", titulo: `${clase[0].toUpperCase()}${clase.slice(1)}${donde ? ` · ${donde}` : ""}` };
      }
      case "episodio":
        return { etiqueta: `Episodio · ${c.codigo(m, p.id)}`, titulo: p.titulo || "Sin título" };
      case "arco":
        return { etiqueta: `Arco de ${etiqueta(TIPO_ARCO, p.tipo_arco)} · ${p.tipo_trama}`, titulo: p.titulo || "Sin título" };
      case "evento":
        return { etiqueta: `Escena${p.episodio ? ` · ${c.codigo(m, p.episodio)}` : " · en la bandeja"}`, titulo: p.titulo || "Sin título" };
      case "secreto":
        return { etiqueta: `Secreto ${p.nivel}`, titulo: p.titulo || "Sin título" };
    }
  });


  // Pie: "Guardado hace 2 s"
  let ahora = $state(Date.now());
  const reloj = setInterval(() => (ahora = Date.now()), 1000);
  onDestroy(() => clearInterval(reloj));

  const guardado = $derived.by(() => {
    void estado.version;
    const g = estado.sesion!.guardadoVisible;
    return { pendiente: g.pendiente, ultimo: g.ultimo, error: g.error ?? estado.sesion!.errorBorrar, aviso: g.aviso };
  });

  function hace(ms: number): string {
    const s = Math.max(0, Math.round((ahora - ms) / 1000));
    if (s < 60) return `hace ${s} s`;
    const min = Math.round(s / 60);
    if (min < 60) return `hace ${min} min`;
    const d = new Date(ms);
    return `a las ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // Borrar, con confirmación (spec 5.6)
  const NOMBRE_PIEZA: Record<string, string> = {
    punto: "punto clave",
    temporada: "temporada",
    episodio: "episodio",
    arco: "arco",
    evento: "escena",
    secreto: "secreto",
  };
  let confirmando = $state(false);
  /** Confirmar el desbloqueo de una pieza canon (spec 001, RF-30) */
  let desbloqueando = $state(false);
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => {
    if (confirmando) return estado.capas.abrir(() => (confirmando = false));
  });
  $effect(() => {
    if (desbloqueando) return estado.capas.abrir(() => (desbloqueando = false));
  });
  $effect(() => {
    void estado.seleccion;
    confirmando = false;
    desbloqueando = false;
  });

  // Canon bloqueado (spec 001, RF-29): el formulario se ve pero no se edita
  const bloqueada = $derived.by(() => {
    void estado.version;
    return !!pieza && estado.sesion!.estaBloqueada(pieza.id);
  });
  // «Ver ahora» con una variante abierta: la serie se ve pero no se cambia (spec 006, RF-15)
  // (y mientras se aplica, aparca o descarta la variante: lo que se guarda es lo de antes)
  const soloLectura = $derived(!!estado.variante && (estado.viendoAhora || estado.operando));
  // En la variante, una pieza canon se prueba igual; al aplicar habrá que desbloquearla (RF-11)
  const canonEnSerie = $derived.by(() => {
    void estado.version;
    const v = estado.variante;
    return !!v && !estado.viendoAhora && !!pieza && v.canonEnSerie(pieza.id);
  });
  // Lo que no se pudo hacer en el último cambio (bloqueo, wiki sin actualizar)
  const avisosCambio = $derived.by(() => {
    void estado.version;
    // Copia: la sesión añade avisos al mismo array y sin otra referencia no se repintaría
    return [...estado.sesion!.avisosCambio];
  });
  function desbloquear() {
    if (pieza) estado.sesion!.desbloquear(pieza.id);
    desbloqueando = false;
  }

  const aviso = $derived.by(() => {
    if (!pieza || pieza.tipo === "serie") return "";
    const cambio = borrarPieza(estado.sesion!.modelo, pieza.id);
    const eps = cambio.borrar.filter((p) => p.tipo === "episodio").length;
    const evs = cambio.borrar.filter((p) => p.tipo === "evento").length;
    const sueltos = cambio.guardar.filter((p) => p.tipo === "evento").length;
    const pts = cambio.borrar.filter((p) => p.tipo === "punto").length;
    if (pieza.tipo === "temporada" && (eps || evs || pts)) {
      const partes = [eps && `${eps} episodios`, evs && `${evs} escenas`, pts && `${pts} puntos clave`].filter(Boolean);
      return `Se va con sus ${partes.join(", ").replace(/, ([^,]*)$/, " y $1")}.`;
    }
    if (pieza.tipo === "episodio" && sueltos) return `Sus ${sueltos} escenas pasan a la bandeja.`;
    return "";
  });

  async function borrar() {
    if (!pieza) return;
    const cambio = borrarPieza(estado.sesion!.modelo, pieza.id);
    // Primero se borra y después se elige la serie: su comparación empieza ya con eso hecho (spec 005, RF-26)
    if (await estado.sesion!.aplicar(cambio)) estado.elegir(estado.sesion!.modelo.serie.id);
  }

  const nAvisos = $derived.by(() => {
    void estado.version;
    return estado.sesion!.resultado().avisos.filter((a) => a.clase === "aviso").length;
  });

  // Retcon (spec 5.6, T7.2): al cambiar cualquier campo de una pieza canon
  const firma = (p: object) => JSON.stringify({ ...p, avisos_silenciados: undefined });
  let inicial = $state<{ id: string; firma: string; canon: boolean } | null>(null);
  $effect(() => {
    const id = estado.seleccion;
    // Al pasar de la serie a la variante (o al revés) la pieza es otra aunque el id sea el mismo
    void estado.sesion;
    untrack(() => {
      const p = id ? estado.sesion?.modelo.pieza(id) : undefined;
      inicial = p && id ? { id, firma: firma(p), canon: "madurez" in p && p.madurez === "canon" } : null;
    });
  });
  const retcon = $derived(!!pieza && !!inicial && inicial.id === pieza.id && inicial.canon && firma(pieza) !== inicial.firma);

  // «Si lo dejas así…» (spec 005, RF-2): la cifra se calcula 150 ms después del último cambio; escribir no la espera
  let cifra = $state<{ total: number; conAviso: boolean }>({ total: 0, conAviso: false });
  $effect(() => {
    void estado.version;
    void estado.seleccion;
    const t = setTimeout(() => {
      const e = untrack(() => estado.sesion?.efectos());
      cifra = { total: e?.total ?? 0, conAviso: !!e?.conAviso };
    }, 150);
    return () => clearTimeout(t);
  });
  const etiquetaEfectos = $derived(
    cifra.total ? `Si lo dejas así…, ${cifra.total} ${cifra.total === 1 ? "cambio" : "cambios"}${cifra.conAviso ? ", con avisos" : ""}` : "Si lo dejas así…",
  );

  // «Probar otra versión» y sus versiones aparcadas (spec 006, RF-3, RF-4)
  const versiones = $derived.by(() => {
    void estado.version;
    const s = estado.sesionSerie;
    return s && pieza ? versionesDe(s.variantes.lista.values(), pieza.id) : [];
  });
  let verVersiones = $state(false);
  let choquesVersion = $state<Record<string, number>>({});
  $effect(() => {
    if (!verVersiones) return;
    for (const c of versiones) void estado.choquesDeAparcada(c.id).then((n) => (choquesVersion = { ...choquesVersion, [c.id]: n }));
  });
  $effect(() => {
    void estado.seleccion;
    verVersiones = false;
  });

  // La pestaña «¿Y si…?» (spec 006, RF-19): solo con una variante abierta; su cifra, 150 ms después del último cambio
  let cifraYSi = $state<{ total: number; conAviso: boolean }>({ total: 0, conAviso: false });
  $effect(() => {
    void estado.version;
    const t = setTimeout(() => {
      const v = untrack(() => estado.variante);
      const d = v?.diferencias();
      const n = v?.choques().length ?? 0;
      cifraYSi = { total: (d?.total ?? 0) + n, conAviso: !!d?.conAviso || n > 0 };
    }, 150);
    return () => clearTimeout(t);
  });
  const etiquetaYSi = $derived(
    cifraYSi.total ? `¿Y si…?, ${cifraYSi.total} ${cifraYSi.total === 1 ? "diferencia" : "diferencias"}${cifraYSi.conAviso ? ", con avisos" : ""}` : "¿Y si…?",
  );

  // La pestaña «Ficha» (spec 009, RF-35, RF-43): se decide sin leer la nota, para que no parpadee
  const conFicha = $derived.by(() => {
    void estado.version;
    const p = pieza;
    const s = estado.sesion;
    if (!p || !s || p.tipo === "serie" || p.tipo === "punto" || p.tipo === "evento" || !s.fichas.get(p.id)?.existe) return null;
    return rutaFicha(s.modelo.serie.wiki, p) ? p : null;
  });
  // Si la nueva pieza no tiene ficha, el panel vuelve a Editar (RF-37c)
  const pestana = $derived<Pestana>(estado.pestana === "ficha" && !conFicha ? "editar" : estado.pestana);
  $effect(() => {
    if (estado.pestana === "ficha" && !conFicha) estado.pestana = "editar";
  });

  const PESTANAS = $derived<{ p: Pestana; texto: string }[]>([
    { p: "editar", texto: "Editar" },
    { p: "efectos", texto: "Si lo dejas así…" },
    ...(estado.variante ? [{ p: "ysi" as const, texto: "¿Y si…?" }] : []),
    { p: "guia", texto: "Guía" },
    ...(conFicha ? [{ p: "ficha" as const, texto: "Ficha" }] : []),
    { p: "comprobar", texto: "Comprobar" },
  ]);
</script>

<aside class="insp">
  {#if pieza && cabecera}
    <div class="ih">
      <div class="k">
        {#if pieza.tipo === "serie"}<Orbit class="i" />
        {:else if pieza.tipo === "temporada"}<Layers2 class="i" />
        {:else if pieza.tipo === "punto"}<IconoPunto clase={pieza.clase} />
        {:else if pieza.tipo === "episodio"}<Clapperboard class="i" />
        {:else if pieza.tipo === "arco"}<span class="dot" style:background={`var(--t${pieza.color})`}></span>
        {:else if pieza.tipo === "evento"}<Sparkle class="i" />
        {:else}<EyeOff class="i" />{/if}
        {cabecera.etiqueta}
      </div>
      <!-- Un secreto se enfoca desde su título (spec 010, RF-2): toma el foco para la tecla de menú y Mayús F10 -->
      {#if pieza.tipo === "secreto" && lenteDeSecreto(pieza)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <h3 tabindex="0" use:enfocable={{ estado, lente: lenteDeSecreto(pieza) }}>{cabecera.titulo}</h3>
      {:else}
        <h3>{cabecera.titulo}</h3>
      {/if}
      <div class="ysi-pieza">
        <button class="btn ghost" title="Abre una variante «¿Y si…?» para probar otra versión de esta pieza sin tocar la serie" onclick={() => estado.probarOtraVersion(pieza!.id)}>
          <FlaskConical class="i" />Probar otra versión
        </button>
        {#if versiones.length}
          <button class="btn ghost" aria-expanded={verVersiones} onclick={() => (verVersiones = !verVersiones)}>Versiones ({versiones.length})</button>
        {/if}
        {#if pieza.tipo === "episodio" || pieza.tipo === "evento" || pieza.tipo === "arco" || pieza.tipo === "secreto"}
          <LlevarSala origen={{ tipo: "pieza", id: pieza.id }} compacto />
        {/if}
      </div>
      {#if verVersiones && versiones.length}
        <ul class="versiones" aria-label="Versiones de esta pieza">
          {#each versiones as c (c.id)}
            <li>
              <span class="nm" title={c.nombre}>
                {#if choquesVersion[c.id]}<TriangleAlert class="i choque" /><span class="solo-lector">Con choques: </span>{/if}{c.nombre}
              </span>
              <small>{fechaCorta(c.cambiada)}{estado.variante?.datos.id === c.id ? " · abierta" : ""}</small>
              <span class="acc">
                <button class="btn ghost" onclick={() => estado.verLadoALado(pieza!.id, c.id)}>Lado a lado</button>
                <button class="btn ghost" onclick={() => estado.pedirAplicar(c.id, "versiones")}>Aplicar</button>
                <button class="btn" disabled={estado.variante?.datos.id === c.id} onclick={() => estado.abrirVariante(c.id)}>Abrir</button>
              </span>
              <ConfirmarAplicar id={c.id} donde="versiones" />
            </li>
          {/each}
        </ul>
      {/if}
      <div class="tabs" role="tablist">
        {#each PESTANAS as t (t.p)}
          <button
            role="tab"
            aria-selected={pestana === t.p}
            aria-label={t.p === "efectos" ? etiquetaEfectos : t.p === "ysi" ? etiquetaYSi : undefined}
            class:on={pestana === t.p}
            onclick={() => (estado.pestana = t.p)}
          >
            {t.texto}{#if t.p === "comprobar" && nAvisos}<span class="n">{nAvisos}</span>{/if}
            {#if t.p === "ysi" && cifraYSi.total}
              {#if cifraYSi.conAviso}<TriangleAlert class="i aviso-efectos" aria-hidden="true" />{/if}<span class="n cifra" aria-hidden="true">{cifraYSi.total > 99 ? "99+" : cifraYSi.total}</span>
            {/if}
            {#if t.p === "efectos" && cifra.total}
              {#if cifra.conAviso}<TriangleAlert class="i aviso-efectos" aria-hidden="true" />{/if}<span class="n cifra" aria-hidden="true">{cifra.total > 99 ? "99+" : cifra.total}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    {#if pestana === "editar"}
      {#key pieza.id}
      {#if retcon}
        <div class="retcon">
          <div class="warnbox"><BookAlert class="i" /><span>Esto es canon: si lo cambias, es un <b>retcon</b>. Anótalo en Canon y reglas.</span></div>
        </div>
      {/if}
      {#if soloLectura && estado.viendoAhora}
        <div class="retcon">
          <div class="warnbox info" role="status">
            <Eye class="i" />
            <span>{VIENDO_AHORA} <button class="enlace" onclick={() => estado.verAhora(false)}>Ver cómo quedaría</button></span>
          </div>
        </div>
      {:else if canonEnSerie}
        <div class="retcon">
          <div class="warnbox info">
            <FlaskConical class="i" />
            <span>Canon: en la variante se puede probar; al aplicar habrá que desbloquearla.</span>
          </div>
        </div>
      {:else if bloqueada}
        <div class="retcon">
          {#if desbloqueando}
            <div class="warnbox" role="alertdialog" aria-label="Confirmar el desbloqueo">
              <BookAlert class="i" />
              <div>
                <p>Cambiar algo de canon es un <b>retcon</b>. Anótalo en Canon y reglas. Se desbloquea hasta cerrar la serie y sigue siendo canon.</p>
                <div class="botones">
                  <button class="btn ghost" onclick={() => (desbloqueando = false)}>Cancelar</button>
                  <button class="btn pri" onclick={desbloquear}>Desbloquear</button>
                </div>
              </div>
            </div>
          {:else}
            <div class="warnbox info">
              <LockKeyhole class="i" />
              <span>Es canon y está bloqueada para no cambiarla por descuido. <button class="enlace" onclick={() => (desbloqueando = true)}>Desbloquear</button></span>
            </div>
          {/if}
        </div>
      {/if}
      <AvisosPieza piezaId={pieza.id} />
      <fieldset class="bloque" disabled={bloqueada || soloLectura}>
      {#if pieza.tipo === "serie"}
        <EditarSerie serie={pieza} />
      {:else if pieza.tipo === "temporada"}
        <EditarTemporada temporada={pieza} />
      {:else if pieza.tipo === "punto"}
        <EditarPunto punto={pieza} />
      {:else if pieza.tipo === "arco"}
        <EditarArco arco={pieza} />
      {:else if pieza.tipo === "episodio"}
        <EditarEpisodio episodio={pieza} />
      {:else if pieza.tipo === "secreto"}
        <EditarSecreto secreto={pieza} />
      {:else if pieza.tipo === "evento"}
        <EditarEvento evento={pieza} />
      {/if}
      </fieldset>
      {/key}
    {:else if pestana === "ysi" && estado.variante}
      <PestanaYSi />
    {:else if pestana === "efectos"}
      {#key pieza.id}<SiLoDejas />{/key}
    {:else if pestana === "guia"}
      {#key pieza.id}<Guia {pieza} />{/key}
    {:else if pestana === "ficha" && conFicha}
      <!-- Otra pieza u otra sesión (la variante, «Ver ahora»): se vuelve a leer -->
      {#key estado.sesion}{#key conFicha.id}<PestanaFicha pieza={conFicha} />{/key}{/key}
    {:else}
      <Comprobar />
    {/if}

    <!-- Pie fijo abajo; la confirmación de borrar sale encima, siempre a la vista -->
    <div class="pie">
      {#each avisosCambio as a (a)}
        <div class="warnbox aviso-cambio"><TriangleAlert class="i" /><span>{a}</span></div>
      {/each}
      {#if estado.avisoFicha}
        <div class="warnbox aviso-cambio" role="alert">
          <TriangleAlert class="i" /><span>{estado.avisoFicha}</span>
          <button class="cerrar-aviso" aria-label="Cerrar el aviso" title="Cerrar el aviso" onclick={() => (estado.avisoFicha = null)}><X class="i" /></button>
        </div>
      {/if}
      {#if guardado.aviso}
        <!-- Se queda hasta que se cierra o se vuelve a tocar esa pieza -->
        <div class="warnbox aviso-cambio" role="status">
          <TriangleAlert class="i" /><span>{guardado.aviso}</span>
          <button class="cerrar-aviso" aria-label="Cerrar el aviso" title="Cerrar el aviso" onclick={() => estado.sesion?.guardadoVisible.quitarAviso()}><X class="i" /></button>
        </div>
      {/if}
      {#if confirmando}
        <div class="confirmar">
          <p>¿Borrar «{cabecera.titulo}»? Va a <span class="wkpath">_papelera/</span>. {aviso}</p>
          <p class="nota">Si solo no va, mejor márcalo como descartado.</p>
          <div class="botones">
            <button class="btn ghost" onclick={() => (confirmando = false)}>Cancelar</button>
            <button class="btn borrar" onclick={borrar}><Trash2 class="i" />Borrar</button>
          </div>
        </div>
      {/if}
      <div class="ifoot">
        {#if guardado.error}
          <TriangleAlert class="i error" /><span class="error">{guardado.error}</span>
        {:else if guardado.pendiente}
          <LoaderCircle class="i" />Guardando…
        {:else if guardado.ultimo}
          <Check class="i" />Guardado {hace(guardado.ultimo)}
        {:else}
          <Check class="i" />Todo guardado
        {/if}
        {#if pieza.tipo !== "serie"}
          <button class="btn ghost sp quitar" title={soloLectura ? VIENDO_AHORA : bloqueada ? "Es canon: desbloquéala antes" : "Va a la papelera de la serie"} disabled={bloqueada || soloLectura} onclick={() => (confirmando = true)}>
            <Trash2 class="i" />Borrar {NOMBRE_PIEZA[pieza.tipo]}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="vacio">
      <MousePointerClick class="i" />
      <p>Elige una pieza para verla y editarla aquí.</p>
    </div>
  {/if}
</aside>

<style>
  .ysi-pieza {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin: 4px 0 2px -11px;
  }
  .ysi-pieza .btn {
    font-size: 12px;
    padding: 4px 11px;
  }
  .versiones {
    list-style: none;
    margin: 4px 0 8px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .versiones li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 8px;
    align-items: center;
    padding: 4px 6px;
    border-radius: 8px;
  }
  .versiones li:hover {
    background: var(--hover);
  }
  .versiones .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .versiones .nm :global(.choque) {
    width: 13px;
    height: 13px;
    color: var(--warn);
    vertical-align: -2px;
    margin-right: 4px;
  }
  .versiones small {
    grid-row: 2;
    color: var(--ink-3);
    font-size: 11px;
  }
  .versiones .acc {
    grid-row: 1 / 3;
    grid-column: 2;
    display: flex;
    gap: 2px;
  }
  .versiones li :global(.confirmar) {
    grid-column: 1 / 3;
    margin-top: 6px;
  }
  /* Con «Si lo dejas así…» y sus cifras puede no caber: cada pestaña en una línea, y la fila sigue debajo */
  .tabs {
    flex-wrap: wrap;
    row-gap: 0;
  }
  .tabs button {
    white-space: nowrap;
  }
  .tabs .n.cifra {
    background: var(--line-2);
    color: var(--ink);
  }
  .tabs :global(.aviso-efectos) {
    width: 13px;
    height: 13px;
    color: var(--warn);
  }
  .retcon {
    padding: 16px 20px 0;
  }
  .retcon b {
    font-weight: 500;
  }
  .retcon p {
    margin: 0 0 8px;
  }
  .retcon .botones {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .bloque {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  /* Sin opacidad, que bajaría el texto de 4,5:1 (RF-34): el texto, en --ink-2 */
  .bloque:disabled :global(:is(input, textarea, select)) {
    color: var(--ink-2);
  }
  .aviso-cambio {
    margin: 0 16px 8px;
  }
  .cerrar-aviso {
    margin-left: auto;
    color: var(--ink-2);
    flex: none;
  }
  .cerrar-aviso:hover {
    color: var(--ink);
  }
  .ifoot :global(.error) {
    color: var(--warn);
  }
  /* Naranja (color de aviso) para que no se confunda con nada más */
  .btn.quitar {
    padding: 4px 10px;
    color: var(--warn);
    border: 1px solid color-mix(in srgb, var(--warn) 45%, transparent);
    background: color-mix(in srgb, var(--warn) 10%, transparent);
  }
  .btn.quitar:hover {
    background: color-mix(in srgb, var(--warn) 20%, transparent);
    border-color: var(--warn);
  }
  .pie {
    position: sticky;
    bottom: 0;
    margin-top: auto;
    z-index: 3;
    background: var(--surface-2);
  }
  .pie .ifoot {
    position: static;
  }
  .confirmar {
    padding: 12px 20px 12px;
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--warn) 6%, var(--surface));
    font-size: 12.5px;
  }
  .confirmar p {
    margin: 0 0 6px;
  }
  .confirmar .nota {
    color: var(--ink-3);
    font-size: 11.5px;
  }
  .botones {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
  .btn.borrar {
    background: var(--warn);
    color: #fff;
    border-color: transparent;
  }
  .vacio {
    margin: auto;
    padding: 24px;
    text-align: center;
    color: var(--ink-3);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .vacio p {
    margin: 0;
    font: italic 16px/1.35 var(--serif);
    color: var(--ink-2);
  }
</style>
