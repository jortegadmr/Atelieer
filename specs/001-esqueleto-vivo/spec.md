# Spec 001 — Esqueleto vivo (entrega 1)

> Solo el QUÉ y el POR QUÉ. Nada de tecnología, archivos ni esquemas: eso va en plan.md.
> Estado: aprobada (2026-10-20)

## Contexto y objetivo
La v2 parte del código de la v1 (decisión 0002) y tiene que poder abrir Cabo Sal sin miedo a romper nada, instalada al lado de la v1.0 y sin estropear lo que la v1.0 sabe leer. Esta entrega:
- da a la v2 su propia identidad;
- cierra los dos riesgos 🟠 de la auditoría (la ventana sin política de contenido y el borrado permitido en toda la carpeta del usuario);
- sube el contraste de cinco tonos de texto (docs/diseno.md);
- añade los estados nuevos (propuesta y aparcado) y el modo mixto: borrador y canon viven en la wiki, nada se borra.

## Usuarios
El autor, en su PC con Windows y en su Mac Intel.

## Historias de usuario
- H1: Como autor quiero tener la v1 y la v2 instaladas a la vez para volver a la v1 si algo de la v2 no me convence.
- H2: Como autor quiero que la app solo pueda borrar dentro de su mesa de trabajo para que un fallo nunca toque el resto de mis archivos.
- H3: Como autor quiero marcar una pieza como «propuesta» o «aparcada» para separar lo que estoy probando de lo que dejo a un lado, sin que la v1 lo pierda.
- H4: Como autor quiero que pasar una pieza a borrador cree su ficha en la wiki en el mismo paso para no tener que hacerlo dos veces.
- H5: Como autor quiero pasar a canon y descartar con un botón explícito, y que quede constancia en la wiki, para que la vault diga siempre la verdad.
- H6: Como autor quiero que lo que es canon no se cambie por descuido para no provocar retcons sin darme cuenta.
- H7: Como autor quiero leer bien todos los textos en los dos temas.

## Requisitos funcionales (EARS)

### Identidad
- RF-1: EL SISTEMA se instalará y se mostrará con el nombre «Atelier v2» y un identificador distinto del de la v1.0.
- RF-2: MIENTRAS la v1.0 esté instalada, EL SISTEMA se podrá instalar, abrir y desinstalar sin modificar la instalación ni las preferencias de la v1.0.
- RF-3: CUANDO la v2 se abra por primera vez en un equipo, EL SISTEMA pedirá la carpeta de la mesa (`appDatos`) aunque la v1.0 ya la tenga elegida.

### Seguridad
- RF-4: EL SISTEMA solo mostrará contenido propio del programa: no cargará scripts, estilos, fuentes ni imágenes de internet.
- RF-5: SI un texto de una nota contiene marcas que parecen código o HTML, ENTONCES EL SISTEMA lo mostrará como texto y no lo ejecutará.
- RF-6: EL SISTEMA solo podrá borrar archivos dentro de la carpeta de la mesa elegida.
- RF-7: SI algo intenta borrar un archivo fuera de la carpeta de la mesa (wiki incluida), ENTONCES EL SISTEMA no lo borrará y avisará «No se puede borrar fuera de la mesa».
- RF-8: EL SISTEMA seguirá pudiendo leer y escribir notas de la wiki dentro de la vault (pasar a la wiki, Log.md, estado de las fichas).

