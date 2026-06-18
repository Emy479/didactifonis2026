/**
 * authRefresh.test.js
 *
 * Tests del sistema B3 de refresh tokens.
 *
 * Cobertura:
 *   - Helpers puros (parseMs, hashToken, generateSecret): sin DB, sin Express.
 *   - Controladores (refresh, logout) con mocks manuales de modelos y objetos
 *     req/res de Express. Sin conexión a MongoDB.
 *
 * Ejecutar de forma aislada:
 *   node --test server/controllers/authRefresh.test.js
 *
 * O como parte del suite completo:
 *   node --test
 */

'use strict';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// ── 1. Tests de helpers puros ─────────────────────────────────────────────────

const { parseMs, hashToken, generateSecret } = require('./authRefreshHelpers');

describe('parseMs', () => {
  test('convierte segundos correctamente', () => {
    assert.equal(parseMs('30s'), 30_000);
  });

  test('convierte minutos correctamente', () => {
    assert.equal(parseMs('15m'), 15 * 60_000);
  });

  test('convierte horas correctamente', () => {
    assert.equal(parseMs('2h'), 2 * 3_600_000);
  });

  test('convierte días correctamente', () => {
    assert.equal(parseMs('14d'), 14 * 86_400_000);
  });

  test('lanza Error para formato inválido', () => {
    assert.throws(() => parseMs('7days'), /TTL inválido/);
  });

  test('lanza Error para string vacío', () => {
    assert.throws(() => parseMs(''), /TTL inválido/);
  });

  test('lanza Error para unidad desconocida', () => {
    assert.throws(() => parseMs('10w'), /TTL inválido/);
  });
});

describe('hashToken', () => {
  test('produce un string hex de 64 caracteres (SHA-256)', () => {
    const h = hashToken('algún-secreto-de-prueba');
    assert.match(h, /^[0-9a-f]{64}$/);
  });

  test('es determinista: mismo input → mismo hash', () => {
    const secret = 'secreto-consistente';
    assert.equal(hashToken(secret), hashToken(secret));
  });

  test('hashes distintos para inputs distintos', () => {
    assert.notEqual(hashToken('a'), hashToken('b'));
  });

  test('coincide con crypto.createHash directo', () => {
    const secret = 'verificación-cruzada';
    const expected = crypto.createHash('sha256').update(secret).digest('hex');
    assert.equal(hashToken(secret), expected);
  });
});

describe('generateSecret', () => {
  test('produce un string hex de 64 caracteres (32 bytes)', () => {
    const s = generateSecret();
    assert.match(s, /^[0-9a-f]{64}$/);
  });

  test('dos llamadas producen secretos distintos', () => {
    assert.notEqual(generateSecret(), generateSecret());
  });
});

// ── 2. Tests de controladores con mocks manuales ─────────────────────────────
//
// Estrategia: inyectamos el módulo del controlador DESPUÉS de sobrescribir en la
// caché de require los módulos que hacen I/O (User, RefreshToken, jsonwebtoken).
// Esto evita abrir conexión real a MongoDB.
//
// Se usa Module._cache (API interna de Node) para reemplazar módulos antes del
// primer require del controlador. Es el patrón más directo para node:test puro
// sin librerías externas de mocking.

const Module = require('module');

// Helpers para construir req/res mínimos de Express
function makeReq(overrides = {}) {
  return {
    cookies: {},
    ip: '127.0.0.1',
    get: (header) => (header === 'user-agent' ? 'test-agent/1.0' : null),
    body: {},
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    _cookies: {},
    _clearedCookies: [],
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    send() { return this; },
    cookie(name, value, opts) {
      this._cookies[name] = { value, opts };
      return this;
    },
    clearCookie(name, opts) {
      this._clearedCookies.push({ name, opts });
      return this;
    },
  };
  return res;
}

// Resuelve las rutas absolutas de los módulos que vamos a mockear
const path = require('path');
const controllerDir = path.join(__dirname);

function resolveMod(relPath) {
  // Resolvemos desde el directorio del controlador
  return require.resolve(path.join(controllerDir, relPath));
}

// Rutas reales de los módulos a mockear
const USER_MOD    = require.resolve(path.join(__dirname, '../models/User'));
const RT_MOD      = require.resolve(path.join(__dirname, '../models/RefreshToken'));
const JWT_MOD     = require.resolve('jsonwebtoken');
const CTRL_MOD    = require.resolve(path.join(__dirname, './authController'));
const HELPERS_MOD = require.resolve(path.join(__dirname, './authRefreshHelpers'));

