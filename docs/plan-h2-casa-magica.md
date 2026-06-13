# Plan H2 — La Casa Mágica (con placeholders)

> **Estado:** PROPUESTA (2026-06-13) — pendiente de validación de Emiliano.
> **Fase:** E3 / Hito H2 del brief `docs/brief-e3-engine-runtime-piloto1.md` §2.
> **Repo de trabajo:** `C:\didactifonis-engine` (engine/juegos). La plataforma
> `C:\Didactifonis2026` solo se toca para herramientas de QA (arnés E2E) y docs.
> **Precedente:** H1 COMPLETO (`packages/engine` commit `4bc9a5c`): runtime Phaser,
> plantilla `RoundActivity`, primitiva `drag-drop`, escenas Intro/Round/Outro.

---

## 1. Objetivo

Construir el Piloto 1 "La Casa Mágica" **funcional de punta a punta** sobre la plantilla
`RoundActivity` de H1, usando **assets placeholder** (formas/colores/audio mudo o beep +
subtítulo). Mecánica y flujo completos AHORA; los assets reales quedan como deuda ligada a
D-E3-1/2/3 (swap 1:1 cuando Emiliano resuelva).

Instrucción de Emiliano: **"Arrancamos H2 con placeholders"** — no esperar el arte/audio.

## 2. Qué construye H2 (alcance con placeholders)

### 2.1. El juego como definición de datos (lo principal)

`games/casa-magica` — carpeta estática que importa el build del engine (patrón de los
`examples/`, lo más simple, sin nuevo workspace npm salvo que frontend lo justifique).
Contiene la **definición data-driven** de La Casa Mágica que alimenta `createGame()`:

- **4 zonas** (habitaciones de la casa de muñecas), colores del design-system:
  - Dormitorio (azul suave), Cocina (amarillo cálido), Baño (celeste), Living (verde).
- **Banco de 24 ítems, 6 por categoría** (texto del brief §H2):
  - Dormitorio: almohada, cama, frazada, pijama, velador, peluche.
  - Cocina: olla, sartén, plato, refrigerador, taza, cuchara.
  - Baño: cepillo de dientes, pasta dental, jabón, toalla, shampoo, papel higiénico.
  - Living: sofá, televisor, control remoto, lámpara, alfombra, mesa de centro.
  - Cada ítem: `{ id, label, zoneId, questionText }` (shape ya soportado por la plantilla).
- **Textos**: intro con narración placeholder, outroHigh (≥8 aciertos), outroLow.
- **scoring** 2/1/0; **rounds** 10; **primitive** `drag-drop`.
- Selección aleatoria de 10 de 24 sin repetición → ya la hace la plantilla.

> El grueso de H2 es **datos**, no código nuevo del engine. Esa es la prueba de que el
> molde data-driven funciona.

### 2.2. Extensiones MÍNIMAS a la plantilla del engine (código nuevo)

El PDF de La Casa Mágica pide dos cosas que H1 dejó fuera (H1 no tenía audio):

1. **Botón altavoz + repetición de audio de la pregunta** (`RoundScene`):
   - Botón "altavoz" en el panel lateral que reproduce el audio de la pregunta de la ronda.
   - Sin límite de repeticiones. Cada uso emite el evento custom
     `reportEvent('x_audio_replayed', { round })` (el SDK ya acepta prefijo `x_` sin warning;
     verificado en `packages/sdk/src/index.js`).
   - **Placeholder de audio:** archivo local mudo/beep (`assets/audio/`) O Web Audio beep
     generado; el `questionText` **siempre visible como subtítulo** (ya lo hace la plantilla).
   - PROHIBIDO TTS de terceros en runtime (anti-alcance §5.7 del brief). Audio = archivo
     estático del bundle, rutas relativas.
2. **Fase de observación 3–5 s** antes de habilitar el arrastre (`RoundScene`):
   - El objeto aparece, breve pausa de observación, luego se reproduce el audio y se habilita
     el drag. Parametrizable por la definición (`observeMs`), default ~3000.

Estas dos extensiones se hacen **genéricas en la plantilla** (dirigidas por la definición:
`item.audioUrl`, `def.observeMs`), no hardcodeadas a La Casa Mágica — así el Piloto 2 las
hereda. Cambios localizados en `RoundScene` + un punto en `IntroScene` si la narración intro
también lleva audio.

### 2.3. Assets placeholder (estructura para swap 1:1)

