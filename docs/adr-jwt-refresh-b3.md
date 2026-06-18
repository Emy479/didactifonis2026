# ADR — Refresh tokens con revocación (modelo B3)

- **Estado:** APROBADO (Emiliano, 2026-06-18). En implementación en rama `feat/jwt-refresh-b3`.
- **Fecha:** 2026-06-18
- **Autor:** didactifonis-architect (diseño; sin implementación)
- **Alcance:** Tanda 2, ítem 5/5 — "JWT refresh"
- **Decisión de modelo (ya tomada por el usuario):** **B3 — refresh con revocación**

---

## 1. Contexto

### 1.1 Estado actual de la autenticación (verificado en código)

| Aspecto | Implementación actual | Archivo |
| :-- | :-- | :-- |
| Token | Un único **access token JWT** con vida `JWT_EXPIRES_IN \|\| '7d'` | `server/controllers/authController.js` (`signToken`) |
| Payload JWT | `{ id, role }` | `authController.js:8-14` |
| Emisión | En `register` y `login`; se devuelve en el body JSON como `{ token, user }` | `authController.js:67, 105` |
| Verificación | `protect()` lee `Authorization: Bearer <token>`, `jwt.verify`, carga `User.findById` | `server/middleware/auth.js:5-31` |
| Rutas auth | `POST /register`, `POST /login`, `GET /me` (sin `/refresh` ni `/logout`) | `server/routes/auth.js` |
| Rate limit auth | `authLimiter`: 20 req / 15 min por IP sobre todo `/api/auth` | `server/index.js:63-69, 84` |
| Almacenamiento cliente | `localStorage` (`auth_token`, `auth_user`) | `client/src/context/AuthContext.jsx:13, 33-34` |
| Envío cliente | Cada página construye `Authorization: Bearer <token>` **inline**, leyendo `localStorage` directamente | (ver 1.2) |
| Logout cliente | Solo borra `localStorage` y estado React; **no avisa al servidor** | `AuthContext.jsx:38-42` |
| CORS | `credentials: true`, origin desde `CORS_ORIGIN` (lista separada por comas) | `server/index.js:32-35` |
| cookie-parser | **No instalado** (no hay manejo de cookies en el server) | — |

### 1.2 Hallazgo crítico para la migración del cliente: no hay wrapper de fetch

No existe ningún módulo `api.js`/`http.js` compartido. **Cada página lee `localStorage.getItem('auth_token')` y arma su propio header `Authorization` con `fetch` directo.** Superficie confirmada (no exhaustiva): `VincularProfesional.jsx`, `TareasTutor.jsx`, `ProgresoTutor.jsx`, `ActividadesTutor.jsx`, `LogrosTutor.jsx`, `ChildContext.jsx`, y el resto de páginas `pro/`, `admin/`, `tutor/`, `nino/` (29 archivos referencian token/Authorization/fetch).

**Consecuencia de diseño:** un modelo de refresh con interceptor que renueva en 401 **necesita un punto único de envío de requests**. Con el patrón actual (fetch disperso) habría que tocar 29 archivos para añadir lógica de reintento. Por eso este ADR propone, como prerrequisito, **introducir un cliente HTTP central** (`client/src/lib/apiFetch.js`) y migrar las páginas a usarlo. Es la pieza de mayor esfuerzo de todo el trabajo y conviene que el usuario lo sepa antes de aprobar.

> Inconsistencia menor detectada (no bloqueante): `Login.jsx:26` hace fetch a `http://localhost:3001` hardcodeado en lugar de usar `API_URL` de `client/src/config.js`. Se corregirá al migrar Login al cliente central.

### 1.3 Por qué B3 (motivación de seguridad/compliance)

Se tratan **datos de salud de menores** bajo la **Ley 21.719** (vigencia 1-dic-2026, alineada a GDPR). El modelo actual (un JWT de 7 días en `localStorage`) tiene dos debilidades graves para este contexto:

1. **Sin revocación.** Un JWT robado es válido 7 días completos. No hay logout real, ni forma de expulsar un dispositivo, ni de cortar una sesión comprometida. Para datos sensibles de menores, la **capacidad de revocar** es un requisito, no un lujo.
2. **`localStorage` es accesible a JS** → cualquier XSS exfiltra el token.

