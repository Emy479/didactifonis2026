# Plan — Fase 4: Actividades y Asignación de Tareas

> Autor: didactifonis-architect  
> Fecha: 2026-05-30  
> Estado: EN EJECUCIÓN

---

## 1. Objetivo

Construir el núcleo de actividades y asignación del MVP:

- Modelo `Activity` (catálogo gestionado por el Admin).
- Modelo `Assignment` (asignaciones de actividades al niño por tutor o profesional).
- Contrato de ingesta de resultados (`/server/activities/`) que el juego externo llama al terminar.
- UI Tutor: vistas Actividades y Tareas conectadas a datos reales.
- UI modo niño: reemplazar mocks por assignments reales del niño activo.
- Aviso obligatorio (spec §6.3) cuando el niño opera sin profesional vinculado.

Lo que NO entra en Fase 4:
- Panel de actividades del Profesional (Pro_Actividades, Pro_Terapias) — es Fase 5.
- Panel de Admin para subir actividades — es Fase 5.
- Progreso y Logros (Tut_Progreso) — es Fase 5.
- Mensajería, Calendario, Comunidad — fases posteriores.

---

## 2. Decisiones de arquitectura aplicables

### 2.1 Contrato de publicación (PENDIENTE — spec §6.5)
El formato exacto del ZIP/manifiesto aún no está acordado con el equipo de juegos.
**Decisión de MVP:** la plataforma no implementa ingesta de ZIP real todavía. El Admin
cargará actividades mediante un endpoint REST autenticado (POST /api/activities) con
los metadatos en JSON. Los campos del modelo reflejan el manifiesto esperado pero sin
validación de bundle por ahora.

### 2.2 Contrato de resultados (PENDIENTE — spec §6.5)
El esquema exacto también está pendiente. **Decisión de MVP:** se implementa un endpoint
`POST /api/activities/results` con un esquema inicial conservador (ver sección 4.3).
Se documenta como versión 1 y el campo `schema_version` permite evolucionar sin romper.

### 2.3 Acceso del tutor a actividades
El tutor accede a "packs cerrados". En MVP no existe entidad Pack aún; se aproxima
marcando cada Activity con `availableToTutors: Boolean`. El tutor solo ve las marcadas.
El profesional ve todo. Esta decisión es reversible cuando se construya Pack.

### 2.4 Asignación y modo niño
Los assignments se recuperan por `childId`. El `ChildContext` ya tiene `activeChild`.
El `DashboardNino` reemplaza su array hardcodeado por fetch a
`GET /api/assignments?childId=<id>&status=pending`.

### 2.5 Separación de capas (spec §13)
Los resultados de actividad son **Capa 1 educativa** (no clínica). No se mezclan con
campos de Capa 2. El modelo `ActivityResult` vive en `/server/activities/`, separado
de cualquier futura nota clínica.

---

## 3. Subtareas — Backend (delegado a didactifonis-backend)

### B1 — Modelo Activity
Archivo: `server/models/Activity.js`

Campos:
- `title: String` (required)
- `type: String` enum `['fonema', 'silaba', 'palabra', 'comprension', 'otro']`
- `therapeuticGoal: String` — descripción del objetivo terapéutico
- `difficultyLevel: Number` — 1, 2, 3 (fácil, medio, difícil)
- `ageRange: { min: Number, max: Number }` — edad mínima y máxima sugerida
- `durationMinutes: Number`
- `availableToTutors: Boolean, default: false` — si el tutor puede asignarlo
- `thumbnailUrl: String` — URL de imagen de portada (opcional en MVP)
- `bundleUrl: String` — URL del paquete del juego (placeholder en MVP)
- `isActive: Boolean, default: true`
- `createdBy: ObjectId ref User` — siempre el Admin
- `timestamps`

Índices: `{ type: 1 }`, `{ difficultyLevel: 1 }`, `{ availableToTutors: 1 }`

### B2 — Modelo Assignment
Archivo: `server/models/Assignment.js`

Campos:
- `activityId: ObjectId ref Activity` (required)
- `childId: ObjectId ref Child` (required)
- `assignedBy: ObjectId ref User` (required) — tutor o profesional
- `assignedByRole: String` enum `['tutor', 'profesional']`
- `status: String` enum `['pending', 'completed', 'skipped']`, default `'pending'`
- `dueDate: Date` (opcional)
- `completedAt: Date`
- `timestamps`

Índices: `{ childId: 1, status: 1 }`, `{ assignedBy: 1 }`

### B3 — Modelo ActivityResult
Archivo: `server/activities/ActivityResult.js`

Campos (Capa 1 educativa — no clínica):
- `assignmentId: ObjectId ref Assignment` (required)
- `childId: ObjectId ref Child` (required)
- `activityId: ObjectId ref Activity` (required)
- `schemaVersion: String, default: '1.0'`
- `score: Number` — 0-100
- `passed: Boolean`
- `attemptCount: Number, default: 1`
- `durationSeconds: Number`
- `metadata: Mixed` — datos adicionales del juego (sin estructura fija en v1)
- `receivedAt: Date, default: Date.now`
- `timestamps`

Índices: `{ childId: 1 }`, `{ assignmentId: 1 }`

### B4 — Endpoints Activity
Router: `server/routes/activities.js`

```
GET  /api/activities          — lista; tutor ve solo availableToTutors=true; pro ve todo
POST /api/activities          — solo Admin; crea actividad
GET  /api/activities/:id      — detalle; tutor/pro/admin
PUT  /api/activities/:id      — solo Admin; editar
```

Middleware: `protect + requireActiveSubscription` para GET; `protect + requireRole('admin')` para POST/PUT.

