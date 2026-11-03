<script lang="ts">
  // Aviso tras guardar una idea: dónde ha ido y Deshacer (spec 002, RF-43, RF-46).
  // Se va sola a los pocos segundos (no mientras el foco o el ratón estén
  // dentro) o si la idea deja de existir.
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import { usarEstado } from "../../lib/app/contexto";

  const estado = usarEstado();
  const t = $derived(estado.tostada);
  let foco = $state(false);
  let raton = $state(false);

  $effect(() => {
    if (!t) {
      // La próxima tostada empieza de cero
      foco = raton = false;
      return;
    }
    if (foco || raton) return;
    const temporizador = setTimeout(() => estado.quitarTostada(), 8000);
    return () => clearTimeout(temporizador);
  });
</script>

{#if t}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="toast warnbox info"
    role="status"
    onfocusin={() => (foco = true)}
    onfocusout={() => (foco = false)}
    onmouseenter={() => (raton = true)}
    onmouseleave={() => (raton = false)}
  >
    <CircleCheck class="i" /><span>{t.texto}</span>
    <button class="btn ghost" onclick={() => estado.deshacerIdea()}>Deshacer</button>
  </div>
{/if}
