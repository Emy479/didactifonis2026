# Seguridad — Auditoría de carga de bundle de juego

**Fecha:** 2026-06-17 · **Rama:** `feature/upload-bundle-juego` · **Auditor:** `didactifonis-security`
**Superficie:** entrada NO confiable (ZIP subido por Admin) extraída, almacenada y servida a menores. Marco: Ley 21.719.

## Veredicto global

**APTO CON OBSERVACIONES.** Sin incumplimiento legal crítico ni exposición directa de datos de menores: la minimización de PII hacia el iframe se respeta y no se introduce IA diagnóstica (frontera SaMD intacta). Conteo: **0 Críticos · 2 Altos · 4 Medios · 5 Bajos.**

## Hallazgos Altos

### A1 — Aislamiento del bundle servido co-origen con la API
El bundle (HTML/JS arbitrario del Admin) se sirve desde el MISMO origen que la API (`LocalDiskStorage.js` usa `API_BASE_URL`; `/games` montado en el mismo Express, `server/index.js`). El único muro es el `sandbox` sin `allow-same-origin` del iframe (`GameHost.jsx`). Si el `bundleUrl` (público y predecible) se abre fuera del iframe o se relaja el sandbox, el JS del bundle quedaría same-origin con la API.
**Nota del arquitecto:** es la consecuencia de la decisión **Enfoque A** (servir co-origen) tomada en el brainstorming, con migración a Enfoque B (subdominio aparte) ya prevista como trabajo futuro en el spec §10. Mitigante presente: el token del tutor vive en `localStorage` del origen del CLIENTE (5173), no del origen de la API (3001), y la API autentica por Bearer (sin cookies de autoridad ambiental), por lo que la explotabilidad inmediata es limitada. **Decisión de Emiliano:** aceptar como deuda conocida de Enfoque A, o adelantar Enfoque B / endurecer.
**Recomendación:** a mediano plazo, servir bundles desde origen/subdominio separado sin cookies.

### A2 — CSP de `/games` permisiva
La CSP de `/games` usa `frame-ancestors *` (cualquier sitio puede embeber los bundles) y `unsafe-inline`/`unsafe-eval`.
**Nota del arquitecto:** los valores vienen del plan/spec. `frame-ancestors *` se puso para permitir el iframe del GameHost desde otro origen, pero `*` es más amplio de lo necesario (se puede acotar al origen del cliente). `unsafe-inline`/`unsafe-eval` los necesitan motores de juego (Phaser), más difíciles de quitar.
**Recomendación (fix barato):** restringir `frame-ancestors` al origen del cliente.

## Hallazgos Medios

- **M1 — Entradas de DIRECTORIO no cuentan contra `maxFiles`** (`bundleArchive.js`): el guard de zip-bomb cuenta archivos pero no entradas de directorio; un ZIP con miles de directorios vacíos evade el tope. *Fix:* contar también las entradas de directorio.
- **M2 — Backups `.old-<ts>` servibles y potencialmente huérfanos** (`LocalDiskStorage.js`): el backup del swap se nombra `<activityId>.old-<ts>` como hermano DENTRO del root servido; NO empieza por punto, así que `dotfiles:'deny'` NO lo oculta → es servible vía `/games/<id>.old-<ts>/...` y puede quedar huérfano si el swap falla a medias. *Fix:* nombrar el backup con punto inicial (`.old-...`) o ubicarlo fuera del root servido, y limpiarlo.
- **M3 — Falta barrido (sweep) de huérfanos** ante errores que dejen `.tmp-*`/carpetas a medias.
- **M4 — Falta rate-limit dedicado para el endpoint de upload** (mitiga DoS por subidas repetidas).

## Hallazgos Bajos
5 observaciones de robustez/endurecimiento (defensa en profundidad), no bloqueantes. Ver detalle en la sesión de auditoría.

## Lista priorizada antes del merge

1. **A2 (barato):** acotar `frame-ancestors` al origen del cliente.
2. **M1:** contar entradas de directorio en el tope de archivos.
3. **M2:** backups de swap con punto inicial o fuera del root servido + limpieza.
4. **A1:** decisión de Emiliano — aceptar Enfoque A como deuda (documentada) o adelantar endurecimiento.
5. **M3/M4:** sweep de huérfanos + rate-limit de upload (pueden ir en una pasada de endurecimiento posterior).