### B5 — Endpoints Assignment
Router: `server/routes/assignments.js`

```
GET  /api/assignments              — query param childId obligatorio; devuelve assignments del niño
                                     RBAC: solo el tutor del niño o un profesional con acceso
POST /api/assignments              — body: { activityId, childId, dueDate? }
                                     RBAC: tutor (solo availableToTutors=true) o profesional (cualquier actividad)
PATCH /api/assignments/:id/status  — body: { status }
                                     RBAC: el mismo tutor/profesional que asignó, o el sistema (via results)
```

Middleware: `protect + requireActiveSubscription`.

### B6 — Endpoint de ingesta de resultados
Router: `server/activities/resultsRouter.js`, montado en `/api/activities/results`

```
POST /api/activities/results   — el juego externo llama esto al terminar
```

Autenticación MVP: el juego debe enviar el JWT del tutor (misma sesión).
Validaciones de seguridad:
1. Verificar que el `assignmentId` existe y pertenece al `childId`.
2. Verificar que el `childId` pertenece al tutor autenticado.
3. Tratar el body como entrada no confiable (sanitizar, no ejecutar).
4. Al guardar, marcar el Assignment como `completed`.

---

## 4. Subtareas — Frontend (delegado a didactifonis-frontend)

### F1 — Vista Actividades del Tutor (nueva sección en DashboardTutor)
Archivo nuevo: `client/src/pages/tutor/ActividadesTutor.jsx`
Referencia visual: `referencias/Tut_Actividades.png`

- Tabs: "Asignadas" / "Completadas" / "Todas"
- Lista de actividades disponibles (GET /api/activities — solo availableToTutors=true)
- Card de actividad: imagen/thumbnail, título, tipo, nivel, duración, botón "Asignar"
- Modal de asignación: seleccionar niño (de ChildContext.children), fecha opcional, confirmar
- Resumen semanal en sidebar derecho (tiempo total, actividades completadas)
- Aviso obligatorio §6.3 visible si el niño seleccionado no tiene profesional vinculado

Integrar en DashboardTutor: reemplazar el placeholder `currentView === 'actividades'` por `<ActividadesTutor />`.

### F2 — Vista Tareas del Tutor (nueva sección en DashboardTutor)
Archivo nuevo: `client/src/pages/tutor/TareasTutor.jsx`
Referencia visual: `referencias/Tut_Tareas.png`

- Lista de assignments del niño activo (GET /api/assignments?childId=X)
- Estado de cada tarea: pendiente / completada con badge de color
- Filtros: Pendientes / Completadas / Todas
- Resumen: total pendientes, completadas, total general
- Botón "Cargar más tareas" (paginación básica)
- Sidebar: Resumen de tareas + Próxima cita (placeholder)

Integrar en DashboardTutor: agregar 'tareas' al navItems y conectar con `<TareasTutor />`.

### F3 — Modo niño con datos reales
Archivo: `client/src/pages/nino/DashboardNino.jsx` (modificar el existente)

- Reemplazar el array hardcodeado `activities` por fetch a
  `GET /api/assignments?childId=<activeChild._id>&status=pending`
- Mostrar las actividades asignadas y pendientes como cards jugables
- Si no hay assignments pendientes: pantalla de "¡Todo listo por hoy!" con mensaje
  lúdico y estrellas
- El botón "¡Jugar ahora!" por ahora apunta a `assignment.activity.bundleUrl` (puede
  ser vacío/placeholder); no ejecuta lógica de juego
- Mantener el aviso obligatorio §6.3 si `!activeChild.linkedProfessional`

---

## 5. Orden de ejecución

1. **Backend primero** (B1→B2→B3→B4→B5→B6) — los endpoints deben existir antes
   de que el frontend los consuma.
2. **Frontend segundo** (F1→F2→F3) — consume los endpoints reales.
3. **Revisión visual** — el agente frontend compara cada vista contra `/referencias`
   antes de hacer commit.
4. **Integración final** — el arquitecto verifica que los RBAC sean correctos,
   que no haya datos hardcodeados y que el aviso §6.3 aparezca donde corresponde.

---

## 6. Criterios de aceptación

- [ ] `GET /api/activities` devuelve solo `availableToTutors=true` para el tutor y todo para el profesional.
- [ ] `POST /api/assignments` falla con 403 si el tutor intenta asignar una actividad con `availableToTutors=false`.
- [ ] `POST /api/activities/results` valida que el assignment pertenezca al niño del tutor autenticado.
- [ ] El modo niño muestra solo assignments `status: 'pending'` del `activeChild`.
- [ ] El aviso §6.3 aparece en ActividadesTutor y en DashboardNino cuando no hay profesional vinculado.
- [ ] No hay datos hardcodeados en las vistas nuevas.
- [ ] Los tokens de color y tipografía vienen del design-system (sin hex sueltos).
- [ ] No hay mezcla de lógica clínica (Capa 2) con resultados educativos (Capa 1).

---

## 7. Bloqueantes conocidos

- **Contrato de resultados definitivo (spec §6.5):** aún no acordado con el equipo de juegos.
  Impacto: el endpoint `/api/activities/results` implementa el esquema provisional v1.0.
  El campo `schemaVersion` permite versionarlo sin romper.
- **Bundle de juego real:** `bundleUrl` es un placeholder en MVP. El botón "Jugar" no
  lanza ningún juego real todavía.
- **Pack de actividades:** la entidad Pack no existe aún. Se aproxima con
  `availableToTutors: Boolean`. Se revisará cuando se construya el módulo Pack (Fase 5+).
