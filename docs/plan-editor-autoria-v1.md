# Plan de implementación por fases — Editor de autoría v1 (Electron)

> **Tipo:** plan de ejecución para aprobación de Emiliano. **NO es código.** No se ha tocado
> ningún repo ni arrancado ninguna fase.
> **Autor:** didactifonis-architect. **Fecha:** 2026-06-18. **Estado:** propuesta, sin commitear.
>
> **Precede a:** la ejecución de la Fase 1. Emiliano aprueba este plan ANTES de delegar nada.
>
> **Decisiones que ya están FIJADAS por Emiliano (no se re-litigan aquí):**
> 1. **Usuarios = autores externos NO técnicos** (no solo el equipo). Esto justifica Electron
>    (app instalable, UX pulida, distribución, auto-update). Anula la recomendación "web local"
>    del brief de scoping (`docs/brief-editor-autoria-electron.md` §D-ED-1).
> 2. **Editor v1 COMPLETO: las 2 primitivas existentes** (drag-drop + choice). Camino caro
>    elegido conscientemente sobre la recomendación de diferir / Fase-0.
> 3. **Ejecución por FASES con incrementos verificables, NO big-bang.**
>
> **Fuentes ancladas (leídas para este plan, no asumidas):**
> `C:\didactifonis-engine\packages\engine\src\RoundActivity.js` (plantilla data-driven:
> `SCENE_BY_PRIMITIVE`, `_initSDK()` con `standaloneMode`, shape del `sessionState`);
> `C:\didactifonis-engine\games\maquina-tiempo-verbal\index.html` (shape `definition` choice) y
> `…\casa-magica\index.html` (drag-drop); `C:\didactifonis-engine\tools\manifest-builder\`
> (semilla: `app.js`, `copy-contract.cjs`, `serve.cjs`, `vendor/`); `scripts\export-bundle.cjs`,
> `vendor-engine.cjs`, `validate-manifest.cjs`; `C:\didactifonis-contract\index.cjs` (exports:
> `MANIFEST_SHAPE`, `validateManifest` — **NO hay esquema de `definition`**);
> `server/activities/bundleArchive.js` (consumidor del ZIP, ya implementado).

---

## 0. Resumen ejecutivo

El editor v1 es una **app Electron de escritorio** que un autor no técnico instala y usa para
producir un **bundle ZIP** equivalente a los dos pilotos existentes, sin tocar HTML/JS ni la
línea de comandos. El editor **no inventa runtime ni reescribe el empaque**: produce la
`definition` + el `manifest`, reusa `engine.umd.js` para el preview en vivo (vía
`standaloneMode`, ya soportado) e **invoca los scripts existentes** (`vendor-engine.cjs` +
`export-bundle.cjs`) para generar el ZIP que la plataforma ya sabe ingerir.

El riesgo #1 del proyecto es la **paridad perpetua** entre el editor y la `definition` del
engine. Se mitiga **promoviendo un esquema de la `definition` al contrato** (`DEFINITION_SHAPE`
+ `validateDefinition()`), igual que ya existe `MANIFEST_SHAPE` + `validateManifest()`. Esto
entra **temprano (Fase 1)** porque es la cimentación que evita re-trabajo en todas las fases
posteriores.

Las fases se ordenan **de menor a mayor riesgo**, dejando lo más caro (empaquetado Electron
instalable, auto-update, firma de código y pulido de UX para externos) para el final. La
**Fase 1 es un incremento mínimo y demostrable**: el editor Electron que ya arranca, embebe el
contrato, y autora + valida + exporta UN juego choice de punta a punta (la primitiva más
simple). Hay un **punto de control de aborto al cierre de la Fase 2**: si para entonces el costo
de la UI no se justifica, se detiene con el menor sunk cost posible.

---

## 1. Stack técnico decidido para Electron

### 1.1 Arquitectura de procesos (main / renderer / preload)

| Proceso | Responsabilidad | Notas de seguridad |
| :-- | :-- | :-- |
| **main** (Node) | Ciclo de vida de la app, ventanas, **TODO el acceso a FS** (abrir/guardar proyectos, copiar assets), **invocar los scripts** `vendor-engine.cjs` / `export-bundle.cjs` vía `child_process`. | Único punto con privilegios de Node. |
| **preload** (puente) | Expone una API mínima y tipada al renderer vía `contextBridge` (`openProject`, `saveProject`, `importAsset`, `exportBundle`, `validateDefinition`). | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. El renderer NUNCA toca `fs`, `child_process` ni `require` de Node directamente. |
| **renderer** (UI) | El formulario visual, el banco de ítems, el editor de zonas, el preview embebido. Es una SPA. | Sin acceso a Node. Habla con main solo por los canales del preload. |

> **Decisión de seguridad firme:** `contextIsolation: true` + `nodeIntegration: false` +
> `sandbox: true` en el `BrowserWindow` del renderer. Toda operación privilegiada (FS, spawn de
> scripts) cruza por un canal IPC explícito definido en el preload. Esto es **innegociable**: el
> editor abre archivos arbitrarios del autor (assets), escribe carpetas de proyecto y ejecuta
> scripts que producen bundles que la **plataforma luego ejecuta** en el navegador del niño.
> Una superficie de seguridad propia (ver §4 y la auditoría de seguridad por fase).

### 1.2 Framework de UI del renderer — **React + Vite**

**Recomendación: React + Vite.** Justificación:
- La plataforma (`Didactifonis2026/client`) ya usa **React + Vite** → cero carga cognitiva nueva
  para el equipo y para los subagentes (`didactifonis-frontend` ya trabaja ese stack).
- El editor tiene **estado no trivial**: banco de ítems con CRUD, formularios condicionales por
  primitiva, preview que reacciona a cada cambio. Vanilla (como el manifest-builder) no escala a
  esto sin reinventar gestión de estado.
- Vite + Electron es un patrón maduro (`electron-vite`): HMR en el renderer, build del main/preload
  separado. Recomiendo **`electron-vite`** como scaffolder (estructura main/preload/renderer lista,
  evita cablear Vite+Electron a mano).
- Empaquetado: **`electron-builder`** (Windows primero — Emiliano trabaja en Win 11; mac/Linux si
  se confirma demanda). Auto-update vía `electron-updater`. **Esto NO entra hasta la fase final**
  (§3, Fase 5); en Fases 1–4 se corre en modo dev (`electron-vite dev`).

### 1.3 Cómo se EMBEBE `engine.umd.js` para el preview en vivo

El preview **no se reimplementa**: monta el **mismo `engine.umd.js`** que corre en producción y
en el ZIP, en **`standaloneMode`**, que la plantilla **ya soporta** (`RoundActivity._initSDK()`:
si `getContext()` falla tras 3 reintentos, entra en `standaloneMode = true` con `passThreshold`
default, monta Phaser igual).

- El renderer carga `engine.umd.js` en un **`<iframe sandbox>`** (mismo patrón de aislamiento que
  GameHost en la plataforma; mantiene la paridad de ejecución y evita que el preview toque la app
  Electron). El iframe recibe un HTML de preview generado desde la **misma plantilla de entry**
  que usará el bundle, con la `definition` en construcción inyectada.
- **Fuente única del binario:** el `engine.umd.js` del preview es **el mismo artefacto** que
  `vendor-engine.cjs` copia al bundle. Se vendorea una vez al proyecto/editor y se referencia con
  ruta relativa `./engine.umd.js` — exactamente como ya hace cada juego (decisión de
  autocontención H3-D-1). **Cero divergencia preview↔producción.**
- El preview corre **sin host** (sin sessionToken, sin postMessage real al backend): el autor ve
  el juego real jugarse, no envía resultados a ninguna plataforma. Máxima fidelidad de render,
  cero lógica duplicada.

### 1.4 Cómo el editor INVOCA los scripts existentes para producir el ZIP

El export del editor **orquesta**, no reescribe. El proceso **main** ejecuta, vía
`child_process`, el pipeline que ya existe y está probado (E3-H3, QA verde + security apto):

1. El editor **escribe la carpeta de proyecto**: `manifest.json` (generado del formulario, igual
   que el manifest-builder), `index.html` (generado desde **una plantilla fija de entry** con la
   `definition` inyectada — el boilerplate de los pilotos: header, `#game-container`,
   `<script src="./engine.umd.js">`, `createGame({ definition })`), y los assets copiados.
