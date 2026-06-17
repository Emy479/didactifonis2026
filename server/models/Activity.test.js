const { test } = require('node:test');
const assert = require('node:assert');
const Activity = require('./Activity');

test('Activity acepta los campos nuevos de bundle sin error de validación', () => {
  const doc = new Activity({
    title: 'La Casa Mágica',
    type: 'fonema',
    difficultyLevel: 1,
    createdBy: '6a2b2a5cc8c5bd600c0dd7e9',
    gameId: 'casa-magica',
    gameVersion: '1.0.0',
    entryPoint: 'index.html',
    bundlePath: '6a2b2a5cc8c5bd600c0dd7f6',
    manifest: { id: 'casa-magica', title: 'La Casa Mágica' },
  });
  const err = doc.validateSync();
  assert.strictEqual(err, undefined, 'no debe haber error de validación');
  assert.strictEqual(doc.gameId, 'casa-magica');
  assert.strictEqual(doc.entryPoint, 'index.html');
  assert.deepStrictEqual(doc.manifest, { id: 'casa-magica', title: 'La Casa Mágica' });
});

test('Activity sigue válido SIN los campos nuevos (actividades legacy)', () => {
  const doc = new Activity({
    title: 'Actividad manual',
    type: 'otro',
    difficultyLevel: 2,
    createdBy: '6a2b2a5cc8c5bd600c0dd7e9',
  });
  const err = doc.validateSync();
  assert.strictEqual(err, undefined);
  assert.strictEqual(doc.gameId, null);
});
