# Brief E1 — sessionToken de un solo uso + endpoint de arranque + derivación server-side de score + validación/truncado de `events`

> **Para:** `didactifonis-backend`
> **De:** `didactifonis-architect`
> **Fase:** E1 (lado plataforma, BLOQUEANTE). Fuente: `docs/plan-sdk-engine-juegos.md` §3.1, §3.0 (derivación), §2.A, §2.B, §2.B.1, §3.2 (Q-EVT-1..4).
> **Contrato:** 2.A + 2.B CERRADO (v0.6). 6 ADR resueltas + Q-EVT-1..4 resueltas por Emiliano. **NO reabrir decisiones de contrato.**
> **Depende de:** E0 (ACEPTADA). Modelo de score normalizado, `events` embebido, `Activity.passThreshold` y `/shared` ya existen.
> **Fecha:** 2026-06-04

---

## Contexto verificado (ya comprobado por el arquitecto — no re-verificar, no asumir lo contrario)

Estado REAL del repo a esta fecha (E0 ya integrada):

- **`server/activities/resultsRouter.js`** — `POST /` montado en `/api/activities/results`
  (`server/index.js:62`). HOY:
  - Va protegido con `protect + requireActiveSubscription` (JWT del tutor). **Esto debe cambiar en E1.**
  - Idempotencia actual = `assignment.status === 'completed'` → 409. **Debe migrar al token.**
  - Acepta `rawScore`/`maxScore`/`scorePercent`/`passed` del body y los persiste tal cual
    (es el "puente E0→E1" comentado en líneas 49-65). **NO deriva nada.** E1 implementa la derivación.
  - `events` se acepta si es array, sin validar ni truncar (línea 63). E1 implementa validación/truncado.
- **`server/activities/ActivityResult.js`** (E0, NO se toca el esquema en E1):
  `rawScore` (Number, min 0, default null), `maxScore` (idem), `scorePercent` (Number 0–100, default null),
  `passed` (Boolean, default null), `events` (`[{ type:String req, timestamp:Date req, payload:Mixed }]`, default `[]`),
  `metadata` (Mixed), `attemptCount`, `durationSeconds`, `schemaVersion`. Índices por `childId` y `assignmentId`.
- **`server/models/Activity.js`** (E0): tiene `passThreshold` (Number, min 0, max 100, default 60). Lo fija el Admin.
- **`server/models/Assignment.js`**: `activityId`, `childId`, `assignedBy`, `assignedByRole` (`tutor`|`profesional`),
  `status` (`pending`|`completed`|`skipped`), `dueDate`, `completedAt`. **NO emite token hoy.**
- **`server/models/Child.js`**: `tutorId` (ref User) y `accessGrants` (array de ref User = profesionales con acceso).
- **Patrón de permisos canónico** (de `server/routes/assignments.js:25-33,55-63`, reutilízalo tal cual):
  ```js
  const userId = req.user._id.toString();
  const isTutor = req.user.role === 'tutor' && child.tutorId.toString() === userId;
  const isPro   = req.user.role === 'profesional' &&
                  child.accessGrants.some((g) => g.toString() === userId);
  // admin: req.user.role === 'admin'
  ```
- **Middleware** (`server/middleware/auth.js`): `protect` (verifica JWT, adjunta `req.user`),
  `requireActiveSubscription` (usar DESPUÉS de protect), `requireRole(...roles)`. Sin cambios.
- **Rate limiting** (`server/index.js`): ya se usa `express-rate-limit`. Hay `globalLimiter`
  (100/15min, global) y `authLimiter` (20/15min, montado en `/api/auth`). **Patrón a imitar** para
  el limiter de `/results`: crear un limiter local y montarlo en el `app.use` del router.