B3 ataca ambas: access token corto (la ventana de robo se reduce a minutos) + refresh token en cookie `httpOnly` (no exfiltrable por XSS) + registro de sesiones en BD (revocación real y detección de reuso).

---

## 2. Decisión

Adoptar **B3**: par de tokens (access corto + refresh largo), refresh en cookie `httpOnly`, **rotación** de refresh tokens en cada uso, y **registro de sesiones en MongoDB** para permitir revocación y detección de reuso.

### 2.1 Modelo de datos — colección `RefreshToken` (sesión)

Nueva colección. **No se guarda el token plano**, solo su hash (si la BD se filtra, los tokens no son utilizables).

```
RefreshToken {
  _id            ObjectId
  userId         ObjectId  (ref User, index)
  tokenHash      String    (SHA-256 del refresh token; index unique)
  familyId       String    (uuid; agrupa la cadena de rotaciones de un login)
  expiresAt      Date      (TTL index → Mongo purga al expirar)
  revoked        Boolean   (default false)
  revokedAt      Date      (null hasta revocar)
  replacedBy     String    (tokenHash del sucesor tras rotar; null si es el vigente)
  userAgent      String    (opcional, para la lista de sesiones)
  ip             String    (opcional; dato personal → ver §2.7)
  createdAt      Date
  lastUsedAt     Date
}
```

Notas de diseño:
- **`tokenHash` con SHA-256, no bcrypt.** El refresh token es un secreto aleatorio de alta entropía (≥256 bits), no una contraseña humana; no necesita salting/stretching costoso. SHA-256 permite lookup directo por índice. (bcrypt impediría buscar por hash.)
- **`familyId`** identifica todos los refresh tokens derivados de un mismo login. La rotación crea un nuevo documento con el mismo `familyId`. Si llega un refresh ya rotado (reuso), se revoca **toda la familia** (§2.4).
- **TTL index** sobre `expiresAt`: Mongo borra automáticamente los expirados. Los revocados se conservan hasta su `expiresAt` para poder detectar reuso de un token robado dentro de su ventana.
- El refresh token **plano** que viaja en la cookie será `<familyId>.<secretoAleatorio>` o simplemente el secreto; se decide en implementación. El server hashea lo recibido y busca por `tokenHash`.

### 2.2 Vidas de token (trade-off para confirmar — ver §5)

| Token | Vida propuesta | Justificación |
| :-- | :-- | :-- |
| **Access** | **15 min** | Ventana de robo corta. Si se filtra, expira solo en minutos. 15 min equilibra seguridad vs. carga de `/refresh` (un refresh cada 15 min por sesión activa es despreciable). |
| **Refresh** | **14 días** (propuesto) | Rango razonable 7–30 d. 14 d evita re-login frecuente sin dejar una sesión "olvidada" viva por un mes. Para datos de menores se inclina al lado conservador. |

Variable de entorno nueva: `ACCESS_TOKEN_TTL` (def. `15m`) y `REFRESH_TOKEN_TTL` (def. `14d`). Se deprecia `JWT_EXPIRES_IN` (pasa a aplicar solo al access; se renombra o se mantiene por compatibilidad — decisión de implementación).

### 2.3 Cookie httpOnly del refresh token

```
Set-Cookie: refresh_token=<valor>;
  HttpOnly;                          // no accesible a JS → inmune a XSS
  Secure;                            // solo HTTPS (en dev sin TLS, condicional a NODE_ENV)
  SameSite=Strict;                   // ver nota
  Path=/api/auth;                    // la cookie solo viaja a las rutas de auth
  Max-Age=<REFRESH_TOKEN_TTL en s>
```

