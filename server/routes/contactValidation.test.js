/**
 * contactValidation.test.js
 * Tests puros del helper de validación de contacto.
 * Corre sin DB ni Express: node --test server/routes/contactValidation.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateContactFields, isHoneypotTriggered, MOTIVOS_VALIDOS } = require('./contactValidation');

// ── Helpers ────────────────────────────────────────────────────────────────
function valid(overrides = {}) {
  return {
    nombre: 'Ana García',
    email: 'ana@example.com',
    motivo: 'saber-mas',
    mensaje: 'Hola, quiero más información.',
    ...overrides,
  };
}

// ── Body inválido ──────────────────────────────────────────────────────────
test('body null → error', () => {
  const r = validateContactFields(null);
  assert.equal(r.ok, false);
});

test('body array → error', () => {
  const r = validateContactFields([]);
  assert.equal(r.ok, false);
});

test('body string → error', () => {
  const r = validateContactFields('hola');
  assert.equal(r.ok, false);
});

// ── nombre ─────────────────────────────────────────────────────────────────
test('nombre faltante → error', () => {
  const r = validateContactFields(valid({ nombre: undefined }));
  assert.equal(r.ok, false);
  assert.match(r.message, /nombre/i);
});

test('nombre nulo → error', () => {
  const r = validateContactFields(valid({ nombre: null }));
  assert.equal(r.ok, false);
});

test('nombre vacío → error', () => {
  const r = validateContactFields(valid({ nombre: '' }));
  assert.equal(r.ok, false);
});

test('nombre solo espacios → error', () => {
  const r = validateContactFields(valid({ nombre: '   ' }));
  assert.equal(r.ok, false);
});

test('nombre con espacios alrededor → ok, trim aplicado', () => {
  const r = validateContactFields(valid({ nombre: '  Ana  ' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.nombre, 'Ana');
});

test('nombre de 120 chars → ok', () => {
  const r = validateContactFields(valid({ nombre: 'a'.repeat(120) }));
  assert.equal(r.ok, true);
});

test('nombre de 121 chars → error', () => {
  const r = validateContactFields(valid({ nombre: 'a'.repeat(121) }));
  assert.equal(r.ok, false);
  assert.match(r.message, /120/);
});

test('nombre no-string (número) → error', () => {
  const r = validateContactFields(valid({ nombre: 42 }));
  assert.equal(r.ok, false);
});

// ── email ──────────────────────────────────────────────────────────────────
test('email faltante → error', () => {
  const r = validateContactFields(valid({ email: undefined }));
  assert.equal(r.ok, false);
  assert.match(r.message, /email/i);
});

test('email sin @ → error', () => {
  const r = validateContactFields(valid({ email: 'no-arroba' }));
  assert.equal(r.ok, false);
});

test('email sin dominio → error', () => {
  const r = validateContactFields(valid({ email: 'user@' }));
  assert.equal(r.ok, false);
});

test('email válido con subdominio → ok', () => {
  const r = validateContactFields(valid({ email: 'user@mail.example.com' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'user@mail.example.com');
});

test('email de 160 chars → ok', () => {
  // nombre@dominio.com donde nombre = 'a'.repeat(148), total = 160 con @x.co
  const local = 'a'.repeat(153);
  const email = `${local}@b.co`; // 153 + 1 + 4 = 158, ok <= 160
  const r = validateContactFields(valid({ email }));
  assert.equal(r.ok, true);
});

test('email de 161 chars → error', () => {
  const local = 'a'.repeat(154);
  const email = `${local}@b.co`; // 154 + 1 + 4 = 159... ajuste para 161
  const emailLong = 'a'.repeat(155) + '@b.co'; // 155+5 = 160 — agregar un char
  // Construir exactamente 161 chars
  const e = 'a'.repeat(155) + '@bb.co'; // 155+6=161
  const r = validateContactFields(valid({ email: e }));
  assert.equal(r.ok, false);
  assert.match(r.message, /160/);
});

test('email con espacios es normalizado y válido', () => {
  const r = validateContactFields(valid({ email: '  ana@example.com  ' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'ana@example.com');
});

// ── motivo ─────────────────────────────────────────────────────────────────
test('motivo faltante → error', () => {
  const r = validateContactFields(valid({ motivo: undefined }));
  assert.equal(r.ok, false);
  assert.match(r.message, /motivo/i);
});

test('motivo fuera del enum → error', () => {
  const r = validateContactFields(valid({ motivo: 'desconocido' }));
  assert.equal(r.ok, false);
});

test('motivo vacío → error', () => {
  const r = validateContactFields(valid({ motivo: '' }));
  assert.equal(r.ok, false);
});

for (const m of MOTIVOS_VALIDOS) {
  test(`motivo '${m}' → ok`, () => {
    const r = validateContactFields(valid({ motivo: m }));
    assert.equal(r.ok, true);
    assert.equal(r.value.motivo, m);
  });
}

// ── mensaje ────────────────────────────────────────────────────────────────
test('mensaje faltante → error', () => {
  const r = validateContactFields(valid({ mensaje: undefined }));
  assert.equal(r.ok, false);
  assert.match(r.message, /mensaje/i);
});

test('mensaje vacío → error', () => {
  const r = validateContactFields(valid({ mensaje: '' }));
  assert.equal(r.ok, false);
});

test('mensaje solo espacios → error', () => {
  const r = validateContactFields(valid({ mensaje: '   ' }));
  assert.equal(r.ok, false);
});

test('mensaje de 2000 chars → ok', () => {
  const r = validateContactFields(valid({ mensaje: 'a'.repeat(2000) }));
  assert.equal(r.ok, true);
});

test('mensaje de 2001 chars → error', () => {
  const r = validateContactFields(valid({ mensaje: 'a'.repeat(2001) }));
  assert.equal(r.ok, false);
  assert.match(r.message, /2000/);
});

test('mensaje con espacios alrededor → ok, trim aplicado', () => {
  const r = validateContactFields(valid({ mensaje: '  hola  ' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.mensaje, 'hola');
});

// ── campos extra en body son ignorados ────────────────────────────────────
test('campo extra en body → ok, no aparece en value', () => {
  const r = validateContactFields({ ...valid(), extraField: 'inyeccion' });
  assert.equal(r.ok, true);
  assert.equal(r.value.extraField, undefined);
});

// ── body válido completo ───────────────────────────────────────────────────
test('body válido → ok con todos los campos normalizados', () => {
  const r = validateContactFields({
    nombre: '  María José  ',
    email: '  mj@test.cl  ',
    motivo: 'fonoaudiologo',
    mensaje: '  Consulta sobre licencias.  ',
    website: '',  // honeypot vacío no altera validación
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.nombre, 'María José');
  assert.equal(r.value.email, 'mj@test.cl');
  assert.equal(r.value.motivo, 'fonoaudiologo');
  assert.equal(r.value.mensaje, 'Consulta sobre licencias.');
});

// ── isHoneypotTriggered ────────────────────────────────────────────────────
test('honeypot ausente → false', () => {
  assert.equal(isHoneypotTriggered({}), false);
});

test('honeypot vacío → false', () => {
  assert.equal(isHoneypotTriggered({ website: '' }), false);
});

test('honeypot solo espacios → false', () => {
  assert.equal(isHoneypotTriggered({ website: '   ' }), false);
});

test('honeypot con valor → true', () => {
  assert.equal(isHoneypotTriggered({ website: 'http://spam.com' }), true);
});

test('honeypot con cualquier texto → true', () => {
  assert.equal(isHoneypotTriggered({ website: 'x' }), true);
});

test('isHoneypotTriggered con body null → false', () => {
  assert.equal(isHoneypotTriggered(null), false);
});
