<script lang="ts">
  // Pestaña Comprobar (spec 5.5, 6.2, T6.5): todos los avisos y sugerencias de
  // la serie, agrupados. Clic lleva a la pieza; "Lo sé" lo silencia en ella.
  import Info from "@lucide/svelte/icons/info";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../../lib/app/contexto";
  import type { Aviso } from "../../lib/comprobaciones";

  const estado = usarEstado();
  let verSilenciados = $state(false);

  const d = $derived.by(() => {
    void estado.version;
    const r = estado.sesion!.resultado();
    const avisos = r.avisos.filter((a) => a.clase === "aviso");
    const grupos = [...new Set(avisos.map((a) => a.grupo))].map((g) => ({ g, lista: avisos.filter((a) => a.grupo === g) }));
    return { grupos, sugerencias: r.avisos.filter((a) => a.clase === "sugerencia"), silenciados: r.silenciados, total: avisos.length };
  });
</script>

{#snippet item(a: Aviso, silenciado = false)}
  <div class="it" class:sug={a.clase === "sugerencia"}>
    {#if a.clase === "sugerencia"}<Lightbulb class="i" />{:else}<TriangleAlert class="i" />{/if}
    <div>
      <button class="msg" onclick={() => estado.irA(a.pieza, "comprobar")}><p>{a.mensaje}</p></button>
      <small>
        <b>{a.fuente}</b>
        <button class="enlace" onclick={() => estado.irA(a.pieza, "editar")}>Ir ahí →</button>
        <button class="enlace" onclick={() => estado.sesion!.loSe(a, !silenciado)}>{silenciado ? "Quitar «lo sé»" : "Lo sé"}</button>
      </small>
    </div>
  </div>
{/snippet}

<div class="ib-body">
  <div class="cklist">
    {#each d.grupos as { g, lista } (g)}
      <div class="grp">{g} · {lista.length}</div>
      {#each lista as a (a.id + a.pieza + a.mensaje)}{@render item(a)}{/each}
    {/each}
    {#if d.sugerencias.length}
      <div class="grp">Sugerencias · {d.sugerencias.length}</div>
      {#each d.sugerencias as a (a.id + a.pieza + a.mensaje)}{@render item(a)}{/each}
    {/if}
    {#if !d.grupos.length && !d.sugerencias.length}
      <p class="limpio">Nada que comprobar: ningún aviso ni sugerencia.</p>
    {/if}
    {#if d.silenciados.length}
      <button class="grp mas" onclick={() => (verSilenciados = !verSilenciados)}>Silenciados con «lo sé» · {d.silenciados.length} {verSilenciados ? "▾" : "▸"}</button>
      {#if verSilenciados}
        {#each d.silenciados as a (a.id + a.pieza + a.mensaje)}{@render item(a, true)}{/each}
      {/if}
    {/if}
  </div>
  <div class="warnbox info"><Info class="i" /><span>Son avisos, no errores: puedes romper una regla a propósito y marcarla como «lo sé».</span></div>
</div>

<style>
  .msg {
    text-align: left;
    display: block;
  }
  .enlace {
    color: var(--ink-3);
    font-size: 11px;
  }
  .enlace:hover {
    color: var(--ink);
    text-decoration: underline;
  }
  .limpio {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .mas {
    text-align: left;
    width: 100%;
  }
</style>