- **`HttpOnly`**: el objetivo central. JS nunca lee el refresh token.
- **`Secure`**: obligatorio en producción. En desarrollo local (http) se setea condicionalmente según `NODE_ENV` para no romper el flujo local.
- **`SameSite`**: `Strict` es lo más seguro y **funciona aquí porque cliente y API son del mismo sitio en producción** (mismo dominio detrás de reverse-proxy). **Trade-off a confirmar (§5):** si en producción la app y la API quedan en dominios distintos (cross-site), `Strict`/`Lax` no enviaría la cookie y habría que usar `SameSite=None; Secure` (más permisivo). Depende de la topología de despliegue final.
- **`Path=/api/auth`**: la cookie solo se adjunta en `/refresh` y `/logout`, no en cada request de datos. El access token (header) sigue autenticando el resto de la API. Esto reduce exposición y tamaño de requests.
- **CORS:** ya está `credentials: true` en el server (`index.js:34`). El cliente debe enviar `credentials: 'include'` en las llamadas a `/login`, `/refresh` y `/logout`. `CORS_ORIGIN` ya soporta lista de orígenes.
- **Dependencia nueva:** `cookie-parser` en el server (no instalado hoy) o leer/escribir la cookie manualmente. Se recomienda `cookie-parser`.

### 2.4 Rotación y detección de reuso

- En cada `POST /auth/refresh` válido: se **emite un nuevo refresh token** (nuevo documento, mismo `familyId`), se marca el anterior como `revoked + replacedBy=<nuevoHash>`, y se setea la nueva cookie. El access token nuevo va en el body.
- **Detección de reuso (token robado):** si llega un refresh token cuyo documento está `revoked` (ya fue rotado), significa que alguien está usando una copia vieja → **se revoca toda la `familyId`** (todas las sesiones derivadas de ese login) y se rechaza con 401. El atacante y la víctima quedan ambos deslogueados; la víctima re-loguea, el atacante no puede.
- Esto es el patrón estándar de *refresh token rotation with reuse detection* (OWASP).

### 2.5 Endpoints

Todos bajo `/api/auth`, ya cubiertos por `authLimiter` (20 req/15 min/IP).

**`POST /api/auth/login`** (ajuste)
- Entrada: `{ email, password }` (igual que hoy).
- Salida: `{ accessToken, user }` en body **+** `Set-Cookie: refresh_token=...`.
- Crea documento `RefreshToken` con nuevo `familyId`.
- (Renombrar `token` → `accessToken` en el body es un cambio de contrato del cliente; ver §2.6 migración.)

**`POST /api/auth/refresh`** (nuevo)
- Entrada: cookie `refresh_token` (no body).
- Valida: existe, no revocado, no expirado. Si revocado → reuso → revoca familia → 401.
- Salida OK: `{ accessToken }` en body + nueva cookie (rotación).
- Errores: 401 si falta/ inválido/expirado/reuso. El cliente, ante 401 aquí, hace logout y redirige a login.

**`POST /api/auth/logout`** (nuevo)
- Entrada: cookie `refresh_token`.
- Revoca el documento de esa sesión (no toda la familia; logout normal de un dispositivo).
- Limpia la cookie (`Set-Cookie` con `Max-Age=0`).
- Salida: 204. Idempotente (si no hay cookie, igual responde 204).

**`POST /api/auth/register`** (ajuste)
- Igual que login: emite par + cookie tras crear el usuario.

**`GET /api/auth/sessions`** + **`DELETE /api/auth/sessions/:id`** (OPCIONAL — ver §5)
- Listar sesiones activas del usuario (userAgent, ip, lastUsedAt) y revocar una concreta ("cerrar sesión en otro dispositivo").
- **Recomendación: diferir a una tanda posterior.** No es necesario para cumplir el objetivo "logout real + revocación". Añade UI nueva (panel de sesiones) y supone trabajo de frontend. El núcleo B3 (revocación) ya se cumple con login/refresh/logout. Marcar como decisión del usuario.

### 2.6 `protect()` y verificación

`protect()` (`middleware/auth.js`) **no cambia su lógica**: sigue verificando el access token del header `Authorization: Bearer`. El único efecto es que ahora el access expira en 15 min, así que devolverá 401 más a menudo → el cliente lo maneja con el interceptor (§2.7). No se consulta la BD de sesiones en cada request (el access token sigue siendo stateless); la BD solo se toca en login/refresh/logout. Esto mantiene el rendimiento.

> Decisión: **no** validar el refresh contra BD en cada request protegido (eso convertiría cada request en stateful y mataría el rendimiento). La revocación actúa en el punto de refresh: una sesión revocada no puede renovar su access, así que muere en ≤15 min. Es el trade-off estándar y aceptable de los esquemas access/refresh.

### 2.7 Impacto en el cliente

