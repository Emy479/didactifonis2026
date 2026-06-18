const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const LocalDiskStorage = require('./LocalDiskStorage');

function freshBase() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'storage-base-'));
}
function tempBundle(baseDir, content) {
  const dir = path.join(baseDir, '.tmp-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), content);
  return dir;
}

test('save mueve el bundle a baseDir/<activityId>', () => {
  const baseDir = freshBase();
  const storage = new LocalDiskStorage({ baseDir, baseUrl: 'http://x' });
  const temp = tempBundle(baseDir, 'v1');
  const dest = storage.save('act1', temp);
  assert.strictEqual(fs.readFileSync(path.join(dest, 'index.html'), 'utf8'), 'v1');
  assert.ok(!fs.existsSync(temp), 'el temp ya no existe tras el move');
});

test('serveUrl construye la URL esperada', () => {
  const storage = new LocalDiskStorage({ baseDir: freshBase(), baseUrl: 'http://localhost:3001' });
  assert.strictEqual(storage.serveUrl('act1', 'index.html'), 'http://localhost:3001/games/act1/index.html');
});

test('replace hace swap y deja la versión nueva', () => {
  const baseDir = freshBase();
  const storage = new LocalDiskStorage({ baseDir, baseUrl: 'http://x' });
  storage.save('act1', tempBundle(baseDir, 'v1'));
  const dest = storage.replace('act1', tempBundle(baseDir, 'v2'));
  assert.strictEqual(fs.readFileSync(path.join(dest, 'index.html'), 'utf8'), 'v2');
  // no quedan backups .old
  const leftovers = fs.readdirSync(baseDir).filter((n) => n.includes('.old-'));
  assert.strictEqual(leftovers.length, 0);
});

test('replace happy-path: version nueva queda, sin residuos .old-* en baseDir', () => {
  const baseDir = freshBase();
  const storage = new LocalDiskStorage({ baseDir, baseUrl: 'http://x' });
  storage.save('act1', tempBundle(baseDir, 'v1'));
  const dest = storage.replace('act1', tempBundle(baseDir, 'v2'));
  assert.strictEqual(fs.readFileSync(path.join(dest, 'index.html'), 'utf8'), 'v2');
  const dotOlds = fs.readdirSync(baseDir).filter((n) => /^\.old-/.test(n));
  assert.strictEqual(dotOlds.length, 0, 'no deben quedar backups .old-* en baseDir');
});

test('replace ROLLBACK: tempDir inexistente lanza, original intacto, sin backup .old-* colgado', () => {
  const baseDir = freshBase();
  const storage = new LocalDiskStorage({ baseDir, baseUrl: 'http://x' });
  storage.save('act1', tempBundle(baseDir, 'original'));
  const destBefore = storage._dirFor('act1');
  const nonExistentTemp = path.join(baseDir, '.tmp-does-not-exist');
  assert.throws(
    () => storage.replace('act1', nonExistentTemp),
    (err) => err.code === 'ENOENT',
    'debe lanzar ENOENT al no encontrar tempDir'
  );
  // (i) lanza — verificado arriba
  // (ii) la version original sigue intacta
  assert.strictEqual(
    fs.readFileSync(path.join(destBefore, 'index.html'), 'utf8'),
    'original',
    'el contenido original debe seguir en dest tras rollback'
  );
  // (iii) no queda ningun backup .old-* colgado
  const dotOlds = fs.readdirSync(baseDir).filter((n) => /^\.old-/.test(n));
  assert.strictEqual(dotOlds.length, 0, 'no debe quedar backup .old-* colgado tras rollback');
});

test('delete elimina la carpeta del juego', () => {
  const baseDir = freshBase();
  const storage = new LocalDiskStorage({ baseDir, baseUrl: 'http://x' });
  const dest = storage.save('act1', tempBundle(baseDir, 'v1'));
  storage.delete('act1');
  assert.ok(!fs.existsSync(dest));
});