- **`/shared`** (E0): `shared/index.js` (ESM, cliente) y `shared/index.cjs` (CommonJS, server) exportan
  `ROLES`, `CONTRACT_VERSION` (`'1.0'`), `EVENT_TYPES` (catálogo v1.0), `EVENTS_INGEST_CAP` (`200`,
  provisional) y `RESULT_CONTRACT_SHAPE`. **El server consume con `require('../../shared/index.cjs')`.**
  ⚠️ **HOY el `.cjs` está INERTE: ningún archivo del server lo requiere todavía** (verificado: 0 imports).
  E1 debe empezar a consumirlo (ver Arrastre 1).

---

## ARRASTRES DE E0 — OBLIGATORIOS EN E1 (no opcionales)

### Arrastre 1 — Consumir `/shared/index.cjs` desde el server (dejar de tener el `.cjs` inerte)
`resultsRouter.js` y el nuevo endpoint de arranque **DEBEN** importar y usar
`EVENTS_INGEST_CAP` y `EVENT_TYPES` (y `CONTRACT_VERSION` donde aplique) desde
`require('../../shared/index.cjs')`. **Prohibido** re-declarar el cap `200` o el catálogo de tipos
como literales locales en el server: una sola fuente de verdad (ADR-SDK-05). Si el truncado usa el
cap, lee `EVENTS_INGEST_CAP`; si distingues tipos estándar de custom, compara contra `EVENT_TYPES`.

### Arrastre 2 — Corregir el comentario erróneo sobre `type` desconocido (Q-EVT-3)
En **`shared/index.js:24`** y **`shared/index.cjs:28`** el comentario dice hoy, INCORRECTAMENTE:
`// Tipos desconocidos son rechazados en E1 (validación de ingesta).`
Eso contradice **Q-EVT-3 (contrato cerrado)**. La política correcta es:
**los `type` fuera de catálogo se CONSERVAN como custom (no se rechazan, no se descartan en silencio);
en el SDK además se emite un warning en dev.** El backend los almacena tal cual sin derivar métrica.
- **Corrige el comentario en AMBOS archivos** para reflejar Q-EVT-3 (conservar como custom, no rechazar).
  Mantén ambos archivos en sincronía (es la regla de interop documentada en sus cabeceras).
- **La implementación de validación/truncado de `events` DEBE seguir Q-EVT-3:** un evento con `type`
  no estándar y sin prefijo `x_` **NO se descarta por ese motivo** — se conserva como custom. (Lo único
  que descarta un evento individual es estar malformado: ver criterios abajo.)

---

## Alcance EXACTO de E1 (lo que SÍ se hace)

### 1. Modelo `ActivitySessionToken` (NUEVO, en `server/activities/`)
Token de sesión de actividad de un solo uso (ADR-SDK-02, D4). Campos:
- `token` — UUID v4, `unique`, indexado. Usa `crypto.randomUUID()` (Node nativo) o `uuid` si ya está en deps; no agregues dependencias sin necesidad.
- `assignmentId` (ref `Assignment`), `childId` (ref `Child`), `activityId` (ref `Activity`).
- `status` — enum `['unused','used']`, default `'unused'`.
- `usedAt` — `Date`, default `null`.
- `expiresAt` — `Date`, con **índice TTL** (`expireAfterSeconds: 0` sobre `expiresAt`) para expiración automática en Mongo.
- `timestamps: true` (createdAt/updatedAt).
- **TTL sugerido:** ~30 min desde emisión (cubre `runtime.maxDurationSeconds` de arranque + margen). Es una constante razonable; documenta el valor que elijas.

### 2. Endpoint de arranque (NUEVO) — emite el token y devuelve el payload 2.A
- Ruta sugerida: **`POST /api/activities/sessions`**, body `{ assignmentId }`.
- **Montaje:** crea un router nuevo (p. ej. `server/activities/sessionsRouter.js`) y móntalo en
  `server/index.js`. ⚠️ **Ojo con el orden de rutas:** `/api/activities/results` y `/api/activities`
  ya están montados (líneas 62-63). Monta el nuevo router en su propia ruta exacta
  `app.use('/api/activities/sessions', sessionsRouter)` **ANTES** de `app.use('/api/activities', activitiesRouter)`
  para evitar que el router genérico de actividades lo capture (mismo cuidado que ya se tuvo con `results`).
