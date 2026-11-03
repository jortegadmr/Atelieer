<script lang="ts">
  // El visor con zoom (spec 002): arriba en todas las vistas, una columna por
  // pieza del nivel (RF-1 a RF-10). Se mueve con Tab y con las flechas (RF-13).
  // En el nivel episodio, las escenas por actos (spec 003).
  import Plus from "@lucide/svelte/icons/plus";
  import { tick } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { opcionesNuevo } from "../../lib/vistas/crear";
  import { bandejaVisor, columnas, textoVacio } from "../../lib/vistas/visor";
  import X from "@lucide/svelte/icons/x";
  import Actos from "./Actos.svelte";
  import { arrastrada, limpiar } from "./arrastre-visor";
  import ColumnaBandeja from "./ColumnaBandeja.svelte";
  import Columna from "./Columna.svelte";
  import { marcasVisor, TEXTOS_ANTES } from "../../lib/consecuencias/visor";
  import { fuenteMarcas } from "../../lib/consecuencias/fuente";
  import { soloDeUnLado } from "../../lib/variantes/visor";
  import { ponerMarcas } from "./marcas";

  const estado = usarEstado();

  // «Si lo dejas así…» (spec 005, RF-27 a RF-29): solo con su pestaña abierta y algo cambiado.
  // Si no, con una variante abierta, lo distinto de «Cómo quedaría» en acento (spec 006, RF-17, RF-18)
  const marcas = $derived.by(() => {
    void estado.version;
    const f = fuenteMarcas(estado);
    if (!f) return null;
    const r = marcasVisor(f.base, f.actual, estado.nivel, f.ids);
    if (!f.fantasma) return r;
    // RF-34: con un arco o un secreto elegido, de qué lado pasa solo
    const id = estado.seleccion;
    const [serie, quedaria] = estado.viendoAhora ? [f.actual, f.base] : [f.base, f.actual];
    const solo = id && f.ids.includes(id) ? soloDeUnLado(serie, quedaria, estado.nivel, id) : undefined;
    return { ...r, fantasma: true, textos: f.textos, solo };
  });
  ponerMarcas(() => marcas);

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const n = estado.nivel;
    const primera = opcionesNuevo(s.modelo, n, (id) => s.estaBloqueada(id))[0];
    return {
      cols: columnas(s.modelo, n, s.resultado().avisos),
      vacio: textoVacio(s.modelo, n),
      primera,
      clave: n.tipo === "serie" ? "serie" : n.tipo === "temporada" ? n.temporada : n.episodio,
      hondo: n.tipo === "serie" ? 0 : n.tipo === "temporada" ? 1 : 2,
      episodio: n.tipo === "episodio" ? n.episodio : null,
      bandeja: n.tipo === "temporada" ? bandejaVisor(s.modelo, n.temporada, s.resultado().avisos) : null,
    };
  });

  // `d` es nuevo con cada cambio del modelo; el nivel solo cambia con su clave
  const clave = $derived(d.clave);

  // El porqué de un movimiento rechazado es de este nivel: al cambiar, se va.
  // Un arrastre a medias también: su tarjeta ya no está y no llegará su dragend
  $effect(() => {
    void clave;
    estado.quitarAvisoVisor();
    acabarArrastre();
  });

  function acabarArrastre() {
    limpiar();
    estado.arrastrando = false;
    destino = null;
  }

  // Un fichero soltado desde fuera no hace nada (RF-27): sin esto la ventana lo abriría
  function ficheroDeFuera(e: DragEvent) {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "none";
  }

  // Hacia dónde va la animación: bajar acerca, subir aleja (RF-19)
  let antes = 0;
  let sube = $state(false);
  $effect.pre(() => {
    sube = d.hondo < antes;
    antes = d.hondo;
  });

  // Si el foco estaba en el visor, al cambiar de nivel va a la pieza elegida o a
  // la primera: las columnas de antes desaparecen y el foco se perdería
  let caja: HTMLElement;
  let focoDentro = false;
  const alEnfocar = (e: FocusEvent) => (focoDentro = !!caja && caja.contains(e.target as Node));
  $effect(() => {
    void clave;
    if (!focoDentro) return;
    void tick().then(() => {
      const elegida = estado.seleccion ? caja.querySelector<HTMLElement>(`.colv[data-id="${CSS.escape(estado.seleccion)}"]`) : null;
      (elegida ?? caja.querySelector<HTMLElement>(".colv, .vacio-v button, .actos .mas"))?.focus();
    });
  });

  // Llevar una escena de la bandeja a la columna de un episodio (spec 003, RF-31)
  let destino = $state<string | null>(null);
  function encima(e: DragEvent, ep: string) {
    if (!arrastrada(e, estado.sesion!.carpeta)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    destino = ep;
  }
  async function soltar(e: DragEvent, ep: string) {
    const id = arrastrada(e, estado.sesion!.carpeta);
    destino = null;
    if (!id) return;
    e.preventDefault();
    acabarArrastre();
    // Solo lo que está en la bandeja de esta temporada
    if (d.bandeja?.some((x) => x.id === id)) await estado.llevarAEpisodio(id, ep);
  }

  function flechas(e: KeyboardEvent) {
    const paso = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!paso) return;
    const botones = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".colv")];
    const i = botones.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    botones[Math.max(0, Math.min(botones.length - 1, i + paso))].focus();
  }
