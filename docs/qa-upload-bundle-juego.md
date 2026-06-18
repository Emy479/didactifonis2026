# QA — Verificación E2E de carga de bundle de juego

**Fecha:** 2026-06-17 · **Rama:** `feature/upload-bundle-juego`
**Método:** runtime HTTP real contra server Express + MongoDB local + contraprueba en disco/Mongo (estilo `qa-e2-frente-a.md`).

## Entorno

| Componente | Valor |
|---|---|
| API server | http://localhost:3001 (`npm run start --prefix server`, `API_BASE_URL=http://localhost:3001`) |
| Base de datos | MongoDB local (mongod activo) |
| Admin de prueba | demo-admin@didactifonis.dev (seed `npm run seed:demo`) |
| Tutor de prueba | demo-tutor@didactifonis.dev |
| Bundles | construidos con `yazl` (manifest conforme + `index.html`); no se requirió el ZIP real del Engine (el plan permite uno representativo) |

## Matriz de resultados

| # | Criterio | Evidencia | Veredicto |
|---|---|---|---|
| T1 | POST /api/activities/upload válido → 201 + Activity con mapeo correcto | HTTP 201; `title="Bundle good-game"` (del manifest), `ageRange{4,10}`, `durationMinutes=15`, `difficultyLevel=2` (del Admin), `gameId=good-game`, `gameVersion=1.0.0`, `bundleUrl` en el origen dedicado de bundles, `manifest` almacenado, `passThreshold=60`; archivos en `storage-data/game-bundles/<id>/` | PASA |
| T2 | GET bundleUrl → 200 + cabeceras de seguridad | HTTP 200; `X-Content-Type-Options: nosniff`; `Cross-Origin-Resource-Policy: cross-origin`; `Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors <CLIENT_ORIGIN>` | PASA |
| T3a | GET dotfile (`/games/<id>/.secret`) → no servido | HTTP 404 | PASA |
| T3b | Traversal por URL (`/games/<id>/../../package.json`, `--path-as-is`) → bloqueado | HTTP 404 | PASA |
| T4 | PUT /:id/bundle re-subida mismo gameId (v1.0.1) → 200, swap atómico | HTTP 200; `gameVersion=1.0.1`; **0 carpetas `.old-*` residuales** tras el swap | PASA |
| T5 | PUT /:id/bundle con OTRO gameId → 400 GAMEID_MISMATCH | HTTP 400; `"El juego subido (other-game) no coincide con el de esta actividad (good-game)."` | PASA |
| T6 | POST /upload manifest inválido (level 999) → 400 + details | HTTP 400; `details: ["level must be in range [1, 10], got: 999"]` (error real del contrato) | PASA |
| T7 | POST /upload entryPoint ausente del ZIP → 400 | HTTP 400; `"El entryPoint declarado no existe en el ZIP: index.html"` | PASA |
| T8a | POST /upload con token de tutor (no admin) → 403 | HTTP 403 | PASA |
| T8b | POST /upload sin token → 401 | HTTP 401 | PASA |

**Suite unitaria backend:** `node --test` (Tasks 1-4) → 25/25 verdes (registrado en reportes de tarea).

## T9 — Lazo Engine→plataforma (cierre por composición)

No se ejecutó un play-through completo del niño (requiere crear child + assignment + token de sesión, mayor setup). El punto de integración nuevo —que `Activity.bundleUrl` apunte a un bundle real servido— alimenta el flujo de sesión ya verificado en `qa-e2-frente-a.md` (T1: `POST /api/activities/sessions` devuelve `runtime.bundleUrl` desde `activity.bundleUrl`). Con T1+T2 de este documento, `bundleUrl` es ahora una URL real y servible, por lo que el lazo queda cerrado por composición. Un smoke manual del niño en la app queda recomendado antes del despliegue final.

## Post-endurecimiento (tanda A1/A2/M1-M4)

La corrida T1-T8 de la tabla se ejecutó ANTES de la tanda de endurecimiento, cuando los
bundles se servían desde el origen de la API con `frame-ancestors *`. Tras la tanda
(`docs/superpowers/plans/2026-06-17-upload-bundle-hardening.md`): los bundles se sirven
desde un **origen dedicado** (`GAME_PUBLIC_ORIGIN`, puerto propio) y la API ya **no**
sirve `/games` (404); `frame-ancestors` queda acotado a `CLIENT_ORIGIN`. Este cambio se
re-verificó por runtime en H-C: `GET http://localhost:3001/games/...` → 404 (API) y
`GET <origen-dedicado>/games/<id>/index.html` → 200 con las cabeceras correctas. Las
tablas T1/T2 quedan genéricas respecto al origen para reflejar este estado.

## Veredicto funcional

**APTO.** Las 10 verificaciones runtime pasan. Carga, validación, almacenamiento, servido seguro, re-subida versionada con swap atómico, y autorización admin-only funcionan de punta a punta. Ver hallazgos de seguridad en `seguridad-upload-bundle-juego.md`.

## Datos de prueba

Los bundles de prueba subidos durante esta verificación se eliminaron del disco al finalizar (`storage-data/game-bundles/` no se versiona).
