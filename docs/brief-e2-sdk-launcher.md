# Brief E2 — SDK JS de juegos + Launcher del niño

**Fecha:** 2026-06-09 (actualizado 2026-06-11)
**Arquitecto:** didactifonis-architect
**Estado:** E0 y E1 (backend) ACEPTADAS e integradas en `master`. **Frente A (launcher)
IMPLEMENTADO y VALIDADO por QA (2026-06-11, ver `docs/qa-e2-frente-a.md` — veredicto VERDE).
DEP-1 RESUELTA. Frente B (SDK) DESBLOQUEADO (2026-06-11): las 4 decisiones operativas de
ADR-SDK-05 fueron cerradas por Emiliano (ver §B.2). Arranque en curso con plan B-0/B-1/B-2.**
**Plan base:** `docs/plan-sdk-engine-juegos.md` (v0.8). Contrato 2.A + 2.B CERRADO.

---

## 0. Contexto y problema que resuelve E2

Hoy el backend ya emite sesiones y acepta resultados, pero **ningún cliente las consume**.
Estado verificado del repo:

- `client/src/pages/nino/DashboardNino.jsx` (línea ~126): el botón "¡Jugar ahora!" tiene
  `onClick={() => {/* bundleUrl placeholder — no hace nada aún */}}`. No hay lanzamiento de juego.
- `POST /api/activities/sessions` (`server/activities/sessionsRouter.js`) emite el `sessionToken`
  de un solo uso + payload de arranque 2.A. **Sin consumidor.**
- `POST /api/activities/results` (`server/activities/resultsRouter.js`) ingiere resultados
  autenticando por `sessionToken` en el **body** (puente temporal). **Sin consumidor.**
- El niño hoy navega con el **JWT del tutor** en `localStorage` (`auth_token`). Ese JWT
  **nunca debe cruzar al juego** (ADR-SDK-03).

E2 cierra ese hueco con DOS piezas que se conectan por iframe + postMessage:

1. **Launcher del niño** — vive en ESTE repo (`/client`). Custodia el `sessionToken`, hace el
   POST de arranque, hospeda el juego en un iframe, recibe los eventos/resultados del SDK por
   postMessage, y hace el POST a `/api/activities/results`. **El juego nunca ve el token ni el JWT.**
2. **SDK JS** — la librería que el juego externo importa (`getContext` / `reportEvent` /
   `submitResults`). Corre DENTRO del iframe del juego. **No tiene credenciales**: habla con el
   launcher por postMessage. **Vive en el repo Engine (`didactifonis-engine`) — decisión cerrada
   2026-06-11, ver §B.2.**

> Frontera de confianza E2 (innegociable): el **host/launcher** es código propio y confiable y
> es el ÚNICO que toca `sessionToken`, JWT y la red de la plataforma. El **juego + SDK** son
> código externo NO confiable que corre sandboxeado en el iframe y solo se comunica por mensajes.

---

## FRENTE A — Launcher del niño (ESTE repo, `/client`)

**Agente responsable:** `didactifonis-frontend`. **Revisión de seguridad:** `didactifonis-security`.

### A.1 Objetivo

Que el niño pueda, desde `DashboardNino`, pulsar una actividad asignada y jugarla embebida,
con los resultados registrándose en la plataforma al terminar — sin que el juego externo
acceda jamás a credenciales ni a datos del menor.

### A.2 Alcance (qué SÍ entra)

1. **Arranque de sesión.** Al pulsar una actividad (hoy el `onClick` placeholder en
   `DashboardNino.jsx`), el launcher hace `POST /api/activities/sessions` con `{ assignmentId }`,
   usando el JWT del tutor (header `Authorization`, igual que el resto del cliente). Recibe el
   payload 2.A: `contractVersion`, `sessionToken`, `assignmentId`, `activityId`, `config`, `runtime`.
2. **Vista de juego (host).** Componente nuevo de página completa (p. ej. `GameHost.jsx`) que:
   - Renderiza un `<iframe>` que carga el bundle del juego.
     - **Dependencia (RESUELTA 2026-06-11):** `bundleUrl` existe en `Activity` y se propaga en
       `runtime` del payload 2.A (commit c4050cc). Ver §A.6 (Dependencias).
   - Aplica `sandbox` al iframe (mínimo `allow-scripts`; **sin** `allow-same-origin` si el bundle
     va en otro origen — ver criterio de seguridad A.4).
   - Mantiene el `sessionToken` y el payload 2.A **en memoria del host** (estado de React), nunca
     los pasa al iframe ni los escribe en `localStorage`/URL.
