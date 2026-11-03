<script lang="ts">
  // Editar de un punto clave de la serie (spec 4.2 Punto clave, T2.3).
  import { usarEstado } from "../../lib/app/contexto";
  import * as c from "../../lib/modelo/consultas";
  import type { Punto } from "../../lib/modelo/tipos";
  import { CLASE_PUNTO, etiqueta, type ClasePunto } from "../../lib/modelo/vocabulario";
  import IconoPunto from "../comunes/IconoPunto.svelte";
  import CampoTexto from "./campos/CampoTexto.svelte";
  import Conmutador from "./campos/Conmutador.svelte";
  import SelectorPieza from "./campos/SelectorPieza.svelte";

  const { punto }: { punto: Punto } = $props();
  const estado = usarEstado();
  const editar = (fn: (p: Punto) => void) => estado.sesion!.editar<Punto>(punto.id, fn);

  const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);
  const clases = CLASE_PUNTO.map((v) => ({ valor: v, texto: mayus(etiqueta(CLASE_PUNTO, v)) }));

  const listas = $derived.by(() => {
    void estado.version;
    const m = estado.sesion!.modelo;
    return {
      temporadas: c.temporadasEnOrden(m).map((t) => ({ id: t.id, texto: `${c.codigo(m, t.id)} · ${t.titulo || t.estado}` })),
      episodios: c.episodiosDeTemporada(m, punto.posicion.temporada).map((e) => ({ id: e.id, texto: `${c.codigo(m, e.id)} · ${e.titulo || "sin título"}` })),
    };
  });
</script>

<div class="ib-body">
  <Conmutador etiqueta="Tipo" opciones={clases} valor={punto.clase} alCambiar={(v: ClasePunto) => editar((p) => (p.clase = v))}>
    {#snippet marca(v: ClasePunto)}<IconoPunto clase={v} estilo="width:13px;height:13px" />{/snippet}
  </Conmutador>
  <div class="f2">
    <SelectorPieza
      etiqueta="Temporada"
      opciones={listas.temporadas}
      valor={punto.posicion.temporada}
      alCambiar={(id) =>
        editar((p) => {
          p.posicion.temporada = id;
          p.posicion.episodio = "";
        })}
    />
    <SelectorPieza
      etiqueta="Episodio"
      opciones={listas.episodios}
      valor={punto.posicion.episodio}
      vacio="Sin fijar"
      alCambiar={(id) => editar((p) => (p.posicion.episodio = id))}
    />
  </div>
  <CampoTexto etiqueta="Qué pasa" largo valor={punto.que_pasa} pista="¿Qué ocurre en este punto?" alCambiar={(v) => editar((p) => (p.que_pasa = v))} />
</div>
