<script lang="ts">
  // Iconos de los puntos clave (spec 5.7): inicio sunrise, detonante zap,
  // giro split, crisis cloud-rain, clímax mountain, fin flag.
  import CloudRain from "@lucide/svelte/icons/cloud-rain";
  import Flag from "@lucide/svelte/icons/flag";
  import Milestone from "@lucide/svelte/icons/milestone";
  import Mountain from "@lucide/svelte/icons/mountain";
  import Split from "@lucide/svelte/icons/split";
  import Sunrise from "@lucide/svelte/icons/sunrise";
  import Zap from "@lucide/svelte/icons/zap";
  import type { ClasePunto } from "../../lib/modelo/vocabulario";

  const { clase, estilo = "" }: { clase: ClasePunto; estilo?: string } = $props();
  const ICONOS = { inicio: Sunrise, detonante: Zap, giro: Split, crisis: CloudRain, climax: Mountain, fin: Flag, otro: Milestone };
  const Icono = $derived(ICONOS[clase]);
</script>

<Icono class="i" style={estilo} />
