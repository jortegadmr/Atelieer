// Lo que depende de Tauri y del sistema: elegir carpeta, nombre del equipo,
// menú del Mac y cierre de la ventana. Las vistas no llaman a Tauri directamente.

import { Menu, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { hostname, platform } from "@tauri-apps/plugin-os";
import { normalizar } from "../almacen/fs";

export async function elegirCarpeta(titulo: string): Promise<string | null> {
  const r = await open({ directory: true, multiple: false, title: titulo });
  return typeof r === "string" ? normalizar(r) : null;
}

/** Abre una dirección (obsidian://…) con su programa */
export async function abrirUrl(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    // Fuera de Tauri (el modo demostración del navegador)
    window.open(url, "_blank");
  }
}

export async function nombreEquipo(): Promise<string> {
  try {
    return (await hostname()) || "este equipo";
  } catch {
    return "este equipo";
  }
}

export function esMac(): boolean {
  try {
    return platform() === "macos";
  } catch {
    return false;
  }
}

/** Menú nativo del Mac en español. Sin el menú Edición, Cmd C y Cmd V no funcionan. */
export async function ponerMenuMac(): Promise<void> {
  if (!esMac()) return;
  const p = (item: Parameters<typeof PredefinedMenuItem.new>[0]) => PredefinedMenuItem.new(item);
  const app = await Submenu.new({
    text: "Atelier",
    items: [
      await p({ item: { About: null }, text: "Acerca de Atelier" }),
      await p({ item: "Separator" }),
      await p({ item: "Hide", text: "Ocultar Atelier" }),
      await p({ item: "HideOthers", text: "Ocultar otras" }),
      await p({ item: "ShowAll", text: "Mostrar todas" }),
      await p({ item: "Separator" }),
      await p({ item: "Quit", text: "Salir de Atelier" }),
    ],
  });
  const edicion = await Submenu.new({
    text: "Edición",
    items: [
      await p({ item: "Undo", text: "Deshacer" }),
      await p({ item: "Redo", text: "Rehacer" }),
      await p({ item: "Separator" }),
      await p({ item: "Cut", text: "Cortar" }),
      await p({ item: "Copy", text: "Copiar" }),
      await p({ item: "Paste", text: "Pegar" }),
      await p({ item: "SelectAll", text: "Seleccionar todo" }),
    ],
  });
  const ventana = await Submenu.new({
    text: "Ventana",
    items: [
      await p({ item: "Minimize", text: "Minimizar" }),
      await p({ item: "Maximize", text: "Zoom" }),
      await p({ item: "Fullscreen", text: "Pantalla completa" }),
      await p({ item: "Separator" }),
      await p({ item: "CloseWindow", text: "Cerrar ventana" }),
    ],
  });
  const menu = await Menu.new({ items: [app, edicion, ventana] });
  await menu.setAsAppMenu();
}

/** Ejecuta `antes` al cerrar la ventana (por ejemplo, borrar .abierta) y después la cierra */
export async function alCerrarVentana(antes: () => Promise<void>): Promise<void> {
  const ventana = getCurrentWindow();
  await ventana.onCloseRequested(async (e) => {
    e.preventDefault();
    try {
      await Promise.race([antes(), new Promise((r) => setTimeout(r, 2000))]);
    } finally {
      await ventana.destroy();
    }
  });
}

/** Elegir una imagen del equipo (portada de la serie, spec 017) */
export async function elegirImagen(titulo: string): Promise<string | null> {
  const r = await open({ directory: false, multiple: false, title: titulo, filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp"] }] });
  return typeof r === "string" ? normalizar(r) : null;
}