2. Corre **`vendor-engine.cjs`** → copia `engine.umd.js` autocontenido al directorio del juego.
   > **Deuda conocida a resolver aquí:** `vendor-engine.cjs` está **hardcodeado a `casa-magica`**
   > (registrado en memoria del Piloto 2). Generalizarlo a `<game-dir>` es prerrequisito de la
   > fase de export del editor (lo absorbe la Fase 1, ver §3).
3. Corre **`export-bundle.cjs <dir>`** → valida el manifest con `validateManifest()` real, verifica
   `entryPoint`, strippea bloques `BUILD:STRIP`, excluye `tools/`/`scripts/`/sourcemaps/`examples/`,
   limpia `sourceMappingURL`, comprime → `<id>-<version>.zip`.
4. El editor muestra el resultado (ZIP listo + ruta) o los errores de validación accionables que el
   script ya devuelve (exit ≠ 0). El autor sube ese ZIP por el upload de admin de la plataforma
   (`POST /upload`, `bundleArchive.js` — ya implementado, suite 30/30).

> El editor **no duplica** ninguna regla de validación ni lógica de ZIP. Si el pipeline cambia, el
> editor hereda el cambio porque lo invoca, no lo copia.

### 1.5 Dónde y en qué formato se guardan los PROYECTOS del autor

