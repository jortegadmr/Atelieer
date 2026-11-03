<script lang="ts">
  // Punto de estado (spec 5.7 y spec 001): canon verde, borrador discontinuo,
  // idea de puntos, propuesta de puntos en el acento, aparcado hueco, descartado gris.
  import { ESTADO, etiqueta, type Estado } from "../../lib/modelo/vocabulario";

  const { madurez }: { madurez: Estado } = $props();
</script>

<span class="mdot m-c-{madurez}" title={etiqueta(ESTADO, madurez)}></span>
