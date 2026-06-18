# Checklist de despliegue — Didactifonis

> Pasos operativos para llevar la plataforma a producción. Marca cada casilla al
> completarla. El detalle de cada variable está en `docs/despliegue-variables-entorno.md`;
> las decisiones de negocio/legales que algunos pasos requieren están en
> `docs/decisiones-y-acciones-pendientes.md`.
>
> Estado del código: cierre de plataforma terminado (master `f0e5daa`, suite 142/142).
> Este checklist asume que **no** hay más desarrollo pendiente de la plataforma.

## Leyenda
- ⬜ por hacer · ✅ hecho
- 🔴 imprescindible para abrir a usuarios · 🟡 recomendado

---

## Fase A — Infraestructura

- ⬜ 🔴 Elegir hosting con soporte **Node.js** (VPS / Render / Railway / Fly.io…). Hosting
  compartido tipo PHP **no** sirve.
- ⬜ 🔴 Aprovisionar **MongoDB** (Atlas gestionado recomendado, o autoalojado). Anotar la
  cadena de conexión.
- ⬜ 🔴 Verificar **disco persistente** para `GAME_STORAGE_DIR` (los bundles de juego se
  guardan descomprimidos en disco; un FS efímero los perdería en cada deploy).
- ⬜ 🔴 Registrar el **dominio** y crear los 3 subdominios de la topología:
  - ⬜ `app.tudominio.cl` → plataforma React (`/client`) y/o landing
  - ⬜ `api.tudominio.cl` → API Express (`/server`)
  - ⬜ `juegos.tudominio.cl` → bundles de juego (reverse-proxy → `GAME_PUBLIC_PORT`)
- ⬜ 🔴 Emitir **certificados TLS/HTTPS** para los 3 orígenes (la cookie de refresh es
  `Secure`: sin HTTPS no hay sesión en prod).

## Fase B — Secretos y variables de entorno

> Referencia completa: `docs/despliegue-variables-entorno.md`.

- ⬜ 🔴 `JWT_SECRET` — generar aleatorio ≥ 32 chars (`openssl rand -base64 48`) y guardarlo
  en el gestor de secretos del hosting (nunca en el repo).
- ⬜ 🔴 `NODE_ENV=production` (activa `Secure` en la cookie de refresh).
- ⬜ 🔴 `MONGODB_URI` — cadena de conexión a la base aprovisionada.
- ⬜ 🔴 `PORT` y `GAME_PUBLIC_PORT` — puertos de la API y del listener de juegos (distintos).
- ⬜ 🔴 `CORS_ORIGIN` — origen(es) del cliente y de la landing permitidos (incluir la
  landing para que `POST /api/contact` funcione).
- ⬜ 🔴 `GAME_PUBLIC_ORIGIN` y `CLIENT_ORIGIN` — origen de juegos (distinto de la API) y
  origen del cliente para `frame-ancestors`.
- ⬜ 🔴 `DEMO_MODE=false` y `PAYMENT_PROVIDER` — `mock` hasta integrar Transbank (ver Fase F).
- ⬜ 🟡 `ACCESS_TOKEN_TTL=15m` / `REFRESH_TOKEN_TTL=14d` — solo si quieres cambiar los
  defaults (ya decididos).
- ⬜ 🟡 Eliminar `JWT_EXPIRES_IN` del `.env` (deprecada).
- **Build del cliente / landing (inyectadas en build, no en runtime):**
  - ⬜ 🔴 `VITE_API_URL` (client y landing) → `https://api.tudominio.cl`
  - ⬜ 🔴 `VITE_APP_URL` (landing) → `https://app.tudominio.cl`

## Fase C — Correo (formulario de contacto, Resend)

> Decisiones/acciones en `docs/decisiones-y-acciones-pendientes.md` §1.1.

- ⬜ 🔴 Crear cuenta en Resend y generar `RESEND_API_KEY`.
- ⬜ 🔴 Verificar el dominio en Resend (registros DNS SPF/DKIM/DMARC).
- ⬜ 🔴 `RESEND_FROM` — remitente verificado (ej. `Didactifonis <contacto@tudominio.cl>`).
- ⬜ 🔴 `CONTACT_TO` — buzón de soporte que recibe los mensajes.
- ⬜ 🟡 Enviar un mensaje de prueba real desde el formulario de la landing y confirmar
  recepción (y que el `reply_to` apunta al visitante).

