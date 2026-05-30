# Especificación Funcional — Didactifonis (MVP)

> **Propósito.** Este documento es la **fuente de verdad funcional** del proyecto, igual
> que `design-system.md` lo es de la visual. El agente `didactifonis-architect` debe
> leerlo antes de planificar nada y mantenerlo actualizado conforme se cierren las
> decisiones pendientes.
>
> **Estado.** Borrador para entrevista. Las secciones marcadas con 🔴 **PENDIENTE** son
> decisiones aún no tomadas: el arquitecto debe resolverlas con el equipo humano antes
> de delegar trabajo que dependa de ellas. No deben rellenarse con suposiciones.

---

## 1. Resumen del producto

Plataforma educativa de apoyo a la terapia fonoaudiológica infantil. Conecta a tres
tipos de usuario operativos —**fonoaudiólogos**, **padres/tutores** y **niños**— más un
rol de **administración de plataforma**. Stack MERN. El niño solo juega; el sistema
registra y sincroniza los resultados.

**Este proyecto entrega dos piezas:**
1. **Landing** — sitio público de marketing/captación, sin autenticación (incluye
   Recursos de muestra).
2. **Plataforma (app)** — la aplicación con roles, estado, datos sensibles y RBAC.

**Fuera de alcance de este proyecto:**
- Los **juegos/actividades**, que se desarrollan externamente y se suben. La plataforma
  los aloja, asigna y registra sus resultados, pero **no los construye ni ejecuta**.
- El **Engine de creación de contenido** (assets, sonidos, animación, export ZIP) que
  produce esos juegos: proyecto hermano, tratado aparte.

---

## 2. Roles del sistema

| Rol | Naturaleza | Resumen |
| :-- | :-- | :-- |
| **Tutor** (padre/madre/tutor) | Usuario de pago | Gestiona uno o más niños, asigna actividades de packs, ve el progreso. |
| **Profesional** (fonoaudiólogo) | Usuario de pago | Gestiona pacientes, arma terapias a medida, da seguimiento. |
| **Niño** (paciente) | No es cuenta | No tiene login propio. Entra siempre vía la cuenta del tutor. Solo juega. |
| **Administrador** | Operador de plataforma | Gestiona usuarios, contenido, suscripciones, soporte y reportes globales. |

**Nota sobre el plan "Empresa".** El dashboard de admin muestra un "Plan Empresa". Esto
**no es un producto comercial vendible**: es el identificador interno del rol
Administrador. Ningún agente debe construirlo como plan de suscripción.

---

## 3. Autenticación y registro

### 3.1 Registro
- Registro **abierto** para Tutor y para Profesional (cualquiera puede crear cuenta).
- El acceso a las funcionalidades queda **bloqueado hasta validar la suscripción**
  (pago o periodo de prueba vigente). Una cuenta sin suscripción válida puede existir
  pero no opera.
- El **niño no se registra**: no tiene credenciales. Entra siempre a través de la cuenta
  del tutor. En el contexto de un Profesional, el niño existe como **ficha de paciente**,
  no como cuenta.

### 3.2 Periodos de prueba (al pasar a producción)
- **Tutor:** 7 días gratis.
- **Profesional:** 14 días gratis. (Más tiempo porque el profesional cita pacientes ~1
  vez por semana y necesita más margen para evaluar la herramienta.)

### 3.3 Cuenta demo (solo pruebas internas)
- Mientras no exista pasarela de pago, las pruebas internas usan un **usuario demo** que
  omite la validación de pago.
- **Restricción de seguridad:** el bypass de pago debe ser una **bandera de entorno**
  imposible de activar en producción. La cuenta demo **nunca** debe contener datos
  reales de menores — solo datos sintéticos.

### 3.4 Acceso del niño a la cuenta del tutor — RESUELTO

**Mecanismo:** cambio de contexto visual dentro de la sesión del tutor. Sin PIN ni sub-sesión independiente para el niño.

**Flujo:**
1. El tutor inicia sesión con sus propias credenciales (login estándar).
2. Dentro de su sesión, el tutor **asigna la actividad** al niño.
3. El tutor **selecciona el perfil del niño** desde su dashboard.
4. La UI cambia al **"modo niño"** (flujo lúdico, gamificado), reemplazando la vista del tutor.
5. El niño solo ve y ejecuta la actividad ya asignada. No navega, no elige, no configura.
6. Al terminar, la pantalla puede volver al modo tutor.

