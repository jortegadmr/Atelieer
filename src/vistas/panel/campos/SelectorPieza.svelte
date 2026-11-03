<script lang="ts">
  // Elegir una pieza de una lista (temporada, episodio…).
  const {
    etiqueta,
    opciones,
    valor,
    alCambiar,
    vacio = "Sin fijar",
    ref = "",
  }: {
    etiqueta: string;
    opciones: { id: string; texto: string }[];
    valor: string;
    alCambiar: (id: string) => void;
    vacio?: string;
    ref?: string;
  } = $props();

  const id = `sel-${Math.random().toString(36).slice(2, 9)}`;
  // Un valor que no está en la lista se enseña para no pisarlo en silencio (spec 011, RF-34)
  const perdido = $derived(!!valor && !opciones.some((o) => o.id === valor));
</script>

<div class="f">
  <label for={id}>{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</label>
  <select {id} class="v" class:ph={!valor} value={valor} onchange={(e) => alCambiar(e.currentTarget.value)}>
    <option value="">{vacio}</option>
    {#if perdido}<option value={valor}>(ya no está)</option>{/if}
    {#each opciones as o (o.id)}
      <option value={o.id}>{o.texto}</option>
    {/each}
  </select>
</div>
