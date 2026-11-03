// C01 y C02: la regla del + y el − (spec 4.5, §12, Escena 1.3).

import * as c from "../modelo/consultas";
import type { Modelo } from "../modelo/modelo";
import type { ParCarga } from "../modelo/tipos";
import { aviso, signo, titulo, vivo } from "./base";
import type { Aviso } from "./tipos";

const decidida = (x: ParCarga) => x[0] !== "" && x[1] !== "";

/** C01a, C01b y C01c: temporadas y episodios */
export function c01(m: Modelo): Aviso[] {
  const r: Aviso[] = [];
  const cod = (id: string) => c.codigo(m, id);
  // Lo aparcado y lo descartado no cuenta ni rompe la cadena de sus vecinos (RF-15, RF-17)
  const temporadas = c.temporadasEnOrden(m).filter(vivo);

  // a: dentro de cada pieza, la carga cambia
  for (const t of temporadas) {
    if (decidida(t.carga) && t.carga[0] === t.carga[1]) {
      r.push(aviso("C01a", t.id, "aviso", `${cod(t.id)} empieza y acaba en ${signo(t.carga[0])}: no cambia de carga.`, "§12", "Carga"));
    }
  }
  const episodios = c.episodiosEnOrden(m).filter(vivo);
  for (const e of episodios) {
    if (decidida(e.carga) && e.carga[0] === e.carga[1]) {
      r.push(aviso("C01a", e.id, "aviso", `${cod(e.id)} empieza y acaba en ${signo(e.carga[0])}: no cambia de carga.`, "§12", "Carga"));
    }
  }

  // b: cada pieza empieza con la carga con la que acabó la anterior
  const encaja = (antes: ParCarga, ahora: ParCarga) => !antes[1] || !ahora[0] || antes[1] === ahora[0];
  for (let i = 1; i < temporadas.length; i++) {
    const [a, t] = [temporadas[i - 1], temporadas[i]];
    if (!encaja(a.carga, t.carga)) {
      r.push(aviso("C01b", t.id, "aviso", `${cod(t.id)} no empieza con la carga con la que acabó ${cod(a.id)} (${signo(a.carga[1])}).`, "§12", "Carga", a.id));
    }
  }
  for (let i = 1; i < episodios.length; i++) {
    const [a, e] = [episodios[i - 1], episodios[i]];
    if (!encaja(a.carga, e.carga)) {
      r.push(aviso("C01b", e.id, "aviso", `${cod(e.id)} no empieza con la carga con la que acabó ${cod(a.id)} (${signo(a.carga[1])}).`, "§12", "Carga", a.id));
    }
  }

  // c: el primer episodio empieza como su temporada y el último acaba como ella
  for (const t of temporadas) {
    const eps = c.episodiosDeTemporada(m, t.id).filter(vivo);
    if (!eps.length) continue;
    const [primero, ultimo] = [eps[0], eps[eps.length - 1]];
    if (t.carga[0] && primero.carga[0] && t.carga[0] !== primero.carga[0]) {
      r.push(aviso("C01c", primero.id, "aviso", `${cod(primero.id)} abre ${cod(t.id)} y no empieza con su carga (${signo(t.carga[0])}).`, "§12", "Carga", `${t.id} abre`));
    }
    if (t.carga[1] && ultimo.carga[1] && t.carga[1] !== ultimo.carga[1]) {
      r.push(aviso("C01c", ultimo.id, "aviso", `${cod(ultimo.id)} cierra ${cod(t.id)} y no acaba con su carga (${signo(t.carga[1])}).`, "§12", "Carga", `${t.id} cierra`));
    }
  }
  return r;
}

/** C02: evento cuyo valor empieza y acaba igual */
export function c02(m: Modelo): Aviso[] {
  return [...m.eventos.values()]
    .filter((e) => vivo(e) && decidida(e.cambio) && e.cambio[0] === e.cambio[1])
    .map((e) =>
      aviso("C02", e.id, "aviso", `«${titulo(e)}» empieza y acaba en ${signo(e.cambio[0])}: si el valor no cambia, la escena sobra o se fusiona.`, "Escena 1.3 · F5", "Escenas"),
    );
}
