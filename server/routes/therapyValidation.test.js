/**
 * therapyValidation.test.js
 * Tests puros del helper validateTherapyFields.
 * Corre sin DB: node --test server/routes/therapyValidation.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateTherapyFields } = require('./therapyValidation');

// ── Helpers ────────────────────────────────────────────────────────────────
function post(fields) {
  return validateTherapyFields(fields, { partial: false });
}
function patch(fields) {
  return validateTherapyFields(fields, { partial: true });
}

// ── POST válido ────────────────────────────────────────────────────────────
test('POST válido — solo name → ok', () => {
  const r = post({ name: 'Terapia fonológica' });
  assert.equal(r.ok, true);
  assert.equal(r.value.name, 'Terapia fonológica');
});

test('POST válido — name + opcionales → ok con todos los campos', () => {
  const r = post({
    name: 'Terapia articulatoria',
    therapeuticGoal: 'Mejorar /r/ vibrante',
    startDate: '2026-07-01',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.name, 'Terapia articulatoria');
  assert.equal(r.value.therapeuticGoal, 'Mejorar /r/ vibrante');
  assert.ok(r.value.startDate instanceof Date);
});

// ── POST sin name ──────────────────────────────────────────────────────────
test('POST sin name → error', () => {
  const r = post({ therapeuticGoal: 'algo' });
  assert.equal(r.ok, false);
  assert.ok(r.message.length > 0);
  assert.match(r.message, /name|nombre/i);
});

test('POST name = null → error', () => {
  const r = post({ name: null });
  assert.equal(r.ok, false);
});

// ── name > 200 chars ───────────────────────────────────────────────────────
test('POST name de 201 chars → error', () => {
  const r = post({ name: 'a'.repeat(201) });
  assert.equal(r.ok, false);
  assert.match(r.message, /200/);
});

test('POST name de exactamente 200 chars → ok', () => {
  const r = post({ name: 'a'.repeat(200) });
  assert.equal(r.ok, true);
});

// ── name vacío / solo whitespace ───────────────────────────────────────────
test('POST name vacío → error', () => {
  const r = post({ name: '' });
  assert.equal(r.ok, false);
});

test('POST name solo espacios → error', () => {
  const r = post({ name: '   ' });
  assert.equal(r.ok, false);
});

test('POST name con espacios alrededor → ok, trim aplicado', () => {
  const r = post({ name: '  Terapia  ' });
  assert.equal(r.ok, true);
  assert.equal(r.value.name, 'Terapia');
});

// ── therapeuticGoal > 500 ──────────────────────────────────────────────────
test('POST therapeuticGoal de 501 chars → error', () => {
  const r = post({ name: 'x', therapeuticGoal: 'a'.repeat(501) });
  assert.equal(r.ok, false);
  assert.match(r.message, /500/);
});

test('POST therapeuticGoal de 500 chars → ok', () => {
  const r = post({ name: 'x', therapeuticGoal: 'a'.repeat(500) });
  assert.equal(r.ok, true);
});

// ── therapeuticGoal null / '' → normaliza a null ───────────────────────────
test("POST therapeuticGoal = null → ok, value.therapeuticGoal = null", () => {
  const r = post({ name: 'x', therapeuticGoal: null });
  assert.equal(r.ok, true);
  assert.equal(r.value.therapeuticGoal, null);
});

test("POST therapeuticGoal = '' → ok, value.therapeuticGoal = null", () => {
  const r = post({ name: 'x', therapeuticGoal: '' });
  assert.equal(r.ok, true);
  assert.equal(r.value.therapeuticGoal, null);
});

// ── PATCH status inválido ──────────────────────────────────────────────────
test("PATCH status = 'pendiente' → error", () => {
  const r = patch({ status: 'pendiente' });
  assert.equal(r.ok, false);
  assert.match(r.message, /active.*completed.*review|estado/i);
});

test("PATCH status = '' → error", () => {
  const r = patch({ status: '' });
  assert.equal(r.ok, false);
});

// ── PATCH status válido ────────────────────────────────────────────────────
test("PATCH status = 'active' → ok", () => {
  const r = patch({ status: 'active' });
  assert.equal(r.ok, true);
  assert.equal(r.value.status, 'active');
});

test("PATCH status = 'completed' → ok", () => {
  const r = patch({ status: 'completed' });
  assert.equal(r.ok, true);
});

test("PATCH status = 'review' → ok", () => {
  const r = patch({ status: 'review' });
  assert.equal(r.ok, true);
});

// ── PATCH sessions inválido ────────────────────────────────────────────────
test("PATCH sessions = 'abc' → error", () => {
  const r = patch({ sessions: 'abc' });
  assert.equal(r.ok, false);
  assert.match(r.message, /entero/i);
});

test('PATCH sessions = -1 → error', () => {
  const r = patch({ sessions: -1 });
  assert.equal(r.ok, false);
});

test('PATCH sessions = 1.5 → error (decimal)', () => {
  const r = patch({ sessions: 1.5 });
  assert.equal(r.ok, false);
});

test('PATCH sessions = NaN → error', () => {
  const r = patch({ sessions: NaN });
  assert.equal(r.ok, false);
});

// ── PATCH sessions válido ──────────────────────────────────────────────────
test('PATCH sessions = 0 → ok', () => {
  const r = patch({ sessions: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.value.sessions, 0);
});

test('PATCH sessions = 5 → ok', () => {
  const r = patch({ sessions: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.value.sessions, 5);
});

// ── PATCH sin ningún campo → no-op válido ─────────────────────────────────
test('PATCH sin campos → ok (no-op, value vacío)', () => {
  const r = patch({});
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {});
});

// ── startDate (solo POST) ─────────────────────────────────────────────────
test('POST startDate inválida → error', () => {
  const r = post({ name: 'x', startDate: 'no-es-fecha' });
  assert.equal(r.ok, false);
  assert.match(r.message, /fecha/i);
});

test('POST startDate válida ISO → ok', () => {
  const r = post({ name: 'x', startDate: '2026-08-15' });
  assert.equal(r.ok, true);
  assert.ok(r.value.startDate instanceof Date);
});

test('POST startDate válida timestamp → ok', () => {
  const r = post({ name: 'x', startDate: new Date().toISOString() });
  assert.equal(r.ok, true);
  assert.ok(r.value.startDate instanceof Date);
});

// ── startDate en PATCH es ignorada (no entra en value) ─────────────────────
test('PATCH con startDate inválida → ok (campo ignorado en partial)', () => {
  const r = patch({ startDate: 'basura' });
  assert.equal(r.ok, true);
  assert.equal(r.value.startDate, undefined);
});

// ── POST ignora status y sessions (Important fix) ─────────────────────────
test('POST con status inválido → ok (status ignorado en modo POST)', () => {
  const r = post({ name: 'x', status: 'pendiente' });
  assert.equal(r.ok, true);
  assert.equal(r.value.status, undefined);
});

test('POST con status válido → ok pero status NO aparece en value', () => {
  const r = post({ name: 'x', status: 'active' });
  assert.equal(r.ok, true);
  assert.equal(r.value.status, undefined);
});

test('POST con sessions inválidas → ok (sessions ignorado en modo POST)', () => {
  const r = post({ name: 'x', sessions: -1 });
  assert.equal(r.ok, true);
  assert.equal(r.value.sessions, undefined);
});

test('POST con sessions válidas → ok pero sessions NO aparece en value', () => {
  const r = post({ name: 'x', sessions: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.value.sessions, undefined);
});

// ── PATCH sigue validando status y sessions (regresión) ───────────────────
test('PATCH status inválido sigue fallando con partial:true', () => {
  const r = patch({ status: 'desconocido' });
  assert.equal(r.ok, false);
  assert.match(r.message, /estado/i);
});

test('PATCH sessions inválidas siguen fallando con partial:true', () => {
  const r = patch({ sessions: -5 });
  assert.equal(r.ok, false);
  assert.match(r.message, /entero/i);
});