**Implicaciones de arquitectura:**
- La sesión JWT sigue siendo la del tutor. El ID del niño activo se pasa como estado de la aplicación.
- Los endpoints de ejecución de actividad reciben el ID del niño activo y validan en backend que ese niño pertenezca al tutor autenticado.
- El frontend implementa un "modo niño" que es un contexto visual distinto, no una sesión técnica separada.

---

## 4. Suscripción y pago

- No existe plan gratuito de la plataforma.
- La **landing page** ofrece una sección pública de **Recursos** (material de muestra,
  no la app completa) como vía de captación y confianza previa a la suscripción. Esta
  zona es contenido de marketing **sin autenticación**, separada del producto.
- **RESUELTO — Pasarela de pago:** proveedor priorizado **Transbank / Webpay Plus**. Afiliación pendiente de iniciar. Emisor DTE (boleta/factura electrónica SII) sin definir todavía — bloqueante solo para el módulo de facturación, no para el resto del MVP.
  - **Directriz de arquitectura (confirmada):** la integración de pago se construye como un **módulo aislado tras una interfaz genérica** (adaptador), de modo que cambiar de proveedor no obligue a reescribir lógica de negocio. Igual aplica al módulo de facturación electrónica.

---

## 5. Vinculación entre roles

### 5.1 Cardinalidades (confirmadas)
- Un **niño** tiene **exactamente un tutor** (no más de uno).
- Un niño puede tener **un tutor + un profesional** simultáneamente.
- Un **tutor** puede tener **varios niños**.
- Un **profesional** puede tener **varios pacientes**.

### 5.2 Creación de la ficha del niño — modelo mixto por consentimiento
La ficha/perfil del niño puede ser creada por el **tutor** o por el **profesional**:
- Si la familia usa la plataforma por su cuenta, el **tutor** crea la ficha.
- Si el niño asiste con un profesional que usa la plataforma, el **profesional** crea la
  ficha de paciente.

**Modelo de datos requerido (directriz al agente backend):**
- La ficha del niño es **una sola entidad**, con un **propietario** (quien la creó) y
  una **lista de accesos concedidos** a otros roles. No se crean dos fichas que luego se
  fusionan.
- Si el tutor creó la ficha y luego lleva al niño con un profesional con cuenta, el
  profesional puede obtener acceso **previo consentimiento explícito del tutor**. Una
  vez con acceso, el profesional puede **complementar** la ficha.
- Todo acceso concedido queda **registrado** (quién lo concede, a quién, cuándo, con qué
  alcance) y debe ser **revocable**.
- Este es el punto **más sensible** del proyecto (datos de salud de un menor). El agente
  `didactifonis-security` debe auditarlo como crítico.

### 5.3 Contacto con un profesional — RESUELTO

Dos vías complementarias con prioridades distintas:

**Vía principal (tutor ya conoce a su profesional):** el profesional genera un **código o link de invitación** desde su panel. El tutor lo ingresa en su panel para establecer el vínculo. El backend genera un token con caducidad, lo valida al ingresarlo y registra el vínculo con consentimiento.

**Vía secundaria (tutor aún no tiene profesional):** directorio de profesionales activos con solicitud directa. El tutor puede buscar y contactar desde la plataforma.

**Postergado para versión posterior:** demanda abierta (notificación global a todos los profesionales). No entra en el MVP.

**Implicación de arquitectura:** ambas vías producen la misma entidad de vínculo `profesional ↔ tutor/niño`. Una vez establecido el vínculo por cualquiera de las dos vías, se activa la mensajería (sección 10) y el acceso a la ficha según el modelo mixto de 5.2.

### 5.4 Profesional externo (sin cuenta)
Si el profesional del niño **no usa la plataforma**, el tutor puede **exportar un PDF**
con: resumen del progreso del niño, y la descripción y enfoque de cada actividad
realizada (con sus resultados aprobados/reprobados). Ver sección 8.

---

## 6. Actividades y terapias