- **Un proyecto = una carpeta** (no base de datos, no servicio). Formato:
  ```
  <proyecto>/
    project.json        ← la definition editable + metadatos del manifest (fuente de verdad del editor)
    assets/
      audio/*.mp3
      art/items/*.png  art/zones/*.png  art/guide/*.png   (convención ya fijada en el brief de assets)
    .gitignore          ← ignora engine.umd.js vendoreado y *.zip (artefactos reproducibles)
  ```
- **`project.json` es lo editable** (la `definition` + datos del manifest). El `index.html`,
  `manifest.json`, `engine.umd.js` y el ZIP son **derivados reproducibles** que el export genera —
  NO se versionan como fuente. Esto mantiene el proyecto limpio y versionable en git.
- Electron gestiona "abrir carpeta de proyecto" / "guardar" / "nuevo" vía diálogos nativos del
  proceso main. **El autor nunca escribe una ruta a mano.**
- **Dónde viven los proyectos:** carpeta elegida por el autor (Documentos del usuario por
  defecto). El editor NO obliga a clonar el repo engine; el `engine.umd.js` y los scripts viajan
  **empaquetados dentro de la app Electron** (resueltos por el main desde sus `resources/`). Esto
  es lo que hace al editor un producto autónomo para un externo — y es justamente el costo que la
  decisión "Electron + externos" compró.

### 1.6 Contrato / `file:` link con `@didactifonis/contract`

- El editor **vendorea** `@didactifonis/contract` igual que el manifest-builder (`copy-contract.cjs`
  → `vendor/contract.js`, shim UMD sobre el `index.cjs`) y consume `validateManifest()` /
  `validateDefinition()` **reales**. **Cero duplicación de validación.**
- En empaquetado (Fase 5), el contrato vendoreado viaja dentro de los `resources/` de la app. La
  versión del contrato embebida **se versiona/pinea** con la app (reproducibilidad), igual que el
  `engine.umd.js`.
- **El editor vive DENTRO del repo `C:\didactifonis-engine`** (como `tools/manifest-builder/` hoy),
  por la misma razón que el SDK vive en el engine (ADR-SDK-05): comparte el contrato, el
  `engine.umd.js` y los scripts de export sin cruzar fronteras de repo. Es tooling de autor del
  engine, no de la plataforma. Ubicación propuesta: `tools/authoring-editor/`.

---

## 2. La cuestión del esquema de la `definition` — **RECOMENDACIÓN: SÍ, en el contrato, en la Fase 1**

### 2.1 El problema

Hoy la forma de la `definition` (campos comunes + `zones`/`observation` de drag-drop +
`options`/`correct` de choice) vive **implícita y hardcodeada** en cada `index.html` y en el
código de las escenas (`RoundScene`, `ChoiceScene`). El contrato valida el **manifest**
(`validateManifest`), pero **NO la `definition`** (verificado: `index.cjs` exporta
`MANIFEST_SHAPE`/`validateManifest` y NO un equivalente para `definition`).

