# Marco Legal — Didactifonis (FUENTE AUTORITATIVA)

> **Estatus.** Este documento es un **informe de abogado real**, no un borrador. Es la
> fuente autoritativa en materia legal/regulatoria del proyecto. El agente
> `didactifonis-security` debe referenciarlo en cada auditoría.
>
> **Plan de asesoría legal (tres hitos):**
> 1. **Diseño** (este informe) — define cómo se construye la plataforma desde el inicio.
> 2. **Marcha blanca** — segunda asesoría una vez implementado y testeado, antes de abrir
>    a usuarios reales, para validar la implementación contra lo diseñado.
> 3. **Diciembre 2026** — tercera asesoría al entrar en vigencia plena la Ley 21.719,
>    para alinear con los cambios definitivos y notificar a usuarios si la plataforma ya
>    está en uso.
>
> Ningún agente de IA modifica las conclusiones de este documento ni resuelve dudas
> legales por su cuenta: aplica lo que aquí se indica y eleva lo demás al equipo humano.

---

# Informe Jurídico y Regulatorio — Didactifonis
## Protección de Datos, Datos Sensibles y Riesgo Clínico
### Marco Legal Chileno — Ley 19.628 / Ley 21.719 / Ley 20.584

> **Fecha:** Mayo 2026
> **Naturaleza del documento:** Análisis jurídico-técnico de asesoría legal.

---

## 1. Resumen Ejecutivo

Didactifonis, bajo el modelo funcional descrito, probablemente **NO califica como
software médico regulado estricto (SaMD)**, PERO sí trata datos sensibles, datos de salud
infantil, información terapéutica y potencialmente antecedentes clínicos complementarios.

Debe considerarse como una plataforma SaaS terapéutica infantil, con tratamiento de datos
sensibles y potencial integración funcional a procesos clínicos reales. Recomendación:
diseñar desde ya bajo estándares cercanos a Ley 21.719, principios GDPR, privacy by
design, gobernanza de datos, trazabilidad y seguridad reforzada.

## 2. Marco Normativo Aplicable

- **Ley 19.628 (actual)**: tratamiento de datos personales, datos sensibles,
  consentimiento, acceso y eliminación.
- **Ley 21.719 (reforma)**: vigencia plena el **1 de diciembre de 2026**. Introduce la
  Agencia de Protección de Datos, principio de responsabilidad activa, mayores sanciones,
  mayores obligaciones de seguridad, regulación reforzada de datos sensibles y derechos
  ampliados de titulares.
- **Ley 20.584**: derechos y deberes en atención de salud, ficha clínica,
  confidencialidad clínica, acceso y resguardo de antecedentes médicos.

## 3. Naturaleza de los Datos Tratados

**Datos sensibles y de salud.** Didactifonis registra o podría registrar: progreso
terapéutico, evolución fonológica, pronunciación, objetivos terapéuticos, desempeño
funcional, adherencia terapéutica, observaciones profesionales, tiempo de uso y métricas
de evolución. Esto probablemente constituye dato personal sensible y específicamente dato
relativo a salud/desarrollo.

**Datos inferidos.** Aunque la plataforma no diagnostique, las métricas pueden revelar
progreso terapéutico, dificultades funcionales, evolución clínica o desempeño cognitivo o
lingüístico. Incluso métricas gamificadas pueden transformarse jurídicamente en datos
sensibles inferidos.

## 4. ¿Didactifonis es una Ficha Clínica?

**Escenario base.** Si la plataforma NO diagnostica, NO prescribe, NO reemplaza atención
profesional y NO entrega decisiones clínicas automatizadas, existe argumento razonable
para sostener que **NO constituye por sí misma una ficha clínica oficial completa**.

**Escenario profesional.** Si un fonoaudiólogo la usa con pacientes reales y registra
evolución, observaciones, enfoques terapéuticos, progreso y notas clínicas, la plataforma
puede transformarse funcionalmente en soporte clínico digital, antecedente clínico
complementario y repositorio terapéutico auxiliar.

**Consecuencia práctica.** En dicho escenario el profesional sigue siendo responsable
principal frente al paciente, pero Didactifonis pasa a operar como encargado de
tratamiento, proveedor tecnológico clínico e infraestructura de almacenamiento sensible.

## 5. Riesgo de Calificación como Producto Médico

Actualmente Didactifonis probablemente NO califica como dispositivo médico software /
SaMD, porque no emite diagnósticos, no prescribe, no clasifica patologías, no reemplaza
evaluación clínica y no genera decisiones terapéuticas automáticas.

