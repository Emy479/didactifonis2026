# Endurecimiento de carga de bundle — Plan (addendum)

> Continúa la rama `feature/upload-bundle-juego`. Cierra los hallazgos de
> `docs/seguridad-upload-bundle-juego.md`. Decisión de Emiliano (2026-06-17):
> **endurecer todo ahora, incluido A1 (Enfoque B)**.

## Global Constraints
- No tocar `@didactifonis/contract` ni el Engine.
- Reusar deps existentes (`express`, `express-rate-limit`, `helmet`); no añadir nuevas salvo necesidad.
- Tests unitarios con `node --test`; endpoints/servido por verificación runtime.
- Mantener verde la suite existente (`node --test` en `server/`).
- Commits pequeños.

---

### Task H-A (M1): contar entradas de directorio en el tope de zip-bomb
**Files:** `server/activities/bundleArchive.js`, `server/activities/bundleArchive.test.js`
- En `extractZipToDir`, contar también las entradas de DIRECTORIO contra `limits.maxFiles` (hoy solo cuentan los archivos). Un ZIP con miles de directorios vacíos debe rechazarse con `BundleError('ZIP_BOMB')`.
- TDD: test que construye un ZIP con N directorios > maxFiles y espera `ZIP_BOMB`; mantener verdes los tests previos.

### Task H-B (M2): backups de swap no servibles + limpieza garantizada
**Files:** `server/storage/LocalDiskStorage.js`, `server/storage/LocalDiskStorage.test.js`
- En `replace`, nombrar el backup con **punto inicial** dentro del root (`.old-<activityId>-<ts>`) en vez de `<activityId>.old-<ts>`, para que `dotfiles:'deny'` lo oculte del servido. (Sigue dentro del root para rename same-FS.)
- Garantizar limpieza del backup en éxito y en rollback (ya existe; confirmar con test).
- TDD: test de happy-path (sin residuos, nombre con punto durante el swap) + test de rollback (fallo del segundo rename restaura la versión previa y no deja backup).

### Task H-C (A1 + A2): origen dedicado para servir bundles + CSP acotada
**Files:** `server/index.js`, `server/storage/index.js`, `server/storage/LocalDiskStorage.js` (solo `serveUrl`), `docs/qa-upload-bundle-juego.md` (nota)
- **A1:** mover el servido de `/games` FUERA de la app de la API a un **listener dedicado** en un puerto propio (`GAME_PUBLIC_PORT`, default `3002`) dentro del mismo proceso Node (segundo `express()` + `app.listen`). La app de la API deja de servir bundles.
- `LocalDiskStorage.serveUrl` y el factory pasan a usar `GAME_PUBLIC_ORIGIN` (default `http://localhost:3002`) en vez de `API_BASE_URL`. Así `bundleUrl` queda en un origen distinto al de la API.
- **A2:** en las cabeceras del servido dedicado, acotar `frame-ancestors` al origen del cliente (`CLIENT_ORIGIN`, default `http://localhost:5173`) en lugar de `*`. Mantener `nosniff`, `Cross-Origin-Resource-Policy: cross-origin`, `index:false`, `dotfiles:'deny'`. (`unsafe-inline/eval` se conservan: los motores de juego los requieren.)
- Documentar en comentario que en producción `GAME_PUBLIC_ORIGIN` apunta a un subdominio (`juegos.<dominio>`) vía reverse-proxy al puerto dedicado.
- Verificación runtime: el bundle se sirve desde `:3002` con las cabeceras correctas y `frame-ancestors` acotado; la API en `:3001` ya NO sirve `/games` (404). El flujo de upload sigue devolviendo un `bundleUrl` en el nuevo origen.

### Task H-D (M3 + M4): sweep de huérfanos + rate-limit de upload
**Files:** `server/index.js` (sweep al arranque), `server/routes/activities.js` (rate-limit)
- **M3:** al arrancar el server, barrer el root de almacenamiento y borrar carpetas huérfanas `.tmp-*` y `.old-*` (residuos de procesos interrumpidos). Operación idempotente y silenciosa.
- **M4:** aplicar un `express-rate-limit` dedicado (más estricto que el global) a `POST /upload` y `PUT /:id/bundle` (p.ej. 20 req / 15 min por IP), reutilizando el patrón de `authLimiter` ya existente en el proyecto.
- Verificación: arranque borra un `.tmp-x` sembrado; las rutas de upload responden 429 al superar el límite (o documentar el límite configurado si probarlo es costoso).

---

## Cierre
Tras H-A…H-D: re-correr `node --test` (suite completa verde) + smoke runtime del servido en el nuevo origen. Luego revisión final de rama y merge. Actualizar `docs/seguridad-upload-bundle-juego.md` marcando los hallazgos resueltos.
