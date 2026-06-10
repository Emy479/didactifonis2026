# Plan — Fase 7: Landing Page

**Fecha:** 2026-05-30
**Arquitecto:** didactifonis-architect
**Agente ejecutor:** didactifonis-frontend

---

## Objetivo

Construir el sitio público de marketing de Didactifonis en `/landing`. Sin autenticación,
sin estado, sin datos sensibles. Objetivo primario: conversión (registro / prueba gratuita).

---

## Decisión de arquitectura

**Stack elegido: Vite + React + Tailwind v3** (idéntico al stack de `/client`).

Razón: la landing tiene 5 rutas, filtrado interactivo en Recursos, accordion en Contacto
y componentes con personajes. HTML estático no escala a esta complejidad visual.

La landing es un proyecto Vite **completamente independiente** de `/client`:
- Sin estado compartido.
- Sin imports cruzados con `/client` o `/server`.
- Sin autenticación ni datos sensibles.
- Mismos tokens de diseño (`design-system.md`) pero configurados localmente.

---

## Estructura objetivo de `/landing`

```
/landing
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  index.html
  /public
    /assets         (imágenes estáticas, personajes)
  /src
    main.jsx
    App.jsx         (router)
    index.css       (tokens Tailwind + Google Fonts)
    /components
      Navbar.jsx
      Footer.jsx
    /pages
      HomePage.jsx
      ResourcesPage.jsx
      ContactPage.jsx
      LoginPage.jsx
      RegisterPage.jsx
```

---

## Navegación del sitio (extraída de las referencias)

| Ítem nav | Ruta interna |
|:--|:--|
| Inicio | `/` |
| ¿Cómo funciona? | `/#como-funciona` (anchor en HomePage) |
| Beneficios | `/#beneficios` (anchor en HomePage) |
| Para quién es | `/#para-quien` (anchor en HomePage) |
| Recursos | `/recursos` |
| Contacto | `/contacto` |
| Iniciar sesión | `/iniciar-sesion` |
| Comenzar ahora | `/comenzar` |

---

## Páginas y secciones

### 1. HomePage (`/`) — referencia: `001_Landing_Page.png`

Secciones en orden:
1. **Hero** — título "Aprende jugando", subtítulo de propuesta de valor, CTAs primario
   (Comenzar ahora) y secundario (¿Cómo funciona?). Personaje mascota a la derecha.
   Badges de confianza (Seguro, Educativo, Personalizado).
2. **Propuesta de valor / Beneficios** — 3 tarjetas: Aprende jugando, Seguimiento en
   tiempo real, Conecta seguro.
3. **Una plataforma para todos** — ilustraciones de Tutor, Profesional, Niño con sus
   descripciones.
4. **¿Cómo funciona?** — pasos numerados (3-4 pasos simples).
5. **Planes** — dos columnas: Padre/Tutor vs Profesional independiente. Lista de
   beneficios por plan. CTA "Comenzar ahora" en cada uno.
6. **CTA de cierre** — banner con personaje, frase motivadora, botón grande.
7. **Footer** — logo, links de navegación, redes sociales, legal (copyright, términos,
   privacidad).

### 2. ResourcesPage (`/recursos`) — referencia: `002_Recursos.png`

Secciones:
1. **Hero de sección** — título "Recursos para acompañar cada etapa del aprendizaje",
   subtítulo, personaje, CTA "Explorar recursos" y "Descargar guía gratuita".
2. **Tabs de categorías** — Guías para padres / Actividades y juegos / Recursos
   profesionales / Blog educativo / Videos y tutoriales / Descargas gratuitas /
   Comunidad.
3. **Barra de filtros** — Buscador + Edad + Objetivo terapéutico + Tipo de recurso.
4. **Grid de recursos por categoría** — tarjetas estáticas de muestra (datos hardcoded,
   sin backend). Mínimo 3 tarjetas por categoría visible.
5. **Descarga gratuita destacada** — card lateral con CTA de descarga (PDF de muestra).
6. **Únete a nuestra comunidad** — CTA a sección comunidad.
7. **CTA final** — "Siempre hay algo nuevo por descubrir. Comenzar ahora."

Nota: todos los recursos son datos estáticos de muestra. Sin llamadas a API.