### 6.1 Principio: las actividades están restringidas por rol
- **Tutor — biblioteca limitada por packs.** El tutor accede a **packs de actividades**
  con una curva de aprendizaje comprobada: cada pack cubre los distintos niveles
  necesarios para una "autoterapia de ayuda sin seguimiento". El tutor **no** elige
  actividad por actividad de forma libre.
  - Razón: el tutor no tiene la formación para diseñar un tratamiento; el pack garantiza
    el mínimo requerido en cada nivel.
- **Profesional — biblioteca completa, sin límite.** El profesional arma sus propias
  terapias seleccionando actividades individuales en la cantidad y nivel que estime
  (p. ej. 2-3 de nivel 1, 2 de nivel medio). Selección libre y a medida.

### 6.2 Asignación de actividades
- **Sin profesional vinculado:** el **tutor** asigna actividades desde sus packs,
  siempre que tenga **cuenta/suscripción activa**.
- **Con profesional vinculado:** el niño accede a **más actividades**, pero **solo las
  que el profesional le asigne**. Si el profesional no asigna nada, el niño mantiene
  acceso a las actividades del rol Tutor.
- Si la cuenta del tutor **no está activa**, el tutor no puede asignar; en ese escenario
  solo el profesional designa actividades.
- Las actividades/tareas asignadas por el profesional se entregan **mediante un link**.

### 6.3 Aviso obligatorio (autoterapia sin profesional)
Cuando el niño sigue actividades **sin profesional**, la plataforma debe **mostrar un
aviso claro**: el material ayuda, pero **no reemplaza** el tratamiento ni el seguimiento
de un profesional. Este aviso es un requisito, no opcional.

### 6.4 Origen del contenido
- **Solo el Administrador** crea recursos y sube actividades a la plataforma.
- Tutores y profesionales **pueden solicitar o recomendar** material para Recursos y
  actividades, pero no publican contenido.

### 6.5 Los juegos son externos — frontera del proyecto
Las actividades/juegos se desarrollan **fuera de este proyecto** y se suben a la
plataforma. La plataforma trata cada actividad como **metadatos + un bundle**:
- **Metadatos**: título, tipo, objetivo terapéutico, nivel de dificultad, rango de edad,
  duración. Es lo que se filtra y se muestra en la biblioteca (ver captura de
  Actividades).
- **Bundle**: el paquete del juego subido. La plataforma lo aloja y lo sirve al launcher
  del niño; **no ejecuta ni conoce su lógica interna**.

**Carga de actividades (vía única: ZIP por el Administrador).** Las actividades se suben
como **paquete ZIP** desde el panel de administración (humano autenticado). Se descartó
FTP por falta de identidad y trazabilidad; si en el futuro se requiere carga automatizada
desde el Engine, será mediante un **endpoint de ingesta autenticado** (API key de
servicio), no FTP.

Hay **dos contratos distintos** entre el Engine/juego y la plataforma — no confundirlos:

- **Contrato de publicación (entrada, en tiempo de subida).** Estructura del ZIP: un
  **manifiesto** con los metadatos (título, tipo, fonema/habilidad, nivel, edad,
  duración) + los assets + el punto de entrada del juego. El manifiesto es lo que alimenta
  los filtros de la biblioteca de Actividades. Incluye validación del paquete y
  versionado para correcciones.
- **Contrato de resultados (salida, en tiempo de ejecución).** El esquema JSON que el
  juego envía cuando el niño termina (ver 6.5 más abajo). Tratado como entrada no
  confiable.

🔴 **PENDIENTE** — el detalle de ambos contratos (formato exacto del manifiesto y del
ZIP; esquema y protocolo de resultados; autenticación del juego) se acuerda entre el
equipo de plataforma y el de juegos/Engine. Definir temprano: condiciona modelo de datos
y launcher.

---

## 7. Progreso, logros y visibilidad de datos

- Los **resultados de cada actividad** (puntaje, intentos, tiempo, aprobado/reprobado)
  se registran en el sistema cuando el niño completa el juego.
- **Tutor:** siempre ve el progreso y los logros de **sus** niños en la página Progreso.
- **Profesional:** ve actividades, progreso y registros de **sus pacientes vinculados**.
- **Tutor + Profesional:** cuando ambos están vinculados al mismo niño, **ambos** ven
  logros y progreso.
- **Regla de seguridad estricta:** un tutor **nunca** puede ver datos de niños que no
  estén bajo su tutoría. El control de acceso se aplica en el backend, no solo en la UI.

