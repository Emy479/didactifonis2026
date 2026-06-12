# Brief B-1 — Esqueleto del SDK (`@didactifonis/sdk` en repo `didactifonis-engine`)

**Fecha:** 2026-06-12
**Arquitecto:** didactifonis-architect
**Agente ejecutor:** `didactifonis-frontend`
**Revisión:** `didactifonis-security` (no-fuga) + `didactifonis-qa` (estática + build)
**Plan base:** `docs/plan-sdk-engine-juegos.md` (ADR-SDK-03/04/05) · `docs/brief-e2-sdk-launcher.md` §Frente B
**Fuente única a espejar:** `C:\didactifonis-contract\docs\postmessage-protocol.md` (v1.1)
**Gate de arranque:** smoke manual del flujo niño→jugar PASADO por Emiliano (2026-06-12). CUMPLIDO.

---

## 1. Objetivo

Crear el repo `C:\didactifonis-engine` (git nuevo, hermano de la plataforma — decisión d de
ADR-SDK-05) con el paquete **`@didactifonis/sdk`**: la librería JS que el juego externo importa
y que habla con el GameHost exclusivamente por postMessage, espejando **exactamente** el
protocolo v1.1. El SDK es el runtime-bridge del Engine (decisión c): el repo se estructura para
que más adelante convivan el Engine Phaser (ADR-SDK-04) y los juegos-piloto, pero en B-1 solo
se construye el SDK + una demo mínima.

## 2. Criterios duros (ADR-SDK-03 — innegociables)

- El SDK **JAMÁS** ve `sessionToken` ni JWT. No existe ningún parámetro, campo ni mensaje por
  el que pueda recibirlos; si llegaran en un payload (bug del host) el SDK no los persiste ni
  los re-emite.
- El SDK **JAMÁS** hace fetch/XHR/sendBeacon a la plataforma ni a ningún destino. Su única
  E/S es `window.parent.postMessage` (salida) y el listener `message` (entrada).
- El SDK no lee ni escribe `localStorage`, `sessionStorage`, cookies ni URL.
- Validación de entrada (protocolo §4.4): descartar todo mensaje cuyo `event.source !==
  window.parent`; si se configuró `hostOrigin` y `event.origin` no es `"null"`, verificar
  también el origen.

## 3. Estructura del repo (pensada para Engine + juegos futuros)

```
C:\didactifonis-engine
├── package.json              raíz privada — npm workspaces: ["packages/*"]
├── .gitignore                node_modules, dist
├── README.md                 qué es el repo, topología contrato/plataforma/engine, cómo buildear
├── packages/
│   └── sdk/                  @didactifonis/sdk  (private:true, UNLICENSED)
│       ├── package.json
│       ├── src/index.js      fuente única del SDK
│       └── dist/             build: ESM + UMD (gitignored)
└── examples/
    └── demo-minima/          HTML mínimo que usa el SDK buildeado (UMD) y replica la
                              secuencia del stub (getContext → eventos → submitResults)
```

Reservado para fases futuras (NO crear ahora): `packages/engine/` (Phaser) y `games/`.

## 4. API pública del SDK (espejo del protocolo v1.1)

- `init({ hostOrigin?, debug? })` — opcional. `hostOrigin`: origen esperado del host para
  verificación adicional de `event.origin` (§4.4; resoluble vía `document.referrer` cuando
  exista). `debug`: activa/silencia warnings (default: activado).
- `getContext(): Promise<{config, runtime}>` — envía `{type:'getContext'}` al padre y resuelve
  con el payload de `contextResponse`. Cachea la respuesta (llamadas posteriores resuelven con
  la caché). Timeout razonable con rechazo explicativo si el host no responde.
- `isReady(): Promise<void>` — resuelve tras recibir `contextResponse` (§6.3 del protocolo).
- `reportEvent(eventType, eventPayload = {})` — envía `{type:'reportEvent', payload:{eventType,
  eventPayload}}`. Validación Q-EVT-3: si `eventType` está en `EVENT_TYPES` → ok; si tiene
  prefijo `x_` → custom aceptado; en cualquier otro caso → **warning (debug) y se envía igual**
  (el host lo conserva como custom; el SDK nunca descarta). `eventType` no-string/vacío → warning
  y descarte local. Contador local de eventos: al alcanzar `EVENTS_INGEST_CAP`, warning al autor
  del juego (espíritu del cap: el buffer real vive en el host; el SDK solo avisa).
- `submitResults({ rawScore, maxScore, attemptCount?, durationSeconds?, metadata? })` — envía
  `{type:'submitResults', payload}` **una sola vez** (segunda llamada: warning + no-op, espejo
  de la idempotencia del host). Validación ligera de forma (rawScore ≥ 0, maxScore > 0) con
  warning en debug, sin bloquear (la validación estricta es server-side, E1).
- **Prohibido en la API:** `childId`, nombres, avatar o cualquier PII (minimización D4/ALTO-1);
  emitir `paused`/`resumed` por visibilidad (los emite el host, §5 del protocolo).

## 5. Contrato y build

- Consume `@didactifonis/contract` vía `file:` apuntando a `C:\didactifonis-contract`
  (link local, "link ahora pin después" — ADR-SDK-05 b). Importa `EVENT_TYPES`,
  `CONTRACT_VERSION`, `EVENTS_INGEST_CAP`; no duplica literales.
- Build de librería con **Vite lib mode**: salidas **ESM + UMD** (UMD justificado: los bundles
  de juego deben ser autocontenidos y cargarse por `<script>` sin resolver npm en runtime).
  El contrato se **inlinea** en dist (no externalizar: el juego no debe resolver
  `@didactifonis/contract` en runtime; la versión queda fijada en build, coherente con el pin
  futuro).
- Lección B-0 (aplica a cualquier app dev Vite que linke el contrato): `server.fs.allow`
  REEMPLAZA el default (añadir el propio root) y los paquetes `file:` requieren
  `optimizeDeps.include: ['@didactifonis/contract']`. Para la demo se prefiere consumir el
  **UMD buildeado** (sin dev server), evitando el problema de raíz.

## 6. Tarea adjunta (repo del contrato)

Corregir el comentario engañoso en `C:\didactifonis-contract\index.cjs` (línea ~5): "Vite
pre-bundlea CJS sin necesidad de build step" solo es cierto si el consumidor linked añade
`optimizeDeps.include` explícito. Commit pequeño y descriptivo en ese repo.

## 7. Criterios de aceptación

- [ ] Repo git inicializado en `C:\didactifonis-engine` con la estructura de §3.
- [ ] API de §4 completa y espejando el protocolo v1.1 sin redefinir tipos de mensaje.
- [ ] Cero `fetch`/`XMLHttpRequest`/`sendBeacon`/`localStorage`/`document.cookie` en `src/`.
- [ ] Build ESM + UMD reproducible (`npm run build` en el workspace sdk).
- [ ] Demo mínima funcional contra el UMD (verificable abriendo el HTML; el flujo completo
      contra GameHost real es B-2, fuera de alcance).
- [ ] Validación Q-EVT-3 y aviso de cap implementados.
- [ ] Commit(s) pequeños y descriptivos; comentario del contrato corregido.

## 8. Fuera de alcance (B-1)

- Engine Phaser, juegos-piloto, mensaje `init` host→juego (coordinar con arquitecto si se
  necesitara), publicación en registry, integración end-to-end con GameHost real (B-2),
  cambios en la plataforma o en el protocolo.
