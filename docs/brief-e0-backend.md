# Brief E0 — Ajuste de modelo de score + campo `events` + extracción a `/shared`

> **Para:** `didactifonis-backend`
> **De:** `didactifonis-architect`
> **Fase:** E0 (lado plataforma, BLOQUEANTE). Fuente: `docs/plan-sdk-engine-juegos.md` §3.0, §2.B.1, §2.B.2, §4 (Fase E0).
> **Contrato:** 2.A + 2.B CERRADO (v0.6). 6 ADR resueltas por Emiliano. NO reabrir decisiones de contrato.
> **Fecha:** 2026-06-04

## Contexto verificado (no asumir, ya comprobado por el arquitecto)

- `score` actual (`Number, min:0, max:100`) **NO tiene consumidores** fuera de
  `server/activities/ActivityResult.js` y `server/activities/resultsRouter.js`
  (verificado con `git grep`). `server/routes/progress.js` lee `passed`,
  `attemptCount`, `durationSeconds`, `activityType`, `createdAt` — nunca `score`.
  El cliente no referencia `score`. **Migración de bajo riesgo.**
- `shared/index.js` **ya existe** y exporta con sintaxis **ESM** (`export const ROLES`).
  El server consume con **CommonJS** (`require`). Resolver esta interoperabilidad es
  parte de E0 (ver más abajo, punto de atención).
- `Activity.js` no tiene `passThreshold` hoy. `ActivityResult.js` no tiene
  `rawScore`/`maxScore`/`scorePercent`/`events`.

## Alcance EXACTO de E0 (lo que SÍ se hace)

### 1. Modelo `ActivityResult` (`server/activities/ActivityResult.js`)
- **Eliminar** `score` (`Number, min:0, max:100`). Sin consumidores, sin retro-compat de lectura.
- **Añadir** `rawScore` (`Number`, `min:0`, default `null`) — crudo informativo del juego.
- **Añadir** `maxScore` (`Number`, `min:0`, default `null`) — máximo de la escala interna del juego.
- **Añadir** `scorePercent` (`Number`, `min:0`, `max:100`, default `null`) — **derivado server-side**, canónico.
- Mantener `passed` (`Boolean`) — pasará a derivarse server-side (la derivación es E1, ver "NO hacer").
- **Añadir** `events` (`[{ type: String, timestamp: Date, payload: Mixed }]`, default `[]`),
  array embebido. NO colección aparte.
- Comentarios en el modelo:
  - score: "Capa 1 educativa. `scorePercent`/`passed` son derivados server-side; `rawScore`/`maxScore` son informativos del juego (entrada no confiable)."
  - events: "Capa 1 educativa — traza de telemetría; almacenada tal cual; no se deriva métrica de ella (frontera SaMD)."

### 2. Migración de datos (script idempotente, `server/` donde correspondan los scripts existentes)
- Para documentos con el viejo `score` (rango 0–100): `scorePercent = score`, `rawScore = score`, `maxScore = 100`.
  Equivalencia segura porque el rango antiguo ya era 0–100.
- Si no hay datos en BD, el script no debe fallar (no-op seguro). Hazlo idempotente.

### 3. `passThreshold` como parámetro de actividad (`server/models/Activity.js`)
- Añadir `passThreshold` (`Number`, `min:0`, `max:100`, default `60`). Lo fija el Admin al subir
  (en el MVP **sin override del tutor**, ver plan §8.6 v0.6).
- NO añadir override en `Assignment` en E0 (el MVP no lo usa). Si lo ves trivial, déjalo marcado pero no lo implementes.

### 4. Extraer contrato + constantes a `/shared`
- Definir en `/shared` (un solo lugar consumible por server y, a futuro, por el SDK):
  - **Catálogo estándar de `type` de eventos v1.0** (enum): `activity_started`, `activity_completed`,
    `paused`, `resumed`, `abandoned`, `attempt`, `item_answered`, `hint_used`, `level_advanced`.
  - **Cap defensivo de ingesta de eventos**: constante con valor **provisional `200`**, marcada
    explícitamente como "provisional, a recalibrar en E2". Comentario: es protección del servidor
    (integridad del documento, límite 16 MB MongoDB; entrada no confiable), NO un tope de contrato.
  - **`contractVersion` / `version`** del contrato de resultados (`"1.0"`).
  - El **esquema/forma** del contrato de resultados 2.B (campos canónicos) como referencia compartida.
- **Interoperabilidad ESM/CommonJS:** `shared/index.js` hoy es ESM. El server es CommonJS. Resuélvelo
  de forma que **el server pueda `require` estas constantes sin romper el cliente** que ya importa
  `ROLES`. Elige el mecanismo mínimo (p. ej. `module.exports` + interop, o un sub-archivo CJS, o
  ajustar el build). Es una decisión técnica menor que puedes tomar; documenta brevemente cuál elegiste.

## Lo que NO se hace en E0 (frontera con E1 — NO inflar)

- **NO tocar `resultsRouter.js`** con lógica de derivación de `scorePercent`/`passed`, validación
  de `sessionToken`, truncado/filtrado de `events`, ni endurecimiento de ingesta. **Todo eso es E1**
  (plan §3.1). E0 solo deja el **modelo** listo. (El router seguirá escribiendo el campo viejo hasta E1;
  si quitar `score` rompe la creación actual en el router, haz el ajuste MÍNIMO para que no falle
  —dejar de pasar `score`— pero NO añadas la derivación; márcalo como puente a E1.)
- **NO** tocar `progress.js` (no consume `score` ni `events`).
- **NO** implementar `ActivitySessionToken` ni el endpoint de arranque (eso es E1).
- **NO** introducir scoring clínico, clasificación, umbrales diagnósticos, inferencia de patología
  ni IA decisoria. `passThreshold`/`scorePercent`/`passed` son **Capa 1 educativa, NO SaMD**
  (CLAUDE.md §2, anti-alcance §5.1–§5.3).
- **NO** serializar atributos del menor en ningún sitio nuevo.

## Criterios de aceptación

- El modelo persiste `rawScore`, `maxScore`, `scorePercent` (0–100), `passed` y `events` (default `[]`).
- `score` eliminado del modelo; nada en el repo lo sigue leyendo.
- `progress.js` y demás lectores siguen funcionando.
- `Activity.passThreshold` existe y es consultable, default 60.
- `/shared` exporta el catálogo de eventos v1.0, el cap defensivo (200, provisional) y la versión del contrato,
  **consumibles desde el server (CommonJS) sin romper el import ESM del cliente**.
- El proyecto compila / el server arranca / el cliente compila. Reporta el resultado de verificación.

## Entregable de vuelta al arquitecto

Resumen de: archivos creados/modificados, decisión de interop ESM/CJS tomada, estado de
verificación (build/arranque), y cualquier ambigüedad que acotaste conservadoramente.
