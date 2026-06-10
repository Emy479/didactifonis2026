# Protocolo postMessage host↔juego — E2 SDK Launcher

**Versión:** 1.1  
**Fecha:** 2026-06-09 (actualizado — remediación auditoría de seguridad)  
**Fuente única (DEP-2):** Este documento es la referencia que el Frente B (SDK real) debe  
espejear exactamente cuando se desbloquee ADR-SDK-05.  
**Implementación host:** `client/src/pages/nino/GameHost.jsx`  
**Stub de validación:** `client/dev-stubs/sdk-stub.html` (solo desarrollo; no en dist/)

---

## 1. Modelo de confianza

```
┌─────────────────────────────────┐      postMessage       ┌──────────────────────────┐
│  HOST (GameHost.jsx)            │ ◄───────────────────── │  JUEGO / SDK (iframe)    │
│  - Código propio, confiable     │                         │  - Código externo        │
│  - Custodia sessionToken        │ ──────────────────────► │  - Sandboxed             │
│  - Custodia JWT del tutor       │      postMessage        │  - SIN credenciales      │
│  - Hace POST a la API           │                         │  - SIN acceso a red      │
└─────────────────────────────────┘                         └──────────────────────────┘
```

**Regla de oro:** el juego/SDK nunca ve `sessionToken` ni JWT. El host es el único  
que hace fetch a la API. El juego solo habla por postMessage.

---

## 2. Mensajes del juego → host

### 2.1 `getContext`

Solicita el contexto de la sesión (config + runtime). Se debe llamar al inicio.

```js
window.parent.postMessage({ type: 'getContext' }, HOST_ORIGIN);
```

**Campos:** ninguno (solo `type`).  
**El host responde** con `contextResponse` (ver §3.1).

---

### 2.2 `reportEvent`

Envía un evento de telemetría al buffer del host.

```js
window.parent.postMessage(
  {
    type: 'reportEvent',
    payload: {
      eventType:    string,   // debe ser un valor de EVENT_TYPES o prefijo "x_" para custom
      eventPayload: object,   // datos adicionales del evento (puede ser {})
    },
  },
  HOST_ORIGIN
);
```

**Tipos de evento estándar** (de `shared/index.js → EVENT_TYPES`):

| Clave | Valor string |
|:---|:---|
| `ACTIVITY_STARTED` | `activity_started` |
| `ACTIVITY_COMPLETED` | `activity_completed` |
| `PAUSED` | `paused` |
| `RESUMED` | `resumed` |
| `ABANDONED` | `abandoned` |
| `ATTEMPT` | `attempt` |
| `ITEM_ANSWERED` | `item_answered` |
| `HINT_USED` | `hint_used` |
| `LEVEL_ADVANCED` | `level_advanced` |

Tipos fuera de catálogo: el host emite un warning en dev pero los **conserva como custom** (Q-EVT-3).  
No hay respuesta del host a `reportEvent`.

---

### 2.3 `submitResults`

Solicita al host que envíe los resultados a la API. Solo se debe llamar una vez.

```js
window.parent.postMessage(
  {
    type: 'submitResults',
    payload: {
      rawScore:        number,   // puntuación cruda en la escala del juego (>= 0)
      maxScore:        number,   // máximo de la escala interna del juego (> 0)
      attemptCount:    number,   // intentos dentro de la sesión (default: 1)
      durationSeconds: number | null,  // duración total; si null, el host calcula
      metadata:        object,   // datos libres del juego (opcional, max 4 KB JSON)
    },
  },
  HOST_ORIGIN
);
```

> **Minimización PII (Ley 21.719 / ALTO-1):** `childId` ya **no se incluye** en este
> payload. El backend lo deriva del `sessionToken` en el servidor. El juego/SDK no
> conoce ni envía el identificador del niño. Si el body llega con `childId`, el backend
> lo ignora completamente. El campo fue eliminado del contrato en la remediación de
> auditoría del 2026-06-09.

El host inyecta `sessionToken`, `assignmentId`, `activityId`, `events` (buffer) y  
`schemaVersion` antes de hacer el POST. El juego no provee ni ve el token.

No hay respuesta síncrona a `submitResults`. El host gestiona 201/200/401/410  
internamente y transiciona su UI.

---

## 3. Mensajes del host → juego

### 3.1 `contextResponse`

Respuesta a `getContext`. Contiene el subconjunto seguro del payload 2.A.

