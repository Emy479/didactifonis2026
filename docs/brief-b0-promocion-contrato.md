# Brief B-0 — Promoción del contrato a `@didactifonis/contract`

**Fecha:** 2026-06-11
**Arquitecto:** didactifonis-architect
**Agente ejecutor:** `didactifonis-backend`. **Revisión:** `didactifonis-qa`.
**Contexto:** arranque del Frente B (E2). Decisiones operativas a–d de ADR-SDK-05 cerradas por
Emiliano el 2026-06-11 (ver `docs/brief-e2-sdk-launcher.md` §B.2 y `docs/plan-sdk-engine-juegos.md`,
cierre operativo de ADR-SDK-05).

---

## Objetivo

Extraer el contrato de juego de `/shared` a un repo neutral `didactifonis-contract` (paquete
`@didactifonis/contract`), con **fuente ÚNICO** servido a ESM y CJS vía `exports` map — saldando
la deuda de los dos archivos espejo sincronizados a mano — y hacer que la plataforma (server +
client) lo consuma vía dependencia local, sin cambio de comportamiento observable.

## Estado de partida (verificado 2026-06-11)

- `shared/index.js` (ESM) y `shared/index.cjs` (CJS) exportan **exactamente 5 símbolos**, hoy
  sincronizados a mano: `ROLES`, `CONTRACT_VERSION` (`'1.0'`), `EVENT_TYPES` (9 tipos),
  `EVENTS_INGEST_CAP` (`200`, provisional), `RESULT_CONTRACT_SHAPE`.
- Consumidores actuales:
  - `server/activities/resultsRouter.js` L51 y `server/activities/sessionsRouter.js` L26:
    `require('../../shared/index.cjs')`.
  - `client/src/pages/nino/GameHost.jsx` L21: `import ... from '@shared/index.js'` (alias en
    `client/vite.config.js` L52, con `server.fs.allow` restringido a `../shared` L61).
- `docs/postmessage-protocol.md` (v1.1) es el canónico del protocolo host↔juego (DEP-2).
- No hay npm workspaces: la raíz orquesta con `--prefix`; server y client instalan por separado.
- No existen `C:\didactifonis-contract` ni `C:\didactifonis-engine`.

## Alcance (qué SÍ entra)

1. **Repo nuevo `C:\didactifonis-contract`** (git init, rama `master`):
   - Paquete `@didactifonis/contract`, `"private": true` (decisión b: SIN publicar; el flag se
     quita cuando se decida registry y se pinee).
   - **Un solo archivo fuente** con los 5 exports actuales, byte-equivalentes en valor.
     `exports` map que sirva `require` e `import`. Sin build step si es posible (p. ej. fuente
     CJS único: Node resuelve named imports desde CJS y Vite pre-bundlea CJS sin problema).
     Si backend juzga necesario un build (fuente ESM → CJS generado), elevarlo al arquitecto
     antes de implementarlo.
   - `docs/postmessage-protocol.md` **migrado aquí como canónico** (mover, no copiar).
   - README mínimo: qué es, quién lo consume, política "link ahora, pin después".
   - Commits pequeños y descriptivos.
2. **Plataforma (`C:\Didactifonis2026`)** — cambio de consumo:
   - `server/package.json` y `client/package.json`: dependencia
     `"@didactifonis/contract": "file:../../didactifonis-contract"` (ajustar profundidad de la
     ruta relativa según corresponda desde cada subpaquete) + `npm install` en cada uno.
   - `resultsRouter.js` / `sessionsRouter.js`: `require('@didactifonis/contract')`.
   - `GameHost.jsx`: `import { ... } from '@didactifonis/contract'`.
   - `vite.config.js`: retirar el alias `@shared`; ajustar `server.fs.allow` si el symlink lo
     exige (Vite resuelve al path real del checkout hermano).
   - `/shared`: eliminar `index.js` e `index.cjs`; dejar `shared/README.md` apuntando al repo
     nuevo (evita que un futuro agente re-cree el espejo).
   - `docs/postmessage-protocol.md`: reemplazar por un puntero corto al canónico en
     `didactifonis-contract` (actualizar también la referencia en `client/dev-stubs/sdk-stub.html`
     si es solo un comentario).
3. **GitHub (decisión a):** verificar `gh auth status`. Si hay sesión: crear repo **privado**
   `didactifonis-contract` en la cuenta del proyecto y pushear. Si no: dejar el repo local listo
   y **reportar** que falta `gh auth login` (no intentar autenticar).

## Fuera de alcance (qué NO entra)

- NO crear `didactifonis-engine` ni nada del SDK (eso es B-1, espera el smoke manual de Emiliano).
- NO cambiar valores del contrato (`EVENTS_INGEST_CAP` sigue 200 provisional; `CONTRACT_VERSION`
  sigue `'1.0'`). Promoción mecánica, cero cambios semánticos.
- NO tocar `progress.js`, lógica de routers ni `GameHost.jsx` más allá de la línea de import.
- NO publicar en ningún registry npm.
- NO editar `CLAUDE.md` (lo actualiza el arquitecto tras la verificación QA).

## Criterios de aceptación

- [ ] `require('@didactifonis/contract')` y `import` del mismo paquete devuelven los **5 exports
      idénticos** (nombres y valores) a los de `/shared` previo.
- [ ] Un solo archivo fuente en el repo del contrato; cero sincronización manual.
- [ ] El server arranca (`npm run dev` o `npm start` en `/server` levanta sin errores de require;
      la conexión a Mongo puede fallar si no hay instancia — el criterio es la resolución de módulos).
- [ ] El client builda (`npm run build` en `/client` termina sin errores).
- [ ] No quedan referencias activas a `shared/index.js` ni `shared/index.cjs` en código.
- [ ] El canónico del protocolo vive en `didactifonis-contract/docs/`; la plataforma conserva
      solo un puntero.
- [ ] Repo `didactifonis-contract` con historial git limpio; remote privado en GitHub si hubo
      auth de `gh`, o reporte explícito de que falta.

## Riesgos conocidos

- **R1 — Symlink de `file:` en Windows/Vite.** npm instala `file:` como symlink; Vite resuelve al
  path real y `server.fs.allow` puede bloquearlo. Mitigación: añadir el path del checkout del
  contrato a `fs.allow` (mantener la lista mínima: solo ese path).
- **R2 — Named imports desde CJS en Vite/Node.** Con `module.exports = { ... }` plano funciona
  (cjs-module-lexer / prebundle de Vite). Verificarlo en el build, no asumirlo.
- **R3 — Deriva silenciosa.** Si `/shared` no se vacía, alguien volverá a importarlo. Por eso se
  eliminan los archivos y se deja README puntero.

## Verificación QA (B-0, posterior)

`didactifonis-qa` verificará: arranque del server, build del client, igualdad de los 5 exports
antes/después (contra los valores documentados arriba), y ausencia de referencias residuales a
`/shared`. Si algo falla 2 veces, se detiene y reporta al arquitecto.
