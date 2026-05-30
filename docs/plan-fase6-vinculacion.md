# Plan — Fase 6: Vinculación Profesional-Tutor

**Fecha:** 2026-05-30
**Arquitecto:** didactifonis-architect
**Estado:** En ejecución

---

## Objetivo de negocio

Implementar el flujo completo de vinculación profesional↔tutor/niño (spec §5.3) con
consentimiento explícito del tutor, y activar la mensajería condicional al vínculo (spec §10).

Este es el punto más sensible del proyecto desde el punto de vista de datos de menores
(spec §5.2, §13): todo acceso concedido debe ser explícito, registrado y revocable.

---

## Alcance de la Fase 6

### Dentro del alcance

1. **Modelo Invitation** — token de invitación que genera el profesional para un niño específico.
2. **Flujo de vínculo por código** (vía principal): profesional genera → tutor acepta o rechaza.
3. **Directorio de profesionales** (vía secundaria): tutor busca y solicita vínculo.
4. **Revocación del vínculo** — tutor puede revocar en cualquier momento.
5. **Registro de consentimiento de vínculo** — quién otorgó acceso, cuándo, IP, a quién.
6. **Modelo Message** y endpoints de mensajería Profesional↔Tutor (condicional al vínculo).
7. **UI panel profesional** — generar código/invitación, vista de vinculaciones activas.
8. **UI panel tutor** — ingresar código, aceptar/rechazar, ver profesionales vinculados, revocar.
9. **Sección Mensajes** en ambos paneles (solo activa si existe vínculo).

### Fuera del alcance

- Validación del número de registro profesional (spec §13 / anexo D — pendiente para versión posterior).
- Notificaciones push / email (no implementadas en ninguna fase previa).
- Exportación PDF (spec §8 — pendiente para Fase posterior).
- Comunidad/foro (spec §11 — pendiente para Fase posterior).

---

## Reglas de negocio que rigen esta fase

1. El tutor debe **aceptar conscientemente** antes de que el profesional gane acceso. Sin silencioso, sin automático.
2. Al aceptar, el `userId` del profesional se agrega al array `accessGrants` del modelo `Child`.
3. Todo acceso se **registra**: quién lo concede, a quién, cuándo, con qué alcance.
4. Todo acceso debe ser **revocable** de forma simple e inmediata por el tutor.
5. La mensajería solo existe si hay vínculo activo. No se muestra la sección si no hay vínculo.
6. La mensajería **no puede convertirse en canal de prescripción**: los mensajes son para coordinación, no para recomendación terapéutica automatizada.
7. La Capa 2 (notas/observaciones clínicas del profesional) **NO se construye en esta fase** — solo la infraestructura de vínculo y la mensajería (Capa 1).
8. El consentimiento debe cumplir los requisitos de la Ley 21.719: explícito, informado, registrado con fecha + IP + versión.

---

## Decisiones de arquitectura para esta fase

### A. Modelo Invitation

```
Invitation {
  _id
  professionalId     → User (role=profesional)
  childId            → Child (el niño para el que se genera)
  tutorId            → User (role=tutor, propietario del niño — se obtiene del niño)
  token              string, único, seguro (crypto.randomBytes → hex)
  status             enum: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
  expiresAt          Date (48 horas desde creación)
  consentRecord {
    acceptedAt       Date
    ip               string
    version          string  (versión del texto de consentimiento)
  }
  createdAt / updatedAt
}
```

Índices: `token` (único), `professionalId`, `childId`, `tutorId`, `status`.

### B. Modelo Message

```
Message {
  _id
  linkId             → Invitation (el vínculo que autoriza la conversación)
  senderId           → User
  receiverId         → User
  content            string, max 2000 chars
  readAt             Date | null
  createdAt / updatedAt
}
```

Índices: `linkId`, `senderId`, `receiverId`.

**Restricción:** solo puede enviarse mensaje si existe una Invitation con `status='accepted'`
que incluya a ambos usuarios (profesional y tutor del niño).

### C. Revocación del vínculo

- El tutor llama a `DELETE /api/link/:invitationId`.
- El backend: (a) cambia `status` de la Invitation a `'revoked'`, (b) elimina el `professionalId`
  del array `accessGrants` del Child correspondiente.
