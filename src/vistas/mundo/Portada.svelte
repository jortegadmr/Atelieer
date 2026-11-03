<script lang="ts">
  // La portada de la serie en la entrada del mundo (spec 017): imagen opcional
  // (`Portada.png` en la carpeta raíz de la wiki), título y premisa.
  import { onDestroy, untrack } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { elegirImagen } from "../../lib/app/plataforma";
  import { buscarPortada, extensionDe, mimeDe, ponerPortada } from "../../lib/wiki/portada";

  const estado = usarEstado();
  const sesion = $derived.by(() => {
    void estado.version;
    return estado.sesionSerie;
  });

  let url = $state<string | null>(null);
  let aviso = $state("");

  let generacion = 0;
  async function cargar() {
    const s = sesion;
    if (!s) return;
    const mia = ++generacion;
    let nueva: string | null = null;
    try {
      const ruta = await buscarPortada(s.almacen.fs, s.vault, s.modelo.serie.wiki.raiz);
      if (ruta) {
        const bytes = await s.almacen.fs.leerBytes(`${s.vault}/${ruta}`);
        nueva = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeDe(extensionDe(ruta)) }));
      }
    } catch {
      nueva = null;
    }
    // Una carga más reciente ya está en marcha: esta se descarta sin dejar URLs sueltas
    if (mia !== generacion) {
      if (nueva) URL.revokeObjectURL(nueva);
      return;
    }
    const antes = url;
    url = nueva;
    if (antes) URL.revokeObjectURL(antes);
  }

  onDestroy(() => {
    generacion++;
    if (url) URL.revokeObjectURL(url);
  });

  $effect(() => {
    void sesion;
    untrack(() => void cargar());
  });

  async function elegir() {
    const s = sesion;
    if (!s || estado.variante) return;
    aviso = "";
    const origen = await elegirImagen("Elige la imagen de portada");
    if (!origen) return;
    const d = new Date();
    const dos = (n: number) => String(n).padStart(2, "0");
    const fecha = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    const hora = `${dos(d.getHours())}-${dos(d.getMinutes())}-${dos(d.getSeconds())}`;
    try {
      const r = await ponerPortada(s.almacen.fs, s.vault, s.modelo.serie.wiki.raiz, s.ruta, origen, { fecha, hora });
      aviso = r.ok ? "Portada puesta." : r.motivo;
      if (r.ok) await cargar();
    } catch (e) {
      aviso = `No se pudo poner la portada: ${(e as Error).message}`;
    }
  }

  const serie = $derived(sesion?.modelo.serie);
</script>

<section class="portada" aria-label="Portada de la serie">
  {#if url}<img src={url} alt="Portada de {serie?.titulo ?? 'la serie'}" />{/if}
  <div class="texto">
    <h2>{serie?.titulo || "Sin título"}</h2>
    {#if serie?.premisa.trim()}<p>{serie.premisa}</p>{/if}
    {#if !estado.variante}
      <button class="btn ghost" onclick={elegir}>{url ? "Cambiar portada" : "Poner una portada"}</button>
    {/if}
    <p class="aviso" role="status">{aviso}</p>
  </div>
</section>

<style>
  .portada {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 22px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
  }
  img {
    width: 150px;
    max-height: 220px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--line-2);
  }
  .texto {
    flex: 1;
    min-width: 200px;
    display: grid;
    gap: 8px;
    justify-items: start;
  }
  h2 {
    margin: 0;
    font: 400 24px/1.15 var(--serif);
  }
  p {
    margin: 0;
    color: var(--ink-2);
    font-size: 13.5px;
    white-space: pre-wrap;
  }
  .aviso {
    min-height: 1em;
    font-size: 12px;
    color: var(--ink-3);
  }
</style>
