<script lang="ts">
  // Leyenda de las vistas, como `legend()` de la maqueta.
  import Bomb from "@lucide/svelte/icons/bomb";
  import Eye from "@lucide/svelte/icons/eye";
  import Ghost from "@lucide/svelte/icons/ghost";
  import Sprout from "@lucide/svelte/icons/sprout";
  import IconoPunto from "./IconoPunto.svelte";
  import Parada from "./Parada.svelte";
  import Carga from "./Carga.svelte";

  const { puntos = false, secretos = false, carga = false }: { puntos?: boolean; secretos?: boolean; carga?: boolean } = $props();
  const tinta = "var(--ink-2)";
</script>

<div class="legend">
  {#if puntos}
    <span><IconoPunto clase="inicio" />Inicio</span>
    <span><IconoPunto clase="detonante" />Detonante</span>
    <span><IconoPunto clase="giro" />Giro</span>
    <span><IconoPunto clase="climax" />Clímax</span>
    <span><IconoPunto clase="fin" />Fin</span>
    <span><Bomb class="i" style="color:var(--warn)" />Bomba de tiempo</span>
    <span class="sep"></span>
  {/if}
  <span><Parada papel="abre" color={tinta} tam={14} />Abre</span>
  <span><Parada papel="avanza" color={tinta} tam={14} />Avanza</span>
  <span><Parada papel="gira" color={tinta} tam={14} />Gira</span>
  <span><Parada papel="cierra" color={tinta} tam={14} />Cierra</span>
  {#if secretos}
    <span class="sep"></span>
    <span><Sprout class="i" style="color:var(--ok)" />Pista</span>
    <span><Ghost class="i" style="color:var(--ink-3)" />Pista falsa</span>
    <span><Eye class="i" style="color:var(--accent)" />Revelación</span>
  {/if}
  <span class="sep"></span>
  <span><span class="mk"></span>Canon</span>
  <span><span class="mk borrador"></span>Borrador</span>
  <span><span class="mk idea"></span>Idea</span>
  {#if carga}
    <span class="sep"></span>
    <span><Carga carga={["-", "+"]} texto={false} />Sube a +</span>
    <span><Carga carga={["+", "-"]} texto={false} />Baja a −</span>
  {/if}
</div>

<style>
  .mk.borrador {
    opacity: 0.6;
    -webkit-mask: repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 9px);
    mask: repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 9px);
  }
  .mk.idea {
    height: 2px;
    opacity: 0.5;
    -webkit-mask: repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 5px);
    mask: repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 5px);
  }
</style>
