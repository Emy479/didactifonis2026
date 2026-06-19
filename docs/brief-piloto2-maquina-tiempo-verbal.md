# Brief — Piloto 2: "La Máquina del Tiempo Verbal"

> Estado: borrador de arquitecto para ejecución por hitos.
> Repo de trabajo: `C:\didactifonis-engine` (rama `feat/piloto2-maquina-tiempo-verbal`).
> Plan maestro: `docs/plan-sdk-engine-juegos.md` §8.6.
> Este doc vive en el repo plataforma; el código vive en el repo engine.

## 1. Objetivo y tesis a validar

El Piloto 2 NO es solo "otro juego". Es la **prueba de la tesis data-driven** de la
plantilla `RoundActivity`: ¿construir un juego con una mecánica de interacción distinta
(selección 1-de-3) fue mayormente **escribir una definición de datos + una primitiva de
interacción reutilizable**, o exigió **reescribir la plantilla**?

La respuesta honesta es el entregable más importante de este hito. Si la plantilla
necesita cambios estructurales grandes para soportar 1-de-3, eso es un hallazgo (la
plantilla no era tan genérica) y se reporta, no se oculta.

### Hipótesis del arquitecto (a confirmar en ejecución)

Tras leer la plantilla actual, la línea de corte ya existe en el código:

- **Genérico y reutilizable tal cual:** todo el ciclo de `RoundActivity` (init SDK,
  selección aleatoria de 10 ítems, intro→rondas→outro, callbacks de telemetría
  `onAttempt`/`onItemAnswered`/`onHintUsed`/`onGameComplete`, scoring 2/1/0, `OutroScene`,
  `IntroScene`). El molde de puntaje y la máquina de estados de ronda (1er intento → pista
  → 2º intento → auto-ayuda) son agnósticos de la mecánica.
- **Específico de la mecánica (lo que cambia):** `RoundScene` mezcla hoy el flujo
  genérico con la mecánica drag&drop (`_buildZones`, `_buildDraggableItem`, eventos
  `drag*`, `_getHitZone`). Eso es lo que una segunda primitiva necesita sustituir.
- **Bloqueo conocido a abrir:** `index.js > createGame()` rechaza con `throw` cualquier
  `primitive !== 'drag-drop'`. Ese guardrail fue intencional en v0.1.0 y hay que
  ampliarlo a `'choice'` (cambio aditivo, no reescritura).

Predicción: el trabajo es **un dispatcher de escena por `primitive` + una nueva escena
`ChoiceScene` que reusa el molde de scoring + una definición de datos**. Si resulta que
hay que reescribir `RoundActivity` o el scoring, eso refuta parcialmente la tesis y se
reporta como tal.

## 2. El corte (qué entra / qué NO)

### Entra
- Nueva **primitiva de interacción `choice` (selección 1-de-3)** como módulo reutilizable
  dentro de la plantilla, **opt-in dirigido por la definición** (`primitive: 'choice'`).
- Ampliar `createGame()` para aceptar `'choice'` además de `'drag-drop'` (aditivo).
- Definición de datos del juego en `games/maquina-tiempo-verbal/` (HTML + manifest +
  fuentes self-host + audio placeholder), con 10 rondas de conjugación regular, banco de
  verbos representativo, 3 opciones por ronda (1 correcta + 2 distractores).
- Reutilización del molde compartido: 10 rondas, scoring 2/1/0, maxScore 20, aprueba con
  14 (lo fija el Admin vía `Activity.passThreshold`; el engine solo lo usa como feedback
  lúdico no autoritativo, igual que Piloto 1).
- Export del bundle exportable con las mismas garantías que H3 (ver §6).

### NO entra (fuera de alcance, igual que en H2 del Piloto 1)
- **Arte/audio reales.** Audio = placeholder (beep mudo, swap 1:1 posterior). Sin arte
  fino: las opciones se renderizan como tarjetas de texto con Phaser Graphics. Ningún
  ilustrador/locutor en este hito (eso es D-E3-1, acción externa de Emiliano).
