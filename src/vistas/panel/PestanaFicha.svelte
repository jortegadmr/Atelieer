<script lang="ts">
  // Pestaña «Ficha» (spec 009, RF-35 a RF-44): la ficha de la pieza en la wiki,
  // apartado a apartado, tal como está escrita. Cada apartado se guarda en la
  // nota al salir del campo y a los 2 s sin escribir, fuera del Ctrl Z de la
  // app. Los títulos se crean, cambian y borran en Obsidian.
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import Eye from "@lucide/svelte/icons/eye";
  import LockKeyhole from "@lucide/svelte/icons/lock-keyhole";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { onDestroy, untrack } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { abrirUrl } from "../../lib/app/plataforma";
  import { AVISO_FICHA_CANON } from "../../lib/app/sesion";
  import { WIKI_AL_APLICAR } from "../../lib/app/sesion-variante";
  import type { Arco, Episodio, Secreto, Temporada } from "../../lib/modelo/tipos";
  import type { FichaLeida } from "../../lib/wiki/editar-ficha";
  import EstadoAntiguo from "./EstadoAntiguo.svelte";

  const { pieza }: { pieza: Temporada | Episodio | Arco | Secreto } = $props();
  const estado = usarEstado();
  // La sesión de cuando se abrió la pestaña: el panel la vuelve a abrir si cambia
  const s = estado.sesion!;
  const serie = estado.sesionSerie!;
  const id = untrack(() => pieza.id);

  let leida = $state<FichaLeida | null>(null);
  let textos = $state<string[]>([]);
  let leyendo = $state(true);
  /** Apartados con texto sin guardar */
  const sucios = new Set<number>();
  let error = $state<{ mensaje: string; fuera: boolean } | null>(null);
  let aviso = $state<string | null>(null);
  let viva = true;
  /** Las veces que la app había escrito en la ficha cuando se leyó: si sube, se vuelve a leer (RF-38) */
  let escritas = 0;

  const nombre = $derived(leida ? leida.ruta.replace(/^.*\//, "").replace(/\.md$/, "") : "");
  const url = $derived(leida ? s.wiki.urlObsidian(leida.ruta) : "");

  // Solo lectura: en la variante (RF-42), con «Ver ahora» o canon bloqueado (RF-41)
  const porQueNo = $derived.by(() => {
    void estado.version;
    if (s !== serie) return WIKI_AL_APLICAR;
    if (s.edicionBloqueada) return s.edicionBloqueada;
    if (s.estaBloqueada(id)) return AVISO_FICHA_CANON;
    return null;
  });

  async function leer(todo: boolean) {
    const r = await s.leerFichaDe(id);
    if (!viva) return;
    leyendo = false;
    if (!r) {
      if (todo) leida = null;
      return;
    }
    escritas = s.fichasEscritas.get(r.ruta) ?? 0;
    // Lo que el autor tiene sin guardar se queda en su campo (salvo si cambiaron los apartados)
    const mismos = !!leida && leida.apartados.length === r.apartados.length && leida.apartados.every((a, i) => a.titulo === r.apartados[i].titulo);
    textos = r.apartados.map((a, i) => (!todo && mismos && sucios.has(i) ? textos[i] : a.texto));
    if (todo || !mismos) sucios.clear();
    leida = r;
  }
  void leer(true);

  // La app escribió en la ficha (estado, alternativas…): se vuelve a leer, no es un cambio de fuera
  $effect(() => {
    void estado.version;
    const ruta = untrack(() => leida?.ruta);
    // Lo que escribe la propia pestaña no se relee: el campo se quedaría sin el salto que el autor acaba de poner
    if (ruta && !propia && (s.fichasEscritas.get(ruta) ?? 0) !== escritas) untrack(() => void (enCurso = enCurso.then(() => leer(false))));
  });

  /** Que alguien lo sepa: la pestaña si sigue abierta, si no, el pie del panel (RF-37c) */
  function informar(m: string, fuera = false) {
    if (viva) error = { mensaje: m, fuera };
    else estado.avisoFicha = m;
  }

  let enCurso: Promise<void> = Promise.resolve();
  /** La pestaña está guardando: la escritura que cuenta la sesión es suya */
  let propia = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  /** Guarda los apartados sin guardar, uno detrás de otro */
  function guardar(): Promise<void> {
    clearTimeout(temporizador);
    enCurso = enCurso.then(async () => {
      for (const i of [...sucios].sort((a, b) => a - b)) {
        if (!leida) return;
        const texto = textos[i];
        let r;
        const antes = s.fichasEscritas.get(leida.ruta) ?? 0;
        propia = true;
        try {
          r = await s.guardarApartado(id, leida, i, texto);
        } catch (e) {
          r = { ok: false as const, mensaje: `No se pudo guardar la ficha: ${(e as Error).message}`, motivo: "no se pudo escribir" as const };
        } finally {
          propia = false;
        }
        if (!r.ok) {
          informar(r.mensaje, r.motivo === "cambió fuera");
          return;
        }
        // Si siguió escribiendo mientras se guardaba, queda pendiente lo nuevo
        if (textos[i] === texto) sucios.delete(i);
        leida = r.leida;
        // Si además escribió otro (estado, alternativas), se relee al acabar
        const ahora = s.fichasEscritas.get(r.leida.ruta) ?? 0;
        escritas = ahora > antes + (r.escrita ? 1 : 0) ? antes : ahora;
        if (viva) error = null;
        if (r.aviso) aviso = r.aviso;
      }
      if (leida && (s.fichasEscritas.get(leida.ruta) ?? 0) !== escritas) await leer(false);
    });
    return enCurso.finally(() => {
      if (!sucios.size && serie.fichaPendiente === pendiente) serie.fichaPendiente = null;
    });
  }
  // Lo que la app llama antes de escribir en una ficha o de cambiar de contexto (RF-37c, RF-38)
  const pendiente = () => guardar();

  function escribir(i: number, v: string) {
    textos[i] = v;
    sucios.add(i);
    serie.fichaPendiente = pendiente;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => void guardar(), 2000);
  }

  async function verLaDeObsidian() {
    error = null;
    sucios.clear();
    if (serie.fichaPendiente === pendiente) serie.fichaPendiente = null;
    leyendo = true;
    await leer(true);
  }

  onDestroy(() => {
    viva = false;
    // Al cambiar de pieza, de pestaña o de vista: se guarda lo pendiente (RF-37c)
    if (sucios.size && !porQueNo) void guardar();
  });

  function crecer(el: HTMLTextAreaElement) {
    const medir = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    medir();
    $effect(() => {
      void textos;
      medir();
    });
  }

  const idCampo = (i: number) => `ficha-${id}-${i}`;
</script>

<div class="ib-body">
  {#if leida}
    <div class="cab">
      <div class="nm">
        <span class="lbl">Ficha</span>
        <b>{nombre}</b>
        <span class="wkpath">{leida.estadoWiki ? `estado_canon: ${leida.estadoWiki}` : "Sin estado en la wiki"}</span>
      </div>
      <a class="btn ghost" href={url} onclick={(e) => (e.preventDefault(), url && abrirUrl(url))} draggable="false"><ArrowUpRight class="i" />Abrir en Obsidian</a>
    </div>
    <EstadoAntiguo {id} />
    {#if porQueNo}
      <div class="warnbox info" role="status">
        {#if porQueNo === AVISO_FICHA_CANON}<LockKeyhole class="i" />{:else}<Eye class="i" />{/if}<span>{porQueNo}</span>
      </div>
    {/if}
    {#if error}
      <div class="warnbox" role="alert">
        <TriangleAlert class="i" />
        <span>{error.mensaje}{#if error.fuera}{" "}<button class="enlace" onclick={verLaDeObsidian}>Ver la de Obsidian</button>{/if}</span>
      </div>
    {/if}
    {#if aviso}<div class="warnbox" role="status"><TriangleAlert class="i" /><span>{aviso}</span></div>{/if}
    {#each leida.apartados as a, i (i)}
      <div class="f">
        <label for={idCampo(i)}>{a.titulo}</label>
        <textarea
          id={idCampo(i)}
          class="v ta"
          rows="2"
          spellcheck="true"
          readonly={!!porQueNo}
          value={textos[i]}
          oninput={(e) => escribir(i, e.currentTarget.value)}
          onblur={() => {
            if (sucios.size) void guardar();
          }}
          use:crecer
        ></textarea>
      </div>
    {/each}
    <p class="nota">Los apartados se crean, se renombran y se borran en Obsidian.</p>
  {:else if leyendo}
    <p class="nota">Leyendo la ficha…</p>
  {:else}
    <div class="warnbox"><TriangleAlert class="i" /><span>La ficha ya no está en la wiki.</span></div>
  {/if}
</div>

<style>
  .cab {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .nm {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .nm b {
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .lbl {
    font-size: 11px;
    color: var(--ink-3);
  }
  .cab .btn {
    text-decoration: none;
    flex: none;
    font-size: 12px;
    padding: 4px 10px;
  }
  textarea {
    width: 100%;
    resize: none;
    white-space: pre-wrap;
  }
  textarea[readonly] {
    color: var(--ink-2);
    background: transparent;
  }
  .enlace {
    text-decoration: underline;
    color: inherit;
  }
  .nota {
    font-size: 11.5px;
    color: var(--ink-3);
    margin: 0;
  }
</style>
