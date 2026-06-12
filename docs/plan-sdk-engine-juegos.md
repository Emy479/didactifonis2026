# Plan de trabajo — SDK / Engine standalone de juegos

> **Estado:** v0.8 — 6 ADR resueltas por Emiliano (2026-05-31), incl. ADR-SDK-06 (modelo de
> score). Visión del Engine (Phaser híbrido) incorporada. Campo `events` del contrato 2.B
> DEFINIDO (§2.B.1 y §2.B.2) y sus 4 decisiones abiertas (Q-EVT-1..4) **RESUELTAS** (§3.2).
> **El contrato de juego (2.A + 2.B) queda COMPLETAMENTE cerrado.**
> **Fase E0 y Fase E1 COMPLETADAS (2026-06-04). E2 Frente A COMPLETADO y VALIDADO (2026-06-11).**
> **E2 Frente B DESBLOQUEADO (2026-06-11): decisiones operativas a–d de ADR-SDK-05 cerradas.**
> **Juegos-piloto del MVP CONFIRMADOS por Emiliano (2026-06-04): §8.6.** Documento vivo.
> **Autor:** didactifonis-architect. **Dueño del contrato:** Emiliano (ver D4).
> **Fecha:** 2026-05-31 (última actualización: 2026-06-11, arranque Frente B).
>
> **Cambios v0.8 (2026-06-11):** **Frente B DESBLOQUEADO.** Emiliano cerró las 4 decisiones
> operativas pendientes de ADR-SDK-05, todas con la recomendación del arquitecto:
> **(a)** hosting en GitHub privado, misma cuenta, repos `didactifonis-contract` y
> `didactifonis-engine`; **(b)** scope npm `@didactifonis/contract` SIN publicar aún — consumo
> por link/workspace local, registry se decide al estabilizar y pinear ("link ahora, pin
> después"); **(c)** el SDK vive DENTRO del repo Engine (una sola pieza: el SDK es el
> runtime-bridge del Engine); **(d)** checkouts locales hermanos: `C:\didactifonis-contract` y
> `C:\didactifonis-engine` junto a `C:\Didactifonis2026` (la plataforma no se mueve). Plan de
> arranque acordado: **B-0** promoción del contrato (backend + QA) → **B-1** esqueleto del SDK
> en el repo Engine (frontend; espera el smoke manual de Emiliano del flujo niño→jugar) →
> **B-2** validación cruzada (security + QA). Detalle en `docs/brief-e2-sdk-launcher.md` §B.
> Estado de E2 actualizado en §4.
>
> **Cambios v0.7 (2026-06-04):** **Fase E1 cerrada y aceptada.** Implementada por
> `didactifonis-backend`, auditada por `didactifonis-security` (9 hallazgos remediados) y
> verificada por `didactifonis-qa` (incl. un bug crítico de consumo de token, corregido y probado
> contra MongoDB real, 16/16 assertions). Veredicto y decisiones abiertas registrados en §3.1 y en
> el estado de la Fase E1 (§4). **El próximo paso pasa a ser E2 (SDK JS cliente / launcher, lado
> frontend);** los dos arrastres de E0 quedaron cerrados en E1 (el `.cjs` ya se consume desde el
> server; comentario Q-EVT-3 corregido). E0 también marcada como COMPLETADA en §4.
>
> **Cambios v0.6 (2026-06-04):** Juegos-piloto del MVP CONFIRMADOS por Emiliano tras revisar 3
> PDFs de diseño en `referencias/JuegosEngine/`. Nueva **§8.6** (juegos-piloto concretos): los
> dos pilotos son **La Casa Mágica** (drag & drop, edad 4) + **La Máquina del Tiempo Verbal**
> (selección 1-de-3, edad 7); **El Mundo de las Metáforas** queda como tercero post-piloto (banco
> de assets más grande). `passThreshold` lo FIJA el Admin al subir la actividad (sin override del
> tutor en el MVP). Telemetría de repeticiones de audio a CRITERIO DEL AUTOR (no entra al catálogo
> estándar; evento custom `x_audio_replayed` o `hint_used`, opcional). §8.3 y §8.5 ajustados con
> punteros a §8.6. Confirmado que el contrato cerrado (2.A+2.B) soporta los 3 sin cambios
> estructurales (Capa 1, cero PII, no cruzan frontera SaMD).
>
> **Cambios v0.5 (2026-05-31):** Q-EVT-1..4 RESUELTAS por Emiliano (§3.2). Q-EVT-1: `events`
> opcional + SDK siempre emite el ciclo de vida. Q-EVT-2: SIN tope de contrato, pero **cap
> defensivo de ingesta** configurable en `/shared` (valor provisional, a calibrar en E2) que
> protege el documento del límite de 16 MB de MongoDB y del abuso por entrada no confiable —
> distinción "sin tope de contrato" (promesa al autor) vs. "cap defensivo de ingesta" (protección
> del servidor). Q-EVT-3: `type` sin `x_` → warning en dev + conservar como custom. Q-EVT-4:
> host emite pause/resume del ciclo de vida, autor opcional. §2.B.1, §2.B.2 y §3.0 ajustados; el
> "límite duro 200" pasa a ser el valor provisional del cap defensivo, no un tope de contrato.
>
> **Cambios v0.2:** §3 marca ADR-SDK-01 a 05 como RESUELTAS; nuevo §3.1 (brief backend de
> ADR-SDK-02 = Fase E1); nuevo §8 (Consultas resueltas: Windows, escalabilidad, nº de juegos
> piloto, mezcla Phaser/Rive/RPG Maker). ADR-SDK-04 fija Phaser como motor base.
> **§2.A DEFINIDO (2026-05-31):** payload de arranque consolidado bajo el principio "el juego
> recibe parámetros de la ACTIVIDAD, no atributos del NIÑO". Eliminado el bloque `child`
> (alias/ageBand/avatarId) y descartado el sexo del menor. Justificación legal incorporada.
> **Cambios v0.3 (2026-05-31):** divergencia del `score` RESUELTA (nuevo ADR-SDK-06). Score
> desacoplado: el juego envía `rawScore`+`maxScore`, la plataforma deriva `scorePercent` (0–100,
> canónico) y `passed`. §2.B reescrito con campos canónicos; §2.A inyecta `config.passThreshold`;
> nuevo §3.0 (brief backend de ajuste de modelo, Fase E0). E0 desbloqueada.
> **Cambios v0.4 (2026-05-31):** campo `events` de 2.B DEFINIDO. Nuevo §2.B.1 (dos planos de
> evento, esquema `{type,timestamp,payload}`, catálogo controlado estándar vs. custom `x_`,
> límites/validación, versionado, PII y frontera Capa 1). Nuevo §2.B.2 (API del SDK
> `reportEvent`/`submitResults`, reparto auto-SDK vs. autor, mapeo con el editor data-driven,
> impacto en almacenamiento embebido y en `progress.js` — verificado sin consumidores). Nuevas
> decisiones abiertas Q-EVT-1..4 en §3.2. El campo `events` se añade al brief de modelo (§3.0).

---

## 0. Qué es esto y qué NO es

Este documento planifica un **proyecto aparte** del repositorio actual (`Didactifonis2026`,
que contiene plataforma MERN + landing). Ese proyecto separado es el **Engine/SDK** con el
que se construyen los **juegos/actividades** que luego se suben a la plataforma.

- La **plataforma** (este repo) ya trata cada actividad como *metadatos + bundle* y solo:
  (a) aloja/lista, (b) asigna, (c) **recibe y registra** resultados. No ejecuta lógica de juego.
- El **Engine/SDK** (proyecto hermano) es la herramienta de autoría/runtime que produce esos
  bundles y los hace comunicarse con la plataforma vía el **contrato de coexistencia**.

La pieza central de esta v0.1 es **definir las variables del contrato juego↔plataforma**
(sección 2). El plan de fases del Engine (sección 4) viene después, porque depende de cerrar
ese contrato.

### Fuentes de verdad consultadas (verificado, no asumido)

| Fuente | Qué aporta |
| :-- | :-- |
| `docs/especificacion-funcional.md` §6.5 | Frontera juego↔plataforma; dos contratos (publicación y resultados). |
| `docs/decisiones.md` D4 | Contrato de resultados v1.0 y de publicación YA decididos por Emiliano. |
| `server/activities/ActivityResult.js` | Modelo de resultado implementado (Fase 4). |
| `server/activities/resultsRouter.js` | Endpoint de ingesta implementado (`POST /api/activities/results`). |
| `server/models/Assignment.js` | Entidad de asignación; hoy NO emite token de sesión. |

---

## 1. Hallazgos de verificación (divergencias a resolver ANTES de construir el SDK)

Verifiqué el estado real del lado plataforma. Hay tres divergencias entre lo **decidido**
(D4) y lo **implementado** (Fase 4 / 8B). El SDK debe construirse contra un contrato
consolidado, no contra estas dos versiones en conflicto. **Estas divergencias son del lado
plataforma y se resuelven en este repo, no en el SDK** — pero condicionan el SDK.

### 1.1 — Nombres de campos: español (D4) vs inglés (implementación)

- **D4 decidió** (en español): `nino_id`, `actividad_id`, `session_token`, `aprobado`,
  `puntaje`, `intentos`, `duracion_segundos`, `timestamp`, `version`, `metadata`.
- **`resultsRouter.js` espera** (en inglés): `childId`, `assignmentId`, `score`, `passed`,
  `attemptCount`, `durationSeconds`, `metadata`, `schemaVersion`. Y exige `assignmentId`,
  que D4 no menciona.

> **Decisión requerida de Emiliano (ADR-SDK-01).** ¿El contrato público de cara al juego
> usa nombres en español (como D4) o en inglés (como el código)? El SDK serializa contra
> lo que se decida. Mi recomendación abajo (§3).

### 1.2 — Autenticación del envío: `session_token` de un solo uso (D4) vs JWT del tutor (implementación)

- **D4 decidió** un **token de sesión de actividad de un solo uso** (UUID v4, TTL, estado
  `unused`→`used` en DB), emitido por el backend al iniciar el modo niño, e incluido por el
  juego en el POST de resultados. Esto impide reenvíos falsos.
- **La implementación actual** (decisión H-09, Fase 8B) usa el **JWT del tutor**: el endpoint
  va protegido con `protect + requireActiveSubscription`. **No existe** modelo ni emisión de
  token de sesión de actividad (verificado por grep: 0 coincidencias de `session_token`).

> **Esta es la divergencia más importante para el SDK.** Determina cómo el juego autentica
> su POST. Sin resolverla, el SDK no sabe qué credencial enviar. Ver ADR-SDK-02 (§3).

### 1.3 — Contrato de publicación (ZIP/manifest): decidido pero NO implementado

- **D4 decidió** la estructura del ZIP (`manifest.json` + assets + punto de entrada) y los
  campos del manifest (`id`, `titulo`, `version`, `categoria`, `nivel`, `edadMin`, `edadMax`,
  `duracionMin`, `puntoDeEntrada`).
- **Del lado plataforma no hay** validador de ZIP ni endpoint de ingesta de bundle (la
  spec §6.5 confirma que la carga es ZIP por el Admin, vía única). El Engine produce el ZIP;
  la plataforma debe poder validarlo. Ambas mitades deben usar el mismo esquema de manifest.

---

## 2. Contrato de coexistencia juego ↔ plataforma (pieza central)

El contrato tiene **dos sentidos** y **un canal**. Lo divido en: (A) lo que la plataforma
**inyecta** al juego al iniciarlo, (B) lo que el juego **devuelve**, (C) el **canal** de
comunicación, (D) **publicación** (subida del bundle). El sentido (B) y (D) ya están
decididos en D4; (A) y (C) son lo nuevo que esta v0.1 define como propuesta.

### 2.A — Datos que la PLATAFORMA INYECTA al juego (contexto de arranque)

> **Estado: DEFINIDO (v0.2, 2026-05-31).** Validado con Emiliano y consolidado bajo el
> principio rector reforzado de abajo. Sustituye a la propuesta v0.1, que incluía un bloque
> `child` con `alias`, `ageBand` y `avatarId`.
>
> **Principio rector (innegociable):** **el juego recibe parámetros de la ACTIVIDAD/ASIGNACIÓN,
> nunca atributos del NIÑO.** El payload NO contiene ningún dato del menor: ni nombre, ni alias
> derivado de datos reales, ni edad/banda de edad, ni sexo, ni dato clínico. Toda adaptación
> (dificultad, vocabulario, instrucciones, presentación) viaja como **configuración de la
> actividad que el tutor/profesional eligió al asignar**, no como un atributo derivado del
> perfil del niño. Esto cumple *data minimization* y *privacy by design* (Ley 21.719;
> `docs/marco-legal.md` §3, §10, §11) y mantiene la frontera juego↔plataforma: el juego es
> **código externo** y no debe recibir datos sensibles de un menor.