// Carga el controlador con mocks inyectados en la caché de require
function loadControllerWithMocks({ userMock, refreshTokenMock, jwtMock } = {}) {
  // Limpia los módulos que queremos reemplazar
  delete Module._cache[CTRL_MOD];

  // Inyecta mocks en caché
  if (userMock) {
    Module._cache[USER_MOD] = { id: USER_MOD, filename: USER_MOD, loaded: true, exports: userMock };
  }
  if (refreshTokenMock) {
    Module._cache[RT_MOD] = { id: RT_MOD, filename: RT_MOD, loaded: true, exports: refreshTokenMock };
  }
  if (jwtMock) {
    Module._cache[JWT_MOD] = { id: JWT_MOD, filename: JWT_MOD, loaded: true, exports: jwtMock };
  }

  // Carga el controlador fresco (con los mocks ya en caché)
  const ctrl = require(CTRL_MOD);

  // Restaura los módulos reales después de cargar
  delete Module._cache[CTRL_MOD];
  if (userMock) delete Module._cache[USER_MOD];
  if (refreshTokenMock) delete Module._cache[RT_MOD];
  if (jwtMock) delete Module._cache[JWT_MOD];

  return ctrl;
}

// ── Utilidades de test ────────────────────────────────────────────────────────

// Construye un documento RefreshToken mínimo válido
function makeTokenDoc({ revoked = false, familyId = 'fam-001' } = {}) {
  const futureDate = new Date(Date.now() + 14 * 86_400_000);
  return {
    _id: 'doc-id-001',
    userId: 'user-id-001',
    familyId,
    tokenHash: '',        // se completa en cada test
    revoked,
    expiresAt: futureDate,
    revokedAt: null,
    replacedBy: null,
  };
}

// Usuario mínimo activo
const MOCK_USER = {
  _id: 'user-id-001',
  role: 'tutor',
  name: 'Test User',
  email: 'test@example.com',
  subscription: { status: 'trial' },
  isActive: true,
  hasActiveAccess: () => true,
};

// ── Test 2.1: POST /api/auth/refresh — token válido → rota, emite accessToken ──

describe('POST /auth/refresh — token válido', () => {
  test('devuelve 200 con accessToken y setea nueva cookie', async () => {
    // Generamos un secreto real para que hashToken coincida
    const secret = generateSecret();
    const tHash = hashToken(secret);

    const tokenDoc = { ...makeTokenDoc(), tokenHash: tHash };

    // Mocks
    const rtMock = {
      findOne: async ({ tokenHash }) => tokenHash === tHash ? { ...tokenDoc } : null,
      findByIdAndUpdate: async () => {},
      create: async () => {},
      updateMany: async () => {},
    };

    const userMock = {
      findById: async (id) => id === 'user-id-001' ? { ...MOCK_USER } : null,
    };

    const jwtMock = {
      sign: () => 'mock-access-token-xyz',
      verify: () => ({ id: 'user-id-001', role: 'tutor' }),
    };

    const ctrl = loadControllerWithMocks({ userMock, refreshTokenMock: rtMock, jwtMock });

    const req = makeReq({ cookies: { refresh_token: secret } });
    const res = makeRes();
    const next = (err) => { throw err; };

    await ctrl.refresh(req, res, next);

    assert.equal(res._status, 200);
    assert.ok(res._body?.accessToken, 'debe incluir accessToken en el body');
    assert.equal(res._body.accessToken, 'mock-access-token-xyz');
    // Cookie de refresh seteada por issueRefreshToken
    assert.ok(res._cookies['refresh_token'], 'debe setear cookie refresh_token');
    assert.ok(res._cookies['refresh_token'].opts?.httpOnly, 'cookie debe ser httpOnly');
  });
});

// ── Test 2.2: POST /api/auth/refresh — reuso detectado → revoca familia, 401 ──

describe('POST /auth/refresh — reuso (token ya rotado)', () => {
  test('revoca toda la familia y devuelve 401', async () => {
    const secret = generateSecret();
    const tHash = hashToken(secret);

    // El documento está REVOCADO (ya fue rotado antes)
    const revokedDoc = { ...makeTokenDoc({ revoked: true, familyId: 'fam-compromised' }), tokenHash: tHash };

    let updateManyCalledWith = null;

    const rtMock = {
      findOne: async () => ({ ...revokedDoc }),
      updateMany: async (filter, update) => {
        updateManyCalledWith = { filter, update };
      },
      create: async () => {},
      findByIdAndUpdate: async () => {},
    };

    const userMock = { findById: async () => ({ ...MOCK_USER }) };
    const jwtMock = { sign: () => 'ignored', verify: () => ({}) };

    const ctrl = loadControllerWithMocks({ userMock, refreshTokenMock: rtMock, jwtMock });

    const req = makeReq({ cookies: { refresh_token: secret } });
    const res = makeRes();
    const next = (err) => { throw err; };

    await ctrl.refresh(req, res, next);

    assert.equal(res._status, 401);
    assert.ok(res._body?.message?.includes('revocad'), `mensaje esperado con "revocad", recibido: ${res._body?.message}`);

    // Verifica que updateMany fue llamado con la familia correcta
    assert.ok(updateManyCalledWith, 'updateMany debe haber sido llamado');
    assert.equal(updateManyCalledWith.filter.familyId, 'fam-compromised');
    assert.equal(updateManyCalledWith.update.$set.revoked, true);

    // Verifica que la cookie fue limpiada
    const cleared = res._clearedCookies.find((c) => c.name === 'refresh_token');
    assert.ok(cleared, 'debe limpiar la cookie refresh_token');
  });
});

