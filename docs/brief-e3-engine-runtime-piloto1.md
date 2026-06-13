# Brief E3 — Engine runtime + Piloto 1 (La Casa Mágica) + export de bundle

> **Estado:** v1.0 (2026-06-12) — corte incremental decidido por el arquitecto.
> **Fase:** E3 del plan `docs/plan-sdk-engine-juegos.md` (v0.8, §4 y §8).
> **Repos:** el trabajo de engine/juegos vive en `C:\didactifonis-engine`. La plataforma
> (`C:\Didactifonis2026`) NO se toca en E3 (el seed B-2 ya es parametrizable vía
> `B2_BUNDLE_URL`); solo docs.
> **Precedentes:** E0/E1/E2 (Frente A + Frente B B-0/B-1/B-2) COMPLETADAS. Contrato 2.A/2.B
> cerrado; SDK `@didactifonis/sdk` v0.1.0 auditado; E2E Playwright verde.

---

## 1. Objetivo de E3 (qué entrega esta fase)

Según el plan §4 + §8.5, E3 entrega:

1. **Runtime web del Engine** (`packages/engine` del repo engine): Phaser como motor base
   (ADR-SDK-04), plantilla data-driven del **molde común** de los pilotos (§8.6) y la
   **primitiva drag & drop** del Piloto 1. Es lo que se embebe vía iframe en GameHost.