### 3. ContactPage (`/contacto`) — referencia: `003_Contacto.png`

Secciones:
1. **Hero de sección** — "Hablemos y conectémonos", subtítulo, ilustración.
2. **Formulario de contacto** — nombre, correo, teléfono (opcional), mensaje. Submit
   con mailto placeholder (action="#"). Sin backend.
3. **Otras formas de contacto** — correo electrónico, teléfono, horario, centro de ayuda.
4. **FAQ accordion** — mínimo 5 preguntas frecuentes.
5. **CTA final** — "¿Listo para empezar?" + botón Comenzar ahora.

### 4. LoginPage (`/iniciar-sesion`) — referencia: `004_Iniciar_sesión.png`

Secciones:
1. **Split layout** — izquierda: hero motivacional con personaje y beneficios de la
   plataforma. Derecha: formulario.
2. **Formulario de login** — email + contraseña + checkbox "Recuérdame" + link
   "¿Olvidaste tu contraseña?". Botón "Iniciar sesión".
3. **OAuth** — botones Google y Apple (placeholder, sin lógica).
4. **Link a registro** — "¿No tienes cuenta? Crear una cuenta" → `/comenzar`.
5. **Sección "Al iniciar sesión puedes..."** — 4 beneficios con íconos.

Nota: el formulario NO envía datos. Es la página pública de la landing. El login real
vive en `/client`. Esta página de landing redirigirá a la app (URL configurable vía
variable de entorno `VITE_APP_URL`, default `http://localhost:5173`).

### 5. RegisterPage (`/comenzar`) — referencia: `005_Comenzar_ahora.png`

Secciones:
1. **Hero motivacional** — "Comienza hoy el camino de tu hijo", badges de confianza.
2. **Formulario de registro — Paso 1 de 4** — Selector de tipo: Padre/Tutor vs
   Profesional (tarjetas seleccionables). Campos: nombre completo, correo electrónico,
   contraseña, confirmación.
3. **OAuth** — Google, Apple, Facebook (placeholder).
4. **Social proof** — "Miles de familias ya confían en Didactifonis" con métricas
   (5.000 familias activas, 20.000 actividades disponibles, 94% satisfacción, etc.).

Nota: igual que Login, este formulario es la cara pública. La lógica real de registro
está en `/client`. El submit redirige a `VITE_APP_URL/auth/register`.

---

## Criterios de aceptación

1. Las 5 páginas renderizan sin errores en `http://localhost:4173` (preview de Vite).
2. Cada página es visualmente fiel a su referencia PNG correspondiente.
3. Cero hex sueltos — solo tokens de `design-system.md` como clases Tailwind.
4. Tipografía: Poppins en `font-heading`, Nunito Sans en `font-body`.
5. Ningún import cruzado con `/client` o `/server`.
6. Responsive: mobile-first, funcional en 375px y 1280px.
7. Sin llamadas a API externa ni lógica de auth real.
8. Footer presente en todas las páginas con copyright y links legales placeholder.
9. El agente frontend confirma revisión visual contra las referencias antes de reportar.

---

## Subtareas para el agente frontend

| Subtarea | Descripción | Archivos principales |
|:--|:--|:--|
| A | Scaffolding: init Vite+React+Tailwind, tokens, Navbar, Footer, router | `/landing/**` |
| B | HomePage completa con todas sus secciones | `src/pages/HomePage.jsx` |
| C | LoginPage + RegisterPage | `src/pages/LoginPage.jsx`, `RegisterPage.jsx` |
| D | ResourcesPage con filtros estáticos | `src/pages/ResourcesPage.jsx` |
| E | ContactPage con FAQ accordion | `src/pages/ContactPage.jsx` |

Ejecutar en orden: A → B → C → D → E.
El arquitecto revisa entre B, C-D-E.

---

## Restricciones

- No tocar `/client`, `/server`, `/shared`.
- No instalar dependencias en el `package.json` raíz del monorepo.
- Datos de recursos en `ResourcesPage` son hardcoded (arrays JS en el componente o un
  archivo `src/data/resources.js`).
- Las imágenes de personajes se referencian desde `/public/assets/` (copiar desde
  `/referencias/Personajes/` los archivos que se usen).