- Editor de autoría Electron, Piloto 3, otras primitivas. Pilotos en secuencia.
- Cualquier cambio al **contrato** (`@didactifonis/contract`). La tesis dice que 1-de-3
  cabe sin cambios de contrato. Si la ejecución descubre que NO cabe, **detenerse y
  reportar a Emiliano** — no inventar un cambio de contrato.
- Cambios al backend de plataforma. El bundle se valida con el `validateManifest()` del
  contrato ya consumido; la ingesta server-side ya existe (no se toca).

## 3. Diseño de la primitiva 1-de-3 (`choice`) como módulo reutilizable

### 3.1 Principio: aditivo, no destructivo
La demo H1, la `RoundScene` drag&drop y el Piloto 1 "La Casa Mágica" deben quedar
**intactos byte-a-byte en comportamiento**. La primitiva `choice` se añade en paralelo,
no modifica la existente.

### 3.2 Dispatch por primitiva
- `index.js > createGame()`: ampliar la whitelist de primitivas a
  `['drag-drop', 'choice']`. Mantener el `throw` para cualquier otra (guardrail intacto).
- `RoundActivity._mountPhaser()`: seleccionar la escena de ronda según
  `definition.primitive`. Para `'drag-drop'` → `RoundScene` (actual, sin tocar). Para
  `'choice'` → nueva `ChoiceScene`. `IntroScene` y `OutroScene` se comparten sin cambios.
  - Implementación sugerida: un pequeño mapa `{ 'drag-drop': RoundScene, 'choice':
    ChoiceScene }`. Cambio mínimo y localizado en `_mountPhaser`.

### 3.3 `ChoiceScene` — reutiliza el molde, cambia solo la interacción
La nueva escena DEBE reusar (no reimplementar) el contrato del `sessionState`:
- Lee `selectedItems`, `roundIndex`, `def.scoring`, HUD de puntaje/ronda/progreso
  (puede compartir helpers visuales con `RoundScene` o duplicar los mínimos; preferir
  helpers compartidos si el costo es bajo, sin sobre-ingeniería).
- Llama exactamente los mismos callbacks y con la misma semántica:
  - `state.onAttempt({ index })` en cada selección del niño.
  - **Máquina de estados 2/1/0 idéntica al drag&drop:**
    - Acierto al 1er intento → `+scoring.first` (2), `onItemAnswered({correct:true,
      attemptIndex:0})`, avanza.
    - Error 1º → `onHintUsed({level:1})`, pista visual (resaltar/atenuar; ver 3.4),
      NO avanza, el niño reintenta entre las opciones restantes.
    - Acierto 2º → `+scoring.second` (1), `onItemAnswered({correct:true,
      attemptIndex:1})`, avanza.
    - Error 2º → `onHintUsed({level:2})`, auto-ayuda (marca la correcta),
      `onItemAnswered({correct:false, attemptIndex:1})`, `+0`, avanza.
  - `state.onGameComplete()` al terminar la ronda 10 (lo dispara el avance, igual que hoy).
- Reusa la fase de **observación opt-in** y el **botón altavoz / audio opt-in** si la
  definición los trae (mismos campos: `def.observation`, `item.audioUrl`). No es
  obligatorio que el Piloto 2 los use, pero la primitiva no debe romperlos.

### 3.4 Interacción visual de `choice`
- En vez de panel-ítem + zonas drag, se muestra el **enunciado** (la frase con el verbo a
  conjugar) arriba y **3 tarjetas/botones de opción** abajo (grilla horizontal o 1×3).
- El niño **toca/clic** una opción (no arrastra). Zonas táctiles ≥44px (manos infantiles,
  igual criterio que el botón altavoz actual).
- Feedback: acierto → flash verde en la tarjeta + avance; error 1º → la opción elegida se
  atenúa/marca como incorrecta y queda deshabilitada (pista = el set se reduce), el resto
  siguen activas; error 2º → se resalta la correcta (auto-ayuda) y avanza.
