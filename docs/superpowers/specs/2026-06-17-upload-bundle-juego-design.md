# Diseño — Carga de bundle de juego (Admin → plataforma)

> Spec de brainstorming. Fecha: 2026-06-17. Estado: aprobado por Emiliano, pendiente de plan de implementación.
> Corte de cierre de plataforma: bloqueante de despliegue #2 (ver `platform_closure_inventory`).

## 1. Objetivo y contexto

Hoy el Admin publica un juego pegando a mano una URL de bundle (`bundleUrl`) en
`AdminActividades.jsx` (campos marcados "placeholder"). No existe subida real, ni
validación de manifest, ni almacenamiento. El objetivo es que el Admin **suba el `.zip`
que produce el Engine** y la plataforma lo valide, descomprima, almacene y sirva, dejando
el flujo listo para producción "sin fricción al subir contenido".

**Frontera explícita:** no se toca el contrato (`@didactifonis/contract`) ni el Engine.
La plataforma **consume** el mismo `validateManifest()` que ya usa el Engine.

### Decisiones tomadas en brainstorming

- **Modelo de carga:** subir el ZIP a la plataforma (auto-hospedado), no pegar URL externa.
- **Infra destino:** hosting contratado con visión a VPS → servidor con **disco persistente**.
  Almacenamiento en disco local detrás de una interfaz intercambiable (swappable a nube luego).
- **Metadatos terapéuticos:** los completa el Admin al subir; el manifest precarga lo que trae.
- **Servido:** Enfoque A — `express.static` desde el propio servidor (orígenes ya distintos
  cliente↔servidor; iframe sandbox sin `allow-same-origin` ya aísla).
- **Versionado por re-subida:** incluido en el corte (no diferido).

## 2. Arquitectura

Pipeline: **subir ZIP → validar manifest → extraer con guards → almacenar → servir → crear/actualizar `Activity`**.
El `bundleUrl` resultante alimenta el flujo existente (`sessionsRouter` → `GameHost` → iframe), sin cambios en la reproducción.

Dos abstracciones finas para no atar la lógica al disco local:

- **`storage`** — interfaz `save(activityId, files)`, `serveUrl(activityId, entryPoint)`,
  `delete(activityId)`, `replace(activityId, files)`. Implementación inicial `LocalDiskStorage`.
  Migrar a nube/subdominio más adelante = nueva implementación, sin tocar la lógica de negocio.
- **`bundleArchive`** — encapsula abrir/validar/extraer el ZIP, aislando la librería de
  descompresión (`yauzl` recomendada) y centralizando los guards de seguridad.

## 3. Modelo de datos — extender `Activity` (`server/models/Activity.js`)

Campos nuevos, además de los actuales:

| Campo | Tipo | Origen |
|---|---|---|
| `gameId` | String (slug kebab-case) | manifest `id` |
| `gameVersion` | String (semver) | manifest `version` |
| `entryPoint` | String (ruta relativa) | manifest `entryPoint` |
| `bundlePath` | String (clave de almacenamiento, ej. `games/<activityId>`) | interno |
| `manifest` | Object (manifest crudo validado) | trazabilidad/auditoría |

`bundleUrl` (ya existe) pasa a ser **derivado y persistido** en la subida:
`${API_BASE_URL}/games/<activityId>/<entryPoint>`. `sessionsRouter` lo sigue leyendo igual.

**Mapeo manifest → modelo:** `title`→`title`, `ageMin`/`ageMax`→`ageRange.min`/`.max`,
`durationMin`→`durationMinutes`. El manifest `level` (1–10) y `category` (texto libre)
quedan informativos dentro de `manifest`, **no** se mapean a `difficultyLevel`/`type`.

**Provistos por el Admin:** `type` (enum fonema/silaba/palabra/comprension/otro),
`difficultyLevel` (1–3), `passThreshold`, `availableToTutors`, `therapeuticGoal`.

## 4. Subida nueva — `POST /api/activities/upload` (solo admin, multipart)

1. Recibir ZIP vía `multer` con **límite de tamaño** configurable (ej. 50 MB, env).
2. Localizar `manifest.json` en la raíz del ZIP; parsear JSON (try/catch → 400 si no parsea).
3. `validateManifest(manifest)` de `@didactifonis/contract`. Si `!valid` → `400` con `errors[]`.
4. Verificar que el archivo `entryPoint` exista dentro del ZIP → `400` si falta.
5. Extraer a carpeta **temporal** con guards (sección 7): zip-slip, symlinks, zip-bomb.
6. **Commit atómico:** mover de la temporal a `storage/games/<activityId>/`
   (`activityId` = nuevo `ObjectId` generado antes de crear el doc, para nombrar la carpeta).
7. Crear `Activity` con manifest-derivados + campos del Admin + `bundleUrl` derivado.
8. **Limpiar temporales siempre** (éxito o error), vía `finally`.
9. Responder `201` con la actividad creada.

## 5. Versionado por re-subida — `PUT /api/activities/:id/bundle` (solo admin, multipart)

