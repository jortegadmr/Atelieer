<script lang="ts">
  // Barra «Nuevo…» bajo el visor (spec 002, RF-26 a RF-28, RF-33, RF-34): lo
  // que se puede crear en el nivel. Lo que el canon bloqueado impide se ve,
  // se alcanza con Tab y dice por qué.
  import Plus from "@lucide/svelte/icons/plus";
  import { usarEstado } from "../../lib/app/contexto";
  import { opcionesNuevo, type OpcionNuevo } from "../../lib/vistas/crear";

  const estado = usarEstado();

  const opciones = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    return opcionesNuevo(s.modelo, estado.nivel, (id) => s.estaBloqueada(id));
  });

  function pulsar(o: OpcionNuevo) {
    if (o.bloqueo) return;
    if (o.que === "idea") estado.abrirCaptura();
    else estado.abrirNueva(o.que);
  }
</script>

<div class="crearbar" role="toolbar" aria-label="Nuevo">
  <span class="lbl">Nuevo</span>
  {#each opciones as o (o.que)}
    <button class="btn" aria-disabled={o.bloqueo ? "true" : undefined} aria-describedby={o.bloqueo ? `porque-${o.que}` : undefined} onclick={() => pulsar(o)}>
      <Plus class="i" />{o.nombre}
    </button>
    {#if o.bloqueo}<span class="porque" id="porque-{o.que}">{o.bloqueo}</span>{/if}
  {/each}
</div>