- La revocación invalida la mensajería (los mensajes históricos se conservan, pero no se pueden
  enviar nuevos).
- El endpoint está protegido: solo el tutor propietario del niño puede revocar.

### D. Directorio de profesionales (vía secundaria)

- `GET /api/professionals/directory` — lista profesionales activos con suscripción vigente.
- Devuelve: nombre, especialidad (si se añade al perfil), ciudad (si se añade), estado de suscripción.
- El tutor selecciona uno y envía una solicitud: se crea una Invitation con sentido inverso
  (tutor solicita, profesional acepta o rechaza).
- **Nota para backend:** el directorio requiere agregar campos opcionales al modelo User
  (specialty, city) — solo para el rol profesional. Hacerlo como subdocumento `professionalProfile`.

### E. Versión del texto de consentimiento

- Hardcodear `'v1.0'` en el backend. Cuando el texto de T&C cambie, se incrementa manualmente.
- No construir sistema de versionado de textos en esta fase.

---

## Subtareas y agentes responsables

### Subtarea B1 — Backend: modelos y endpoints de invitación/vínculo

**Agente:** `didactifonis-backend`

**Entregables:**
- `server/models/Invitation.js` — schema Mongoose según spec anterior.
- `server/models/Message.js` — schema Mongoose según spec anterior.
- `server/routes/link.js` — montado en `/api/link`. Endpoints:
  - `POST /api/link/invite` (profesional): genera Invitation para un niño de su lista de pacientes o para un niño nuevo por código. Devuelve token.
  - `GET /api/link/invitations` (profesional): sus invitaciones pendientes/aceptadas.
  - `POST /api/link/accept` (tutor): body `{ token, consentVersion, childId }`. Valida token, registra consentimiento, agrega a accessGrants, cambia status a 'accepted'.
  - `POST /api/link/reject` (tutor): body `{ token }`. Cambia status a 'rejected'.
  - `DELETE /api/link/:invitationId` (tutor): revoca vínculo activo. Solo si es tutor del niño.
  - `GET /api/link/my-links` (tutor): vínculos activos del tutor (profesionales que tienen acceso a sus niños).
- `server/routes/directory.js` — montado en `/api/professionals`. Endpoints:
  - `GET /api/professionals/directory` (tutor): listado de profesionales activos.
  - `POST /api/professionals/request` (tutor): tutor solicita vínculo con un profesional (genera Invitation inversa, pendiente de aceptación del profesional).
  - `GET /api/professionals/incoming` (profesional): solicitudes de tutores pendientes de aceptación.
  - `POST /api/professionals/respond` (profesional): acepta o rechaza solicitud de tutor.
- `server/routes/messages.js` — montado en `/api/messages`. Endpoints:
  - `GET /api/messages/:invitationId` (tutor o profesional del vínculo): historial de mensajes.
  - `POST /api/messages` (tutor o profesional del vínculo): enviar mensaje. Body: `{ invitationId, content }`.
  - `PATCH /api/messages/read/:invitationId` (receptor): marca mensajes como leídos.
- Registrar los tres routers en `server/index.js`.
- RBAC estricto en todos los endpoints: verificar que el usuario autenticado sea parte del vínculo.

**Criterios de aceptación B1:**
- El token de invitación expira a las 48 horas.
- `POST /api/link/accept` registra `consentRecord.acceptedAt`, `consentRecord.ip` (de `req.ip`), `consentRecord.version`.
- `DELETE /api/link/:invitationId` elimina al profesional de `accessGrants` del Child.
- Un profesional no puede leer mensajes de un vínculo donde no es parte.
- Un tutor no puede revocar el vínculo de otro tutor.
- El directorio solo devuelve profesionales con `isActive: true` y suscripción `active` o `trial` vigente.

### Subtarea F1 — Frontend: flujo de invitación en panel profesional

**Agente:** `didactifonis-frontend`

**Contexto visual:** `referencias/Pro_Mensajes.png`, `referencias/Pro_Pacientes_v1.png`.

