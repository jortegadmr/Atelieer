// Texto visual (spec 018): lo que hacen los botones de la barra sobre el texto
// y la selección. Funciones puras: devuelven el texto nuevo y la selección nueva.

export interface Seleccion {
  texto: string;
  ini: number;
  fin: number;
}

export type Accion = "negrita" | "cursiva" | "titulo" | "lista" | "cita" | "enlace";

function envolver(s: Seleccion, marca: string, relleno: string): Seleccion {
  const { texto, ini, fin } = s;
  const dentro = texto.slice(ini, fin);
  const l = marca.length;
  // Ya envuelto por fuera de la selección: se quita, salvo que la marca sea parte de otra más larga (** al pedir cursiva)
  const sueltaAntes = texto[ini - l - 1] !== "*" || marca !== "*";
  const sueltaDespues = texto[fin + l] !== "*" || marca !== "*";
  if (texto.slice(ini - l, ini) === marca && texto.slice(fin, fin + l) === marca && sueltaAntes && sueltaDespues) {
    return { texto: texto.slice(0, ini - l) + dentro + texto.slice(fin + l), ini: ini - l, fin: fin - l };
  }
  // Ya envuelto dentro de la selección (y sin más marcas iguales por dentro)
  if (dentro.length > 2 * l && dentro.startsWith(marca) && dentro.endsWith(marca) && !dentro.slice(l, dentro.length - l).includes(marca)) {
    const sin = dentro.slice(l, dentro.length - l);
    return { texto: texto.slice(0, ini) + sin + texto.slice(fin), ini, fin: ini + sin.length };
  }
  const medio = dentro || relleno;
  const nuevo = texto.slice(0, ini) + marca + medio + marca + texto.slice(fin);
  return { texto: nuevo, ini: ini + l, fin: ini + l + medio.length };
}

/** Líneas que toca la selección: de principio de la primera a final de la última */
function lineasDe(s: Seleccion): { desde: number; hasta: number; lineas: string[] } {
  const desde = s.texto.lastIndexOf("\n", s.ini - 1) + 1;
  const finBusqueda = s.fin > s.ini && s.texto[s.fin - 1] === "\n" ? s.fin - 1 : s.fin;
  const salto = s.texto.indexOf("\n", finBusqueda);
  const hasta = salto === -1 ? s.texto.length : salto;
  return { desde, hasta, lineas: s.texto.slice(desde, hasta).split("\n") };
}

function reemplazarLineas(s: Seleccion, nuevas: string[]): Seleccion {
  const { desde, hasta } = lineasDe(s);
  const bloque = nuevas.join("\n");
  return { texto: s.texto.slice(0, desde) + bloque + s.texto.slice(hasta), ini: desde, fin: desde + bloque.length };
}

function prefijo(s: Seleccion, p: string): Seleccion {
  const { lineas } = lineasDe(s);
  const todas = lineas.filter((l) => l.trim()).every((l) => l.startsWith(p));
  return reemplazarLineas(s, lineas.map((l) => (!l.trim() ? l : todas ? l.slice(p.length) : l.startsWith(p) ? l : p + l)));
}

/** Título: sin título → «## » → «### » → sin título */
function titulo(s: Seleccion): Seleccion {
  const { lineas } = lineasDe(s);
  const primera = lineas[0] ?? "";
  const m = /^(#{1,6})\s+/.exec(primera);
  const nivel = m ? m[1]!.length : 0;
  const siguiente = nivel === 0 ? 2 : nivel === 2 ? 3 : 0;
  const limpia = (l: string) => l.replace(/^#{1,6}\s+/, "");
  return reemplazarLineas(s, lineas.map((l) => (siguiente ? `${"#".repeat(siguiente)} ${limpia(l)}` : limpia(l))));
}

export function aplicar(a: Accion, s: Seleccion): Seleccion {
  switch (a) {
    case "negrita":
      return envolver(s, "**", "texto");
    case "cursiva":
      return envolver(s, "*", "texto");
    case "titulo":
      return titulo(s);
    case "lista":
      return prefijo(s, "- ");
    case "cita":
      return prefijo(s, "> ");
    case "enlace": {
      const dentro = s.texto.slice(s.ini, s.fin);
      if (s.texto.slice(s.ini - 2, s.ini) === "[[" && s.texto.slice(s.fin, s.fin + 2) === "]]") {
        return { texto: s.texto.slice(0, s.ini - 2) + dentro + s.texto.slice(s.fin + 2), ini: s.ini - 2, fin: s.fin - 2 };
      }
      const medio = dentro || "Nombre";
      return { texto: s.texto.slice(0, s.ini) + "[[" + medio + "]]" + s.texto.slice(s.fin), ini: s.ini + 2, fin: s.ini + 2 + medio.length };
    }
  }
}