**Prerrequisito (§1.2): cliente HTTP central `client/src/lib/apiFetch.js`.**
- Envuelve `fetch`, inyecta `Authorization: Bearer <accessToken>` (el access se guarda **en memoria**, no en localStorage — así no es exfiltrable por XSS).
- Ante **401**: intenta `POST /auth/refresh` (con `credentials:'include'`) **una sola vez**; si renueva, reintenta el request original; si el refresh falla, ejecuta logout y redirige a `/login`.
- Manejo de **refresh concurrente**: si varias requests fallan con 401 a la vez, una sola dispara el refresh y las demás esperan su resultado (cola/promesa compartida) para no rotar el token N veces.

**`AuthContext.jsx`:**
- El access token deja de vivir en `localStorage`; vive en memoria (estado del provider o variable del módulo apiFetch). `auth_user` puede seguir en localStorage (no es secreto) para hidratar la UI, o re-derivarse de `/auth/me`.
- Al montar la app: como ya no hay token en localStorage, se intenta `POST /auth/refresh` una vez. Si la cookie httpOnly sigue viva → sesión restaurada sin re-login. Si no → usuario va a login. Esto **reemplaza** la hidratación actual desde localStorage (`AuthContext.jsx:12-30`).
- `logout()` ahora llama `POST /auth/logout` antes de limpiar el estado local.

**Páginas (29 archivos):** migrar de `fetch(...)` + `localStorage.getItem('auth_token')` inline a `apiFetch(...)`. Es mecánico pero amplio. Se puede hacer por dominio (tutor / pro / admin / nino) en lotes para revisar por partes.

### 2.8 Estrategia de migración (tokens 7d en circulación)

Hay sesiones vivas con un JWT de 7 días en `localStorage`. Para no expulsar a todos al desplegar:

- **Opción recomendada (corte limpio con aviso):** al desplegar, los access tokens viejos (7d) siguen siendo válidos para `protect()` hasta que expiren o hasta el primer 401. Pero como el nuevo cliente ya no encuentra refresh cookie, en cuanto el access viejo expire (≤7d) o el usuario recargue, caerá a login una vez. Dado que es una plataforma aún sin base de usuarios masiva (pre-lanzamiento), **un re-login único es aceptable**.
- **No** se requiere período de doble-soporte complejo. Se comunica "por seguridad, vuelve a iniciar sesión" si hace falta.
- Confirmar con el usuario que un re-login único tras el deploy es aceptable (lo es, dado el estado pre-lanzamiento). Ver §5.

### 2.9 Seguridad / compliance (Ley 21.719, menores)

- **Revocación como requisito de compliance**, no opcional: logout real + capacidad de cortar sesiones comprometidas sobre datos de salud de menores.
- **`ip`/`userAgent` en `RefreshToken` son datos personales.** Guardarlos se justifica por **seguridad** (detección de acceso anómalo), finalidad legítima y limitada. Deben caer bajo la misma política de retención y purgarse con el TTL. Si el usuario prefiere minimizar, `ip` puede omitirse (trade-off §5). El agente `didactifonis-security` debe validar este punto.
- **Nunca** loguear el refresh token plano ni el `JWT_SECRET`. El hash en BD protege ante filtración de la colección.
- Cookie `HttpOnly` + access en memoria = el front deja de tener secretos en `localStorage` → cierra el vector XSS→robo de sesión actual.
- Mantener `authLimiter` sobre `/refresh` y `/logout` (ya aplica a todo `/api/auth`).

---

## 3. Alternativas consideradas (y por qué B3)

- **B1 — solo alargar/acortar el JWT actual:** no da revocación. Descartado por compliance.
- **B2 — refresh sin revocación (refresh token stateless):** simplifica (sin BD), pero no permite logout real ni cortar sesiones robadas. Insuficiente para datos de menores.
- **B3 — refresh con revocación (elegido):** único que cumple revocación + detección de reuso. Coste: una colección nueva y un cliente HTTP central. Justificado por el contexto regulatorio.

---

## 4. Consecuencias

**Positivas:** ventana de robo de minutos; logout real; detección de token robado; sin secretos en localStorage; base para "cerrar sesión en otros dispositivos".

