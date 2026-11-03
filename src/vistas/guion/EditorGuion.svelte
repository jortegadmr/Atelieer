<script lang="ts">
  // Editor propio del guion de una escena (spec 013, D9). El documento es el
  // modelo (lib/guion/documento.ts); aquí solo se pinta y se traducen los gestos.
  // Todo cambio de texto se intercepta en `beforeinput`, se pasa al modelo y se
  // repinta: el navegador nunca cambia el texto por su cuenta (salvo mientras
  // dura una composición con teclas muertas o IME, que se vuelca al acabar).
  import { tick, untrack } from "svelte";
  import SelectorRef from "./SelectorRef.svelte";
  import {
    aTexto,
    borrarAdelante,
    borrarAtras,
    borrarRango,
    cambiarForzadoLinea,
    enter,
    insertarReferencia,
    insertarTexto,
    limitar,
    limitePalabra,
    ordenar,
    pegar,
    referenciaDe,
    referenciaEn,
    soltarPendientes,
    textoDeRango,
    tiposDelDocumento,
    unidadesATexto,
    type Documento,
    type Linea,
    type Pos,
    type Resultado,
    type Unidad,
    type PegadoPermitido,
  } from "../../lib/guion/documento";
  import { cambiarForzado, enMayusculas, type TipoForzable } from "../../lib/guion/lineas";
  import { construir, partir, resolver, type Ref } from "../../lib/guion/referencias";
  import { consultaLimpia, puedeAbrirConArroba, selectorAbierto } from "../../lib/guion/selector";
  import type { Ficha, TipoFicha } from "../../lib/wiki/fichas";

  type Props = {
    id: string;
    doc: Documento;
    pos: Pos | null;
    soloLectura: boolean;
    etiqueta: string;
    /** Todas las fichas leídas de la wiki: con ellas se resuelve cada referencia */
    fichas: Ficha[];
    buscarFichas: (tipos: TipoFicha[], consulta: string) => Ficha[];
    alEditar: (r: Resultado, clave?: string) => void;
    alPegar: (r: PegadoPermitido) => void;
    alCursor: (p: Pos) => void;
    alDeshacer: () => void;
    alRehacer: () => void;
    /** Flecha arriba en la primera línea o abajo en la última: pasa al bloque vecino */
    alMover: (dir: -1 | 1) => void;
    alAbrirRef: (ref: Ref, ficha: Ficha | null, obsidian: boolean) => void;
    alDecir: (texto: string) => void;
    alEnfocar?: () => void;
    alDesenfocar?: () => void;
  };
  let { id, doc, pos, soloLectura, etiqueta, fichas, buscarFichas, alEditar, alPegar, alCursor, alDeshacer, alRehacer, alMover, alAbrirRef, alDecir, alEnfocar, alDesenfocar }: Props = $props();

  let el = $state<HTMLDivElement>();
  let componiendo = false;
  // El selector de referencias
  let arroba = $state<Pos | null>(null);
  let cerradoEn = $state<number | null>(null);
  let activa = $state(-1);
  let xy = $state({ x: 0, y: 0, arriba: 0 });

  const tipos = $derived(tiposDelDocumento(doc));
  const abierto = $derived(soloLectura || !pos ? null : selectorAbierto(doc, pos, tipos, arroba, cerradoEn));
  const resultados = $derived.by(() => {
    if (!abierto) return [];
    const q = abierto.modo === "personaje" ? consultaLimpia(abierto.consulta) : abierto.consulta;
    return buscarFichas(abierto.modo === "personaje" ? ["personaje"] : ["personaje", "lugar", "era"], q);
  });

  const NOMBRE_TIPO: Record<TipoFicha, string> = { personaje: "personaje", lugar: "lugar", era: "época" };

  // ---- Pintar

  function pintar() {
    if (!el) return;
    el.textContent = "";
    doc.forEach((lin, i) => {
      const d = document.createElement("div");
      d.className = `l t-${tipos[i]}${lin.forzado ? " forzada" : ""}`;
      let buf = "";
      const vuelca = () => {
        if (buf) {
          d.appendChild(document.createTextNode(buf));
          buf = "";
        }
      };
      lin.u.forEach((u, j) => {
        if (typeof u === "string") buf += u;
        else {
          vuelca();
          const f = resolver(u, fichas);
          const nombre = u.alias ?? u.nombre;
          const s = document.createElement("span");
          s.className = f ? "ref" : "ref sin";
          s.contentEditable = "false";
          s.dataset.l = String(i);
          s.dataset.u = String(j);
          s.setAttribute("role", "link");
          s.setAttribute("aria-label", f ? `${nombre}, ${NOMBRE_TIPO[f.tipo]}` : `${nombre}, sin ficha`);
          s.title = f ? `${NOMBRE_TIPO[f.tipo]}: ${f.nombre}` : "Sin ficha en la wiki";
          s.textContent = f ? nombre : `${nombre} (sin ficha)`;
          d.appendChild(s);
        }
      });
      vuelca();
      if (!lin.u.length) d.appendChild(document.createElement("br"));
      el!.appendChild(d);
    });
  }

  // Lo de las fichas que se ve en el guion. La lista se rehace con cada cambio de la serie
  // (al guardar, al leer la wiki): si no cambia esto, no se repinta y un clic a medias no se pierde
  const claveFichas = $derived(fichas.map((f) => `${f.tipo}|${f.ruta}|${f.nombre}|${f.aliases.join("|")}`).join("\n"));

  // Cada vez que cambia el documento (o las fichas) se repinta y, si el foco está aquí, se devuelve el cursor.
  // Solo si cambian de verdad: la prop `doc` avisa aunque llegue el mismo documento (al mover el cursor), y
  // repintar recoloca el cursor, que vuelve a avisar: sin esta guarda el editor se repinta sin parar y los clics se pierden
  let pintado: { doc: Documento; clave: string } | null = null;
  $effect(() => {
    void tipos;
    if (!el || (pintado && pintado.doc === doc && pintado.clave === claveFichas)) return;
    pintado = { doc, clave: claveFichas };
    untrack(pintar);
    const p = untrack(() => pos);
    if (p && el && document.activeElement === el) ponPos(p);
  });

  // ---- Posiciones del DOM <-> modelo (una unidad = un punto de código; una referencia = 1)

  const largoU = (s: string) => [...s].length;

  function unidadesDe(n: Node): number {
    if (n.nodeType === 3) return largoU((n as Text).data);
    return n instanceof HTMLElement && n.classList.contains("ref") ? 1 : 0;
  }

  function aPos(node: Node, off: number): Pos | null {
    if (!el) return null;
    let d: Node | null = node;
    while (d && d.parentNode !== el) d = d.parentNode;
    if (!d) return null;
    const l = [...el.children].indexOf(d as Element);
    let u = 0;
    if (node === d) {
      for (let i = 0; i < off; i++) u += unidadesDe(d.childNodes[i]!);
      return { l, u };
    }
    let n: Node = node;
    while (n.parentNode !== d) n = n.parentNode!;
    for (const c of d.childNodes) {
      if (c === n) break;
      u += unidadesDe(c);
    }
    if (n === node) u += node.nodeType === 3 ? largoU((node as Text).data.slice(0, off)) : off > 0 ? 1 : 0;
    else u += off > 0 ? 1 : 0;
    return { l, u };
  }

  function aDom({ l, u }: Pos): [Node, number] {
    const d = el!.children[l]!;
    let acc = 0;
    for (let i = 0; i < d.childNodes.length; i++) {
      const c = d.childNodes[i]!;
      const n = unidadesDe(c);
      if (c.nodeType === 3) {
        if (u <= acc + n) return [c, [...(c as Text).data].slice(0, u - acc).join("").length];
      } else if (u === acc && n > 0) return [d, i];
      acc += n;
    }
    return [d, d.childNodes.length > 0 && d.lastChild?.nodeName === "BR" ? d.childNodes.length - 1 : d.childNodes.length];
  }

  function rango(): { a: Pos; b: Pos } | null {
    const s = getSelection();
    if (!s || !s.rangeCount || !s.anchorNode || !s.focusNode || !el?.contains(s.anchorNode)) return null;
    const a = aPos(s.anchorNode, s.anchorOffset);
    const f = aPos(s.focusNode, s.focusOffset);
    if (!a || !f) return null;
    const [x, y] = ordenar(a, f);
    return { a: limitar(doc, x), b: limitar(doc, y) };
  }

  function ponPos(p: Pos) {
    if (!el || !el.children.length) return;
    const q = limitar(doc, p);
    const [n, o] = aDom(q);
    const r = document.createRange();
    r.setStart(n, o);
    r.collapse(true);
    const s = getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }

  export function enfocar(donde: "ini" | "fin") {
    el?.focus();
    const p = donde === "ini" ? { l: 0, u: 0 } : { l: doc.length - 1, u: doc[doc.length - 1]!.u.length };
    ponPos(p);
    alCursor(p);
  }

  // El cursor que se ve es el del modelo: se avisa cuando la selección cambia dentro del editor
  $effect(() => {
    const cambio = () => {
      if (!el || componiendo) return;
      const r = rango();
      if (r) alCursor(r.b);
    };
    document.addEventListener("selectionchange", cambio);
    return () => document.removeEventListener("selectionchange", cambio);
  });

  // Dónde poner el selector: junto al cursor
  $effect(() => {
    if (!abierto || !el) return;
    void doc;
    void tick().then(() => {
      const s = getSelection();
      if (!s || !s.rangeCount) return;
      const rc = s.getRangeAt(0).cloneRange();
      rc.collapse(true);
      let b = rc.getBoundingClientRect();
      if (!b.height && el!.children[abierto!.desde.l]) b = el!.children[abierto!.desde.l]!.getBoundingClientRect();
      xy = { x: b.left, y: b.bottom, arriba: b.top };
    });
  });
  $effect(() => {
    void abierto?.consulta;
    activa = abierto?.modo === "personaje" ? -1 : 0;
  });
  $effect(() => {
    if (cerradoEn !== null && pos && pos.l !== cerradoEn) cerradoEn = null;
  });

  // ---- Gestos

  function aplicar(r: Resultado, clave?: string) {
    alEditar(r, clave);
  }

  function elegirFicha(f: Ficha) {
    if (!abierto || !pos) return;
    const crudo = construir(f, fichas);
    const ref = partir(crudo)[0] as Ref;
    const antes = borrarRango(doc, abierto.desde, pos);
    aplicar(insertarReferencia(antes.doc, antes.pos, ref), "referencia");
    arroba = null;
    activa = -1;
    alDecir(`${ref.alias ?? ref.nombre}, ${NOMBRE_TIPO[f.tipo]}, insertado.`);
  }

  function antes(e: InputEvent) {
    if (soloLectura) {
      e.preventDefault();
      return;
    }
    if (componiendo || e.isComposing) return;
    const r = rango();
    if (!r) {
      // Sin posición clara el navegador no edita por su cuenta
      e.preventDefault();
      return;
    }
    const t = e.inputType;
    const sinSel = r.a.l === r.b.l && r.a.u === r.b.u;
    if (t === "insertText" || t === "insertReplacementText") {
      e.preventDefault();
      const dato = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
      // Un trozo con saltos de línea (un autocompletado, un teclado raro) se trata como pegado: se vuelve a reconocer entero
      if (/[\r\n]/.test(dato)) {
        alPegar(pegar(doc, r.a, r.b, dato));
        return;
      }
      const base = sinSel ? { doc, pos: r.a } : borrarRango(doc, r.a, r.b);
      // Una `@` escrita al principio de línea o tras un espacio abre el selector (también si llega dentro de un trozo más largo)
      const i = dato.lastIndexOf("@");
      if (i >= 0) {
        const antesDe = [...dato.slice(0, i)];
        const sitio = { l: base.pos.l, u: base.pos.u + antesDe.length };
        const valido = antesDe.length ? /\s/.test(antesDe[antesDe.length - 1]!) : puedeAbrirConArroba(base.doc, base.pos);
        if (valido && !dato.slice(i + 1).includes("\n")) arroba = sitio;
      }
      aplicar(insertarTexto(base.doc, base.pos, dato), "escribir");
    } else if (t === "insertParagraph" || t === "insertLineBreak") {
      e.preventDefault();
      aplicar(enter(doc, r.a, r.b));
    } else if (t === "insertFromPaste" || t === "insertFromDrop" || t === "insertFromYank") {
      e.preventDefault();
      const dato = e.dataTransfer?.getData("text/plain") ?? "";
      if (dato) alPegar(pegar(doc, r.a, r.b, dato));
    } else if (t === "deleteByCut") {
      e.preventDefault();
      aplicar(borrarRango(doc, r.a, r.b));
    } else if (t.startsWith("delete")) {
      e.preventDefault();
      const atras = t.includes("Backward");
      if (!sinSel) aplicar(borrarRango(doc, r.a, r.b));
      else if (t === "deleteWordBackward" || t === "deleteWordForward") {
        const otro = limitePalabra(doc, r.a, atras ? -1 : 1);
        aplicar(otro.u === r.a.u ? (atras ? borrarAtras(doc, r.a) : borrarAdelante(doc, r.a)) : borrarRango(doc, otro, r.a));
      } else if (t === "deleteSoftLineBackward" || t === "deleteHardLineBackward") aplicar(borrarRango(doc, { l: r.a.l, u: 0 }, r.a));
      else if (t === "deleteSoftLineForward" || t === "deleteHardLineForward") aplicar(borrarRango(doc, r.a, { l: r.a.l, u: doc[r.a.l]!.u.length }));
      else aplicar(atras ? borrarAtras(doc, r.a) : borrarAdelante(doc, r.a), "borrar");
    } else if (t === "historyUndo") {
      e.preventDefault();
      alDeshacer();
    } else if (t === "historyRedo") {
      e.preventDefault();
      alRehacer();
    } else {
      // Cualquier otra cosa que el navegador quiera hacer con el texto, no
      e.preventDefault();
    }
  }

  function copiar(e: ClipboardEvent, cortar: boolean) {
    const r = rango();
    if (!r || (r.a.l === r.b.l && r.a.u === r.b.u)) return;
    e.preventDefault();
    e.clipboardData?.setData("text/plain", textoDeRango(doc, r.a, r.b));
    if (cortar && !soloLectura) aplicar(borrarRango(doc, r.a, r.b));
  }

  function pegado(e: ClipboardEvent) {
    e.preventDefault();
    if (soloLectura) return;
    const r = rango();
    const dato = e.clipboardData?.getData("text/plain") ?? "";
    if (r && dato) alPegar(pegar(doc, r.a, r.b, dato));
  }

  /** Tras una composición (acentos con teclas muertas, IME) el DOM manda en el texto de las líneas; se vuelca al modelo */
  function volcarDelDom() {
    if (!el) return;
    const u = (nodo: Node, salida: Unidad[]) => {
      for (const c of nodo.childNodes) {
        if (c.nodeType === 3) salida.push(...(c as Text).data);
        else if (c instanceof HTMLElement && c.classList.contains("ref")) {
          // La referencia se busca por su sitio original, no por su orden: si falta, no se inventa un enlace
          const r = referenciaDe(doc, Number(c.dataset.l), Number(c.dataset.u));
          if (r) salida.push(r);
        } else if (c instanceof HTMLElement) u(c, salida);
      }
    };
    // Se lee lo que hay en el DOM aunque el navegador haya fundido o partido líneas: no se pierde lo escrito
    const nuevo: Linea[] = [...el.children].map((div, i) => {
      const salida: Unidad[] = [];
      u(div, salida);
      const meta = doc[i];
      const mayus = meta?.tipoPendiente === "personaje" || meta?.forzado === "personaje";
      return { ...(meta ?? {}), u: mayus ? salida.map((x) => (typeof x === "string" ? enMayusculas(x) : x)) : salida };
    });
    if (!nuevo.length) return;
    const pEnd = rango();
    alEditar({ doc: nuevo, pos: pEnd?.b ?? { l: 0, u: 0 } }, "escribir");
  }

  function teclas(e: KeyboardEvent) {
    if (componiendo || e.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (abierto && !e.altKey && !mod) {
      if (k === "ArrowDown" || k === "ArrowUp") {
        if (resultados.length) {
          e.preventDefault();
          activa = k === "ArrowDown" ? Math.min(resultados.length - 1, activa + 1) : Math.max(0, activa - 1);
        }
        return;
      }
      if (k === "Enter" && !soloLectura && (abierto.modo === "arroba" || activa >= 0)) {
        const f = resultados[Math.max(0, activa)];
        if (f) {
          e.preventDefault();
          elegirFicha(f);
          return;
        }
        // Sin coincidencias, Enter vuelve a ser un salto de línea y el selector se cierra
        arroba = null;
        activa = -1;
      }
      if (k === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (abierto.modo === "personaje") cerradoEn = pos?.l ?? null;
        arroba = null;
        return;
      }
    }
    if (mod && !e.altKey && (k === "z" || k === "Z")) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) alRehacer();
      else alDeshacer();
      return;
    }
    if (mod && !e.altKey && (k === "y" || k === "Y")) {
      e.preventDefault();
      e.stopPropagation();
      alRehacer();
      return;
    }
    if (k === "Escape") {
      alDecir("Fuera del editor. Con Tab sigues por la página.");
      return;
    }
    if (k === "Enter" && e.altKey && pos) {
      e.preventDefault();
      const ref = referenciaEn(doc, pos, -1) ?? referenciaEn(doc, pos, 1);
      if (ref) alAbrirRef(ref, resolver(ref, fichas), false);
      else alDecir("No hay ninguna referencia junto al cursor.");
      return;
    }
    if (k === "Tab" && !mod && !e.altKey && !soloLectura && pos) {
      e.preventDefault();
      e.stopPropagation();
      const actual = doc[pos.l]?.forzado;
      const nuevo = cambiarForzado(actual, e.shiftKey);
      const d = cambiarForzadoLinea(doc, pos.l, nuevo);
      if (d === doc) {
        alDecir("Esta línea no admite ese tipo.");
        return;
      }
      aplicar({ doc: d, pos });
      alDecir(nuevo ? `Tipo forzado: ${NOMBRE_FORZADO[nuevo]}.` : "Tipo automático.");
      return;
    }
    if ((k === "ArrowDown" || k === "ArrowUp") && !e.shiftKey && !mod && !e.altKey) {
      const r = rango();
      if (!r) return;
      if (k === "ArrowDown" && r.b.l === doc.length - 1) {
        e.preventDefault();
        alMover(1);
      } else if (k === "ArrowUp" && r.a.l === 0) {
        e.preventDefault();
        alMover(-1);
      }
    }
  }

  const NOMBRE_FORZADO: Record<TipoForzable, string> = { accion: "acción", personaje: "personaje", encabezado: "encabezado", transicion: "transición" };

  function refDe(e: Event): Ref | null {
    const t = e.target instanceof Element ? e.target.closest(".ref") : null;
    return t instanceof HTMLElement ? referenciaDe(doc, Number(t.dataset.l), Number(t.dataset.u)) : null;
  }

  // La referencia se apunta al apretar: si el editor se repinta antes de soltar (el cursor
  // se mueve, se guarda), el clic llega al editor y no a la referencia, y no se pierde
  let apretada: { ref: Ref; x: number; y: number } | null = null;
  function apretar(e: PointerEvent) {
    const ref = e.button === 0 ? refDe(e) : null;
    apretada = ref ? { ref, x: e.clientX, y: e.clientY } : null;
  }

  function pinchar(e: MouseEvent) {
    const a = apretada;
    apretada = null;
    // Si se arrastró para seleccionar, no es un clic en la referencia
    const quieto = !!a && Math.abs(e.clientX - a.x) < 6 && Math.abs(e.clientY - a.y) < 6;
    const ref = refDe(e) ?? (quieto ? a!.ref : null);
    if (ref) alAbrirRef(ref, resolver(ref, fichas), e.ctrlKey || e.metaKey);
  }

  function salir() {
    // Al salir de la línea, lo pendiente que ya tiene texto deja de hacer falta
    if (pos && !soloLectura) {
      const d = soltarPendientes(doc, pos.l);
      if (d !== doc) alEditar({ doc: d, pos }, undefined);
    }
    alDesenfocar?.();
  }