### Estados
- RF-9: EL SISTEMA ofrecerá seis estados a temporadas, episodios, arcos, eventos y secretos: idea, propuesta, aparcado, borrador, canon y descartado.
- RF-10: CUANDO el autor ponga una pieza en «propuesta» o «aparcado», EL SISTEMA guardará en el estado que conoce la v1.0 el valor «idea» y el estado nuevo aparte, de forma que la v1.0 lo vea como idea y lo conserve al guardar. Al poner cualquier otro estado, EL SISTEMA quitará el guardado aparte.
- RF-11: CUANDO la v2 lea una pieza con estado «idea» y un estado nuevo guardado aparte, EL SISTEMA mostrará el estado nuevo.
- RF-12: SI la v1.0 cambió el estado de una pieza a borrador, canon o descartado y dejó guardado aparte un estado nuevo, ENTONCES EL SISTEMA mostrará el estado que puso la v1.0 e ignorará el guardado aparte.
- RF-13: CUANDO un episodio tome estado por primera vez, EL SISTEMA lo guardará de forma que la v1.0 lo ignore y lo conserve, sin tocar su estado de escritura (idea, escaleta, guion).
- RF-14: SI un episodio no tiene estado, ENTONCES EL SISTEMA lo mostrará como «idea».
- RF-15: MIENTRAS una pieza esté «aparcada», EL SISTEMA la mostrará atenuada y no la tendrá en cuenta en las comprobaciones.
- RF-16: MIENTRAS una pieza esté en «propuesta», EL SISTEMA la tendrá en cuenta en las comprobaciones igual que una idea.
- RF-17: MIENTRAS una pieza esté «descartada», EL SISTEMA no la tendrá en cuenta en las comprobaciones y la seguirá mostrando y dejando recuperar, como la v1.

### Modo mixto
- RF-18: CUANDO el autor pase una temporada, episodio, arco o secreto a «borrador», EL SISTEMA creará su ficha en la wiki en el mismo paso, como «Pasar a la wiki» de la v1: plantilla, Fuentes y entrada en Log.md.
- RF-19: SI la ficha no se puede crear (nombre repetido en la vault, carpeta de la wiki sin configurar o error al escribir), ENTONCES EL SISTEMA dejará la pieza en su estado anterior y dirá por qué.
- RF-20: SI la pieza ya tiene ficha, ENTONCES EL SISTEMA no la volverá a crear ni tocará su texto, y solo cambiará el estado.
- RF-21: EL SISTEMA mantendrá en la mesa la pieza que pasa a la wiki, enlazada a su ficha, para que la v1.0 la siga viendo.
- RF-22: CUANDO un evento pase a «borrador» o «canon», EL SISTEMA solo cambiará su estado en la mesa (los eventos no tienen ficha en la wiki).
- RF-23: CUANDO el autor pulse «Pasar a canon» y lo confirme, EL SISTEMA cambiará la pieza a canon. Si es una temporada, episodio, arco o secreto sin ficha, la creará antes como en RF-18.
- RF-24: CUANDO el autor descarte una pieza y lo confirme, EL SISTEMA la marcará como descartada y guardará el «por qué se descartó» si lo escribe, sin exigirlo, en todos los tipos de pieza.
- RF-25: CUANDO cambie el estado de una pieza que tiene ficha, EL SISTEMA cambiará también el estado de la ficha y lo anotará en Log.md. Propuesta y aparcado se escribirán en la ficha como «idea».
- RF-26: CUANDO el sistema cambie el estado de una ficha de la wiki, EL SISTEMA solo modificará ese dato y conservará el resto de propiedades, el texto y el formato de la nota.
- RF-27: SI la ficha enlazada no existe o no se puede leer al cambiar el estado, ENTONCES EL SISTEMA cambiará la pieza en la mesa, no recreará la ficha y avisará de que la wiki no se ha actualizado.
- RF-28: CUANDO la ficha de una pieza diga canon en la wiki (cambiado desde Obsidian), EL SISTEMA mostrará la pieza como canon (como la v1).
- RF-29: MIENTRAS una pieza sea canon, EL SISTEMA no dejará editar sus campos, moverla ni cambiar su estado hasta que el autor la desbloquee.
- RF-30: CUANDO el autor desbloquee una pieza canon, EL SISTEMA avisará de que cambiar canon es un retcon y pedirá confirmación. El desbloqueo dura hasta cerrar la serie y no cambia el estado.
- RF-31: EL SISTEMA no borrará nunca una pieza ni una ficha al cambiarla de estado.
- RF-32: EL SISTEMA pedirá las confirmaciones de esta spec (canon, descartar, desbloquear) dentro de la interfaz, sin ventanas del sistema.
- RF-33: SI el enlace de una pieza a su ficha apunta fuera de la carpeta de la wiki de la serie, ENTONCES EL SISTEMA no modificará esa nota y avisará de que el enlace no es válido.

### Contraste
- RF-34: EL SISTEMA mostrará todo el texto con un contraste de al menos 4,5:1 sobre su fondo, en el tema oscuro y en el claro (ajuste de docs/diseno.md).

