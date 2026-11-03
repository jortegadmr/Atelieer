<script lang="ts">
  // Buscar o crear (Ctrl K, T7.4): salta a cualquier pieza escribiendo su
  // título o su código; si no existe, ofrece crearla.
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { crearArco, crearEvento, crearSecreto } from "../../lib/modelo/operaciones";
  import { etiqueta, TIPO_PIEZA } from "../../lib/modelo/vocabulario";
  import { buscar, type Encontrada } from "../../lib/vistas/buscar";

  const estado = usarEstado();
  let texto = $state("");
  let activo = $state(0);

  type Opcion = { tipo: "ir"; p: Encontrada } | { tipo: "crear"; que: "evento" | "arco" | "secreto" };

  const opciones = $derived.by((): Opcion[] => {
    void estado.version;
    const r: Opcion[] = buscar(estado.sesion!.modelo, texto, 12).map((p) => ({ tipo: "ir", p }));
    if (texto.trim()) for (const que of ["evento", "arco", "secreto"] as const) r.push({ tipo: "crear", que });
    return r;
  });

  $effect(() => {
    void texto;
    activo = 0;
  });

  function cerrar() {
    estado.buscando = false;
  }
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => estado.capas.abrir(cerrar));

  async function elegir(o: Opcion) {
    cerrar();
    if (o.tipo === "ir") {
      estado.irA(o.p.id, "editar");
      return;
    }
    const s = estado.sesion!;
    const m = s.modelo;
    const titulo = texto.trim();
    let id: string;
    if (o.que === "evento") {
      const ts = c.temporadasEnOrden(m);
      const t = (estado.temporadaActual && m.temporadas.get(estado.temporadaActual)) || ts.find((x) => x.estado === "en marcha") || ts[0];
      const { pieza, cambio } = crearEvento(m, { titulo, temporada: t?.id ?? "" });
      await s.aplicar(cambio);
      id = pieza.id;
    } else if (o.que === "arco") {
      const { pieza, cambio } = crearArco(m, { titulo });
      await s.aplicar(cambio);
      id = pieza.id;
    } else {
      const { pieza, cambio } = crearSecreto(m, { titulo });
      await s.aplicar(cambio);
      id = pieza.id;
    }
    estado.irA(id, "editar");
  }

  function tecla(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    }
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      activo = Math.min(activo + 1, opciones.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activo = Math.max(activo - 1, 0);
    } else if (e.key === "Enter" && opciones[activo]) {
      e.preventDefault();
      void elegir(opciones[activo]);
    }
  }

  const NOMBRE = { evento: "escena (en la bandeja)", arco: "arco", secreto: "secreto" };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fondo" onclick={cerrar}>
  <div class="caja card" role="dialog" aria-label="Buscar o crear" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <div class="entrada">
      <Search class="i" />
      <!-- svelte-ignore a11y_autofocus -->
      <input autofocus placeholder="Buscar o crear…" bind:value={texto} onkeydown={tecla} aria-label="Buscar" />
      <kbd>Esc</kbd>
    </div>
    {#if opciones.length}
      <ul role="listbox">
        {#each opciones as o, i (o.tipo === "ir" ? o.p.id : `crear-${o.que}`)}
          <li role="option" aria-selected={i === activo}>
            <button class:on={i === activo} onmouseenter={() => (activo = i)} onclick={() => elegir(o)}>
              {#if o.tipo === "ir"}
                <span class="tipo">{o.p.tipo === "evento" ? "escena" : etiqueta(TIPO_PIEZA, o.p.tipo)}</span>
                <span class="titulo">{o.p.titulo}</span>
                <span class="detalle">{o.p.detalle}</span>
              {:else}
                <Plus class="i" /><span class="titulo">Crear {NOMBRE[o.que]} «{texto.trim()}»</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="ayuda">Escribe un título o un código (T01E06). Si no existe, podrás crearlo.</p>
    {/if}
  </div>
</div>

<style>
  .fondo {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    z-index: 50;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
  }
  .caja {
    width: min(560px, 92vw);
    overflow: hidden;
  }
  .entrada {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--line);
  }
  .entrada input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    font: 400 18px/1.3 var(--serif);
    color: var(--ink);
  }
  kbd {
    font: 10.5px var(--mono);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0 5px;
    color: var(--ink-3);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 50vh;
    overflow: auto;
  }
  li button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    text-align: left;
  }
  li button.on {
    background: var(--sel);
  }
  .tipo {
    font: 10.5px var(--mono);
    color: var(--ink-3);
    min-width: 72px;
  }
  .titulo {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .detalle {
    font: 11px var(--mono);
    color: var(--ink-3);
  }
  .ayuda {
    margin: 0;
    padding: 14px;
    color: var(--ink-3);
    font-size: 12.5px;
  }
</style>