- **Protección:** `protect + requireActiveSubscription` (JWT del tutor/profesional).
- **Permisos:** carga el `Assignment` y su `Child`; aplica el patrón canónico de permisos
  (tutor dueño del niño O profesional en `child.accessGrants`; admin permitido). Si no, 403.
- **Respuesta = payload de arranque 2.A consolidado (v0.2)**, leyendo de Activity/Assignment:
  ```jsonc
  {
    "contractVersion": "1.0",            // de CONTRACT_VERSION en /shared
    "sessionToken": "<uuid recién emitido>",
    "assignmentId": "<opaco>",
    "activityId": "<opaco>",
    "config": {
      "level": <Activity.difficultyLevel>,   // nivel ASIGNADO (de la actividad), NO del niño
      "passThreshold": <Activity.passThreshold>,  // SOLO para feedback lúdico; la evaluación autoritativa es server-side
      "params": { },                      // params de la actividad (vacío si no hay; NO derivar del perfil del niño)
      "locale": "es-CL",
      "audioInstructionsUrl": null,        // opcional; si no hay fuente hoy, null
      "tutorInstructionsText": null,       // opcional
      "displayName": null                  // opcional; por defecto null. NUNCA derivado del nombre/alias real del niño
    },
    "runtime": {
      "offlineAllowed": true,
      "resultsEndpoint": "<url de /api/activities/results>",  // la fija la plataforma
      "maxDurationSeconds": 900
    }
  }
  ```
- **MINIMIZACIÓN ESTRICTA (criterio de auditoría de seguridad E1):** el payload **NO** serializa
  **ningún atributo del menor** — sin nombre real, alias de perfil, `ageBand`/edad, sexo, RUT, fecha
  de nacimiento, ni dato clínico. Solo identificadores **opacos** (`sessionToken`/`assignmentId`/`activityId`)
  + `config` de la **actividad**. La adaptación por edad/dificultad viene del nivel/pack que el tutor
  eligió al asignar (`config.level`/`config.params`), no del perfil del niño (2.A, justificación legal).
  Si algún campo de `config` no tiene fuente clara en el modelo actual (p. ej. `params`,
  `audioInstructionsUrl`, `displayName`), **déjalo en su default vacío/null** — NO inventes una fuente
  ni la derives del niño.

### 3. Refactor de `POST /api/activities/results` (`resultsRouter.js`)
- **Quitar** `protect + requireActiveSubscription` como guardia de credencial del juego (el juego ya
  no envía JWT del tutor). El endpoint pasa a autenticar **por `sessionToken`**.
- **Validar el `sessionToken` del body:**
  - existe en `ActivitySessionToken`,
  - no expirado (`expiresAt > now`),
  - `assignmentId`/`childId`/`activityId` del body coinciden con los del token.
  - Token inexistente/expirado/ids no coincidentes → rechazar con código adecuado
    (401 inválido, 410 expirado; usa tu criterio y sé consistente).
- **Idempotencia migrada al token (atómica, sin carrera):**
  - Marca el token `used` + `usedAt` con una operación **atómica condicionada a `status:'unused'`**
    (p. ej. `findOneAndUpdate({ token, status:'unused' }, { status:'used', usedAt })`). Si esa
    operación NO encuentra documento porque ya estaba `used` → es un **reenvío**: responde
    **idempotente** (200 con el resultado ya registrado, **no** crees otro `ActivityResult`, **no** 409).
  - Esto reemplaza la guardia `assignment.status === 'completed'` como clave de idempotencia.
