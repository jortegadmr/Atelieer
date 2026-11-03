# Auditoría inicial — Atelier v1.0 (2026-10-20)

Revisión del código de la v1 antes de construir encima la v2. Nivel de riesgo A (personal, local, sin cuentas ni datos de terceros).

## Resultado
🔴 Crítico: ninguno.

🟠 Importante
1. **Sin política de seguridad de contenido** (`"csp": null` en `src-tauri/tauri.conf.json`). Si algún día se mostrara texto con HTML sin escapar, la ventana podría ejecutar código. Hoy no hay `{@html}` ni `innerHTML`, pero la CSP es la red de seguridad. — Poner una CSP restrictiva y comprobar que la app arranca.
2. **Permiso de borrado en toda la carpeta del usuario** (`fs:allow-remove` con alcance `$HOME/**`). Un error en la app podría borrar archivos fuera de la vault. — Limitar el borrado a la vault elegida (o a `appDatos` y la papelera) y revisar dónde se usa `remove`.

🟡 Mejorable
3. `.gitignore` corto: faltan `Thumbs.db`, `*.log`, `.vscode/*`.
4. Faltaba el método de trabajo: constitución y comando de verificación único. (Añadido en esta adopción.)

## Comprobado y correcto
- Secretos: ninguno en el código ni en el historial de git.
- Inyección: sin `{@html}` ni `innerHTML` en `src/`; Svelte escapa el texto.
- Dependencias de producción: `npm audit` sin vulnerabilidades.
- Privacidad: sin telemetría ni servicios externos; los datos son ficción y viven en la vault del autor.
- Funcionamiento: 252 tests en verde, `svelte-check` sin errores.