Si el editor validara la `definition` con **reglas hardcodeadas propias**, cada evolución del
engine (campo nuevo, scoring distinto, primitiva nueva) obligaría a editar el editor en paralelo
o produciría bundles rotos silenciosamente. Ése es el **riesgo #1: paridad perpetua**.

### 2.2 Recomendación

**Promover el esquema de la `definition` al contrato `@didactifonis/contract`**, exportando:
- **`DEFINITION_SHAPE`** — documento de campos (común + por primitiva), análogo a `MANIFEST_SHAPE`.
- **`validateDefinition(definition) => { valid, errors[] }`** — **función pura, sin deps nuevas**
  (mismo estilo que `validateManifest`, sin `ajv`), que valida:
  - **campos comunes:** `id` (slug), `title`, `primitive ∈ {drag-drop, choice}`, `rounds` (entero
    > 0), `scoring {first, second, fail}`, `texts {intro, outroHigh, outroLow}`, `items` (longitud
    ≥ `rounds`).
  - **drag-drop:** `zones[] {id, label, color}` no vacío; `observation {enabled, durationMs}`
    opcional; cada ítem `{id, label, zoneId∈zones, questionText, audioUrl?}`.
  - **choice:** cada ítem `{id, questionText, audioUrl|null, options[] {id, label, correct}}` con
    **exactamente una** `correct: true` (regla que hoy solo vive en la cabeza del autor y en
    `ChoiceScene`).
- **`DEFINITION_CONTRACT_VERSION`** separada (mismo patrón que `MANIFEST_CONTRACT_VERSION`).

**Quién y dónde:** lo ejecuta `didactifonis-backend` en `C:\didactifonis-contract` (es lógica de
validación pura, sin UI), publicando `@didactifonis/contract` v1.2.0. El editor, el preview y
—a futuro— el engine en runtime y el `export-bundle` pueden converger a esta única fuente.

**Por qué en la Fase 1 y no después:** es la **cimentación** del editor. Construir el formulario
choice contra reglas hardcodeadas en la Fase 1 y migrarlas al contrato después sería re-trabajo y
una ventana de drift. Entra **antes** del primer formulario que necesita validar. (Beneficio
colateral: el `export-bundle.cjs` y eventualmente el `createGame` del engine pueden adoptar
`validateDefinition` para fallar temprano ante una `definition` rota — fuera del alcance v1 del
editor, pero la inversión queda hecha.)

> **Anti-alcance del esquema:** `validateDefinition` describe las **2 primitivas actuales**. NO se
> diseña un meta-esquema genérico para primitivas futuras (eso es la visión RPG-Maker diferida).
> Añadir una primitiva 3 en el futuro = extender el esquema, decisión de ese momento.

---

## 3. Descomposición en FASES incrementales y verificables

Orden: **menor → mayor riesgo**. Empaquetado/distribución/auto-update y pulido de UX para externos
al final. Cada fase entrega algo verificable y se decide continuar tras cerrarla.

---

### FASE 1 — Esqueleto Electron + esquema en contrato + choice de punta a punta (incremento mínimo)

**Objetivo:** el editor Electron arranca, embebe el contrato y el engine, y permite autorar +
validar + exportar **UN juego choice** (la primitiva más simple: sin zonas, sin assets, audio
null) que produce un ZIP que **la plataforma ingiere**. Es la validación de toda la tesis con el
mínimo de UI.

**Entregable concreto:**
1. (backend, contrato) `@didactifonis/contract` v1.2.0 con `DEFINITION_SHAPE` +
   `validateDefinition` + `DEFINITION_CONTRACT_VERSION` (§2.2), cubriendo ambas primitivas
   (se define entero aunque la UI de la Fase 1 solo use choice).
2. (frontend) Scaffold `tools/authoring-editor/` con `electron-vite`: main + preload (canales IPC
   mínimos: `newProject`, `saveProject`, `exportBundle`, `validateDefinition`) + renderer React.
   `contextIsolation/sandbox` ON desde el commit 1 (§1.1).
3. (frontend) Vendoreo del contrato (`copy-contract.cjs`) y del engine (`engine.umd.js`) dentro del
   editor; **generalización de `vendor-engine.cjs` a `<game-dir>`** (cierra la deuda del Piloto 2).