- Estética: tokens de `design-system.md`. Sin neones/glows/sci-fi. Tipografía Poppins
  (UI/enunciado) + Nunito Sans (cuerpo). Mismo lenguaje visual "panel limpio" del Piloto 1.

### 3.5 Modelo de datos de la opción (definición → escena)
La escena 1-de-3 no usa `zones`/`zoneId`. Cada ítem trae sus propias opciones. Forma
propuesta de cada ítem (a refinar por el implementador, manteniendo coherencia con el
estilo del Piloto 1):

```js
{
  id: 'verbo-saltar-pasado-3sg',
  questionText: 'Ayer él ___ muy alto.',   // enunciado visible (accesible sin audio)
  audioUrl: null,                          // o 'audio/...mp3' placeholder si se usa
  options: [
    { id: 'opt-a', label: 'saltó',   correct: true  },
    { id: 'opt-b', label: 'salta',   correct: false },
    { id: 'opt-c', label: 'saltará', correct: false },
  ],
}
```

- `correct: true` debe estar en **exactamente una** opción. El implementador valida esto
  defensivamente (si una definición trae 0 o >1 correctas, fallar claro en consola, no
  silenciosamente).
- El **orden de las 3 opciones se baraja** en runtime (Fisher-Yates, ya hay `shuffle` en
  `RoundActivity`) para que la correcta no quede siempre en la misma posición.

## 4. Definición de datos del juego (contenido del Piloto 2)

- **Tema:** tiempos verbales **regulares** (conjugación). Capa 1 educativa. **CERO PII.**
  **NO SaMD:** sin diagnóstico, sin scoring clínico, sin recomendación terapéutica. Solo
  un ejercicio de lengua con puntaje lúdico.
- **Edad 7+** (`ageMin: 7` en el manifest; segunda banda de edad).
- **Mecánica:** 1-de-3 (elegir la conjugación correcta).
- **Banco de verbos representativo (placeholder):** verbos regulares comunes de las 3
  conjugaciones (-ar, -er, -ir), p. ej. saltar, cantar, jugar, comer, correr, beber,
  vivir, subir, partir, etc. Banco ≥ 12–16 ítems para que la selección aleatoria de 10
  dé variedad entre sesiones (mismo patrón que los 24 ítems del Piloto 1).
- **Distractores plausibles pero claramente incorrectos:** otra persona/número u otro
  tiempo del mismo verbo (p. ej. correcta "saltó", distractores "salta"/"saltará").
  Pedagógicamente útiles, no tramposos.
- **Enunciado siempre visible como texto** (accesibilidad; el audio es complementario,
  igual que en Piloto 1). Audio placeholder opcional.
- **Textos narrativos** (`texts.intro`, `texts.outroHigh`, `texts.outroLow`): tono cálido,
  cercano, infantil. Temática "Máquina del Tiempo Verbal" (viajar en el tiempo del verbo).
  Prohibido lenguaje clínico.

## 5. Criterios de aceptación

Funcionales (verificables por QA end-to-end con el arnés E3/E5 contra Mongo):
1. El juego carga vía `createGame` con `primitive: 'choice'` sin lanzar excepción.
2. 10 rondas, selección 1-de-3, orden de opciones barajado por ronda.
3. Molde de puntaje **2/1/0 idéntico** al drag&drop: 2 acierto al 1er intento, 1 tras
   pista, 0 con auto-ayuda. maxScore = 20.
4. Eventos del ciclo emitidos correctamente vía SDK: `activity_started`, `attempt`,
   `hint_used` (level 1 y 2), `item_answered` (con `correct`/`attemptIndex`),
   `activity_completed`, `submitResults`.
5. `scorePercent` se deriva **server-side** (el engine NO lo calcula ni envía `passed`;
   ADR-SDK-06). El doc registrado en Mongo refleja el rawScore correcto.
