# Mini-spec — Contacto de la Landing vía Resend

> Estado: aprobado para implementación (2026-06-18). Parte de Tanda 2 (cierre de
> plataforma), Fase 1. Decisión del usuario: servicio transaccional **Resend**.
> Fase 2 (JWT refresh B3) es independiente y NO se arranca aquí.

## 1. Objetivo

El formulario de contacto de la landing (`landing/src/pages/ContactPage.jsx`) hoy valida
en cliente pero su submit solo hace `setSubmitted(true)` — no envía nada. Esta fase
conecta ese formulario a un endpoint real del backend que envía un correo transaccional
vía Resend al buzón de soporte.

Frontera de responsabilidad:
- **Landing** (público, sin auth): captura nombre, email, motivo, mensaje y los POSTea.
- **Server** (`/server`): valida, aplica rate-limit/anti-spam y envía vía Resend.

## 2. Contrato del endpoint

```
POST /api/contact
Content-Type: application/json
(sin autenticación — endpoint público)

Body:
{
  "nombre":  string,  // requerido, 1..120 chars tras trim
  "email":   string,  // requerido, formato email válido, <=160 chars
  "motivo":  string,  // requerido, debe ser uno del enum cerrado (ver §3)
  "mensaje": string,  // requerido, 1..2000 chars tras trim
  "website": string   // OPCIONAL — honeypot anti-bot. Si viene con valor => descartar.
}

Respuestas:
200 { "ok": true }                      // aceptado y enviado (o aceptado-y-encolado)
400 { "message": "<detalle validación>" } // body inválido
429 { "message": "Demasiados mensajes. Intenta nuevamente en unos minutos." }
502 { "message": "No se pudo enviar el mensaje. Intenta más tarde." } // fallo Resend
```

Notas de contrato:
- El honeypot `website` debe quedar oculto en el form (no es un campo que un humano vea).
  Si llega no vacío, el server responde **200 `{ ok: true }`** sin enviar nada (no le
  damos pistas al bot). Esta es la única excepción al "200 = enviado".
- Enum de `motivo` cerrado, alineado con las opciones del select de la UI:
  `saber-mas`, `fonoaudiologo`, `problema-tecnico`, `otro`.
- El endpoint no persiste en BD. Es fire-and-forward al correo. (Si en el futuro se quiere
  registro/auditoría de contactos, es otra tarea — ver §8.)

## 3. Validación (servidor, autoritativa)

La validación de cliente es UX; la del servidor es la barrera real. Reglas:

| Campo | Regla |
|---|---|
| `nombre` | requerido; `trim()` no vacío; longitud 1..120 |
| `email` | requerido; regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; longitud <=160 |
| `motivo` | requerido; ∈ { `saber-mas`, `fonoaudiologo`, `problema-tecnico`, `otro` } |
| `mensaje` | requerido; `trim()` no vacío; longitud 1..2000 |
| `website` | opcional; si presente y no vacío => honeypot disparado |

Todo campo string se normaliza con `trim()`. El body excedente se ignora (no se reenvía
al correo lo que no esté en el contrato). El límite global de body de 10kb de `index.js`
ya cubre este endpoint (mensaje cap 2000 chars cabe de sobra).

## 4. Integración con Resend

Decisión de implementación a tomar por backend, justificada en el spec:
- **Preferencia: `fetch` a la API REST de Resend** (`POST https://api.resend.com/emails`
  con `Authorization: Bearer <RESEND_API_KEY>`), sin añadir el SDK `resend` como
  dependencia. Razón: Node del proyecto ya usa `fetch` global, evitamos una dependencia
  más en `server/package.json` para una sola llamada, y el contrato REST de Resend es
  estable y simple. Si backend juzga que el SDK aporta (reintentos, tipados), puede usarlo
  y justificarlo — pero por defecto, fetch.

Payload a Resend:
```
from:    RESEND_FROM        (ej. "Didactifonis <contacto@midominio.cl>")
to:      CONTACT_TO         (buzón de soporte — DATO QUE DEBE PROVEER EL USUARIO)
reply_to: <email del visitante>   // para poder responder directo
subject: "[Contacto landing] <motivo legible> — <nombre>"
text/html: cuerpo con nombre, email, motivo y mensaje (escapar el contenido en html)
```

