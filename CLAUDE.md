# Didactifonis — Contexto del Proyecto

> Este archivo se carga automáticamente en la sesión principal y en **cada subagente**.
> Manténlo corto: todo lo que pongas aquí se multiplica en cada contexto. Solo verdades estables.

## 1. Qué es

Plataforma educativa de apoyo a la **terapia fonoaudiológica infantil**. Conecta de forma
segura a tres tipos de usuario: **fonoaudiólogos**, **padres/tutores** y **niños/niñas**.
Stack **MERN**: MongoDB · Express · React · Node.js.

> **Fuente de verdad funcional:** `docs/especificacion-funcional.md`. Léelo antes de
> planificar. Este `CLAUDE.md` solo resume; el detalle y las decisiones pendientes
> están allí.

## 2. Reglas de negocio (no negociables)

- **Roles.** Tres roles operativos —fonoaudiólogo, tutor, niño— más un rol de
  **Administrador** de plataforma. El niño no es una cuenta: entra siempre vía la del
  tutor.
- **Dos entornos visuales.** Las vistas de fonoaudiólogo, tutor y administrador son
  paneles de gestión limpios y métricos (estilo plano técnico / CAD). La **gamificación
  pertenece exclusivamente al flujo del niño** (los juegos). Nunca mezclar lo lúdico en
  los paneles profesionales.
- **Acceso por suscripción.** El registro es abierto, pero las funcionalidades se
  desbloquean solo con suscripción válida o periodo de prueba vigente.
- **Actividades restringidas por rol.** El tutor accede a packs cerrados de actividades;
  el profesional arma terapias seleccionando actividades libremente. Solo el
  Administrador sube contenido.
- **El niño solo juega.** El niño no gestiona ni configura nada: solo ejecuta las
  actividades/tareas que se le asignan. Flujo: se asigna → el niño inicia el juego →
  recibe instrucciones (audio o desde el tutor) → juega → **el juego envía los
  resultados a la plataforma** → se registran y sincronizan.
- **Los juegos son EXTERNOS.** Los juegos/actividades se desarrollan en un proyecto
  aparte y se suben a la plataforma. **Este proyecto NO construye ni ejecuta juegos.**
  La plataforma solo: (a) aloja/lista las actividades subidas, (b) las asigna, (c)
  **recibe y registra** los resultados que el juego envía a través de un contrato de
  datos definido. La frontera juego↔plataforma es el contrato de ingesta de resultados
  (ver `docs/especificacion-funcional.md`, sección de Actividades).
- **Sincronización de resultados.** Un niño puede estar vinculado opcionalmente a un
  fonoaudiólogo de seguimiento. Si lo está, los resultados se sincronizan con el
  profesional. Si no, el tutor los ve en la página *Progreso*. El tutor siempre tiene
  visibilidad; el profesional solo si está vinculado.
- **Datos sensibles.** Se tratan datos de salud de menores. Toda decisión de modelo de
  datos, endpoint o UI debe respetar la línea base de seguridad (ver sección 6).
