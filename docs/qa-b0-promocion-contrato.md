# QA — B-0 Promoción del contrato a `@didactifonis/contract`

**Fecha:** 2026-06-11
**Auditor:** `didactifonis-qa` (verificación independiente, posterior a la implementación de
`didactifonis-backend`). **Brief verificado:** `docs/brief-b0-promocion-contrato.md`.
**Veredicto global: VERDE.** Cero correcciones necesarias.

## Alcance verificado

Promoción del contrato de juego desde `/shared` (dos espejos ESM/CJS sincronizados a mano,
eliminados) al repo `C:\didactifonis-contract` (paquete `@didactifonis/contract`, fuente único
`index.cjs` + `exports` map). Plataforma consume vía `file:../../didactifonis-contract`.
Commit plataforma: `681490f`. Commits contrato: `9ce7aa9`, `115495b`, `f979575`.

## Resultados por punto

| # | Verificación | Veredicto | Evidencia |
| :-- | :-- | :-- | :-- |
| 1 | Exports idénticos antes/después | VERDE | deepEqual de los 5 exports contra `git show 19732ac:shared/index.cjs`: PASS los 5 (ROLES 3, CONTRACT_VERSION '1.0', EVENT_TYPES 9, EVENTS_INGEST_CAP 200, RESULT_CONTRACT_SHAPE 12 campos). |
| 2 | Server arranca (resolución de módulos) | VERDE | `require('@didactifonis/contract')` resuelve en `resultsRouter.js` L51 y `sessionsRouter.js` L26; proceso alcanza `app.listen` (EADDRINUSE por dev server activo, no es fallo de B-0). Symlink Junction en `server/node_modules/@didactifonis/contract`. |
| 3 | Client builda | VERDE | `vite build`: 61 módulos, sin errores. Constantes (`activity_started`, `item_answered`, …) incrustadas en `dist/assets/index-*.js` — el CJS se pre-bundleó, no quedó externalizado. |
| 4 | Sin referencias residuales | VERDE | Cero matches de `shared/index` / `@shared` en código activo (solo docs históricos). Alias `@shared` retirado de `vite.config.js`; `server.fs.allow` apunta al checkout del contrato. `/shared` solo contiene README puntero. |
| 5 | Higiene del paquete | VERDE* | `private: true`; exports map require/import/default → `index.cjs`; 5 named exports vía `require` e `import()` dinámico. *Observación menor: el interop CJS→ESM de Node añade la clave `module.exports` al namespace en import dinámico — artefacto estándar de Node, sin efecto en consumidores reales (Vite verificado en punto 3). |
| 6 | Protocolo migrado | VERDE | Canónico v1.1 completo (7 secciones) en `didactifonis-contract/docs/postmessage-protocol.md`; en la plataforma queda puntero de 11 líneas. |

## Pendiente (no bloqueante, reportado)

- **Remote GitHub:** `gh` CLI **no está instalada** en la máquina (verificado también por el
  arquitecto). `C:\didactifonis-contract` no tiene remote. Acción de Emiliano: instalar `gh` +
  `gh auth login`, crear el repo **privado** `didactifonis-contract` y pushear `master`; luego
  `git push` en la plataforma (commits 19732ac, 681490f y este registro).