```jsonc
// Payload de arranque que la plataforma entrega al juego al lanzarlo.
// REGLA: cero atributos del menor. Solo identificadores opacos + config de la actividad.
{
  "contractVersion": "1.0",          // versión del contrato de arranque

  // --- Identidad de sesión / asignación (OPACOS para el juego) ---
  "sessionToken": "<uuid v4>",       // token de sesión de actividad, un solo uso (ADR-SDK-02). Credencial de envío.
  "assignmentId": "<string opaco>",  // id de la asignación que originó la sesión (correlación)
  "activityId": "<string opaco>",    // id de la actividad (el juego carga su config a partir de esto)

  // --- Configuración de la ACTIVIDAD (no del niño) ---
  "config": {
    "level": 2,                      // nivel de dificultad ASIGNADO (lo eligió el tutor/profesional al asignar)
    "passThreshold": 60,             // umbral de aprobado en PORCENTAJE [0..100] (ADR-SDK-06). Parámetro de la
                                     //   ACTIVIDAD/ASIGNACIÓN, NO del niño ni del juego. Se inyecta SOLO para que el
                                     //   juego muestre feedback lúdico (ganaste/intenta de nuevo). La evaluación
                                     //   AUTORITATIVA de `passed` la hace la plataforma sobre `scorePercent` (2.B).
    "params": { },                   // parámetros libres de la actividad: vocabulario, set de assets,
                                     //   voicePreset/avatarId de presentación, etc. SON de la actividad,
                                     //   nunca derivados del perfil del menor.
    "locale": "es-CL",               // idioma/locale de los textos visibles (gobierna ADR-SDK-01)
    "audioInstructionsUrl": "<url|null>",   // audio de instrucciones (puede venir del tutor), opcional
    "tutorInstructionsText": "<string|null>", // instrucciones de texto del tutor, opcional
    "displayName": "<string|null>"   // OPCIONAL. Texto de saludo elegido libremente por el tutor al asignar.
                                     //   Por defecto null. NO es PII: no se deriva del nombre real ni del
                                     //   alias de perfil; el tutor puede dejarlo vacío o poner un genérico.
  },

  // --- Modo de operación ---
  "runtime": {
    "offlineAllowed": true,          // si el juego puede completarse sin red
    "resultsEndpoint": "<url>",      // a dónde enviar resultados (lo fija la plataforma; ver anti-alcance §5.7)
    "maxDurationSeconds": 900        // tope de seguridad opcional
  }
}
```

**Justificación legal y de diseño (qué se eliminó respecto de v0.1 y por qué):**
- **Eliminado el bloque `child` completo.** El juego ya no recibe ningún atributo del menor.
  Esto es estrictamente más fuerte que la propuesta de suavizar atributos: en lugar de
  inyectar versiones difusas de datos del niño, no se inyecta dato alguno del niño.
- **`ageBand` (banda de edad) — ELIMINADO.** El juego no necesita la edad del niño; necesita
  saber con qué dificultad/vocabulario correr. Eso ya viaja en `config.level` y `config.params`,
  que son atributos de la **actividad asignada**. La adaptación por edad vive en la **ASIGNACIÓN**
  (el tutor/profesional elige el pack/nivel al asignar), no en el payload del menor. Inyectar la
  banda de edad sería un dato del menor redundante con `config`.
- **`sexo`/género del menor — NO se incorpora.** En contexto terapéutico el sexo de un menor es
  dato sensible (marco-legal §3, datos inferidos). No debe cruzar a código externo. Si una
  mecánica necesita voz o avatar con género, se resuelve como **parámetro de presentación de la
  actividad** (`config.params.voicePreset`/`avatarId`) que el tutor elige al asignar, nunca
  derivado del perfil del niño.
- **`alias` — ELIMINADO como atributo de perfil.** Un alias de perfil es un pseudónimo
  (técnica recomendada, no prohibida), pero el juego solo lo usaba para saludar. Se sustituye por
  `config.displayName`: texto opcional que el tutor define libremente al asignar, por defecto
  ausente, nunca derivado de datos reales. Minimización: si el juego no lo necesita, no llega.
- **`avatarId` — degradado a `config.params`.** Es elección de presentación del niño, no dato
  sensible (no revela edad/sexo/salud). Conceptualmente es presentación de la actividad, opcional.

**Notas de seguridad sobre 2.A:**
- **Cero PII del menor cruza la frontera.** Prohibido inyectar nombre real, RUT, fecha de
  nacimiento (exacta o en banda), sexo, diagnóstico, historial clínico o cualquier dato de Capa 2.
- `sessionToken`/`assignmentId`/`activityId` cruzan como **identificadores opacos**: el juego no
  los interpreta, solo los reenvía en los resultados (2.B) para correlación del lado plataforma.
- El `sessionToken` es la credencial de envío (ver 2.B y ADR-SDK-02). Por ADR-SDK-03, vive en el
  host (launcher del niño), no dentro del juego.
- **Criterio de aceptación para la auditoría de Fase E1 (`didactifonis-security`):** verificar
  que el endpoint de arranque (`POST /api/activities/sessions`, §3.1) NO serialice ningún
  atributo del menor en el payload — solo identificadores opacos y `config` de la actividad. La
  no-fuga de PII del menor pasa a ser un criterio explícito de esa auditoría ya planificada.

### 2.B — Datos que el juego DEVUELVE (contrato de resultados — base D4 + score RESUELTO en E0)

Base decidida en D4. **El modelo de `score` se consolida aquí (ADR-SDK-06, RESUELTA 2026-05-31):
se desacopla el puntaje interno del juego de la métrica normalizada de la plataforma.**

```jsonc
{
  "version": "1.0",                  // OBLIGATORIO. Versionado del contrato de resultados
  "sessionToken": "<string>",        // un solo uso, emitido por backend (ADR-SDK-02)
  "assignmentId": "<string opaco>",  // correlación con la asignación (ver §1.1: el endpoint lo exige)
  "childId": "<string opaco>",       // correlación con el niño
  "activityId": "<string opaco>",    // correlación con la actividad

  // --- SCORE (ADR-SDK-06): el juego envía su puntaje CRUDO + su máximo. La plataforma normaliza. ---
  "rawScore": 850,                   // OBLIGATORIO. Puntaje crudo en la escala INTERNA del juego (0–100, 0–1000, lo que sea).
                                     //   Es informativo/gamificado: para el niño, solo un número que sube/baja con sus acciones.
  "maxScore": 1000,                  // OBLIGATORIO y > 0. Máximo posible en la escala interna de ESTE juego/sesión.
                                     //   Permite a la plataforma derivar el porcentaje. La escala la fija el juego, no la plataforma.
  // "scorePercent" NO lo envía el juego: lo DERIVA la plataforma = round(rawScore / maxScore * 100), acotado [0,100].
  //   Es el valor CANÓNICO de validación/comparación homogénea entre juegos distintos. Ver nota de confianza abajo.

  "attemptCount": 3,                 // intentos
  "durationSeconds": 124,            // duración

  "timestamp": "<ISO 8601>",         // momento de finalización (cliente)
  "events": [ ],                     // DEFINIDO en §2.B.1 (2026-05-31). Telemetría educativa OPCIONAL, catálogo controlado.
  "metadata": { }                    // JSON libre, no validado, no interpretado por backend
}
```

### 2.B.1 — El array `events`: telemetría de resultado (DEFINIDO, 2026-05-31)

> **Estado: DEFINIDO.** Resuelve el último pendiente de §7.5. Diseñado para NO acoplar la
> plataforma a la implementación interna de ningún juego ni del Engine. Verificado contra el
> repo: hoy `events` **no tiene consumidores** (no está en `ActivityResult.js`, ni se lee en
> `resultsRouter.js` ni en `progress.js`; el cliente no lo referencia). Por tanto definirlo es
> aditivo y no rompe lectores existentes.

#### Qué ES y qué NO ES `events` — los dos planos

El término "evento" vive en **dos planos distintos** que NO deben confundirse. La frontera
juego↔plataforma solo cruza el segundo.

**Plano 1 — Eventos INTERNOS del Engine (runtime del juego). NO viajan a la plataforma.**
Son la lógica de juego data-driven: triggers estilo RPG Maker, transiciones de la state
machine de Rive, colisiones/inputs de Phaser, "si el niño toca el sprite X entonces reproduce
animación Y". Viven en el JSON de eventos que interpreta el runtime (§8.0) y se ejecutan dentro
del juego. **Son detalle de implementación del bundle.** La plataforma NO los conoce, NO los
recibe y NO debe depender de ellos. Acoplar la plataforma a estos eventos sería el error de
diseño que esta sección previene.

**Plano 2 — Eventos de TELEMETRÍA/RESULTADO (lo que es `events` en 2.B). SÍ viajan.**
Es un subconjunto pequeño, estandarizado y semánticamente estable de hitos **educativos /
gamificados (Capa 1)** que el juego decide reportar a la plataforma: empezó, terminó, usó una
pista, respondió un ítem, abandonó. Sirven para que el tutor/profesional vea la **traza del
desempeño** (ritmo, dónde se trabó, cuántas pistas pidió) sin cruzar a registro clínico
(Capa 2) ni a inferencia. **`events` es el puente del Plano 1 al Plano 2:** el autor del juego
(o el SDK automáticamente) **mapea** algunos eventos internos del Engine a eventos de
telemetría del catálogo controlado. Lo que no se mapea, no sale del juego.

**Regla rectora:** `events` describe **lo que pasó en términos pedagógicos/lúdicos**, no **cómo
lo implementó el juego**. Si un `type` solo tiene sentido conociendo las tripas de un juego
concreto, no pertenece al catálogo estándar — va en el `payload` libre de un evento genérico, o
no se reporta.

#### Esquema de cada evento (inglés, ADR-SDK-01)

```jsonc
{
  "type": "item_answered",      // OBLIGATORIO. Uno del CATÁLOGO CONTROLADO (tabla abajo). String.
  "timestamp": "<ISO 8601>",    // OBLIGATORIO. Momento del evento (reloj del cliente/juego).
  "payload": { }                // OPCIONAL. JSON libre y acotado, específico del tipo/juego.
                                //   Almacenado tal cual, NO interpretado por el backend (como metadata).
                                //   PROHIBIDO transportar atributos del menor (ver reglas PII abajo).
}
```

`events` es un **array opcional** de estos objetos. Forma genérica `{ type, timestamp, payload }`:
el `type` da semántica estable y comparable entre juegos; el `payload` absorbe lo específico sin
que el backend tenga que conocerlo. Esto desacopla la plataforma del juego.

#### Catálogo controlado de `type` — estándar vs. específico del juego

Hay **dos clases** de tipos. Solo la primera la valida/entiende el contrato; la segunda es
extensión libre del autor.

**(a) Tipos ESTÁNDAR del contrato** (todos los juegos los emiten con la misma semántica). El
backend reconoce estos `type`; un evento con un `type` fuera de esta lista NO se rechaza pero se
trata como "custom" (clase b). Catálogo v1.0:

| `type` | Significado (Capa 1) | Emisor | `payload` típico (libre, opcional) |
| :-- | :-- | :-- | :-- |
| `activity_started` | El niño inició la actividad. | **SDK (auto)** | — |
| `activity_completed` | El niño llegó al final de la actividad. | **SDK (auto)** | — |
| `paused` | Se pausó la actividad. | **SDK (auto)** si el host pausa; autor si es lógica de juego | — |
| `resumed` | Se reanudó tras pausa. | **SDK (auto)** / autor | — |
| `abandoned` | Se salió sin completar. | **SDK (auto)** al cerrar sin `submitResults` | — |
| `attempt` | El niño hizo un intento sobre un reto/nivel. | **Autor del juego** | `{ "index": 2 }` (nº de intento) |
| `item_answered` | El niño respondió un ítem/reactivo. | **Autor del juego** | `{ "itemId": "w12", "correct": true }` |
| `hint_used` | El niño pidió/recibió una pista. | **Autor del juego** | `{ "level": 1 }` (intensidad de pista) |
| `level_advanced` | Avanzó de nivel/etapa dentro de la actividad. | **Autor del juego** | `{ "from": 1, "to": 2 }` |

> El catálogo estándar es **deliberadamente corto**. Cubre el ciclo de vida (start/complete/
> pause/resume/abandon) que el SDK puede emitir solo, más cuatro hitos pedagógicos genéricos
> que casi cualquier juego de terapia fonoaudiológica tiene (intento, respuesta, pista, avance).
> No se añaden tipos por anticipación: el catálogo crece **guiado por lo que los 2 juegos-piloto
> necesiten** (misma filosofía incremental que §8.2).

**(b) Tipos ESPECÍFICOS del juego** (`payload` libre). Si un juego necesita un hito propio que no
está en (a), el autor puede emitir un evento con un `type` con **prefijo `x_`** (p. ej.
`x_phoneme_matched`) y un `payload` libre. El backend lo **almacena tal cual** pero no lo cuenta
como hito estándar ni deriva métrica de él. Esto da extensibilidad sin tocar el contrato ni
acoplar la plataforma. El prefijo `x_` marca explícitamente "fuera del catálogo estándar".

#### Límites, validación y opcionalidad (frontera con código externo)

`events` se trata como **entrada no confiable** (spec §6.5), igual que `metadata`. Reglas que el
backend aplica en la ingesta (se materializan al tocar `resultsRouter` en E1):

- **Opcional (Q-EVT-1, RESUELTA).** `events` puede faltar o venir `[]`. Su ausencia NO invalida el
  resultado. El resultado (score/passed/duration) es el dato primario; `events` es traza
  complementaria. **El contrato es opcional, pero el SDK siempre emite el ciclo de vida** en la
  práctica (implementación de referencia estricta sobre contrato laxo).
