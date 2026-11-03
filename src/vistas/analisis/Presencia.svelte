<script lang="ts">
  // Presencia (spec 010, RF-17 a RF-25): personajes × episodios de la
  // temporada. Clic en una casilla lleva el visor al episodio; en un nombre,
  // pone la lente sobre él.
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import { enAusencia, presencia } from "../../lib/vistas/presencia";
  import { enfocable } from "../comunes/enfocable";

  const { temporada }: { temporada: string } = $props();
  const estado = usarEstado();

  const d = $derived.by(() => {
    void estado.version;
    const s = estado.sesion!;
    const m = s.modelo;
    const p = presencia(m, s.wiki, temporada);
    return { p, codigos: p.episodios.map((e) => c.codigo(m, e.id)), hayAusencias: p.filas.some((f) => f.ausencias.length) };
  });

  // RF-24: lente de personaje, las demás filas; de arco o secreto, las casillas de episodios no relacionados
  const filaFuera = (clave: string) => estado.lente?.tipo === "personaje" && estado.lente.clave !== clave;
  const casillaFuera = (ep: string) => !!estado.relacionLente && estado.lente?.tipo !== "personaje" && !estado.relacionLente.episodios.has(ep);

  const escenas = (n: number) => (n === 1 ? "1 escena" : `${n} escenas`);
</script>

{#if !d.p.filas.length}
  <p class="hint">Ninguna escena de esta temporada tiene personajes</p>
{:else}
  <div class="caja-tabla">
    <table class="analisis">
      <thead>
        <tr>
          <th scope="col" class="nombre">Personaje</th>
          {#each d.p.episodios as e, i (e.id)}
            <th scope="col" title={e.titulo || "Sin título"} class:fuera-lente={casillaFuera(e.id)}>{d.codigos[i]}</th>
          {/each}
          <th scope="col" class="total">Escenas</th>
          <th scope="col" class="total">Episodios</th>
        </tr>
      </thead>
      <tbody>
        {#each d.p.filas as f (f.clave)}
          {@const fuera = filaFuera(f.clave)}
          <tr class:fuera-lente={fuera}>
            <th scope="row" class="nombre">
              <button
                class="enlace-fila"
                title="Poner la lente sobre {f.nombre}"
                onclick={() => estado.ponerLente({ tipo: "personaje", clave: f.clave, nombre: f.nombre })}
                use:enfocable={{ estado, lente: { tipo: "personaje", clave: f.clave, nombre: f.nombre } }}
              >
                {f.nombre}{#if fuera}<span class="solo-lector">, fuera de la lente</span>{/if}
              </button>
            </th>
            {#each d.p.episodios as e, i (e.id)}
              {@const n = f.casillas[i]}
              {@const aus = enAusencia(d.p, f, i)}
              {@const cf = casillaFuera(e.id)}
              <td class:aus={!!aus} class:fuera-lente={cf}>
                <button
                  title={aus ? `Ausencia larga (${aus.n} episodios)` : `Ir a ${d.codigos[i]}`}
                  onclick={() => estado.irANivel({ tipo: "episodio", temporada, episodio: e.id })}
                >
                  <span aria-hidden="true">{n || (aus ? "—" : "")}</span>
                  <span class="solo-lector">{f.nombre}, {d.codigos[i]}: {n ? escenas(n) : "no sale"}{aus ? `, ausencia larga (${aus.n} episodios)` : ""}{cf ? ", fuera de la lente" : ""}</span>
                </button>
              </td>
            {/each}
            <td class="total">{f.escenas}</td>
            <td class="total">{f.episodiosCon}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if d.hayAusencias}<p class="leyenda" aria-hidden="true">— ausencia larga: 3 episodios seguidos o más sin salir</p>{/if}
{/if}
