# Brief de alcance (scoping) — Editor de autoría de juegos

> **Tipo:** documento de decisión para Emiliano. **NO es un plan de ejecución ni código.**
> **Autor:** didactifonis-architect. **Fecha:** 2026-06-18. **Estado:** propuesta para evaluación.
>
> **Para qué sirve este documento:** con los DOS pilotos cerrados (La Casa Mágica drag&drop +
> La Máquina del Tiempo Verbal 1-de-3, ambos en master del engine `5f6e3c8`), el siguiente
> ítem del plan maestro es el **editor de autoría** — el componente más caro y arriesgado del
> Engine. Este brief existe para que Emiliano **decida alcance, costo y si/cómo proceder ANTES
> de comprometer su construcción.** No abre frentes de implementación.
>
> **Fuentes ancladas (leídas, no asumidas):** `docs/plan-sdk-engine-juegos.md` (visión
> ADR-SDK-04); `C:\didactifonis-engine\tools\manifest-builder\` (precedente real);
> `C:\didactifonis-engine\games\casa-magica\index.html` y
> `…\maquina-tiempo-verbal\index.html` (lo que un autor define hoy a mano);
> `packages/engine/src/RoundActivity.js` + `scenes/RoundScene.js` (drag-drop) +
> `scenes/ChoiceScene.js` (choice); `scripts/export-bundle.cjs` y `scripts/vendor-engine.cjs`
> (pipeline de salida); `server/activities/bundleArchive.js` + `routes/activities.js` (upload
> que consume el bundle, ya implementado).

---

## 1. Propósito y problema que resuelve

### Qué pasa hoy

Hoy un juego se crea **editando a mano un `index.html`**. Concretamente, el autor escribe un
objeto JavaScript `DEMO_DEFINITION` con esta forma (verificado en los dos pilotos):

```jsonc
{
  id: 'casa-magica',
  title: 'La Casa Mágica',
  primitive: 'drag-drop',          // o 'choice'
  rounds: 10,
  scoring: { first: 2, second: 1, fail: 0 },
  observation: { enabled: true, durationMs: 4000 },   // solo drag-drop, opt-in
  zones: [ { id, label, color } ],                    // solo drag-drop
  items: [ /* banco de ítems; ver §3 el shape por primitiva */ ],
  texts: { intro, outroHigh, outroLow },
}
```

Y aparte, a mano, crea un `manifest.json` de 10 campos (`id`, `title`, `version`, `category`,
`level`, `ageMin`, `ageMax`, `durationMin`, `entryPoint`, `manifestContractVersion`).

**Esto exige saber programar.** Editar un literal JS, respetar comas y estructura, conocer la
nomenclatura de ids (en Casa Mágica el último carácter del id elige la forma del placeholder),
cablear el `<script src="engine.umd.js">`, y luego correr a mano `vendor-engine.cjs` +
`export-bundle.cjs`. Un fonoaudiólogo o un autor de contenido **no** puede hacer esto.

### Qué resuelve el editor

El editor es una **herramienta de autoría** que permite a un autor **NO programador**
crear/editar un juego mediante un formulario visual, y producir un **bundle ZIP válido** listo
para subir a la plataforma — sin tocar HTML ni JS ni la línea de comandos.

### Qué NO es el editor (frontera conceptual — crítica)

El editor es **una tercera pieza**, separada de las dos que ya conocemos:

| Pieza | Qué es | Quién la usa | Dónde corre |
| :-- | :-- | :-- | :-- |
| **Plataforma** (`Didactifonis2026`) | App MERN con roles, datos sensibles, upload de bundles | Fonoaudiólogos, tutores, niños, Admin | Servidor + navegador |
| **Engine/runtime** (`didactifonis-engine`) | Phaser + SDK que ejecuta el juego dentro del bundle | (lo consume el niño al jugar) | Navegador del niño, en iframe |
| **Editor de autoría** (NUEVO) | Herramienta que produce la *definición de datos* + manifest + bundle | Autor de contenido / Admin | Escritorio o local del equipo |

> El editor **NO es la plataforma** (no maneja roles ni datos de menores) y **NO es el runtime**
> (no ejecuta la lógica del juego salvo para previsualizar). Es una herramienta de producción de
> contenido, equivalente a un "Construct/Twine/RPG Maker" interno, cuyo *único output* es el
> bundle que la plataforma ya sabe ingerir.

---

## 2. Estado actual — qué ya tenemos a favor

Buena noticia: **una parte sustancial del camino ya existe.** El editor no parte de cero.

| Activo existente | Dónde | Qué aporta al editor |
| :-- | :-- | :-- |
| **Plantilla data-driven validada** | `packages/engine/src/RoundActivity.js` + `RoundScene.js` + `ChoiceScene.js` | El motor ya ES data-driven: un juego = un objeto de datos (`definition`). El editor solo tiene que **producir ese objeto**, no inventar runtime. Tesis confirmada por los 2 pilotos: añadir un juego del mismo tipo = ~12 líneas de plantilla + datos. |
| **2 primitivas funcionando** | `SCENE_BY_PRIMITIVE = { 'drag-drop', 'choice' }` en `RoundActivity.js` | El editor v1 solo necesita cubrir estas dos. No hay que diseñar interacciones nuevas. |
| **manifest-builder (semilla del editor)** | `tools/manifest-builder/` (HTML+CSS+JS estático, **sin Electron, sin build**) | Precedente directo: formulario visual que arma el `manifest.json` y lo **valida con la función real** `validateManifest()` del contrato (vía `vendor/contract.js`), muestra errores por campo, y descarga el JSON solo si es válido. El editor de juego es "el manifest-builder, pero también para la `definition`". |
| **Validador del contrato** | `@didactifonis/contract` v1.1.0 (`validateManifest`) | Fuente única de verdad de validación; ya reusada sin duplicar lógica por el manifest-builder Y por `export-bundle.cjs`. |
| **Pipeline de export** | `scripts/export-bundle.cjs` (+ `vendor-engine.cjs`) | Ya empaqueta el ZIP: valida manifest, verifica entryPoint, excluye `tools/`/`scripts/`/sourcemaps, strippea bloques `BUILD:STRIP`, comprime. El editor **invoca esto**, no lo reescribe. |
| **Upload del lado plataforma** | `server/activities/bundleArchive.js` + `routes/activities.js` | La plataforma YA recibe y valida el bundle ZIP (bloqueante de deploy cerrado, suite 30/30). El output del editor tiene un consumidor real esperándolo. |

**Conclusión de estado:** el editor es, en esencia, **un constructor de formulario sobre dos
esquemas de datos ya estables** (la `definition` y el `manifest`), enchufado a dos herramientas
de validación/empaque que ya funcionan. El riesgo NO está en el runtime ni en el contrato (esos
están resueltos); está en la **superficie de UI** y en mantener la **paridad** con la plantilla.

---

## 3. MVP del editor — alcance mínimo

**Objetivo del MVP:** reemplazar la autoría a mano de los **dos tipos de juego que HOY existen**
(`drag-drop` y `choice`). Nada más. Un autor no programador debe poder, de principio a fin,
producir un bundle equivalente a Casa Mágica o a Máquina del Tiempo Verbal.

### 3.1 Lo que el autor define hoy a mano (que el editor debe capturar)

**Comunes a ambas primitivas** (de `RoundActivity` y de los dos `index.html`):
- `id` (slug), `title`, `primitive` (selector: drag-drop | choice)
- `rounds` (cuántos ítems por sesión; default 10), `scoring` ({first, second, fail})
- `texts`: `intro`, `outroHigh`, `outroLow` (narrativa cálida, no clínica)
- Banco de `items` (más grande que `rounds`; el engine elige N al azar por sesión)

**Solo drag-drop** (Casa Mágica):
- `zones`: lista de `{ id, label, color }` (la habitación destino)
- `observation`: `{ enabled, durationMs }` (opt-in)
- cada ítem: `{ id, label, zoneId, questionText, audioUrl }`

**Solo choice** (Máquina del Tiempo Verbal):
- cada ítem: `{ id, questionText, audioUrl|null, options: [{id, label, correct}] }`
  con **exactamente una** opción `correct: true`

### 3.2 Pantallas / campos del MVP

1. **Datos del juego** — formulario del `manifest` (reusa tal cual el manifest-builder: ya
   existe y valida) + los campos comunes de la `definition` (rounds, scoring, primitive, textos).
2. **Editor de zonas** (solo si primitive = drag-drop) — alta/edición de zonas con su color
   (selector restringido a los tokens del design-system; nada de hex sueltos).
3. **Editor del banco de ítems** — lista add/edit/remove. El formulario de cada ítem **cambia
   según la primitiva**: drag-drop pide `zoneId`+`label`+`questionText`+`audio`; choice pide
   `questionText`+`options[]` con marca de cuál es la correcta (con validación "exactamente 1
   correcta").
4. **Assets** (sprites/audio) — ver §3.3.
5. **Previsualización** — ver §3.4.
6. **Exportar** — ver §3.5.

### 3.3 Cómo se cargan los assets

Hoy los pilotos usan **placeholders** (formas generadas por Phaser; audio = beep mudo). El swap
por assets reales es la decisión de arte pendiente (D-E3-1/3), independiente del editor.

Para el MVP, propuesta mínima:
- El autor **selecciona archivos locales** (imágenes para sprites, `.mp3` para audio).
- El editor los **copia a la carpeta del proyecto** del juego y rellena las rutas relativas
  (`audioUrl: 'audio/cama.mp3'`, etc.) automáticamente — el autor nunca escribe una ruta.
- El editor **valida** que el archivo exista y tenga extensión esperada.
- Audio es **opcional** (choice corre con `audioUrl: null`); sprite puede caer al placeholder si
  no se sube (preserva el comportamiento actual).

> No entra edición de assets (recortar, convertir, normalizar audio) — eso es trabajo de arte
> externo, fuera del editor (§5).

### 3.4 Cómo se previsualiza — **reusar el runtime del engine**

Decisión de diseño clave: el preview **NO se reimplementa**. El editor **monta el mismo
`engine.umd.js`** (Phaser + SDK) que corre en producción, le pasa la `definition` en construcción
y lo ejecuta en **modo standalone** (sin host). Esto ya está soportado: `RoundActivity._initSDK()`
detecta la ausencia de contexto del host y entra en `standaloneMode` con un `passThreshold`
default. Es decir, **el preview es el juego real corriendo sin la plataforma** — máxima fidelidad,
cero duplicación de lógica de render.

### 3.5 Cómo exporta el bundle — **invocar el pipeline existente**

El export del editor **no reimplementa el ZIP.** Orquesta los scripts que ya existen:
1. Escribe `manifest.json` + `index.html` (a partir de una **plantilla del entry HTML** con la
   `definition` inyectada) + assets en una carpeta de proyecto.
2. Corre `vendor-engine.cjs` (copia `engine.umd.js` autocontenido al directorio del juego).
3. Corre `export-bundle.cjs <dir>` → produce `<id>-<version>.zip` (valida manifest, strippea
   `BUILD:STRIP`, excluye tooling, comprime).
4. El autor sube ese ZIP por el upload ya implementado de la plataforma.

> El "entry HTML" deja de escribirse a mano: el editor lo genera desde una plantilla fija (el
> mismo boilerplate de los dos pilotos: header, `#game-container`, `<script src=engine.umd.js>`,
> y el bloque `createGame({ definition })`). Lo único variable es la `definition`.

