// Los apartados de una ficha (spec 009, RF-36, RF-37, RF-37b, RF-44): «Inicio»
// (entre las propiedades y el primer título) y cada título `## `. Se trabaja
// sobre el texto crudo: lo que no es el apartado cambiado queda igual, byte a
// byte (BOM, fin de línea, salto final, títulos repetidos).

export interface Apartado {
  /** «Inicio» para lo de antes del primer título */
  titulo: string;
  /** Lo que hay debajo del título, en el texto crudo: [desde, hasta) */
  desde: number;
  hasta: number;
  /** Ese trozo con `\n` y sin los saltos del final */
  texto: string;
}

const esTitulo = (linea: string) => /^##(?:[ \t]|$)/.test(linea);

interface Linea {
  /** Sin el fin de línea */
  texto: string;
  inicio: number;
  /** Después de su fin de línea */
  fin: number;
}

function lineas(t: string, desde: number): Linea[] {
  const r: Linea[] = [];
  let i = desde;
  while (i < t.length) {
    const n = t.indexOf("\n", i);
    const fin = n < 0 ? t.length : n + 1;
    r.push({ texto: t.slice(i, n < 0 ? t.length : n).replace(/\r$/, ""), inicio: i, fin });
    i = fin;
  }
  return r;
}

/** Dónde empieza el cuerpo: tras el BOM y, si las hay, tras las propiedades */
function inicioCuerpo(t: string): { bom: number; cuerpo: number; propiedades: boolean } {
  const bom = t.charCodeAt(0) === 0xfeff ? 1 : 0;
  const ls = lineas(t, bom);
  if (ls[0]?.texto.trimEnd() !== "---") return { bom, cuerpo: bom, propiedades: false };
  const cierre = ls.findIndex((l, i) => i > 0 && l.texto.trimEnd() === "---");
  if (cierre < 0) return { bom, cuerpo: bom, propiedades: false };
  return { bom, cuerpo: ls[cierre].fin, propiedades: true };
}

/** ¿Acaba la línea dentro de un comentario `<!-- -->`? */
export function sigueAbierto(linea: string, abierto: boolean): boolean {
  let pos = 0;
  for (;;) {
    const k = linea.indexOf(abierto ? "-->" : "<!--", pos);
    if (k < 0) return abierto;
    pos = k + (abierto ? 3 : 4);
    abierto = !abierto;
  }
}

const sinSaltosFinales = (s: string) => s.replace(/(?:\r?\n)+$/, "");

export function partirApartados(t: string): Apartado[] {
  const { cuerpo } = inicioCuerpo(t);
  const cortes: { titulo: string; desde: number; linea: number }[] = [{ titulo: "Inicio", desde: cuerpo, linea: cuerpo }];
  let valla: { c: string; n: number } | null = null;
  let comentario = false;
  for (const l of lineas(t, cuerpo)) {
    if (comentario) {
      comentario = sigueAbierto(l.texto, true);
      continue;
    }
    const v = l.texto.match(/^ {0,3}(`{3,}|~{3,})/);
    if (valla) {
      if (v && v[1][0] === valla.c && v[1].length >= valla.n && !l.texto.trim().slice(v[1].length).trim()) valla = null;
      continue;
    }
    if (v) {
      valla = { c: v[1][0], n: v[1].length };
      continue;
    }
    if (esTitulo(l.texto)) {
      cortes.push({ titulo: l.texto.slice(2).trim(), desde: l.fin, linea: l.inicio });
      continue;
    }
    comentario = sigueAbierto(l.texto, false);
  }
  return cortes.map((c, i) => {
    const hasta = i + 1 < cortes.length ? cortes[i + 1].linea : t.length;
    return { titulo: c.titulo, desde: c.desde, hasta, texto: sinSaltosFinales(t.slice(c.desde, hasta)).replace(/\r\n/g, "\n") };
  });
}

/** El texto de la nota con el apartado `i` cambiado por `nuevo`; el resto, intacto */
export function cambiarApartado(t: string, i: number, nuevo: string): string {
  const aps = partirApartados(t);
  const a = aps[i];
  if (!a) return t;
  const { bom } = inicioCuerpo(t);
  const fin = t.includes("\r\n") ? "\r\n" : "\n";
  const viejo = t.slice(a.desde, a.hasta);
  const cola = viejo.slice(sinSaltosFinales(viejo).length);
  let texto = sinSaltosFinales(nuevo.replace(/\r\n?/g, "\n")).replace(/\n/g, fin);
  if (texto) {
    // Que no se pegue al título de arriba (sin salto) ni al de abajo
    if (a.desde > bom && t[a.desde - 1] !== "\n") texto = fin + texto;
    texto += cola || (i + 1 < aps.length ? fin : "");
  } else texto = cola;
  return t.slice(0, a.desde) + texto + t.slice(a.hasta);
}

/** RF-37b: por qué no se puede guardar `nuevo` en el apartado `i`, o null */
export function porQueNoSeGuarda(t: string, i: number, nuevo: string): string | null {
  const ls = nuevo.replace(/\r\n?/g, "\n").split("\n");
  if (ls.some(esTitulo)) return "Los apartados se crean en Obsidian.";
  if (i === 0 && !inicioCuerpo(t).propiedades && ls[0].trimEnd() === "---") return "Eso rompería las propiedades.";
  // Un `<!--` o una valla sin cerrar: los títulos de debajo dejarían de serlo (revisión)
  const titulos = (x: string) => partirApartados(x).map((a) => a.titulo).join("\n");
  if (titulos(cambiarApartado(t, i, nuevo)) !== titulos(t)) return "Eso escondería los apartados de debajo: cierra el comentario o el bloque de código.";
  return null;
}
