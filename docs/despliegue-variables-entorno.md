# Despliegue — Variables de entorno

> Referencia única de las variables que hay que definir para desplegar Didactifonis a
> producción. En desarrollo todo funciona con los defaults del código; en producción
> **deben** configurarse las que aquí se marcan como obligatorias, o la app apuntará a
> `localhost`. Las plantillas viven en `server/.env.example`, `client/.env.example` y
> `landing/.env.example`.

## 1. Servidor (`/server`) — `.env`

| Variable | Obligatoria en prod | Descripción |
|---|---|---|
| `NODE_ENV` | sí | `production` |
| `PORT` | sí | Puerto de la API (ej. 3001) |
| `MONGODB_URI` | sí | Cadena de conexión a MongoDB |
| `JWT_SECRET` | sí | Secreto de firma JWT (largo y aleatorio) |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `CORS_ORIGIN` | sí | Origen del cliente permitido por CORS (ej. `https://app.midominio.cl`) |
| `DEMO_MODE` | sí | `false` en producción (nunca bypassear pago en prod) |
| `PAYMENT_PROVIDER` | sí | `mock` hasta integrar Transbank (ver decisiones D2) |
| `CLIENT_ORIGIN` | sí | Origen del cliente para `frame-ancestors` del servido de bundles (ej. `https://app.midominio.cl`) |
| `GAME_PUBLIC_PORT` | sí | Puerto del listener dedicado que sirve los bundles de juego (ej. 3002) |
| `GAME_PUBLIC_ORIGIN` | sí | Origen público de los bundles. **Debe ser un origen distinto al de la API** (aislamiento de seguridad A1). En producción: un subdominio servido por reverse-proxy hacia `GAME_PUBLIC_PORT`, ej. `https://juegos.midominio.cl` |
| `GAME_STORAGE_DIR` | recomendada | Ruta en disco persistente donde se almacenan los bundles descomprimidos. Default: `server/storage-data/game-bundles` (válido en VPS con disco persistente) |
| `BUNDLE_MAX_ZIP_BYTES` / `BUNDLE_MAX_FILES` / `BUNDLE_MAX_FILE_BYTES` / `BUNDLE_MAX_TOTAL_BYTES` | no | Límites de subida de bundle; defaults en código (50MB / 2000 / 50MB / 200MB) |
| `RESEND_API_KEY` | sí (si se usa el contacto de la landing) | API key de Resend para el envío del formulario de contacto. **Secreto** — nunca en código ni logs. |
| `RESEND_FROM` | sí (idem) | Remitente verificado en Resend, sobre dominio verificado (ej. `Didactifonis <contacto@midominio.cl>`). |
| `CONTACT_TO` | sí (idem) | Buzón de destino de los mensajes del formulario de contacto (ej. `soporte@midominio.cl`). |

## 2. Cliente / plataforma (`/client`) — `.env`

| Variable | Obligatoria en prod | Descripción |
|---|---|---|
| `VITE_API_URL` | sí | URL del backend de la API (ej. `https://api.midominio.cl`). Se inyecta en **tiempo de build** (Vite). Único punto de resolución: `client/src/config.js`. Si no se define, cae a `http://localhost:3001`. |

## 3. Landing (`/landing`) — `.env`

| Variable | Obligatoria en prod | Descripción |
|---|---|---|
| `VITE_APP_URL` | sí | URL de la app/plataforma a la que enlaza la landing (Acceder / Registrarse), ej. `https://app.midominio.cl`. Se inyecta en build. Si no se define, cae a `http://localhost:5173`. |
| `VITE_API_URL` | sí | URL del backend de la API al que la landing POSTea el formulario de contacto (ej. `https://api.midominio.cl`). Se inyecta en build. Si no se define, cae a `http://localhost:3001`. |

> **Nota CORS para el contacto de la landing:** el origen de la landing en producción
> debe estar incluido en `CORS_ORIGIN` del servidor para que `POST /api/contact` sea
> alcanzable desde la landing.

## 4. Topología de orígenes recomendada (producción)

Tres orígenes distintos, por separación de responsabilidades y por el aislamiento de
seguridad del servido de juegos (los bundles son HTML/JS subido por el Admin y **no deben**
compartir origen con la API):

- `https://app.midominio.cl` — plataforma React (`/client`) y/o landing.
- `https://api.midominio.cl` — API Express (`/server`).
- `https://juegos.midominio.cl` — bundles de juego (reverse-proxy → `GAME_PUBLIC_PORT`).

Hoy el proyecto corre Node + MongoDB, así que el hosting debe permitir procesos Node y
Mongo (VPS o equivalente; un hosting compartido tipo PHP no sirve).

## 5. Pendientes externos que afectan el despliegue

- **Transbank / emisor DTE**: el pago real está detrás de adaptadores; hasta afiliar
  Transbank y elegir emisor DTE, `PAYMENT_PROVIDER=mock` (ver `docs/decisiones.md` D2).
- **Ley 21.719** (vigencia 1-dic-2026): auditoría de seguridad completa antes de producción
  con datos reales de menores.