---

## 4. Decisiones técnicas / arquitectura — con recomendación

### D-ED-1 — ¿Electron de verdad, o web-app/herramienta local basta?

**El plan dice "Electron", pero el precedente real (manifest-builder) NO usa Electron** — es
HTML/CSS/JS estático servido por un `serve.cjs` local. Funciona hoy.

| Opción | Pros | Contras |
| :-- | :-- | :-- |
| **A. Herramienta web local** (extender el patrón del manifest-builder: SPA servida por un server Node local) | Cero costo de empaquetado/distribución/actualización de desktop; reusa el patrón ya probado; el preview corre nativo en el navegador; multiplataforma gratis | Necesita el repo engine clonado para correr scripts; menos "producto" para un externo |
| **B. Electron de verdad** (app de escritorio instalable) | Sienta como app instalada; podría empaquetar Node + scripts + engine sin clonar el repo; acceso a FS nativo para gestión de proyectos | **Caro y arriesgado**: superficie de build (mac/win), firma de código, canal de auto-actualización, mantener el engine embebido en sync. Es el grueso del costo y del riesgo del componente |
| **C. Híbrido** (web local ahora → empaquetar en Electron solo si autores externos lo necesitan) | Empieza barato, deja la puerta abierta; la lógica de UI es la misma en ambos | Requiere disciplina para no acoplar a APIs de Electron desde el día 1 |

