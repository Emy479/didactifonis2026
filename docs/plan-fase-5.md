# Plan — Fase 5: Panel Admin, Vistas del Profesional y Progreso

> Escrito por: didactifonis-architect
> Fecha: 2026-05-30
> Estado: aprobado para ejecución

---

## 1. Objetivo de la fase

Completar las tres áreas funcionales que quedan sin UI ni endpoints propios:

1. **Panel Admin completo** — navegación con sidebar, vistas de Usuarios, Profesionales, Padres/Tutores, Niños, Actividades, Terapias, Suscripciones (solo lectura de lista) y Dashboard.
2. **Vistas del Profesional** — sidebar de navegación, vista de Pacientes, vista de Actividades (biblioteca completa) y vista de Terapias (lista por paciente con progreso general).
3. **Módulo de Progreso y Logros** del tutor — `Tut_Progreso.png` y `Tut_Logros.png`.

No entran en esta fase: vinculación tutor-profesional (requiere decisión de UX de invitación), mensajería, calendario, comunidad, exportación PDF, ni las secciones de Admin que requieren lógica transaccional compleja (Pagos, Reportes, Soporte, Contenido).

---

## 2. Análisis de referencias visuales

### Panel Admin
- `Admin_Dashboard.png`: métricas globales (usuarios, profesionales, padres/tutores, niños, actividades completadas, ingresos). Gráficos de crecimiento, usuarios recientes, actividad reciente, alertas, acciones rápidas. Sidebar con 12 secciones.
- `Admin_Usuarios.png`: tabla con todos los usuarios (rol, email, fecha, estado). KPIs en header. Distribución por rol en sidebar derecho. Acciones rápidas.
- `Admin_Profesionales.png`: tabla de profesionales. KPIs. Distribución por especialidad. Verificación de profesionales (stat de pendientes).
- `Admin_Padres_Tutores.png`: tabla de tutores. KPIs (activos, pendientes, inactivos, hijos). Distribución por estado.
- `Admin_ninos.png`: tabla de niños. KPIs. Distribución por terapeuta principal y por edad.
- `Admin_Actividades.png`: tabla de actividades con filtros. KPIs (total, validadas, revisión, archivadas). Gráficos de distribución. Botón "Crear actividad".
- `Admin_Terapias.png`: tabla de terapias activas con pacientes asignados, profesional, fechas.
- `Admin_Suscripciones.png`: tabla de suscripciones con plan, estado, fechas, monto. Gráfico de ingresos. Distribución por plan.

### Profesional
- `Pro_Dashboard.png`: bienvenida personalizada, KPIs del día (consultas, actividades asignadas, objetivos activos, tiempo promedio), progreso general de pacientes (gráfico de líneas), resumen de pacientitos con cards, agenda del día.
- `Pro_Pacientes_v1.png`: lista de pacientes con KPIs (totales, activos esta semana, nuevos, completados), cards por paciente con terapeuta, progreso general (barra), última actividad.
- `Pro_Actividades.png`: biblioteca completa (sin filtro availableToTutors). KPIs (todas activas, mis actividades, más utilizadas, guardar). Grid de cards con thumbnails de juegos. Filtros por categoría en chips horizontales.
- `Pro_Terapias.png`: lista de terapias por paciente. KPIs (terapias activas, completadas, en revisión, nuevas). Cada card tiene: nombre del paciente, terapeuta principal, objetivo general, progreso general (porcentaje + barra), sesiones realizadas, próxima sesión.

### Tutor — Progreso y Logros
- `Tut_Progreso.png`: selector de niño activo. 4 KPIs circulares (Pronunciación, Comprensión, Conciencia fonológica, Participación) con % y descripción. Gráfico de líneas de progreso en el tiempo. Logros recientes. Áreas de trabajo (barras horizontales por área). Resumen semanal (tiempo, actividades, racha). Consejo de la semana.
- `Tut_Logros.png`: header con racha, puntos, récords. Grid de logros con badge (iconos), título, descripción, progreso. Sidebar con racha actual, logros por categoría (porcentaje), últimos logros desbloqueados.

---

## 3. Decisiones de arquitectura para esta fase

### 3.1 Admin — qué datos son reales vs. placeholder
El Admin necesita datos de múltiples colecciones. En MVP con DB vacía o con pocos datos, los endpoints devolverán conteos reales (0 o el valor real). Los gráficos y métricas de "ingresos" y "actividades completadas" usan datos reales de la DB. Los KPIs de "crecimiento" son conteos agregados, no proyecciones.

**Lo que SÍ se implementa con datos reales:**
- Conteos: total usuarios por rol, total actividades, total assignments completados.
- Listas con paginación: usuarios, actividades (reutiliza endpoint existente).
- Activar/desactivar usuarios (`isActive`).