- **Tamaño del array — SIN tope de contrato + cap defensivo de ingesta (Q-EVT-2, RESUELTA).** El
  contrato **NO fija ni promete** un número máximo de eventos al autor; el límite real se **calibra
  en E2** con los juegos-piloto. **Pero el backend SIEMPRE aplica un cap defensivo, generoso y
  configurable** (constante en `/shared`, valor alto **provisional**) para proteger la **integridad
  del documento**: un array embebido ilimitado puede chocar con el **límite de 16 MB por documento
  de MongoDB** y es una vía de abuso (juego externo/malicioso inflando el array). Al excederlo, el
  backend **trunca** (o rechaza, lo afina backend en E1) y **registra una anomalía** en logs para
  auditoría del bundle (no pierde el resultado primario por esto — un juego ruidoso no debe perder
  su resultado). **Distinción explícita:** *sin tope de contrato* (promesa al autor) ≠ *cap
  defensivo de ingesta* (protección del servidor). El cap existe desde E0/E1; su valor definitivo se
  recalibra en E2. Ver Q-EVT-2 en §3.2.
- **Tamaño máximo del `payload`** por evento: acotado (sugerencia: ~2 KB serializados); se suma
  al límite global de tamaño de payload del POST (§3.1, endurecimiento de ingesta).
- **Validación de forma:** cada evento debe tener `type` (string no vacío) y `timestamp`
  (ISO 8601 parseable). Eventos malformados se **descartan individualmente** (se filtran), no
  tumban el POST entero. `payload` no se valida en contenido (JSON libre).
- **`type` desconocido (no del catálogo, sin prefijo `x_`) — política RESUELTA (Q-EVT-3).** Se
  **acepta y conserva** como "custom" (no se descarta en silencio), pero no genera métrica estándar.
  No se rechaza (compatibilidad hacia adelante: un juego nuevo con un `type` de un catálogo futuro
  no debe romper contra un backend viejo). En el SDK, además, esto produce un **warning en
  desarrollo** y se encola igual como custom (§2.B.2).
- **`pause`/`resume` — gobierno RESUELTO (Q-EVT-4).** Los eventos `paused`/`resumed` del **ciclo de
  vida los emite el host/launcher** (auto, vía SDK); el **autor puede añadir los suyos** para pausas
  lógicas internas del juego. No excluyente.

#### Versionado del catálogo (liga con el versionado del contrato, §2.E)

El catálogo de `type` evoluciona bajo el mismo `version` del contrato de resultados (2.B), con
changelog en `/docs`. Reglas de compatibilidad:

- **Añadir un `type` estándar nuevo** es retro-compatible: backends viejos lo tratan como custom
  (lo almacenan sin métrica); backends nuevos lo entienden. No rompe nada.
- **Nunca se cambia la semántica de un `type` existente** dentro de la misma major. Si un hito
  cambia de significado, es un `type` nuevo, no una redefinición.
- **Retirar un `type`** requiere bump de versión y ventana de transición (el backend acepta N y
  N-1, §2.E).
- El catálogo estándar vive en el **paquete compartido `/shared`** (ADR-SDK-05) como una
  constante/enum, de modo que SDK y plataforma consuman **una sola definición** y no diverjan.

#### Minimización / PII — `events` no transporta datos del menor (Ley 21.719)

Coherente con el principio rector de 2.A (cero atributos del menor cruzan la frontera) y con el
anti-alcance §5.5:

- **PROHIBIDO** que `payload` (o `type`) transporte cualquier atributo del menor: nombre, alias
  de perfil, edad/banda de edad, sexo, RUT, fecha de nacimiento, ubicación, dato clínico, voz o
  imagen del niño. El juego **no posee** estos datos (no se le inyectan, 2.A), así que no puede
  reportarlos; esta regla lo deja explícito para el autor y para la auditoría.
- `item_answered` puede llevar `itemId`/`correct` (datos de la **actividad**, no del niño), nunca
  la respuesta literal hablada/grabada del menor ni un identificador personal.
- **Criterio de auditoría (E1, `didactifonis-security`):** además de verificar la no-fuga de PII
  en el arranque (2.A), verificar que la ingesta de `events` no abra una vía de entrada de PII
  del menor por el `payload`. El backend no necesita inspeccionar contenido, pero la guía para
  autores de juegos (E5) debe declarar esta prohibición.

#### Frontera regulatoria — `events` es Capa 1, NO genera Capa 2 ni inferencia

- `events` es **traza de desempeño educativo/gamificado (Capa 1)**: describe el transcurso lúdico
  de la sesión. **NO** es registro clínico (Capa 2), que solo el profesional escribe dentro de la
  plataforma.
- **PROHIBIDO** derivar de `events` cualquier scoring clínico, clasificación de patología,
  inferencia diagnóstica o recomendación terapéutica automatizada (anti-alcance §5.1–§5.3). Que
  un niño use muchas pistas o se trabe en un ítem es **información pedagógica para que un humano
  la interprete**, nunca un corte clínico que el sistema calcule. Cruzar esto reclasifica la
  plataforma como SaMD (CLAUDE.md §2).

**Modelo de score (ADR-SDK-06) — campos canónicos:**

| Campo | Origen | Tipo / rango | Obligatorio | Rol |
| :-- | :-- | :-- | :-- | :-- |
| `rawScore` | lo envía el juego | `Number`, `>= 0` | sí | Puntaje crudo en escala interna del juego. **Informativo/gamificado.** Para el niño, número que sube/baja. |
| `maxScore` | lo envía el juego | `Number`, `> 0` | sí | Máximo posible de esa escala interna. Base de la normalización. |
| `scorePercent` | **lo deriva la plataforma** | `Number` `[0,100]` | derivado (no se envía) | **Valor canónico** de validación y comparación homogénea entre juegos. |
| `passed` | **lo deriva la plataforma** | `Boolean` | derivado (no se envía) | `scorePercent >= passThreshold` de la actividad. Educativo, **NO clínico**. |

**Quién normaliza (decisión, ADR-SDK-06):** **el juego envía `rawScore` + `maxScore` y la
plataforma calcula `scorePercent` y `passed`.** Fuente de verdad única del lado plataforma; la
validación no depende de aritmética hecha en código externo (el juego es entrada no confiable,
spec §6.5). Se descartó que el juego envíe `scorePercent` ya calculado o `passed` ya decidido:
delegar el cálculo al juego haría manipulable el umbral de aprobado y rompería la comparabilidad
entre juegos. El `rawScore` viaja solo para feedback lúdico y trazabilidad, **no** entra en la
lógica de aprobado/comparación.

**Nota de confianza (frontera con código externo):**
- `scorePercent` y `passed` son **derivados y autoritativos del lado plataforma**. Si el juego
  enviara estos campos por error, el backend los **ignora** y los recalcula.
- El backend **rechaza** el POST si `maxScore <= 0`, falta, o `rawScore` es negativo (entrada
  inválida). Si `rawScore > maxScore`, acota `scorePercent` a 100 (no rompe; registra anomalía
  en logs para auditoría del bundle).
- `passThreshold` (umbral de aprobado) es **parámetro de la actividad/asignación**, no del juego
  (ver 2.A y §nota regulatoria abajo). El juego puede recibirlo en `config` solo para feedback
  visual; la evaluación que cuenta la hace la plataforma.

**Frontera regulatoria (Capa 1, NO clínica) — confirmado:** `scorePercent` y `passed` son
métricas de **desempeño educativo/gamificado (Capa 1)**, no un score clínico (Capa 2). El umbral
de aprobado (`passThreshold`) es un **parámetro configurable de la actividad** definido por el
Admin al subirla o por el tutor/profesional al asignar — **no** una clasificación clínica
automatizada, ni inferencia de patología, ni recomendación terapéutica. Por tanto **no cruza la
frontera SaMD** (CLAUDE.md §2; anti-alcance §5.1, §5.2). El porcentaje normaliza desempeño para
comparar instancias del mismo tipo de juego; nunca etiqueta clínicamente al menor.

**Reglas del contrato de resultados (de D4, vigentes):**
- Bloque fijo validado por backend; campos faltantes/inválidos rechazan el POST.
- `metadata` se almacena tal cual, sin validación; el backend no lo interpreta.
- `version` obligatorio; permite evolución sin romper clientes antiguos.
- El backend trata esto como **entrada no confiable** (spec §6.5).

**Anotación de consolidación (§1.1):** nombres en inglés (ADR-SDK-01). El SDK expone la API en
inglés y serializa en inglés (sin capa de mapeo de idioma).

### 2.B.2 — Conexión con el SDK / Engine: "params que definir" (DEFINIDO, 2026-05-31)

> Responde a la observación de Emiliano: "eventos debe ser revisado ya que va ligado al
> SDK/Engine; hay params que definir para esto". Aquí se fija **qué ofrece el SDK** para que un
> creador de juegos emita estos eventos de forma estándar, y **qué emite el SDK solo vs. qué
> emite el autor**. Pertenece a la **Fase E2** (SDK JS cliente); se especifica ahora para cerrar
> la frontera del contrato. Esto NO es código de producción: es la definición de la superficie de
> API del SDK.

#### API del SDK relativa a eventos y resultados

El SDK expone una superficie mínima (inglés, ADR-SDK-01) que abstrae el canal (iframe+postMessage,
ADR-SDK-03). Las firmas relevantes para `events`:

```jsonc
// Superficie del SDK (E2). Firmas conceptuales, no implementación.
sdk.getContext()                       // → payload de arranque 2.A (config, sessionToken vive en el host, no aquí)
sdk.reportEvent(type, payload?)        // encola un evento de telemetría del catálogo (§2.B.1). payload opcional.
sdk.submitResults({ rawScore, maxScore, attemptCount, durationSeconds, metadata })
                                       // cierra la sesión: arma el payload 2.B, adjunta los events encolados,
                                       //   valida contra el esquema del paquete /shared, y entrega al host para envío.
```

- `reportEvent(type, payload?)` **acumula** eventos en un buffer en memoria durante la partida.
  `submitResults(...)` los **vuelca** en el array `events` del payload 2.B, en orden de emisión.
  El autor del juego nunca arma el JSON a mano: llama a `reportEvent` en los momentos relevantes.
- El SDK **valida `type` contra el catálogo de `/shared`** (ADR-SDK-05) antes de encolar: si no
  es estándar ni lleva prefijo `x_`, el SDK **avisa al autor (warning en dev) y CONSERVA el evento**
  encolándolo como custom — **no lo descarta en silencio** (Q-EVT-3 RESUELTA, §3.2). No se
  auto-prefija con `x_`: se conserva el `type` tal cual como custom.
- El SDK aplica localmente el **cap defensivo de eventos** (la misma constante de `/shared`, valor
  provisional, a calibrar en E2 — Q-EVT-2 RESUELTA): al alcanzarlo deja de encolar y avisa, de modo
  que el truncado del backend (§2.B.1) sea solo una segunda red de seguridad, no el caso normal.
  **No hay un tope de contrato prometido al autor**; este cap es protección, no promesa.
- El SDK **nunca** ve el `sessionToken` (ADR-SDK-03): `submitResults` entrega el payload al host
  (launcher del niño) por postMessage, y el host adjunta el token y hace el POST. Los `events`
  viajan dentro de ese payload, no por un canal aparte.

#### Qué emite el SDK AUTOMÁTICAMENTE vs. qué emite el AUTOR del juego

| Evento del catálogo | Lo emite | Cómo |
| :-- | :-- | :-- |
| `activity_started` | **SDK (auto)** | Al `getContext()` / arranque del juego. El autor no lo escribe. |
| `activity_completed` | **SDK (auto)** | Dentro de `submitResults()` (llegar a submit = completar). |
| `abandoned` | **SDK (auto)** | Si el host detecta cierre/salida sin `submitResults()`. |
| `paused` / `resumed` | **SDK (auto)** si el host gobierna la pausa; **autor** si es pausa lógica del juego | El SDK ofrece `pause/resume` del ciclo de vida; el autor puede emitir los suyos. |
| **duración** (no es un event; es `durationSeconds`) | **SDK (auto)** | El SDK cronometra entre `started` y `submitResults`; el autor no calcula tiempo. |
| `attempt`, `item_answered`, `hint_used`, `level_advanced` | **Autor del juego** | Vía `reportEvent(type, payload)` en la lógica de la mecánica. Son los hitos pedagógicos que solo el juego conoce. |
| `x_*` (custom) | **Autor del juego** | `reportEvent("x_...", payload)` para hitos propios fuera del catálogo. |

**Regla de reparto:** el SDK emite **solo el ciclo de vida y la duración** (lo que es genérico y
mecánico — no requiere conocer la mecánica del juego). Los **hitos pedagógicos** (intento,
respuesta, pista, avance) los emite el **autor**, porque solo él sabe cuándo ocurren en su juego.
Esto minimiza el trabajo del autor (el ciclo de vida es gratis) sin que el SDK invente semántica
que no posee.

#### Mapeo con el Engine data-driven (RPG Maker-like)