// ── Test 2.3: POST /api/auth/refresh — sin cookie → 401 ─────────────────────

describe('POST /auth/refresh — sin cookie', () => {
  test('devuelve 401 sin llamar a la BD', async () => {
    let dbCalled = false;
    const rtMock = {
      findOne: async () => { dbCalled = true; return null; },
      updateMany: async () => {},
      create: async () => {},
      findByIdAndUpdate: async () => {},
    };

    const ctrl = loadControllerWithMocks({ refreshTokenMock: rtMock });

    const req = makeReq({ cookies: {} });   // sin cookie
    const res = makeRes();
    const next = (err) => { throw err; };

    await ctrl.refresh(req, res, next);

    assert.equal(res._status, 401);
    assert.equal(dbCalled, false, 'no debe consultar la BD si no hay cookie');
  });
});

// ── Test 2.4: POST /api/auth/refresh — token no encontrado en BD → 401 ───────

describe('POST /auth/refresh — token desconocido', () => {
  test('devuelve 401 cuando el hash no existe en BD', async () => {
    const secret = generateSecret();
    const rtMock = {
      findOne: async () => null,  // no encontrado
      updateMany: async () => {},
      create: async () => {},
      findByIdAndUpdate: async () => {},
    };

    const ctrl = loadControllerWithMocks({ refreshTokenMock: rtMock });

    const req = makeReq({ cookies: { refresh_token: secret } });
    const res = makeRes();
    const next = (err) => { throw err; };

    await ctrl.refresh(req, res, next);

    assert.equal(res._status, 401);
  });
});

// ── Test 2.5: POST /api/auth/logout — con cookie válida → revoca y 204 ───────

describe('POST /auth/logout — con cookie', () => {
  test('revoca el documento y responde 204 con cookie limpia', async () => {
    const secret = generateSecret();
    const tHash = hashToken(secret);

    let revokedFilter = null;
    const rtMock = {
      findOneAndUpdate: async (filter, update) => {
        revokedFilter = filter;
        return {}; // documento encontrado y actualizado
      },
      findOne: async () => null,
      create: async () => {},
      updateMany: async () => {},
    };

    const ctrl = loadControllerWithMocks({ refreshTokenMock: rtMock });

    const req = makeReq({ cookies: { refresh_token: secret } });
    const res = makeRes();
    const next = (err) => { throw err; };

    await ctrl.logout(req, res, next);

    assert.equal(res._status, 204);

    // Verifica que buscó por el hash correcto y revocado:false
    assert.ok(revokedFilter, 'findOneAndUpdate debe haberse llamado');
    assert.equal(revokedFilter.tokenHash, tHash);
    assert.equal(revokedFilter.revoked, false);

    // Cookie limpiada
    const cleared = res._clearedCookies.find((c) => c.name === 'refresh_token');
    assert.ok(cleared, 'debe limpiar la cookie refresh_token');
  });
});

// ── Test 2.6: POST /api/auth/logout — sin cookie → igual 204 (idempotente) ───

describe('POST /auth/logout — sin cookie (idempotente)', () => {
  test('responde 204 sin llamar a findOneAndUpdate', async () => {
    let dbCalled = false;
    const rtMock = {
      findOneAndUpdate: async () => { dbCalled = true; return null; },
      findOne: async () => null,
      create: async () => {},
      updateMany: async () => {},
    };

    const ctrl = loadControllerWithMocks({ refreshTokenMock: rtMock });

    const req = makeReq({ cookies: {} });
    const res = makeRes();
    const next = (err) => { throw err; };

    await ctrl.logout(req, res, next);

    assert.equal(res._status, 204);
    assert.equal(dbCalled, false, 'no debe tocar la BD si no hay cookie');

    // Cookie limpiada de todas formas
    const cleared = res._clearedCookies.find((c) => c.name === 'refresh_token');
    assert.ok(cleared, 'debe limpiar la cookie aún sin haber una');
  });
});
