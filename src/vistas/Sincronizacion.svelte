<script lang="ts">
  import CloudCheck from "@lucide/svelte/icons/cloud-check";
  import FileWarning from "@lucide/svelte/icons/file-x";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Users from "@lucide/svelte/icons/users";
  import { leerConflicto, type Conflicto } from "../lib/almacen/conflictos";
  import { usarEstado } from "../lib/app/contexto";
  import Instantaneas from "./Instantaneas.svelte";

  const estado = usarEstado();

  const s = $derived.by(() => {
    void estado.version;
    return estado.sesion!;
  });
  const datos = $derived.by(() => {
    void estado.version;
    return { aviso: s.avisoUso, conflictos: [...s.conflictos], problemas: [...s.problemas] };
  });

  let abierto = $state<Conflicto | null>(null);
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => {
    if (abierto) return estado.capas.abrir(() => (abierto = null));
  });
  let errorConflicto = $state<string | null>(null);

  const relativa = (ruta: string) => ruta.slice(s.ruta.length + 1);

  async function ver(ruta: string) {
    errorConflicto = null;
    try {
      abierto = await leerConflicto(s.almacen.fs, ruta);
    } catch (e) {
      errorConflicto = (e as Error).message;
    }
  }
</script>

<div class="vh">
  <div>
    <div class="eyebrow">Sincronización</div>
    <h1 class="t">Sincronización</h1>
    <p class="logline">Lo que pasa entre este equipo y el otro. Atelier avisa y enseña; no junta nada solo.</p>
  </div>
</div>

<div class="sec">
  <div class="sec-h"><h2>Aviso de uso</h2></div>
  {#if datos.aviso}
    <div class="warnbox"><Users class="i" /><span>{datos.aviso}.</span></div>
  {:else}
    <div class="warnbox info"><CloudCheck class="i" /><span>Abierta solo en este equipo.</span></div>
  {/if}
</div>

<div class="sec">
  <div class="sec-h"><h2>Conflictos de sincronización · {datos.conflictos.length}</h2></div>
  {#if !datos.conflictos.length}
    <div class="warnbox info"><CloudCheck class="i" /><span>Ninguno.</span></div>
  {:else}
    <div class="card lista">
      {#each datos.conflictos as ruta (ruta)}
        <div class="fila">
          <TriangleAlert class="i aviso" />
          <span class="wkpath">{relativa(ruta)}</span>
          <button class="btn" onclick={() => ver(ruta)}>Ver las dos versiones</button>
        </div>
      {/each}
    </div>
    <p class="nota">
      Para resolverlo: compara las dos versiones, deja la buena en el fichero original (con el Bloc de notas o con Obsidian) y
      borra el fichero del conflicto.
    </p>
  {/if}
  {#if errorConflicto}<div class="warnbox"><TriangleAlert class="i" /><span>{errorConflicto}</span></div>{/if}
  {#if abierto}
    <div class="dos">
      <div class="card version">
        <h3>Original <span class="wkpath">{relativa(abierto.rutaOriginal)}</span></h3>
        {#if abierto.original === null}<p class="nota">Ya no existe.</p>{:else}<pre>{abierto.original}</pre>{/if}
      </div>
      <div class="card version">
        <h3>Conflicto <span class="wkpath">{relativa(abierto.ruta)}</span></h3>
        <pre>{abierto.conflicto}</pre>
      </div>
    </div>
    <button class="btn ghost" onclick={() => (abierto = null)}>Cerrar</button>
  {/if}
</div>

<div class="sec">
  <div class="sec-h"><h2>Ficheros que no se pueden leer · {datos.problemas.length}</h2></div>
  {#if !datos.problemas.length}
    <div class="warnbox info"><CloudCheck class="i" /><span>Ninguno.</span></div>
  {:else}
    <div class="card lista">
      {#each datos.problemas as p (p.ruta)}
        <div class="fila">
          <FileWarning class="i aviso" />
          <div>
            <span class="wkpath">{relativa(p.ruta)}</span>
            <p class="msg">{p.mensaje}</p>
          </div>
        </div>
      {/each}
    </div>
    <p class="nota">Se han dejado fuera sin tocarlos. Al arreglarlos (por ejemplo, con el Bloc de notas), Atelier los vuelve a leer solo.</p>
  {/if}
</div>

<Instantaneas />

<style>
  .lista {
    padding: 4px 14px;
  }
  .fila {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
  }
  .fila + .fila {
    border-top: 1px solid var(--line);
  }
  .fila .btn {
    margin-left: auto;
  }
  .fila :global(.aviso) {
    color: var(--warn);
  }
  .msg {
    margin: 2px 0 0;
    color: var(--ink-2);
    font-size: 12.5px;
  }
  .nota {
    color: var(--ink-3);
    font-size: 12px;
    margin: 10px 0 0;
  }
  .dos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 14px 0 8px;
  }
  .version {
    padding: 12px 14px;
    min-width: 0;
  }
  .version h3 {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  pre {
    margin: 0;
    font: 11.5px/1.5 var(--mono);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 420px;
    overflow: auto;
  }
</style>
