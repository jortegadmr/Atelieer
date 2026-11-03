<script lang="ts">
  // Quién sabe qué (spec 010, RF-31 a RF-37): secretos × episodios de la
  // temporada. Cada casilla dice lo que sabe el público al acabar el episodio y
  // quién lo sabe. Clic en una casilla lleva el visor al episodio; en el
  // título, abre el secreto en el panel.
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { estadoDe } from "../../lib/modelo/estados";
  import { quienSabe } from "../../lib/vistas/quien-sabe";
  import { enfocable, lenteDeSecreto } from "../comunes/enfocable";

  const { temporada }: { temporada: string } = $props();
  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const m = s.modelo;
    const q = quienSabe(m, s.wiki, temporada);
    return { q, codigos: q.episodios.map((e) => c.codigo(m, e.id)) };
  });

  // RF-35: lente de personaje o de secreto, las filas de los demás secretos; de arco, las casillas de episodios no relacionados
  const filaFuera = (id: string) => !!estado.relacionLente && estado.lente?.tipo !== "arco" && !estado.relacionLente.secretos.has(id);
  const casillaFuera = (ep: string) => !!estado.relacionLente && estado.lente?.tipo === "arco" && !estado.relacionLente.episodios.has(ep);

  const titulo = (t: string) => t.trim() || "Sin título";
</script>

{#if !d.q.filas.length}
  <p class="hint">Aún no hay secretos</p>
{:else}
  <div class="caja-tabla">
    <table class="analisis sabe">
      <thead>
        <tr>
          <th scope="col" class="nombre">Secreto</th>
          {#each d.q.episodios as e, i (e.id)}
            <th scope="col" title={e.titulo || "Sin título"} class:fuera-lente={casillaFuera(e.id)}>{d.codigos[i]}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each d.q.filas as f (f.secreto.id)}
          {@const fuera = filaFuera(f.secreto.id)}
          <tr class:fuera-lente={fuera}>
            <th scope="row" class="nombre">
              <button
                class="enlace-fila"
                title="Abrir {titulo(f.secreto.titulo)}"
                onclick={() => estado.elegir(f.secreto.id)}
                use:enfocable={{ estado, lente: lenteDeSecreto(f.secreto) }}
              >
                {titulo(f.secreto.titulo)}{#if estadoDe(f.secreto) === "aparcado"}<span class="aparcado">{" (aparcado)"}</span>{/if}{#if fuera}<span class="solo-lector">, fuera de la lente</span>{/if}
              </button>
              {#if f.sinFecha.length}<p class="nota">Lo conocen sin fecha: {f.sinFecha.join(", ")}</p>{/if}
              {#if f.fuera.length}
                <p class="nota">Fuera de las temporadas: {f.fuera.map((x) => `${x.nombre} (${x.codigo}, sin temporada)`).join(", ")}</p>
              {/if}
            </th>
            {#each d.q.episodios as e, i (e.id)}
              {@const k = f.casillas[i]}
              {@const cf = casillaFuera(e.id)}
              <td class:fuera-lente={cf}>
                <button title="Ir a {d.codigos[i]}" onclick={() => estado.irANivel({ tipo: "episodio", temporada, episodio: e.id })}>
                  <span class="pub {k.publico}">{k.texto}{#if k.nuevo}<span class="nuevo" title="Nuevo en este episodio" aria-hidden="true">{" ●"}</span>{/if}</span>
                  {#if k.saben.length}
                    <span class="saben" aria-hidden="true">
                      {#each k.saben as n, j (j)}{#if j}, {/if}<span class:entera={k.seEnteran.includes(n)}>{n}{k.seEnteran.includes(n) ? " ●" : ""}</span>{/each}
                    </span>
                  {/if}
                  <span class="solo-lector">
                    {titulo(f.secreto.titulo)}, {d.codigos[i]}: {k.texto}{k.nuevo ? ", nuevo en este episodio" : ""}{k.saben.length
                      ? `. Lo saben: ${k.saben.map((n) => (k.seEnteran.includes(n) ? `${n} (se entera aquí)` : n)).join(", ")}`
                      : ""}{cf ? ", fuera de la lente" : ""}
                  </span>
                </button>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="leyenda" aria-hidden="true">● lo nuevo del episodio: la pista, la revelación o quien se entera en él</p>
{/if}

<style>
  .sabe td > button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    min-width: 110px;
    text-align: left;
    font: 12px var(--sans);
  }
  .pub {
    font: 11.5px var(--mono);
    color: var(--ink-2);
  }
  .pub.revelado {
    color: var(--accent);
  }
  .pub.nada {
    color: var(--ink-3);
  }
  .nuevo {
    color: var(--accent);
  }
  .saben {
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  .entera {
    font-weight: 600;
    color: var(--ink);
  }
  /* Lo de fuera de la lente, sin color propio (RF-4: color, no opacidad) */
  .fuera-lente .pub,
  .fuera-lente .nuevo,
  .fuera-lente .saben,
  .fuera-lente .entera {
    color: var(--ink-3);
  }
  .aparcado {
    font-weight: 400;
    color: var(--ink-3);
  }
  .nota {
    margin: 0;
    padding: 0 10px 8px;
    font-size: 11.5px;
    font-weight: 400;
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
</style>
