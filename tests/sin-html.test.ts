import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// RF-5: el texto de las notas se enseña como texto. Svelte lo escapa salvo con
// {@html} o si se toca innerHTML/outerHTML a mano: aquí no puede aparecer.

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    return statSync(r).isDirectory() ? archivos(r) : /\.(svelte|ts)$/.test(n) ? [r] : [];
  });
}

describe("sin HTML sin escapar (RF-5)", () => {
  it("ningún archivo de src/ usa {@html}, innerHTML, outerHTML ni insertAdjacentHTML", () => {
    const peligrosos = archivos("src").filter((r) => /\{@html|innerHTML|outerHTML|insertAdjacentHTML/.test(readFileSync(r, "utf8")));
    expect(peligrosos).toEqual([]);
  });
});

describe("política de contenido de la ventana (RF-4)", () => {
  const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const csp: string = conf.app.security.csp ?? "";

  it("existe y no carga nada de internet", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toMatch(/https?:\/\/(?!ipc\.localhost|asset\.localhost)/);
  });

  it("los scripts solo son los del programa", () => {
    const scripts = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scripts.trim()).toBe("script-src 'self'");
  });
});

describe("permisos del disco (RF-6, RF-8)", () => {
  const cap = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8"));
  const permisos: (string | { identifier: string; allow?: { path?: string; url?: string }[] })[] = cap.permissions;

  it("no hay alcance global del disco (se sumaría al de borrar)", () => {
    expect(permisos.some((p) => typeof p !== "string" && p.identifier === "fs:scope")).toBe(false);
  });

  it("solo se abren direcciones obsidian:// (sin opener:default, que deja http, mailto…)", () => {
    expect(permisos.filter((p) => (typeof p === "string" ? p : p.identifier).startsWith("opener:"))).toEqual([
      { identifier: "opener:allow-open-url", allow: [{ url: "obsidian://*" }] },
    ]);
  });

  it("borrar solo vale dentro de appDatos", () => {
    const borrar = permisos.find((p) => typeof p !== "string" && p.identifier === "fs:allow-remove");
    expect(borrar).toEqual({ identifier: "fs:allow-remove", allow: [{ path: "$HOME/**/appDatos/**" }] });
    expect(permisos).not.toContain("fs:allow-remove");
  });
});