3. **Canal postMessage (lado host).** Implementar el protocolo host↔juego que el SDK espejará:
   - `getContext` → el host responde con un **subconjunto SEGURO** del payload 2.A: `config` +
     `runtime` (level, passThreshold, locale, params, maxDurationSeconds, contractVersion).
     **NUNCA** envía `sessionToken` ni el JWT al iframe.
   - `reportEvent(type, payload)` → el host bufferiza el evento (valida `type` contra `EVENT_TYPES`
     de `/shared`, warning en dev si es desconocido — se conserva como custom, Q-EVT-3).
   - `submitResults(result)` → el host toma el buffer de eventos + el `result` del juego, arma el
     payload 2.B, **inyecta el `sessionToken` desde su memoria**, y hace `POST /api/activities/results`.
   - El host emite además el ciclo de vida automático `paused`/`resumed` (Q-EVT-4) cuando el
     iframe pierde/recupera foco o visibilidad, y `abandoned` si el niño sale sin completar.
4. **Validación de origen.** El host valida `event.origin` de cada `message` contra el origen
   esperado del bundle. Descarta mensajes de origen no esperado. (Criterio de seguridad A.4.)
5. **Cierre de ciclo.** Tras `submitResults` exitoso (201) o idempotente (200), el host muestra
   feedback lúdico (gamificación — vive AQUÍ, en el flujo del niño) y vuelve al `DashboardNino`,
   refrescando la lista de asignaciones. Manejo de errores: 401/410 (token usado/expirado) →
   mensaje amable + volver; reintento controlado del POST de results sin re-emitir token salvo expiración.
6. **Recalibración del cap de eventos (Q-EVT-2).** Instrumentar el buffer para medir cuántos
   eventos genera una sesión real de los juegos-piloto, y reportar el dato al arquitecto para
   recalibrar `EVENTS_INGEST_CAP` (hoy 200 provisional en `/shared`). NO cambiar la constante en
   E2 sin aprobación; solo medir y reportar.

### A.3 Fuera de alcance (qué NO entra)

- No se construye ningún juego (los juegos son externos — CLAUDE.md §3).
- No se toca `progress.js` ni la derivación de score (es server-side, E1, intocable).
- No se publica el SDK como paquete (eso es el Frente B).
- No se modifican `sessionsRouter.js` ni `resultsRouter.js` salvo que la revisión de seguridad
  identifique un gap del contrato; en ese caso se eleva al arquitecto, no se parchea desde el cliente.
- Sin neones/glows (convenciones §7). La gamificación del host del niño usa los tokens de
  `design-system.md`; los paneles de tutor/pro/admin siguen siendo limpios y métricos.

### A.4 Criterios de aceptación

**Funcionales**
- [ ] Desde `DashboardNino`, pulsar una actividad asignada abre el `GameHost` y arranca la sesión.
- [ ] El host obtiene el payload 2.A de `POST /api/activities/sessions` y carga el iframe del juego.
- [ ] El protocolo postMessage responde `getContext` con `config`+`runtime` (sin token, sin JWT).
- [ ] `reportEvent` bufferiza eventos validando `type` contra `EVENT_TYPES` de `/shared`.
- [ ] `submitResults` hace `POST /api/activities/results` con el `sessionToken` inyectado por el host,
      y la respuesta 201/200 cierra el ciclo correctamente.
- [ ] El host emite `paused`/`resumed`/`abandoned` del ciclo de vida (Q-EVT-4).
- [ ] Errores 401/410/red se manejan con mensajes amables y sin loops.

**Seguridad (revisión obligatoria de `didactifonis-security` antes de integrar)**
- [ ] **No fuga de credenciales:** ni el `sessionToken` ni el JWT del tutor cruzan al iframe.
      Verificable: el subconjunto enviado en `getContext` no contiene ninguno de los dos.