4. (frontend) Formulario mínimo: datos del manifest (reusa la lógica del manifest-builder) + campos
   comunes de la `definition` (rounds, scoring, textos) + **banco de ítems choice** (CRUD, con la
   regla "exactamente 1 correcta" validada vía `validateDefinition`).
5. (frontend/main) Botón **Exportar**: escribe la carpeta de proyecto + entry HTML desde plantilla,
   invoca `vendor-engine.cjs` + `export-bundle.cjs`, muestra ZIP o errores.

**Cómo se verifica (QA):** un flujo reproducible donde se autora un juego choice equivalente a
**La Máquina del Tiempo Verbal**, se exporta, y el ZIP resultante **pasa el upload de la
plataforma** (`bundleArchive.js`) y **carga en GameHost** (reusando el patrón de los arneses E3:
`validate-manifest` OK, estructura del ZIP, `__demoAutoplay`/`console.*`/`BUILD:STRIP`/`*.map` = 0).
Aserción dura: `validateDefinition` rechaza un banco con 0 o 2 opciones correctas.

**Dependencias:** contrato v1.2.0 (entregable 1) antes del formulario (entregable 4). Generalización
de `vendor-engine.cjs` antes del export (entregable 5).

**Por qué es el incremento mínimo y no "el cascarón de todo":** no incluye preview, ni drag-drop,
ni assets, ni empaquetado. Es la línea más corta entre "abre la app" y "el ZIP funciona en la
plataforma" — responde empíricamente "¿un no programador puede autorar un juego?" con la menor
inversión.

---

### FASE 2 — Preview embebido en vivo + drag-drop + assets

> Esta fase cierra el **objetivo del MVP**: cubrir AMBAS primitivas con preview. Al terminarla, el
> editor reemplaza la autoría a mano de los dos pilotos existentes. Es también el **punto de
> control de aborto** (§6).

**Objetivo:** cerrar el loop "edito → veo → exporto" y cubrir la segunda primitiva con assets.

**Entregable concreto:**
1. (frontend) **Preview embebido**: `<iframe sandbox>` con `engine.umd.js` en `standaloneMode`,
   recibiendo la `definition` en construcción (§1.3). Botón "Previsualizar" que re-monta con el
   estado actual.
2. (frontend) **Editor de zonas** (solo si `primitive = drag-drop`): CRUD de `{id, label, color}`,
   con **color restringido a los tokens de `design-system.md`** (sin hex sueltos — convención de
   `CLAUDE.md §7`).
3. (frontend) **Banco de ítems condicional por primitiva**: el formulario de ítem cambia según
   drag-drop (`zoneId`+`label`+`questionText`+`audio`) vs choice (ya hecho en Fase 1).
4. (frontend/main) **Carga de assets**: el autor selecciona archivos locales (imágenes, `.mp3`); el
   main los **copia a `assets/`** del proyecto y rellena rutas relativas automáticamente
   (`audio/cama.mp3`, `art/items/<id>.png`) según la convención ya fijada en el brief de assets.
   Valida existencia + extensión. Audio opcional (choice corre con `null`); sprite cae al
   placeholder si no se sube (preserva el comportamiento actual del engine).

**Cómo se verifica (QA):** autorar un juego drag-drop equivalente a **La Casa Mágica** (4 zonas,
banco de ítems con `zoneId`, observación opt-in), previsualizarlo en vivo dentro del editor, y
exportar un ZIP que pasa upload + GameHost. Verificar que el preview usa el **mismo** `engine.umd.js`
que el bundle (sin divergencia). Aserción: una zona con color fuera de los tokens se rechaza.

**Dependencias:** Fase 1 (esqueleto, export, contrato). El preview depende del engine vendoreado
de la Fase 1.

---

### FASE 3 — Gestión de proyectos y robustez para uso real

**Objetivo:** que el editor sea usable por un autor a lo largo del tiempo, no solo en una pasada.

**Entregable concreto:**
1. (frontend/main) Abrir/guardar/nuevo proyecto vía diálogos nativos; lista de proyectos recientes;
   detección de cambios sin guardar.
2. (frontend) Validación **en vivo** del formulario completo (definition + manifest) con
   `validateDefinition`/`validateManifest`, errores por campo (patrón ya probado en el
   manifest-builder), export deshabilitado si inválido.