> **Recomendación (Tech Lead): opción C, empezando por A.** Construir el editor v1 como
> **herramienta web local** (extensión natural del manifest-builder), con la UI desacoplada de
> cualquier API de Electron. Empaquetar en Electron es un **incremento posterior y opcional**,
> que solo se justifica si el editor va a manos de **autores externos** (ver §8). Comprometerse a
> Electron ahora es pagar el componente más caro antes de validar que el formulario siquiera
> resuelve el problema. **"Web local ahora, Electron después" — mismo patrón "link ahora, pin
> después" que ya aceptaste para el contrato (ADR-SDK-05).**

### D-ED-2 — Framework de UI

El manifest-builder es **JS vanilla sin build**. El editor de juego es bastante más grande
(estado de banco de ítems, formularios condicionales por primitiva, preview embebido).

> **Recomendación:** un framework ligero con estado (la plataforma ya usa **React + Vite**;
> reusar ese stack reduce carga cognitiva del equipo). Pero **no es una decisión bloqueante para
> el v1**: si el primer incremento es pequeño (ver §7), puede arrancar en vanilla como el
> manifest-builder y migrar si la complejidad del banco de ítems lo pide. Decisión de bajo riesgo,
> reversible.

### D-ED-3 — Cómo reusa el contrato y la plantilla sin duplicar lógica

