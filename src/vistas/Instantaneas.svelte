<script lang="ts">
  // Instantáneas de la serie (spec 7, T7.5): se ven, se crean con nombre y se
  // restauran. Las automáticas se hacen solas al abrir y cada 30 min con cambios.
  import ArchiveRestore from "@lucide/svelte/icons/archive-restore";
  import Camera from "@lucide/svelte/icons/camera";
  import Clock from "@lucide/svelte/icons/clock";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { usarEstado } from "../lib/app/contexto";
  import type { Instantanea } from "../lib/almacen/instantaneas";

  const estado = usarEstado();
  let lista = $state<Instantanea[]>([]);
  let nombre = $state("");
  let confirmar = $state<string | null>(null);
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => {
    if (confirmar !== null) return estado.capas.abrir(() => (confirmar = null));
  });
  let trabajando = $state(false);
  let error = $state<string | null>(null);

  async function cargar() {
    try {
      lista = await estado.sesionSerie!.instantaneas.listar();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  $effect(() => {
    void estado.version;
    void cargar();
  });

  async function crear() {
    if (!nombre.trim()) return;
    trabajando = true;
    try {
      await estado.sesionSerie!.guardado.vaciar();
      await estado.sesionSerie!.instantaneas.crear(nombre);
      nombre = "";
      await cargar();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      trabajando = false;
    }
  }

  async function restaurar(n: string) {
    confirmar = null;
    trabajando = true;
    try {
      await estado.restaurar(n);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      trabajando = false;
    }
  }

  const fecha = (f: string) => {
    const [d, h] = f.split(" ");
    const [a, m, dia] = d.split("-");
    return `${dia}/${m}/${a} ${h.replace("-", ":")}`;
  };
</script>

<div class="sec">
  <div class="sec-h"><h2>Instantáneas · {lista.length}</h2></div>
  <form
    class="nueva"
    onsubmit={(e) => {
      e.preventDefault();
      void crear();
    }}
  >
    <input class="v" placeholder="Nombre: antes de apagar la torre" bind:value={nombre} aria-label="Nombre de la instantánea" />
    <button class="btn" type="submit" disabled={!nombre.trim() || trabajando || !!estado.variante}><Camera class="i" />Hacer instantánea</button>
  </form>
  {#if estado.variante}<div class="warnbox info"><span>Sal de la variante para hacer o restaurar instantáneas: son de la serie.</span></div>{/if}
  {#if error}<div class="warnbox"><TriangleAlert class="i" /><span>{error}</span></div>{/if}
  {#if estado.sesion?.errorCopia}<div class="warnbox"><TriangleAlert class="i" /><span>{estado.sesion.errorCopia}</span></div>{/if}
  {#if lista.length}
    <div class="card filas">
      {#each lista as x (x.nombre)}
        <div class="fila">
          {#if x.auto}<Clock class="i gris" />{:else}<Camera class="i" />{/if}
          <span class="nombre">
            {x.auto ? "Automática" : x.titulo}
            <small>{fecha(x.fecha)}</small>
          </span>
          {#if confirmar === x.nombre}
            <span class="confirma">¿Restaurar? Antes se hace otra automática; lo que no estaba en la copia va a la papelera.</span>
            <button class="btn ghost" onclick={() => (confirmar = null)}>Cancelar</button>
            <button class="btn pri" disabled={trabajando} onclick={() => restaurar(x.nombre)}>Restaurar</button>
          {:else}
            <button class="btn" disabled={trabajando || !!estado.variante} onclick={() => (confirmar = x.nombre)}><ArchiveRestore class="i" />Restaurar</button>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="warnbox info"><span>Todavía no hay ninguna.</span></div>
  {/if}
  <p class="nota">Se guardan en <span class="wkpath">appDatos/{estado.sesion?.carpeta}/_instantaneas/</span>: las 20 últimas automáticas y todas las que tienen nombre.</p>
</div>

<style>
  .nueva {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .nueva .v {
    flex: 1;
  }
  .filas {
    padding: 4px 14px;
  }
  .fila {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    flex-wrap: wrap;
  }
  .fila + .fila {
    border-top: 1px solid var(--line);
  }
  .fila :global(.gris) {
    color: var(--ink-3);
  }
  .nombre {
    flex: 1;
    min-width: 0;
  }
  .nombre small {
    display: block;
    color: var(--ink-3);
    font: 11px var(--mono);
  }
  .confirma {
    width: 100%;
    font-size: 12px;
    color: var(--ink-2);
  }
  .nota {
    color: var(--ink-3);
    font-size: 12px;
    margin: 10px 0 0;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