- [ ] **No fuga de PII del menor:** el host NUNCA pasa al juego nombre, alias, avatar, edad, sexo,
      RUT ni dato clínico del niño. El payload 2.A ya viene sin PII (E1); el host no debe re-añadirla
      desde `ChildContext` (que SÍ tiene `activeChild.name`, `avatarId`). Verificable: el mensaje
      `getContext` se deriva SOLO del payload 2.A, jamás de `activeChild`.
- [ ] **Aislamiento del iframe:** `sandbox` aplicado; sin `allow-same-origin` si el bundle es de
      otro origen; `event.origin` validado en cada mensaje entrante.
- [ ] El `sessionToken` no se persiste en `localStorage`, `sessionStorage`, URL ni logs.

### A.5 Riesgos

- **R1 — Falta `bundleUrl`.** Sin una URL de bundle no se puede cargar el iframe. Es una dependencia
  dura (§A.6). Mitigación para no bloquear: el frente A puede construirse contra un **bundle stub
  local** (un HTML mínimo que importe un SDK stub) para validar el protocolo end-to-end, dejando la
  integración del bundle real como seguimiento.
- **R2 — Origen del bundle.** El modelo de aislamiento (sandbox, validación de origen) depende de si
  el bundle se sirve same-origin o cross-origin. Lo decide ADR-SDK-05 / dónde se alojan los bundles.
  Diseñar el host asumiendo **cross-origin** (más estricto) para no rehacerlo.
- **R3 — Re-introducción de PII.** `ChildContext` tiene `activeChild.name`/`avatarId` a mano; es fácil
  pasarlos "para personalizar el juego". Prohibido (marco-legal, minimización). El criterio de
  seguridad A.4 lo bloquea explícitamente.
- **R4 — Doble envío / token usado.** Recargas o doble-clic. El backend ya es idempotente por token
  (E1) y reutiliza token unused vigente; el host debe evitar re-emitir innecesariamente y manejar
  el 200 idempotente sin error.

### A.6 Dependencias

- **DEP-1 — RESUELTA (2026-06-11).** `bundleUrl` se añadió a `Activity` y se propaga en
  `runtime.bundleUrl` del payload 2.A (`activity.bundleUrl ?? null` — commit c4050cc, backend).
  El GameHost resuelve el bundle en tres ramas: bundleUrl del backend → usar siempre; null en
  dev → stub local `/__dev-stubs/`; null en prod → fase ERROR sin montar iframe (commit c5d48b2,
  frontend). Validado end-to-end cross-origin por QA: `docs/qa-e2-frente-a.md`.
- **DEP-2 (blanda): contrato del protocolo postMessage.** El frente A define el protocolo host↔juego;
  el frente B (SDK) debe espejarlo exactamente. Documentar el protocolo en este repo (en `/shared` o
  `/docs`) para que sea fuente única cuando se desbloquee el SDK.
- **DEP-3:** `/shared/index.js` (ESM, lo consume el cliente Vite) ya exporta `EVENT_TYPES`,
  `CONTRACT_VERSION`, `EVENTS_INGEST_CAP`. El host los importa de ahí (no duplicar literales).

---

## FRENTE B — SDK JS (repo `didactifonis-engine`) — **DESBLOQUEADO (2026-06-11)**

**Estado:** DESBLOQUEADO. La decisión de fondo de ADR-SDK-05 estaba resuelta desde 2026-05-31
(repo separado + contrato como paquete) y su refinamiento operativo desde 2026-06-09 (ver
`docs/plan-sdk-engine-juegos.md`, refinamiento de ADR-SDK-05). El 2026-06-11 Emiliano cerró las
4 decisiones operativas restantes (§B.2). Arranque en curso según plan B-0/B-1/B-2 (§B.4).

### B.1 Objetivo

Librería JS que el juego externo importa y que expone tres llamadas sobre iframe+postMessage:
- `getContext()` → devuelve `config`+`runtime` (lo que el host le entrega; sin credenciales).
- `reportEvent(type, payload)` → emite telemetría Capa 1 (validada contra `EVENT_TYPES`).
- `submitResults(result)` → vuelca el buffer de eventos + resultado al host, que hace el POST.

El SDK **nunca** ve `sessionToken` ni JWT (ADR-SDK-03). Solo habla con el host por postMessage,
espejando el protocolo definido en el Frente A (DEP-2).