Esto cierra el "va ligado al SDK/Engine": en el **editor de eventos data-driven** (§8.0, el
paradigma RPG Maker), un evento interno del Engine (Plano 1) puede tener un **comando opcional
`Report Telemetry`** que el autor arrastra a su lógica visual. Ese comando se compila a una
llamada `sdk.reportEvent(type, payload)` en el bundle exportado. Así:

- El autor define su lógica de juego con eventos internos (Plano 1) **sin pensar en la
  plataforma**.
- Cuando quiere que un hito **salga** como telemetría, añade el comando `Report Telemetry`,
  eligiendo un `type` del catálogo estándar (dropdown poblado desde `/shared`) o un `x_` custom.
- El export traduce ese comando a `reportEvent`. **El mapeo Plano 1 → Plano 2 es explícito y
  opcional**, decidido por el autor evento por evento. Nada del runtime interno se filtra solo.

Esto es lo que hace al diseño escalable (§8.2): el catálogo estándar es un **enum compartido**
que aparece como opción en el editor; añadir un juego nuevo no toca el contrato, solo rellena
datos y elige qué hitos reportar.

#### Impacto en la PLATAFORMA: almacenamiento y `progress`

Verificado contra el repo (no asumido) — ver §3.0 y el lector `server/routes/progress.js`:

- **`progress.js` NO necesita `events` para nada de lo que hace hoy.** Deriva KPIs, áreas,
  racha, logros e historial de `passed`, `attemptCount`, `durationSeconds`, `activityType` y
  `createdAt`. **No se toca `progress.js`** al introducir `events` (cambio aditivo, riesgo nulo
  para lectores actuales).
- **Almacenamiento recomendado: documento embebido en `ActivityResult`** (un array `events` en
  el mismo doc), NO colección aparte. Razones: el array está acotado (≤200), se escribe una vez
  (en la ingesta del resultado) y se lee siempre junto al resultado (traza de esa sesión). No hay
  caso de consulta cross-resultado de eventos que justifique una colección separada en el MVP.
  Si en el futuro se necesitara analítica agregada de eventos, se reevalúa (no anticipar).
- **`events` se persiste tal cual; NO se agrega ni se deriva métrica de él en v1.0.** Es traza
  para que un humano (tutor/profesional) la lea en la vista de detalle de una sesión. **No** se
  computan métricas derivadas de `events` en el backend (evita el riesgo de derivar algo que
  parezca scoring clínico — frontera SaMD, §2.B.1). Si más adelante se quiere, p. ej., "promedio
  de pistas por sesión", es una métrica **educativa de Capa 1** y se diseñaría explícitamente,
  fuera del alcance de esta definición.
- **Brief de modelo (extiende §3.0, para `didactifonis-backend` en E0/E1):** añadir a
  `ActivityResult` un campo `events` (`[{ type: String, timestamp: Date, payload: Mixed }]`,
  default `[]`). En la ingesta (`resultsRouter`, E1): filtrar eventos malformados, truncar a 200,
  almacenar tal cual. Comentario en el modelo: "Capa 1 educativa — traza de telemetría, entrada
  no confiable, no interpretada ni agregada por el backend."
- **Retención:** `events` sigue la **misma política de retención que `ActivityResult`** (vive y
  muere con su resultado; no tiene ciclo de vida propio). No se define una retención más larga
  para eventos.

### 2.C — Canal de comunicación

> **Estado: PROPUESTA de esta v0.1.** D4 no fijó el transporte. Recomendación en §3.

Opciones evaluadas para el canal juego↔plataforma:

| Opción | Cómo | Pros | Contras |
| :-- | :-- | :-- | :-- |
| **iframe + postMessage** | El juego corre en un `<iframe sandbox>` dentro del launcher del niño; arranque y resultados viajan por `postMessage`. | Aislamiento fuerte; el juego nunca ve el JWT del tutor; sin CORS; offline natural. | Requiere protocolo de mensajes; el SDK debe abstraerlo. |
| **POST REST directo** | El juego hace `fetch` directo a `POST /api/activities/results`. | Simple; ya implementado. | El juego necesita credencial (JWT del tutor = mala práctica de seguridad, o sessionToken). Acoplado a red. |
| **SDK JS embebido** | Librería JS que el juego importa; expone `getContext()` y `submitResults()`; por dentro usa postMessage o REST. | Oculta el transporte al autor del juego; versionable; valida el payload antes de enviar. | Hay que construir y versionar el SDK. |

**Recomendación (ver §3): SDK JS embebido sobre iframe+postMessage**, con el POST REST como
detalle interno del host (no del juego). Así el juego **nunca** maneja credenciales y el
aislamiento protege los datos del menor.

### 2.D — Contrato de publicación (subida del bundle — YA DECIDIDO en D4)

ZIP subido por el Admin (vía única, spec §6.5):
- Estructura: `manifest.json` en la raíz + assets + punto de entrada.
- Campos del manifest: `id`, `titulo`, `version`, `categoria`, `nivel`, `edadMin`, `edadMax`,
  `duracionMin`, `puntoDeEntrada`.
- Incluye validación del paquete y versionado para correcciones.

El Engine **produce** este ZIP (export). La plataforma **valida** el manifest al subirlo
(no implementado aún, §1.3). Ambos lados comparten el mismo esquema de manifest.

### 2.E — Comportamientos transversales del contrato

- **Offline y sincronización diferida.** Si `runtime.offlineAllowed`, el juego completa sin
  red; el SDK **encola** el resultado localmente y reintenta el envío cuando hay conexión.
- **Idempotencia.** El `sessionToken` de un solo uso es la clave de idempotencia: el backend
  marca `used` al primer envío válido; reenvíos del mismo token se ignoran o devuelven el
  resultado ya registrado (no duplican). Esto cubre el reintento offline sin doble registro.
  > Nota: el endpoint actual usa `assignment.status === 'completed'` para evitar duplicados
  > (HTTP 409). Al introducir `sessionToken`, la idempotencia debe migrar a la unicidad del
  > token, no al estado del assignment (un assignment podría reintentarse legítimamente).
- **Versionado y compatibilidad hacia atrás.** Hay **tres** números de versión independientes:
  `contractVersion` (arranque, 2.A), `version` (resultados, 2.B) y `version` del manifest
  (publicación, 2.D). Cada uno evoluciona con changelog en `/docs`. El backend acepta N y N-1
  de cada contrato durante una ventana de transición. **Dueño: Emiliano** (D4).

---

## 3. Decisiones de arquitectura — RESUELTAS por Emiliano (2026-05-31)

> Las 5 ADR fueron cerradas por Emiliano el 2026-05-31. Quedan registradas aquí como
> autoritativas. Cualquier reapertura requiere su aprobación explícita (es el dueño del
> contrato, D4).

### ADR-SDK-01 — Idioma de los campos del contrato — RESUELTA
**Contexto:** D4 los definió en español; la implementación los usa en inglés (§1.1).
**DECISIÓN (Emiliano):** **Código en inglés, interfaz en español.** Los nombres de campos
del contrato y del código van en **inglés**; los textos visibles al usuario, en **español**.
Esto alinea el contrato público hacia inglés (coincide con la implementación actual).
**Consecuencias:**
- El contrato de resultados (2.B), de arranque (2.A) y de publicación (2.D) usan campos en
  inglés. **No** se renombra el backend; **sí** se actualiza D4 para reflejar inglés como
  canónico (tarea de Fase E0).
- El SDK expone su API en inglés y serializa en inglés (sin capa de mapeo de idioma).
- La capa de presentación (alias, instrucciones, locale `es-CL`) sigue en español de cara
  al niño/tutor. El campo `config.locale` gobierna los textos visibles.

### ADR-SDK-02 — Autenticación del envío de resultados — RESUELTA
**Contexto:** §1.2 — la decisión D4 (sessionToken de un solo uso) no está implementada; hoy
se usa el JWT del tutor.
**DECISIÓN (Emiliano):** **El sessionToken de un solo uso es lo correcto. Realizar los
cambios pertinentes.** Se implementa el token de sesión de actividad de un solo uso del lado
plataforma (este repo) y se deja de usar el JWT del tutor para el envío del juego.
**Consecuencias / alcance del cambio (detalle del brief en §3.1):**
- Nace un **punto de emisión** del token que **hoy no existe**: un endpoint de "arranque de
  actividad" (`POST /api/activities/sessions` o equivalente) protegido con el JWT del tutor,
  que emite el sessionToken al iniciar el modo niño.
- El `POST /api/activities/results` deja de exigir el JWT del tutor y pasa a **validar e
  invalidar** el sessionToken (unused→used).
- La **idempotencia migra** de `assignment.status === 'completed'` a la unicidad del token.
- Se delega a `didactifonis-backend` (brief en §3.1) y se audita con `didactifonis-security`
  (datos de menores). Esto **es** la Fase E1; ya no es bloqueante por decisión, sino por
  ejecución.

### ADR-SDK-03 — Canal de comunicación — RESUELTA
**Contexto:** §2.C.
**DECISIÓN (Emiliano):** acepta la recomendación del arquitecto: **SDK JS embebido sobre
iframe + postMessage**; REST como detalle interno del host. **El juego nunca maneja
credenciales** (el sessionToken vive en el host, no en el juego — ver nota en §3.1).

### ADR-SDK-04 — Tecnología base del Engine/runtime de juegos — RESUELTA
**Contexto:** ¿con qué se construyen los juegos?
**DECISIÓN (Emiliano):** **Phaser** como motor base (probable/confirmado como dirección).
**Visión del Engine:** un **híbrido** entre **Phaser Editor** (composición de escenas/assets
2D), **Rive** (animación interactiva con state machines) y **algunas mecánicas de
RPG Maker MZ** (editor de eventos/mecánicas data-driven sin escribir código). El detalle de
esta visión y su viabilidad están en §8 (Consultas resueltas, consultas 1, 2 y 4).

### ADR-SDK-05 — Repo separado / versionado del contrato — RESUELTA
**Contexto:** el SDK es proyecto aparte.
**DECISIÓN (Emiliano):** acepta la recomendación: **repo separado** + el contrato como
**paquete npm versionado** que ambos lados (plataforma y SDK) consumen, evitando dos
definiciones divergentes (el problema de §1). El esquema se extrae a `/shared` en Fase E0 y
se publica como paquete versionable.

#### Refinamiento operativo de ADR-SDK-05 (arquitecto, 2026-06-09) — cómo convive sin mezclar

> No reabre la decisión (sigue siendo *repo separado + contrato como paquete*). Concreta
> **cómo** se ejecuta para resolver la preocupación de Emiliano: trabajar ambos lados con
> contexto compartido **sin** mezclar código y sin que el monorepo se vuelva inmanejable.

**1. Topología: tres piezas, no dos.** La costura compartida NO es "plataforma vs. Engine";
es **el contrato**. Quedan tres unidades con fronteras de paquete:

| Pieza | Qué es | Dónde vive | Depende de |
| :-- | :-- | :-- | :-- |
| **contrato** | `/shared` de hoy (catálogo de eventos, cap, forma 2.A/2.B, versiones) | Hoy en este repo; se promueve a repo neutral al iniciar Frente B | — (no depende de nadie) |
| **plataforma** | este repo (`/client` + `/server` + `/landing`) | este repo | contrato |
| **Engine/SDK** | autoría + runtime de juegos | **repo separado (a crear en Frente B)** | contrato |

La no-mezcla queda **garantizada por la frontera de paquete**, no por disciplina: `plataforma`
y `engine` solo pueden importar desde `contrato`; nunca uno del otro. El Engine **jamás** vive
en este repo (`CLAUDE.md §3`; el bundle del juego es código externo no confiable).

**2. Hogar del contrato — "se queda ahora, se promueve después".** Hoy la plataforma es el
**único consumidor** de `/shared` y lo hace por ruta relativa: funciona, no se toca
(`CLAUDE.md §5`, no reescribir lo que funciona). El contrato se **promueve a su propio repo
neutral** (`didactifonis-contract`, paquete `@didactifonis/contract`) **en el momento en que el
Engine necesite consumirlo (Frente B)**, no antes. Promoverlo es mecánico: la plataforma cambia
`require('../../shared/index.cjs')` por `require('@didactifonis/contract')`.

**3. Estrategia de versionado — "link ahora, pin después".** Mientras el contrato aún se mueve
(estamos en E2: falta recalibrar `EVENTS_INGEST_CAP`, definir `bundleUrl`, etc.) se consume
**enlazado en local** (npm/pnpm workspace o `npm link`): se edita una vez y ambos lados lo ven
vivo, sin publicar. Cuando el contrato se estabilice (post-piloto) se **publica con versión fija**
y cada repo lo *pinea* (`@didactifonis/contract@1.0.0`), activando la ventana N/N-1 de §2.E.
Ergonomía de monorepo durante el MVP; rigor de multi-repo al madurar; sin reescritura en la
transición (solo cambia cómo se resuelve la dependencia).

**4. Contexto compartido sin código junto.** La cercanía de archivos NO es lo que da contexto.
Se obtiene visión de ambos lados con: (a) checkout lado a lado bajo una carpeta padre común;
(b) los docs (`CLAUDE.md`, `especificacion-funcional.md`, este plan) que ya son el contexto
compartido de los agentes. No hace falta fusionar árboles de git para tener el panorama.

