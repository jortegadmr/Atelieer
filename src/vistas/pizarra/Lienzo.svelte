<script lang="ts">
  import { tick } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { TAMANO_ELEMENTO as T, acercar, encajar, mover as moverEncuadre } from "../../lib/pizarra/encuadre";
  import { aLienzo, elementoEn, sitioLibre, trazoFlecha, type Punto } from "../../lib/pizarra/geometria";
  import { anuncios, nombreElemento } from "../../lib/pizarra/lista";
  import { ordenLectura, ETIQUETA_TIPO } from "../../lib/pizarra/resolver";
  import { COLORES, LIENZO, MAX_NOTA, type Elemento } from "../../lib/pizarra/tipos";

  type Props = {
    /** Para el anuncio de lector de pantalla y el aviso de la barra */
    decir: (texto: string) => void;
    /** Quita el elemento o la flecha (con su copia) y lo dice */
    quitar: (id: string) => Promise<void>;
  };
  let { decir, quitar }: Props = $props();

  const estado = usarEstado();
  const pz = estado.pizarra;

  let caja = $state<HTMLDivElement>();
  /** Mover con el puntero: lo que se ve mientras se arrastra; al soltar es un solo paso */
  let arrastre = $state.raw<{ id: string; x: number; y: number; sx: number; sy: number; ox: number; oy: number; movido: boolean } | null>(null);
  /** Unir con el puntero: de qué elemento sale y dónde está el puntero (en el lienzo) */
  let uniendo = $state.raw<{ de: string; punto: Punto } | null>(null);
  /** «Unir» desde el teclado (Alt + L): el elemento de donde sale la flecha */
  let unionDesde = $state<string | null>(null);
  /** Mover el encuadre arrastrando el fondo */
  let paneo = $state.raw<{ sx: number; sy: number; ex: number; ey: number } | null>(null);

  const enc = $derived(pz.encuadre);
  const elementos = $derived(ordenLectura(pz.pizarra));
  /** El apilado se pinta con z-index: el orden del DOM es el de lectura (el del Tab) */
  const apilado = $derived(new Map(pz.pizarra.elementos.map((e, i) => [e.id, i + 1])));
  const porId = $derived(new Map(pz.pizarra.elementos.map((e) => [e.id, e])));
  /** Cómo está ahora la pieza de cada tarjeta (se redibuja cuando la serie cambia) */
  const piezas = $derived.by(() => {
    void estado.version;
    return new Map(pz.pizarra.elementos.flatMap((e) => (e.tipo === "tarjeta" ? [[e.id, pz.tarjeta(e)] as const] : [])));
  });

  /** Dónde se dibuja un elemento: el sitio de pantalla mientras se arrastra, o el suyo */
  const sitio = (e: Elemento): Punto => (arrastre && arrastre.id === e.id ? { x: arrastre.x, y: arrastre.y } : { x: e.x, y: e.y });

  const dentro = (v: number) => Math.min(LIENZO, Math.max(-LIENZO, v));

  function rect() {
    return caja!.getBoundingClientRect();
  }

  /** El punto del lienzo que está en el centro de lo que se ve */
  export function centroVisible(): Punto {
    const r = rect();
    return aLienzo({ x: r.width / 2, y: r.height / 2 }, pz.encuadre);
  }

  /** Crea una nota en el centro (o en `donde`), la deja con el foco para escribir */
  export async function crearNotaAqui(donde?: Punto) {
    const c = donde ?? centroVisible();
    const s = sitioLibre(pz.pizarra, { x: c.x - T.ancho / 2, y: c.y - T.alto / 2 });
    const r = pz.crearNota(s);
    if ("error" in r) {
      decir(r.error);
      return;
    }
    decir(anuncios.notaCreada());
    await tick();
    enfocarCampo(r.id);
  }

  export function acercarCentro(factor: number) {
    const r = rect();
    pz.encuadre = acercar(pz.encuadre, factor, { x: r.width / 2, y: r.height / 2 });
  }

  export function encajarTodo() {
    const r = rect();
    pz.encuadre = encajar(pz.pizarra, { ancho: r.width, alto: r.height }, pz.encuadre);
  }

  export function enfocarElemento(id: string) {
    caja?.querySelector<HTMLElement>(`.el[data-id="${CSS.escape(id)}"]`)?.focus();
  }

  function enfocarCampo(id: string) {
    caja?.querySelector<HTMLTextAreaElement>(`.el[data-id="${CSS.escape(id)}"] textarea`)?.focus();
  }

  // La rueda desplaza; con Ctrl (o el pellizco del trackpad) acerca. Necesita no ser pasiva
  $effect(() => {
    const el = caja;
    if (!el) return;
    const rueda = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      if (ev.ctrlKey || ev.metaKey) pz.encuadre = acercar(pz.encuadre, Math.exp(-ev.deltaY * 0.0015), { x: ev.clientX - r.left, y: ev.clientY - r.top });
      else pz.encuadre = moverEncuadre(pz.encuadre, -ev.deltaX, -ev.deltaY);
    };
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
  });

  // ---- El fondo: desplazar arrastrando, deseleccionar, doble clic crea una nota ----

  function fondoAbajo(ev: PointerEvent) {
    if (ev.button !== 0 || ev.target !== ev.currentTarget) return;
    pz.seleccion = null;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    paneo = { sx: ev.clientX, sy: ev.clientY, ex: pz.encuadre.x, ey: pz.encuadre.y };
  }
  function fondoMueve(ev: PointerEvent) {
    if (!paneo) return;
    pz.encuadre = { ...pz.encuadre, x: paneo.ex + ev.clientX - paneo.sx, y: paneo.ey + ev.clientY - paneo.sy };
  }
  function fondoSuelta() {
    paneo = null;
  }
  function fondoDoble(ev: MouseEvent) {
    if (ev.target !== ev.currentTarget || pz.soloLectura) return;
    const r = rect();
    const p = aLienzo({ x: ev.clientX - r.left, y: ev.clientY - r.top }, pz.encuadre);
    void crearNotaAqui(p);
  }

  // ---- Mover un elemento con el puntero ----

  function moverAbajo(ev: PointerEvent, e: Elemento) {
    if (ev.button !== 0) return;
    pz.seleccion = e.id;
    if (pz.soloLectura) return;
    pz.subir(e.id);
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    arrastre = { id: e.id, x: e.x, y: e.y, sx: ev.clientX, sy: ev.clientY, ox: e.x, oy: e.y, movido: false };
  }
  function moverMueve(ev: PointerEvent) {
    const a = arrastre;
    if (!a) return;
    const dx = (ev.clientX - a.sx) / pz.encuadre.zoom;
    const dy = (ev.clientY - a.sy) / pz.encuadre.zoom;
    arrastre = { ...a, x: dentro(a.ox + dx), y: dentro(a.oy + dy), movido: a.movido || Math.hypot(ev.clientX - a.sx, ev.clientY - a.sy) > 3 };
  }
  async function moverSuelta(ev: PointerEvent) {
    const a = arrastre;
    if (!a) return;
    arrastre = null;
    if (!a.movido) return;
    const enfocado = (ev.currentTarget as HTMLElement).closest(".el")?.contains(document.activeElement);
    pz.mover(a.id, a.x, a.y);
    const movido = porId.get(a.id);
    if (movido) decir(anuncios.movido(movido));
    if (enfocado) {
      await tick();
      enfocarElemento(a.id);
    }
  }

  // ---- Unir con el puntero ----

  function unirAbajo(ev: PointerEvent, e: Elemento) {
    if (ev.button !== 0 || pz.soloLectura) return;
    ev.stopPropagation();
    pz.seleccion = e.id;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    const r = rect();
    uniendo = { de: e.id, punto: aLienzo({ x: ev.clientX - r.left, y: ev.clientY - r.top }, pz.encuadre) };
  }
  function unirMueve(ev: PointerEvent) {
    if (!uniendo) return;
    const r = rect();
    uniendo = { ...uniendo, punto: aLienzo({ x: ev.clientX - r.left, y: ev.clientY - r.top }, pz.encuadre) };
  }
  function unirSuelta() {
    const u = uniendo;
    uniendo = null;
    if (!u) return;
    const a = elementoEn(pz.pizarra, u.punto);
    if (!a || a.id === u.de) return;
    unirDeA(u.de, a.id);
  }

  /** Une y lo dice: también lo usa el teclado */
  export function unirDeA(de: string, a: string) {
    const r = pz.unir(de, a);
    if ("error" in r) decir(r.error);
    else {
      pz.seleccion = r.id;
      decir(anuncios.flechaCreada(nombre(de), nombre(a)));
    }
  }

  export function nombre(id: string): string {
    return nombreElemento(porId.get(id), piezas.get(id));
  }

  // ---- Notas ----

  function escribe(ev: Event, e: Elemento) {
    const campo = ev.currentTarget as HTMLTextAreaElement;
    if (pz.editarNota(e.id, campo.value)) decir(`La nota llegó al tope de ${MAX_NOTA} caracteres`);
    // Si se cortó, el campo vuelve a lo que de verdad hay
    const n = pz.pizarra.elementos.find((x) => x.id === e.id);
    if (n?.tipo === "nota" && campo.value !== n.texto) campo.value = n.texto;
  }

  function sale(e: Elemento) {
    // Una nota que se queda vacía al salir del campo se quita sola (RF-3)
    if (e.tipo === "nota" && pz.quitarNotaVacia(e.id)) decir("Nota vacía quitada");
  }

  // ---- Teclado (RF-6, RF-12): lo del elemento solo cuenta con el foco en él, no dentro de la nota ----

  const FLECHAS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  async function teclaElemento(ev: KeyboardEvent, e: Elemento) {
    if (ev.target !== ev.currentTarget) return;
    const libre = !ev.ctrlKey && !ev.metaKey && !ev.altKey;
    const dir = FLECHAS[ev.key];
    if (dir && libre) {
      ev.preventDefault();
      if (pz.soloLectura) return;
      const paso = ev.shiftKey ? 50 : 10;
      pz.mover(e.id, dentro(e.x + dir[0] * paso), dentro(e.y + dir[1] * paso));
      decir(anuncios.movido(e));
      await tick();
      enfocarElemento(e.id);
    } else if (ev.key === "Enter" && libre) {
      ev.preventDefault();
      if (unionDesde) {
        if (unionDesde === e.id) return decir("Elige otro elemento para unir, o Esc para cancelar");
        const de = unionDesde;
        unionDesde = null;
        unirDeA(de, e.id);
      } else if (e.tipo === "nota") enfocarCampo(e.id);
      else abrirPieza(e.id);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      if (unionDesde) {
        unionDesde = null;
        decir("Unión cancelada");
      } else pz.seleccion = null;
    } else if ((ev.key === "Delete" || ev.key === "Backspace") && libre) {
      ev.preventDefault();
      if (pz.soloLectura) return;
      const i = elementos.findIndex((x) => x.id === e.id);
      await quitar(e.id);
      await tick();
      const resto = ordenLectura(pz.pizarra);
      if (resto.length) enfocarElemento(resto[Math.min(i, resto.length - 1)].id);
      else caja?.focus();
    } else if (ev.altKey && ev.code === "KeyL" && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      if (pz.soloLectura) return;
      unionDesde = e.id;
      decir(`Unir desde ${nombre(e.id)}: ve con Tab al elemento de destino y pulsa Enter. Esc cancela.`);
    }
  }

  /** Con el foco en el lienzo (tras pulsar una flecha): Supr quita la flecha, Esc deja de seleccionarla */
  async function teclaLienzo(ev: KeyboardEvent) {
    if (ev.target !== ev.currentTarget) return;
    const id = pz.seleccion;
    const flecha = id ? pz.pizarra.flechas.find((f) => f.id === id) : undefined;
    if ((ev.key === "Delete" || ev.key === "Backspace") && flecha && !pz.soloLectura) {
      ev.preventDefault();
      await quitar(flecha.id);
    } else if (ev.key === "Escape") {
      // Con el foco en el lienzo, Esc no saca de la pizarra: solo suelta lo seleccionado
      ev.preventDefault();
      pz.seleccion = null;
    }
  }

  function teclaNota(ev: KeyboardEvent, e: Elemento) {
    if (ev.key !== "Escape") return;
    ev.preventDefault();
    enfocarElemento(e.id);
  }

  function abrirPieza(id: string) {
    const v = piezas.get(id);
    if (v && v.estado !== "ausente") estado.elegir(v.pieza);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="lienzo"
  class:paneando={!!paneo}
  bind:this={caja}
  role="application"
  aria-label="Pizarra libre. Doble clic en el fondo crea una nota."
  tabindex="-1"
  onkeydown={teclaLienzo}
  onpointerdown={fondoAbajo}
  onpointermove={fondoMueve}
  onpointerup={fondoSuelta}
  onpointercancel={fondoSuelta}
  ondblclick={fondoDoble}
>
  <div class="mundo" style:transform="translate({enc.x}px, {enc.y}px) scale({enc.zoom})">
    <svg class="flechas" aria-hidden="true">
      <defs>
        <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="punta" />
        </marker>
        <marker id="punta-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="punta sel" />
        </marker>
      </defs>
      {#each pz.pizarra.flechas as f (f.id)}
        {@const a = porId.get(f.de)}
        {@const b = porId.get(f.a)}
        {#if a && b}
          {@const t = trazoFlecha(sitio(a), sitio(b))}
          {@const sel = pz.seleccion === f.id}
          <g class="flecha" class:sel>
            <line class="golpe" x1={t.desde.x} y1={t.desde.y} x2={t.hasta.x} y2={t.hasta.y} onpointerdown={(ev) => { ev.stopPropagation(); pz.seleccion = f.id; }} role="presentation" />
            <line class="trazo" x1={t.desde.x} y1={t.desde.y} x2={t.hasta.x} y2={t.hasta.y} marker-end={sel ? "url(#punta-sel)" : "url(#punta)"} />
            {#if f.etiqueta}
              <text class="etiqueta" x={t.medio.x} y={t.medio.y} text-anchor="middle" dominant-baseline="middle">{f.etiqueta}</text>
            {/if}
          </g>
        {/if}
      {/each}
      {#if uniendo}
        {@const o = porId.get(uniendo.de)}
        {#if o}
          {@const t = trazoFlecha(sitio(o), uniendo.punto)}
          <line class="trazo provisional" x1={t.desde.x} y1={t.desde.y} x2={uniendo.punto.x} y2={uniendo.punto.y} />
        {/if}
      {/if}
    </svg>

    {#each elementos as e (e.id)}
      {@const s = sitio(e)}
      {@const v = e.tipo === "tarjeta" ? piezas.get(e.id) : undefined}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="el {e.tipo}"
        class:sel={pz.seleccion === e.id}
        class:descartada={v?.estado === "descartada"}
        class:ausente={v?.estado === "ausente"}
        class:moviendo={arrastre?.id === e.id}
        class:origen={unionDesde === e.id}
        data-id={e.id}
        role="group"
        tabindex="0"
        aria-label={e.tipo === "nota" ? `Nota ${COLORES.find((c) => c.id === e.color)?.nombre ?? ""}: ${nombre(e.id).replace(/^la nota /, "")}` : `Tarjeta de ${v?.tipo ? ETIQUETA_TIPO[v.tipo] : "pieza"}: ${v?.titulo ?? ""}`}
        style:left="{s.x}px"
        style:top="{s.y}px"
        style:width="{T.ancho}px"
        style:height="{T.alto}px"
        style:z-index={apilado.get(e.id)}
        style:background={e.tipo === "nota" ? `var(--nota-${e.color})` : undefined}
        onfocus={() => (pz.seleccion = e.id)}
        ondblclick={() => e.tipo === "tarjeta" && abrirPieza(e.id)}
        onkeydown={(ev) => teclaElemento(ev, e)}
      >
        <!-- El agarre es el borde de arriba en la nota y toda la tarjeta -->
        <div
          class="agarre"
          role="presentation"
          onpointerdown={(ev) => moverAbajo(ev, e)}
          onpointermove={moverMueve}
          onpointerup={moverSuelta}
          onpointercancel={moverSuelta}
        ></div>
        {#if e.tipo === "nota"}
          <textarea
            value={e.texto}
            aria-label="Texto de la nota"
            tabindex="-1"
            placeholder="Escribe…"
            readonly={pz.soloLectura}
            oninput={(ev) => escribe(ev, e)}
            onblur={() => sale(e)}
            onkeydown={(ev) => teclaNota(ev, e)}
          ></textarea>
        {:else if v}
          <div class="tarjeta-cuerpo">
            <span class="tipo">{v.tipo ? ETIQUETA_TIPO[v.tipo] : "Pieza"}{v.detalle ? ` · ${v.detalle}` : ""}</span>
            <strong class="titulo">{v.titulo}</strong>
            {#if v.estado === "descartada"}<span class="marca">Descartada</span>{/if}
          </div>
        {/if}
        {#if !pz.soloLectura}
          <button
            class="asa"
            tabindex="-1"
            aria-label="Arrastra hasta otro elemento para unirlos con una flecha"
            title="Arrastra hasta otro elemento para unirlos"
            onpointerdown={(ev) => unirAbajo(ev, e)}
            onpointermove={unirMueve}
            onpointerup={unirSuelta}
            onpointercancel={() => (uniendo = null)}
          ></button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .lienzo {
    position: relative;
    overflow: hidden;
    height: calc(100vh - 330px);
    min-height: 360px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background-color: var(--surface-2);
    background-image: radial-gradient(var(--line-2) 1px, transparent 1px);
    background-size: 24px 24px;
    cursor: grab;
    touch-action: none;
  }
  .lienzo.paneando {
    cursor: grabbing;
  }
  .mundo {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
  }
  .flechas {
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
    z-index: 0;
  }
  .trazo {
    stroke: var(--ink-2);
    stroke-width: 2;
    fill: none;
  }
  .trazo.provisional {
    stroke: var(--accent);
    stroke-dasharray: 6 4;
  }
  .golpe {
    stroke: transparent;
    stroke-width: 16;
    pointer-events: stroke;
    cursor: pointer;
  }
  .flecha.sel .trazo {
    stroke: var(--accent);
    stroke-width: 3;
  }
  .punta {
    fill: var(--ink-2);
  }
  .punta.sel {
    fill: var(--accent);
  }
  .etiqueta {
    font: 500 12px var(--sans);
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--surface-2);
    stroke-width: 5px;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .el {
    position: absolute;
    border-radius: 10px;
    border: 1px solid var(--line-2);
    box-shadow: var(--shadow);
    color: var(--ink);
    cursor: default;
  }
  .el.tarjeta {
    background: var(--surface);
  }
  .el:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .el.sel {
    border-color: var(--accent);
    box-shadow:
      0 0 0 2px var(--accent-soft),
      var(--shadow);
  }
  .el.origen {
    outline: 3px dashed var(--accent);
    outline-offset: 3px;
  }
  .el.moviendo {
    opacity: 0.85;
  }
  .agarre {
    position: absolute;
    inset: 0 0 auto 0;
    height: 18px;
    cursor: grab;
    border-radius: 10px 10px 0 0;
  }
  .tarjeta .agarre {
    inset: 0;
    height: auto;
    border-radius: 10px;
  }
  .el textarea {
    position: absolute;
    inset: 18px 4px 4px 4px;
    width: calc(100% - 8px);
    height: calc(100% - 22px);
    border: 0;
    background: transparent;
    color: inherit;
    font: 13px/1.4 var(--sans);
    resize: none;
    padding: 4px 6px;
    cursor: text;
  }
  .el textarea:focus {
    outline: none;
  }
  .tarjeta-cuerpo {
    position: absolute;
    inset: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
    overflow: hidden;
  }
  .tipo {
    font-size: 11.5px;
    color: var(--ink-3);
  }
  .titulo {
    font: 400 18px/1.25 var(--serif);
    overflow: hidden;
  }
  .marca {
    font-size: 11.5px;
    color: var(--warn);
  }
  .el.descartada .titulo {
    text-decoration: line-through;
    color: var(--ink-3);
  }
  .el.ausente {
    border-style: dashed;
  }
  .el.ausente .titulo {
    font: italic 400 15px var(--sans);
    color: var(--ink-3);
  }
  .asa {
    position: absolute;
    right: -9px;
    top: calc(50% - 9px);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--accent);
    background: var(--surface);
    cursor: crosshair;
    opacity: 0;
    touch-action: none;
  }
  .el:hover .asa,
  .el.sel .asa,
  .asa:focus-visible {
    opacity: 1;
  }
</style>
