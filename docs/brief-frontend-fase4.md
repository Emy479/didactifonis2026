# Brief Frontend — Fase 4

Eres el agente **didactifonis-frontend** de Didactifonis. Tu tarea es implementar tres vistas/modificaciones de UI para la Fase 4. No toques archivos fuera de client/. No reescribas lo que ya funciona. Si algo falla 2 veces, detente y reporta.

## Contexto del proyecto
Stack: React + Vite + Tailwind CSS. Directorio de trabajo: C:\Didactifonis2026
API base: import.meta.env.VITE_API_URL || 'http://localhost:3001'
Token JWT: localStorage.getItem('auth_token')

ANTES de tocar nada, lee:
- C:\Didactifonis2026\client\src\pages\tutor\DashboardTutor.jsx (patron de layout y navegacion)
- C:\Didactifonis2026\client\src\pages\tutor\MiHijoa.jsx (patron de componentes existentes)
- C:\Didactifonis2026\client\src\context\ChildContext.jsx (children, activeChild disponibles)
- C:\Didactifonis2026\client\src\pages\nino\DashboardNino.jsx (el que vas a modificar)
- C:\Didactifonis2026\design-system.md (tokens de color y tipografia — obligatorio)

Referencias visuales a leer:
- C:\Didactifonis2026\referencias\Tut_Actividades.png
- C:\Didactifonis2026\referencias\Tut_Tareas.png

## Reglas de design system (NO negociables)
- Colores: SOLO tokens (primary, accent, creative, energy, optimism, surface, text-soft, text-strong). Sin hex sueltos.
- Tipografia: font-heading (Poppins) para titulos y botones; font-body (Nunito Sans) para texto.
- Tarjetas: rounded-2xl minimo. Botones: rounded-xl minimo.
- Sin emojis en botones ni iconos de interfaz (usa texto o SVG neutros si necesitas icono).
- Paneles del tutor son LIMPIOS y METRICOS. Sin gamificacion. La gamificacion es SOLO para el modo nino.
- Prohibido: neones, brillos artificiales, gradientes no declarados en el design-system.

## Tarea F1 — client/src/pages/tutor/ActividadesTutor.jsx (NUEVO)
Referencia visual: Tut_Actividades.png

Este componente recibe como prop: `selectedChildId` (puede ser null si no hay nino seleccionado).
No tiene acceso a ChildContext directamente; el padre (DashboardTutor) pasa el childId.

Comportamiento:
1. Al montar: fetch GET /api/activities con token. Muestra la lista.
2. Tres tabs: "Asignadas" / "Completadas" / "Todas" — los tabs filtran los assignments del nino seleccionado.
   - "Todas" muestra el catalogo de actividades disponibles para el tutor.
   - "Asignadas" y "Completadas" requieren selectedChildId para hacer GET /api/assignments?childId=X&status=pending o &status=completed.
   - Si selectedChildId es null, mostrar un mensaje: "Selecciona un nino/a para ver sus actividades asignadas".
3. Lista de actividades (tab "Todas"):
   - Card por actividad: si hay thumbnailUrl mostrarla; si no, un rectangulo con color segun type.
   - Mostrar: titulo, tipo, nivel de dificultad (Nivel 1/2/3), duracion en minutos.
   - Boton "Asignar" en cada card. Solo activo si hay selectedChildId.
   - Si no hay selectedChildId y el usuario presiona Asignar, mostrar tooltip o mensaje inline: "Selecciona primero un nino/a".
4. Modal de asignacion (al presionar Asignar):
   - Muestra el nombre de la actividad.
   - Campo: fecha limite (dueDate) opcional — input type date.
   - Botones: Cancelar / Confirmar asignacion.
   - Al confirmar: POST /api/assignments { activityId, childId: selectedChildId, dueDate? }.
   - Si 403 con mensaje "Esta actividad no esta disponible para tutores": mostrar ese mensaje al usuario.
   - Si exito: cerrar modal, mostrar mensaje de exito inline por 3 segundos.
5. Aviso obligatorio (spec seccion 6.3):
   - Si selectedChildId existe pero no hay profesional vinculado (el campo linkedProfessional en child no existe o es null): mostrar aviso.
   - El aviso dice: "El material de apoyo ayuda, pero no reemplaza el tratamiento ni el seguimiento de un profesional fonoaudiologo."
   - Estilo: banner sutil en la parte superior del contenido, sin ser alarmante. Usa bg-accent/10 border border-accent/30 rounded-xl p-3.

Para saber si el nino tiene profesional vinculado: el ChildContext expone `children` (array). Busca el child con _id === selectedChildId y revisa si tiene campo linkedProfessional.

