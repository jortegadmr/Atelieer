<script lang="ts">
  // Una línea por secreto (spec 5.3, T4.4): sus pistas (brote), sus pistas
  // falsas (fantasma) y, en el margen, dónde se revela (ojo).
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Ghost from "@lucide/svelte/icons/ghost";
  import Sprout from "@lucide/svelte/icons/sprout";
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { enfocable, lenteDeSecreto } from "../comunes/enfocable";

  const { temporadaId, n }: { temporadaId: string; n: number } = $props();
  const estado = usarEstado();

  const filas = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    const ix = m.indice();
    const iT = ix.posTemporada.get(temporadaId);
    // Episodio de una pista o revelación: el suyo, o el del evento al que apunta
    const ep = (episodio: string, evento: string) => episodio || m.eventos.get(evento)?.episodio || "";
    const aqui = (e: string) => {
      const p = ix.posEpisodio.get(e);
      return p && p.iT === iT ? p.iE : null;
    };
    return [...m.secretos.values()]
      .filter((s) => s.madurez !== "descartado")
      .map((s) => {
        const rev = ep(s.revelado_en.episodio, s.revelado_en.evento);
        return {
          s,
          pistas: s.pistas.map((x) => ({ x, i: aqui(ep(x.episodio, x.evento)) })).filter((x) => x.i !== null),
          falsas: s.falsas.map((x) => ({ x, i: aqui(ep(x.episodio, x.evento)) })).filter((x) => x.i !== null),
          revAqui: rev ? aqui(rev) : null,
          rev: rev ? c.codigo(m, rev) : "",
        };
      });
  });

  const p = (i: number) => ((i + 0.5) / n) * 100;
</script>

{#each filas as f (f.s.id)}
  <div class="row">
    <button class="rl click" onclick={() => estado.elegir(f.s.id)} use:enfocable={{ estado, lente: lenteDeSecreto(f.s) }}>
      <span class="sw ojo"><EyeOff class="i" style="width:13px;height:13px;color:var(--ink-3)" /></span>
      <span style="min-width:0">
        <span class="nm">{f.s.titulo || "Sin título"}</span>
        <small>secreto {f.s.nivel}{f.s.pistas.length ? "" : " · sin pistas"}</small>
      </span>
    </button>
    <div class="trk">
      <div class="ticks" style:grid-template-columns="repeat({n},1fr)">{#each Array(n) as _, i (i)}<i></i>{/each}</div>
      {#each f.pistas as { x, i }, k (k)}
        <button class="smk" style:left="{p(i!)}%" style:color="var(--ok)" title="Pista {x.clase}: {x.texto}" onclick={() => estado.elegir(f.s.id)}><Sprout class="i" /></button>
      {/each}
      {#each f.falsas as { x, i }, k (k)}
        <button class="smk" style:left="{p(i!)}%" style:color="var(--ink-3)" title="Pista falsa: {x.texto}" onclick={() => estado.elegir(f.s.id)}><Ghost class="i" /></button>
      {/each}
      {#if f.revAqui !== null}
        <button class="smk" style:left="{p(f.revAqui)}%" style:color="var(--accent)" title="Se revela aquí" onclick={() => estado.elegir(f.s.id)}><Eye class="i" /></button>
      {/if}
    </div>
    <div class="gut" style="color:var(--accent)">{#if f.rev}<Eye class="i" style="width:12px;height:12px" />{f.rev}{/if}</div>
  </div>
{/each}

<style>
  .rl.click {
    text-align: left;
  }
  .ojo {
    background: transparent;
    display: grid;
    place-items: center;
  }
</style>
