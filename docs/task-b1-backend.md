## Tarea: Fase 6 — Backend de Vinculación Profesional-Tutor (Subtarea B1)

Eres el agente backend de Didactifonis. Tu tarea está completamente acotada: implementar los modelos y endpoints de vinculación profesional-tutor para la Fase 6. No toques archivos fuera de los indicados.

## Contexto del proyecto

Stack: Node.js + Express + MongoDB (Mongoose). Directorio de trabajo: C:\Didactifonis2026.

### Archivos relevantes que debes leer primero
- C:\Didactifonis2026\server\models\Child.js — tiene el campo accessGrants que debes actualizar al aceptar vínculo.
- C:\Didactifonis2026\server\models\User.js — modelo de usuario, roles: 'tutor', 'profesional', 'admin'.
- C:\Didactifonis2026\server\middleware\auth.js — middlewares: protect, requireRole, requireActiveSubscription.
- C:\Didactifonis2026\server\index.js — aquí debes registrar los nuevos routers.
- C:\Didactifonis2026\server\routes\professional.js — patrón de referencia para rutas del profesional.

## Modelos que debes crear

### server/models/Invitation.js

Campos:
- professionalId: ObjectId ref User, required
- childId: ObjectId ref Child, required
- tutorId: ObjectId ref User, required
- token: String, único, generado con crypto.randomBytes(32).toString('hex')
- direction: enum ['pro_to_tutor', 'tutor_to_pro'], default 'pro_to_tutor'
  pro_to_tutor: profesional genera código para el tutor
  tutor_to_pro: tutor solicita al profesional desde el directorio
- status: enum ['pending', 'accepted', 'rejected', 'expired', 'revoked'], default 'pending'
- expiresAt: Date, createdAt + 48 horas
- consentRecord: subdocumento sin _id { acceptedAt: Date, ip: String, version: String }
- timestamps: true

Índices: token (unique), professionalId, childId, tutorId, status.

### server/models/Message.js

Campos:
- invitationId: ObjectId ref Invitation, required
- senderId: ObjectId ref User, required
- receiverId: ObjectId ref User, required
- content: String, required, maxlength 2000
- readAt: Date, default null
- timestamps: true

Índices: { invitationId: 1, createdAt: 1 }, { receiverId: 1, readAt: 1 }.

## Endpoints que debes crear

### server/routes/link.js — montado en /api/link

Todos requieren protect + requireActiveSubscription.

POST /api/link/invite — rol: profesional
- Body: { childId, note? }
- Valida: childId corresponde a un niño activo. El profesional NO necesita accessGrant previo.
- Busca el tutorId del niño.
- Verifica que no exista una Invitation pending o accepted entre este profesional y este niño.
- Genera token con crypto.randomBytes(32).toString('hex').
- expiresAt = Date.now() + 48 horas.
- direction = 'pro_to_tutor'.
- Responde 201 con la invitation incluyendo el token.

GET /api/link/invitations — rol: profesional
- Devuelve todas las invitaciones donde professionalId = req.user._id.
- Populate childId (name, avatarId), tutorId (name, email).
- Verificar y marcar como 'expired' las que tienen expiresAt < now && status = 'pending'.

POST /api/link/accept — rol: tutor
- Body: { token, consentVersion }
- Busca Invitation por token. Valida: existe, status='pending', no expirada, tutorId === req.user._id.
- Registra consentRecord: { acceptedAt: new Date(), ip: req.ip, version: consentVersion }.
- Cambia status a 'accepted'.
- Agrega professionalId al array accessGrants del Child (si no está ya).
- Responde 200 con la invitation actualizada.

POST /api/link/reject — rol: tutor
- Body: { token }
- Busca Invitation por token. Valida: existe, status='pending', tutorId === req.user._id.
- Cambia status a 'rejected'.
- Responde 200.

DELETE /api/link/:invitationId — rol: tutor (revocación)
- Busca Invitation por _id. Valida: existe, status='accepted', tutorId === req.user._id.
- Cambia status a 'revoked'.
- Elimina el professionalId del array accessGrants del Child (usar $pull).
- Responde 200.

GET /api/link/my-links — rol: tutor
- Devuelve todas las Invitation con tutorId = req.user._id y status = 'accepted'.
- Populate professionalId (name, email), childId (name, avatarId).

### server/routes/directory.js — montado en /api/professionals

Todos requieren protect + requireActiveSubscription.