- **NO es un producto médico (frontera regulatoria).** La plataforma es una **herramienta
  de apoyo**, no un dispositivo médico. **Prohibido**: diagnóstico, prescripción, scoring
  clínico, clasificación de patologías o recomendación terapéutica automatizada. Cruzar
  esa línea reclasifica la plataforma como software médico (SaMD) y cambia todo el marco
  regulatorio. Si una tarea propone algo así (p. ej. "IA que sugiera la próxima actividad
  según el progreso"), se rechaza y se eleva al arquitecto.
- **Dos capas de datos.** Capa 1 educativa (juegos, métricas, progreso gamificado) y
  Capa 2 registro clínico profesional (notas, observaciones, objetivos del profesional).
  La Capa 2 solo existe con profesional vinculado y exige protección reforzada. No
  mezclar ambas en el modelo de datos (ver `docs/marco-legal.md`).

## 3. Las dos piezas de este proyecto

Este repositorio entrega **dos productos distintos** que comparten identidad visual pero
no lógica:

1. **Landing** — sitio público de marketing y captación. Sin autenticación. Incluye la
   zona de Recursos de muestra. Su objetivo es conversión, no gestión de datos.
2. **Plataforma (app)** — la aplicación con estado, roles, autenticación y datos
   sensibles. Es donde vive todo lo de RBAC, suscripción y fichas.

Lo que **NO** está en este proyecto: los **juegos/actividades**, que se desarrollan
externamente y se suben. La plataforma solo los aloja, asigna y registra sus resultados.

### Estructura de carpetas (objetivo)

```
/landing       Sitio público (marketing + Recursos de muestra). Sin auth.
/client        App React (Vite). UI por rol: /pro, /tutor, /nino, /admin
/server        Node + Express. /models /routes /controllers /middleware
/server/activities   Ingesta y registro de resultados de juegos EXTERNOS
                     (NO contiene lógica de juego; recibe el contrato de datos)
/shared        VACIADO (2026-06-11): el contrato de juego vive en el repo hermano
               C:\didactifonis-contract (@didactifonis/contract, consumido vía
               file: link). Ver shared/README.md y docs/plan-sdk-engine-juegos.md.
/docs          Specs, planes y decisiones de arquitectura (ADR)
                 └ especificacion-funcional.md  ← fuente de verdad funcional
/referencias   Visuales PNG/JPEG de la plataforma (NO hay archivos Figma)
design-system.md   Tokens de diseño verificables (fuente de verdad visual)
```

> Si la Landing y la App deben vivir en repos separados o en un monorepo es una decisión
> abierta para el arquitecto (ver spec). Por defecto, monorepo con `/landing` y `/client`.

## 4. Equipo de agentes

| Agente | Rol | Cuándo se usa |
| :-- | :-- | :-- |
| `didactifonis-architect` | Tech Lead / orquestador | Planificar, dividir tareas, revisar e integrar. Se ejecuta como sesión principal. NO escribe código de producción. |
| `didactifonis-frontend` | UI / UX (React, Tailwind) | Maquetar vistas a partir de `/referencias` y `design-system.md`. |
| `didactifonis-backend` | API y datos (Node, Express, MongoDB) | Esquemas, endpoints, lógica de negocio, RBAC. |
| `didactifonis-qa` | Auditor técnico / debugging | Diagnosticar bugs y aplicar correcciones quirúrgicas. |
| `didactifonis-security` | Seguridad y compliance | Auditar datos de menores y cumplimiento legal. Solo reporta. |

El **arquitecto** delega; los demás ejecutan en su propio contexto y devuelven un resumen.

## 5. Guardrails globales (evitar alucinaciones y bucles)

- **Verificar antes de asumir.** Si no conoces una ruta, función, esquema o versión de
  librería: léela (`Read`, `Grep`, `Glob`) o pregúntalo. Nunca la inventes.
- **No reescribir lo que funciona.** Cambios mínimos y localizados. Un agente no toca
  archivos fuera de su tarea.
- **Cortar bucles.** Si una corrección falla 2 veces seguidas, detente, resume el estado
  y los intentos, y devuelve el control en lugar de seguir iterando.
- **Una tarea, un alcance.** Si la petición crece, pídele al arquitecto que la divida.
- **Mantén el contexto limpio.** Operaciones ruidosas (tests, logs largos, fetch de
  documentación) van en subagentes; al hilo principal solo vuelve el resumen.

## 6. Línea base de seguridad

- Datos de menores y de salud = **datos sensibles**. Requieren consentimiento informado
  del tutor, finalidad limitada y control de acceso por rol (RBAC).
- Normativa aplicable: **Ley 21.719** (reforma de la Ley 19.628, Chile), que entra en
  vigencia el **1 de diciembre de 2026**. El proyecto se construye conforme a ese
  estándar (alineado a GDPR). Detalle operativo en el agente `didactifonis-security` y en
  **`docs/marco-legal.md`** (informe de abogado, fuente autoritativa).
- Nunca exponer secretos, claves ni cadenas de conexión en código o logs.

## 7. Convenciones de código

- Tipografía: **Poppins** (títulos/UI), **Nunito Sans** (cuerpo).
- Colores y radios: usar **siempre** los tokens de `design-system.md`. Nunca hex sueltos.
- Prohibido en UI: neones, *sci-fi glows*, *lens flares*, brillos artificiales.
- Commits pequeños y descriptivos. Una rama por funcionalidad.