- **Score derivado server-side (ADR-SDK-06):**
  - Lee `rawScore` y `maxScore` del body.
  - **Rechaza** (400) si `maxScore` falta o `<= 0`, o si `rawScore < 0`.
  - Deriva `scorePercent = clamp(round(rawScore / maxScore * 100), 0, 100)`.
  - Si `rawScore > maxScore`: acota `scorePercent` a 100 y **registra anomalía** en logs (no rompe el POST).
  - Lee `passThreshold` de la **Activity** (vía `assignment.activityId`); deriva
    `passed = scorePercent >= passThreshold`.
  - **IGNORA** cualquier `scorePercent`/`passed` que mande el juego (entrada no confiable): no los leas del body.
  - Persiste `rawScore`, `maxScore`, `scorePercent` (derivado), `passed` (derivado).
- **Validación/truncado de `events` (Q-EVT-1, Q-EVT-2, Q-EVT-3 — entrada no confiable):**
  - `events` es **OPCIONAL** (Q-EVT-1): puede faltar o venir `[]`; su ausencia NO invalida el resultado.
  - **Filtrar eventos malformados individualmente** (no tumbar el POST): un evento es válido si tiene
    `type` (string no vacío) y `timestamp` (parseable como fecha ISO 8601). Los inválidos se descartan
    en silencio (solo por estar malformados, NO por tipo desconocido).
  - **Q-EVT-3:** un `type` fuera de `EVENT_TYPES` y sin prefijo `x_` **NO se descarta** — se conserva
    como custom. No transformes ni auto-prefijes el `type`. (El warning en dev es del SDK, no del backend.)
  - **Cap defensivo de ingesta (Q-EVT-2):** tras filtrar, si la cantidad supera `EVENTS_INGEST_CAP`
    (de `/shared`, hoy `200`, provisional), **trunca** al cap y **registra una anomalía** en logs para
    auditoría del bundle. El truncado NO hace perder el resultado primario (score/passed/duration).
  - `payload` de cada evento NO se valida en contenido (JSON libre, se almacena tal cual como `metadata`).
  - Persiste los `events` ya filtrados/truncados.
- **Efecto de assignment:** mantén `assignment.status = 'completed'` + `completedAt` como **efecto**
  del registro, pero **no** como clave de idempotencia (eso ya lo da el token).

### 4. Endurecimiento de ingesta de `/results` (frontera con código externo)
- **Rate limit** específico para `POST /results` (limiter local con `express-rate-limit`, patrón de
  `authLimiter` en `index.js`). Elige una ventana/máximo razonable y documéntalo.
- **Tamaño máximo de payload** para este endpoint (p. ej. `express.json({ limit })` aplicado al router
  o un middleware de límite). Acota también el tamaño de `metadata` y del `payload` por evento
  (sugerencia ~2 KB serializados por evento). Todo tratado como **entrada no confiable** (spec §6.5).

---

## Lo que NO se hace en E1 (frontera con E0 / E2 / E3 — NO inflar)

- **NO** re-tocar el **esquema** de `ActivityResult` ni de `Activity` (E0 ya los dejó listos). E1 solo
  cambia la **lógica del router** y agrega el modelo `ActivitySessionToken` + el endpoint de arranque.
- **NO** construir el **SDK JS** (`getContext`/`reportEvent`/`submitResults`), ni el iframe/postMessage,
  ni la cola offline. **Eso es E2** (proyecto SDK, `didactifonis-frontend`).
- **NO** construir el **launcher del niño** que adjunta el token y hace el POST. En E1 el token viaja
  en el **body** del POST (puente temporal aceptable). El gobierno host↔juego del token es E2.
- **NO** implementar el **validador de ZIP/manifest** de publicación (E4).
- **NO** emitir `paused`/`resumed` del lado host (Q-EVT-4) — eso vive en el launcher (cliente, fuera de E1).
- **NO** agregar override de `passThreshold` en `Assignment` (el MVP no lo usa; plan §8.6 v0.6).
  El endpoint de arranque lee `passThreshold` de la **Activity**.
