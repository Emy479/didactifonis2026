# Brief B-2 — Validación cruzada: SDK real ↔ GameHost (E2E + auditoría de no-fuga)

**Fecha:** 2026-06-12
**Arquitecto:** didactifonis-architect
**Plan base:** `docs/plan-sdk-engine-juegos.md` (v0.8) · `docs/brief-e2-sdk-launcher.md` §B.4 punto 3
**Precedentes:** B-0 (`docs/qa-b0-promocion-contrato.md`), B-1 (`docs/brief-b1-esqueleto-sdk.md`,
cierre en brief E2 §B.5).

---

## 1. Objetivo

Cerrar el Frente B validando que el **SDK real** (`@didactifonis/sdk` v0.1.0, repo
`C:\didactifonis-engine`) funciona end-to-end contra el **GameHost real** de la plataforma
en dev, reemplazando el stub, y auditando la **no-fuga de credenciales/PII en el flujo
integrado** (no solo el código aislado, ya auditado en B-1).

Recorrido a validar: arranque de sesión (payload 2.A) → iframe carga bundle con SDK real →
`getContext` → `reportEvent`(s) → `submitResults` → POST del host a
`/api/activities/results` → resultado registrado en Mongo con score derivado server-side.

## 2. Arquitectura de la prueba (4 procesos en dev)

| Pieza | Origen | Qué hace |
| :-- | :-- | :-- |
| MongoDB | local | datos (seed `seed:smoke-e2`) |
| Server Express | `http://localhost:3001` | sessions + results (E1, intocable) |
| Cliente Vite | `http://localhost:5173` | app React con GameHost |
| Servidor estático engine | `http://127.0.0.1:8788` | sirve el bundle de prueba B-2 (cross-origin real) |

El bundle es **cross-origin** respecto al host (8788 vs 5173) y corre en iframe
`sandbox="allow-scripts allow-forms"` SIN `allow-same-origin` → `event.origin === "null"`
para los mensajes juego→host (defensa efectiva = `event.source`, protocolo §4.1); los
mensajes host→juego SÍ llevan el origen real del host, lo que permite ejercitar la
verificación §4.4 del SDK (`init({ hostOrigin })`).

## 3. Pasos y agentes

### Paso 1 — Bundle de prueba B-2 (repo `C:\didactifonis-engine`) — `didactifonis-frontend`

`examples/test-game-b2/index.html`: página auto-run que carga el **UMD real**
(`../../packages/sdk/dist/sdk.umd.js` por `<script>`) y, al cargar:

1. Lee `hostOrigin` de su propia query string (`?hostOrigin=...`) y llama
   `SDK.init({ hostOrigin, debug: true })` — ejercita la verificación de origen §4.4.
2. `getContext()` con reintento (hasta 3 intentos; el timeout del SDK es 8 s) — el host
   registra su listener al entrar en fase PLAYING, el reintento absorbe la carrera.
3. Sobre el contexto recibido ejecuta **aserciones de no-fuga** con marcadores
   machine-readable en consola y en pantalla (`[B2-ASSERT] PASS|FAIL: ...`):
   sin `sessionToken`/`jwt`/`token`/`authorization`; sin PII (heurística de claves como la
   del stub `client/dev-stubs/sdk-stub.html`); muestra el JSON recibido.
4. Secuencia automática de telemetría (SDK real): `activity_started`, 2×`attempt`,
   `item_answered`, `hint_used`, `x_b2_custom` (custom con prefijo), `evento_fuera_catalogo`
   (desconocido — debe viajar igual, Q-EVT-3), `reportEvent(null)` (descarte local),
   `activity_completed`.
5. `submitResults({ rawScore: 80, maxScore: 100, attemptCount: 2, durationSeconds: null,
   metadata: { b2SmokeTest: true, sdkVersion: '0.1.0' } })` y una **segunda llamada**
   inmediata que debe ser no-op (idempotencia del SDK).

NO es un juego (CLAUDE.md §3): es un arnés de validación del contrato, como el stub del
Frente A pero usando el SDK real.

`scripts/serve-static.cjs`: servidor estático Node **sin dependencias**, raíz = raíz del
repo engine, puerto 8788, `Cache-Control: no-store`, content-types html/js/map/json,
**denegar dotfiles y `.git/`** (no exponer metadatos del repo). Script npm raíz `serve:b2`.

### Paso 2 — Seed B-2 (este repo) — `didactifonis-backend`

Extender `server/scripts/seedSmokeE2.js` (idempotente, mismo patrón existente):

- Actividad `Smoke B-2 — SDK real (@didactifonis/sdk)` con
  `bundleUrl = process.env.B2_BUNDLE_URL ||
  'http://127.0.0.1:8788/examples/test-game-b2/index.html?hostOrigin=http%3A%2F%2Flocalhost%3A5173'`.
  Si la actividad existe con otro `bundleUrl`, actualizarlo (re-ejecutar el seed refresca).