---

## 8. Reportes / exportación PDF

- El **tutor** siempre puede solicitar un **PDF resumen** con: progreso del niño +
  descripción y enfoque de las actividades realizadas. Pensado para mostrárselo a un
  profesional **externo** (sin cuenta).
- El **profesional con cuenta** no necesita el PDF para esto: ve directamente
  actividades, progreso y registros de sus pacientes dentro de la plataforma.

---

## 9. Alcance del MVP

**Entra todo lo que muestran las capturas de diseño.** Las vistas no mencionadas
explícitamente estarán en el directorio `/referencias` como PNG/JPEG.

Módulos confirmados para el MVP:

| Módulo | Notas |
| :-- | :-- |
| Autenticación y registro | Con bloqueo por suscripción. |
| Suscripciones y pago | Pago tras una interfaz genérica; proveedor 🔴 pendiente. |
| Dashboard Profesional | Panel limpio y métrico. |
| Dashboard Tutor | Panel limpio y métrico. |
| Flujo del niño (juegos) | Lúdico. El contenido de los juegos lo produce el Engine hermano. |
| Actividades / Terapias | Packs (tutor) vs selección libre (profesional). |
| Progreso y Logros | Con reglas de visibilidad de la sección 7. |
| Reportes y exportación PDF | Sección 8. |
| Calendario / Citas | Ver anexo J (agenda del profesional). |
| Mensajes | Ver anexo A (condicional). |
| Recursos | Contenido creado solo por Admin. |
| Comunidad | Ver anexo B (sección nueva). |
| Configuración | Por rol. |
| Panel de Administración | Usuarios, profesionales, tutores, niños, actividades, terapias, suscripciones, pagos, reportes, contenido, soporte. |

---

## 10. Mensajería (condicional)

- La sección **Mensajes** es un chat **Profesional ↔ Tutor**.
- Si el tutor **no tiene profesional**, la sección **no existe** / permanece inactiva.
  Solo se activa si se requiere contactar a un profesional (ver 5.3).
- Los hilos son privados; el agente de seguridad audita que no haya filtración entre
  conversaciones ni a terceros.

---

## 11. Comunidad (sección nueva)

- Espacio tipo foro (referencia conceptual: Reddit), **exclusivo para suscriptores**,
  enfocado en Didactifonis.
- Objetivo: que tutores y profesionales hagan consultas, compartan historias, métodos y
  habilidades que ayudaron al desarrollo comunicativo de los niños. Un lugar de confianza.
- 🔴 **PENDIENTE** — definir para el MVP: ¿categorías/temas?, ¿moderación (a cargo del
  Admin)?, ¿anonimato o identidad?, ¿se permite hablar de casos de menores y con qué
  límites? Esto último tiene implicancia de privacidad: el agente de seguridad debe
  opinar antes de construirlo.

---

## 12. Calendario y agendamiento

- El **profesional** publica sus **horas disponibles**.
- El **tutor** solicita una hora dentro de esa disponibilidad; o el profesional la
  **asigna manualmente**.
- Integra con la sección Citas/Calendario que aparece en los diseños.

---

## 13. Seguridad, privacidad y cumplimiento legal

> **Fuente autoritativa:** `docs/marco-legal.md` (informe de abogado real). Operación a
> cargo del agente `didactifonis-security`. Aquí va el resumen funcional.

- **Normativa base:** Ley 21.719 (reforma de la Ley 19.628, Chile), vigente desde el
  **1 de diciembre de 2026**, alineada a GDPR. El proyecto se construye conforme a ella
  desde ya.
- **NO es producto médico.** Didactifonis es herramienta de apoyo, **no** SaMD, mientras
  no diagnostique, prescriba, haga scoring clínico ni recomiende terapia automáticamente.
  Esta frontera es deliberada y se mantiene (refuerza la decisión previa de no incluir
  capa de IA). Cruzarla cambia todo el marco regulatorio.
- **Datos sensibles igualmente.** No ser producto médico no exime: el progreso y las
  métricas (incluso gamificadas) son datos sensibles/inferidos. Tratamiento reforzado,
  finalidad limitada, minimización; **conservación 5–10 años** desde la última
  interacción terapéutica, con borrado seguro.