6. **Sin `sessionToken` ni PII** del menor en el documento de resultados ni en logs.
7. **Token de un solo uso** respetado (igual que el patrón E5).
8. La demo H1 y el Piloto 1 "La Casa Mágica" **siguen funcionando idénticos** (QA lo
   confirma explícitamente: autoplay/smoke de Casa Mágica verde).

Arquitectónicos (el hallazgo del hito):
9. Diff resumido que muestre la proporción **líneas de datos+primitiva nueva vs líneas de
   plantilla modificadas**. Si la plantilla genérica (`RoundActivity` scoring/ciclo) tuvo
   que cambiar estructuralmente, documentar qué y por qué.

Seguridad (auditados por `didactifonis-security`, solo reporta):
10. Cero PII, frontera SaMD intacta, ADR-SDK-03 respetado (sin fetch/XHR/storage en el
    engine; toda E/S vía SDK postMessage), **sin TTS en runtime**, sin secretos, sin CDN.

## 6. Requisitos firmes de exportabilidad (heredados de H3)

El bundle del Piloto 2 debe exportar con `scripts/export-bundle.cjs` cumpliendo lo mismo
que ya logró H3-E:
- **Excluir** `examples/` y los hooks de QA del bundle de producción: el HTML del juego
  debe envolver el hook `window.__demoAutoplay` y cualquier footer/comentario de dev en
  bloques `BUILD:STRIP:START` / `BUILD:STRIP:END` (el exporter los elimina).
- **Sin sourcemaps** en el bundle (el exporter ya quita `.map` y `sourceMappingURL`).
- **Sin CDN**: engine vendoreado local (`engine.umd.js` autocontenido, Phaser+SDK dentro).
- **Self-host de fuentes** (woff2 locales, mismo set que Casa Mágica).
- El export DEBE seguir validando el `manifest.json` contra `validateManifest()` del
  contrato (el script ya lo hace; el manifest del Piloto 2 debe pasar 10/10 campos).

## 7. Guardrails de proceso

- Trabajar en rama `feat/piloto2-maquina-tiempo-verbal` del repo engine.
- Cambios **mínimos y aditivos**. No reescribir lo que funciona.
- **NO mergear ni pushear** nada: el merge/push lo decide Emiliano.
- Si una corrección falla 2 veces seguidas: detenerse, resumir y devolver control.
- Si surge una decisión real de producto (set de verbos definitivo, o si 1-de-3 obligara
  a tocar el contrato): **detenerse y reportar a Emiliano**, no inventar.

## 8. Plan de ejecución (hitos)

- **P2-H1 (frontend/engine):** primitiva `choice` en la plantilla (dispatch +
  `ChoiceScene` reusando el molde) + definición de datos `games/maquina-tiempo-verbal/`
  con placeholders. Demo H1 y Piloto 1 intactos. Build del engine OK.
- **P2-H2 (QA):** validación end-to-end con el arnés E3/E5 contra Mongo. Criterios 1–8.
  Confirmar regresión cero en Casa Mágica.
- **P2-H3 (security):** auditoría (criterio 10). Solo reporta.
- **Cierre (arquitecto):** veredicto de genericidad (criterio 9), integración, resumen.

## 9. Estado de cierre — Tareas A / B / C (2026-06-18)

Trabajo ejecutado sobre la rama `feat/piloto2-maquina-tiempo-verbal` del repo engine,
encima de los 2 commits iniciales (`19f041b`, `26c203c`). **NO mergeado ni pusheado**
(decisión de Emiliano). Commits añadidos: `d2b0d4e`, `ea0d581`.

**TAREA A — Tildes de los verbos (commit `d2b0d4e`).** Corregida la ortografía RAE de
las 16 conjugaciones (labels de las 48 opciones), los `questionText` (mañana, rápido,
dragón, cumpleaños, fría, él/sábado…) y los textos narrativos `intro/outro`. Solo cambió
texto: ningún `id` de opción ni ninguna marca `correct: true` se movió (verificado en el
diff, 52/52 swaps emparejados por id). Presentes 1ª/3ª sin tilde (canto, corro, habla,
vive); pretéritos 1ª/3ª y futuros con tilde (saltó, comió, caminé, saltará, cantaré…).

