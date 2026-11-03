// Lo que está abierto encima de la pantalla (una confirmación, la búsqueda,
// la captura, la ventana «Nueva pieza», un menú). Esc cierra la última; si no
// hay ninguna, el visor sube de nivel (spec 002, RF-15 y RF-16).

export class Capas {
  private pila: { cerrar: () => void }[] = [];

  get hayAbiertas(): boolean {
    return this.pila.length > 0;
  }

  /** Apunta una capa abierta; devuelve cómo quitarla cuando se cierre por su cuenta */
  abrir(cerrar: () => void): () => void {
    const capa = { cerrar };
    this.pila.push(capa);
    return () => {
      const i = this.pila.indexOf(capa);
      if (i >= 0) this.pila.splice(i, 1);
    };
  }

  /** Cierra la última capa abierta; false si no había ninguna */
  cerrarUltima(): boolean {
    const capa = this.pila.pop();
    if (!capa) return false;
    capa.cerrar();
    return true;
  }
}
