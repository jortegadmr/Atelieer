<script lang="ts">
  // Envoltorio de un campo con reglas de la guía (spec 004, RF-6 a RF-18): con
  // el foco dentro, enseña debajo las reglas que le tocan, su marca y sus avisos.
  // Es una caja normal: en una rejilla, la celda.
  import { tick, type Snippet } from "svelte";
  import { usarEstado } from "../../../lib/app/contexto";
  import type { Aviso } from "../../../lib/comprobaciones";
  import { reglasDeCampo, type ClaveCampo } from "../../../lib/guia/campos";
  import type { Regla } from "../../../lib/guia/guia-md";
  import { estadoRegla } from "../../../lib/guia/marcas";
  import type { Pieza } from "../../../lib/modelo/tipos";
  import ReglasCampo from "./ReglasCampo.svelte";

  const { pieza, clave, children }: { pieza: Pieza; clave: ClaveCampo; children: Snippet } = $props();
  const estado = usarEstado();

  const idZona = `reglas-${Math.random().toString(36).slice(2, 9)}`;
  let caja = $state<HTMLElement | null>(null);
  let zona = $state<HTMLElement | null>(null);
  let dentro = $state(false);
  /** Último elemento del campo con el foco, para devolvérselo */
  let ultimo: HTMLElement | null = null;
  /** El que acaba de perder el foco */
  let saliente: HTMLElement | null = null;
  /** Botón que hay que enfocar cuando se pinte (tras «Lo sé»: RF-17) */
  let enfocarLuego = $state<{ accion: string; regla: string } | null>(null);
  /** Esperando a soltar el ratón para decidir si se ocultan las reglas */
  let esperando = false;

  const reglas = $derived.by(() => {
    void estado.version;
    const s = estado.sesion;
    if (!dentro || !s?.guia) return [];
    const p = s.modelo.pieza(pieza.id) ?? pieza;
    // Canon bloqueado: no se edita, la regla está en su pestaña Guía (RF-9)
    if (s.estaBloqueada(p.id)) return [];
    const r = s.resultado();
    return reglasDeCampo(s.guia, p, clave).map((regla) => ({ regla, e: estadoRegla(s.guia!, regla, p, r, s.modelo) }));
  });

  const enZona = (el: EventTarget | null) => !!zona && el instanceof Node && zona.contains(el);

  // La descripción del campo es el texto de cada regla, sin sus botones
  function describir(el: HTMLElement, poner: boolean) {
    const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((x) => x && !x.startsWith(`${idZona}-`));
    if (poner) ids.push(...reglas.map((_, i) => `${idZona}-${i}`));
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  }
  $effect(() => {
    void reglas;
    if (dentro && ultimo && caja?.contains(ultimo)) describir(ultimo, true);
  });

  /** La tarjeta de una rejilla no encoge cuando salen las reglas debajo (RNF estabilidad) */
  function fijarAlto(si: boolean) {
    const bx = caja?.firstElementChild;
    if (!(bx instanceof HTMLElement) || !bx.classList.contains("bx")) return;
    bx.style.minHeight = si ? `${bx.offsetHeight}px` : "";
  }

  function alEntrar(e: FocusEvent) {
    if (!dentro) fijarAlto(true);
    dentro = true;
    const t = e.target as HTMLElement;
    if (enZona(t)) return;
    ultimo = t;
    describir(t, true);
  }

  function alSalir(e: FocusEvent) {
    const t = e.target as HTMLElement;
    saliente = t;
    if (!enZona(t)) describir(t, false);
    if (e.relatedTarget instanceof Node && caja?.contains(e.relatedTarget)) return;
    // Con el ratón pulsado se espera a soltarlo: así lo de abajo no sube antes del
    // clic, y en el Mac da tiempo a enfocar el botón pulsado
    if (!pulsado) {
      setTimeout(revisar, 0);
      return;
    }
    if (esperando) return;
    esperando = true;
    const fin = () => {
      esperando = false;
      window.removeEventListener("pointerup", fin);
      window.removeEventListener("pointercancel", fin);
      setTimeout(revisar, 0);
    };
    window.addEventListener("pointerup", fin);
    window.addEventListener("pointercancel", fin);
  }

  function revisar() {
    if (!caja?.isConnected) return;
    const activo = document.activeElement;
    if (activo && caja.contains(activo)) return;
    // El botón con el foco desapareció (la regla pasó a cumplirse): el foco vuelve al campo
    if ((!activo || activo === document.body) && saliente && !saliente.isConnected && ultimo?.isConnected) {
      ultimo.focus();
      // Si no entra (la pieza pasó a canon bloqueado), se ocultan
      if (caja.contains(document.activeElement)) return;
    }
    dentro = false;
    enfocarLuego = null;
    fijarAlto(false);
  }

  // En WebKit pulsar un botón no lo enfoca: se enfoca a mano para que salga la regla
  function alPulsar(e: MouseEvent) {
    const b = (e.target as HTMLElement).closest("button");
    if (b && caja?.contains(b) && document.activeElement !== b && !enZona(b)) b.focus();
  }

  async function alLoSe(regla: Regla, aviso: Aviso, silenciar: boolean) {
    estado.sesion!.loSe(aviso, silenciar);
    enfocarLuego = { accion: silenciar ? "quitar" : "lose", regla: regla.id };
    await tick();
  }

  // «Ir al campo» desde «Si lo dejas así…» (spec 005, RF-13): el foco entra en el
  // campo (y salen sus reglas); una tarjeta de Tramas se abre para escribir
  $effect(() => {
    const quiero = estado.enfocarCampo;
    if (!quiero || quiero.pieza !== pieza.id || quiero.clave !== clave || !caja) return;
    estado.enfocarCampo = null;
    const c = caja;
    for (let d = c.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
    void tick().then(() => {
      const tarjeta = c.querySelector<HTMLElement>('.bx[role="button"]');
      if (tarjeta && !tarjeta.querySelector("textarea")) tarjeta.click();
      else c.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]:not([tabindex="-1"])')?.focus();
      c.scrollIntoView({ block: "nearest" });
    });
  });

  // Tras «Lo sé», el foco va al botón que lo sustituye en cuanto se pinta
  $effect(() => {
    void reglas;
    const quiero = enfocarLuego;
    if (!quiero || !zona) return;
    const b = [...zona.querySelectorAll<HTMLElement>("button")].find((x) => x.dataset.accion === quiero.accion && x.dataset.regla === quiero.regla);
    if (b) {
      b.focus();
      enfocarLuego = null;
    }
  });
</script>

<script lang="ts" module>
  // Si hay un botón del ratón pulsado (común a todos los campos). Un arrastre
  // acaba en pointercancel, no en pointerup
  let pulsado = false;
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", () => (pulsado = true), true);
    for (const ev of ["pointerup", "pointercancel", "dragstart", "dragend", "blur"]) window.addEventListener(ev, () => (pulsado = false), true);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="con-guia" data-con-guia bind:this={caja} onfocusin={alEntrar} onfocusout={alSalir} onclick={alPulsar} role="presentation">
  {@render children()}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="reglas-campo" class:llena={reglas.length > 0} id={idZona} bind:this={zona} onmousedown={(e) => e.preventDefault()}>
    {#if reglas.length}
      <ReglasCampo {reglas} {idZona} {alLoSe} alVer={(r) => estado.verRegla(pieza.id, r.id)} />
    {/if}
  </div>
</div>
