<script lang="ts">
  // «Llevar a la sala» (spec 012, RF-21, RF-22, RF-28 a RF-30): copia el
  // planteamiento del origen para pegarlo en la sala de guionistas. Siempre
  // lleva la serie principal y no escribe nada. Se monta en el panel, en la
  // lente y en las tarjetas de la pizarra.
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
  import { usarEstado } from "../../lib/app/contexto";
  import { textoParaLaSala } from "../../lib/sala/llevar";
  import type { OrigenSala } from "../../lib/sala/reunir";
  import CopiarTexto from "./CopiarTexto.svelte";

  const { origen, compacto = false, flota = false }: { origen: OrigenSala; compacto?: boolean; flota?: boolean } = $props();
  const estado = usarEstado();

  const clave = $derived(origen.tipo === "pieza" ? origen.id : `personaje:${origen.clave}`);

  async function obtener() {
    const s = estado.sesionSerie;
    if (!s) return { error: "No hay ninguna serie abierta." };
    const solo = origen.tipo === "pieza" && !s.modelo.pieza(origen.id) && !!estado.variante?.modelo.pieza(origen.id);
    return textoParaLaSala(s, origen, {
      // Lo que se ve en la pizarra, con lo que aún no se guardó; si no está cargada, se lee del disco sin tocarla
      pizarra: estado.pizarra.cargada ? estado.pizarra.pizarra : null,
      conVariante: !!estado.variante,
      soloEnVariante: solo,
    });
  }
</script>

<CopiarTexto
  etiqueta="Llevar a la sala"
  titulo="Copia un planteamiento para pegarlo en la sala de guionistas"
  hecho="Planteamiento copiado"
  ariaCaja="Planteamiento para la sala, para copiar"
  icono={MessagesSquare}
  reiniciar={clave}
  {obtener}
  {compacto}
  {flota}
/>