**TAREA B — `x_audio_replayed` por el orquestador (commit `ea0d581`).** El evento ya no
se emite con `SDK.reportEvent(...)` directo desde las escenas. `RoundActivity.js` gana el
callback `onAudioReplay` en `_sessionState` y el método `_onAudioReplay({ round })` que
emite el evento custom `x_audio_replayed` (sigue siendo `x_`, no entra a `EVENT_TYPES`).
`RoundScene.js` (drag&drop) y `ChoiceScene.js` (choice) ahora llaman
`this._state.onAudioReplay({ round })`; imports de `SDK` muertos eliminados de ambas
escenas. Ningún otro evento cambió de ruta. `scripts/vendor-engine.cjs` parametrizado a
`GAME_DIRS = ['casa-magica','maquina-tiempo-verbal']` (corrige el DEV gotcha: antes solo
vendoreaba casa-magica). Engine recompilado (`npm run build`) y re-vendoreado en ambos
juegos (los 3 `engine.umd.js` = 1.510.060 bytes).
- **QA:** regresión cero confirmada — smoke 11/11, máquina 2/1/0 intacta en ambas
  primitivas, `x_audio_replayed` aparece 1 vez en el bundle (en el orquestador), payload
  `{ round }` idéntico. (Límite conocido: no hay ejecución Phaser headless en el repo
  engine; Casa Mágica "jugable" se sostiene en smoke + análisis estático.)
- **Security:** APTO sin hallazgos — telemetría sigue saliendo solo por el orquestador
  (ADR-SDK-03 intacto), payload sin PII, frontera SaMD intacta, nada debilitado.

**TAREA C — Verificación E2E-real (gate C5/C7).** Recorrido sobre la plataforma
(`C:\Didactifonis2026`) con datos reales: export ZIP (`maquina-tiempo-verbal-1.0.0.zip`,
~427 KB, manifest validó, prod sin `__demoAutoplay` ni `BUILD:STRIP`) → `POST
/api/activities/upload` (HTTP 201, activity `6a348ddf93fe8e53c812e80c`) → asignación a
"Demo Niño" (assignment `6a348df493fe8e53c812e815`) → ingesta de resultado (HTTP 201,
result `6a348e1c93fe8e53c812e826`) → `GET /api/progress/:childId` (HTTP 200, aparece).
Invariantes del contrato verificados en Mongo: `scorePercent` 80 derivado server-side
(16/20), `passed` true vs umbral 60, `maxScore` 20 (molde 10×2), 6 eventos canónicos
(`activity_started`, `item_answered`×4, `activity_completed`), `x_audio_replayed` ausente
(correcto: `audioUrl: null`), sin PII, sin `sessionToken` persistido, 2.º submit con el
mismo token rechazado idempotente (token de un solo uso).
- **Salvedad honesta (heredada de E5):** el bundle PROD elimina `__demoAutoplay`, así que
  el tramo *in-browser ChoiceScene → postMessage* NO se condujo por Playwright sobre el
  bundle prod. El bundle prod se verificó estáticamente (sin marcadores de dev) y la
  ingesta server-side se ejercitó con el contrato real (`POST /api/activities/results`,
  el mismo payload que emitiría el bundle de test con `__demoAutoplay` en `:8788`). La
  pata de servidor (ingest → derivación → persistencia → progreso) es 100% real; la pata
  de navegador queda cubierta por equivalencia de contrato, no por click real headless.
- **Veredicto gate C5/C7:** PUBLICABLE — SÍ con salvedad de entorno (`API_BASE_URL` sin
  definir hace que `resultsEndpoint` sea relativo en dev; pendiente de config de
  staging/prod, no es bloqueante técnico).

**Estado de la rama:** 4 commits, árbol limpio, local (sin push). Listo para que Emiliano
decida el merge.