**5. Deuda menor del contrato a saldar en la promoción:** los dos archivos espejo
(`index.js` ESM / `index.cjs` CJS, sincronizados a mano) son un riesgo de divergencia. Al
empaquetarlo se resuelve con un único fuente + `exports` map (ESM/CJS condicional), eliminando
la sincronización manual. No urgente; se hace al promover, no ahora.

**Cuándo creas repos (respuesta a Emiliano):** **ahora NO creas ninguno.** El trabajo inmediato
es E2 **Frente A (launcher del niño), que vive en este repo** (`/client`). Crearás el repo del
**Engine** — e, idealmente, el repo **neutral del contrato** — al arrancar **Frente B (el SDK)**.
El arquitecto te avisará en ese punto exacto.

#### Cierre operativo de ADR-SDK-05 (Emiliano, 2026-06-11) — Frente B DESBLOQUEADO

Ese punto exacto llegó. Con el Frente A validado (QA verde 2026-06-11), Emiliano cerró las 4
decisiones operativas, todas con la recomendación del arquitecto:

| # | Decisión | Resolución |
| :-- | :-- | :-- |
| (a) | Hosting de los repos | **GitHub privado**, misma cuenta del proyecto: `didactifonis-contract` y `didactifonis-engine` |
| (b) | Publicación npm | Scope **`@didactifonis/contract`**, **SIN publicar aún**; consumo por **link/workspace local**; el registry se decide al estabilizar y pinear ("link ahora, pin después", punto 3 del refinamiento) |
| (c) | Dónde vive el SDK | **Dentro del repo Engine** — una sola pieza; el SDK es el runtime-bridge del Engine (la topología sigue siendo de 3 piezas: contrato / plataforma / Engine+SDK) |
| (d) | Checkouts locales | Hermanos del repo actual: `C:\didactifonis-contract` y `C:\didactifonis-engine` junto a `C:\Didactifonis2026`; la plataforma NO se mueve |

**Plan de arranque del Frente B:** B-0 (promoción del contrato, `didactifonis-backend` + revisión
`didactifonis-qa`) → B-1 (esqueleto del SDK en el repo Engine, `didactifonis-frontend`; condicionado
al smoke manual de Emiliano del flujo niño→jugar) → B-2 (validación cruzada, `didactifonis-security`
+ `didactifonis-qa`). B-0 incluye saldar la deuda del punto 5 (fuente único + `exports` map ESM/CJS)
y migrar el canónico `docs/postmessage-protocol.md` al repo del contrato (puntero en la plataforma).
Detalle en `docs/brief-e2-sdk-launcher.md` §B.4 y `docs/brief-b0-promocion-contrato.md`.

### ADR-SDK-06 — Modelo de score (normalización) — RESUELTA (2026-05-31)
**Contexto:** §1 dejó pendiente el rango del `score`. El modelo Mongo lo acotaba `0–100`; el
contrato 2.B traía `score: 850`. Emiliano resolvió: cada juego tiene su propia escala interna
(0–100, 0–1000, lo que sea, aleatorio según el juego); el valor final debe **visualizarse en
porcentaje** para normalizar puntaje y validación; para el niño es solo un número que sube/baja.
**DECISIÓN (Emiliano + arquitecto):** **desacoplar puntaje interno del juego de la métrica
normalizada.** El juego envía `rawScore` + `maxScore` (escala libre); la **plataforma deriva
`scorePercent` [0..100]** (fuente de verdad única, auditable) y deriva `passed` comparando contra
`passThreshold` (parámetro de la actividad). `rawScore` es informativo/gamificado; `scorePercent`
es el **canónico de validación y comparación** entre juegos. Detalle de campos en §2.B.
**Consecuencias:** ajuste del modelo `ActivityResult` y del `resultsRouter` en E0/E1 (§3.0);
`passThreshold` se inyecta en el arranque 2.A solo para feedback lúdico (§2.A). Capa 1, no SaMD.

---

### 3.0 — Brief de cambios backend para ADR-SDK-06 (Fase E0 — ajuste del modelo de score)

> Encargo a delegar a `didactifonis-backend`. Verificado contra el estado real del repo (no
> asumido): `server/activities/ActivityResult.js` (modelo), `server/activities/resultsRouter.js`
> (ingesta), `server/routes/progress.js` (lector). **Hallazgo clave: el campo `score` actual
> NO tiene ningún consumidor** — `progress.js` lee `passed`, `attemptCount`, `durationSeconds` y
> `activityType`, pero **nunca** `score`; el cliente (`/client`) no referencia `score`. La
> migración es de bajo riesgo: añadir/renombrar campos de score no rompe lectores existentes.

**Objetivo.** Sustituir el campo único `score` (acotado `0–100`) por el modelo de score
normalizado de ADR-SDK-06: el juego aporta crudo + máximo; la plataforma deriva el porcentaje y
el aprobado.

**Entregables:**

1. **Ajuste del esquema `ActivityResult`** (`server/activities/ActivityResult.js`):
   - **Eliminar** el campo `score` actual (`Number, min:0, max:100`). No tiene consumidores, no
     requiere retro-compatibilidad de lectura.
   - **Añadir** `rawScore` (`Number`, `min: 0`, default `null`) — puntaje crudo informativo.
   - **Añadir** `maxScore` (`Number`, `min: 0`, default `null`) — máximo de la escala del juego.
   - **Añadir** `scorePercent` (`Number`, `min: 0`, `max: 100`, default `null`) — **derivado por
     el backend**, valor canónico. Este es el que se persiste para validar/comparar.
   - Mantener `passed` (`Boolean`) — pero ahora **derivado por el backend**, no tomado del juego.
   - Comentario en el modelo: "Capa 1 educativa. `scorePercent`/`passed` son derivados
     server-side; `rawScore`/`maxScore` son informativos del juego (entrada no confiable)."

2. **Migración de datos** (script de migración para documentos existentes, si los hay en la BD):
   - Para resultados ya registrados con el viejo `score` (que estaba en 0–100): copiar `score`
     → `scorePercent` y `rawScore`, y `maxScore = 100`. Es una equivalencia segura porque el
     rango antiguo ya era 0–100. Si no hay datos en producción aún, basta con el cambio de esquema.

2.b **Añadir el campo `events`** (definido en §2.B.1/§2.B.2):
   - `events` (`[{ type: String, timestamp: Date, payload: Mixed }]`, default `[]`) — traza de
     telemetría de Capa 1, entrada NO confiable, **no interpretada ni agregada** por el backend.
   - La validación/truncado (filtrar malformados, aplicar el **cap defensivo de ingesta** —
     constante configurable en `/shared`, valor provisional, NO un tope de contrato; ver Q-EVT-2 en
     §3.2 —, descartar PII por contrato) se materializa al tocar `resultsRouter` en E1; el modelo
     solo declara la forma embebida. **Motivo del cap:** proteger el documento del límite de 16 MB
     de MongoDB y de un juego externo que infle el array (entrada no confiable). El valor definitivo
     del cap se calibra en E2 con datos de los pilotos.
   - Comentario en el modelo: "Capa 1 educativa — traza de telemetría; almacenada tal cual; no
     se deriva métrica de ella (frontera SaMD)."
   - **NO** crear colección aparte: array embebido en `ActivityResult` (acotado, se lee con el
     resultado). **NO** tocar `progress.js` (no consume `events`).

3. **`passThreshold` como parámetro de actividad** (decidir ubicación con el arquitecto, ver nota):
   - El umbral de aprobado en porcentaje debe poder definirse a nivel de actividad y/o asignación.
     Recomendación: añadir `passThreshold` (`Number` `[0..100]`, default p. ej. `60`) a
     `Activity` (lo fija el Admin al subir) con posible override en `Assignment` (lo afina el
     tutor/profesional al asignar). El endpoint de arranque (E1, §3.1) lo lee y lo inyecta en
     `config.passThreshold` del payload 2.A. **No es scoring clínico** (ver frontera regulatoria).

4. **Derivación en la ingesta** (se materializa en E1 al tocar `resultsRouter`, pero la regla se
   define aquí): al recibir resultados, el backend computa
   `scorePercent = clamp(round(rawScore / maxScore * 100), 0, 100)` y
   `passed = scorePercent >= passThreshold` (de la actividad/asignación). **Ignora** cualquier
   `scorePercent`/`passed` que venga del juego. Rechaza el POST si `maxScore` falta o `<= 0`, o
   `rawScore < 0`. Si `rawScore > maxScore`, acota a 100 y registra anomalía en logs.

**Frontera regulatoria (recordatorio para backend):** `scorePercent`/`passed` son métricas de
**Capa 1 (desempeño educativo)**. **NO** introducir clasificación clínica, umbrales diagnósticos,
ni lógica que infiera patología o recomiende terapia (anti-alcance §5.1–§5.3). El `passThreshold`
es un parámetro pedagógico configurable, no un corte clínico.

**Criterios de aceptación:**
- El modelo persiste `rawScore`, `maxScore`, `scorePercent` (0–100) y `passed`.
- El modelo persiste `events` como array embebido `[{type,timestamp,payload}]`, default `[]`.
- `progress.js` y demás lectores siguen funcionando (solo usan `passed` y otros campos no-score;
  no consumen `score` ni `events`).
- Existe un `passThreshold` consultable para derivar `passed`.
- La derivación de `scorePercent`/`passed` ocurre server-side; los valores del juego se ignoran.

**Secuenciación:** `didactifonis-backend` ajusta modelo + migración (E0) → la derivación en el
router se integra en E1 (§3.1) → `didactifonis-qa` prueba normalización (0–1000 → %, clamp,
maxScore inválido).

---

### 3.1 — Brief de cambios backend para ADR-SDK-02 (Fase E1)

> Este es el encargo que se delega a `didactifonis-backend`. Verificado contra el estado real
> del repo (no asumido): `resultsRouter.js`, `assignments.js`, `Assignment.js`,
> `ActivityResult.js`. **Hallazgo clave: NO existe hoy ningún endpoint de "arranque/inicio de
> actividad"; hay que crearlo, es el punto de emisión del token.**

**Objetivo.** Sustituir la autenticación del envío de resultados (hoy JWT del tutor) por un
**token de sesión de actividad de un solo uso** emitido al iniciar el modo niño, validado e
invalidado al recibir resultados. Migrar la idempotencia al token.

**Entregables:**

1. **Modelo `ActivitySessionToken`** (nuevo, en `server/activities/`):
   - `token` (UUID v4, único, indexado), `assignmentId` (ref Assignment), `childId` (ref Child),
     `activityId` (ref Activity), `status` (`unused` | `used`, default `unused`),
     `usedAt` (Date|null), `expiresAt` (Date, TTL index), `createdAt`.
   - Índice TTL sobre `expiresAt` para expiración automática. TTL sugerido: `maxDurationSeconds`
     del arranque + margen (p. ej. 30 min). Lo afina backend.

2. **Endpoint de arranque (NUEVO)** — emite el token. Sugerencia: `POST /api/activities/sessions`
   con body `{ assignmentId }`, protegido con `protect + requireActiveSubscription` (JWT del
   tutor/profesional). Reusa la verificación de permisos ya existente en `assignments.js`
   (tutor dueño del niño, o profesional en `child.accessGrants`). Responde con el **payload de
   arranque (2.A) consolidado en v0.2**: `sessionToken`, `assignmentId`, `activityId`, `config`
   (level, params, locale, audioInstructionsUrl, tutorInstructionsText, displayName opcional) y
   `runtime`. **Minimización estricta: NO serializar ningún atributo del menor** — sin `alias`
   de perfil, sin `ageBand`, sin sexo, sin nombre real, RUT, fecha exacta ni dato clínico. La
   adaptación por edad/dificultad proviene del **nivel/pack que el tutor eligió al asignar**
   (`config.level`/`config.params`), no del perfil del niño (ver 2.A, justificación legal).

3. **Refactor de `POST /api/activities/results`** (`resultsRouter.js`):
   - **Quitar** `protect + requireActiveSubscription` como guardia de credencial del juego.
     El juego ya no envía JWT del tutor.
   - **Añadir** validación del `sessionToken` del body: existe, `status === 'unused'`, no
     expirado, y que `assignmentId`/`childId`/`activityId` coincidan con los del token.
   - Al registrar el resultado: marcar el token `used` + `usedAt` (operación atómica para
     evitar carrera de doble envío). Migrar la idempotencia: **reenvío del mismo token
     usado → responder idempotente** (200 con el resultado ya registrado, no 409 por
     `assignment.status`). Un token inválido/expirado → 401/410 según corresponda.
   - Mantener la coherencia `assignment.status = 'completed'` como efecto, pero **no** como
     clave de idempotencia.
   - **Score normalizado (ADR-SDK-06, §3.0):** leer `rawScore` + `maxScore` del body; **derivar
     server-side** `scorePercent = clamp(round(rawScore/maxScore*100), 0, 100)` y
     `passed = scorePercent >= passThreshold` (de la actividad/asignación). Persistir
     `rawScore`, `maxScore`, `scorePercent`, `passed`. **Ignorar** cualquier `scorePercent`/`passed`
     que mande el juego. Rechazar si `maxScore` falta/`<=0` o `rawScore < 0`.

