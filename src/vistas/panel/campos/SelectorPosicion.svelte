<script lang="ts">
  // Temporada y, opcional, episodio (inicio, fin, bomba, beats).
  import { usarEstado } from "../../../lib/app/contexto";
  import * as c from "../../../lib/modelo/consultas";
  import type { Posicion } from "../../../lib/modelo/tipos";

  const {
    etiqueta,
    valor,
    alCambiar,
    ref = "",
  }: { etiqueta: string; valor: Posicion; alCambiar: (p: Posicion) => void; ref?: string } = $props();

  const estado = usarEstado();
  const id = `pos-${Math.random().toString(36).slice(2, 9)}`;

  const listas = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return {
      temporadas: c.temporadasEnOrden(m).map((t) => ({ id: t.id, texto: c.codigo(m, t.id) })),
      episodios: c.episodiosDeTemporada(m, valor.temporada).map((e) => ({ id: e.id, texto: c.codigo(m, e.id).slice(3) })),
    };
  });
</script>

<div class="f">
  <label for={id}>{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</label>
  <div class="dos">
    <select {id} class="v" class:ph={!valor.temporada} value={valor.temporada} onchange={(e) => alCambiar({ temporada: e.currentTarget.value, episodio: "" })}>
      <option value="">Sin fijar</option>
      {#each listas.temporadas as t (t.id)}<option value={t.id}>{t.texto}</option>{/each}
    </select>
    <select
      class="v"
      class:ph={!valor.episodio}
      aria-label="{etiqueta}: episodio"
      disabled={!valor.temporada}
      value={valor.episodio}
      onchange={(e) => alCambiar({ temporada: valor.temporada, episodio: e.currentTarget.value })}
    >
      <option value="">Toda</option>
      {#each listas.episodios as e (e.id)}<option value={e.id}>{e.texto}</option>{/each}
    </select>
  </div>
</div>

<style>
  .dos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  select:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
