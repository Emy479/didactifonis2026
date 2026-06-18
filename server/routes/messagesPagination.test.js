/**
 * messagesPagination.test.js
 * Tests puros del helper parseMessagesPagination.
 * Sin DB: node --test server/routes/messagesPagination.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseMessagesPagination } = require('./messages');

// ── limit ────────────────────────────────────────────────────────────────────

test('limit ausente → default 50', () => {
  const { limit } = parseMessagesPagination({});
  assert.equal(limit, 50);
});

test('limit string vacío → default 50', () => {
  const { limit } = parseMessagesPagination({ limit: '' });
  assert.equal(limit, 50);
});

test('limit texto no numérico → default 50', () => {
  const { limit } = parseMessagesPagination({ limit: 'abc' });
  assert.equal(limit, 50);
});

test('limit NaN explícito → default 50', () => {
  const { limit } = parseMessagesPagination({ limit: 'NaN' });
  assert.equal(limit, 50);
});

test('limit 0 → clamp a 1', () => {
  const { limit } = parseMessagesPagination({ limit: '0' });
  assert.equal(limit, 1);
});

test('limit negativo → clamp a 1', () => {
  const { limit } = parseMessagesPagination({ limit: '-5' });
  assert.equal(limit, 1);
});

test('limit 1 → 1 (mínimo válido)', () => {
  const { limit } = parseMessagesPagination({ limit: '1' });
  assert.equal(limit, 1);
});

test('limit 50 → 50 (dentro del rango)', () => {
  const { limit } = parseMessagesPagination({ limit: '50' });
  assert.equal(limit, 50);
});

test('limit 100 → 100 (máximo válido)', () => {
  const { limit } = parseMessagesPagination({ limit: '100' });
  assert.equal(limit, 100);
});

test('limit 101 → clamp a 100', () => {
  const { limit } = parseMessagesPagination({ limit: '101' });
  assert.equal(limit, 100);
});

test('limit 999 → clamp a 100', () => {
  const { limit } = parseMessagesPagination({ limit: '999' });
  assert.equal(limit, 100);
});

// ── before ───────────────────────────────────────────────────────────────────

test('before ausente → null', () => {
  const { before } = parseMessagesPagination({});
  assert.equal(before, null);
});

test('before string vacío → null', () => {
  const { before } = parseMessagesPagination({ before: '' });
  assert.equal(before, null);
});

test('before ISO válido → instancia Date correcta', () => {
  const iso = '2026-06-17T12:00:00.000Z';
  const { before } = parseMessagesPagination({ before: iso });
  assert.ok(before instanceof Date, 'debe ser Date');
  assert.equal(before.toISOString(), iso);
});

test('before ISO con solo fecha → Date válido', () => {
  const { before } = parseMessagesPagination({ before: '2026-01-01' });
  assert.ok(before instanceof Date);
  assert.ok(!isNaN(before.getTime()));
});

test('before inválido "notadate" → null (se ignora)', () => {
  const { before } = parseMessagesPagination({ before: 'notadate' });
  assert.equal(before, null);
});

test('before inválido número suelto → null (se ignora)', () => {
  const { before } = parseMessagesPagination({ before: '12345xyz' });
  assert.equal(before, null);
});

// ── combinaciones ────────────────────────────────────────────────────────────

test('limit y before válidos juntos → ambos parseados', () => {
  const iso = '2026-06-10T08:00:00.000Z';
  const { limit, before } = parseMessagesPagination({ limit: '25', before: iso });
  assert.equal(limit, 25);
  assert.ok(before instanceof Date);
  assert.equal(before.toISOString(), iso);
});

test('limit inválido + before válido → limit default, before parseado', () => {
  const iso = '2026-06-10T08:00:00.000Z';
  const { limit, before } = parseMessagesPagination({ limit: 'bad', before: iso });
  assert.equal(limit, 50);
  assert.ok(before instanceof Date);
});