4. **Endurecimiento de ingesta** (refuerzo de la frontera con código externo):
   - Rate limit en `POST /results`. Tamaño máximo de payload. `metadata` acotado en tamaño.
   - El endpoint trata todo como **entrada no confiable** (spec §6.5).

**Notas y decisiones que backend NO debe tomar solo (elevar al arquitecto):**
- **Dónde vive el sessionToken** respecto al juego: por ADR-SDK-03, el token lo **inyecta el
  host (launcher del niño)** y el host hace el POST; el juego solo entrega su resultado por
  postMessage al SDK. En la transición (antes de E2), si el juego hiciera el POST directo,
  el token viajaría en el body — aceptable solo como puente temporal. **Confirmar con
  arquitecto antes de exponer el token al juego.**
- **Score: RESUELTO en E0 (ADR-SDK-06).** La divergencia `ActivityResult.score` acotado `0–100`
  vs `score: 850` del contrato quedó cerrada: el modelo pasa a `rawScore`/`maxScore`/`scorePercent`
  (ver §3.0). En E1 el `resultsRouter` ya debe escribir esos campos derivando `scorePercent`/`passed`
  server-side. **No volver a abrir el rango del score en E1.**
- **NO** introducir scoring clínico, clasificación ni IA decisoria (anti-alcance §5).

**Criterios de aceptación:**
- Iniciar una asignación emite un token `unused` con TTL; el payload de arranque no filtra PII.
- Un POST de resultados con token válido registra el resultado y marca el token `used`.
- Reenviar el mismo token → respuesta idempotente, sin doble registro.
- Token expirado, ya usado, o con ids no coincidentes → rechazado con el código correcto.
- El endpoint de resultados ya no depende del JWT del tutor.

**Secuenciación:** `didactifonis-backend` implementa → `didactifonis-security` audita el flujo
del token y la no fuga de PII de menores → `didactifonis-qa` prueba reenvío/expirado/usado.

---

#### 3.1.bis — Cierre de la Fase E1 — VEREDICTO: ACEPTADA (2026-06-04)

> Fase E1 implementada por `didactifonis-backend`, auditada por `didactifonis-security` y
> verificada por `didactifonis-qa`. El arquitecto registra el cierre. **Veredicto: ACEPTADA.**

**Qué se entregó (verificado):**
- **Modelo `server/activities/ActivitySessionToken.js`:** token de un solo uso, UUID v4, TTL
  30 min con índice TTL, estados `unused`/`used`.
- **`server/activities/sessionsRouter.js` — `POST /api/activities/sessions`:** emite token +
  payload de arranque 2.A **sin PII del menor**; RBAC canónico (tutor dueño / profesional vinculado
  / admin); **anti-IDOR** (valida ObjectId + `assignment.childId === child._id`); reutiliza un token
  `unused` vigente en vez de acumular.
- **`server/activities/resultsRouter.js`:** ingesta autenticada por `sessionToken` (no JWT);
  **validaciones antes del claim atómico**; claim `unused→used` atómico con **compensación**
  (revierte el token a `unused` si falla la creación del resultado); derivación server-side de
  `scorePercent = clamp(round(rawScore/maxScore*100),0,100)` y `passed = scorePercent >=
  Activity.passThreshold`, **ignorando** lo que mande el juego; validación/truncado de `events`
  (Q-EVT-1/2/3, cap desde `/shared`); idempotencia por token con `resultId` real; rate limit
  30/15min; payload 256 KB; metadata ≤4096 bytes.
- **`server/index.js`:** montaje en orden `sessions → results → activities`; `express.json` global
  a 10kb con parser de 256kb solo para `/results`; validación de `API_BASE_URL` al arranque.
- **`shared/index.js` + `shared/index.cjs`:** comentario Q-EVT-3 corregido; el `.cjs` **ya se
  consume desde el server** (arrastre de E0 cerrado).

**Auditoría de seguridad — 9 hallazgos remediados:** ALTO-1 anti-IDOR, ALTO-2 límite de payload,
MEDIO-1 `require('crypto')`, MEDIO-2 carrera del token, MEDIO-3 límite de metadata, MEDIO-4 tokens
ilimitados por assignment, BAJO-1/2/3.

**Bug crítico de QA (corregido):** el token se consumía **antes** de validar/crear el resultado →
pérdida silenciosa de datos + 200 con `resultId` null. Corregido reordenando las validaciones antes
del claim + compensación al fallar la creación. **Verificado con 4 escenarios contra MongoDB real
(16/16 assertions).**

**Decisiones/ambigüedades abiertas registradas para fases futuras (no bloquean E2):**
- `config.params`, `config.audioInstructionsUrl`, `config.tutorInstructionsText`,
  `config.displayName` quedan en **default vacío/null**: no hay fuente en los modelos actuales. **NO
  se inventó fuente** ni se derivó del perfil del niño. A confirmar si se añaden en el futuro.
- **Acceso irrestricto del admin** a cualquier niño: documentado como **decisión explícita de
  diseño** (soporte/auditoría), no un agujero de RBAC.
- **Cap de eventos `EVENTS_INGEST_CAP=200` sigue provisional**, a recalibrar en **E2** con los
  juegos-piloto (coherente con Q-EVT-2: cap defensivo, no tope de contrato).
- **El token viaja en el body del POST** como **puente temporal**; el gobierno host↔juego del token
  (el host inyecta y hace el POST, el juego nunca lo ve — ADR-SDK-03) se concreta en **E2**.

**Próximo paso: Fase E2** (SDK JS cliente / launcher, lado frontend). **Qué la desbloquea:** el
contrato de arranque 2.A está implementado y emitido por `POST /api/activities/sessions`, y la
ingesta 2.B endurecida ya consume el esquema de `/shared`. E2 construye el SDK que lee ese arranque
(`getContext()`), encola `events` (`reportEvent`) y envía resultados (`submitResults`) sobre
iframe+postMessage, y el **launcher del niño** que custodia el `sessionToken` (cierra el puente
temporal). En E2 se **recalibra el cap real de `events`**.

---

### 3.2 — Decisiones sobre `events` — RESUELTAS por Emiliano (2026-05-31)

> El esquema de `events` quedó definido con valores por defecto razonables (§2.B.1, §2.B.2).
> Estas 4 micro-decisiones quedaron **RESUELTAS por Emiliano el 2026-05-31**. Ninguna bloqueaba
> E0/E1; afinan comportamiento del SDK/host (E2) y, en el caso de Q-EVT-2, fijan una salvaguarda
> defensiva del backend. Registradas estilo ADR; autoritativas (reapertura requiere aprobación de
> Emiliano, dueño del contrato D4).

**Q-EVT-1 — ¿`events` es opcional o se exige al menos el ciclo de vida? — RESUELTA**
**DECISIÓN (Emiliano):** `events` es **OPCIONAL** en el contrato (puede faltar o venir `[]`; su
ausencia no invalida el resultado), **pero el SDK siempre emite el ciclo de vida automáticamente**
en la práctica. El contrato queda laxo (un juego legacy o un POST de transición sin SDK no rompe);
la implementación de referencia (el SDK) es estricta y siempre emite `activity_started` /
`activity_completed` / `abandoned`. (Recomendación del arquitecto aceptada.)

**Q-EVT-2 — Tope de eventos por resultado — RESUELTA (sin tope de contrato + cap defensivo de ingesta)**
**DECISIÓN (Emiliano):** **SIN TOPE FIJO a nivel de contrato en v1.0.** No se promete un número al
autor del juego; el límite real se **calibra en E2** según lo que pidan los juegos-piloto. La
constante vive en `/shared` y se ajusta entonces.
**Matiz de seguridad resuelto (arquitecto) — distinción de dos conceptos que NO deben confundirse:**
- **"Sin tope de contrato" (promesa al autor):** el contrato no fija ni promete un número máximo de
  eventos. El autor no programa contra un límite semántico; el catálogo y el esquema no imponen un
  techo. Esto es lo que Emiliano decidió dejar abierto hasta tener datos de los pilotos (E2).
- **"Cap defensivo de ingesta" (protección del servidor):** "sin tope de contrato" **NO** significa
  "sin ninguna salvaguarda" del lado plataforma. El juego es **entrada NO confiable** (spec §6.5,
  coherente con el endurecimiento del score en ADR-SDK-06) y un `events` ilimitado en un array
  **embebido** de `ActivityResult` puede chocar con el **límite duro de 16 MB por documento de
  MongoDB** y abre una vía de abuso (juego malicioso/externo inflando el array). Por eso el backend
  aplica en la ingesta un **cap defensivo, generoso y configurable** —una constante en `/shared`,
  con un valor alto **provisional**— que **NO** es una promesa de contrato, sino una protección de
  la **integridad del documento**. Al excederlo, el backend **trunca** (o rechaza, lo afina backend)
  y **registra una anomalía** para auditoría del bundle, sin perder el resultado primario por ello.
- **Calibración en E2:** el número concreto del cap se ajusta en E2 con datos reales de los pilotos;
  por eso no se fija ahora. El cap defensivo existe desde E0/E1 (es protección del servidor), pero
  su valor definitivo se sintoniza más tarde.
> Resumen de la distinción: *sin tope de contrato* (nada que prometer al autor) ≠ *cap defensivo de
> ingesta* (el servidor SIEMPRE se protege del documento gigante). El valor de 200 que figuraba en
> §2.B.1/§2.B.2 como "límite duro v1.0" deja de ser un límite de contrato y pasa a ser el **valor
> provisional del cap defensivo**, configurable y a recalibrar en E2.

**Q-EVT-3 — `type` fuera del catálogo sin prefijo `x_` — RESUELTA (warning + conservar)**
**DECISIÓN (Emiliano):** si el autor llama `reportEvent("foo")` con un `type` no estándar y sin
prefijo `x_`, el SDK emite un **warning en desarrollo y CONSERVA el evento** (lo encola como custom;
no se descarta en silencio — perder telemetría sin avisar es peor que guardarla como custom). El
backend ya lo acepta y almacena como custom (§2.B.1), sin derivar métrica de él. (Recomendación del
arquitecto aceptada.)

**Q-EVT-4 — `pause`/`resume`: dueño de la pausa — RESUELTA (host del ciclo de vida + autor opcional)**
**DECISIÓN (Emiliano):** el **host/launcher del niño emite los eventos `paused`/`resumed` del
ciclo de vida** (botón de pausa del launcher → SDK los emite auto), y el **autor del juego puede
añadir los suyos** si su juego tiene pausas lógicas internas. No es excluyente. La parte del host se
concreta al diseñar el launcher del niño (lado plataforma/cliente, fuera del SDK). (Recomendación
del arquitecto aceptada.)

> **Nota:** ninguna de estas 4 cambia el **esquema** `{ type, timestamp, payload }` ni la forma del
> modelo de datos (el array `events` embebido sigue igual). Q-EVT-2 sí ajusta la **semántica del
> tope**: de "límite de contrato 200" a "cap defensivo configurable, valor provisional, a calibrar
> en E2". E0 (modelo + extracción a `/shared`) sigue ejecutable: el campo `events` y el catálogo
> estándar están definidos; el cap es una constante de `/shared` con valor provisional.

---

## 4. Plan de fases del SDK / Engine standalone

> Cada fase indica objetivo, entregables y **qué agente lo ejecutaría** (la lógica de
> delegación se mantiene aunque el SDK sea repo aparte). Las fases E0–E1 son **del lado
> plataforma** (este repo) y desbloquean el resto; E2+ son del proyecto SDK.

### Fase E0 — Consolidar el contrato (lado plataforma) — BLOQUEANTE
- **Objetivo:** eliminar las divergencias de §1 y dejar **un** contrato canónico documentado.
- **Depende de:** ADR-SDK-01, ADR-SDK-02, ADR-SDK-06 (decisiones de Emiliano). **Todas RESUELTAS.**
- **Entregables:** D4 actualizado y consolidado; `/docs/contrato-resultados-vX.md` y
  `/docs/contrato-arranque-vX.md` y `/docs/contrato-publicacion-vX.md` con changelog;
  esquema del contrato extraído a `/shared` (paquete versionable);
  **ajuste del modelo `ActivityResult` al score normalizado (brief en §3.0) + `passThreshold`.**
- **Agentes:** `didactifonis-architect` (consolida docs/ADR — HECHO) → `didactifonis-backend`
  (ajusta modelo de score §3.0 + extrae el esquema a `/shared`).
- **Estado: COMPLETADA y aceptada (2026-06-04).** Veredicto: **ACEPTADA CON SEGUIMIENTO.** Modelo
  `ActivityResult` migrado al score normalizado (rawScore/maxScore/scorePercent/passed + `events`
  embebido), `Activity.passThreshold`, migración idempotente, constantes y catálogo extraídos a
  `/shared` (dual ESM `index.js` + CJS `index.cjs`). Dejó dos arrastres para E1 (dual `.cjs` inerte
  + comentario Q-EVT-3 erróneo), **ambos cerrados en E1.**

### Fase E1 — sessionToken + ingesta endurecida (lado plataforma) — BLOQUEANTE si ADR-SDK-02 = sessionToken
- **Objetivo:** implementar el token de sesión de actividad de un solo uso (D4) y migrar la
  idempotencia del `assignment.status` al token.
