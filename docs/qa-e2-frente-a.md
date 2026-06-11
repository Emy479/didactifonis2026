# QA E2 Frente A — Registro completo: Pasadas 1 y 2

**Fecha:** 2026-06-11
**Alcance:** Pasada 1 — validacion runtime backend + servido cross-origin del stub
**Alcance:** Pasada 2 — inspeccion frontend (GameHost, vite.config, sdk-stub)
**Rama:** feat/e2-launcher-frente-a

Evidencia corroborada por contraprueba directa en MongoDB por el arquitecto (2026-06-11).

---

## Entorno

| Componente | Valor |
|---|---|
| API server | http://localhost:3001 (Express, ya corriendo) |
| Servidor estatico stub | http://localhost:8788 (npx serve, levantado en esta pasada) |
| Base de datos | mongodb://localhost:27017/didactifonis |
| Node.js | v24.16.0 |
| Fecha ejecucion | 2026-06-11 |

---

## Pasada 1 — Validacion runtime backend

### Datos de prueba creados (persisten en Mongo)

| Entidad | ID |
|---|---|
| User (tutor) qa-e2@test.local | 6a2b2a5cc8c5bd600c0dd7e9 |
| Child NinoQA-E2 | 6a2b2a5cc8c5bd600c0dd7f3 |
| Activity QA-Activity-E2 | 6a2b2a5cc8c5bd600c0dd7f6 |
| Assignment | 6a2b2a5cc8c5bd600c0dd7f9 |

El usuario tutor tiene suscripcion activa con expiracion a +7 dias desde la ejecucion.

### Resultados T1–T7

| # | Criterio | Metodo | Evidencia | Veredicto |
|---|---|---|---|---|
| T1 | POST /sessions 201 + bundleUrl correcto + sessionToken presente + sin PII del nino | Runtime: POST /api/activities/sessions con JWT valido | HTTP 201; sessionToken UUID presente; bundleUrl=http://localhost:8788/sdk-stub.html; campo config presente sin nombre/alias del nino | PASA |
| T2 | POST /sessions doble → 200 mismo token (anti doble-clic) | Runtime: segunda llamada identica | HTTP 200; sessionToken identico al de T1 | PASA |
| T3 | POST /results token valido → 201 con resultId | Runtime: body con rawScore=8 maxScore=10 y 3 eventos | HTTP 201; resultId=6a2b2a7583b83b834bc18340 | PASA |
| T4 | POST /results mismo body → 200 idempotente | Runtime: reenvio exacto del body de T3 | HTTP 200; mismo resultId 6a2b2a7583b83b834bc18340 | PASA |
| T5 | POST /results token inexistente → 401 | Runtime: sessionToken=00000000-0000-4000-8000-000000000000 | HTTP 401 | PASA |
| T6 | POST /results token expirado → 410 | Runtime: token insertado directo en Mongo con expiresAt=now-5s; POST inmediato | HTTP 410; token purgado por TTL en contraprueba posterior (consistente) | PASA |
| T7 | POST /results token valido pero activityId ajeno → 401 | Runtime: token fresco con activityId real; body con activityId=000000000000000000000099 | HTTP 401; token permanecio unused (correcto — el 401 no consume token) | PASA |

**Resultado Pasada 1: 7/7 PASA. Sin anomalias.**

### Verificacion stub cross-origin

- http://localhost:8788/sdk-stub.html responde HTTP 200 (verificado con curl -L).
- El bundleUrl almacenado en la Activity y devuelto en el payload de /sessions es http://localhost:8788/sdk-stub.html, confirmando el flujo de servido cross-origin.

### Contraprueba directa en MongoDB (arquitecto, 2026-06-11)

```
activity  6a2b2a5cc8c5bd600c0dd7f6 : bundleUrl='http://localhost:8788/sdk-stub.html'
                                      isActive=true, passThreshold=60
assignment 6a2b2a5cc8c5bd600c0dd7f9 : status='completed'
                                       completedAt=2026-06-11T21:36:53.483Z
activityresult 6a2b2a7583b83b834bc18340 : rawScore=8, maxScore=10
                                           scorePercent=80 (derivado server-side)
                                           passed=true, events=3
                                           schemaVersion='1.0'
tokens del assignment : uno status='used' usedAt=21:36:53 (consumido por T3/T4)
                        uno 'unused' vigente (el de T7, que el 401 correctamente NO consumio)
                        token expirado de T6 purgado por TTL (consistente)
```

---

## Pasada 2 — Inspeccion frontend

**Metodo:** inspeccion de codigo fuente. Sin Playwright/Puppeteer instalado en el entorno;
criterios de browser validados por lectura directa del codigo (decision del arquitecto).

Archivos inspeccionados:
- client/src/pages/nino/GameHost.jsx
- client/vite.config.js
- client/dev-stubs/sdk-stub.html

### Tabla I1–I9