**Lo que va como placeholder visual (sin lógica real):**
- Ingresos/pagos (no hay pasarela real).
- Gráficos de crecimiento temporal (no hay histórico aún — mostrar estado vacío).
- "Verificación" de profesionales (campo no existe en modelo — se reserva pero no se construye).

### 3.2 Admin — modelo de Terapia
`Admin_Terapias.png` muestra terapias. El modelo `Therapy` no existe aún. Se crea en esta fase como entidad mínima: `{ name, professionalId, childId (paciente), therapeuticGoal, status (active/completed/review), startDate, sessions }`. Las terapias del profesional se construyen sobre este modelo.

### 3.3 Progreso — fuente de datos
La vista `Tut_Progreso.png` y `Pro_Terapias.png` dependen de `ActivityResult`. El endpoint de progreso agrega resultados por niño: total completadas, pasadas, tasa de éxito por tipo de actividad. Los KPIs circulares (Pronunciación, Comprensión, etc.) se calculan agrupando por `activity.type` y calculando `passed/total`.

**Mapeo type → área:**
- `fonema` → Pronunciación
- `comprension` → Comprensión  
- `silaba` / `palabra` → Conciencia fonológica
- `otro` → Participación (fallback: cualquier actividad completada)

### 3.4 Logros — generación server-side
Los logros (`Tut_Logros.png`) se calculan desde ActivityResult en el endpoint. Son reglas simples determinísticas (no IA, no scoring clínico):
- "Primera actividad completada" (passed ≥ 1).
- "Racha de 7 días" (completedAt con 7 días consecutivos).
- "10 actividades superadas" (passed ≥ 10).
- Etc.

Los logros son educativos/motivacionales, nunca clínicos. Capa 1 pura.

### 3.5 Vinculación profesional-niño (accessGrants)
`Child.accessGrants` ya existe. En esta fase el profesional ve una vista de Pacientes que lista los niños donde `accessGrants` incluye su ID. No se implementa el flujo de invitación/consentimiento (requiere decisión de UX pendiente). El profesional puede ver sus pacientes si ya están vinculados vía seed/admin.

### 3.6 Rutas Frontend
```
/admin/*           → DashboardAdmin (sidebar multi-sección)
/pro/*             → DashboardPro (sidebar multi-sección, reemplaza el stub)
/tutor/progreso    → ProgresoTutor (dentro del DashboardTutor existente)
/tutor/logros      → LogrosTutor (dentro del DashboardTutor existente)
```

---

## 4. Subtareas

### Subtarea B1 — Backend: endpoints de Admin (datos reales)

**Agente:** didactifonis-backend
**Archivo nuevo:** `server/routes/admin.js`
**Montaje:** `app.use('/api/admin', adminRouter)` en index.js
**RBAC:** todos los endpoints `requireRole('admin')`

Endpoints a crear:

```
GET /api/admin/stats
  → { users: { total, byRole: {tutor,profesional,admin} }, 
      activities: { total, active }, 
      assignments: { completed } }

GET /api/admin/users?role=&page=&limit=
  → lista paginada de usuarios (sin campo password). Filtro opcional por rol.

PATCH /api/admin/users/:id/status
  → activa/desactiva usuario (isActive). No puede desactivar al propio admin.

GET /api/admin/activities?page=&limit=
  → reutiliza lógica de activities.js pero sin filtro de rol (admin ve todo)
  → ya existe GET /api/activities — el admin puede llamar ese mismo endpoint
  → solo necesita el endpoint de stats

GET /api/admin/therapies?page=&limit=
  → lista de terapias (modelo Therapy nuevo)

POST /api/admin/therapies  (o ruta de profesional, ver B2)
```

**Modelo nuevo:** `server/models/Therapy.js`
```
{ name, professionalId (ref User), childId (ref Child), therapeuticGoal, 
  status: enum['active','completed','review'], startDate, sessions: Number, 
  createdBy (ref User), timestamps }
```

### Subtarea B2 — Backend: endpoints del Profesional

**Agente:** didactifonis-backend
**Archivo nuevo:** `server/routes/professional.js`
**Montaje:** `app.use('/api/professional', professionalRouter)` en index.js
**RBAC:** `requireRole('profesional')` + `requireActiveSubscription`

Endpoints:

```
GET /api/professional/patients
  → niños donde accessGrants includes req.user._id
  → populate: tutorId (name), último assignment, progreso general
  → sin datos de salud de Capa 2 en este endpoint (solo Capa 1)

GET /api/professional/therapies
  → terapias donde professionalId === req.user._id
  → populate: childId (name, avatarId), progreso general calculado

POST /api/professional/therapies
  → crea terapia. Valida que childId esté en accessGrants del profesional.

PATCH /api/professional/therapies/:id
  → edita terapia propia

GET /api/professional/activities
  → igual que GET /api/activities sin filtro de tutor (profesional ve todo)
  → ya funciona (el endpoint existente ya maneja rol profesional)
  → no requiere nuevo endpoint
```