- Mismo pipeline de validación/extracción/guards que la subida nueva.
- **Guard de identidad:** el `gameId` del nuevo manifest **debe coincidir** con el de la
  actividad existente → `400` si no coincide (evita sobrescribir otro juego por error).
  Se acepta `gameVersion` igual o mayor; si baja, se permite pero se informa (warning, no error).
- **Swap atómico de carpeta:** extraer a `games/<id>.tmp-<ts>` → renombrar la actual a
  `games/<id>.old-<ts>` → mover la nueva a `games/<id>` → borrar `.old`. Si falla, rollback
  (restaurar `.old`). Un niño con la versión vieja ya cargada en su iframe no recibe archivos
  a medio escribir; las **sesiones nuevas** toman la versión nueva.
- **Historia intacta:** se conservan `activityId`, asignaciones y resultados (los resultados
  guardan sus propios valores). Solo se actualizan `gameVersion`, `entryPoint`, `manifest`,
  `bundleUrl`. Los metadatos terapéuticos **no** se tocan.

## 6. Servido del bundle

- `express.static` montado en `/games` (raíz = carpeta de almacenamiento de `LocalDiskStorage`),
  con **listado de directorios deshabilitado**.
- Middleware de cabeceras de seguridad en `/games`: `X-Content-Type-Options: nosniff`,
  CSP restrictiva, `Cross-Origin-Resource-Policy`, y **nunca** `Set-Cookie`.
- El iframe del `GameHost` ya es cross-origin + `sandbox="allow-scripts allow-forms"`
  (sin `allow-same-origin` ni `allow-popups`): **no requiere cambios** para reproducir.
- Ruta pública (sin auth): los bundles no contienen PII ni datos sensibles; son contenido de juego.

## 7. Seguridad

Superficie crítica: **subida de archivos no confiables** en plataforma de menores.

- **Zip-slip / path traversal:** resolver cada entrada y exigir que el path destino quede
  dentro del directorio objetivo; rechazar `..`, rutas absolutas y **entradas symlink**.
- **Zip-bomb:** topes de **nº de archivos**, **tamaño descomprimido total** y **tamaño por
  archivo** (todos configurables por env).
- **Aislamiento del juego:** sandbox cross-origin ya impide acceso a DOM/cookies/localStorage
  del host y al JWT del tutor (guardrails de `GameHost` vigentes). Se suma CSP + `nosniff` +
  `Cross-Origin-Resource-Policy` en `/games`.
- **Autorización:** `requireRole('admin')` en ambos endpoints.
- **Librería de descompresión:** `yauzl` (streaming, battle-tested) con los guards explícitos
  arriba; no confiar en defaults.
- **Revisión obligatoria de `didactifonis-security`** antes de integrar.

## 8. Manejo de errores

Mensajes específicos + limpieza de temporales siempre:

- Sin `manifest.json` en la raíz → `400`.
- `manifest.json` no parsea como JSON → `400`.
- Manifest inválido → `400` con lista de campos (`validateManifest().errors`).
- `entryPoint` ausente en el ZIP → `400`.
- ZIP demasiado grande / demasiados archivos / archivo individual demasiado grande → `400`/`413`.
- Intento de zip-slip o symlink → `400` + **log de evento de seguridad**.
- `gameId` no coincide en re-subida → `400`.
- No-admin → `403`.

## 9. Testing y verificación

- **Unit:** guard zip-slip, límites/zip-bomb, cableado de `validateManifest`, rollback del
  swap atómico.
- **Integración:** subida válida → `201` + `Activity` + archivos en disco + servidos;
  manifest inválido → `400`; `entryPoint` ausente → `400`; ZIP zip-slip → rechazado;
  sobredimensionado → rechazado; re-subida con `gameId` correcto → reemplaza; `gameId`
  distinto → `400`; no-admin → `403`.
- **Smoke E2E (verificación de oro):** subir el **ZIP real exportado por el Engine**
  (La Casa Mágica de H2/H3) → asignar → el niño abre el `GameHost` → juega → resultado
  registrado. Valida la frontera Engine↔plataforma de punta a punta.
- **Revisión de seguridad:** `didactifonis-security` antes de integrar.

## 10. Alcance — fuera de este corte

- Subida de miniatura (thumbnail) como archivo: queda como campo URL por ahora.
- Migración a almacenamiento en nube / subdominio estático (Enfoque B/C): la abstracción
  `storage` lo deja preparado, pero no se implementa ahora.
- Cualquier cambio al contrato del manifest o al Engine.

## 11. Componentes a tocar (resumen)

- **Backend:** `server/models/Activity.js` (campos), `server/routes/activities.js` o nuevo
  router de upload, `server/storage/` (interfaz + `LocalDiskStorage`), `server/activities/`
  o util `bundleArchive`, montaje de `/games` estático en `server/index.js`, deps (`multer`, `yauzl`).
- **Frontend:** `client/src/pages/admin/AdminActividades.jsx` (input de archivo en crear,
  botón reemplazar bundle en editar, manejo de errores de validación).
- **Sin cambios:** `GameHost.jsx`, `sessionsRouter.js`, `resultsRouter.js`, `@didactifonis/contract`.