```js
// Recibido en el juego/SDK:
{
  type: 'contextResponse',
  payload: {
    config: {
      level:                number,        // nivel de dificultad
      passThreshold:        number,        // porcentaje mínimo para aprobar
      locale:               string,        // ej. "es-CL"
      params:               object,        // parámetros extra de la actividad
      audioInstructionsUrl: string | null,
      tutorInstructionsText:string | null,
      // displayName: OMITIDO — minimización PII (R3)
    },
    runtime: {
      maxDurationSeconds: number,          // tiempo máximo de la sesión
      contractVersion:    string,          // ej. "1.0"
      // sessionToken: NUNCA — el juego no recibe credenciales
      // resultsEndpoint: NUNCA — el host hace el POST
    },
  },
}
```

**GARANTÍA DE SEGURIDAD:** `contextResponse` nunca contiene `sessionToken`, JWT,  
ni datos del menor (nombre, avatar, edad, RUT, etc.).

---

## 4. Validación de origen

### 4.1 Comportamiento del sandbox

Un iframe con `sandbox="allow-scripts"` **sin** `allow-same-origin` emite mensajes  
con `event.origin === "null"` (el string "null") independientemente de si el bundle  
es same-origin o cross-origin. Esto cambia cómo se valida el origen.

### 4.2 Host (receptor de mensajes del juego)

El host valida **quién envió el mensaje** (fuente) en lugar del origen string:

```js
// Paso 1 siempre: verificar que el mensaje viene del iframe del juego
const isFromOurIframe = iframeRef.current &&
  event.source === iframeRef.current.contentWindow;
if (!isFromOurIframe) return; // descartar

// Paso 2 (solo para bundles cross-origin con origen no-null):
// si event.origin no es "null" (iframe no sandboxed o allow-same-origin activo),
// verificar también el origen string.
const isSandboxed = event.origin === 'null';
if (!isSandboxed && event.origin !== EXPECTED_BUNDLE_ORIGIN) return; // descartar
```

### 4.3 Respuestas del host al juego

Cuando el iframe está sandboxed (origin = "null"), el `targetOrigin` de `postMessage`  
no puede ser "null". El host usa `"*"` como targetOrigin solo para el mensaje  
`contextResponse`. Esto es seguro porque: (a) el payload no contiene credenciales,  
(b) la verificación de fuente (`event.source`) impide que mensajes de otras ventanas  
activen el flujo.

### 4.4 Juego/SDK (receptor de mensajes del host)

```js
// El host llega con su origen real (ej. https://app.didactifonis.cl)
// Verificar que el mensaje viene del padre (window.parent):
if (event.source !== window.parent) return; // descartar
// Opcionalmente verificar event.origin contra HOST_ORIGIN conocido.
```

`HOST_ORIGIN` en el SDK real se configura al incluir la librería (parámetro de inicialización)  
o se recibe en un mensaje `init` del host (ver §6).

---

## 5. Ciclo de vida automático (emitido por el HOST)

El host emite los siguientes eventos al buffer sin intervención del juego:

| Evento | Cuándo |
|:---|:---|
| `paused` | `document.visibilitychange` → oculto |
| `resumed` | `document.visibilitychange` → visible |
| `abandoned` | El niño navega fuera sin haber llamado a `submitResults` |

El juego NO debe emitir `paused`/`resumed` por visibilidad del documento — el host  
lo gestiona para no duplicar eventos.

---

## 6. Notas para el Frente B (SDK real)

Cuando se desbloquee ADR-SDK-05:

1. El SDK importa este protocolo tal como está. No redefine los tipos de mensaje.
2. `HOST_ORIGIN` se puede resolver en el momento de importar el SDK (antes del primer  
   mensaje), usando `document.referrer` o un handshake `init` acordado con el host.
3. El SDK puede exponer un método `isReady()` que resuelve tras recibir `contextResponse`.
4. Si se añade un mensaje `init` host→juego en el futuro, el host debe enviarlo tras  
   cargar el iframe (evento `load`), y el SDK debe esperar ese mensaje antes de hacer  
   `getContext`. Coordinar con el arquitecto antes de añadir esta fase.

---

## 7. Resumen de gaps pendientes a elevar al arquitecto (DEP-1)

- **`childId` en `submitResults`:** RESUELTO (2026-06-09). El backend ahora deriva  
  `childId` del `sessionToken` en el servidor. El campo fue eliminado del payload del  
  juego/host. Ver nota de minimización PII en §2.3.
- **`bundleUrl` (DEP-1):** hasta que `Activity` tenga `bundleUrl` y se propague en  
  `runtime.bundleUrl` del payload 2.A, el host usa el stub local. El stub se activa  
  automáticamente cuando `runtime.bundleUrl` es `undefined`.