Estado de carga: mientras fetch -> texto "Cargando actividades..." centrado.
Estado vacio: si no hay actividades -> "No hay actividades disponibles."

## Tarea F2 — client/src/pages/tutor/TareasTutor.jsx (NUEVO)
Referencia visual: Tut_Tareas.png

Este componente recibe como prop: `selectedChildId`.

Comportamiento:
1. Si selectedChildId es null: mostrar "Selecciona un nino/a para ver sus tareas".
2. Si hay selectedChildId: fetch GET /api/assignments?childId=X al montar.
3. Tres tabs: "Pendientes" / "Completadas" / "Todas" — filtran localmente el array cargado.
4. Lista de tareas (assignments):
   - Cada fila: nombre de la actividad (assignment.activityId.title), tipo, nivel.
   - Badge de estado: pendiente (bg-energy/20 text-energy) / completada (bg-primary/20 text-primary) / omitida (bg-text-soft/20 text-text-soft).
   - Fecha de asignacion y fecha limite si existe.
5. Panel lateral derecho (sidebar):
   - Resumen: total pendientes, total completadas, total general.
   - "Proxima cita": placeholder de texto por ahora (no hay datos reales aun).
6. Estado de carga y estado vacio igual que F1.
7. Sin gamificacion. Panel limpio y metrico.

## Tarea F3 — Modificar client/src/pages/nino/DashboardNino.jsx
NO reescribir el componente entero. Modificacion quirurgica: reemplazar el array hardcodeado por datos reales.

Cambio especifico:
- Eliminar el array hardcodeado `const activities = [...]` (lineas 37-41 aprox).
- Agregar estado: `const [assignments, setAssignments] = useState([])` y `const [loadingAssignments, setLoadingAssignments] = useState(true)`.
- Agregar useEffect que al montar (si activeChild existe) hace:
  fetch GET /api/assignments?childId=${activeChild._id}&status=pending con el token del tutor (localStorage.getItem('auth_token')).
  Al recibir: setAssignments(data). Al error: setAssignments([]).
- Reemplazar el render de las cards con el array `assignments`:
  - Si loadingAssignments: mostrar texto "Cargando actividades..." con estilo lúdico.
  - Si assignments.length === 0: mostrar mensaje ludico "¡Todo listo por hoy! Vuelve manana para seguir jugando" con una estrella grande.
  - Si hay assignments: mostrar cards con assignment.activityId.title como nombre.
    El boton dice "¡Jugar ahora!". El onClick por ahora no hace nada (bundleUrl es placeholder).
    Usar colores de fondo variados segun el indice: alternar between 'from-creative to-accent', 'from-accent to-primary', 'from-energy to-optimism'.
- MANTENER el aviso de "Recuerda practicar todos los dias" en el footer.
- MANTENER el boton de salir.
- MANTENER el bloque de estrellas/logros con el texto "¡Sigue asi!".

## Integracion en DashboardTutor.jsx
Despues de crear F1 y F2, modificar DashboardTutor.jsx:

1. Agregar imports de ActividadesTutor y TareasTutor.
2. En navItems, el item 'actividades' ya existe. Agregar 'tareas' si no existe:
   { id: 'tareas', label: 'Tareas', icon: 'icon-tareas' } — sin emoji en el icon, usa un string vacio o texto corto.
   REVISION: en el DashboardTutor existente, el array navItems ya tiene los items. Leelo antes de modificar para no duplicar.
3. En el bloque de render del main:
   - Cuando currentView === 'actividades': renderizar <ActividadesTutor selectedChildId={activeChild?._id || null} />
   - Cuando currentView === 'tareas': renderizar <TareasTutor selectedChildId={activeChild?._id || null} />
4. El placeholder "Sección en desarrollo: {currentView}" debe seguir apareciendo para los demas views no implementados.

Para obtener activeChild en DashboardTutor: ya esta en useChild() como activeChild. Verificar que este desestructurado.

## Revision visual obligatoria
Antes de terminar, compara tu implementacion mentalmente con las referencias:
- Tut_Actividades.png: lista de actividades con thumbnails, tabs, sidebar de resumen semanal.
- Tut_Tareas.png: lista de tareas con estados, tabs, sidebar con resumen y proxima cita.
Si hay desviaciones mayores (estructura de layout, tabs faltantes, sidebar ausente), corrígelas.

## Al terminar reporta
1. Archivos creados o modificados (rutas absolutas).
2. Desviaciones respecto a las referencias visuales (si las hay) y por que.
3. Lo que no pudiste implementar segun spec y por que.
