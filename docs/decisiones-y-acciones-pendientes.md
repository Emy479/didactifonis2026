# Decisiones y acciones pendientes — Didactifonis

> Estado a **2026-06-18**. El **cierre de plataforma como software está terminado**
> (Tandas 1, 2 y 3 mergeadas a master `f0e5daa`; suite server 142/142 verde). Lo que
> queda en este documento **no es desarrollo de plataforma**, sino decisiones de negocio,
> acciones de configuración y trabajo legal que dependen de ti (Emiliano) antes de abrir
> a usuarios reales.
>
> Documentos relacionados: `docs/checklist-despliegue.md` (pasos operativos de deploy),
> `docs/despliegue-variables-entorno.md` (referencia de variables), `docs/marco-legal.md`
> (informe legal, fuente autoritativa), `docs/adr-jwt-refresh-b3.md` (modelo de sesión).

## Cómo leer este documento

Cada ítem tiene: **qué es**, **por qué importa**, y o bien una **acción** concreta o una
**decisión** que tomar. Prioridad:

- 🔴 **Bloquea producción** — no se puede abrir a usuarios reales sin resolverlo.
- 🟠 **Bloquea marcha blanca con datos reales de menores** — técnico OK, falta cobertura legal/operativa.
- 🟡 **Recomendado / mejora** — no bloquea, pero conviene.

---

## 1. Configuración de despliegue (acciones tuyas)