### Subtarea B3 — Backend: endpoints de Progreso

**Agente:** didactifonis-backend
**Archivo nuevo:** `server/routes/progress.js` (o extender activities)
**Montaje:** `app.use('/api/progress', progressRouter)` en index.js

```
GET /api/progress/:childId
  Requiere: protect + requireActiveSubscription
  RBAC: tutor que posee el niño, o profesional con accessGrant, o admin
  Calcula desde ActivityResult:
  - totalCompleted, totalPassed, successRate
  - byType: { fonema: {completed,passed}, silaba: {...}, ... }
  - lastActivity: la más reciente
  - weeklyStats: actividades de los últimos 7 días
  - achievements: array de logros desbloqueados (cálculo determinístico)
  - streak: días consecutivos con actividad completada

GET /api/progress/:childId/achievements
  Misma lógica de RBAC. Devuelve lista de logros con estado (locked/unlocked).
```

**Modelo nuevo (mínimo):** `ActivityResult` ya existe en `server/activities/ActivityResult.js`. No se crea modelo nuevo — se agrega al require en progressRouter.

### Subtarea F1 — Frontend: Panel Admin completo

**Agente:** didactifonis-frontend
**Archivo a reemplazar:** `client/src/pages/admin/DashboardAdmin.jsx` (stub actual)
**Archivos nuevos:**
- `client/src/pages/admin/AdminUsuarios.jsx`
- `client/src/pages/admin/AdminActividades.jsx`
- `client/src/pages/admin/AdminTerapias.jsx`
- `client/src/pages/admin/AdminSuscripciones.jsx` (solo tabla + placeholder visual)
- `client/src/pages/admin/AdminProfesionales.jsx`
- `client/src/pages/admin/AdminPadresTutores.jsx`
- `client/src/pages/admin/AdminNinos.jsx`

**Referencia visual:** `Admin_Dashboard.png`, `Admin_Usuarios.png`, `Admin_Profesionales.png`, `Admin_Padres_Tutores.png`, `Admin_ninos.png`, `Admin_Actividades.png`, `Admin_Terapias.png`, `Admin_Suscripciones.png`

**Criterios clave:**
- Sidebar izquierdo idéntico a las referencias (12 ítems: Inicio, Usuarios, Profesionales, Padres/Tutores, Niños, Actividades, Terapias, Suscripciones, Pagos, Reportes, Contenido, Soporte, Configuración). Los sin implementar muestran "Próximamente".
- Panel de contenido derecho muestra la vista activa.
- Estilo limpio/técnico. Misma paleta de tokens. Sin gamificación.
- Dashboard: KPI cards + tabla de usuarios recientes (fetch a `/api/admin/stats` y `/api/admin/users?limit=5`).
- AdminUsuarios: tabla paginada con roles, estado, acciones de activar/desactivar.
- AdminActividades: tabla + botón "Crear actividad" (abre modal con el formulario ya conocido de Fase 4, reutilizable).
- AdminSuscripciones: tabla de usuarios con sus datos de suscripción (campos del modelo User.subscription). Sin pasarela real — datos del modelo.
- Comparar contra referencias antes de declarar listo.

### Subtarea F2 — Frontend: Vistas del Profesional

**Agente:** didactifonis-frontend
**Archivo a reemplazar:** `client/src/pages/pro/DashboardPro.jsx` (stub actual)
**Archivos nuevos:**
- `client/src/pages/pro/PacientesPro.jsx`
- `client/src/pages/pro/ActividadesPro.jsx`
- `client/src/pages/pro/TerapiasPro.jsx`

**Referencia visual:** `Pro_Dashboard.png`, `Pro_Pacientes_v1.png`, `Pro_Actividades.png`, `Pro_Terapias.png`

**Criterios clave:**
- Sidebar izquierdo: Inicio, Pacientes, Terapias, Actividades, Reportes, Mensajes, Calendario, Recursos, Configuración. Los sin implementar muestran "En desarrollo".
- Dashboard Pro: KPIs del día (actividades asignadas, objetivos activos — datos reales; tiempo promedio y consultas del día — placeholder), progreso general de pacientes (barras simples), lista de pacientes recientes.
- PacientesPro: lista de niños donde el profesional tiene accessGrant. Fetch a `/api/professional/patients`. Si está vacío, estado vacío con instrucción.
- ActividadesPro: igual que ActividadesTutor pero sin filtro availableToTutors. Reutiliza la misma estructura de grid con tabs. Fetch a `/api/activities` (sin filtro de tutor, el backend ya maneja el rol).
- TerapiasPro: lista de terapias. Fetch a `/api/professional/therapies`. Botón "Crear terapia" (modal simple: paciente, objetivo general, nombre). Progreso general por paciente calculado desde endpoint de progreso.
- Comparar contra referencias antes de declarar listo.

