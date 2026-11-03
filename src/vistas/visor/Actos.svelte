<script lang="ts">
  // El nivel episodio del visor por actos (spec 003, RF-7 a RF-23): cuatro
  // columnas fijas (y Sin acto si hace falta), la curva debajo, el teclado en
  // dos dimensiones y Alt + flechas para mover la escena enfocada.
  import { tick } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { AVISO_EPISODIO_CANON, curva, type ActoVisor, type Tecla } from "../../lib/vistas/actos";
  import * as c from "../../lib/modelo/consultas";
  import { columnasActos } from "../../lib/vistas/visor";
  import { usarMarcas } from "./marcas";
  import { limpiar } from "./arrastre-visor";
  import ColumnaActo from "./ColumnaActo.svelte";
  import Curva from "./Curva.svelte";

  const { episodio }: { episodio: string } = $props();
  const estado = usarEstado();

  /** Acto del que salió la tarjeta que se arrastra (Sin acto sigue visible, RF-8) */
  let desde = $state<ActoVisor | null>(null);

  // Sin acto sigue visible si una escena estaba ahí y se fue (spec 005, RF-28)
  const marcas = usarMarcas();
  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const estaba = !!marcas()?.estabanAqui.some((x) => x.acto === "");
    return {
      cols: columnasActos(s.modelo, episodio, s.resultado().avisos, desde === "" || estaba),
      tramos: curva(c.eventosDeEpisodio(s.modelo, episodio)),
      bloqueo: s.estaBloqueada(episodio) ? AVISO_EPISODIO_CANON : null,
    };
  });

  let caja: HTMLElement;
  const TECLAS: Record<string, Tecla> = { ArrowUp: "arriba", ArrowDown: "abajo", ArrowLeft: "izquierda", ArrowRight: "derecha" };

  /** Tarjetas y «+ Escena» de cada columna, en orden */
  const columnas = () =>
    [...caja.querySelectorAll<HTMLElement>(".acto")].map((a) => ({
      tarjetas: [...a.querySelectorAll<HTMLElement>(".colv")],
      mas: a.querySelector<HTMLElement>(".mas"),
    }));

  async function teclas(e: KeyboardEvent) {
    const tecla = TECLAS[e.key];
    const el = document.activeElement as HTMLElement | null;
    if (!tecla || !el || !caja.contains(el) || e.ctrlKey || e.metaKey) return;
    // Lo atendemos aquí: que el visor de arriba no mueva también el foco
    e.preventDefault();
    e.stopPropagation();
    if (e.altKey) {
      const id = el.classList.contains("colv") ? el.dataset.id : undefined;
      // Mantener la tecla no repite (RF-21)
      if (!id || e.repeat) return;
      if (await estado.moverConTecla(id, tecla)) {
        await tick();
        caja.querySelector<HTMLElement>(`.colv[data-id="${CSS.escape(id)}"]`)?.focus();
      }
      return;
    }
    const cols = columnas();
    const i = cols.findIndex((x) => x.tarjetas.includes(el) || x.mas === el);
    if (i < 0) return;
    const items = [...cols[i].tarjetas, ...(cols[i].mas ? [cols[i].mas!] : [])];
    const j = items.indexOf(el);
    if (tecla === "arriba" || tecla === "abajo") {
      items[Math.max(0, Math.min(items.length - 1, j + (tecla === "abajo" ? 1 : -1)))]?.focus();
      return;
    }
    const otra = cols[i + (tecla === "derecha" ? 1 : -1)];
    if (!otra) return;
    (otra.tarjetas.length ? otra.tarjetas[Math.min(j, otra.tarjetas.length - 1)] : otra.mas)?.focus();
  }

  // Si la tarjeta desaparece mientras se arrastra (se movió, se borró fuera), se suelta sin más
  function acabar() {
    limpiar();
    estado.arrastrando = false;
    desde = null;
  }
</script>

<svelte:window ondragend={acabar} ondrop={acabar} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="actos" role="group" aria-label="Escenas del episodio por actos" onkeydown={teclas} bind:this={caja}>
  <div class="columnas-actos">
    {#each d.cols as col (col.acto)}
      <ColumnaActo {col} {episodio} bloqueo={d.bloqueo} alArrastrar={(a) => (desde = a)} />
    {/each}
  </div>
  <Curva tramos={d.tramos} />
  {#if d.bloqueo}<p class="porque-actos">{d.bloqueo}</p>{/if}
</div>