- Assignment `pending` para el mismo niño demo. Imprimir línea machine-readable
  `B2_ASSIGNMENT_ID=<id>` para el arnés E2E.
- No tocar la actividad stub existente (sigue validando el fallback dev `bundleUrl: null`).

### Paso 3 — E2E automatizado — `didactifonis-qa`

**Decisión de tooling (arquitecto):** se incorpora **Playwright como devDependency del
cliente** (solo dev; browsers en caché de usuario) con arnés en `client/e2e/`. Justificación:
B-2 exige probar el flujo integrado real en browser; el arnés queda reutilizable para los
juegos-piloto (E3/E5) y la recalibración de `EVENTS_INGEST_CAP`. Reversible.

Flujo del arnés (`client/e2e/b2-smoke.mjs`):
1. Login API `POST /api/auth/login` (demo-tutor) → JWT.
2. `addInitScript` para sembrar `localStorage.auth_token` antes de cargar la app.
3. `goto http://localhost:5173/nino/game/<B2_ASSIGNMENT_ID>`; capturar consola de página
   e iframe; esperar la pantalla de éxito («¡Lo hiciste genial!»).
4. Verificar los `[B2-ASSERT] PASS` del bundle y la ausencia de FAIL.
5. **Contraprueba Mongo** (patrón Frente A): `ActivityResult` del assignment con
   `rawScore 80 / maxScore 100 / scorePercent 80 / passed true` (derivado server-side,
   threshold 60), `events` contiene los tipos emitidos por el SDK real **incluyendo**
   `x_b2_custom` y `evento_fuera_catalogo` (conservado, Q-EVT-3) y **sin** el descartado
   `null`; `metadata.b2SmokeTest === true`; token de sesión en estado `used`.

Si el flujo falla 2 veces seguidas → detener, reportar estado e intentos (guardrail §5);
fallback: smoke manual de Emiliano + contraprueba Mongo.

### Paso 4 — Auditoría de no-fuga en flujo integrado — `didactifonis-security`

Con la evidencia del E2E (capturas de consola, JSON del contexto recibido por el bundle,
documento `ActivityResult` persistido) + código fuente, auditar:

1. **Qué cruza el postMessage** host→juego: `contextResponse` real sin `sessionToken`,
   sin JWT, sin PII (incl. omisión de `displayName`).
2. **Qué llega al iframe**: solo el bundle (8788) + mensajes; sandbox sin
   `allow-same-origin` (sin storage/cookies/DOM del host); el servidor estático no expone
   dotfiles ni `.git`.
3. **Qué persiste**: `ActivityResult` sin token ni PII más allá de `childId` derivado
   server-side; nada del flujo en `localStorage`/URL/logs del browser (revisar capturas
   con `debug: true` activo en el SDK).
4. Riesgo residual `targetOrigin '*'` en sandbox (§4.1): confirmar que sigue acotado a
   payloads sin secretos.

Solo reporta (APTO / APTO CON OBSERVACIONES / NO APTO); las remediaciones se delegan.

## 4. Fuera de alcance

- No se construye ningún juego real (E3/E5).
- No se tocan `sessionsRouter.js` / `resultsRouter.js` / `progress.js` / GameHost
  (salvo hallazgo que lo exija — se eleva al arquitecto).
- No se publica el SDK en registry ni se recalibra `EVENTS_INGEST_CAP` (solo se mide).

## 5. Criterios de aceptación de B-2

- [x] E2E verde: SDK real ↔ GameHost ↔ backend ↔ Mongo, con score derivado server-side.
- [x] Q-EVT-3 verificado en el flujo real (custom y desconocido conservados; inválido descartado).
- [x] Idempotencia de `submitResults` verificada en el flujo real (no-op del SDK + un solo resultado en Mongo).
- [x] Auditoría security del flujo integrado: APTO CON OBSERVACIONES (H-4/H-6 remediados `600904e`; H-2/H-5 aceptados con fundamento; H-1/H-3/H-7 deuda de hosting de producción).
- [x] Cierre documentado en brief E2 (§B.6) y plan; commits pequeños en ambos repos.

## 6. Cierre (2026-06-12) — B-2 COMPLETADA

Resultados detallados en `docs/brief-e2-sdk-launcher.md` §B.6 (registro canónico del cierre).
Resumen: arnés Playwright VERDE (3 corridas: QA inicial, verificación del arquitecto,
post-remediación), contraprueba Mongo VERDE 21/21, auditoría security del flujo integrado
APTO CON OBSERVACIONES. Commits: plataforma `65ff9cf` / `8019878` / `600904e`; engine `82d6cb5`.
Decisión de seguimiento: `allow-same-origin` nunca entra al sandbox sin nueva revisión de
security. Dato para Q-EVT-2: 8 eventos por sesión sintética; recalibración real en E3/E5.