Esto **ya está resuelto por precedente** y solo hay que seguirlo:
- **Contrato:** el manifest-builder vendorea `@didactifonis/contract` (`copy-contract.cjs` →
  `vendor/contract.js`) y llama a `validateManifest()` real. El editor hace lo mismo. **Cero
  duplicación de validación.**
- **Plantilla/engine:** el editor **no copia la lógica de render**; carga `engine.umd.js` para
  el preview y lo vendorea al bundle vía `vendor-engine.cjs`. El runtime es el mismo binario en
  preview, en producción y en el ZIP.

> **Recomendación:** el editor vive **dentro del repo `didactifonis-engine`** (como
> `tools/manifest-builder/` hoy), por la misma razón que el SDK vive dentro del engine
> (ADR-SDK-05 punto c): comparte el contrato, el `engine.umd.js` y los scripts de export sin
> cruzar fronteras de repo. Es tooling de autor del engine, no de la plataforma.

### D-ED-4 — Dónde viven los proyectos del autor

> **Recomendación:** una carpeta de proyecto por juego (`games/<id>/` o un `projects/`
> dedicado), con la `definition` persistida como JSON + assets dentro. El export ya espera un
> directorio de juego con `manifest.json` + entry + assets. Sin base de datos, sin servicio:
> el "proyecto" es una carpeta. Mantiene el editor stateless y versionable en git.

### D-ED-5 — Dónde encajan Rive y Phaser Editor

**Fuera del v1, explícitamente.** Phaser Editor (composición visual de escenas) y Rive
(animación con state machines) son piezas de la **visión completa** del Engine (ADR-SDK-04), no
del editor de datos que las dos primitivas actuales necesitan. Las primitivas de hoy se definen
100% por datos (zonas, ítems, opciones); no requieren un editor de escena ni animación
interactiva. Diferir (ver §5).

---

## 5. Anti-alcance explícito — lo que el v1 NO hace

Recorte agresivo. El v1 cubre **solo lo necesario para producir los dos juegos que ya existen**.
Todo lo siguiente queda **FUERA**:

- **El editor de eventos data-driven estilo RPG Maker** (la visión completa de ADR-SDK-04, §8.0
  del plan: triggers visuales, comando `Report Telemetry` arrastrable, lógica de juego sin
  código). Es la pieza más ambiciosa y NO la necesitan las primitivas actuales. **Diferido.**
- **Nuevas primitivas de interacción.** Solo drag-drop y choice. Cualquier mecánica nueva primero
  se prueba como piloto en el engine (regla: pilotos en secuencia), recién después entra al editor.