3. (frontend/main) Manejo de errores robusto: el spawn de los scripts falla con mensaje accionable;
   un asset faltante no rompe el editor; un `project.json` corrupto se reporta, no crashea.

**Cómo se verifica (QA):** ciclo abrir → editar → guardar → reabrir conserva el estado; un proyecto
inválido nunca exporta; corromper `project.json` produce error manejado, no crash.

**Dependencias:** Fases 1–2.

---

### FASE 4 — Auditoría de seguridad integral del editor

**Objetivo:** auditar la superficie de seguridad propia del editor como **app que abre archivos
arbitrarios, escribe carpetas y spawnea procesos** ANTES de empaquetarlo para externos.

**Entregable concreto (security, solo reporta):**
1. Revisión de la configuración Electron: `contextIsolation`/`nodeIntegration`/`sandbox`, superficie
   del preload (ningún canal IPC expone `fs`/`child_process` crudos al renderer).
2. Manejo de **archivos no confiables**: assets que el autor importa (imágenes/audio de origen
   desconocido) — validación de tipo/extensión, sin ejecución, sin traversal al copiar.
3. Invocación de scripts: argumentos sanitizados (sin inyección de shell vía nombre de proyecto/ruta),
   `child_process` sin `shell: true`.
4. El iframe del preview: sandbox sin `allow-same-origin` (misma regla innegociable que GameHost,
   memoria B-2/H3); el preview no puede tocar la app ni el FS.
5. Confirmar la **frontera conceptual**: el editor NO toca datos de menores, NO cruza la frontera
   SaMD. Pero **el bundle que genera la plataforma lo ejecuta** en el navegador del niño → el editor
   es un eslabón de la cadena de suministro del contenido. Hereda los 5 requisitos firmes de E3-H3
   (sin `__demoAutoplay`/`console.*`/`BUILD:STRIP`/sourcemaps/CDN en el ZIP) **porque invoca el
   `export-bundle` que ya los garantiza** — verificar que el editor no introduce una vía que los
   eluda (p. ej. inyectar HTML del autor sin pasar por el strip).

**Cómo se verifica:** informe de hallazgos con severidad; los ALTO/CRÍTICO se remedian (frontend) y
se re-audita antes de pasar a la Fase 5.

**Dependencias:** Fases 1–3 (audita el editor funcional, antes de empaquetar).

---

### FASE 5 — Empaquetado instalable, auto-update y pulido de UX para externos (la más cara)

**Objetivo:** convertir el editor en un **producto instalable** para autores externos no técnicos.
Es lo más caro y arriesgado; va al final a propósito.

**Entregable concreto:**
1. (frontend/main) **`electron-builder`**: instalador Windows (mac/Linux solo si Emiliano confirma
   demanda). El `engine.umd.js`, los scripts (`vendor-engine`/`export-bundle`) y el contrato
   vendoreado viajan en `resources/`; el main los resuelve sin que el autor clone ningún repo.
2. (frontend/main) **Auto-update** (`electron-updater`) con un canal de distribución (decisión
   abierta §7: dónde se hospedan los releases). **Firma de código** (decisión abierta §7: si se
   adquiere certificado).
3. (frontend) **Pulido de UX para no técnicos**: onboarding/tutorial mínimo, lenguaje sin jerga
   técnica, mensajes de error en español claro, tooltips por campo, flujo guiado
   "nuevo → autorar → previsualizar → exportar".

**Cómo se verifica (QA + security):** instalar el `.exe` en una máquina limpia (sin repos clonados,
sin Node) y completar el flujo de "v1 terminado" (§5) de punta a punta. Security re-audita el
artefacto empaquetado (qué se incluye en `resources/`, no se filtran fuentes/sourcemaps del engine,
el instalador no pide permisos excesivos).

**Dependencias:** Fases 1–4. La firma de código y el canal de update dependen de las decisiones
abiertas §7 (D-EDV-1, D-EDV-2) — cerrarlas **antes de empezar la Fase 5**, no antes de la Fase 1.

---

### Tabla resumen de agentes por fase

