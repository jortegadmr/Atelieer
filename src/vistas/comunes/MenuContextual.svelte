<script lang="ts">
  // Menú contextual de una entrada, «Enfocar» (spec 010, RF-2). Se abre con
  // `enfocable`; es una capa: Esc lo cierra sin tocar la lente (RF-8).
  import Focus from "@lucide/svelte/icons/focus";
  import { usarEstado } from "../../lib/app/contexto";

  const estado = usarEstado();
  const m = estado.menuLente!;
  let item: HTMLButtonElement;

  // Que no se salga de la ventana
  const x = Math.max(4, Math.min(m.x, window.innerWidth - 170));
  const y = Math.max(4, Math.min(m.y, window.innerHeight - 50));

  function cerrar(volver = true) {
    if (estado.menuLente !== m) return;
    estado.menuLente = null;
    if (volver) m.volver?.focus();
  }
  $effect(() => estado.capas.abrir(() => cerrar()));
  $effect(() => item.focus());

  function enfocar() {
    cerrar();
    estado.ponerLente(m.lente);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fuera"
  onpointerdown={() => cerrar(false)}
  oncontextmenu={(e) => {
    e.preventDefault();
    cerrar(false);
  }}
></div>
<div class="menu card" role="menu" aria-label="Acciones" style:left="{x}px" style:top="{y}px">
  <button
    role="menuitem"
    bind:this={item}
    onclick={enfocar}
    oncontextmenu={(e) => e.preventDefault()}
    onkeydown={(e) => {
      if (e.key === "Tab") cerrar(false);
    }}
    onfocusout={(e) => {
      if (!(e.relatedTarget instanceof Node && e.currentTarget.parentElement?.contains(e.relatedTarget))) cerrar(false);
    }}
  >
    <Focus class="i" />Enfocar
  </button>
</div>

<style>
  .fuera {
    position: fixed;
    inset: 0;
    z-index: 60;
  }
  .menu {
    position: fixed;
    z-index: 61;
    min-width: 150px;
    padding: 4px;
  }
  .menu button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border-radius: 6px;
    text-align: left;
  }
  .menu button:hover,
  .menu button:focus-visible {
    background: var(--sel);
  }
</style>