- **Rive** (animación interactiva) y **Phaser Editor** (composición de escenas). Diferidos.
- **Edición de assets** (recorte de sprites, conversión/normalización de audio, generación de
  voz). El editor consume assets ya listos; producirlos es trabajo de arte externo.
- **Multi-idioma / i18n** del contenido. Los pilotos son `es-CL`. Un solo idioma en el v1.
- **Empaquetado Electron instalable + auto-update + firma de código** (ver D-ED-1: diferido a un
  incremento posterior y solo si hay autores externos).
- **Gestión de versiones/publicación dentro del editor** (diff de versiones, rollback). El
  versionado vive en el `manifest.version` y en el upload de la plataforma; el editor solo escribe
  el número.
- **Cualquier cosa que cruce la frontera SaMD** (CLAUDE.md §2): el editor produce ejercicios de
  Capa 1, sin scoring clínico, sin lógica diagnóstica, sin recomendación terapéutica. No es un
  riesgo del editor per se, pero se deja escrito como guardrail para el contenido que produce.

---

## 6. Riesgos — por qué es el componente más caro

| Riesgo | Por qué duele | Mitigación propuesta |
| :-- | :-- | :-- |
| **Superficie de UI grande** | Banco de ítems con CRUD, formularios condicionales por primitiva, gestión de assets, preview embebido, export — es mucha más UI que el manifest-builder (10 campos). El grueso del esfuerzo. | Incremento mínimo primero (§7); reusar el patrón del manifest-builder; empezar por UNA primitiva. |
| **Paridad con la plantilla del engine** | Cada vez que la `definition` del engine evolucione (campo nuevo, scoring distinto, primitiva nueva), el editor debe seguirla o produce bundles rotos. Es **deuda de mantenimiento perpetua**. | Que el editor valide la `definition` contra un esquema **del contrato** (igual que valida el manifest), no contra reglas hardcodeadas. Si el esquema vive en el contrato, el editor hereda los cambios. **Esto puede requerir extender el contrato para describir la `definition`, no solo el manifest** — ver §8. |
| **Distribución/actualización de un desktop app** | Si se va a Electron: builds por plataforma, firma, canal de update, engine embebido a sincronizar. Es donde un editor se vuelve un producto en sí mismo. | Diferir Electron (D-ED-1). La versión web local no tiene este costo. |
| **Sobre-ingeniería hacia la visión RPG Maker** | Es tentador construir el editor de eventos genérico desde el principio. Multiplicaría el costo por un orden de magnitud sin que ningún juego actual lo use. | Anti-alcance §5 estricto. El editor de eventos es un proyecto aparte, post-N-juegos. |

### Alternativa honesta: **NO construir el editor todavía**

Es una opción legítima y barata. Se sigue **autorando a mano** con dos asistencias que ya
existen o son triviales:
- el **manifest-builder** ya genera el manifest sin programar;
- la **`definition` se copia de una plantilla** (los dos pilotos son plantillas vivas: copiar
  `index.html`, cambiar el banco de ítems);
- `vendor-engine.cjs` + `export-bundle.cjs` producen el ZIP.

**Trade-off:** sigue exigiendo a alguien técnico (o muy guiado) editar un literal JS, pero el
**costo de construcción es cero** y se reserva la inversión del editor para cuando haya
**demanda real de volumen de juegos** o **autores externos no técnicos**. Dado que hoy solo hay
2 juegos y el cuello de botella real del engine es **arte/audio** (D-E3-1/3), no la autoría de
datos, esta alternativa es seria.

---

## 7. Plan por fases (incremental, no big-bang)

Cada fase entrega algo verificable y se decide continuar tras cada una.

- **Fase 0 — Validación de concepto (el primer incremento mínimo).** Tomar el manifest-builder y
  extenderlo a UN solo tipo de juego (**choice**, el más simple: sin zonas, sin assets, audio
  null). Formulario de `texts` + banco de ítems choice + botón "exportar" que escribe la carpeta
  e invoca `vendor-engine` + `export-bundle`. **Criterio de éxito:** un no programador reproduce
  La Máquina del Tiempo Verbal de punta a punta y el ZIP resultante **pasa el upload de la
  plataforma**. Esto valida toda la tesis con el mínimo de UI.
- **Fase 1 — Preview embebido.** Montar `engine.umd.js` en standalone dentro del editor para
  previsualizar la `definition` en construcción. Cierra el loop "edito → veo → exporto".