| Fase | Ejecuta | Verifica | Audita |
| :-- | :-- | :-- | :-- |
| 1 — Esqueleto + esquema + choice E2E | `backend` (contrato), `frontend` (editor) | `qa` | — |
| 2 — Preview + drag-drop + assets | `frontend` | `qa` | — |
| 3 — Gestión de proyectos | `frontend` | `qa` | — |
| 4 — Auditoría de seguridad | — | — | `security` (remedios: `frontend`) |
| 5 — Empaquetado + auto-update + UX | `frontend` | `qa` | `security` (artefacto empaquetado) |

> Nota de roles: la UI del editor es JS/Electron/React → `didactifonis-frontend`. El esquema de la
> `definition` en el contrato es validación pura sin UI → `didactifonis-backend`. La verificación
> E2E (ZIP → upload → GameHost) → `didactifonis-qa`. La superficie Electron/FS/spawn →
> `didactifonis-security`.
>
> **El editor NO toca datos de menores ni la frontera SaMD** — pero **maneja archivos arbitrarios y
> genera bundles que la plataforma ejecuta**: por eso tiene auditoría de seguridad propia (Fase 4) y
> re-auditoría del empaquetado (Fase 5), no solo "compliance de menores".

---

## 4. Superficie de seguridad propia del editor (anotada)

El editor **no** maneja PII de menores ni datos de salud, y **no** cruza la frontera SaMD (produce
ejercicios de Capa 1 sin scoring clínico). Pero tiene superficie de seguridad **propia** por ser una
app de escritorio que:
- **Abre y copia archivos arbitrarios** que el autor importa como assets (origen no confiable).
- **Escribe carpetas de proyecto** y artefactos en el FS del usuario.
- **Spawnea procesos** (`vendor-engine`, `export-bundle`) con argumentos derivados de input del autor.
- **Genera bundles que un tercero (la plataforma) ejecutará** en el navegador de un niño — el editor
  es parte de la **cadena de suministro** del contenido que llega al menor.

Por eso la Fase 4 es una auditoría de seguridad de pleno derecho (no un trámite) y la decisión de
config Electron segura (§1.1) es innegociable desde el primer commit.

---

## 5. Criterios de "v1 terminado" (definición de hecho)

El v1 está terminado cuando **un autor externo no técnico, en una máquina limpia (instalador, sin
repos clonados, sin Node, sin línea de comandos)**, puede completar de punta a punta:

1. **Instalar** el editor desde el instalador y abrirlo.
2. **Crear un proyecto nuevo** y elegir la primitiva.
3. **Autorar un juego de la primitiva CHOICE** (textos, scoring, banco de ítems con opciones y la
   correcta) — equivalente a La Máquina del Tiempo Verbal.
4. **Autorar un juego de la primitiva DRAG-DROP** (zonas con colores de los tokens, banco de ítems
   con zona destino, observación opt-in) — equivalente a La Casa Mágica.
5. **Importar assets** (imágenes y `.mp3`) sin escribir rutas a mano.
6. **Previsualizar** el juego en vivo dentro del editor (el juego real corriendo, mismo engine que
   producción).
7. **Exportar un ZIP** que **la plataforma ingiere sin error** (`POST /upload`,
   `bundleArchive.js`) y que **carga y se juega en GameHost**, cumpliendo los 5 requisitos de
   seguridad del bundle de producción (sin hooks de demo, sin `console.*` del autor, sin
   `BUILD:STRIP` residual, sin sourcemaps, sin CDN).
8. Hacerlo todo **sin tocar HTML, JS ni la línea de comandos**.

Si los 8 puntos se cumplen para ambas primitivas desde un instalable, el v1 está hecho.

---

## 6. Riesgos por fase, mitigaciones y punto de control de aborto

