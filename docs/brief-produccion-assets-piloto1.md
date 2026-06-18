# Brief de producción de assets — Piloto 1 "La Casa Mágica"

> **Destinatarios:** ilustrador/a (arte) y locutor/a (audio) que Emiliano comisione.
> **Objetivo:** entregar el set completo de arte y audio del juego "La Casa Mágica"
> para reemplazar los placeholders actuales **sin (o con el mínimo) cambio de código**.
> **Fuente de verdad de este brief:** el código real del juego en
> `C:\didactifonis-engine\games\casa-magica\index.html` y el motor en
> `C:\didactifonis-engine\packages\engine\src\scenes\RoundScene.js`. Los nombres de
> archivo y la lista de objetos aquí listados están extraídos de ese código, no inventados.
> **Personaje guía:** "Tomás el Constructor Mágico" (decisión D-E3-3).

---

## 0. Resumen para quien comisiona (leer primero)

El juego es un ejercicio de **categorización de vocabulario**: el niño escucha el nombre
de un objeto del hogar, lo observa y lo arrastra a la habitación donde vive (Dormitorio,
Cocina, Baño, Living). Hay **24 objetos** (6 por habitación) y **4 fondos de habitación**.

Se necesitan dos entregas independientes:

1. **AUDIO — swap directo, listo para integrar sin tocar código.**
   El juego ya carga 24 archivos `.mp3` por nombre exacto. Si el locutor entrega 24 mp3
   con esos mismos nombres y formato, se reemplazan 1:1 y funcionan de inmediato.
   Ver sección 2.

2. **ARTE — requiere una pequeña adaptación de código antes de integrar.**
   Importante: **hoy el juego NO usa imágenes**; dibuja los objetos como formas
   geométricas de color (círculo, cuadrado, triángulo, estrella) generadas por código,
   y las habitaciones como rectángulos de color con su nombre. No existe ningún archivo
   de sprite ni de fondo que "reemplazar". Por eso el arte **no es un swap 1:1 automático**
   como el audio: hay que añadir una etapa de carga de imágenes al motor (trabajo de
   ingeniería pequeño, ver sección 3.5). El ilustrador entrega contra la convención de
   nombres/dimensiones de la sección 3; la ingeniería conecta esas imágenes.

   Esto no bloquea la comisión: el ilustrador puede empezar **ya** con la lista y specs de
   la sección 3. El ajuste de código y la integración se hacen en paralelo / al recibir el arte.

---

## 1. Contexto del producto (para alinear el estilo)

- **Plataforma:** Didactifonis, apoyo a terapia fonoaudiológica infantil. NO es producto
  médico: el arte es cálido y lúdico, nunca clínico ni "de hospital".
- **Edad objetivo:** 4 a 7 años (manifest: `ageMin: 4`, `ageMax: 7`).
- **Tono:** cálido, cercano, amable. Los textos del juego ya están escritos en ese tono
  ("¡Bienvenido a La Casa Mágica! Hay muchos objetos fuera de lugar...").
- **La gamificación vive solo aquí** (en el juego del niño); los paneles de tutor y
  profesional son sobrios. El arte de este juego puede y debe ser plenamente lúdico.

---

## 2. AUDIO — guion y especificación

### 2.1. Regla firme (no negociable)

- **Locutor humano profesional.** NADA de TTS (texto-a-voz) de terceros en runtime.
- **Todo pre-grabado.** El juego reproduce archivos `.mp3` locales; nunca sintetiza voz.
- Voz **clara y bien modelada para pronunciación** (es un ejercicio fonoaudiológico: la
  articulación del nombre del objeto importa). Español neutro o chileno — a criterio de
  Emiliano según el locutor elegido.
- Ritmo pausado, dicción nítida, tono amable infantil. Sin música de fondo en estos clips.

### 2.2. Qué se graba

El juego reproduce **un audio por cada objeto**: el audio se dispara automáticamente al
entrar a cada ronda y se repite si el niño pulsa el botón de altavoz. El contenido de cada
audio es **el nombre hablado del objeto y/o su pregunta de categorización**.

**Decisión a tomar por Emiliano (ver sección 5, decisión A):** cada clip puede ser
   - (Opción corta) solo el nombre del objeto: *"Almohada."*
   - (Opción pregunta) la pregunta completa que ya está en el código: *"¿A qué cuarto
     pertenece la almohada?"*