**Entregables:**
- `client/src/pages/pro/VinculacionPro.jsx` — nueva vista en el sidebar del profesional.
  - Lista de vínculos activos (pacientes vinculados con su tutor).
  - Botón "Generar código de invitación": modal que pide el niño (si ya es paciente) o permite invitar a uno nuevo. Muestra el token generado en formato copiable + QR opcional (sin librería extra, solo texto).
  - Lista de invitaciones pendientes (emitidas por el profesional), con estado y tiempo restante.
  - Lista de solicitudes entrantes de tutores (via directorio) con botones Aceptar/Rechazar.
- `client/src/pages/pro/MensajesPro.jsx` — chat Profesional↔Tutor.
  - Lista de conversaciones (una por vínculo activo).
  - Vista de mensajes de la conversación seleccionada, con campo de envío.
  - Si no hay vínculos activos: estado vacío con mensaje explicativo.
  - Referencia visual exacta: `referencias/Pro_Mensajes.png`.
- Integrar ambas vistas en el sidebar de `DashboardPro.jsx` (reemplazar ítems "Próximamente" de Mensajes y Vinculación si existen, o añadir).

**Criterios de aceptación F1:**
- El token generado es visible y copiable con un click.
- El estado de cada invitación (pendiente / aceptada / rechazada / expirada) es visible.
- El chat solo renderiza si hay vínculos activos.
- Sin gamificación, sin colores lúdicos. Panel limpio y técnico según design-system.md.
- Revisión visual contra `referencias/Pro_Mensajes.png` antes del commit.

### Subtarea F2 — Frontend: flujo de aceptación en panel tutor

**Agente:** `didactifonis-frontend`

**Contexto visual:** `referencias/Tut_Mensajes.png`, `referencias/Tut_Dashboard.png`.

**Entregables:**
- `client/src/pages/tutor/VinculacionTutor.jsx` — nueva vista en el sidebar del tutor.
  - Campo para ingresar código de invitación recibido del profesional + botón "Vincularme".
  - Modal de consentimiento explícito antes de aceptar: texto claro sobre qué acceso concede, con botón "Acepto y confirmo" y botón "Cancelar".
  - Lista de profesionales vinculados por niño, con botón "Revocar acceso" (confirmación antes de revocar).
  - Sección de directorio: buscador de profesionales, cards con nombre y especialidad, botón "Solicitar vinculación".
- `client/src/pages/tutor/MensajesTutor.jsx` — chat Tutor↔Profesional.
  - Lista de conversaciones (una por vínculo activo).
  - Vista de mensajes con campo de envío.
  - Si no hay vínculos: estado vacío con CTA para vincular profesional.
  - Referencia visual exacta: `referencias/Tut_Mensajes.png`.
- Integrar ambas vistas en `DashboardTutor.jsx`.

**Criterios de aceptación F2:**
- El modal de consentimiento es un paso obligatorio — no se puede aceptar sin pasar por él.
- La revocación pide confirmación explícita antes de ejecutar.
- El chat solo aparece si hay vínculos activos. Si no hay, se muestra el CTA de vincular.
- Revisión visual contra `referencias/Tut_Mensajes.png` antes del commit.

---

## Orden de ejecución

1. **B1 primero.** El frontend depende de los endpoints y de los modelos.
2. **F1 y F2 en paralelo** una vez que B1 esté integrado y verificado por el arquitecto.
3. **Revisión visual** antes del commit final de cada subtarea frontend.
4. **Commit único por subtarea**, mensaje descriptivo.

---

## Checklist de cierre de fase

- [ ] Modelo Invitation implementado y testeado manualmente.
- [ ] Modelo Message implementado.
- [ ] Endpoints de invitación (generar, aceptar, rechazar, revocar) funcionando con RBAC correcto.
- [ ] Directorio de profesionales operativo.
- [ ] Endpoints de mensajería con verificación de vínculo activo.
- [ ] UI profesional: VinculacionPro + MensajesPro comparadas contra referencias.
- [ ] UI tutor: VinculacionTutor + MensajesTutor comparadas contra referencias.
- [ ] Modal de consentimiento en flujo del tutor implementado.
- [ ] `server/index.js` actualizado con los tres nuevos routers.
- [ ] `App.jsx` o rutas actualizado si se añaden rutas nuevas.
- [ ] Memoria del arquitecto actualizada.