### 1.1 🔴 Servicio de correo (Resend) para el formulario de contacto
**Qué es.** El contacto de la landing ya envía vía Resend a través de un endpoint propio,
pero Resend no manda nada hasta que configures la cuenta.
**Acción.**
1. Crear cuenta en [resend.com](https://resend.com) y generar `RESEND_API_KEY`.
2. Verificar tu dominio en Resend (registros DNS: SPF/DKIM/DMARC). Sin dominio verificado
   no se entrega correo.
3. Definir `RESEND_FROM` (remitente sobre el dominio verificado, ej. `Didactifonis <contacto@tudominio.cl>`)
   y `CONTACT_TO` (buzón que recibe los mensajes, ej. `soporte@tudominio.cl`).
**Sugerencia.** Usa como `CONTACT_TO` la misma casilla de soporte que ya muestra la
landing, para coherencia. En desarrollo el endpoint opera en "modo-log" (responde 200 sin
enviar), así que puedes probar el flujo sin cuenta de Resend.

### 1.2 🔴 Secreto JWT y entorno de producción
**Qué es.** El nuevo modelo de sesión (B3) exige un `JWT_SECRET` fuerte y `NODE_ENV=production`.
**Acción.**
- `JWT_SECRET`: cadena aleatoria ≥ 32 caracteres (ej. `openssl rand -base64 48`). **No hay
  fallback inseguro**: si falta en prod, el servidor falla ruidosamente (a propósito).
- `NODE_ENV=production`: imprescindible — solo con esto la cookie de refresh se marca
  `Secure` (no viaja por HTTP plano).
- Vidas de token: defaults `ACCESS_TOKEN_TTL=15m` y `REFRESH_TOKEN_TTL=14d` (decididos).
  Solo cámbialos si tienes una razón.
**Sugerencia.** Guarda el secreto en el gestor de secretos del hosting, nunca en el repo.
Rotarlo invalida todas las sesiones (re-login global) — úsalo si sospechas filtración.

### 1.3 🔴 Topología de orígenes y CORS
**Qué es.** Cliente, API y juegos deben quedar en orígenes coherentes con la config.
**Decisión ya tomada.** Mismo sitio (mismo dominio) → cookie `SameSite=Strict`. Si en el
futuro separas cliente y API en dominios distintos (cross-site), hay que cambiar a
`SameSite=None; Secure` y revisar CORS con credenciales.
**Acción.** Definir los 3 orígenes (`app`, `api`, `juegos`) y reflejarlos en `CORS_ORIGIN`,
`VITE_API_URL`, `VITE_APP_URL`, `CLIENT_ORIGIN`, `GAME_PUBLIC_ORIGIN`
(ver `docs/despliegue-variables-entorno.md`).
**Sugerencia.** `app.tudominio.cl`, `api.tudominio.cl`, `juegos.tudominio.cl`. Los bundles
de juego **deben** ir en un origen distinto al de la API (aislamiento de seguridad).

### 1.4 🟡 Hosting con Node + MongoDB
**Qué es.** El stack corre procesos Node y Mongo; un hosting compartido tipo PHP no sirve.
**Decisión.** Elegir VPS / plataforma con soporte Node (Render, Railway, Fly.io, un VPS
propio, etc.) y MongoDB gestionado (Atlas) o autoalojado.
**Sugerencia.** MongoDB Atlas (tier gratuito para empezar) evita administrar la base. El
`GAME_STORAGE_DIR` necesita **disco persistente** — verifícalo en el hosting elegido.

---

## 2. Cumplimiento legal y privacidad (antes de datos reales de menores)

> Fuente autoritativa: `docs/marco-legal.md`. Normativa: **Ley 21.719** (Chile), vigencia
> **1-dic-2026**, alineada a GDPR. Se tratan datos de salud de menores = datos sensibles.

### 2.1 🟠 Política de privacidad — datos recolectados
**Qué es.** Hay dos puntos donde se recolectan datos personales que la política debe cubrir:
- **Formulario de contacto** (nombre + email de adultos) — y que el correo transita por
  **Resend** (encargado de tratamiento, servidor en EE.UU.).
- **Sesiones** — el modelo B3 guarda `ip` y `userAgent` por sesión (seguridad/detección de
  reuso), bajo expiración (TTL).
**Acción.** Redactar/actualizar la política de privacidad enlazada en `/privacidad`
declarando ambas recolecciones, su finalidad y su plazo de retención.
**Sugerencia.** Que lo revise el abogado que produjo `docs/marco-legal.md`.

### 2.2 🟠 Base legal del tratamiento del contacto
**Decisión (jurídica).** Definir la base legal del formulario de contacto: interés
legítimo vs consentimiento explícito. Security lo elevó como decisión de abogado.

### 2.3 🟠 Contrato de encargo de tratamiento con Resend
**Qué es.** Resend procesa datos personales por cuenta tuya y hay transferencia
internacional (EE.UU.).
**Acción.** Firmar el DPA (Data Processing Agreement) que ofrece Resend y registrar la
transferencia internacional conforme a la Ley 21.719.

### 2.4 🟠 Auditoría Ley 21.719 antes de producción
**Acción.** Auditoría de seguridad y cumplimiento completa antes de abrir a usuarios reales
con datos de menores (consentimiento informado del tutor, finalidad limitada, RBAC,
registro clínico de Capa 2). Sigue siendo un bloqueante externo del proyecto.

### 2.5 🟡 Minimización de datos en sesiones
**Sugerencia (no bloquea).** Mejora diferible registrada por security: nullificar
`ip`/`userAgent` de la sesión al revocarla, para minimizar datos retenidos. Pequeño cambio
de backend para una próxima iteración.

---

## 3. Integraciones externas pendientes (negocio)

### 3.1 🔴 Pago real — Transbank (Fase 2B)
**Qué es.** El pago está detrás de adaptadores con `PAYMENT_PROVIDER=mock` y
`DEMO_MODE`/cobro simulado.
**Acción.** Afiliarte a Transbank (Webpay), implementar el adaptador real y poner
`PAYMENT_PROVIDER` en el proveedor real + `DEMO_MODE=false`. Hasta entonces no hay cobro
real y la suscripción no se puede monetizar.

### 3.2 🔴 Emisión de boleta/factura — emisor DTE (Fase 2C)
**Decisión + acción.** Elegir emisor DTE (documento tributario electrónico) e integrarlo
para emitir comprobantes de las suscripciones. Requisito legal/tributario para cobrar en
Chile.

---

## 4. Producto / contenido (decisiones abiertas)

### 4.1 🟡 Engine de juegos — reanudar o mantener pausado
**Estado.** E3 cerrado técnicamente; Engine **pausado** (no abandonado). Quedan 4
decisiones abiertas para una versión publicable (arte/audio definitivos, uso de Rive,
personaje guía, manejo de partidas abandonadas — ver `docs/plan-sdk-engine-juegos.md`).
**Decisión.** Cuándo reanudarlo. Sin juegos reales subidos, la plataforma funciona pero
las actividades para el niño son placeholders.

### 4.2 🟡 Secciones Admin marcadas "Próximo"
**Qué es.** Pagos, Reportes, Contenido, Soporte y Configuración en el panel Admin son
placeholders intencionales (v2), correctamente bloqueados.
**Decisión.** Priorizar cuáles implementar para v2 (p. ej. "Pagos" cobra sentido junto con
Transbank; "Contenido" junto con la subida real de juegos).

### 4.3 🟡 Recursos de muestra de la landing
**Qué es.** `ResourcesPage` muestra actividades de ejemplo ilustrativas (sin botón de
jugar; CTA a registro). No engañan, pero los juegos reales aún no existen.
**Sugerencia.** Dejar como está mientras el Engine esté pausado; cuando haya juegos reales,
reemplazar los mocks por contenido real o añadir un sello "ejemplos ilustrativos" si
prefieres ser conservador.

---

## 5. Resumen de lo que SÍ está cerrado (no requiere acción)

- ✅ Config de producción del cliente centralizada (`client/src/config.js`).
- ✅ Subida de bundles de juego (upload ZIP) con endurecimiento de seguridad.
- ✅ Tanda 2 completa: validación de terapias, paginación de mensajes, auto-refresh
  (polling) del chat, contacto de la landing vía Resend, y **JWT refresh B3** (access en
  memoria + refresh en cookie httpOnly con rotación y revocación).
- ✅ Tanda 3: health check ya no expone `NODE_ENV`; resto de ítems menores confirmados
  sanos/intencionales.
- ✅ Suite server 142/142; master pusheado a GitHub (`Emy479/didactifonis2026`, `f0e5daa`).