### B.2 Decisiones operativas CERRADAS (Emiliano, 2026-06-11)

Las 4 cuestiones que mantenían el Frente B en espera quedaron resueltas, todas con la
recomendación del arquitecto:

- **(a) Hosting:** repos **privados en GitHub**, misma cuenta del proyecto. Nombres:
  `didactifonis-contract` y `didactifonis-engine`.
- **(b) npm / consumo del contrato:** paquete con scope **`@didactifonis/contract`**, **SIN
  publicar en ningún registry todavía**. Se consume por **link/workspace local** mientras el
  contrato se mueve; el registry se decide al estabilizar y pinear ("link ahora, pin después",
  conforme al refinamiento de ADR-SDK-05).
- **(c) Dónde vive el SDK:** **dentro del repo Engine** (`didactifonis-engine`), como una sola
  pieza: el SDK es el runtime-bridge del Engine, no un tercer repo.
- **(d) Checkouts locales:** hermanos del repo actual — `C:\didactifonis-contract` y
  `C:\didactifonis-engine` junto a `C:\Didactifonis2026`. El repo de la plataforma NO se mueve.

### B.3 Criterios de aceptación

- [ ] El SDK no contiene ninguna credencial ni hace fetch a la plataforma directamente.
- [ ] `getContext`/`reportEvent`/`submitResults` funcionan sobre el protocolo postMessage del Frente A.
- [ ] `reportEvent` valida `type` contra `EVENT_TYPES` del contrato (warning en dev, conserva custom).
- [ ] El contrato vive como fuente única en `@didactifonis/contract` (no duplicado entre repos).

### B.4 Plan de arranque del Frente B (acordado 2026-06-11)

1. **B-0 — Promoción del contrato** (`didactifonis-backend`, revisión `didactifonis-qa`):
   crear `didactifonis-contract` con el paquete `@didactifonis/contract` (fuente ÚNICO +
   `exports` map ESM/CJS — salda la deuda de los dos archivos espejo sincronizados a mano);
   migrar allí el protocolo canónico `docs/postmessage-protocol.md` (puntero en la plataforma);
   la plataforma (server + client) pasa a consumir `@didactifonis/contract` vía link local.
2. **B-1 — Esqueleto del SDK** (`didactifonis-frontend`): repo `didactifonis-engine` con el SDK
   (`getContext`/`reportEvent`/`submitResults`) espejando `postmessage-protocol.md`.
   **No arranca hasta que Emiliano complete el smoke manual del flujo niño→jugar.**
3. **B-2 — Validación cruzada** (`didactifonis-security` + `didactifonis-qa`): no-fuga de
   credenciales/PII en el SDK y prueba end-to-end SDK real ↔ GameHost.

---

## Resumen de decisiones (histórico)

1. **ADR-SDK-05 (dónde vive el SDK):** ~~repo separado vs este repo; cómo se publica; cómo
   consume `/shared`~~ — **CERRADA 2026-06-11** (las 4 decisiones operativas a–d en §B.2).
2. **`bundleUrl` (DEP-1):** ~~¿se añade a `Activity` + payload 2.A?~~ **RESUELTA 2026-06-11**
   (commits c4050cc + c5d48b2; validación QA en `docs/qa-e2-frente-a.md`).

## Secuenciación (estado 2026-06-11)

1. ~~Frente A contra un bundle/SDK stub local~~ — **HECHO** (QA verde, `docs/qa-e2-frente-a.md`).
2. ~~Elevar a Emiliano las 2 decisiones pendientes~~ — **HECHO** (ambas cerradas 2026-06-11).
3. ~~Resuelto `bundleUrl` → backend lo añade a `Activity`/2.A~~ — **HECHO** (c4050cc + c5d48b2).
4. Frente B según plan B-0/B-1/B-2 (§B.4). **B-0 COMPLETADA (2026-06-11, QA VERDE —
   `docs/qa-b0-promocion-contrato.md`; commit plataforma 681490f).** Pendiente de Emiliano:
   (i) smoke manual del flujo niño→jugar en dev (requisito para arrancar B-1), (ii) remote
   privado de GitHub para `didactifonis-contract` (`gh` CLI no instalada en la máquina).