Recomendación: grabar **la pregunta completa** (columna "Texto a grabar (pregunta)"),
porque es exactamente el texto que el juego ya muestra en pantalla como subtítulo, y
refuerza la consigna auditiva. Se incluyen ambas columnas para que el locutor tenga el
nombre aislado por si se decide la opción corta.

### 2.3. Formato y naming (extraído del código — `audioUrl` de cada ítem)

- **Formato:** MP3. (El loader de Phaser carga `.mp3`; mantener la extensión.)
- **Ubicación en el bundle:** carpeta `audio/` dentro del juego.
- **Nombres EXACTOS** (deben coincidir carácter por carácter, en minúscula, con guiones):

| # | Habitación | Objeto (label en pantalla) | Archivo (nombre EXACTO) | Texto a grabar (pregunta) | Texto a grabar (corto) |
|---|---|---|---|---|---|
| 1 | Dormitorio | Almohada | `audio/almohada.mp3` | ¿A qué cuarto pertenece la almohada? | Almohada |
| 2 | Dormitorio | Cama | `audio/cama.mp3` | ¿A qué cuarto pertenece la cama? | Cama |
| 3 | Dormitorio | Frazada | `audio/frazada.mp3` | ¿A qué cuarto pertenece la frazada? | Frazada |
| 4 | Dormitorio | Pijama | `audio/pijama.mp3` | ¿A qué cuarto pertenece el pijama? | Pijama |
| 5 | Dormitorio | Velador | `audio/velador.mp3` | ¿A qué cuarto pertenece el velador? | Velador |
| 6 | Dormitorio | Peluche | `audio/peluche.mp3` | ¿A qué cuarto pertenece el peluche? | Peluche |
| 7 | Cocina | Olla | `audio/olla.mp3` | ¿A qué cuarto pertenece la olla? | Olla |
| 8 | Cocina | Sartén | `audio/sarten.mp3` | ¿A qué cuarto pertenece el sartén? | Sartén |
| 9 | Cocina | Plato | `audio/plato.mp3` | ¿A qué cuarto pertenece el plato? | Plato |
| 10 | Cocina | Refrigerador | `audio/refrigerador.mp3` | ¿A qué cuarto pertenece el refrigerador? | Refrigerador |
| 11 | Cocina | Taza | `audio/taza.mp3` | ¿A qué cuarto pertenece la taza? | Taza |
| 12 | Cocina | Cuchara | `audio/cuchara.mp3` | ¿A qué cuarto pertenece la cuchara? | Cuchara |
| 13 | Baño | Cepillo de dientes | `audio/cepillo-de-dientes.mp3` | ¿A qué cuarto pertenece el cepillo de dientes? | Cepillo de dientes |
| 14 | Baño | Pasta dental | `audio/pasta-dental.mp3` | ¿A qué cuarto pertenece la pasta dental? | Pasta dental |
| 15 | Baño | Jabón | `audio/jabon.mp3` | ¿A qué cuarto pertenece el jabón? | Jabón |
| 16 | Baño | Toalla | `audio/toalla.mp3` | ¿A qué cuarto pertenece la toalla? | Toalla |
| 17 | Baño | Shampoo | `audio/shampoo.mp3` | ¿A qué cuarto pertenece el shampoo? | Shampoo |
| 18 | Baño | Papel higiénico | `audio/papel-higienico.mp3` | ¿A qué cuarto pertenece el papel higiénico? | Papel higiénico |
| 19 | Living | Sofá | `audio/sofa.mp3` | ¿A qué cuarto pertenece el sofá? | Sofá |
| 20 | Living | Televisor | `audio/televisor.mp3` | ¿A qué cuarto pertenece el televisor? | Televisor |
| 21 | Living | Control remoto | `audio/control-remoto.mp3` | ¿A qué cuarto pertenece el control remoto? | Control remoto |
| 22 | Living | Lámpara | `audio/lampara.mp3` | ¿A qué cuarto pertenece la lámpara? | Lámpara |
| 23 | Living | Alfombra | `audio/alfombra.mp3` | ¿A qué cuarto pertenece la alfombra? | Alfombra |
| 24 | Living | Mesa de centro | `audio/mesa-de-centro.mp3` | ¿A qué cuarto pertenece la mesa de centro? | Mesa de centro |

