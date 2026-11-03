<script lang="ts">
  // La ficha del mundo a ancho completo (spec 015, RF-3 a RF-12): título,
  // estado, alias, cada apartado como texto editable, relaciones, bloc de
  // ideas, quién la usa, mover y quitar. Todo se guarda en la nota de la vault.
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import LockOpen from "@lucide/svelte/icons/lock-open";
  import Plus from "@lucide/svelte/icons/plus";
  import { usarEstado } from "../../lib/app/contexto";
  import TextoVisual from "../comunes/TextoVisual.svelte";
  import { abrirUrl } from "../../lib/app/plataforma";
  import { avisosDeFicha } from "../../lib/wiki/guias-ficha";
  import { categoria, type Relacion } from "../../lib/wiki/mundo";

  const estado = usarEstado();
  const m = estado.mundo;
  const a = $derived(m.abierta!);

  // ---- Guías de los arcos del personaje (RF-9) ----
  const guias = $derived.by(() => {
    void estado.version;
    const mod = estado.sesionSerie?.modelo;
    return mod && a.ficha.categoria === "personaje" ? avisosDeFicha(mod, a.ficha.nombre, a.ficha.aliases) : [];
  });

  // ---- Título (renombrar) ----
  let titulo = $state("");
  $effect(() => {
    titulo = a.ficha.nombre;
  });

  // ---- Alias ----
  let aliases = $state("");
  $effect(() => {
    aliases = a.ficha.aliases.join(", ");
  });

  // ---- Relaciones ----
  let relaciones = $state<Relacion[]>([]);
  $effect(() => {
    relaciones = a.ficha.relaciones.map((r) => ({ ...r }));
  });
  const TIPOS = ["romántica", "amistad", "rivalidad", "familia", "alianza"];
  let nombresPosibles = $state<string[]>([]);
  $effect(() => {
    const s = estado.sesionSerie;
    nombresPosibles = s ? [...new Set([...s.wiki.de("personaje"), ...s.wiki.de("lugar")].map((f) => f.nombre))] : [];
  });

  // ---- Ideas ----
  let idea = $state("");
  async function apuntar(e: SubmitEvent) {
    e.preventDefault();
    if (await m.anadirIdea(idea)) idea = "";
  }

  // ---- Mover y quitar ----
  let destino = $state("");
  let confirmandoQuitar = $state(false);

  const ESTADOS = ["idea", "borrador", "canon"] as const;
  const urlObsidian = $derived(estado.sesionSerie?.wiki.urlObsidian(a.ficha.ruta) ?? "");
</script>