- **Entregables:** modelo `ActivitySessionToken` (uuid, assignmentId, childId, estado
  `unused/used`, TTL); emisión al entrar al modo niño; validación en `POST /activities/results`;
  endurecimiento de ingesta (rate limit, tamaño máximo de payload, `metadata` acotado).
- **Agentes:** `didactifonis-backend` (implementa) → `didactifonis-security` (audita el
  límite de confianza juego↔plataforma y la no fuga de PII) → `didactifonis-qa` (pruebas de
  reenvío, token usado, token expirado).
- **Estado: COMPLETADA y aceptada (2026-06-04). Veredicto: ACEPTADA.** Implementada por
  `didactifonis-backend`, auditada por `didactifonis-security` (9 hallazgos remediados: ALTO-1
  anti-IDOR, ALTO-2 límite de payload, MEDIO-1 `require('crypto')`, MEDIO-2 carrera del token,
  MEDIO-3 límite de metadata, MEDIO-4 tokens ilimitados por assignment, BAJO-1/2/3) y verificada por
  `didactifonis-qa`. QA detectó un **bug crítico** (el token se consumía antes de validar/crear el
  resultado → pérdida silenciosa de datos + 200 con `resultId` null); corregido reordenando las
  validaciones antes del claim atómico + compensación que revierte el token a `unused` si falla la
  creación; **verificado con 4 escenarios contra MongoDB real (16/16 assertions).** Detalle del
  veredicto y de las decisiones abiertas en §3.1.

### Fase E2 — SDK JS cliente (proyecto SDK)
- **Estado (2026-06-11): Frente A (launcher del niño, este repo) COMPLETADO y VALIDADO.**
  GameHost implementado en `client/src/pages/nino/GameHost.jsx` (iframe sandboxed + postMessage,
  protocolo en `docs/postmessage-protocol.md`); DEP-1 `bundleUrl` resuelta (modelo `Activity` +
  `runtime.bundleUrl` en 2.A). QA en verde: `docs/qa-e2-frente-a.md` (runtime backend 7/7 +
  inspección frontend; observación: evento `abandoned` no persiste server-side — limitación de
  diseño aceptada, seguimiento en Frente B/E3; smoke manual en browser pendiente del usuario).
  **Frente B DESBLOQUEADO (2026-06-11):** decisiones operativas a–d de ADR-SDK-05 cerradas por
  Emiliano (ver cierre operativo en §3, bajo ADR-SDK-05). Arranque según plan B-0 (promoción del
  contrato a `didactifonis-contract`) → B-1 (SDK en `didactifonis-engine`, espera smoke manual)
  → B-2 (validación cruzada). **B-0 COMPLETADA (2026-06-11, QA VERDE — `docs/qa-b0-promocion-contrato.md`):**
  repo `C:\didactifonis-contract` creado (fuente único `index.cjs` + exports map, 5 exports
  byte-equivalentes; protocolo canónico migrado); plataforma consume `@didactifonis/contract`
  vía `file:` link (commit 681490f); `/shared` vaciado a README puntero. Pendiente: remote
  privado en GitHub (`gh` CLI no instalada en la máquina — crear y pushear manualmente).
- **Objetivo:** librería que el autor del juego importa; abstrae el canal (ADR-SDK-03).
- **Entregables:** API mínima `getContext()` (lee el payload de arranque 2.A), `submitResults()`
  (valida contra el esquema y envía 2.B), cola offline + reintento idempotente (2.E); tipos
  del contrato consumidos del paquete compartido (ADR-SDK-05).
- **Agentes:** `didactifonis-frontend` (es JS de cliente/UX del runtime). Revisión de
  `didactifonis-security` sobre manejo de credenciales y datos del menor en el SDK.

### Fase E3 — Engine de autoría / export de bundle (proyecto SDK)
- **Objetivo:** herramienta que produce el ZIP de publicación válido (2.D) con `manifest.json`.
- **Depende de:** ADR-SDK-04 (tecnología base).
- **Entregables:** export que genera ZIP conforme al contrato de publicación; validador local
  del manifest (mismo esquema que usará la plataforma); plantilla de juego de ejemplo que
  usa el SDK E2 de punta a punta.
- **Agentes:** `didactifonis-frontend` (autoría/runtime) con `didactifonis-architect`
  revisando conformidad del manifest.

### Fase E4 — Validador de publicación (lado plataforma)
- **Objetivo:** que el panel Admin valide el ZIP al subirlo (cierra el §1.3).
- **Entregables:** endpoint/handler que valida estructura del ZIP + `manifest.json` contra el
  esquema compartido; mensajes de error claros para el Admin.
- **Agentes:** `didactifonis-backend` (validación) + `didactifonis-qa` (ZIP malformado).

### Fase E5 — Juego de referencia end-to-end (integración)
- **Objetivo:** un juego mínimo real que recorra todo: arranque inyectado → juego → envío de
  resultados → registro en plataforma → visible en Progreso del tutor.
- **Entregables:** juego de ejemplo + guía de "cómo construir un juego para Didactifonis".
- **Agentes:** `didactifonis-frontend` (juego) + `didactifonis-qa` (E2E) + `didactifonis-architect`
  (revisión de integración).

**Orden y paralelismo:** **E0 y E1 COMPLETADAS (2026-06-04). E2 Frente A (launcher) COMPLETADO y
VALIDADO (2026-06-11). E2 Frente B DESBLOQUEADO y EN CURSO (2026-06-11):** B-0 (promoción del
contrato) → B-1 (SDK en repo Engine, tras smoke manual de Emiliano) → B-2 (validación cruzada).
E3 requiere ADR-SDK-04. E4 puede ir en paralelo con E3 (comparten esquema de manifest). E5 al
final. **Regla de oro: una funcionalidad a la vez; no abrir frentes que se pisen.**

---

## 5. Anti-alcance — lo que el SDK NO debe hacer

Estos límites protegen la **frontera regulatoria** (no es producto médico) y la **línea base
de seguridad** (datos de menores). Son innegociables.

1. **NO diagnóstico ni clasificación clínica.** El juego mide desempeño educativo/gamificado
   (Capa 1): aprobado/reprobado, porcentaje, intentos, duración. **Prohibido** clasificar
   patologías, inferir trastornos o etiquetar al menor clínicamente.
2. **NO scoring clínico ni prescripción.** El `rawScore` (puntaje crudo del juego) y el
   `scorePercent` (porcentaje normalizado por la plataforma) son educativos/lúdicos, no índices
   clínicos. El `passThreshold` es un parámetro pedagógico configurable, no un corte clínico.
   **Prohibido** que el juego prescriba, recomiende terapia o sugiera la siguiente actividad de
   forma automatizada (eso es SaMD y cruza la frontera).
3. **NO recomendación terapéutica automatizada / IA decisoria.** El SDK no incorpora una capa
   de IA que decida el tratamiento. Refuerza la decisión del proyecto de no incluir IA clínica.
4. **NO generar registro de Capa 2.** El juego nunca escribe notas, observaciones u objetivos
   clínicos. Eso es exclusivo del profesional dentro de la plataforma. El juego solo emite
   datos de Capa 1.
5. **NO manejar atributos del menor — cero PII.** El SDK recibe SOLO identificadores opacos
   + `config` de la actividad (2.A v0.2). **Ningún atributo del menor cruza la frontera:** ni
   alias de perfil, ni edad/banda de edad, ni sexo, ni nombre real, RUT, fecha de nacimiento,
   ubicación, foto u otro identificador del menor. La adaptación (dificultad, vocabulario,
   presentación) viaja como parámetros de la ACTIVIDAD elegidos al asignar, no del NIÑO.
6. **NO ver ni manejar el JWT del tutor.** El juego es código externo; su credencial es el
   `sessionToken` de un solo uso (ADR-SDK-02), no la sesión del tutor.
7. **NO persistir datos sensibles fuera de la plataforma.** Telemetría a terceros, analytics
   externos, o envío de resultados a cualquier endpoint que no sea el de la plataforma están
   prohibidos. El destino de resultados lo fija la plataforma (`runtime.resultsEndpoint`).
8. **NO ejecutarse en la plataforma.** Coherente con CLAUDE.md: este repo no construye ni
   ejecuta juegos. El SDK y los juegos viven y corren fuera; la plataforma solo aloja el
   bundle, inyecta el arranque y registra resultados.
9. **NO gamificación en paneles profesionales.** Lo lúdico vive solo en el flujo del niño.
   El SDK no produce widgets ni elementos gamificados para los dashboards de tutor/profesional/admin.

---

## 6. Dependencias de pendientes de la plataforma (lo que puede cambiar)

> Marcado explícitamente porque Emiliano dijo que aportará antecedentes nuevos con los
> pendientes de la plataforma. Estos puntos del plan **se revisarán** cuando llegue ese input.

| Pendiente de plataforma | Impacto en el SDK | Fase afectada |
| :-- | :-- | :-- |
| ADR-SDK-01 idioma del contrato | Nombres que serializa el SDK | E0, E2 |
| ADR-SDK-02 sessionToken | Credencial de envío del juego | E1, E2 |
| ADR-SDK-03 canal | Transporte que abstrae el SDK | E2 |
| ADR-SDK-04 tecnología del Engine | Formato del bundle, export | E3 |
| ADR-SDK-05 repo/versionado del contrato | Cómo se comparte el esquema | E0, todas |
| Payload de arranque 2.A (propuesta) | Qué inyecta la plataforma al juego | E1, E2 |
| Validador de publicación (§1.3) no implementado | Cierre del ciclo de subida | E4 |

---

## 7. Resumen de qué falta para empezar

1. ~~Emiliano cierra **ADR-SDK-01 a 05**~~ — **HECHO** (2026-05-31, ver §3).
2. ~~Se valida/ajusta el **payload de arranque (2.A)**~~ — **HECHO** (2026-05-31): 2.A DEFINIDO,
   bloque `child` eliminado, cero atributos del menor (ver §2.A).
3. ~~Divergencia del **score**~~ — **HECHO** (2026-05-31, ADR-SDK-06): `rawScore`+`maxScore` del
   juego → `scorePercent` derivado por la plataforma. Contrato 2.B y modelo consolidados.
4. **Fase E0 desbloqueada y completamente especificada.** Pendiente solo de ejecución por
   `didactifonis-backend` (ajuste de modelo §3.0 + extraer esquema a `/shared`). Luego **E1**
   (sessionToken, §3.1, que ya integra la derivación de score).
5. ~~Pendiente menor: validar forma de `events` (2.B)~~ — **HECHO** (2026-05-31, v0.4 + v0.5):
   `events` DEFINIDO en §2.B.1 y §2.B.2 (esquema, catálogo, límites, API del SDK, almacenamiento).
   ~~4 micro-decisiones abiertas Q-EVT-1..4~~ — **TODAS RESUELTAS** por Emiliano (2026-05-31, v0.5,
   §3.2): opcional+SDK siempre emite (Q1); sin tope de contrato + cap defensivo de ingesta a
   calibrar en E2 (Q2); `type` sin `x_` → warning+conservar como custom (Q3); pause/resume del
   ciclo de vida los emite el host, autor opcional (Q4). **El contrato de juego (2.A + 2.B) queda
   COMPLETAMENTE cerrado.** El resto del Engine (E2–E5) se detalla una vez ejecutada E0.

---

## 8. Consultas resueltas (2026-05-31) — Engine híbrido Phaser/Rive/RPG Maker

> Emiliano hizo 4 consultas sobre la viabilidad del Engine. Respuestas con criterio técnico
> y honesto. Esta sección complementa ADR-SDK-04 (Phaser como motor base).

### 8.0 — La visión: Engine = Phaser + Rive + RPG Maker MZ

El Engine ideal de Emiliano es un **híbrido** que toma:
- **Phaser Editor** → composición visual de **escenas y assets 2D** (el "lienzo" del juego:
  sprites, fondos, capas, físicas). Aporta el *runtime* y el editor de escena.
- **Rive** → **animación interactiva con state machines**: personajes/elementos que reaccionan
  con transiciones suaves dirigidas por estado/inputs, no por timeline rígido. Aporta la
  *expresividad* (clave para juegos infantiles atractivos) sin programar cada animación.
- **RPG Maker MZ** → **editor de eventos/mecánicas data-driven sin código**: el autor define
  la lógica del juego (condiciones, secuencias, "si el niño hace X entonces Y") con un editor
  visual de eventos, no escribiendo JavaScript. Aporta la *autoría sin programar*.

**Síntesis arquitectónica:** un editor de escritorio sobre **Phaser** (runtime), con **Rive
como capa de animación** integrada por su runtime web (`@rive-app/canvas`), y un **sistema de
eventos data-driven inspirado en RPG Maker** que se serializa a JSON. El "juego" exportado es
un bundle (contrato 2.D) = escena Phaser + .riv de animaciones + un JSON de eventos que el
runtime interpreta. Esto es **data-driven design** y es lo que hace al Engine escalable (8.2).

### 8.1 — Consulta 1: ¿Es posible crear este Engine para Windows?

**Sí, es plenamente viable en Windows 11.** Dos caminos, ambos válidos:

