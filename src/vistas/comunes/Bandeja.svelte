<script lang="ts">
  // Bandeja de la temporada (spec 5.3, T4.5): eventos sin episodio, con el
  // color de su arco. Sus chips se arrastran a la rejilla y la bandeja recibe
  // los que se sueltan en ella (T5.4).
  import { estadoDe } from "../../lib/modelo/estados";
  import Inbox from "@lucide/svelte/icons/inbox";
  import Plus from "@lucide/svelte/icons/plus";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { crearEvento } from "../../lib/modelo/operaciones";
  import { acabarArrastre, empezarArrastre, hayEvento, soltarEvento } from "./arrastre";

  const { temporadaId }: { temporadaId: string } = $props();
  const estado = usarEstado();
  let encima = $state(false);

  const eventos = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return c.bandeja(m, temporadaId).map((ev) => ({ ev, color: m.arcos.get(ev.arcos[0]?.arco ?? "")?.color }));
  });

  async function nuevo() {
    const { pieza, cambio } = crearEvento(estado.sesion!.modelo, { temporada: temporadaId });
    await estado.sesion!.aplicar(cambio);
    estado.enfocar = pieza.id;
    estado.elegir(pieza.id, "editar");
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="tray"
  class:encima
  ondragover={(e) => {
    if (!hayEvento(e)) return;
    e.preventDefault();
    encima = true;
  }}
  ondragleave={() => (encima = false)}
  ondrop={(e) => {
    encima = false;
    void soltarEvento(e, estado.sesion!, "");
  }}
>
  <span class="lbl"><Inbox class="i" />Bandeja · arrastra a un episodio</span>
  {#each eventos as { ev, color } (ev.id)}
    <button
      class="chip m-{ev.madurez}"
      class:aparcado={estadoDe(ev) === "aparcado"}
      class:on={estado.seleccion === ev.id}
      draggable="true"
      ondragstart={(e) => empezarArrastre(e, ev.id)}
      ondragend={acabarArrastre}
      onclick={() => estado.elegir(ev.id)}
    >
      <span class="dot" style:background={color ? `var(--t${color})` : "var(--line-2)"}></span>{ev.titulo || "Sin título"}
    </button>
  {/each}
  <button class="chip add" onclick={nuevo}><Plus class="i" />Escena</button>
</div>

<style>
  .chip.on {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .encima {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
</style>
