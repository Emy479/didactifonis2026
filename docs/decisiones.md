# Decisiones de Arquitectura — Didactifonis

> Registro de las 5 decisiones pendientes de la sección 14 de la especificación funcional.
> Cerradas en sesión de entrevista con Emiliano, 2026-05-29.

---

## D1 — Acceso del niño a la plataforma

**Decisión:** Selección de perfil + PIN opcional (combinación de opciones A y B).

**Detalle:**
- El tutor inicia sesión normalmente con sus credenciales.
- Una vez autenticado, selecciona el perfil del niño desde su dashboard.
- La UI cambia al "modo niño" (entorno gamificado). La sesión JWT sigue siendo la del tutor.
- El tutor puede configurar un PIN de 4 dígitos opcional para que el niño pueda cambiar al modo niño sin requerir la contraseña del tutor. Sin PIN configurado, el cambio lo hace el tutor directamente.
- **El niño solo ejecuta.** El tutor selecciona la actividad antes de pasar al modo niño. El niño no elige qué jugar — solo ve y ejecuta lo que tiene asignado.
- Para volver al panel del tutor desde el modo niño se requiere la contraseña (o PIN del tutor, no del niño).

**Implicación técnica:** el ID del niño activo viaja como estado de la aplicación frontend, no como token JWT separado. El backend valida siempre con el JWT del tutor + childID en el body/params.

---

## D2 — Pasarela de pago y emisor de boleta electrónica

**Decisión:** Transbank / Webpay Plus como pasarela principal. Emisor DTE por definir.

**Detalle:**
- Pasarela elegida: **Transbank / Webpay Plus**. La afiliación aún no ha sido iniciada — es el trámite más burocrático y debe gestionarse con anticipación.
- El módulo de pago se construye detrás de una **interfaz genérica (adaptador)** para permitir cambio de proveedor sin reescritura de lógica de negocio.
- Emisor de boleta/factura electrónica SII (DTE): **por definir**. Opciones a evaluar: Bsale, Defontana, DTE-Chile. El módulo de facturación también será un adaptador aislado.
- En entorno de desarrollo/demo: bandera `DEMO_MODE` bypasea el pago. Esta bandera no puede activarse en producción (validada a nivel de entorno, no de código).

**Plan de construcción:**
- Fase 2A (inmediata): modelo de suscripción + periodos de prueba + middleware de bloqueo.
- Fase 2B (cuando Transbank esté afiliado): adaptador Transbank + checkout.
- Fase 2C (cuando se defina el emisor DTE): módulo de facturación electrónica.

---

## D3 — Mecanismo de vinculación tutor ↔ profesional

**Decisión:** Código/link de invitación como vía principal. Directorio de profesionales como vía secundaria. Demanda abierta postergada a v2.

**Detalle:**

**Vía principal — Código/link de invitación:**
- El profesional genera un código o link de invitación desde su panel.
- El tutor lo ingresa en su dashboard para vincularse.
- Es la vía para tutores que ya conocen a su fonoaudiólogo.
- El código tiene caducidad configurable y es de un solo uso por vínculo.

**Vía secundaria — Directorio de profesionales:**
- Listado de profesionales activos con suscripción vigente, con filtros (especialidad, zona geográfica, disponibilidad).
- El tutor envía una solicitud de vinculación. El profesional acepta o rechaza.
- Para tutores que aún no tienen profesional de seguimiento.

**Postergado a v2 — Demanda abierta:**
- El tutor publica una necesidad ("busco profesional para mi hijo, zona X") y los profesionales interesados responden.
- No entra en el MVP.

**Implicación técnica:** modelo `Link` con estado (pendiente / activo / caducado / rechazado), tokenID de invitación, timestamps, y consentimiento registrado. La mensajería tutor↔profesional se activa solo con vínculo activo.

---

## D4 — Contrato del juego: publicación y resultados

**Decisión:** Bloque fijo de campos conocidos + campo `metadata` libre. Token de sesión de un solo uso para autenticación. Emiliano define y versionea el contrato.

**Contrato de resultados (JSON que envía el juego al terminar):**

