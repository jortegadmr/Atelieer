// «Enfocar» (spec 010, RF-2): clic derecho, tecla de menú o Mayús F10 sobre el
// elemento abren el menú contextual con «Enfocar», que pone la lente.
// Sin lente (`null`, por ejemplo un arco descartado), no hace nada.

import type { EstadoApp } from "../../lib/app/estado.svelte";
import { estadoDe } from "../../lib/modelo/estados";
import type { Arco, Secreto } from "../../lib/modelo/tipos";
import type { Lente } from "../../lib/vistas/lente";

type Opciones = { estado: EstadoApp; lente: Lente | null };

export function enfocable(nodo: HTMLElement, opciones: Opciones) {
  let o = opciones;

  function abrir(x: number, y: number) {
    // El foco vuelve a lo que lo tenía dentro del elemento (un botón de un span, por ejemplo)
    const activo = document.activeElement;
    const volver = activo instanceof HTMLElement && nodo.contains(activo) ? activo : nodo;
    if (o.lente) o.estado.menuLente = { lente: o.lente, x, y, volver };
  }
  // Desde el teclado, el menú sale debajo del elemento
  function debajo() {
    const r = nodo.getBoundingClientRect();
    abrir(r.left + 8, r.bottom);
  }

  function menu(e: MouseEvent) {
    if (!o.lente) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.clientX || e.clientY) abrir(e.clientX, e.clientY);
    else debajo();
  }
  function tecla(e: KeyboardEvent) {
    if (!o.lente || (e.key !== "ContextMenu" && !(e.key === "F10" && e.shiftKey))) return;
    e.preventDefault();
    e.stopPropagation();
    debajo();
  }

  nodo.addEventListener("contextmenu", menu);
  nodo.addEventListener("keydown", tecla);
  return {
    update(n: Opciones) {
      o = n;
    },
    destroy() {
      nodo.removeEventListener("contextmenu", menu);
      nodo.removeEventListener("keydown", tecla);
    },
  };
}

/** La lente de un arco; ninguna si está descartado (no sale en el buscador) */
export const lenteDeArco = (a: Arco): Lente | null => (estadoDe(a) === "descartado" ? null : { tipo: "arco", id: a.id });

/** La lente de un secreto; ninguna si está descartado */
export const lenteDeSecreto = (s: Secreto): Lente | null => (estadoDe(s) === "descartado" ? null : { tipo: "secreto", id: s.id });
