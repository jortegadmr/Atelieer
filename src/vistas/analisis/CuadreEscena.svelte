<script lang="ts">
  // El cuadre de una escena con su guion (spec 014, RF-16 a RF-18): lo que dice el
  // guion y la escena no tiene (se puede añadir) y lo que tiene la escena y el guion
  // no dice (solo se informa). Es información, no un aviso de las guías. Nada se
  // añade ni se quita por sí solo.
  import LockOpen from "@lucide/svelte/icons/lock-open";
  import type { CuadreEscena, ItemCuadre, Lista } from "../../lib/desglose/cuadre";
  import { AVISO_BLOQUEADA } from "../../lib/app/sesion";

  const {
    cuadre,
    bloqueada = false,
    puedeAnadir = true,
    alAnadir,
    alDesbloquear,
  }: {
    cuadre: CuadreEscena;
    /** La escena es canon y no está desbloqueada */
    bloqueada?: boolean;
    /** Con una variante abierta no se ofrece añadir */
    puedeAnadir?: boolean;
    alAnadir: (items: Partial<Lista>) => void;
    alDesbloquear: () => void;
  } = $props();

  const falta = $derived(cuadre.enGuionNoEscena);
  const sobra = $derived(cuadre.enEscenaNoGuion);
  const hayFalta = $derived(falta.personajes.length + falta.lugares.length > 0);
  const haySobra = $derived(sobra.personajes.length + sobra.lugares.length > 0);
  const nombres = (l: ItemCuadre[]) => l.map((x) => x.nombre).join(", ");
</script>

<div class="cuadre">
  {#if cuadre.cuadra}
    <p class="ok">El guion y la escena cuadran.</p>
  {/if}

  {#if hayFalta}
    <div class="bloque">
      <h4>En el guion y no en la escena</h4>
      <ul>
        {#each falta.personajes as x (x.clave)}
          <li>
            <span class="tipo">Personaje</span><span class="nom">{x.nombre}{#if !x.ficha}<span class="sinficha" title="No tiene ficha en el mundo">sin ficha</span>{/if}</span>
            {#if puedeAnadir}<button class="btn" disabled={bloqueada} onclick={() => alAnadir({ personajes: [x] })} aria-label="Añadir el personaje {x.nombre} a la escena">Añadir a la escena</button>{/if}
          </li>
        {/each}
        {#each falta.lugares as x (x.clave)}
          <li>
            <span class="tipo">Lugar</span><span class="nom">{x.nombre}{#if !x.ficha}<span class="sinficha" title="No tiene ficha en el mundo">sin ficha</span>{/if}</span>
            {#if puedeAnadir}<button class="btn" disabled={bloqueada} onclick={() => alAnadir({ lugares: [x] })} aria-label="Añadir el lugar {x.nombre} a la escena">Añadir a la escena</button>{/if}
          </li>
        {/each}
      </ul>
      {#if puedeAnadir && falta.personajes.length + falta.lugares.length > 1}
        <button class="btn pri" disabled={bloqueada} onclick={() => alAnadir(falta)}>Añadir todo a la escena</button>
      {/if}
      {#if !puedeAnadir}<p class="nota">Con una variante abierta no se añade nada: el cuadre solo informa.</p>{/if}
      {#if bloqueada}
        <p class="warnbox">
          <span>{AVISO_BLOQUEADA}</span>
          <button class="btn" onclick={alDesbloquear}><LockOpen class="i" />Desbloquear a propósito</button>
        </p>
      {/if}
    </div>
  {/if}

  {#if haySobra}
    <div class="bloque">
      <h4>En la escena y no en el guion</h4>
      <p class="lista">
        {#if sobra.personajes.length}<span><span class="tipo">Personajes</span> {nombres(sobra.personajes)}</span>{/if}
        {#if sobra.lugares.length}<span><span class="tipo">Lugares</span> {nombres(sobra.lugares)}</span>{/if}
      </p>
      <p class="nota">Solo se informa: Atelier no quita nada de la escena.</p>
    </div>
  {/if}
</div>

<style>
  .cuadre {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12.5px;
  }
  h4 {
    margin: 0 0 4px;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  ul {
    list-style: none;
    margin: 0 0 6px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .tipo {
    font: 10.5px var(--mono);
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-right: 6px;
  }
  .nom {
    font-weight: 500;
  }
  .ok,
  .nota {
    margin: 0;
    color: var(--ink-3);
  }
  .lista {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-wrap: anywhere;
  }
  .sinficha {
    margin-left: 6px;
    font: 10.5px var(--mono);
    color: var(--ink-3);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 5px;
    font-weight: 400;
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .warnbox {
    align-items: center;
    flex-wrap: wrap;
    margin: 6px 0 0;
  }
</style>