## Fase D — Build y arranque

- ⬜ 🔴 Instalar dependencias en `/server`, `/client`, `/landing` (`npm ci`).
- ⬜ 🔴 Build de `/client` y `/landing` (`npm run build`) con las `VITE_*` de producción.
- ⬜ 🔴 Servir los estáticos de `/client` y `/landing` (CDN / Nginx / hosting estático).
- ⬜ 🔴 Arrancar la API (`/server`) como proceso gestionado (pm2 / systemd / runtime del
  hosting) con reinicio automático.
- ⬜ 🔴 Configurar el **reverse-proxy**: `api.` → API, `juegos.` → `GAME_PUBLIC_PORT`,
  `app.` → estáticos.
- ⬜ 🟡 Correr la suite del server en el entorno de despliegue (`cd server && node --test`)
  y confirmar 142/142 antes de exponer.

## Fase E — Verificación post-deploy (humo)

- ⬜ 🔴 `GET /health` responde `{status:'ok'}` (y **no** expone `NODE_ENV`).
- ⬜ 🔴 Registro + login de un usuario de prueba funciona; la respuesta trae `accessToken`
  y se setea la **cookie de refresh** (`HttpOnly; Secure; SameSite=Strict`).
- ⬜ 🔴 Refresh transparente: dejar expirar el access (15m) y confirmar que el cliente
  renueva sin re-login.
- ⬜ 🔴 Logout revoca la sesión (el refresh deja de funcionar tras logout).
- ⬜ 🔴 RBAC: cada rol (tutor / pro / niño-vía-tutor / admin) ve solo lo suyo.
- ⬜ 🔴 Subida de un bundle de juego (admin) y que se sirve desde `juegos.` (origen distinto
  a la API).
- ⬜ 🔴 Formulario de contacto entrega correo (Fase C).
- ⬜ 🟡 Probar en HTTPS real desde un navegador limpio (no localhost) que la cookie viaja.

## Fase F — Pagos (cuando se monetice)

> No bloquea un lanzamiento sin cobro, pero sí para suscripciones reales.

- ⬜ 🔴 Afiliación a **Transbank** (Webpay) e implementación del adaptador real.
- ⬜ 🔴 `PAYMENT_PROVIDER` = proveedor real, `DEMO_MODE=false`.
- ⬜ 🔴 Integrar **emisor DTE** para boletas/facturas de las suscripciones.
- ⬜ 🟡 Probar un cobro real de extremo a extremo en ambiente de pruebas de Transbank.

## Fase G — Legal / compliance (antes de datos reales de menores)

> Detalle en `docs/decisiones-y-acciones-pendientes.md` §2 y `docs/marco-legal.md`.

- ⬜ 🔴 Política de privacidad publicada y enlazada, declarando: datos del formulario de
  contacto (vía Resend, EE.UU.), e `ip`/`userAgent` de sesión.
- ⬜ 🔴 Definir la base legal del tratamiento del contacto (interés legítimo vs
  consentimiento).
- ⬜ 🔴 Firmar el **DPA** con Resend y registrar la transferencia internacional.
- ⬜ 🔴 Flujo de **consentimiento informado del tutor** para datos de menores operativo.
- ⬜ 🔴 Auditoría **Ley 21.719** completa (vigencia 1-dic-2026).
- ⬜ 🟡 Mejora de minimización: nullificar `ip`/`userAgent` al revocar sesión.

## Fase H — Operación continua

- ⬜ 🟡 Backups automáticos de MongoDB (con prueba de restauración).
- ⬜ 🟡 Monitoreo/alertas (uptime de la API, errores 5xx, espacio de disco de bundles).
- ⬜ 🟡 Logs centralizados sin secretos (verificar que no se loguean `JWT_SECRET`,
  `RESEND_API_KEY` ni tokens).
- ⬜ 🟡 Estrategia de actualización (deploy sin downtime / ventana de mantenimiento).

---

### Mínimo viable para un lanzamiento sin cobro
Fases **A, B, C, D, E** + el bloque legal de la **Fase G** referido al contacto y al
consentimiento. Pagos (F) y el resto de G pueden seguir después si el lanzamiento inicial
es gratuito / marcha blanca controlada.
