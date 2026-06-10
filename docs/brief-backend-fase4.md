# Brief Backend — Fase 4

Eres el agente **didactifonis-backend** de Didactifonis. Tu tarea es implementar los modelos y endpoints de la Fase 4. No toques archivos fuera de server/. No reescribas lo que ya funciona. Si algo falla 2 veces, detente y reporta.

## Stack y convenciones
Node.js + Express + MongoDB + Mongoose. CommonJS (require/module.exports).
Directorio de trabajo: C:\Didactifonis2026

Lee antes de crear: server/models/User.js, server/models/Child.js, server/middleware/auth.js, server/routes/children.js, server/index.js.

## B1 — server/models/Activity.js (NUEVO)
- title: String required trim maxlength:200
- type: String enum['fonema','silaba','palabra','comprension','otro'] required
- therapeuticGoal: String trim maxlength:500
- difficultyLevel: Number enum[1,2,3] required
- ageRange: subdocumento sin _id { min: Number, max: Number }
- durationMinutes: Number min:1 max:120
- availableToTutors: Boolean default:false
- thumbnailUrl: String default:null
- bundleUrl: String default:null
- isActive: Boolean default:true
- createdBy: ObjectId ref:'User' required
- timestamps:true
Indices: {type:1}, {difficultyLevel:1}, {availableToTutors:1}

## B2 — server/models/Assignment.js (NUEVO)
- activityId: ObjectId ref:'Activity' required
- childId: ObjectId ref:'Child' required
- assignedBy: ObjectId ref:'User' required
- assignedByRole: String enum['tutor','profesional'] required
- status: String enum['pending','completed','skipped'] default:'pending'
- dueDate: Date default:null
- completedAt: Date default:null
- timestamps:true
Indices: {childId:1,status:1}, {assignedBy:1}

## B3 — server/activities/ActivityResult.js (NUEVO)
Capa 1 educativa — NO clinica. El directorio server/activities/ ya existe.
- assignmentId: ObjectId ref:'Assignment' required
- childId: ObjectId ref:'Child' required
- activityId: ObjectId ref:'Activity' required
- schemaVersion: String default:'1.0'
- score: Number min:0 max:100 default:null
- passed: Boolean default:null
- attemptCount: Number default:1 min:1
- durationSeconds: Number min:0 default:null
- metadata: Mixed default:{}
- receivedAt: Date default:Date.now
- timestamps:true
Indices: {childId:1}, {assignmentId:1}

## B4 — server/routes/activities.js (NUEVO)
GET /   — protect + requireActiveSubscription
  tutor: {isActive:true, availableToTutors:true}; pro/admin: {isActive:true}
  query params opcionales: type, difficultyLevel
  ordenar por difficultyLevel asc

GET /:id — protect + requireActiveSubscription
  tutor: solo si availableToTutors=true, si no -> 403
  pro/admin: cualquiera activa
  si no existe o !isActive -> 404

POST /  — protect + requireRole('admin')
  body: {title,type,therapeuticGoal,difficultyLevel,ageRange,durationMinutes,availableToTutors,thumbnailUrl,bundleUrl}
  createdBy = req.user._id; respuesta 201

PUT /:id — protect + requireRole('admin')
  actualiza cualquier campo excepto createdBy; si no existe -> 404; respuesta 200

## B5 — server/routes/assignments.js (NUEVO)
GET /  — protect + requireActiveSubscription
  query param childId obligatorio; si falta -> 400
  RBAC: child.tutorId===req.user._id (tutor) O child.accessGrants includes req.user._id (profesional); si no -> 403
  query param opcional: status
  populate activityId con campos: title,type,difficultyLevel,durationMinutes,thumbnailUrl,bundleUrl

POST / — protect + requireActiveSubscription
  body: {activityId, childId, dueDate?}
  verificar pertenencia del nino al usuario
  tutor: activity.availableToTutors===true; si no -> 403 'Esta actividad no esta disponible para tutores'
  profesional: cualquier actividad activa
  respuesta 201 con populate activityId

PATCH /:id/status — protect + requireActiveSubscription
  body: {status}
  solo el mismo usuario que asigno (assignment.assignedBy===req.user._id)
  si status='completed': completedAt=new Date()
  respuesta 200

## B6 — server/activities/resultsRouter.js (NUEVO)
POST /  — protect + requireActiveSubscription
body: {assignmentId, childId, score, passed, attemptCount, durationSeconds, metadata, schemaVersion?}
Validaciones (en orden):
  1. assignmentId y childId obligatorios; si faltan -> 400
  2. buscar assignment; si no existe -> 404
  3. assignment.childId.toString()===childId; si no -> 400
  4. buscar child; child.tutorId.toString()===req.user._id.toString(); si no -> 403
  5. si assignment.status==='completed' -> 409 'Esta actividad ya fue completada'
Si pasa:
  crear ActivityResult
  actualizar assignment: status='completed', completedAt=new Date()
  respuesta 201: {message:'Resultado registrado', resultId: result._id}

Nota de imports en resultsRouter.js: auth esta en ../../middleware/auth; Assignment en ../../models/Assignment; Child en ../../models/Child

## Modificacion al servidor principal
Leer server/index.js y montar:
  resultsRouter en /api/activities/results (ANTES de activitiesRouter para evitar conflictos)
  activitiesRouter en /api/activities
  assignmentsRouter en /api/assignments

## Criterios
- CommonJS en todos los archivos nuevos
- RBAC del tutor para availableToTutors verificado en backend
- Validacion de pertenencia del nino al tutor en assignments y results
- Sin logica clinica (Capa 2) en ningun archivo nuevo
- No modificar User.js, Child.js, auth.js ni rutas existentes

## Al terminar reporta
1. Archivos creados o modificados (rutas absolutas)
2. Hallazgos inesperados
3. Lo que no pudiste implementar segun spec y por que