## Requisitos no funcionales
- Compatibilidad: una serie guardada por la v2 se abre en la v1.0 sin errores, con las mismas piezas, y al guardarla desde la v1.0 no se pierde ningún estado nuevo (salvo lo que la v1.0 cambie a propósito, RF-12).
- Rendimiento: el mismo que la v1 (serie grande en menos de 1 s; comprobaciones en menos de 100 ms).
- Plataformas: Windows 11 y macOS en Mac Intel.
- Idioma: español. Mensajes de error en lenguaje llano, con qué pasó y qué hacer.

## Datos personales
Ninguno. Ficción en la vault del autor y la ruta de la mesa en cada equipo.

## Casos límite
- La serie está abierta en la v1.0 y en la v2 a la vez: aviso de uso común (`.abierta`), como hoy.
- Pieza en «propuesta» editada en la v1.0 sin tocar su estado: al volver a la v2 sigue en «propuesta».
- Pieza en «aparcado» que la v1.0 pasa a descartado: la v2 la ve descartada (RF-12).
- Episodio con estado nuevo abierto en la v1.0: la v1.0 ni lo ve ni lo pierde.
- Valores de estado escritos a mano con mayúsculas o tildes («Propuesta», «APARCADO»): se aceptan como en la v1.
- Valor de estado desconocido: se trata como idea y se conserva tal cual en la nota.
- Pasar a borrador una pieza sin título o con un título que no vale como nombre de archivo: no se crea ficha y se dice por qué (RF-19).
- Ficha borrada o movida en Obsidian después de pasarla: cambiar el estado avisa y no la recrea (RF-27).
- Quitar canon a una pieza (volver a borrador, descartarla): solo tras desbloquearla con el aviso de retcon (RF-29, RF-30).
- Ficha editada en Obsidian a la vez: se cambia solo su estado sin pisar lo demás; si cambió durante la operación, se avisa y no se escribe.
- Deshacer (Ctrl Z) tras cambiar el estado: deshace el cambio en la mesa. Si se tocó la wiki, avisa de que la ficha y el Log no se deshacen.

## Fuera de alcance
- Editar el texto de las fichas de la wiki desde la app y mover descartados a «Alternativas descartadas» de su arco (entrega 5).
- Equivalencia de estados antiguos de la vault distintos de los cuatro de la v1 (entrega 5).
- Visor con zoom, barra «Nuevo…», «Si lo dejas así…» y «¿Y si…?» (entregas 2 y 4).
- Escena frente a evento (entrega 3).
- Firmar los instaladores.

## Criterios de finalización
- Todos los RF con test en verde (los de interfaz, con prueba manual).
- `npm run verificar` en verde y `cargo check` sin errores.
- Prueba de compatibilidad: una serie de prueba guardada por la v2 se abre y se guarda en la v1.0 sin perder estados.
- Prueba manual en el PC: v1.0 y v2 instaladas a la vez.
- Prueba manual en el Mac Intel.
- Revisión de seguridad sin críticos.

## Dudas abiertas
Ninguna (resueltas con el autor el 2026-10-20: estados nuevos en campo aparte, borrador = pasar a la wiki en un paso, descartar y canon también en la ficha, episodios con estado).

## Revisión QA (2026-10-20, no independiente: la hizo quien la redactó)
1. Ambigüedades: estado nuevo «colgado» si la v1.0 cambia y luego vuelve a idea → resuelto: la v2 lo quita al poner otro estado (RF-10). Confirmaciones sin patrón EARS → reescrito (RF-32).
2. Contradicciones: ninguna tras unificar el cambio de estado de las fichas (RF-25).
3. Casos límite añadidos: canon sin ficha (RF-23), quitar canon (RF-29), motivo de descarte en todos los tipos (RF-24).
4. Constitución y PRD: cumple el principio 9 (formato compatible) y el 2 (no borra, conserva). La edición en la wiki «sin copias» del PRD se aplaza a la entrega 5.
5. Seguridad y privacidad: un enlace a ficha manipulado podría hacer escribir fuera de la wiki → RF-33. Borrado limitado a la mesa (RF-6, RF-7). Sin datos personales.