```json
{
  "version": "1.0",
  "nino_id": "<string>",
  "actividad_id": "<string>",
  "session_token": "<string — un solo uso, emitido por el backend>",
  "aprobado": true,
  "puntaje": 850,
  "intentos": 3,
  "duracion_segundos": 124,
  "timestamp": "<ISO 8601>",
  "metadata": {}
}
```

**Reglas del contrato:**
- El bloque fijo es validado por el backend. Campos faltantes o inválidos rechazan el POST.
- El campo `metadata` se almacena tal cual, sin validación estricta, como JSON libre. El backend no interpreta su contenido.
- El campo `version` es obligatorio. Permite evolución del contrato sin romper clientes antiguos.
- Los campos del bloque fijo pueden crecer en versiones futuras del contrato (versionado con changelog).

**Autenticación del envío:**
- Cuando el tutor inicia el modo niño con una actividad asignada, el backend emite un **token de sesión de actividad de un solo uso** (UUID v4, TTL configurable, almacenado en DB con estado `unused`).
- El juego recibe ese token al iniciarse y lo incluye en el POST de resultados.
- El backend lo valida: debe existir, estar en estado `unused` y no haber expirado. Si pasa la validación, lo marca `used` y registra el resultado.
- Un token usado no puede reutilizarse. Impide reenvíos falsos y falsificación de resultados.

**Contrato de publicación (ZIP subido por el Admin):**
- Estructura: `manifest.json` en la raíz + assets + punto de entrada.
- Campos del manifest: `id`, `titulo`, `version`, `categoria`, `nivel`, `edadMin`, `edadMax`, `duracionMin`, `puntoDeEntrada`.

**Dueño del contrato:** Emiliano. Cualquier cambio de versión requiere su aprobación y actualización del changelog en `/docs`.

---

## D5 — Reglas de la Comunidad (foro)

**Decisión:** todas las opciones C.

**5a — Estructura:**
Categorías fijas definidas por el Admin + etiquetas (tags) opcionales por el usuario. Las categorías son la estructura principal y son navegables. Los tags son opcionales y no crean estructura nueva.

**5b — Moderación:**
Moderación reactiva: publicación inmediata. Filtro de palabras sensibles configurable por el Admin (lista almacenada en base de datos, editable desde el panel Admin). Botón de reporte en cada post. El Admin revisa la cola de posts reportados.

**5c — Identidad:**
Nombre configurable por el usuario (puede usar su nombre real, un apodo, o solo su rol). El rol (Tutor / Profesional) es visible en cada post como indicador de confianza. La identidad real del usuario siempre queda registrada internamente para moderación y auditoría — nunca es anónima para el sistema.

**5d — Casos de menores:**
Permitido hablar de experiencias bajo reglas explícitas aceptadas al registrarse:
1. Sin nombre ni datos identificatorios del menor.
2. Sin información médica diagnóstica ni clínica.
3. El Admin puede eliminar cualquier post sin previo aviso si incumple las reglas.
El texto exacto de las normas de uso del foro debe ser revisado por el agente `didactifonis-security` antes de construir el componente de aceptación.

**Implicación técnica:** el modelo `Post` almacena `authorDisplayName` (el nombre configurable) y `authorRole` (tomado del JWT al publicar), nunca expone el `authorID` en la API pública del foro. El `authorID` solo es accesible desde endpoints de Admin para moderación.

---

## Bloqueantes externos

| Bloqueante | Fase que afecta | Acción requerida |
|---|---|---|
| Afiliación Transbank | Fase 2B | Iniciar gestiones con Transbank. Proceso burocrático — no dejarlo para último momento. |
| Emisor DTE (boleta SII) | Fase 2C | Evaluar y contratar: Bsale, Defontana, DTE-Chile u otro. |
| Contrato de resultados v1.0 | Fase 4 | Emiliano define y documenta los campos fijos antes de construir el endpoint de ingesta. |
| Ley 21.719 (vigencia 1-dic-2026) | Fase 6 | La Fase 6 no puede ir a producción sin auditoría de seguridad completa. Respetar margen de tiempo. |
