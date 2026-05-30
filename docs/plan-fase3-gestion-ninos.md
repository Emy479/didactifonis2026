# Plan — Fase 3: Gestión de niños y modo niño

> Arquitecto: didactifonis-architect
> Fecha: 2026-05-30
> Estado: COMPLETADO — 2026-05-30

---

## Objetivo de negocio

Permitir que el tutor gestione los perfiles de sus niños y luego entre al "modo niño",
un entorno visual gamificado que reemplaza la vista del tutor dentro de la misma sesión
JWT, sin login independiente para el niño.

---

## Restricciones de diseño (no negociables)

1. El niño NO es una cuenta. No tiene JWT propio. Entra vía la sesión del tutor.
2. El ID del niño activo se transporta como estado de la aplicación, no como token.
3. El backend valida en cada endpoint que el `childId` recibido pertenezca al tutor autenticado.
4. El panel del tutor = estilo limpio/técnico. El modo niño = gamificado (colores creativos,
   personajes, tipografía expresiva). Nunca mezclar.
5. Los juegos son externos. El modo niño de esta fase solo muestra el selector y la
   pantalla de bienvenida del niño. No lanza juegos reales aún.

---

## Alcance de la fase

### Backend (subtarea B1)

**Modelo Child** — nueva colección `children`:
- `tutorId` (ref User, obligatorio) — propietario y único acceso en esta fase
- `name` (string, obligatorio)
- `birthDate` (Date, opcional)
- `avatarId` (string, enum de avatares predefinidos — niño/niña, sin upload de imágenes)
- `isActive` (boolean, default true)
- `createdAt`, `updatedAt` (timestamps)
- `accessGrants` (array vacío en esta fase, reservado para modelo mixto de §5.2)

**Endpoints CRUD** — todos bajo `protect + requireRole('tutor') + requireActiveSubscription`:
- `POST   /api/children`         — crear niño
- `GET    /api/children`         — listar niños del tutor autenticado
- `GET    /api/children/:id`     — obtener un niño (validar ownership)
- `PUT    /api/children/:id`     — editar nombre, fechaNacimiento, avatarId
- `DELETE /api/children/:id`     — baja lógica (isActive = false), no borrado físico

**Validaciones de seguridad críticas:**
- En GET/:id, PUT/:id, DELETE/:id: verificar que `child.tutorId === req.user._id`.
  Si no coincide → 403. Nunca filtrar solo por `:id`.
- No devolver datos de niños de otros tutores bajo ninguna circunstancia.

**Archivos a crear:**
- `server/models/Child.js`
- `server/controllers/childController.js`
- `server/routes/children.js`
- Registrar en `server/index.js` (o app.js, según el entry point)

### Frontend (subtareas F1 + F2)

**F1 — Vista "Mi hijo/a" en el dashboard del tutor**

Referencia: `referencias/Tut_MiHijoa.png`

Componentes:
- Tarjeta de perfil del niño seleccionado (nombre, avatar, edad calculada, objetivo principal)
- Resumen de progreso con barras de porcentaje (Pronunciación, Comprensión, Conciencia fonológica, Participación)
- Lista de actividades asignadas (placeholder en esta fase, datos mock)
- Botón "Ingresar al modo niño" — dispara el cambio de contexto visual
- Botón "Ver todas las actividades" (link placeholder)
- Sección "Consejo para ti" (texto estático de muestra)

Integración con API:
- GET /api/children al montar → lista de niños del tutor
- Selector de perfil en sidebar/header del tutor: muestra los niños y permite cambiar el activo
- El niño seleccionado se almacena en un nuevo contexto React: `ChildContext`

**F2 — Modo niño (contexto visual gamificado)**

Referencia: `referencias/Tut_Dashboard.png` (panel general del tutor, que ya muestra
la vista con el niño activo: "Hola, Ana! Estás en el progreso de Sofía")

El modo niño NO es una nueva ruta. Es un cambio de contexto visual dentro de `/tutor/*`.

Implementación:
- `ChildContext` expone: `activeChild`, `setActiveChild`, `childMode`, `enterChildMode`, `exitChildMode`
- Cuando `childMode === true`, el layout del tutor se reemplaza por el layout gamificado
- El layout gamificado usa: `bg-gradient-creative`, personajes de `referencias/Personajes/`,
  tipografía expresiva, tokens `creative`, `energy`, `optimism`
- Pantalla de bienvenida del modo niño: nombre del niño, avatar seleccionado, listado de
  actividades asignadas (mock en esta fase), botón "Salir" que llama `exitChildMode`
- El header del modo niño NO muestra datos del tutor: solo el nombre del niño y el botón de salida

**Nuevo ChildContext** — archivo: `client/src/context/ChildContext.jsx`
- `activeChild`: objeto `{ _id, name, avatarId, birthDate }` o `null`
- `childMode`: boolean
- `enterChildMode(child)`: setea activeChild + childMode=true
- `exitChildMode()`: childMode=false (activeChild se mantiene seleccionado en el panel)

**Integración en App.jsx:**
- Envolver las rutas del tutor y niño en `<ChildProvider>`

**Revisión visual obligatoria antes del commit:**
Comparar pixel a pixel contra `referencias/Tut_Dashboard.png` y `referencias/Tut_MiHijoa.png`.
El agente frontend debe reportar explícitamente qué coincide y qué difiere, antes de hacer commit.

---

## Secuencia de ejecución

1. [x] Arquitecto lee spec y referencias → este plan
2. [ ] Backend ejecuta subtarea B1 → devuelve resumen
3. [ ] Arquitecto revisa B1 (seguridad de ownership, modelo de datos)
4. [ ] Frontend ejecuta F1 (vista Mi hijo/a, ChildContext, integración API)
5. [ ] Frontend ejecuta F2 (modo niño, layout gamificado)
6. [ ] Frontend hace revisión visual obligatoria y reporta
7. [ ] Arquitecto integra y cierra la fase

---

## Criterios de aceptación

- [ ] `POST /api/children` crea un niño vinculado al tutor autenticado
- [ ] `GET /api/children` devuelve SOLO los niños del tutor autenticado
- [ ] Un tutor NO puede acceder a niños de otro tutor (403 en endpoint y en UI)
- [ ] El dashboard del tutor muestra la lista de niños y permite seleccionar uno
- [ ] Al seleccionar un niño, el panel muestra la vista "Mi hijo/a" de la referencia
- [ ] El botón "Ingresar al modo niño" activa el layout gamificado completo
- [ ] El modo niño usa exclusivamente los tokens `creative`, `energy`, `optimism` — sin colores del panel profesional
- [ ] El botón "Salir" devuelve al panel del tutor sin perder la sesión
- [ ] La revisión visual está documentada en el resumen final del agente frontend

---

## Fuera de alcance en esta fase

- Asignación real de actividades (Fase 4 o posterior)
- Modelo mixto tutor+profesional sobre la misma ficha (§5.2) — se reserva el campo `accessGrants`
- Progreso real con datos de la DB (la UI usa datos mock en esta fase)
- Lanzamiento de juegos externos