GET /api/professionals/directory — rol: tutor
- Listado de profesionales donde role='profesional', isActive=true, suscripción vigente.
- Para 'trial': trialEndsAt > now. Para 'active': no planExpiresAt o planExpiresAt > now.
- Devuelve: _id, name, email, professionalProfile (specialty, city).
- No exponer: password, consent, detalles de subscription.

POST /api/professionals/request — rol: tutor
- Body: { professionalId, childId }
- Valida: el childId pertenece al tutor autenticado. El profesional existe, activo y con suscripción vigente.
- Verifica que no exista una Invitation pending o accepted entre este profesional y este niño.
- Crea Invitation con direction='tutor_to_pro', status='pending'.
- Responde 201.

GET /api/professionals/incoming — rol: profesional
- Invitaciones con direction='tutor_to_pro', professionalId=req.user._id, status='pending'.
- Populate tutorId (name, email), childId (name, avatarId).

POST /api/professionals/respond — rol: profesional
- Body: { invitationId, decision } (decision: 'accepted' o 'rejected')
- Busca Invitation por _id. Valida: direction='tutor_to_pro', professionalId=req.user._id, status='pending'.
- Si accepted: cambia status, registra consentRecord sin IP (solo fecha y version='v1.0'), agrega professionalId a accessGrants del Child.
- Si rejected: cambia status a 'rejected'.
- Responde 200.

### server/routes/messages.js — montado en /api/messages

Todos requieren protect + requireActiveSubscription.

Helper interno verificarAccesoMensaje(invitationId, userId): busca la Invitation, verifica que status='accepted' y que el userId sea el professionalId o el tutorId del vínculo.

GET /api/messages/conversations — lista de conversaciones activas del usuario
- Busca todas las Invitation con status='accepted' donde el usuario es professionalId o tutorId.
- Para cada una, devuelve el último mensaje y el conteo de no leídos (receiverId=req.user._id y readAt=null).
- Populate professionalId (name), tutorId (name), childId (name, avatarId).
- IMPORTANTE: esta ruta debe definirse ANTES de /:invitationId para que Express no la interprete como un ID.

GET /api/messages/:invitationId
- Verifica acceso con el helper.
- Devuelve mensajes ordenados por createdAt asc.
- Populate senderId (name), receiverId (name).
- Marca como leídos los mensajes donde receiverId=req.user._id y readAt=null.

POST /api/messages
- Body: { invitationId, content }
- Verifica acceso con el helper.
- Valida content: string, no vacío, max 2000 chars.
- Determina receiverId: si sender es el profesional, receiver es el tutor; si sender es el tutor, receiver es el profesional.
- Crea y devuelve el mensaje (201).

## Actualización de server/index.js

Lee el archivo actual antes de modificarlo. Agrega los tres routers:
- linkRouter en /api/link
- directoryRouter en /api/professionals
- messagesRouter en /api/messages

## Actualización del modelo User

Si el modelo User no tiene el campo professionalProfile, agrégalo como campo opcional:
professionalProfile: { specialty: { type: String, default: null }, city: { type: String, default: null } }

Solo añadir si no existe. Verificar antes de tocar el archivo.

## Reglas de implementación

1. Lee todos los archivos relevantes antes de escribir código.
2. Imports relativos correctos: desde server/routes/ hacia server/models/ es '../models/NombreModelo'.
3. No uses mongoose.connection.models para verificar si un modelo existe.
4. Manejo de errores: devuelve objetos { message: '...' } consistentes. Usa next(err) para errores inesperados.
5. No modifiques archivos fuera de: server/models/, server/routes/, server/index.js.
6. Un token de invitación expirado = expiresAt < new Date(). Márcalo 'expired' antes de responder.

## Criterios de aceptación

- server/models/Invitation.js creado con todos los campos e índices.
- server/models/Message.js creado con todos los campos e índices.
- server/routes/link.js con los 6 endpoints descritos.
- server/routes/directory.js con los 4 endpoints descritos.
- server/routes/messages.js con los 3 endpoints descritos (conversations antes que :invitationId).
- server/index.js actualizado con los 3 nuevos routers.
- El modelo User tiene professionalProfile si no existía.
- RBAC correcto en todos los endpoints.
- El consentRecord se registra en POST /api/link/accept con ip, fecha y version.
- La revocación elimina al profesional de accessGrants del Child.

## Al terminar

Devuelve un resumen con:
1. Archivos creados o modificados (con ruta absoluta).
2. Endpoints implementados.
3. Cualquier decisión de implementación no obvia que hayas tomado.
4. Cualquier bloqueante o advertencia que el arquitecto deba conocer.