`reply_to` con el email del visitante es clave: el correo llega desde el dominio propio
(requisito de Resend) pero responder va directo al visitante.

## 5. Variables de entorno (patrón existente: `process.env.*` + dotenv)

Nuevas vars en `server/.env.example` y documentadas en
`docs/despliegue-variables-entorno.md`:

| Variable | Obligatoria en prod | Descripción |
|---|---|---|
| `RESEND_API_KEY` | sí | API key de Resend. **Secreto** — nunca en código ni logs. |
| `RESEND_FROM` | sí | Remitente verificado en Resend, sobre dominio verificado (ej. `Didactifonis <contacto@midominio.cl>`). |
| `CONTACT_TO` | sí | Buzón de destino de los contactos (DATO A PROVEER POR EL USUARIO). |

Comportamiento ante config faltante:
- Si falta cualquiera de las tres en **producción**: el endpoint responde 502 y loguea un
  `[CONFIG]` claro (sin volcar la key). No se cae el server.
- En **desarrollo** sin config: el endpoint puede operar en "modo log" (loguea que
  enviaría el correo y responde 200) para no bloquear el desarrollo local. Backend decide
  si implementa el modo log o simplemente 502; documentarlo.

Nueva var en `landing/.env.example` + doc (patrón `import.meta.env.VITE_*` con fallback,
igual que `VITE_APP_URL`):

| Variable | Obligatoria en prod | Descripción |
|---|---|---|
| `VITE_API_URL` | sí | URL del backend de la API al que la landing POSTea el contacto (ej. `https://api.midominio.cl`). Fallback dev: `http://localhost:3001`. |

## 6. Rate-limit / anti-spam

Patrón ya existente en `index.js`: `express-rate-limit` por-router (ver `authLimiter`).
Replicar con un `contactLimiter` dedicado, más estricto que el global:
- Ventana: 15 min. Máximo: **5** envíos por IP. (Un humano no contacta más de eso.)
- `message`: `{ message: 'Demasiados mensajes. Intenta nuevamente en unos minutos.' }`
- Montar como `app.use('/api/contact', contactLimiter, contactRouter)`.
- El honeypot `website` es la segunda capa (descarta bots simples sin gastar cuota Resend).

CORS: el endpoint debe ser alcanzable desde el origen de la landing. `index.js` ya tiene
CORS por `CORS_ORIGIN` (lista separada por comas). El origen de la landing de producción
debe estar incluido en `CORS_ORIGIN`. Documentarlo (no es var nueva, es nota operativa).

## 7. Manejo de errores

- Validación fallida => 400 con `message` legible (el frontend lo muestra como error).
- Honeypot disparado => 200 `{ ok: true }` sin enviar.
- Fallo de Resend (red, 4xx/5xx de su API, config faltante en prod) => 502; loguear el
  detalle en servidor SIN exponer la API key ni el cuerpo de la respuesta de Resend al
  cliente. El cliente solo ve el `message` genérico.
- Todo error pasa por el error-handler global de `index.js` o se responde inline; en
  cualquier caso la respuesta es siempre JSON `{ message }`, nunca HTML ni stack.

## 8. Fuera de alcance (explícito)

- Persistencia/auditoría de contactos en BD.
- CAPTCHA (el honeypot + rate-limit cubren el MVP; CAPTCHA es escalable después).
- Notificación de confirmación al visitante (auto-reply). Solo se notifica a soporte.
- Cualquier cambio de copy/diseño de `ContactPage` más allá de loading/error states.

## 9. Reglas de negocio / legales que tocan esta tarea

- **Datos personales de un adulto** (nombre + email del visitante), NO de menor. Aun así
  aplica Ley 21.719: finalidad limitada (responder el contacto), no compartir con
  terceros. La `ContactPage` ya muestra esa nota de privacidad (líneas 258-266). Security
  revisa la base legal del tratamiento.
- No se tratan datos de salud aquí. No hay rol/RBAC (endpoint público).
- design-system: el frontend NO introduce neones/glows; usa tokens y tipografías
  Poppins/Nunito Sans existentes. El cambio es solo de estado (loading/error), conservando
  el estado `submitted` actual.