</script>

<svelte:window onfocusin={alEnfocar} ondragend={acabarArrastre} ondragover={ficheroDeFuera} ondrop={(e) => (ficheroDeFuera(e), acabarArrastre())} />

<section class="visor card" aria-label="Visor de la serie" bind:this={caja}>
  {#if estado.avisoVisor}
    <p class="aviso-visor" role="alert">
      {estado.avisoVisor}
      <button class="btn ghost cerrar-aviso" aria-label="Cerrar el aviso" onclick={() => estado.quitarAvisoVisor()}><X class="i" /></button>
    </p>
  {/if}
  <p class="solo-lector" aria-live="polite">{estado.anuncioVisor}</p>
  {#key d.clave}
    {#if d.episodio}
      <div class="board" class:sube>
        <Actos episodio={d.episodio} />
      </div>
    {:else}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="board" class:sube role="group" aria-label="Piezas de este nivel" onkeydown={flechas}>
      {#each d.cols as col (col.id)}
        {#if col.tipo === "episodio" && d.bandeja}
          <Columna
            {col}
            destino={destino === col.id}
            ondragover={(e: DragEvent) => encima(e, col.id)}
            ondragleave={() => (destino = null)}
            ondrop={(e: DragEvent) => soltar(e, col.id)}
          />
        {:else}
          <Columna {col} />
        {/if}
      {:else}
        <div class="vacio-v">
          {d.vacio}
          {#if d.primera && d.primera.que !== "idea"}
            {#if d.primera.bloqueo}
              <button class="btn" aria-disabled="true" aria-describedby="porque-vacio"><Plus class="i" />{d.primera.nombre}</button>
              <span class="porque" id="porque-vacio">{d.primera.bloqueo}</span>
            {:else}
              <button class="btn" onclick={() => estado.abrirNueva(d.primera!.que as never)}><Plus class="i" />{d.primera.nombre}</button>
            {/if}
          {/if}
        </div>
      {/each}
      {#if d.bandeja}<ColumnaBandeja escenas={d.bandeja} />{/if}
    </div>
    {/if}
  {/key}
  {#if marcas?.yaNoEsta.length}
    <ul class="ya-no">
      {#each marcas.yaNoEsta as x (x.id)}<li><span class="antes" class:fantasma={marcas.fantasma}>{(marcas.textos ?? TEXTOS_ANTES).yaNo}: «{x.titulo}»</span></li>{/each}
    </ul>
  {/if}
</section>