- **Separación en dos capas** (directriz de arquitectura del abogado):
  - Capa 1 educativa (juegos, métricas, progreso) — siempre presente.
  - Capa 2 registro clínico profesional (notas, observaciones, objetivos del profesional)
    — solo con profesional vinculado; seguridad, logs y consentimiento reforzados.
  No mezclar ambas en el modelo de datos.
- **Consentimientos** (versionados; registrar fecha, IP, versión, identidad del tutor):
  - Tutor: consiente el tratamiento de los datos del menor.
  - Profesional: veracidad de sus datos; responsable de su habilitación; consciente de
    que **en v1 no se valida su registro profesional** (anexo D); las decisiones clínicas
    son suyas.
  - Acceso a ficha en modelo mixto (5.2): explícito, registrado, revocable de forma
    simple e inmediata.
- **Ficha clínica (Ley 20.584) — resuelto por el abogado.** Didactifonis **no constituye
  por sí misma una ficha clínica oficial** mientras no diagnostique ni decida. Con un
  profesional usándola, puede operar como antecedente clínico complementario y la
  plataforma como encargado de tratamiento; el profesional sigue siendo el responsable
  principal. Esto se cubre con la separación de capas y los consentimientos.
- **Pagos:** no almacenar tarjetas; tokenización; separar datos financieros de los
  terapéuticos. **Cloud:** si los datos salen de Chile, contrato con el proveedor y
  cláusulas de protección.
- **RBAC** en todos los endpoints. Cifrado en tránsito y reposo. Sin secretos en código
  ni logs. Preparación para notificar brechas.

### 13.1 Plan de tres asesorías legales
1. **Diseño** — informe ya incorporado (`docs/marco-legal.md`).
2. **Marcha blanca** — segunda asesoría tras implementar y testear, antes de abrir a
   usuarios reales: valida que la implementación cumpla lo diseñado.
3. **Diciembre 2026** — tercera asesoría a la entrada en vigencia plena de la Ley 21.719:
   alinear con cambios definitivos y **notificar a los usuarios** si la plataforma ya
   está en uso.

---

## 14. Decisiones pendientes (consolidado para la entrevista)

El arquitecto debe cerrar estos puntos con el equipo humano antes de delegar trabajo
dependiente:

1. **3.4** — Mecanismo concreto de acceso del niño vía la cuenta del tutor.
2. **4** — Proveedor de pasarela de pago chilena y detalle de boleta electrónica SII.
3. **5.3** — Mecánica de "Contactar al profesional": formulario, notificación global o
   ambas.
4. **6.5** — Contratos de publicación (ZIP/manifiesto) y de resultados. Frontera con el
   proyecto externo de juegos; se acuerda entre ambos equipos.
5. **11** — Reglas de la Comunidad: moderación, identidad, límites sobre casos de
   menores.

> **Resuelto** (ya no es pendiente): la calificación legal de ficha clínica (Ley 20.584)
> fue abordada por el abogado — ver sección 13 y `docs/marco-legal.md`. Quedan los dos
> hitos de asesoría futuros (marcha blanca y diciembre 2026), que son acciones del equipo
> en el calendario, no decisiones de diseño bloqueantes.

---

## Anexos (notas del cliente, integradas arriba)

- **A.** Mensajería: chat Profesional↔Tutor; condicional (sección 10).
- **B.** Comunidad: sección nueva tipo foro para suscriptores (sección 11).
- **C.** Actividades del profesional vía link; con Tutor+Profesional, ambos ven logros y
  progreso (secciones 6.2 y 7).
- **D.** Registro del profesional con consentimiento de veracidad; sin validación de
  número profesional en v1 (sección 13).
- **E.** Revisión legal de fichas clínicas — pendiente, requiere abogado (sección 13).
- **F.** PDF resumen para profesional externo; profesional con cuenta ve todo en la
  plataforma (sección 8).
- **G.** "Plan Empresa" = identificador interno del rol Administrador, no es producto
  comercial (sección 2).
- **H.** Un tutor no ve datos de niños fuera de su tutoría (sección 7).
- **I.** Solo el Administrador crea recursos y sube actividades; tutores y profesionales
  solo recomiendan (sección 6.4).
- **J.** Agendamiento: el profesional publica disponibilidad; el tutor solicita o el
  profesional asigna manualmente (sección 12).