### 2.4. Textos narrativos (intro / outro) — opcionales, decisión B

Hoy estos textos **se muestran como texto en pantalla, sin audio asociado** (el código no
carga ningún mp3 para ellos). Si Emiliano quiere locutarlos también, son 3 clips extra.
Esto **sí requeriría un pequeño cambio de código** para reproducirlos (no hay `audioUrl`
para ellos hoy). Quedan como decisión B (sección 5). Textos exactos ya en el juego:

- **Intro:** "¡Bienvenido a La Casa Mágica! Hay muchos objetos fuera de lugar. Escucha
  bien la pregunta, observa cada objeto y arrástralo al cuarto donde vive. ¡Vamos a
  ordenar juntos!"
- **Outro (buen desempeño):** "¡Increíble! Ordenaste la casa como todo un experto. Todos
  los objetos están felices en su lugar. ¡Eres genial!"
- **Outro (bajo desempeño):** "¡Muy buen intento! La casa está casi ordenada. Con un
  poquito más de práctica lo lograrás. ¡Sigue así!"

Si se locutan, naming sugerido (a confirmar con ingeniería): `audio/intro.mp3`,
`audio/outro-high.mp3`, `audio/outro-low.mp3`.

---

## 3. ARTE — inventario y especificación

### 3.1. Estilo (obligatorio — design-system.md)

- **Paleta:** usar exclusivamente los tokens de marca. NO inventar colores:
  - `primary` Turquesa `#18C7D1` · `accent` Azul `#4C8DFF` · `creative` Morado `#9A6BFF`
  - `energy` Naranja `#FF8A3D` · `optimism` Amarillo `#FFD24A` · verde habitaciones `#48BB78`
  - `surface` Gris claro `#F5F7FA` · `text-strong` `#1B2A41`
- **Tipografía (si hay texto en arte):** Poppins (títulos/UI), Nunito Sans (cuerpo).
  Preferible NO incrustar texto en los sprites; los nombres los pone el motor.
- **PROHIBIDO (absoluto):** neones, *sci-fi glows*, *lens flares*, brillos artificiales.
  Iluminación limpia, natural, realista. Iconografía redondeada, grosor uniforme.
- **Estilo apropiado para terapia infantil 4+:** amable, claro, alto contraste
  figura-fondo, objetos reconocibles sin ambigüedad (un niño de 4 años debe identificar
  "olla" vs "sartén" al instante). Formas redondeadas, sin detalles diminutos.

### 3.2. Inventario de SPRITES de objeto (24)

Cada objeto necesita **un sprite**. El sprite es una ilustración del objeto **aislado,
sin fondo (PNG con transparencia)**, centrado. El motor lo muestra a ~80 px en el panel
lateral y lo anima (escala, arrastre). Convención de nombres propuesta (alineada al `id`
interno del ítem, para integración limpia): `art/items/<id>.png`.

| # | Habitación | Objeto | Archivo de sprite propuesto |
|---|---|---|---|
| 1 | Dormitorio | Almohada | `art/items/d-almohada0.png` |
| 2 | Dormitorio | Cama | `art/items/d-cama1.png` |
| 3 | Dormitorio | Frazada | `art/items/d-frazada2.png` |
| 4 | Dormitorio | Pijama | `art/items/d-pijama3.png` |
| 5 | Dormitorio | Velador | `art/items/d-velador0.png` |
| 6 | Dormitorio | Peluche | `art/items/d-peluche1.png` |
| 7 | Cocina | Olla | `art/items/c-olla2.png` |
| 8 | Cocina | Sartén | `art/items/c-sarten3.png` |
| 9 | Cocina | Plato | `art/items/c-plato0.png` |
| 10 | Cocina | Refrigerador | `art/items/c-refrigerador1.png` |
| 11 | Cocina | Taza | `art/items/c-taza2.png` |
| 12 | Cocina | Cuchara | `art/items/c-cuchara3.png` |
| 13 | Baño | Cepillo de dientes | `art/items/b-cepillo0.png` |
| 14 | Baño | Pasta dental | `art/items/b-pasta1.png` |
| 15 | Baño | Jabón | `art/items/b-jabon2.png` |
| 16 | Baño | Toalla | `art/items/b-toalla3.png` |
| 17 | Baño | Shampoo | `art/items/b-shampoo0.png` |
| 18 | Baño | Papel higiénico | `art/items/b-papel1.png` |
| 19 | Living | Sofá | `art/items/l-sofa2.png` |
| 20 | Living | Televisor | `art/items/l-televisor3.png` |
| 21 | Living | Control remoto | `art/items/l-control0.png` |
| 22 | Living | Lámpara | `art/items/l-lampara1.png` |
| 23 | Living | Alfombra | `art/items/l-alfombra2.png` |
| 24 | Living | Mesa de centro | `art/items/l-mesa3.png` |