</script>

<div class="editor-guion" class:lectura={soloLectura}>
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <div
    bind:this={el}
    class="editor"
    data-editor-guion
    data-escena={id}
    role="textbox"
    aria-multiline="true"
    aria-label={etiqueta}
    aria-readonly={soloLectura}
    aria-haspopup="listbox"
    aria-expanded={!!abierto}
    aria-controls={abierto ? `selector-${id}` : undefined}
    aria-activedescendant={abierto && activa >= 0 && resultados[activa] ? `selector-${id}-${activa}` : undefined}
    contenteditable={soloLectura ? "false" : "true"}
    spellcheck="false"
    autocapitalize="off"
    tabindex="0"
    onbeforeinput={antes}
    onkeydown={teclas}
    oncopy={(e) => copiar(e, false)}
    oncut={(e) => copiar(e, true)}
    onpaste={pegado}
    onpointerdown={apretar}
    onclick={pinchar}
    onfocus={() => alEnfocar?.()}
    onblur={() => {
      // Si el navegador no avisó del final de una composición, no se queda el editor sin atender
      if (componiendo) {
        componiendo = false;
        volcarDelDom();
      }
      salir();
    }}
    ondrop={(e) => e.preventDefault()}
    ondragstart={(e) => e.preventDefault()}
    oncompositionstart={() => (componiendo = true)}
    oncompositionend={() => {
      componiendo = false;
      volcarDelDom();
    }}
  ></div>
  {#if abierto}
    <SelectorRef id="selector-{id}" {resultados} {activa} consulta={abierto.consulta} {xy} alElegir={elegirFicha} nombreTipo={NOMBRE_TIPO} />
  {/if}
</div>

<style>
  .editor-guion {
    position: relative;
  }
  .editor {
    outline: none;
    white-space: pre-wrap;
    word-break: normal;
    overflow-wrap: break-word;
    min-height: 3.2em;
    caret-color: var(--ink);
  }
  /* Sin caja alrededor: la hoja no es un formulario. El foco se ve en el cursor y en el encabezado de la escena */
  .editor:focus,
  .editor:focus-visible {
    outline: none;
    box-shadow: none;
  }
  /* Cada tipo con sus medidas de página (lib/guion/tipos.ts → MEDIDAS), en caracteres de Courier */
  .editor :global(.l) {
    min-height: 1.2em;
    max-width: 60ch;
  }
  .editor :global(.t-encabezado) {
    font-weight: 700;
    text-transform: uppercase;
    margin-top: 1.2em;
  }
  .editor :global(.t-personaje) {
    margin-left: 22ch;
    max-width: 35ch;
    text-transform: uppercase;
    margin-top: 1.2em;
  }
  .editor :global(.t-parentesis) {
    margin-left: 16ch;
    max-width: 25ch;
  }
  .editor :global(.t-dialogo) {
    margin-left: 10ch;
    max-width: 35ch;
  }
  .editor :global(.t-transicion) {
    text-align: right;
    text-transform: uppercase;
    margin-top: 1.2em;
  }
  .editor :global(.t-accion) {
    margin-top: 0;
  }
  .editor :global(.t-blanco) {
    min-height: 1.2em;
  }
  .editor :global(.ref) {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
    cursor: pointer;
    border-radius: 2px;
    padding: 0 1px;
  }
  .editor :global(.ref:hover) {
    background: var(--accent-soft);
  }
  .editor :global(.ref.sin) {
    color: var(--ink-3);
    text-decoration-style: dashed;
    font-style: italic;
  }
  .lectura .editor {
    caret-color: transparent;
  }
</style>