### Subtarea F3 — Frontend: Progreso y Logros (Tutor)

**Agente:** didactifonis-frontend
**Archivos nuevos:**
- `client/src/pages/tutor/ProgresoTutor.jsx`
- `client/src/pages/tutor/LogrosTutor.jsx`

**Integración en DashboardTutor.jsx:** agregar los dos navItems ('progreso', 'logros') y renderizar los nuevos componentes. Edición mínima: solo el switch de currentView y los imports.

**Referencia visual:** `Tut_Progreso.png`, `Tut_Logros.png`

**Criterios clave:**
- Usa el niño activo de ChildContext (activeChild).
- Si no hay niño activo, mostrar estado vacío con mensaje "Selecciona un niño/a para ver su progreso".
- Fetch a `/api/progress/:childId` para obtener KPIs, progreso por área y logros.
- KPIs circulares (4): Pronunciación, Comprensión, Conciencia fonológica, Participación — calculados desde `byType` del endpoint.
- Gráfico de progreso en el tiempo: si no hay datos suficientes, mostrar estado vacío con mensaje motivador.
- Logros: grid de badges con título, descripción, estado (locked/unlocked). Sidebar con racha y logros por categoría.
- Gamificación permitida aquí (es la vista del tutor sobre los logros del niño, no un panel técnico). Badges coloridos, emojis de logro, lenguaje motivador.
- Comparar contra referencias antes de declarar listo.

---

## 5. Orden de ejecución

```
B1 (Admin stats + users endpoint + Therapy model)
  ↓
B2 (Professional patients + therapies endpoints)
  ↓
B3 (Progress endpoint + achievements)
  ↓
F1 (Admin UI)  ← puede ejecutarse en paralelo con F2 y F3
F2 (Pro UI)    ← una vez que B1-B3 están listos
F3 (Progreso/Logros Tutor) ← una vez que B3 está listo
  ↓
Revisión visual + commit único
```

En la práctica: B1→B2→B3 secuencial (cada uno depende del anterior para montaje en index.js). Luego F1, F2, F3 pueden ejecutarse en orden pero el primero debe terminar antes de iniciar el segundo (para no abrir frentes simultáneos que se pisen en index.js y App.jsx).

---

## 6. Criterios de aceptación globales

- [ ] Panel Admin tiene sidebar funcional con navegación interna.
- [ ] Admin puede ver lista de usuarios y activar/desactivar.
- [ ] Admin puede crear/editar actividades (reutilizando lógica de Fase 4).
- [ ] Profesional tiene sidebar propio con sus vistas.
- [ ] Profesional ve su lista de pacientes (niños con accessGrant).
- [ ] Profesional ve catálogo completo de actividades (sin restricción de tutor).
- [ ] Profesional puede crear/ver terapias para sus pacientes.
- [ ] Tutor ve Progreso con KPIs reales calculados desde ActivityResult.
- [ ] Tutor ve Logros con badges desbloqueados reales.
- [ ] Toda la UI profesional/admin es limpia/técnica (sin gamificación).
- [ ] Progreso del tutor usa tokens de gamificación (lúdico, apropiado por spec).
- [ ] Ningún componente usa valores hex sueltos — solo tokens del design system.
- [ ] Revisión visual contra referencias PNG firmada antes del commit.
- [ ] Paths relativos verificados en todos los archivos nuevos del server (lección de Fase 4).

---

## 7. Lo que NO entra en esta fase

- Flujo de invitación/consentimiento profesional↔tutor (spec §5.2/5.3 — requiere decisión UX).
- Mensajería (spec §10 — condicional al vínculo).
- Calendario/agendamiento (spec §12).
- Exportación PDF (spec §8).
- Comunidad (spec §11 — pendiente de reglas).
- Admin: Pagos, Reportes, Contenido (con upload ZIP), Soporte — funcionalidad compleja fuera del MVP inmediato.
- Rate limit específico para auth (deuda técnica heredada).
- JWT refresh (deuda técnica heredada).
- Error handler global (deuda técnica heredada).

---

## 8. Rutas a montar en server/index.js

```js
const adminRouter = require('./routes/admin');
const professionalRouter = require('./routes/professional');
const progressRouter = require('./routes/progress');

app.use('/api/admin', adminRouter);
app.use('/api/professional', professionalRouter);
app.use('/api/progress', progressRouter);
```

Estos tres `require` usan paths relativos desde `server/index.js` → `./routes/xxx`. Verificar que los archivos estén en `server/routes/`.