> Nota: el sufijo numérico del archivo (0–3) NO tiene significado para el ilustrador; es
> un resto de la lógica de placeholder. Se conserva en el nombre solo para que calce con
> el `id` interno y la integración sea mecánica. El ilustrador solo ilustra el objeto.

**Spec técnica de cada sprite de objeto:**
- Formato: **PNG-24 con transparencia (canal alfa)**.
- Lienzo cuadrado: **512 × 512 px** (alta resolución; el motor reescala a ~80 px). Un
  único tamaño para todos simplifica la integración.
- Objeto centrado, con un pequeño margen de seguridad (~8%) a los bordes.
- Sin sombra proyectada "pegada" al borde del lienzo (una sombra suave de contacto está OK).
- Peso objetivo por archivo: < 200 KB (optimizar PNG).

### 3.3. Inventario de FONDOS de habitación (4)

Un fondo por habitación, que se usa como zona de destino donde el niño suelta los objetos.

| Habitación | Color token de la zona (referencia) | Archivo de fondo propuesto |
|---|---|---|
| Dormitorio | `accent` Azul `#4C8DFF` | `art/zones/dormitorio.png` |
| Cocina | `optimism` Amarillo `#FFD24A` | `art/zones/cocina.png` |
| Baño | `primary` Turquesa `#18C7D1` | `art/zones/bano.png` |
| Living | verde `#48BB78` | `art/zones/living.png` |

**Spec técnica de cada fondo:**
- Formato: **PNG** (o JPG si no requiere transparencia; PNG preferido por consistencia).
- Tamaño: **1024 × 768 px** (relación 4:3; el motor recorta/encaja en la celda de zona).
- Cada habitación debe **leerse de un vistazo** y armonizar con su color de zona token
  (el motor pinta la zona con ese color; el fondo debe combinar, no pelear con él).
- Deben dejar legible una etiqueta de texto con el nombre de la habitación superpuesta
  (el motor dibuja el nombre encima): zonas centrales no demasiado recargadas.

### 3.4. Personaje guía — "Tomás el Constructor Mágico" (D-E3-3)

Tomás es la mascota/guía del juego. **Hoy NO existe en el código** (ni como forma ni como
sprite): es contenido nuevo. Su rol funcional aún no está implementado, así que el brief
define el **set de arte base** y la ingeniería decidirá dónde aparece (intro, ayudas,
outro). Entregar al menos:

- **Pose neutral / saludo** (intro): `art/guide/tomas-idle.png`
- **Pose de ánimo / celebración** (acierto / outro alto): `art/guide/tomas-celebra.png`
- **Pose de aliento** (error / outro bajo): `art/guide/tomas-anima.png`

**Concepto de personaje:**
- Un "constructor mágico" amable y cercano, coherente con el universo "ordenar la casa".
- Apto para 4+ : redondeado, expresivo, sin elementos que asusten.
- Paleta de marca. Sin neones ni glows.
- (Opcional, a confirmar con Emiliano) hoja de expresiones adicional si se quiere reutilizar
  a Tomás en futuros juegos del piloto.

**Spec técnica:**
- Formato: **PNG-24 con transparencia**.
- Lienzo: **768 × 1024 px** (vertical, personaje de cuerpo entero), mismo encuadre en las
  3 poses para que el swap entre poses no salte.

### 3.5. Nota de integración del arte (para ingeniería, NO para el ilustrador)