**Riesgos futuros.** Podría acercarse a regulación médica si incorpora: IA diagnóstica,
scoring clínico, clasificación automática, recomendaciones terapéuticas automáticas,
análisis automático de trastornos o evaluación clínica automatizada.

## 6. Consentimiento y Menores

El consentimiento otorgado por padre, madre o tutor legal es jurídicamente válido para
menores. Debe ser **expreso, informado, verificable, específico y revocable**.

**Registrar:** fecha, IP, versión del consentimiento e identidad del tutor.

**Consentimiento compartido tutor-profesional.** Debe indicar claramente quién accede,
qué datos verá, finalidad, duración del acceso y mecanismo de revocación.

**Revocación.** Simple, inmediata y accesible desde la plataforma.

## 7. Registro Profesional y Responsabilidad

Didactifonis NO valida formalmente el registro profesional. Por ello el
consentimiento/contrato del profesional debe establecer que: la información entregada es
verídica, el profesional es responsable de su habilitación, la plataforma no valida
registros profesionales actualmente, es una herramienta de apoyo, y las decisiones
clínicas corresponden exclusivamente al profesional.

## 8. Conservación y Eliminación de Datos

Mantener registros terapéuticos: mínimo 5 años, idealmente 10, desde la última
interacción terapéutica. Debe existir derecho de eliminación, anonimización, borrado
seguro y separación de backups.

## 9. Seguridad Obligatoria

**Técnicas:** HTTPS, cifrado en tránsito, cifrado en reposo, control de acceso, backups,
logs, autenticación segura, segregación de ambientes.

**Organizacionales:** políticas internas, confidencialidad, acceso mínimo necesario,
trazabilidad, control de desarrolladores.

## 10. Arquitectura Recomendada — Separación en dos capas

- **CAPA 1 — Plataforma educativa terapéutica:** juegos, actividades, niveles, métricas,
  progreso gamificado.
- **CAPA 2 — Registro clínico profesional:** notas del profesional, evolución, objetivos
  terapéuticos, observaciones clínicas, seguimiento profesional. Debe tener mayor
  seguridad, logs reforzados, acceso restringido, consentimiento especial, exportación y
  trazabilidad.

## 11. Estándar Recomendado: GDPR-Inspired

Diseñar alineado con Ley 21.719, principios GDPR y privacy by design.

**Alta prioridad:** consentimiento versionado, data minimization, logs de acceso,
separación de datos, role based access, derecho de eliminación, privacy by design.

**No urgente inicialmente:** certificaciones ISO, DPO full-time, compliance corporativo
avanzado.

## 12. Transferencia Internacional y Cloud

Si los datos se almacenan fuera de Chile, debe existir contrato con el proveedor cloud,
garantías de seguridad, cláusulas de protección e información clara al usuario.
Recomendación técnica: AWS / Azure / GCP con estándares enterprise, cifrado completo,
anonimización de analytics y separación de ambientes.

## 13. Pagos y Facturación

Datos tratados: nombre, RUT, correo, historial de pagos. Recomendaciones: no almacenar
tarjetas, usar tokenización, separar datos financieros de los terapéuticos e informar
sobre terceros involucrados.

## 14. Disclaimer Recomendado

Debe indicar que la plataforma es una herramienta de apoyo, no reemplaza evaluación
profesional, no constituye diagnóstico médico, las decisiones clínicas corresponden al
profesional, y ante dudas debe consultarse a un especialista.

## 15. Obligaciones Previas a Diciembre 2026 (prioridad alta)

Política de privacidad actualizada, consentimiento robusto, control de accesos, sistema
de eliminación, gestión de incidentes, contratos cloud, logs, clasificación de datos,
gobernanza mínima y mecanismos de revocación.

## 16. Conclusión General

Didactifonis encaja mejor como plataforma terapéutica digital infantil / herramienta
educativa de apoyo / SaaS complementario al trabajo profesional. Pero trata datos
sensibles, maneja información terapéutica, registra métricas evolutivas y puede integrarse
a procesos clínicos reales. Por ello conviene operar bajo estándar reforzado desde el
inicio. La estrategia correcta no es evitar el marco clínico, sino: limitar el alcance del
producto, separar funciones educativas y clínicas, proteger datos sensibles, mantener
consentimiento robusto, operar con privacy by design y alinearse tempranamente con
estándares GDPR / 21.719.