| Riesgo | Fase(s) | Mitigación |
| :-- | :-- | :-- |
| **Paridad perpetua con la `definition` del engine (riesgo #1)** | Todas | Esquema en el contrato (`validateDefinition`) **en la Fase 1**: el editor hereda los cambios del engine vía el contrato, no los re-codifica. Esto es la mitigación estructural del riesgo #1. |
| **Config Electron insegura** (acceso de Node desde el renderer) | 1 | `contextIsolation`/`nodeIntegration:false`/`sandbox` desde el commit 1; preload con canales mínimos; auditoría dedicada en Fase 4. |
| **Superficie de UI grande** (banco de ítems, condicionales, preview) | 1–2 | Incremento mínimo primero (choice sin preview en Fase 1); React+Vite para estado; reusar el patrón del manifest-builder. |
| **Divergencia preview ↔ producción** | 2 | Un único `engine.umd.js` vendoreado, usado por preview y por el bundle (vía `vendor-engine`). El preview es el juego real en `standaloneMode`. |
| **Inyección vía spawn de scripts / assets no confiables** | 4 | `child_process` sin `shell:true`, args sanitizados, validación de assets, sin traversal. Auditoría Fase 4. |
| **Costo/cronograma del empaquetado** (build, firma, auto-update) | 5 | Diferido al final; en Fases 1–4 todo corre en `electron-vite dev` sin pagar el costo de empaquetado hasta haber validado el editor. |
| **Sobre-ingeniería hacia RPG-Maker** | Todas | Anti-alcance estricto (§ del brief de scoping): solo drag-drop y choice; `validateDefinition` describe solo las 2 primitivas actuales; nada de editor de eventos genérico. |

### Punto de control de aborto temprano — **AL CIERRE DE LA FASE 2**

La Fase 2 es el punto natural de aborto: al cerrarla, el editor **ya cubre ambas primitivas con
preview** (el objetivo del MVP), pero **aún NO se ha pagado** el costo grande de empaquetado/firma/
auto-update/UX-para-externos (Fase 5). Criterios para evaluar continuar vs abortar:

- **¿La UI costó significativamente más de lo previsto** (el banco de ítems / condicionales por
  primitiva resultaron mucho más caros que el manifest-builder)?
- **¿El flujo de autoría es realmente usable por un no técnico**, o sigue exigiendo conocimiento
  implícito del formato?
- **¿Hay un autor externo concreto / volumen de juegos real** que justifique pagar la Fase 5?

Si la respuesta inclina a "no se justifica", se **detiene en Fase 2** con un editor funcional para el
equipo (corre en dev) y **se difiere la Fase 5** (empaquetado para externos) hasta que haya demanda
concreta — recuperando gran parte del valor con el menor sunk cost. Es el mismo principio del brief:
no pagar el componente más caro antes de validar empíricamente que resuelve el problema.

---

## 7. Decisiones abiertas que aún condicionan fases

Ninguna de estas **bloquea la Fase 1**. Se cierran **antes de la fase que afectan**.

- **D-EDV-1 — Canal de distribución / hosting de releases (afecta Fase 5).** ¿Dónde se publican los
  releases del editor para el auto-update (GitHub Releases del repo privado, un bucket, otro)?
  Cerrar antes de empezar la Fase 5.
- **D-EDV-2 — Firma de código (afecta Fase 5).** ¿Se adquiere un certificado de firma para Windows
  (evita el SmartScreen al instalar)? Tiene costo monetario y de gestión. Si no, el instalador no
  firmado es aceptable para un v1 con autores de confianza, a costa de fricción en la instalación.
  Cerrar antes de la Fase 5.
- **D-EDV-3 — Plataformas objetivo (afecta Fase 5).** ¿Solo Windows (donde trabaja Emiliano y,
  presumiblemente, los autores), o también mac/Linux? mac añade firma/notarización de Apple (costo).
  Recomendación: **solo Windows en el v1**, ampliar si aparece un autor en otra plataforma.
- **D-EDV-4 — Ámbito del `validateDefinition` (afecta Fase 1, NO bloqueante).** ¿Campos desconocidos
  en la `definition` = ERROR (como decidió backend para `validateManifest`) o warning? Recomendación:
  **mismo criterio que el manifest** (ERROR, reversible) por consistencia. Decidible al especificar el
  contrato v1.2.0, no antes de arrancar.

> **D-E3-1/D-E3-3 (arte/audio y "Tomás el Constructor Mágico")** NO condicionan el editor: el editor
> consume assets ya producidos; producirlos es trabajo de arte externo paralelo. No bloquean ninguna
> fase.

---

*Plan de implementación. Sin commitear, para revisión y aprobación de Emiliano. No se ha tocado
código ni iniciado la Fase 1. La Fase 1 arranca solo tras la aprobación de Emiliano.*