Hoy `RoundScene.js` dibuja objetos con `_drawItemShape()` (Phaser Graphics) y zonas con
`_buildZones()` (rectángulos de color). Para usar las imágenes reales hace falta:

1. Añadir un `preload()` que cargue `art/items/<id>.png` para cada ítem seleccionado y
   `art/zones/<zoneId>.png` para cada zona (igual que ya se hace con el audio).
2. En `_buildDraggableItem`/`_drawItemShape`: si existe la textura del ítem, usar
   `this.add.image(...)` en lugar del shape geométrico; si no, mantener el shape como
   fallback (degradación elegante, no rompe si falta un asset).
3. En `_buildZones`: pintar el fondo de zona con la imagen detrás del color/etiqueta.
4. Personaje guía: nueva capa (probablemente en `IntroScene`/`OutroScene`), feature nueva.

Es un cambio **acotado y aditivo** (no reescribe la lógica de juego). Se delega a
`didactifonis-frontend`/engine cuando llegue el arte. Mantener el shape como fallback hace
que el juego siga funcionando aunque falte un sprite.

---

## 4. Criterios de aceptación del swap

**Audio (swap 1:1, sin código):**
- [ ] 24 archivos MP3, nombres EXACTOS de la tabla 2.3, en carpeta `audio/`.
- [ ] Sustituyen a los 24 placeholder mudos actuales (mismo nombre → reemplazo directo).
- [ ] Voz humana real, sin TTS. Pronunciación clara del nombre del objeto.
- [ ] (Si decisión B) 3 clips de intro/outro adicionales.

**Arte (entrega contra convención; integración por ingeniería):**
- [ ] 24 sprites de objeto PNG transparente, 512×512, nombres `art/items/<id>.png` de tabla 3.2.
- [ ] 4 fondos de habitación, 1024×768, nombres `art/zones/<zoneId>.png` de tabla 3.3.
- [ ] 3+ poses de "Tomás el Constructor Mágico", 768×1024, en `art/guide/`.
- [ ] Estilo conforme a design-system.md (paleta de tokens, sin neones/glows, apto 4+).
- [ ] Objetos inequívocamente reconocibles por un niño de 4 años.

**Garantía de "sin sorpresas de código" para el audio:** como el motor ya carga
`item.audioUrl` con esos nombres exactos, entregar los mp3 con el mismo nombre y formato
hace que la integración del audio sea reemplazar archivos. No se requiere tocar código.

**Para el arte:** los nombres/dimensiones de arriba son la convención que la ingeniería
implementará en el `preload`. Si el ilustrador necesita desviarse (p. ej. otro tamaño de
lienzo), avisar antes de producir para ajustar la convención de una vez.

---

## 5. Decisiones abiertas que necesita Emiliano (antes o durante la comisión)

- **Decisión A (audio):** ¿clips cortos (solo el nombre) o pregunta completa? Recomendado:
  pregunta completa (es el texto que ya muestra el juego). Afecta el guion que se entrega.
- **Decisión B (audio):** ¿se locutan intro y los 2 outros? Si sí, +3 clips y un pequeño
  cambio de código (hoy no tienen audio).
- **Decisión C (personaje):** ¿se quiere una hoja de expresiones ampliada de Tomás para
  reutilizarlo en futuros juegos, o solo las 3 poses de este piloto?

---

## 6. Procedencia (de dónde sale cada dato de este brief)

- Lista de 24 objetos, nombres de archivo de audio, question texts, zonas y colores:
  `C:\didactifonis-engine\games\casa-magica\index.html` (objeto `DEMO_DEFINITION`).
- Hecho de que los objetos/zonas se dibujan con Graphics (no imágenes) y que el audio se
  carga por `item.audioUrl`: `C:\didactifonis-engine\packages\engine\src\scenes\RoundScene.js`.
- Tokens de color y prohibiciones de estilo: `C:\Didactifonis2026\design-system.md`.
- Empaquetado del bundle (carpetas `audio/` y `art/` se incluyen automáticamente; se
  excluyen `node_modules/`, `tools/`, `scripts/`, dotfiles): `C:\didactifonis-engine\scripts\export-bundle.cjs`.
- Edad objetivo y metadatos: `C:\didactifonis-engine\games\casa-magica\manifest.json`.