- Sprites de objetos: por ahora las **formas geométricas** de la plantilla (`_drawItemShape`)
  con la etiqueta de texto. Estructura `assets/sprites/<itemId>.png` preparada y documentada
  para swap, pero NO se requieren PNG reales en H2.
- Habitaciones: rectángulos de color con label (ya lo hace `_buildZones`). `assets/rooms/`
  reservado.
- Audio: `assets/audio/<itemId>.mp3` (mudo/beep placeholder) + narración intro placeholder.
- Personaje guía (D-E3-3): **omitido** en H2 (placeholder neutro / ausente). No bloquea.

## 3. Deudas explícitas (ligadas a decisiones de Emiliano)

| Deuda | Ligada a | Qué falta |
| :-- | :-- | :-- |
| Sprites reales de los 24 objetos + fondos de habitación | **D-E3-1** | Swap 1:1 de `assets/sprites` y `assets/rooms` |
| Locuciones reales (narración + 24 preguntas + feedbacks) | **D-E3-1** | Swap de `assets/audio` (archivos estáticos, nunca TTS) |
| Animaciones Rive (flotar/brillar/rebotar) | **D-E3-2** | Hoy cubiertas por tweens de Phaser; Rive es aditivo |
| Personaje guía (Tomás / Luna) | **D-E3-3** | Placeholder neutro; se integra con D-E3-1 |
| Persistencia de `abandoned` | **D-E3-4** | Fuera de H2; no se toca |

## 4. Subtareas y agentes responsables

| # | Subtarea | Agente | Entregable |
| :-- | :-- | :-- | :-- |
| H2-A | Extensiones genéricas a la plantilla: botón altavoz + `x_audio_replayed` + fase de observación, todo dirigido por definición. | `didactifonis-frontend` | Cambios localizados en `packages/engine/src/scenes/RoundScene.js` (+ IntroScene si aplica). Build verde + smoke. |
| H2-B | `games/casa-magica`: definición data-driven (4 zonas + 24 ítems + textos), estructura de `assets/` placeholder con README de swap, `index.html` que monta el engine. | `didactifonis-frontend` | Carpeta `games/casa-magica` jugable en GameHost dev. |
| H2-C | QA E2E: arnés Playwright `e3-casa-magica.mjs` (en la plataforma, solo herramienta QA) jugando una sesión completa + contraprueba Mongo. Recoger el **dato real de eventos** (~25–45/sesión). | `didactifonis-qa` | E2E verde + `verify` Mongo: scorePercent coherente, `item_answered`×10, sin PII. |
| H2-D | Auditoría security del bundle: checklist ADR-SDK-03 (sin fetch/XHR/storage/PII) + payloads de telemetría sin datos del menor + `x_audio_replayed` sin PII. | `didactifonis-security` | Veredicto APTO / hallazgos. |
| H2-E | (Arquitecto) Propuesta de recalibración de `EVENTS_INGEST_CAP` con el dato real de H2-C. | arquitecto → Emiliano | Valor recalibrado propuesto. |

**Orden:** H2-A → H2-B (B depende de A para el botón altavoz). Revisión del arquitecto entre
A y B. Luego H2-C, y H2-D sobre el resultado de B. H2-E al final con el dato de C.

## 5. Criterios de aceptación (del brief §H2)

- La Casa Mágica corre end-to-end dentro de GameHost dev (`serve:b2` + seed con
  `B2_BUNDLE_URL`).
- Resultado en Mongo: `scorePercent` derivado server-side, `passed` boolean derivado,
  `maxScore:20`, eventos `item_answered`×10 + ciclo de vida + `x_audio_replayed` cuando aplica.
- **Cero PII** del menor en ningún payload. Cero violaciones ADR-SDK-03.
- Estructura de assets lista para swap 1:1 cuando llegue el arte real (D-E3-1).
- Audio = archivos locales; **cero TTS/servicios de terceros en runtime**.

## 6. Reglas innegociables (recordatorio)

- Frontera SaMD: el juego no calcula `passed`/`scorePercent`; los deriva el backend.
- El engine/juegos NO viven en la plataforma; la plataforma solo se toca para arnés QA + docs.
- Gamificación solo en el flujo del niño (el juego ES el flujo del niño: aquí sí es lúdico).
- `allow-same-origin` JAMÁS al sandbox sin nueva revisión de security.
- Un hito a la vez; commits pequeños por subtarea en el repo engine.