- **Fase 2 — Segunda primitiva (drag-drop) + assets.** Añadir zonas, observación, carga de
  sprites/audio con copia a la carpeta y rutas automáticas. Al cerrar esta fase, el editor cubre
  **ambos** juegos existentes — el objetivo del MVP.
- **Fase 3 (opcional) — Empaquetado / autores externos.** Solo si la decisión de §8 lo pide:
  empaquetar en Electron, gestión de proyectos, UX para externos.

> Si la Fase 0 no convence (la UI cuesta más de lo previsto, o nadie va a autorar volumen),
> **se detiene ahí** con costo mínimo y se vuelve a la autoría a mano. Por eso es el primer
> incremento.

---

## 8. Preguntas / decisiones abiertas para Emiliano

Estas condicionan el alcance y deben responderse **antes** de arrancar:

1. **¿Quién va a usar el editor?** ¿Solo tú / el equipo / el Admin (técnicos o semi-técnicos), o
   **autores externos no programadores** (fonoaudiólogos, diseñadores de contenido)? — Esto
   decide casi todo: si es solo el equipo, la **web local (D-ED-1.A)** basta y la alternativa
   "autoría a mano" sigue siendo viable; si son externos, sube la barra de UX y reaparece Electron.

2. **¿Es prioritario AHORA, o se difiere?** El cuello de botella real del engine hoy es
   **arte/audio** (D-E3-1/3), no la autoría de datos. Con solo 2 juegos, ¿el editor desbloquea
   algo, o es inversión adelantada? Opción legítima: **diferir el editor** hasta tener N juegos /
   demanda de volumen / un autor externo concreto, y mientras tanto autorar a mano con plantillas
   + manifest-builder (§6).

3. **¿Cuántos juegos esperas producir en los próximos 6–12 meses?** El editor se paga si hay
   **volumen**. Para 3–4 juegos, la autoría a mano + plantillas probablemente gana. Para decenas,
   el editor se justifica.

4. **¿Extendemos el contrato para describir la `definition` (no solo el manifest)?** Hoy el
   contrato valida el `manifest`; la forma de la `definition` (zonas, ítems, options) vive
   implícita en el engine. Si el editor debe validar la `definition` sin hardcodear reglas (clave
   para la paridad, §6), conviene **promover el esquema de la `definition` al contrato**. Es
   trabajo previo de backend/contrato. ¿Lo asumimos como parte del editor, o lo dejamos
   hardcodeado en el editor por ahora (más barato, más frágil)?

5. **¿Web local o Electron para el v1?** (D-ED-1.) Recomiendo web local; confírmalo o pide
   Electron explícitamente sabiendo que es el grueso del costo.

---

## 9. Recomendación del Tech Lead

**No comprometer el editor completo todavía. Hacer SOLO la Fase 0 (validación de concepto) como
herramienta web local, y decidir el resto a la luz del resultado.**

Razones:
- La tesis data-driven **ya está validada por los 2 pilotos**; el editor es la consecuencia
  natural, pero su valor depende de **volumen de juegos y de autores no técnicos**, dos cosas que
  hoy **no están confirmadas**.
- El cuello de botella real del engine es **arte/audio**, no la autoría de datos. Construir el
  editor más caro (Electron, editor de eventos RPG Maker) ahora sería optimizar el cuello de
  botella equivocado.
- La Fase 0 es **barata, reusa el manifest-builder y los scripts existentes**, y responde
  empíricamente la pregunta "¿un no programador puede autorar un juego?" antes de invertir en la
  superficie de UI grande.
- **Electron, Rive, Phaser Editor y el editor de eventos data-driven se difieren** hasta que haya
  una necesidad demostrada (autores externos / volumen). Hoy no la hay.

Si la respuesta a la pregunta 1 es "solo el equipo" y a la 2 es "no urge", la recomendación se
inclina aún más fuerte hacia **diferir el editor por completo** y seguir con plantillas + manifest-builder,
invirtiendo el esfuerzo en arte/audio reales (que sí desbloquean juegos publicables).

---

*Documento de scoping. Sin commitear, para revisión de Emiliano. No se ha tocado código ni se ha
iniciado implementación del editor.*
</content>
</invoke>