| # | Criterio | Metodo | Evidencia (archivo:linea) | Veredicto |
|---|---|---|---|---|
| I1 | Sandbox: allow-scripts allow-forms, SIN allow-same-origin | Inspeccion JSX | GameHost.jsx:626 — sandbox="allow-scripts allow-forms"; sin allow-same-origin ni allow-popups; comentario de guardrail en lineas 615-625 | PASA |
| I2 | Validacion mensajes entrantes: doble defensa event.source + event.origin | Inspeccion JSX | GameHost.jsx:300-323 — primera guarda: isFromOurIframe = event.source === iframeRef.current.contentWindow (lineas 300-311); segunda guarda: si origin !== "null" verifica coincidencia con expectedOriginRef (lineas 315-323). Matiz: con sandbox sin allow-same-origin el browser reporta origin="null" (string literal), por lo que la defensa efectiva es event.source; la guarda de origin aplica a bundles futuros sin sandbox null | PASA |
| I3 | No fuga de credenciales: getContext solo envia config+runtime; sessionToken y JWT no cruzan al iframe | Inspeccion JSX | GameHost.jsx:147-163 — safeContext se construye SOLO con config.level/passThreshold/locale/params/audioInstructionsUrl/tutorInstructionsText y runtime.maxDurationSeconds/contractVersion; sessionToken excluido explicitamente; JWT nunca se postea. localStorage.getItem('auth_token') en linea 67 solo alimenta el header Authorization del fetch del host, no el iframe. Sin escrituras a localStorage/sessionStorage/URL con el sessionToken; sin console.log que lo imprima | PASA |
| I4 | No fuga de PII: displayName omitido; ChildContext no cruza al iframe | Inspeccion JSX | GameHost.jsx:155 — comentario "displayName: omitido aunque venga en payload". Lineas 19-21 (imports): solo useState/useEffect/useRef/useCallback + react-router-dom + @shared/index.js; sin import de ChildContext ni de ningun contexto de nino. GameHost.jsx:146 — comentario explicito "Jamas se anade nada de ChildContext" | PASA |
| I5 | Manejo 401/410: mensajes amables para nino, fase ERROR, boton volver, sin loops de reintento | Inspeccion JSX | GameHost.jsx:269-281 — 410: "La sesion expiro. Por favor vuelve al inicio..." / 401: "No pudimos registrar tu actividad. Pide ayuda a un adulto." Ambos setPhase(PHASE.ERROR). ErrorScreen (lineas 446-468): boton "Volver al inicio" llama onBack=handleBack. Guard de doble envio completedRef lineas 220-223: if (completedRef.current) return antes de cualquier fetch | PASA |
| I6 | Guard bundleUrl tres ramas: backend/null+DEV/null+prod; vite.config stub solo en dev | Inspeccion JSX + vite.config | GameHost.jsx:91-111 — rama 1: rawBundleUrl presente → setBundleUrl(rawBundleUrl); rama 2: !rawBundleUrl && DEV → STUB_BUNDLE_URL; rama 3: !rawBundleUrl && !DEV → setErrorMsg + PHASE.ERROR sin montar iframe. vite.config.js:19 — plugin dev-stubs-middleware con apply:'serve' (solo vite dev, no build); stub en client/dev-stubs/ fuera de /public, no entra en dist/ | PASA |
| I7 | Ciclo de vida paused/resumed: visibilitychange → buffer | Inspeccion JSX | GameHost.jsx:347-360 — useEffect activo solo en PHASE.PLAYING; document.addEventListener('visibilitychange', onVisibilityChange); hidden → pushLifecycleEvent(PAUSED); visible → pushLifecycleEvent(RESUMED); cleanup removeEventListener en return | PASA |
| I8 | abandoned: cleanup al desmontar no emite evento ni persiste server-side | Inspeccion JSX | GameHost.jsx:371-381 — el cleanup solo ejecuta console.info en DEV; el evento abandoned NO se pushea al buffer ni se envia al servidor. Causa de diseno: el contrato 2.B exige rawScore/maxScore para consumir el token; no hay vehiculo para un abandono sin resultado; sendBeacon queda como seguimiento (Frente B/E3). Senial operativa de abandono existe igualmente: el assignment queda sin status 'completed' | PASA CON OBSERVACION — limitacion de diseno documentada, no bloquea integracion (decision del arquitecto 2026-06-11) |
| I9 | postMessage end-to-end en browser real | Declaracion de metodo | No ejecutado (sin Playwright en el entorno). Validado por inspeccion del codigo del protocolo + cadena runtime de Pasada 1 (payload 2.A con bundleUrl cross-origin → POST results HTTP 201/200). CORS del host (5173) hacia API (3001) cubierto por CORS_ORIGIN del server. Pendiente smoke manual del usuario en dev | PENDIENTE — smoke manual |

---

## Veredicto global E2 Frente A

**VERDE** — con observacion I8 (limitacion de diseno documentada) y smoke manual I9 pendiente.

No se detectaron fugas de credenciales, fugas de PII, sandbox mal aplicado ni loops de reintento.
Todos los criterios bloqueantes (I1–I7) PASAN. I8 es una limitacion de diseno conocida y aceptada.
I9 requiere smoke manual en dev por el usuario antes de merge a master.
