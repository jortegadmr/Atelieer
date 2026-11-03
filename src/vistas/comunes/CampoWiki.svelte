<script lang="ts">
  // Personajes, lugares y épocas de la wiki (spec 10.1, T8.1): autocompletado;
  // un nombre que no existe queda marcado "no está en la wiki" con "Crear
  // ficha" (solo si el autor lo pulsa, regla 14); al pasar el ratón por un
  // personaje se ve su motor; con clic se abre en Obsidian.
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import FilePlus from "@lucide/svelte/icons/file-plus";
  import History from "@lucide/svelte/icons/history";
  import X from "@lucide/svelte/icons/x";
  import type { Snippet } from "svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { abrirUrl } from "../../lib/app/plataforma";
  import type { Ficha, TipoFicha } from "../../lib/wiki/fichas";
  import { sinCorchetes } from "../../lib/vistas/textos";
  import { alias, clavePersonaje, type Lente } from "../../lib/vistas/lente";
  import { enfocable } from "./enfocable";

  const {
    etiqueta,
    valores,
    alCambiar,
    tipos,
    uno = false,
    ref = "",
    pista = "Escribe un nombre",
    motivo = "",
    junto,
  }: {
    etiqueta: string;
    /** Como "[[Telmo]]" */
    valores: string[];
    alCambiar: (v: string[]) => void;
    tipos: TipoFicha[];
    /** Un solo valor (protagonista, cuándo ocurre) */
    uno?: boolean;
    ref?: string;
    pista?: string;
    /** Para la ficha nueva: dónde aparece */
    motivo?: string;
    /** Algo junto a cada nombre, antes de quitarlo (spec 010: «Lo sabe desde») */
    junto?: Snippet<[string, number]>;
  } = $props();

  const estado = usarEstado();
  const id = `wiki-${Math.random().toString(36).slice(2, 9)}`;
  let texto = $state("");
  let abierto = $state(false);
  // Esc lo cierra antes de subir de nivel en el visor (spec 002, RF-16)
  $effect(() => {
    if (abierto) return estado.capas.abrir(() => (abierto = false));
  });
  let activo = $state(0);
  let creando = $state<string | null>(null);
  let error = $state<string | null>(null);

  const wiki = $derived.by(() => {
    void estado.version;
    return estado.sesion!.wiki;
  });
  const nombres = $derived(valores.map(sinCorchetes).filter(Boolean));
  // «Enfocar» un personaje (spec 010, RF-2): con la misma clave que la lente
  const al = $derived(tipos.includes("personaje") ? alias(wiki) : null);
  const lenteDe = (n: string): Lente | null => (al ? { tipo: "personaje", clave: clavePersonaje(al, n), nombre: n } : null);
  const sugerencias = $derived(texto.trim() ? wiki.sugerir(texto, tipos).filter((f) => !nombres.includes(f.nombre)) : []);

  const TIPO_NUEVO = $derived<TipoFicha>(tipos[0]);
  const NOMBRE_TIPO: Record<TipoFicha, string> = { personaje: "personaje", lugar: "lugar", era: "época" };

  function poner(nombre: string) {
    const n = sinCorchetes(nombre);
    if (!n) return;
    const nuevo = `[[${n}]]`;
    alCambiar(uno ? [nuevo] : [...valores.filter((v) => sinCorchetes(v) !== n), nuevo]);
    texto = "";
    abierto = false;
  }

  const quitar = (n: string) => alCambiar(valores.filter((v) => sinCorchetes(v) !== n));

  function tecla(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activo = Math.min(activo + 1, sugerencias.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activo = Math.max(activo - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      poner(sugerencias[activo]?.nombre ?? texto);
    } else if (e.key === "Escape" && abierto) {
      // Cierra el menú y no sube de nivel ni sale del campo (spec 002, RF-16)
      e.preventDefault();
      abierto = false;
    }
  }

  function motor(f: Ficha | null): string {
    if (!f) return "";
    if (f.tipo === "era") return [f.nombre, f.detalle, f.resumen].filter(Boolean).join(" · ");
    if (f.tipo !== "personaje") return f.resumen;
    const m = f.motor;
    return [
      m.quiere && `Quiere: ${m.quiere}`,
      m.necesita && `Necesita: ${m.necesita}`,
      m.mentira && `Mentira: ${m.mentira}`,
    ]
      .filter(Boolean)
      .join("\n") || f.resumen;
  }

  async function crear(nombre: string) {
    error = null;
    try {
      await estado.sesion!.crearFicha(TIPO_NUEVO, nombre, motivo || undefined);
      creando = null;
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const ini = (n: string) =>
    n
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
</script>

<div class="f">
  <label for={id}>{etiqueta}{#if ref}<span class="ref">{ref}</span>{/if}</label>
  <div class="v caja">
    <!-- Por posición: un nombre repetido a mano no rompe el campo (spec 010) -->
    {#each nombres as n, i (i)}
      {@const f = wiki.buscar(n)}
      <span class="wk" class:miss={!f} title={motor(f) || undefined} use:enfocable={{ estado, lente: lenteDe(n) }}>
        {#if tipos.includes("era") && f?.tipo === "era"}<History class="i" />{:else}<span class="ini">{ini(n)}</span>{/if}
        {#if f}
          <button class="nombre" title="Abrir en Obsidian" onclick={() => abrirUrl(wiki.urlObsidian(f))}>{n}{#if f.detalle} · {f.detalle}{/if}<ArrowUpRight class="i" /></button>
        {:else}
          <span>{n}</span>
          <button class="mt" onclick={() => (creando = n)}>no está en la wiki · crear ficha</button>
        {/if}
        {#if junto}{@render junto(n, i)}{/if}
        <button class="quitar" aria-label="Quitar {n}" onclick={() => quitar(n)}><X class="i" /></button>
      </span>
    {/each}
    {#if !uno || !nombres.length}
      <span class="entrada">
        <input
          {id}
          placeholder={nombres.length ? "+" : pista}
          bind:value={texto}
          onfocus={() => (abierto = true)}
          oninput={() => {
            abierto = true;
            activo = 0;
          }}
          onblur={() => setTimeout(() => (abierto = false), 150)}
          onkeydown={tecla}
          autocomplete="off"
        />
        {#if abierto && sugerencias.length}
          <ul class="lista card">
            {#each sugerencias as s, i (s.ruta + s.nombre)}
              <li>
                <button class:on={i === activo} onmousedown={(e) => e.preventDefault()} onclick={() => poner(s.nombre)}>
                  {s.nombre}{#if s.detalle}<small>{s.detalle}</small>{/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </span>
    {/if}
  </div>
  {#if creando}
    <div class="crear">
      <span>¿Crear la ficha de {NOMBRE_TIPO[TIPO_NUEVO]} «{creando}» con su plantilla? Se crea en la wiki y se anota en el Log.</span>
      <span class="botones">
        <button class="btn ghost" onclick={() => (creando = null)}>Cancelar</button>
        <button class="btn" onclick={() => crear(creando!)}><FilePlus class="i" />Crear ficha</button>
      </span>
    </div>
  {/if}
  {#if error}<p class="error">{error}</p>{/if}
</div>

<style>
  .caja {
    flex-wrap: wrap;
    gap: 6px;
    position: relative;
  }
  .wk {
    gap: 5px;
  }
  .wk :global(.i) {
    width: 12px;
    height: 12px;
    color: var(--ink-3);
  }
  .nombre {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .nombre:hover {
    text-decoration: underline;
  }
  .mt {
    font-size: 10.5px;
    color: var(--warn);
  }
  .mt:hover {
    text-decoration: underline;
  }
  .quitar {
    display: inline-grid;
    place-items: center;
    opacity: 0.6;
  }
  .quitar:hover {
    opacity: 1;
  }
  .entrada {
    position: relative;
    flex: 1;
    min-width: 80px;
  }
  .entrada input {
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    color: var(--ink);
    width: 100%;
  }
  .entrada input::placeholder {
    color: var(--ink-3);
    font-style: italic;
  }
  .lista {
    position: absolute;
    left: 0;
    top: calc(100% + 6px);
    z-index: 20;
    list-style: none;
    margin: 0;
    padding: 4px;
    min-width: 200px;
  }
  .lista button {
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border-radius: 6px;
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .lista button.on,
  .lista button:hover {
    background: var(--sel);
  }
  .lista small {
    color: var(--ink-3);
    font-size: 11px;
  }
  .crear {
    margin-top: 6px;
    padding: 8px 10px;
    border: 1px dashed var(--line-2);
    border-radius: 8px;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .botones {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .error {
    color: var(--warn);
    font-size: 12px;
    margin: 4px 0 0;
  }
</style>
