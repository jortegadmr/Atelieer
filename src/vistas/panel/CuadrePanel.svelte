<script lang="ts">
  // El cuadre del guion de esta escena con sus personajes y lugares (spec 014,
  // RF-16 a RF-18). Si la escena no tiene guion, no se muestra nada.
  import { usarEstado } from "../../lib/app/contexto";
  import { cuadrarEscena, type CuadreEscena, type Lista } from "../../lib/desglose/cuadre";
  import { crearResolutor } from "../../lib/desglose/desglose";
  import { leerTexto } from "../../lib/desglose/lectura";
  import type { Evento } from "../../lib/modelo/tipos";
  import CuadreVista from "../analisis/CuadreEscena.svelte";

  const { evento }: { evento: Evento } = $props();
  const estado = usarEstado();

  let cuadre = $state.raw<CuadreEscena | null>(null);
  let mensaje = $state("");
  let vuelta = 0;

  // Se recalcula al cambiar la escena, sus personajes o lugares, o el modelo
  $effect(() => {
    void estado.version;
    const id = evento.id;
    const ev = { id, personajes: [...evento.personajes], lugares: [...evento.lugares] };
    const s = estado.sesionSerie;
    const mia = ++vuelta;
    if (!s) {
      cuadre = null;
      return;
    }
    void (async () => {
      try {
        const texto = await leerTexto(s.guion, id);
        if (texto === null) return void (mia === vuelta && (cuadre = null));
        await s.leerWikiSoloLectura();
        if (mia !== vuelta) return;
        cuadre = cuadrarEscena(ev, texto, crearResolutor(s.wiki));
      } catch {
        if (mia === vuelta) cuadre = null;
      }
    })();
  });

  async function anadir(items: Partial<Lista>) {
    const r = await estado.desglose.anadir(evento.id, items);
    mensaje = r.mensaje;
  }
</script>

{#if cuadre}
  <div class="f">
    <span class="lbl">Guion y escena</span>
    <div class="v bloque">
      <CuadreVista
        {cuadre}
        bloqueada={estado.sesionSerie?.estaBloqueada(evento.id) ?? false}
        puedeAnadir={!estado.desglose.conVariante}
        alAnadir={(items) => void anadir(items)}
        alDesbloquear={() => estado.sesionSerie?.desbloquear(evento.id)}
      />
      <p class="estado" role="status">{mensaje}</p>
    </div>
  </div>
{/if}

<style>
  .bloque {
    display: block;
    padding: 8px 10px;
  }
  .estado {
    margin: 0;
    font-size: 12px;
    color: var(--ink-2);
  }
  .estado:empty {
    display: none;
  }
</style>