- **NO** derivar métrica alguna de `events` (no agregar, no promediar, no contar pistas). Se almacena
  tal cual. Derivar algo de `events` rozaría scoring clínico — **frontera SaMD** (CLAUDE.md §2, anti-alcance §5).
- **NO** introducir scoring clínico, clasificación de patología, umbrales diagnósticos, inferencia ni IA
  decisoria. `scorePercent`/`passed`/`passThreshold` son **Capa 1 educativa, NO SaMD**.
- **NO** serializar atributos del menor en el payload de arranque ni en ninguna respuesta nueva.

---

## Criterios de aceptación

**sessionToken + arranque**
- `POST /api/activities/sessions` con `{ assignmentId }` y JWT de tutor dueño (o profesional vinculado)
  emite un token `unused` con TTL y devuelve el payload de arranque 2.A.
- El payload de arranque **no filtra PII del menor** (solo ids opacos + `config` de la actividad).
- Sin permiso sobre el niño → 403. Assignment inexistente → 404.

**ingesta de resultados**
- `POST /results` con un `sessionToken` válido (`unused`, no expirado, ids coincidentes) registra el
  resultado y marca el token `used` (operación atómica).
- Reenviar el **mismo token** → respuesta idempotente (200, sin doble `ActivityResult`).
- Token inexistente/expirado/ids no coincidentes → rechazado con el código correcto.
- El endpoint de resultados **ya no depende del JWT del tutor**.

**score derivado**
- `scorePercent` y `passed` se **derivan server-side**; los valores que mande el juego se ignoran.
- Normalización correcta para escalas arbitrarias (ej. `rawScore:850 maxScore:1000 → scorePercent:85`).
- `rawScore > maxScore` → `scorePercent` acotado a 100 + anomalía en logs.
- `maxScore` ausente/`<=0` o `rawScore<0` → 400.
- `passed = scorePercent >= Activity.passThreshold`.

**events (Q-EVT-1..3)**
- `events` ausente o `[]` → resultado válido igualmente.
- Eventos malformados (sin `type` string o sin `timestamp` parseable) se descartan individualmente; el POST no falla.
- Un `type` desconocido sin `x_` **se conserva como custom** (NO se descarta, NO se rechaza).
- Más de `EVENTS_INGEST_CAP` eventos → truncado al cap + anomalía en logs; el resultado primario se conserva.

**arrastres E0**
- `resultsRouter.js` y `sessionsRouter.js` consumen `EVENTS_INGEST_CAP`/`EVENT_TYPES`/`CONTRACT_VERSION`
  desde `require('../../shared/index.cjs')` (el `.cjs` deja de estar inerte; sin literales duplicados).
- El comentario erróneo de `shared/index.js:24` y `shared/index.cjs:28` queda corregido a la política
  Q-EVT-3 (conservar custom, no rechazar), con ambos archivos en sincronía.

**build / smoke**
- El server arranca; los routers quedan montados en el orden correcto (sessions antes del router genérico).
- El cliente sigue compilando (el cambio en `shared/index.js` es solo de comentario).
- Reporta el resultado de la verificación (arranque server + build cliente).

---

## Entregable de vuelta al arquitecto

Resumen de:
- archivos creados/modificados (rutas absolutas),
- diseño del flujo del token (emisión → validación → marca atómica → idempotencia) y el TTL elegido,
- decisión de la ventana/máximo del rate limit y del límite de tamaño de payload,
- confirmación de los dos arrastres E0 (consumo del `.cjs`, corrección del comentario Q-EVT-3),
- estado de verificación (arranque server / build cliente),
- cualquier ambigüedad que acotaste conservadoramente o que requiera confirmación del arquitecto
  (en particular: si encuentras una fuente real para `params`/`audioInstructionsUrl`/`displayName` que
  no esté en los modelos actuales, NO la inventes — repórtalo como decisión a confirmar).
```