- **Editor de escritorio (recomendado para el editor):** empaquetar el editor con **Electron**
  o **Tauri** sobre una UI web (React) + Phaser embebido. Electron es el camino más maduro y
  con más ejemplos (Phaser Editor 2D, de hecho, es Electron). Tauri pesa menos y es más seguro
  pero tiene menos ecosistema. **Recomendación: Electron** para el editor por madurez y por el
  runtime de Rive/Phaser ya probado ahí. Corre nativo en Windows sin fricción.
- **Web (recomendado para el runtime del juego):** el **juego exportado** corre en navegador
  (es lo que la plataforma embebe vía iframe, ADR-SDK-03). Phaser y Rive son web-native, así
  que el output siempre es web aunque el editor sea de escritorio.

**Patrón:** **editor de escritorio (Electron, Windows) que exporta bundles web.** Esto es
exactamente cómo trabajan Phaser Editor y RPG Maker MZ (editor desktop, juego web/portable).
No hay bloqueo técnico en Windows; es el escenario natural.

### 8.2 — Consulta 2: ¿Qué tan complicado es hacerlo escalable (que considere las referencias de los juegos)?

**Honestamente: la escalabilidad NO es gratis, pero es el problema correcto a resolver y hay
un patrón conocido para lograrlo: data-driven design + sistema de plantillas/tipos de actividad.**

El eje de escalabilidad es **no programar cada juego desde cero**, sino definir **tipos de
actividad** (plantillas) parametrizables por datos:

- **Plantilla / tipo de actividad** = un esqueleto de mecánica (p. ej. "emparejar sonido con
  imagen", "repetir secuencia", "discriminación auditiva") con *slots* configurables (assets,
  niveles, parámetros). Crear un juego nuevo de un tipo ya soportado = rellenar datos, no
  código. Crear un *tipo nuevo* = trabajo de ingeniería (una vez).
- **Sistema de eventos data-driven (RPG Maker-like)** = la lógica vive en JSON interpretado por
  el runtime, no en código compilado por juego. Esto es lo que multiplica la escala.
- **Plugins/módulos** = mecánicas o componentes reutilizables (un minijuego, un tipo de input
  de voz) que se registran en el Engine y quedan disponibles para todas las plantillas.

**Nivel de complejidad, sin endulzar:**
- **Bajo–medio:** soportar *instancias* de un tipo ya hecho (parametrizar por datos). Esto es
  donde se obtiene la escala real con poco coste marginal por juego.
- **Alto:** el **motor de eventos data-driven genérico** (el "RPG Maker"). Es el componente más
  caro y arriesgado; conviene construirlo **incremental**, empezando por los eventos que los
  juegos-piloto realmente necesitan (no un editor de eventos universal de entrada).
- **Medio:** integrar Rive como capa de animación dirigida por estado (su runtime es maduro;
  el coste está en el *pipeline* de assets y en conectar state machines a los eventos).

**Recomendación de escalabilidad:** empezar con **2–3 plantillas/tipos de actividad** cubiertas
por los juegos-piloto (8.3), un **manifest/contrato de publicación versionado** (ya definido,
2.D) y un **motor de eventos mínimo** que crezca según necesidad real. Resistir la tentación de
construir el editor universal antes de tener 2 juegos reales funcionando. **El contrato (esta
v0.x) es justamente la base de la escalabilidad: estandariza arranque/resultados/publicación.**

### 8.3 — Consulta 3: ¿Un solo juego o varios para el desarrollo mínimo (MVP)?

**Recomendación: 2 juegos-piloto (mínimo), idealmente 3. No uno solo.** Justificación:

- **Un solo juego** valida el contrato end-to-end (arranque → juego → resultados → registro),
  pero **no** valida que el Engine sea **reutilizable**: con un solo juego es imposible
  distinguir "Engine genérico" de "un juego con pasos extra". Se corre el riesgo de hornear
  suposiciones de ese único juego en el Engine.
- **Dos juegos de *tipos distintos*** (p. ej. uno de discriminación auditiva y uno de
  secuenciación) fuerzan a que la plantilla, el contrato y el SDK sean **genuinamente
  genéricos**. Es el mínimo para probar reutilización y el contrato bajo dos formas de
  resultado distintas.
- **Tres** añade margen para validar un tercer tipo de mecánica y el sistema de eventos, pero
  no es imprescindible para el MVP.

**Veredicto:** **MVP = 2 juegos-piloto de tipos diferentes**, que comparten Engine, SDK y
contrato. Esto es lo que se construye en **Fase E5** (juego de referencia → ampliar a dos).
Mantener la regla de oro: construirlos **secuencialmente** (uno end-to-end, luego el segundo),
no en paralelo, para no abrir frentes que se pisen.

> **CONCRETADO (2026-06-04, §8.6):** los 2 juegos-piloto ya están elegidos por Emiliano (La Casa
> Mágica + La Máquina del Tiempo Verbal), de primitivas de interacción y bandas de edad distintas,
> más un tercero post-piloto (El Mundo de las Metáforas). Ver §8.6 para el detalle.

### 8.4 — Consulta 4: ¿Es posible mezclar Phaser Editor + Rive + RPG Maker como referencias?

**Sí es posible, pero con un matiz importante: se mezclan como REFERENCIAS de diseño y, en el
caso de Phaser y Rive, como TECNOLOGÍAS reales integrables; RPG Maker se toma como INSPIRACIÓN
de su modelo de eventos, NO como motor a integrar.** Desglose honesto:

| Referencia | Qué aporta | ¿Integrable técnicamente? | Esfuerzo |
| :-- | :-- | :-- | :-- |
| **Phaser (Editor)** | Runtime 2D + editor de escena/assets. Es el **motor base** (ADR-SDK-04). | **Sí, directo.** Es web-native, base del proyecto. | Base (ya elegido) |
| **Rive** | Animación interactiva con state machines, integrable por `@rive-app/canvas`. | **Sí.** Runtime web maduro; se renderiza sobre/junto al canvas de Phaser. | Medio |
| **RPG Maker MZ** | Modelo de **eventos data-driven sin código**. | **NO se integra el motor** (es cerrado, su runtime es propio). Se **replica el concepto**: un editor de eventos propio que serializa a JSON. | Alto (es el componente caro) |

**Conclusión técnica:**
- **Phaser + Rive: combinables de verdad**, conviven en el mismo runtime web. Phaser maneja
  escena/lógica/físicas; Rive maneja animación expresiva dirigida por estado. Patrón probado.
- **RPG Maker: se toma su *paradigma*, no su código.** Su valor es el **editor de eventos
  data-driven** que permite a no-programadores definir mecánicas. Eso se **construye** (es el
  trabajo de §8.2, el más caro), inspirado en RPG Maker pero serializando a nuestro propio
  JSON de eventos que interpreta el runtime Phaser.

**Esfuerzo realista:** la mezcla Phaser+Rive es alcanzable en el MVP. El "RPG Maker layer"
(editor de eventos sin código) es un objetivo de **medio/largo plazo**, construido
incrementalmente (empezar por los eventos que los 2 juegos-piloto necesitan, no un editor
universal). **No bloquear el MVP esperando el editor de eventos completo.**

### 8.5 — Impacto en el plan de fases

- **ADR-SDK-04 = Phaser** confirma el formato del bundle (2.D): escena Phaser + `.riv` + JSON
  de eventos + `manifest.json`. La **Fase E3** (export de bundle) y **E4** (validador) deben
  contemplar estos artefactos.
- El **editor de escritorio (Electron, Windows)** es parte de la Fase E3 (autoría). El runtime
  web (Phaser+Rive+intérprete de eventos) es lo que se embebe vía iframe (E2/E5).
- **Fase E5 pasa a requerir 2 juegos-piloto de tipos distintos** (8.3), construidos en
  secuencia. El sistema de eventos data-driven se construye **incremental**, guiado por lo que
  esos 2 juegos necesiten realmente (8.2). Los 2 pilotos concretos están en **§8.6**.

### 8.6 — Juegos-piloto del MVP: selección concreta (CONFIRMADO 2026-06-04)

> **Estado: CONFIRMADO por Emiliano (2026-06-04).** Concreta el veredicto genérico de §8.3 ("2
> juegos de tipos distintos") con los juegos reales, elegidos tras revisar 3 PDFs de diseño en
> `referencias/JuegosEngine/`. Los tres comparten el mismo **molde**: 10 rondas, puntaje por ronda
> 2/1/0, máximo 20, aprueba con 14 (= 70%). Son **Capa 1 educativa, cero PII del menor, no cruzan
> la frontera SaMD**. **Verificado: el contrato cerrado (2.A arranque + 2.B resultados, incl.
> ADR-SDK-04/06 y catálogo de telemetría v1.0) los soporta sin cambios estructurales.**

#### Los tres juegos y por qué estos

| Juego | Edad | Primitiva de interacción | Dominio pedagógico | Banco de assets | Rol en el MVP |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **La Casa Mágica** | 4+ | **Drag & drop táctil** | Vocabulario semántico del hogar | ≥24 objetos en 4 categorías | **Piloto 1** |
| **La Máquina del Tiempo Verbal** | 7+ | **Selección 1-de-3** | Tiempos verbales (solo regulares) | (texto/ítems, bajo) | **Piloto 2** |
| **El Mundo de las Metáforas** | 9+ | Selección 1-de-3 | Lenguaje figurado | ≥30 expresiones (el más caro) | **Tercero, post-piloto** |

**Decisión de selección de los 2 pilotos (Emiliano):** **La Casa Mágica + La Máquina del Tiempo
Verbal.** Razón: entre ambos cubren las **dos primitivas de interacción distintas** (drag & drop
táctil vs. selección 1-de-3) y **dos bandas de edad** (4 y 7), que es exactamente lo que §8.3
exige para forzar que la plantilla/contrato/SDK sean genuinamente genéricos. **El Mundo de las
Metáforas queda como tercero (post-piloto)** porque requiere el **banco de assets más grande**
(≥30 expresiones de lenguaje figurado) y comparte primitiva con La Máquina del Tiempo Verbal
(selección 1-de-3), por lo que aporta menos al objetivo de "probar dos formas de interacción".

**Regla de oro (de §8.3) vigente:** se construyen **en secuencia**, uno end-to-end y luego el
otro, no en paralelo.

#### Cómo encaja cada decisión confirmada en el contrato ya cerrado

- **Umbral de aprobación — lo FIJA el Admin al subir la actividad.** `passThreshold` (porcentaje
  [0..100]) lo define el **Admin** al publicar la actividad; **en el MVP NO se expone override al
  tutor** en la asignación. Esto es coherente con el brief §3.0 punto 3 (umbral a nivel `Activity`)
  y simplifica E1: el endpoint de arranque lee el `passThreshold` de la actividad y lo inyecta en
  `config.passThreshold` (2.A). La aritmética del molde (14/20) es un default del **autor**; el
  valor autoritativo de aprobado es el `passThreshold` del Admin, derivado server-side (ADR-SDK-06).
  > **Implicación menor para backend (E1):** el override de `passThreshold` en `Assignment` que el
  > brief §3.0 dejaba como "posible" **NO se implementa en el MVP**. Solo `Activity.passThreshold`.

- **Telemetría de repeticiones de audio — a CRITERIO DEL AUTOR del juego.** NO se añade al catálogo
  estándar de `type` (§2.B.1) ni se promueve a v1.1. Si un juego quiere reportar cuántas veces el
  niño repitió un audio de instrucción, usa un **evento custom** (`x_audio_replayed`) o el estándar
  `hint_used`, ambos **opcionales**. Esto valida el diseño de extensibilidad del catálogo (clase b,
  prefijo `x_`): el catálogo estándar permanece corto y el hito específico no obliga a tocar el
  contrato. Capa 1, no se deriva métrica de él (frontera SaMD).

- **Inconsistencia 14/20 del doc de La Máquina del Tiempo Verbal — error humano, NO afecta al
  contrato.** El molde es 70% (14/20), no 80%. El documento de origen de ese juego tenía el error;
  **lo corrige el autor en su doc**, no este plan. El contrato es indiferente: el Admin fija
  `passThreshold` y la plataforma deriva `passed` (ADR-SDK-06), así que un número equivocado en el
  PDF de diseño no propaga a la lógica de aprobado.

#### Mapeo al modelo de score (ADR-SDK-06) — los tres juegos

El molde común se mapea limpio al contrato de resultados sin caso especial:

- `rawScore` = puntos del molde (0–20, suma de 10 rondas × {2,1,0}); `maxScore` = 20.
- La plataforma deriva `scorePercent = round(rawScore / 20 * 100)` y `passed = scorePercent >=
  passThreshold` (el del Admin). Con `passThreshold = 70`, `passed` ⟺ `rawScore >= 14`.
- `attemptCount`/`durationSeconds`/`events` según §2.B; ciclo de vida lo emite el SDK (auto), los
  hitos pedagógicos (`item_answered` por ronda, etc.) los emite el autor.

#### Impacto en fases

- **§8.5 / Fase E5:** los 2 pilotos pasan de "genéricos de tipos distintos" a **nombrados**: La
  Casa Mágica (drag & drop) primero o La Máquina del Tiempo Verbal (selección 1-de-3), en secuencia.
- **No cambia el contrato ni desbloquea/bloquea E0–E1:** la confirmación de pilotos es insumo de
  E2/E5, no del backend de plataforma. **E0 sigue siendo el próximo paso** y no se ve afectada.