**Coste / riesgo:**
- Introducir el cliente HTTP central y migrar 29 archivos (el grueso del esfuerzo).
- Nueva dependencia `cookie-parser`; nuevas env vars.
- Complejidad de refresh concurrente y reuse-detection (bien acotada por el patrón estándar).
- Re-login único de usuarios al desplegar.

---

## 5. Decisiones — RESUELTAS por Emiliano (2026-06-18)

| # | Decisión | Resolución |
| :-- | :-- | :-- |
| D1 | **Vida del refresh token** | **14 días.** `REFRESH_TOKEN_TTL` def. `14d`. |
| D2 | **`/auth/sessions`** (listar/revocar dispositivos) | **DIFERIDO.** Fuera de este alcance. El núcleo B3 ya da revocación (logout real + reuse-detection). El modelo de datos (`userAgent`/`ip`/`familyId`/`lastUsedAt`) se deja **preparado** para añadir el panel después, pero NO se implementan los endpoints `GET/DELETE /auth/sessions` ni UI ahora. |
| D3 | **Topología y `SameSite`** | **MISMO SITIO (mismo dominio) en prod → `SameSite=Strict`.** Documentar que si en el futuro fuera cross-site habría que migrar a `SameSite=None; Secure`. |
| D4 | **Guardar `ip`/`userAgent`** | **SÍ, bajo TTL.** Se persisten por seguridad (detección de acceso anómalo), purgados con el TTL del documento. Retención a validar por security en T5. |
| D5 | **Re-login único al desplegar** | **ACEPTABLE.** Corte limpio. NO se implementa código de doble-soporte para los access tokens 7d viejos. |

---

## 6. Plan de implementación (delegable, POST-aprobación)

> Orden recomendado: backend primero (define el contrato), luego cliente central, luego migración de páginas, luego QA y security.

**T1 — Backend: modelo + endpoints (didactifonis-backend)**
- Crear modelo `server/models/RefreshToken.js` (§2.1) con TTL index e índices.
- Instalar y montar `cookie-parser`.
- `signAccessToken` (15 min) + `issueRefreshToken` (crea doc, setea cookie) en `authController.js`.
- Endpoints: ajustar `login`/`register` (par + cookie), nuevos `refresh` y `logout`; rutas en `routes/auth.js`.
- Rotación + detección de reuso (§2.4). Nuevas env vars en `.env.example`.
- Criterio de aceptación: login setea cookie httpOnly; refresh rota y emite nuevo par; refresh reusado revoca la familia (401); logout revoca y limpia cookie.

**T2 — Frontend: cliente HTTP central + AuthContext (didactifonis-frontend)**
- Crear `client/src/lib/apiFetch.js`: access en memoria, inyección de header, refresh-on-401 con cola de concurrencia, logout+redirect al fallar.
- Reescribir `AuthContext.jsx`: access en memoria, restaurar sesión vía `/auth/refresh` al montar, `logout()` llama al endpoint.
- Corregir `Login.jsx` para usar el cliente central (y de paso el `API_URL` hardcodeado).
- Criterio: recargar la página mantiene sesión vía cookie; un 401 renueva transparentemente; logout corta en server.

**T3 — Frontend: migración de páginas (didactifonis-frontend, en lotes)**
- Migrar las 29 páginas/contextos de `fetch+localStorage` a `apiFetch`, por dominio (tutor → pro → admin → nino). Revisión por lote.
- Criterio: ninguna página lee `localStorage.getItem('auth_token')` ni arma `Authorization` a mano.

**T4 — QA (didactifonis-qa)**
- Pruebas de flujo: login→navegar 15+min→refresh transparente; logout real; reuse-detection; CORS con credentials; recarga restaura sesión.
- Verificar que no quedan fetch directos al token en localStorage.

**T5 — Security (didactifonis-security, solo reporta)**
- Auditar: flags de cookie correctos por entorno; no se loguean secretos; hash (no plano) en BD; retención de `ip`/`userAgent` conforme a Ley 21.719; revocación efectiva.

---

## 7. Referencias internas
- Auth actual: `server/controllers/authController.js`, `server/middleware/auth.js`, `server/routes/auth.js`
- Cliente: `client/src/context/AuthContext.jsx`, `client/src/pages/Login.jsx`, `client/src/config.js`
- CORS: `server/index.js:32-35`
- Compliance: `docs/marco-legal.md`, `CLAUDE.md` §6
