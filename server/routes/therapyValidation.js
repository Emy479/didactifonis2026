/**
 * therapyValidation.js
 * Helper puro de validación para los endpoints de terapias del profesional.
 * Sin dependencias de DB ni Express: testeable con node:test sin infraestructura.
 *
 * validateTherapyFields(fields, { partial })
 *   partial=false (POST): name es obligatorio; valida campos presentes + startDate.
 *   partial=true  (PATCH): todos los campos son opcionales; solo valida los que vienen.
 *
 * Retorna { ok: true, value } o { ok: false, message }.
 * `value` contiene los campos normalizados listos para asignar al documento.
 */

const VALID_STATUSES = ['active', 'completed', 'review'];

/**
 * @param {Record<string, unknown>} fields
 * @param {{ partial: boolean }} options
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, message: string }}
 */
function validateTherapyFields(fields, { partial = false } = {}) {
  const value = {};

  // ── name ──────────────────────────────────────────────────────────────────
  if (!partial || fields.name !== undefined) {
    if (fields.name === undefined || fields.name === null) {
      return { ok: false, message: 'El nombre de la terapia es obligatorio.' };
    }
    if (typeof fields.name !== 'string') {
      return { ok: false, message: 'El nombre de la terapia debe ser texto.' };
    }
    const trimmedName = fields.name.trim();
    if (trimmedName.length === 0) {
      return { ok: false, message: 'El nombre de la terapia no puede estar vacío.' };
    }
    if (trimmedName.length > 200) {
      return { ok: false, message: 'El nombre de la terapia no puede superar 200 caracteres.' };
    }
    value.name = trimmedName;
  }

  // ── therapeuticGoal ───────────────────────────────────────────────────────
  if (fields.therapeuticGoal !== undefined) {
    if (fields.therapeuticGoal === null || fields.therapeuticGoal === '') {
      value.therapeuticGoal = null;
    } else {
      if (typeof fields.therapeuticGoal !== 'string') {
        return { ok: false, message: 'El objetivo terapéutico debe ser texto o nulo.' };
      }
      if (fields.therapeuticGoal.length > 500) {
        return { ok: false, message: 'El objetivo terapéutico no puede superar 500 caracteres.' };
      }
      value.therapeuticGoal = fields.therapeuticGoal;
    }
  }

  // ── status (solo PATCH) ───────────────────────────────────────────────────
  if (partial && fields.status !== undefined) {
    if (!VALID_STATUSES.includes(fields.status)) {
      return {
        ok: false,
        message: `El estado debe ser ${VALID_STATUSES.join(', ')}.`,
      };
    }
    value.status = fields.status;
  }

  // ── sessions (solo PATCH) ─────────────────────────────────────────────────
  if (partial && fields.sessions !== undefined) {
    const s = fields.sessions;
    if (!Number.isInteger(s) || s < 0) {
      return { ok: false, message: 'sessions debe ser un entero ≥ 0.' };
    }
    value.sessions = s;
  }

  // ── startDate (solo POST) ─────────────────────────────────────────────────
  if (!partial && fields.startDate !== undefined) {
    if (isNaN(new Date(fields.startDate))) {
      return { ok: false, message: 'startDate debe ser una fecha válida.' };
    }
    value.startDate = new Date(fields.startDate);
  }

  return { ok: true, value };
}

module.exports = { validateTherapyFields, VALID_STATUSES };