<div class="ficha">
  <div class="cab">
    <button class="btn ghost" onclick={() => m.abrirCategoria(a.ficha.categoria)}><ArrowLeft class="i" />{categoria(a.ficha.categoria).nombre}</button>
    <div class="acciones">
      {#if urlObsidian}<button class="btn ghost" onclick={() => abrirUrl(urlObsidian)}><ArrowUpRight class="i" />Abrir en Obsidian</button>{/if}
    </div>
  </div>

  {#if m.error}<div class="warnbox" role="alert"><span>{m.error}</span></div>{/if}

  {#if m.cambioFuera}
    <div class="warnbox" role="alert">
      <span>Esta ficha cambió en Obsidian mientras la editabas. Tu versión está intacta y no se ha guardado. ¿Qué hago?</span>
      <span class="botones">
        <button class="btn" onclick={() => m.quedarmeConLaMia()}>Quedarme con la mía</button>
        <button class="btn" onclick={() => m.usarLaDeFuera()}>Usar la de fuera</button>
        <button class="btn" onclick={() => m.copiarLaMia()}>Copiar la mía</button>
      </span>
    </div>
  {/if}

  {#if a.ficha.estado === "canon" && !m.desbloqueada}
    <div class="warnbox info">
      <span>Esta ficha es canon: está bloqueada. Cambiarla es un retcon.</span>
      <button class="btn" onclick={() => m.desbloquear()}><LockOpen class="i" />Desbloquear a propósito</button>
    </div>
  {/if}

  <div class="titulo">
    <span class="tipo">{categoria(a.ficha.categoria).singular}</span>
    <input class="t" aria-label="Nombre de la ficha" bind:value={titulo} disabled={m.soloLectura || m.bloqueada} onkeydown={(e) => e.key === "Enter" && titulo.trim() !== a.ficha.nombre && m.planearRenombre(titulo)} />
    {#if titulo.trim() !== a.ficha.nombre && titulo.trim()}
      <button class="btn" onclick={() => m.planearRenombre(titulo)}>Renombrar…</button>
    {/if}
  </div>

  {#if m.planRenombre}
    <div class="warnbox info" role="group" aria-label="Confirmar renombrado">
      <span>
        Renombrar «{a.ficha.nombre}» a «{m.planRenombre.nuevo}» cambia los enlaces de {m.planRenombre.cambios.length} nota{m.planRenombre.cambios.length === 1 ? "" : "s"}
        ({m.planRenombre.cambios.reduce((n, c) => n + c.veces, 0)} enlace{m.planRenombre.cambios.reduce((n, c) => n + c.veces, 0) === 1 ? "" : "s"}). Cada una deja copia de cómo estaba.
      </span>
      <span class="botones">
        <button class="btn pri" onclick={() => m.confirmarRenombre()}>Renombrar</button>
        <button class="btn ghost" onclick={() => { m.cancelarRenombre(); titulo = a.ficha.nombre; }}>Cancelar</button>
      </span>
    </div>
  {/if}

  <div class="fila">
    <label class="campo">
      <span>Estado</span>
      <select value={a.ficha.estado || "idea"} disabled={m.soloLectura || m.bloqueada} onchange={(e) => m.cambiarEstado(e.currentTarget.value as never)}>
        {#each ESTADOS as e (e)}<option value={e}>{e}</option>{/each}
        {#if a.ficha.estado && !(ESTADOS as readonly string[]).includes(a.ficha.estado)}<option value={a.ficha.estado}>{a.ficha.estado}</option>{/if}
      </select>
    </label>
    <label class="campo ancho">
      <span>Alias (separados por comas)</span>
      <input
        bind:value={aliases}
        disabled={m.soloLectura || m.bloqueada}
        onblur={() => m.guardarAliases(aliases.split(","))}
        onkeydown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
    </label>
  </div>

  <section aria-label="Contenido">
    <details class="chuleta">
      <summary>Cómo se escribe</summary>
      <ul>
        <li>Pulsa en un texto para escribir; al salir se guarda solo.</li>
        <li>Los botones de arriba ponen <strong>negrita</strong>, <em>cursiva</em>, títulos, listas, citas y enlaces a otras fichas.</li>
        <li>Un enlace a otra ficha se escribe <code>[[Nombre]]</code> (el botón [[ ]] lo hace).</li>
        <li>Las tablas se rellenan celda a celda; «+ Fila» añade una.</li>
        <li>Lo marcado <mark class="pend">[PENDIENTE]</mark> es lo que aún falta por decidir.</li>
      </ul>
    </details>
    {#each a.leida.apartados as ap, i (i + ap.titulo)}
      <div class="apartado">
        <span class="etq">{ap.titulo === "Inicio" ? "Resumen y notas iniciales" : ap.titulo}</span>
        <TextoVisual etiqueta={ap.titulo === "Inicio" ? "Resumen y notas iniciales" : ap.titulo} valor={ap.texto} soloLectura={m.soloLectura || m.bloqueada} alEnlace={(n) => m.abrirPorNombre(n)} alCambiar={(f) => m.guardarApartadoCon(i, f)} />
      </div>
    {/each}
  </section>

  <section aria-label="Relaciones" class="bloque">
    <h2>Relaciones</h2>
    {#each relaciones as r, i (i)}
      <div class="rel">
        <input list="nombres-mundo" aria-label="Con quién" placeholder="Con quién" bind:value={r.con} disabled={m.soloLectura || m.bloqueada} onblur={() => m.guardarRelaciones(relaciones)} />
        <input list="tipos-relacion" aria-label="Tipo de relación" placeholder="Tipo (romántica, amistad, rivalidad…)" bind:value={r.tipo} disabled={m.soloLectura || m.bloqueada} onblur={() => m.guardarRelaciones(relaciones)} />
        <button class="btn ghost" aria-label="Quitar la relación" disabled={m.soloLectura || m.bloqueada} onclick={() => { relaciones = relaciones.filter((_, j) => j !== i); void m.guardarRelaciones(relaciones); }}>Quitar</button>
      </div>
    {/each}
    <datalist id="nombres-mundo">{#each nombresPosibles as n (n)}<option value={n}></option>{/each}</datalist>
    <datalist id="tipos-relacion">{#each TIPOS as t (t)}<option value={t}></option>{/each}</datalist>
    <button class="btn" disabled={m.soloLectura || m.bloqueada} onclick={() => (relaciones = [...relaciones, { con: "", tipo: "" }])}><Plus class="i" />Añadir relación</button>
  </section>

  <section aria-label="Ideas" class="bloque">
    <h2>Ideas sobre esta ficha</h2>
    {#if a.ideas.length}
      <ul class="ideas">{#each a.ideas as i, k (k)}<li>{i}</li>{/each}</ul>
    {/if}
    <form class="apuntar" onsubmit={apuntar}>
      <input aria-label="Apuntar una idea" placeholder="Apunta una idea sin pensar dónde va…" bind:value={idea} disabled={m.soloLectura || m.bloqueada} />
      <button class="btn" type="submit" disabled={!idea.trim() || m.soloLectura || m.bloqueada}>Apuntar</button>
    </form>
  </section>

  {#if guias.length}
    <section aria-label="Guías" class="bloque">
      <h2>Lo que dicen las guías</h2>
      <ul class="usos">
        {#each guias as g (g.aviso.id + g.arco + (g.aviso.sobre ?? ""))}
          <li>
            <span>{g.aviso.mensaje}</span>
            <span class="veces">{g.aviso.id} · {g.aviso.fuente} · <button class="enlace" onclick={() => estado.irAPieza(g.arco)}>Arco «{g.tituloArco}»</button></span>
          </li>
        {/each}
      </ul>
      <p class="nada">Se corrigen, se cambian o se dejan con constancia en el arco; aquí solo se ven.</p>
    </section>
  {/if}

  <section aria-label="Quién la usa" class="bloque">
    <h2>Quién la usa</h2>
    {#if a.usos.length}
      <ul class="usos">
        {#each a.usos as u (u.ruta)}
          <li>
            {#if u.tipo === "ficha"}
              <button class="enlace" onclick={() => m.abrirPorNombre(u.nombre)}>{u.nombre}</button>
            {:else if u.tipo === "guion"}
              <button class="enlace" onclick={() => estado.cambiarVista("guion")}>Guion de {u.nombre}</button>
            {:else}
              <span>{u.nombre}</span>
            {/if}
            <span class="veces">{u.tipo} · {u.veces} {u.veces === 1 ? "vez" : "veces"}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="nada">Nadie la nombra todavía.</p>
    {/if}
  </section>

  <section aria-label="Mover o quitar" class="bloque fila">
    <label class="campo">
      <span>Mover a una carpeta de {categoria(a.ficha.categoria).nombre.toLowerCase()}</span>
      <select bind:value={destino} disabled={m.soloLectura || m.bloqueada}>
        <option value="">(raíz de la categoría)</option>
        {#each a.subcarpetas as s (s)}<option value={s}>{s}</option>{/each}
      </select>
    </label>
    <button class="btn" disabled={m.soloLectura || m.bloqueada || destino === a.ficha.subcarpeta} onclick={() => m.mover(destino)}>Mover</button>
    <span class="espacio"></span>
    {#if confirmandoQuitar}
      <span class="botones">
        <span class="aviso-quitar">
          {a.usos.length ? `La nombran ${a.usos.length} nota${a.usos.length === 1 ? "" : "s"}: quedarían con un enlace sin ficha. ` : ""}Va a la papelera de la serie.
        </span>
        <button class="btn pri" onclick={() => m.quitar()}>Sí, quitar</button>
        <button class="btn ghost" onclick={() => (confirmandoQuitar = false)}>No</button>
      </span>
    {:else}
      <button class="btn" disabled={m.soloLectura || m.bloqueada} onclick={() => (confirmandoQuitar = true)}>Quitar…</button>
    {/if}
  </section>
</div>

<style>
  .ficha {
    max-width: 920px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .cab {
    display: flex;
    justify-content: space-between;
  }
  .titulo {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }
  .tipo {
    font: 500 11.5px var(--sans);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .titulo input {
    flex: 1;
    min-width: 200px;
    font: 400 34px/1.15 var(--serif);
    color: var(--ink);
    background: transparent;
    border: 0;
    border-bottom: 1px solid transparent;
    outline: none;
  }
  .titulo input:focus {
    border-bottom-color: var(--accent);
  }
  .fila {
    display: flex;
    gap: 14px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .campo {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--ink-2);
  }
  .campo.ancho {
    flex: 1;
    min-width: 220px;
  }
  .campo input,
  .campo select,
  .rel input,
  .apuntar input {
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 7px 10px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
  }
  .apartado {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 14px;
  }
  .apartado .etq {
    font: 500 12px var(--sans);
    color: var(--ink-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  textarea {
    width: 100%;
    resize: vertical;
    border: 1px solid var(--line-2);
    border-radius: 10px;
    padding: 10px 12px;
    background: var(--surface);
    color: var(--ink);
    font: 400 15px/1.55 var(--sans);
  }
  textarea:focus,
  input:focus,
  select:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .chuleta {
    margin-bottom: 14px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .chuleta summary {
    cursor: pointer;
  }
  .chuleta ul {
    margin: 8px 0 0;
    padding-left: 20px;
    display: grid;
    gap: 4px;
  }
  .chuleta code {
    font: 12px var(--mono);
  }
  .pend {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--accent);
    border-radius: 4px;
    padding: 0 4px;
  }
  .bloque h2 {
    font: 400 20px var(--serif);
    margin-bottom: 8px;
  }
  .rel,
  .apuntar {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .rel input,
  .apuntar input {
    flex: 1;
  }
  .ideas,
  .usos {
    margin: 0 0 10px;
    padding-left: 18px;
    color: var(--ink);
  }
  .usos {
    list-style: none;
    padding: 0;
  }
  .usos li {
    display: flex;
    gap: 10px;
    padding: 3px 0;
  }
  .veces,
  .nada {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .enlace {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
  .botones {
    display: inline-flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .espacio {
    flex: 1;
  }
  .aviso-quitar {
    font-size: 12.5px;
    color: var(--ink-2);
  }
</style>
