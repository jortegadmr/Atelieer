<script lang="ts">
  import LlevarSala from "../comunes/LlevarSala.svelte";
  import { usarEstado } from "../../lib/app/contexto";
  import { anuncios, filaElemento, filaFlecha, nombreElemento } from "../../lib/pizarra/lista";
  import { ordenLectura } from "../../lib/pizarra/resolver";
  import { COLORES, MAX_ETIQUETA, MAX_NOTA } from "../../lib/pizarra/tipos";

  type Props = {
    decir: (texto: string) => void;
    quitar: (id: string) => Promise<void>;
  };
  let { decir, quitar }: Props = $props();

  const estado = usarEstado();
  const pz = estado.pizarra;

  const elementos = $derived(ordenLectura(pz.pizarra));
  const porId = $derived(new Map(pz.pizarra.elementos.map((e) => [e.id, e])));
  const piezas = $derived.by(() => {
    void estado.version;
    return new Map(pz.pizarra.elementos.flatMap((e) => (e.tipo === "tarjeta" ? [[e.id, pz.tarjeta(e)] as const] : [])));
  });
  const nombre = (id: string) => nombreElemento(porId.get(id), piezas.get(id));

  let de = $state("");
  let a = $state("");
  let etiqueta = $state("");

  function escribe(ev: Event, id: string) {
    const campo = ev.currentTarget as HTMLTextAreaElement;
    if (pz.editarNota(id, campo.value)) decir(`La nota llegó al tope de ${MAX_NOTA} caracteres`);
    const n = pz.pizarra.elementos.find((x) => x.id === id);
    if (n?.tipo === "nota" && campo.value !== n.texto) campo.value = n.texto;
  }

  function etiquetar(ev: Event, id: string) {
    const campo = ev.currentTarget as HTMLInputElement;
    if (pz.etiquetar(id, campo.value)) decir(`La etiqueta se cortó en ${MAX_ETIQUETA} caracteres`);
    const f = pz.pizarra.flechas.find((x) => x.id === id);
    if (f) {
      campo.value = f.etiqueta;
      decir(anuncios.etiquetada(f.etiqueta));
    }
  }

  function unir() {
    if (!de || !a) return decir("Elige de qué elemento sale la flecha y a cuál llega.");
    const r = pz.unir(de, a, etiqueta);
    if ("error" in r) return decir(r.error);
    decir(anuncios.flechaCreada(nombre(de), nombre(a)));
    de = a = etiqueta = "";
  }
</script>

<div class="lista">
  <section aria-labelledby="h-elementos">
    <h2 id="h-elementos">Elementos <span class="n">{elementos.length}</span></h2>
    <ul>
      {#each elementos as e (e.id)}
        <li>
          <span class="fila">{filaElemento(e, piezas.get(e.id))}</span>
          {#if e.tipo === "nota"}
            <label>
              <span class="solo-lector">Texto de {nombre(e.id)}</span>
              <textarea rows="2" value={e.texto} readonly={pz.soloLectura} oninput={(ev) => escribe(ev, e.id)}></textarea>
            </label>
            <span class="colores" role="group" aria-label="Color">
              {#each COLORES as c (c.id)}
                <button
                  class="color"
                  style:background="var(--nota-{c.id})"
                  aria-label={c.nombre}
                  aria-pressed={e.color === c.id}
                  disabled={pz.soloLectura}
                  onclick={() => {
                    pz.colorear(e.id, c.id);
                    decir(anuncios.coloreada(c.id));
                  }}
                ></button>
              {/each}
            </span>
          {:else}
            <button class="btn" aria-label="Abrir pieza de {nombre(e.id)}" disabled={piezas.get(e.id)?.estado === "ausente"} onclick={() => estado.elegir(e.pieza)}>Abrir pieza</button>
            <LlevarSala origen={{ tipo: "pieza", id: e.pieza }} compacto />
          {/if}
          <button class="btn" aria-label="Quitar {nombre(e.id)}" disabled={pz.soloLectura} onclick={() => quitar(e.id)}>Quitar</button>
        </li>
      {:else}
        <li class="vacio">Sin elementos.</li>
      {/each}
    </ul>
  </section>

  <section aria-labelledby="h-flechas">
    <h2 id="h-flechas">Flechas <span class="n">{pz.pizarra.flechas.length}</span></h2>
    <ul>
      {#each pz.pizarra.flechas as f (f.id)}
        <li>
          <span class="fila">{filaFlecha(f, nombre(f.de), nombre(f.a))}</span>
          <label class="campo">
            <span>Etiqueta</span>
            <input type="text" value={f.etiqueta} maxlength={MAX_ETIQUETA} readonly={pz.soloLectura} onchange={(ev) => etiquetar(ev, f.id)} />
          </label>
          <button class="btn" aria-label="Quitar la flecha {filaFlecha(f, nombre(f.de), nombre(f.a))}" disabled={pz.soloLectura} onclick={() => quitar(f.id)}>Quitar</button>
        </li>
      {:else}
        <li class="vacio">Sin flechas.</li>
      {/each}
    </ul>

    {#if !pz.soloLectura}
      <div class="unir" role="group" aria-label="Unir dos elementos con una flecha">
        <label class="campo">
          <span>De</span>
          <select bind:value={de}>
            <option value="">Elige…</option>
            {#each elementos as e (e.id)}<option value={e.id}>{nombre(e.id)}</option>{/each}
          </select>
        </label>
        <label class="campo">
          <span>A</span>
          <select bind:value={a}>
            <option value="">Elige…</option>
            {#each elementos as e (e.id)}<option value={e.id}>{nombre(e.id)}</option>{/each}
          </select>
        </label>
        <label class="campo">
          <span>Etiqueta</span>
          <input type="text" bind:value={etiqueta} maxlength={MAX_ETIQUETA} />
        </label>
        <button class="btn pri" onclick={unir}>Crear flecha</button>
      </div>
    {/if}
  </section>
</div>

<style>
  .lista {
    display: grid;
    gap: 24px;
  }
  h2 {
    font: 600 13px var(--sans);
    margin: 0 0 8px;
  }
  .n {
    color: var(--ink-3);
    font-weight: 400;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
  }
  .fila {
    flex: 1 1 260px;
    min-width: 0;
  }
  li.vacio {
    color: var(--ink-3);
  }
  textarea,
  input,
  select {
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink);
    font: inherit;
    padding: 5px 9px;
  }
  textarea {
    width: 320px;
    resize: vertical;
  }
  .campo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .unir {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-top: 12px;
  }
  .colores {
    display: inline-flex;
    gap: 5px;
  }
  .color {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid var(--line-2);
  }
  .color[aria-pressed="true"] {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