2. **Piloto 1 completo: La Casa Mágica** (`games/casa-magica`), construido SOBRE la
   plantilla, usando el SDK de punta a punta (cumple el entregable "plantilla de juego de
   ejemplo que usa el SDK E2 de punta a punta").
3. **Export de bundle** (contrato 2.D): script que produce el ZIP de publicación con
   `manifest.json` + **validador local del manifest** (mismo esquema que usará la
   plataforma en E4, vivienda del esquema: `@didactifonis/contract`).

**Lo que NO entrega E3 (corte explícito, regla §8.4 "no bloquear el MVP"):**

- **Editor de escritorio Electron** — medio/largo plazo, post-pilotos. La autoría en E3 es
  *editar el JSON de definición del juego a mano*; el editor visual llega cuando existan
  ≥2 juegos reales que digan qué debe editar.
- **Editor de eventos RPG Maker-like** — ídem. La plantilla round-based ES el primer
  incremento del paradigma data-driven: la lógica vive en datos (definición del juego),
  no en código por juego.
- **Rive** — DIFERIDO de este corte (decisión elevada a Emiliano, D-E3-2 abajo). Las
  animaciones que pide el PDF del Piloto 1 (flotar, brillar, rebotar, parpadear) se cubren
  con tweens de Phaser.
- **Piloto 2 (La Máquina del Tiempo Verbal)** — en SECUENCIA tras cerrar H3 (regla §8.3).
  La primitiva selección 1-de-3 se añade a la plantilla en ese momento, no antes.
- **sendBeacon / persistencia de `abandoned`** — exige un vehículo nuevo en el contrato
  2.B (Emiliano es el dueño); registrado en D-E3-4, no bloquea.

---

## 2. Hitos (en secuencia, un commit/revisión por hito)

### H1 — `packages/engine`: runtime mínimo + plantilla + drag & drop

**Dónde:** `C:\didactifonis-engine\packages\engine` (workspace npm nuevo; añadir
`packages/engine` ya está cubierto por `workspaces: ["packages/*"]`).

**Qué construir:**

- Paquete `@didactifonis/engine` (private, type module, Vite build igual que el SDK).
  Dependencias: `phaser` (^3.x estable), `@didactifonis/sdk` (workspace),
  `@didactifonis/contract` (file link, mismo patrón que el SDK).
- **`RoundActivity` (plantilla del molde común §8.6):** orquesta 10 rondas; puntaje por
  ronda 2 (primer intento) / 1 (segundo) / 0 (fallo doble); `rawScore` acumulado 0–20,
  `maxScore = 20`. Selección aleatoria sin repetición de 10 ítems de un banco. Pantalla
  de introducción → rondas → pantalla final. Todo dirigido por una **definición de juego
  en datos** (objeto/JSON): banco de ítems, categorías/zonas, textos, refs de assets,
  primitiva a usar.
- **Primitiva `drag-drop`:** N zonas de destino visibles simultáneamente + 1 ítem por
  ronda que se arrastra (Phaser input táctil/mouse). Acierto = soltar en la zona correcta.
  Primer error → pista visual (la zona correcta parpadea, sin entregar la respuesta);
  segundo error → ayuda automática (el ítem viaja solo a la zona correcta, 0 puntos).
- **Integración SDK (cableada en la plantilla, el autor del juego no la escribe):**
  - `init({ hostOrigin })` leyendo `hostOrigin` de la query string (patrón exacto de
    `examples/test-game-b2/index.html`, líneas 414–421).
  - `getContext()` con reintento (hasta 3 intentos — copiar el patrón del test-game-b2;
    razón: carrera con el registro del listener del host). De `config` consume:
    `passThreshold` (solo para feedback lúdico de la pantalla final), `params` (overrides
    de la definición del juego, p. ej. subconjunto del banco), `audioInstructionsUrl` /
    `tutorInstructionsText` (si vienen, se ofrecen antes de empezar).
  - Telemetría (mapeo del molde al catálogo — el SDK ya emite el ciclo de vida):
    - `attempt` `{ index }` en cada arrastre/intento.
    - `item_answered` `{ itemId, correct, attemptIndex, timeMs }` al resolverse cada ronda
      (timeMs = tiempo de respuesta de la ronda; es dato de la actividad, no del niño).
    - `hint_used` `{ level: 1 }` cuando se muestra la pista visual; `{ level: 2 }` cuando
      actúa la ayuda automática.
    - `x_audio_replayed` `{ round }` al usar el botón de repetición de audio (§8.6:
      criterio del autor, custom).
  - `submitResults({ rawScore, maxScore: 20, attemptCount, durationSeconds: null })` al
    terminar la ronda 10 (el host calcula la duración). `attemptCount` = suma de intentos
    usados en la sesión (rango 10–20). **Una sola llamada** (el SDK ya es idempotente).
- **Demo de desarrollo** `examples/demo-engine-h1/`: HTML que carga el build del engine
  con una definición de juego placeholder mínima (formas geométricas de colores como
  ítems, 4 zonas, 10 rondas) — suficiente para validar la plantilla contra GameHost SIN
  los assets del Piloto 1.

**Validación H1 (criterio de aceptación):**

1. `npm run build` del workspace verde; smoke node estilo `packages/sdk/smoke-umd.cjs`.
2. La demo corre end-to-end dentro de GameHost en dev: `npm run serve:b2` (sirve la raíz
   del repo engine en `127.0.0.1:8788`) + seed de la plataforma con
   `B2_BUNDLE_URL=http://127.0.0.1:8788/examples/demo-engine-h1/index.html?hostOrigin=http://localhost:5173`
   (el seed `server/scripts/seedSmokeE2.js` ya lee esa env var; NO tocar la plataforma).
3. Resultado registrado en Mongo con `scorePercent` derivado y eventos del mapeo de arriba
   (contraprueba: `server/scripts/verifyB2Result.js` como referencia de lectura).
4. Cero violaciones ADR-SDK-03: el engine NO hace fetch/XHR/sendBeacon, NO toca
   storage/cookies, NO conoce sessionToken/JWT, NO recibe ni loggea PII. Su única E/S de
   red de datos es el SDK (postMessage). Los assets del bundle (imágenes/audio) se cargan
   por rutas RELATIVAS al bundle.

### H2 — Piloto 1: La Casa Mágica completa

**Dónde:** `C:\didactifonis-engine\games\casa-magica` (añadir `games/*` a los workspaces
del root si se hace paquete; alternativa simple: carpeta estática que importa el build del
engine, como los examples — decide frontend, preferir lo simple).

**Fuente funcional:** `referencias/JuegosEngine/LA CASA MÁGICA.pdf` (plataforma). Resumen
ejecutable (verificado contra el PDF):

- 4 habitaciones visibles a la vez (casa de muñecas): Dormitorio (azul suave), Cocina
  (amarillo cálido), Baño (celeste), Living (verde).
- Banco mínimo de **24 objetos, 6 por categoría**: Dormitorio (almohada, cama, frazada,
  pijama, velador, peluche); Cocina (olla, sartén, plato, refrigerador, taza, cuchara);
  Baño (cepillo de dientes, pasta dental, jabón, toalla, shampoo, papel higiénico);
  Living (sofá, televisor, control remoto, lámpara, alfombra, mesa de centro).
- Flujo de ronda: objeto aparece en panel lateral → 3–5 s de observación → audio de la
  pregunta ("¿A qué cuarto pertenece la almohada?") → botón altavoz repite sin límite →
  arrastre → feedback correcto/incorrecto según molde (pista visual al primer error,
  ayuda automática al segundo).
- Pantalla de introducción con narración; pantalla final con puntaje total, estrellas y
  variante sobresaliente (≥8 aciertos) / media-baja.
- 10 rondas aleatorias sin repetición; puntaje 2/1/0; máx 20; umbral recomendado 14 (70%)
  — **el valor autoritativo lo fija el Admin** (`Activity.passThreshold`), el juego solo
  usa `config.passThreshold` para el feedback final (ADR-SDK-06).

**Assets y audio:** hasta que Emiliano resuelva D-E3-1, TODO con **placeholders locales**
(sprites simples dibujados/generados, etiquetas de texto; audio = archivos locales mudos o
beeps + el texto de la pregunta SIEMPRE visible en pantalla como subtítulo). PROHIBIDO
llamar TTS u otros servicios de terceros en runtime (anti-alcance §5.7). La estructura de
assets debe permitir swap 1:1 cuando llegue el arte real.

**Validación H2:** E2E con el arnés Playwright `client/e2e/b2-smoke.mjs` adaptado (o
variante nueva `e3-casa-magica.mjs` en la plataforma SOLO como herramienta de QA) jugando
una sesión completa de forma automatizada + contraprueba Mongo (scorePercent coherente con
el molde, eventos `item_answered`×10 presentes, sin PII en payloads). **Recoger el dato
real de eventos/sesión** (~10 attempt + ~10–20 item/hint + ciclo de vida ≈ 25–45) y
proponer la recalibración de `EVENTS_INGEST_CAP` (heredado Q-EVT-2) al arquitecto.
Revisión `didactifonis-security` del bundle (checklist ADR-SDK-03 + payloads de telemetría
sin datos del menor).

### H3 — Export de bundle + manifest + validador local

- **Esquema del manifest en `@didactifonis/contract`** (repo `C:\didactifonis-contract`):
  campos 2.D traducidos a inglés por ADR-SDK-01 (consecuencia ya decidida: "el contrato de
  publicación (2.D) usa campos en inglés"):
  `id`, `title`, `version`, `category`, `level`, `ageMin`, `ageMax`, `durationMin`,
  `entryPoint` (+ `contractVersion` del manifest). Exportar constante con el esquema
  (nombres/tipos/obligatoriedad) consumible por el validador local (E3) y por la
  plataforma (E4) — una sola definición, ADR-SDK-05.
- **Script de export** en el repo engine (`scripts/export-bundle.cjs` o similar):
  empaqueta un juego (`games/casa-magica`) → ZIP con `manifest.json` en la raíz + entry
  point + assets, rutas relativas, sin sourcemaps (deuda H-7 de B-2), sin node_modules.
- **Validador local** (`scripts/validate-manifest.cjs`): valida el ZIP/manifest contra el
  esquema del contrato; mensajes de error claros. Es el espejo del validador de E4.
- **Validación H3:** el ZIP exportado de La Casa Mágica pasa el validador local; el
  contenido descomprimido servido estático corre en GameHost igual que en H2.

---

## 3. Decisiones ELEVADAS a Emiliano (no las toma el equipo)

| ID | Decisión | Recomendación del arquitecto | Bloquea |
| :-- | :-- | :-- | :-- |
| **D-E3-1** | **Arte y audio del Piloto 1.** ¿Quién produce los 24+ sprites, la casa, el personaje guía y las locuciones (narración + 24 preguntas + feedbacks)? ¿Se desarrolla con placeholders y se hace swap después? | Construir H1/H2 con placeholders YA y swap 1:1 cuando exista el arte (no bloquear la mecánica por assets). Las locuciones son grabaciones/archivos estáticos dentro del bundle, nunca TTS de terceros en runtime. | H2 *final* (la versión publicable); NO bloquea H1 ni el desarrollo de H2 |
| **D-E3-2** | **Rive fuera del corte MVP de E3.** La visión ADR-SDK-04 incluye Rive; propongo diferirlo: los tweens de Phaser cubren las animaciones del PDF y Rive entra cuando exista pipeline de assets `.riv` real (¿con el arte de D-E3-1?). | Diferir. Integrarlo después es aditivo (capa de animación sobre el canvas), no rompe la plantilla. | Nada (si acepta) |
| **D-E3-3** | **Personaje guía del Piloto 1:** el PDF deja abierto "Tomás el Constructor Mágico" o "Luna la Guardiana de la Casa". | Indistinto para la mecánica; decidir junto con D-E3-1. Placeholder neutro mientras tanto. | La versión publicable de H2 |
| **D-E3-4** | **Vehículo para `abandoned` con persistencia** (heredado de E2): hoy el abandono solo deja el assignment sin `completed`; persistirlo exige un cambio del contrato 2.B (dueño: Emiliano) + sendBeacon en el host. | Posponer a una revisión de contrato post-E3 (junto con la recalibración del cap y la decisión de hosting de bundles). No bloquea los pilotos. | Nada |

Pendiente previo que sigue abierto (no de E3 pero ligado): **hosting de bundles de
producción** (deuda H-1/H-3/H-7 de B-2). El serve-static actual es dev-only; la decisión
se necesita recién para E4/publicación real.

## 4. Reglas innegociables (recordatorio para todos los subagentes)

- Frontera SaMD: cero scoring clínico, cero inferencia, cero recomendación automatizada.
  `passed`/`scorePercent` son educativos; el backend los deriva, el juego no los calcula.
- Cero PII del menor: el juego no recibe (2.A) ni emite (payloads de `events`/`metadata`)
  atributo alguno del niño. `itemId`/`correct`/`timeMs` son datos de la actividad.
- `allow-same-origin` JAMÁS se añade al sandbox del iframe sin nueva revisión de security.
- El engine/juegos NO viven en la plataforma; la plataforma solo se toca para
  herramientas de QA (arnés E2E) y docs.
- Gamificación solo en el flujo del niño (el juego ES el flujo del niño: aquí sí es lúdico).
- Cambios mínimos; un hito a la vez; commits pequeños por hito en el repo engine.

## 5. Estado de ejecución

- [ ] H1 — runtime + plantilla + drag&drop (`didactifonis-frontend`)
- [ ] Revisión H1 (arquitecto) + validación GameHost
- [ ] H2 — La Casa Mágica (`didactifonis-frontend`) + QA E2E + security bundle
- [ ] Recalibración `EVENTS_INGEST_CAP` con datos reales (arquitecto propone, Emiliano aprueba)
- [ ] H3 — export/manifest/validador (`didactifonis-frontend` + revisión de conformidad del arquitecto)
- [ ] D-E3-1..4 resueltas por Emiliano
