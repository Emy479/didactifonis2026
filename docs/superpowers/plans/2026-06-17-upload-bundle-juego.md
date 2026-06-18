# Carga de Bundle de Juego — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el Admin suba el `.zip` que produce el Engine, validarlo contra el contrato, descomprimirlo de forma segura, almacenarlo en disco y servirlo al `GameHost`, con soporte de re-subida versionada.

**Architecture:** Pipeline backend (subir → validar manifest → extraer con guards → almacenar → servir) detrás de dos abstracciones (`storage`, `bundleArchive`). Reusa `validateManifest()` de `@didactifonis/contract` (sin tocar Engine ni contrato). Sirve los bundles con `express.static` en `/games`. UI de Admin con input de archivo.

**Tech Stack:** Node.js + Express + Mongoose (server), React + Vite + Tailwind (client), `yauzl` (lectura ZIP), `multer` (multipart), `node:test` + `node:assert` (tests unitarios, nativo), `yazl` (devDep, fixtures de test).

## Global Constraints

- **No tocar** `@didactifonis/contract` ni el repo del Engine. La validación de manifest se hace **reutilizando** `validateManifest()` del paquete ya enlazado en `server/node_modules/@didactifonis/contract`.
- Ambos endpoints son **solo admin**: `protect` + `requireRole('admin')`.
- `bundleUrl` es **derivado**: `${API_BASE_URL}/games/<activityId>/<entryPoint>` (absoluto; en dev `API_BASE_URL` cae a `http://localhost:3001`).
- Límites configurables por env: `BUNDLE_MAX_ZIP_BYTES` (50 MB), `BUNDLE_MAX_FILES` (2000), `BUNDLE_MAX_TOTAL_BYTES` (200 MB), `BUNDLE_MAX_FILE_BYTES` (50 MB), `GAME_STORAGE_DIR` (default `server/storage-data/game-bundles`).
- Las carpetas temporales de extracción y los backups de swap van **dentro de** `GAME_STORAGE_DIR` con prefijo `.` (para `renameSync` same-FS y para que `dotfiles:'deny'` impida servirlas).
- UI: usar tokens de `design-system.md`; sin neón/glow. La gamificación no entra en paneles de Admin.
- Commits pequeños. Rama de trabajo: `feature/upload-bundle-juego` (ya creada).
- Node test runner: ejecutar con `node --test <ruta>`. Añadir script `"test": "node --test"` a `server/package.json`.

---

### Task 1: Extender el modelo Activity + arrancar el test runner

**Files:**
- Modify: `server/models/Activity.js`
- Modify: `server/package.json` (script `test`)
- Test: `server/models/Activity.test.js`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: el modelo `Activity` con campos nuevos opcionales `gameId`, `gameVersion`, `entryPoint`, `bundlePath`, `manifest`. Todos `default null` para no romper actividades existentes ni el alta manual.

- [ ] **Step 1: Añadir el script de test a `server/package.json`**

En `"scripts"`, añadir la línea `"test"` (dejar las demás como están):

```json
    "test": "node --test",
```

- [ ] **Step 2: Escribir el test que falla** — `server/models/Activity.test.js`

```js
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
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `node --test server/models/Activity.test.js`
Expected: FAIL — los campos `gameId`/`entryPoint`/`manifest` no existen aún en el schema (quedan `undefined`, la aserción falla).

- [ ] **Step 4: Añadir los campos al schema** — en `server/models/Activity.js`, dentro del objeto del schema, justo después del campo `bundleUrl` (línea ~51-54):

```js
    bundleUrl: {
      type: String,
      default: null,
    },
    // ── Campos de bundle subido (publicación 2.D). Opcionales: las actividades
    // creadas manualmente (sin ZIP) o legacy no los tienen. ──────────────────
    gameId: {
      type: String,
      default: null,
    },
    gameVersion: {
      type: String,
      default: null,
    },
    entryPoint: {
      type: String,
      default: null,
    },
    bundlePath: {
      type: String,
      default: null,
    },
    manifest: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `node --test server/models/Activity.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add server/models/Activity.js server/models/Activity.test.js server/package.json
git commit -m "feat(activity): campos de bundle subido en modelo + test runner node:test"
```

---

### Task 2: `bundleArchive` — extracción de ZIP con guards de seguridad

**Files:**
- Create: `server/activities/bundleArchive.js`
- Test: `server/activities/bundleArchive.test.js`
- Modify: `server/package.json` (deps `yauzl`, devDep `yazl`)

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `class BundleError extends Error` con `.code` (string), `.httpStatus` (number), `.details` (any|null).
  - `async function extractZipToDir(zipPath: string, destDir: string, limits: { maxFiles, maxFileBytes, maxTotalBytes }): Promise<string[]>` — extrae todas las entradas a `destDir`, devuelve la lista de rutas relativas escritas. Lanza `BundleError` con códigos `ZIP_INVALID`, `ZIP_SLIP`, `SYMLINK`, `ZIP_BOMB`, `EXTRACT_FAILED`.

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install yauzl --prefix server
npm install --save-dev yazl --prefix server
```
Expected: `yauzl` en `dependencies`, `yazl` en `devDependencies` de `server/package.json`.

- [ ] **Step 2: Escribir los tests que fallan** — `server/activities/bundleArchive.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yazl = require('yazl');
const { extractZipToDir, BundleError } = require('./bundleArchive');

const LIMITS = { maxFiles: 100, maxFileBytes: 1024 * 1024, maxTotalBytes: 4 * 1024 * 1024 };

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ba-test-'));
}

// Construye un .zip en disco a partir de un array de { name, content, mode? }.
function buildZip(entries) {
  return new Promise((resolve) => {
    const zip = new yazl.ZipFile();
    for (const e of entries) {
      zip.addBuffer(Buffer.from(e.content), e.name, e.mode ? { mode: e.mode } : undefined);
    }
    zip.end();
    const zipPath = path.join(tmpDir(), 'bundle.zip');
    const out = fs.createWriteStream(zipPath);
    zip.outputStream.pipe(out).on('close', () => resolve(zipPath));
  });
}

test('extrae un ZIP válido y devuelve las rutas escritas', async () => {
  const zipPath = await buildZip([
    { name: 'index.html', content: '<html></html>' },
    { name: 'assets/a.js', content: 'console.log(1)' },
  ]);
  const dest = tmpDir();
  const written = await extractZipToDir(zipPath, dest, LIMITS);
  assert.ok(written.includes('index.html'));
  assert.ok(fs.existsSync(path.join(dest, 'assets', 'a.js')));
});

test('rechaza zip-slip (ruta con ..)', async () => {
  const zipPath = await buildZip([{ name: '../evil.txt', content: 'x' }]);
  const dest = tmpDir();
  await assert.rejects(
    () => extractZipToDir(zipPath, dest, LIMITS),
    (err) => err instanceof BundleError && err.code === 'ZIP_SLIP'
  );
});

test('rechaza symlink', async () => {
  // mode 0o120777 marca symlink en los atributos externos
  const zipPath = await buildZip([{ name: 'link', content: '/etc/passwd', mode: 0o120777 }]);
  const dest = tmpDir();
  await assert.rejects(
    () => extractZipToDir(zipPath, dest, LIMITS),
    (err) => err instanceof BundleError && err.code === 'SYMLINK'
  );
});

test('rechaza zip-bomb por número de archivos', async () => {
  const entries = [];
  for (let i = 0; i < 5; i++) entries.push({ name: `f${i}.txt`, content: 'x' });
  const zipPath = await buildZip(entries);
  const dest = tmpDir();
  await assert.rejects(
    () => extractZipToDir(zipPath, dest, { maxFiles: 3, maxFileBytes: 1024, maxTotalBytes: 1024 }),
    (err) => err instanceof BundleError && err.code === 'ZIP_BOMB'
  );
});

test('rechaza zip-bomb por tamaño total descomprimido', async () => {
  const big = 'a'.repeat(2000);
  const zipPath = await buildZip([{ name: 'big.txt', content: big }]);
  const dest = tmpDir();
  await assert.rejects(
    () => extractZipToDir(zipPath, dest, { maxFiles: 100, maxFileBytes: 5000, maxTotalBytes: 1000 }),
    (err) => err instanceof BundleError && err.code === 'ZIP_BOMB'
  );
});
```

- [ ] **Step 3: Ejecutar y verificar que fallan**

Run: `node --test server/activities/bundleArchive.test.js`
Expected: FAIL con "Cannot find module './bundleArchive'".

- [ ] **Step 4: Implementar `server/activities/bundleArchive.js`**

```js
/**
 * bundleArchive.js — apertura, validación y extracción segura del ZIP de juego.
 * Aísla la librería de descompresión (yauzl) y centraliza los guards de seguridad:
 * zip-slip, symlinks y zip-bomb (nº de archivos + tamaño descomprimido).
 */
const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');

class BundleError extends Error {
  constructor(code, httpStatus, message, details) {
    super(message);
    this.name = 'BundleError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details || null;
  }
}

const SYMLINK_MODE = 0o120000;

function isSymlink(entry) {
  const mode = (entry.externalFileAttributes >>> 16) & 0o170000;
  return mode === SYMLINK_MODE;
}

function isUnsafePath(relPath) {
  if (path.isAbsolute(relPath)) return true;
  if (/\\/.test(relPath)) return true; // backslashes
  const segments = path.normalize(relPath).split(/[/\\]/);
  return segments.includes('..');
}

function extractZipToDir(zipPath, destDir, limits) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        return reject(new BundleError('ZIP_INVALID', 400, 'El archivo no es un ZIP válido.'));
      }
      let fileCount = 0;
      let totalBytes = 0;
      const written = [];
      let settled = false;
      const fail = (e) => { if (!settled) { settled = true; reject(e); } };

      zip.on('error', () => fail(new BundleError('ZIP_INVALID', 400, 'No se pudo leer el ZIP.')));
      zip.on('end', () => { if (!settled) { settled = true; resolve(written); } });
      zip.readEntry();

      zip.on('entry', (entry) => {
        if (settled) return;
        const name = entry.fileName;
        // Entrada de directorio
        if (/\/$/.test(name)) {
          if (isUnsafePath(name)) return fail(new BundleError('ZIP_SLIP', 400, 'Ruta no permitida en el ZIP: ' + name));
          fs.mkdirSync(path.join(destDir, name), { recursive: true });
          return zip.readEntry();
        }
        if (isSymlink(entry)) {
          return fail(new BundleError('SYMLINK', 400, 'El ZIP contiene un symlink, no permitido: ' + name));
        }
        if (isUnsafePath(name)) {
          return fail(new BundleError('ZIP_SLIP', 400, 'Ruta no permitida en el ZIP: ' + name));
        }
        fileCount += 1;
        if (fileCount > limits.maxFiles) {
          return fail(new BundleError('ZIP_BOMB', 400, 'El ZIP excede el número máximo de archivos.'));
        }
        const destPath = path.join(destDir, name);
        const rel = path.relative(destDir, destPath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          return fail(new BundleError('ZIP_SLIP', 400, 'Ruta fuera del destino: ' + name));
        }
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        zip.openReadStream(entry, (e2, readStream) => {
          if (e2 || !readStream) return fail(new BundleError('ZIP_INVALID', 400, 'No se pudo leer una entrada del ZIP.'));
          let entryBytes = 0;
          const out = fs.createWriteStream(destPath);
          readStream.on('data', (chunk) => {
            entryBytes += chunk.length;
            totalBytes += chunk.length;
            if (entryBytes > limits.maxFileBytes || totalBytes > limits.maxTotalBytes) {
              readStream.destroy();
              out.destroy();
              fail(new BundleError('ZIP_BOMB', 400, 'El contenido descomprimido excede el límite permitido.'));
            }
          });
          readStream.on('error', () => fail(new BundleError('ZIP_INVALID', 400, 'Error al leer el ZIP.')));
          out.on('error', () => fail(new BundleError('EXTRACT_FAILED', 500, 'Error al escribir archivos.')));
          out.on('finish', () => { if (!settled) { written.push(name); zip.readEntry(); } });
          readStream.pipe(out);
        });
      });
    });
  });
}

module.exports = { BundleError, extractZipToDir, isUnsafePath, isSymlink };
```

- [ ] **Step 5: Ejecutar y verificar que pasan**

Run: `node --test server/activities/bundleArchive.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add server/activities/bundleArchive.js server/activities/bundleArchive.test.js server/package.json server/package-lock.json
git commit -m "feat(bundle): extracción segura de ZIP con guards zip-slip/symlink/bomb"
```

---

### Task 3: `bundleArchive` — carga y validación del manifest

**Files:**
- Modify: `server/activities/bundleArchive.js`
- Modify: `server/activities/bundleArchive.test.js`

**Interfaces:**
- Consumes: `BundleError` (Task 2), `validateManifest` de `@didactifonis/contract`.
- Produces: `function loadAndValidateManifest(destDir: string): object` — lee `destDir/manifest.json`, lo parsea, lo valida con `validateManifest`, verifica que el archivo `entryPoint` exista en `destDir`, y devuelve el manifest. Lanza `BundleError` con códigos `MANIFEST_MISSING`, `MANIFEST_PARSE`, `MANIFEST_INVALID`, `ENTRYPOINT_MISSING`.

- [ ] **Step 1: Añadir los tests que fallan** — al final de `server/activities/bundleArchive.test.js`:

```js
const { loadAndValidateManifest } = require('./bundleArchive');

const VALID_MANIFEST = {
  id: 'casa-magica',
  title: 'La Casa Mágica',
  version: '1.0.0',
  category: 'fonologia',
  level: 1,
  ageMin: 4,
  ageMax: 8,
  durationMin: 10,
  entryPoint: 'index.html',
  manifestContractVersion: '1.0',
};

function writeManifestDir(manifestObj, { withEntry = true } = {}) {
  const dir = tmpDir();
  if (manifestObj !== undefined) {
    fs.writeFileSync(path.join(dir, 'manifest.json'), typeof manifestObj === 'string' ? manifestObj : JSON.stringify(manifestObj));
  }
  if (withEntry && manifestObj && manifestObj.entryPoint) {
    fs.writeFileSync(path.join(dir, manifestObj.entryPoint), '<html></html>');
  }
  return dir;
}

test('loadAndValidateManifest devuelve el manifest válido', () => {
  const dir = writeManifestDir(VALID_MANIFEST);
  const m = loadAndValidateManifest(dir);
  assert.strictEqual(m.id, 'casa-magica');
});

test('falla si no hay manifest.json', () => {
  const dir = tmpDir();
  assert.throws(() => loadAndValidateManifest(dir), (e) => e.code === 'MANIFEST_MISSING');
});

test('falla si manifest.json no es JSON', () => {
  const dir = writeManifestDir('{ no es json', { withEntry: false });
  assert.throws(() => loadAndValidateManifest(dir), (e) => e.code === 'MANIFEST_PARSE');
});

test('falla si el manifest no cumple el contrato (con details)', () => {
  const bad = { ...VALID_MANIFEST, level: 999 };
  const dir = writeManifestDir(bad);
  assert.throws(
    () => loadAndValidateManifest(dir),
    (e) => e.code === 'MANIFEST_INVALID' && Array.isArray(e.details) && e.details.length > 0
  );
});

test('falla si el entryPoint declarado no existe en el ZIP', () => {
  const dir = writeManifestDir(VALID_MANIFEST, { withEntry: false });
  assert.throws(() => loadAndValidateManifest(dir), (e) => e.code === 'ENTRYPOINT_MISSING');
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test server/activities/bundleArchive.test.js`
Expected: FAIL — `loadAndValidateManifest is not a function`.

- [ ] **Step 3: Implementar `loadAndValidateManifest`** — en `server/activities/bundleArchive.js`, añadir el require arriba y la función, y exportarla:

```js
const { validateManifest } = require('@didactifonis/contract');
```

```js
function loadAndValidateManifest(destDir) {
  const manifestPath = path.join(destDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new BundleError('MANIFEST_MISSING', 400, 'El ZIP no contiene manifest.json en la raíz.');
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    throw new BundleError('MANIFEST_PARSE', 400, 'manifest.json no es JSON válido.');
  }
  const { valid, errors } = validateManifest(manifest);
  if (!valid) {
    throw new BundleError('MANIFEST_INVALID', 400, 'El manifest no cumple el contrato de publicación.', errors);
  }
  const entryAbs = path.join(destDir, manifest.entryPoint);
  if (!fs.existsSync(entryAbs)) {
    throw new BundleError('ENTRYPOINT_MISSING', 400, 'El entryPoint declarado no existe en el ZIP: ' + manifest.entryPoint);
  }
  return manifest;
}
```

Actualizar el `module.exports`:

```js
module.exports = { BundleError, extractZipToDir, loadAndValidateManifest, isUnsafePath, isSymlink };
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `node --test server/activities/bundleArchive.test.js`
Expected: PASS (10 tests en total).

- [ ] **Step 5: Commit**

```bash
git add server/activities/bundleArchive.js server/activities/bundleArchive.test.js
git commit -m "feat(bundle): validación de manifest reutilizando @didactifonis/contract"
```

---

### Task 4: `LocalDiskStorage` + factory de storage

**Files:**
- Create: `server/storage/LocalDiskStorage.js`
- Create: `server/storage/index.js`
- Test: `server/storage/LocalDiskStorage.test.js`
- Modify: `.gitignore` (raíz)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `class LocalDiskStorage` con constructor `({ baseDir, baseUrl })` y métodos:
    - `save(activityId, tempDir): string` — mueve `tempDir` a `baseDir/<activityId>` (reemplaza si existe). Devuelve la ruta destino.
    - `replace(activityId, tempDir): string` — swap atómico con backup `.old-<ts>` y rollback ante fallo.
    - `serveUrl(activityId, entryPoint): string` — `${baseUrl}/games/${activityId}/${entryPoint}`.
    - `delete(activityId): void`.
    - `root(): string` — devuelve `baseDir` (para el montaje estático).
  - `server/storage/index.js` exporta **una instancia** configurada por env.

- [ ] **Step 1: Escribir los tests que fallan** — `server/storage/LocalDiskStorage.test.js`

```js
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

test('delete elimina la carpeta del juego', () => {
  const baseDir = freshBase();
  const storage = new LocalDiskStorage({ baseDir, baseUrl: 'http://x' });
  const dest = storage.save('act1', tempBundle(baseDir, 'v1'));
  storage.delete('act1');
  assert.ok(!fs.existsSync(dest));
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node --test server/storage/LocalDiskStorage.test.js`
Expected: FAIL con "Cannot find module './LocalDiskStorage'".

- [ ] **Step 3: Implementar `server/storage/LocalDiskStorage.js`**

```js
/**
 * LocalDiskStorage — almacenamiento de bundles en disco local.
 * Implementación de la interfaz storage (save/replace/serveUrl/delete/root).
 * Para migrar a nube/subdominio, crear otra implementación con la misma forma.
 */
const fs = require('fs');
const path = require('path');

class LocalDiskStorage {
  constructor({ baseDir, baseUrl }) {
    this.baseDir = baseDir;
    this.baseUrl = baseUrl;
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  _dirFor(activityId) {
    return path.join(this.baseDir, String(activityId));
  }

  save(activityId, tempDir) {
    const dest = this._dirFor(activityId);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tempDir, dest);
    return dest;
  }

  replace(activityId, tempDir) {
    const dest = this._dirFor(activityId);
    const backup = dest + '.old-' + Date.now();
    if (fs.existsSync(dest)) fs.renameSync(dest, backup);
    try {
      fs.renameSync(tempDir, dest);
    } catch (e) {
      if (fs.existsSync(backup)) fs.renameSync(backup, dest);
      throw e;
    }
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
    return dest;
  }

  serveUrl(activityId, entryPoint) {
    return `${this.baseUrl}/games/${activityId}/${entryPoint}`;
  }

  delete(activityId) {
    const dest = this._dirFor(activityId);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  }

  root() {
    return this.baseDir;
  }
}

module.exports = LocalDiskStorage;
```

- [ ] **Step 4: Implementar el factory `server/storage/index.js`**

```js
/**
 * storage/index.js — instancia única de almacenamiento configurada por entorno.
 * El resto de la app importa de aquí; no instancia LocalDiskStorage directamente.
 */
const path = require('path');
const LocalDiskStorage = require('./LocalDiskStorage');

const baseDir = process.env.GAME_STORAGE_DIR || path.join(__dirname, '..', 'storage-data', 'game-bundles');
const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

module.exports = new LocalDiskStorage({ baseDir, baseUrl });
```

- [ ] **Step 5: Ignorar los datos de bundles en git** — añadir al `.gitignore` de la raíz:

```
# Bundles de juego subidos (datos en runtime, no versionar)
server/storage-data/
```

- [ ] **Step 6: Ejecutar y verificar que pasan**

Run: `node --test server/storage/LocalDiskStorage.test.js`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add server/storage/LocalDiskStorage.js server/storage/index.js server/storage/LocalDiskStorage.test.js .gitignore
git commit -m "feat(storage): LocalDiskStorage con save/replace/serveUrl/delete + factory por env"
```

---

### Task 5: Endpoint `POST /api/activities/upload`

**Files:**
- Modify: `server/routes/activities.js`
- Modify: `server/package.json` (dep `multer`)

**Interfaces:**
- Consumes: `extractZipToDir`, `loadAndValidateManifest`, `BundleError` (Tasks 2-3); instancia `storage` (Task 4); modelo `Activity` (Task 1); middleware `protect`, `requireRole` (existentes).
- Produces: `POST /api/activities/upload` (multipart, campo de archivo `bundle`; campos de texto `type`, `difficultyLevel`, `therapeuticGoal`, `availableToTutors`, `passThreshold`). Responde `201` con la `Activity`, o `400/403` con `{ message, details? }`.

- [ ] **Step 1: Instalar multer**

Run: `npm install multer --prefix server`
Expected: `multer` en `dependencies`.

- [ ] **Step 2: Cabecera del router** — al inicio de `server/routes/activities.js`, añadir requires y configuración (debajo de los requires existentes):

```js
const path = require('path');
const os = require('os');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const storage = require('../storage');
const { extractZipToDir, loadAndValidateManifest, BundleError } = require('../activities/bundleArchive');

const upload = multer({
  dest: path.join(os.tmpdir(), 'didactifonis-uploads'),
  limits: { fileSize: Number(process.env.BUNDLE_MAX_ZIP_BYTES) || 50 * 1024 * 1024 },
});

const BUNDLE_LIMITS = {
  maxFiles: Number(process.env.BUNDLE_MAX_FILES) || 2000,
  maxFileBytes: Number(process.env.BUNDLE_MAX_FILE_BYTES) || 50 * 1024 * 1024,
  maxTotalBytes: Number(process.env.BUNDLE_MAX_TOTAL_BYTES) || 200 * 1024 * 1024,
};

const ACTIVITY_TYPES = ['fonema', 'silaba', 'palabra', 'comprension', 'otro'];

// Valida los campos terapéuticos que aporta el Admin en el multipart.
// Devuelve { ok: true, value } o { ok: false, message }.
function parseAdminFields(body) {
  const { type, difficultyLevel, therapeuticGoal, availableToTutors, passThreshold } = body;
  if (!ACTIVITY_TYPES.includes(type)) {
    return { ok: false, message: 'Tipo de actividad inválido.' };
  }
  const lvl = Number(difficultyLevel);
  if (![1, 2, 3].includes(lvl)) {
    return { ok: false, message: 'El nivel de dificultad debe ser 1, 2 o 3.' };
  }
  let threshold = 60;
  if (passThreshold !== undefined && passThreshold !== '') {
    threshold = Number(passThreshold);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
      return { ok: false, message: 'El umbral de aprobación debe estar entre 0 y 100.' };
    }
  }
  return {
    ok: true,
    value: {
      type,
      difficultyLevel: lvl,
      therapeuticGoal: therapeuticGoal || null,
      availableToTutors: availableToTutors === 'true' || availableToTutors === true,
      passThreshold: threshold,
    },
  };
}
```

- [ ] **Step 3: Implementar la ruta** — añadir en `server/routes/activities.js` antes de `module.exports`:

```js
// POST /upload — subir bundle ZIP y crear actividad (solo admin)
router.post('/upload', protect, requireRole('admin'), upload.single('bundle'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Falta el archivo bundle (.zip).' });
  }
  const admin = parseAdminFields(req.body);
  if (!admin.ok) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(400).json({ message: admin.message });
  }

  const activityId = new mongoose.Types.ObjectId();
  const tempDir = path.join(storage.root(), `.tmp-${activityId}`);

  try {
    await extractZipToDir(req.file.path, tempDir, BUNDLE_LIMITS);
    const manifest = loadAndValidateManifest(tempDir);

    storage.save(activityId, tempDir); // mueve tempDir -> baseDir/<activityId>

    const activity = await Activity.create({
      _id: activityId,
      title: manifest.title,
      type: admin.value.type,
      difficultyLevel: admin.value.difficultyLevel,
      therapeuticGoal: admin.value.therapeuticGoal,
      ageRange: { min: manifest.ageMin, max: manifest.ageMax },
      durationMinutes: manifest.durationMin,
      availableToTutors: admin.value.availableToTutors,
      passThreshold: admin.value.passThreshold,
      gameId: manifest.id,
      gameVersion: manifest.version,
      entryPoint: manifest.entryPoint,
      bundlePath: String(activityId),
      manifest,
      bundleUrl: storage.serveUrl(activityId, manifest.entryPoint),
      createdBy: req.user._id,
    });

    return res.status(201).json(activity);
  } catch (err) {
    storage.delete(activityId); // limpia la carpeta committeada si Activity.create falló
    if (err instanceof BundleError) {
      if (err.code === 'ZIP_SLIP' || err.code === 'SYMLINK') {
        console.warn(`[seguridad] bundle rechazado (${err.code}) admin=${req.user._id}: ${err.message}`);
      }
      return res.status(err.httpStatus).json({ message: err.message, details: err.details || undefined });
    }
    return next(err);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ya movido */ }
    try { fs.rmSync(req.file.path, { force: true }); } catch { /* ya borrado */ }
  }
});
```

- [ ] **Step 4: Verificación runtime (servidor + curl)**

Preparar un bundle válido de prueba:
```bash
mkdir -p /tmp/good && cd /tmp/good
printf '<html><body>ok</body></html>' > index.html
printf '{"id":"prueba-upload","title":"Prueba Upload","version":"1.0.0","category":"test","level":1,"ageMin":4,"ageMax":8,"durationMin":10,"entryPoint":"index.html","manifestContractVersion":"1.0"}' > manifest.json
cd /tmp/good && zip -r /tmp/good.zip . >/dev/null
```
Con el server corriendo (`npm run dev --prefix server`) y un JWT de admin en `$ADMIN_JWT`:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/activities/upload \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -F "bundle=@/tmp/good.zip" -F "type=fonema" -F "difficultyLevel=1" -F "availableToTutors=true"
```
Expected: `201`. La respuesta JSON incluye `bundleUrl` = `http://localhost:3001/games/<id>/index.html`, `gameId=prueba-upload`, y los archivos quedan en `server/storage-data/game-bundles/<id>/`.

Caso inválido (manifest con `level` fuera de rango → 400 con details):
```bash
# regenerar manifest con "level":999 y rezipear, luego:
curl -s -w "\n%{http_code}\n" -X POST http://localhost:3001/api/activities/upload \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -F "bundle=@/tmp/bad.zip" -F "type=fonema" -F "difficultyLevel=1"
```
Expected: `400` y `details` con el error del campo `level`.

> Nota: estas verificaciones runtime las ejecuta el agente QA en la fase de verificación (Task 9). No hay arnés HTTP automatizado en el proyecto; el patrón es runtime + contraprueba Mongo (ver `docs/qa-e2-frente-a.md`).

- [ ] **Step 5: Commit**

```bash
git add server/routes/activities.js server/package.json server/package-lock.json
git commit -m "feat(activities): endpoint POST /upload de bundle ZIP (solo admin)"
```

---

### Task 6: Endpoint `PUT /api/activities/:id/bundle` (re-subida versionada)

**Files:**
- Modify: `server/routes/activities.js`

**Interfaces:**
- Consumes: lo mismo que Task 5, más `storage.replace`.
- Produces: `PUT /api/activities/:id/bundle` (multipart, campo `bundle`). Reemplaza el bundle de una actividad existente con swap atómico; exige que `manifest.id === activity.gameId`. Responde `200` con la `Activity` actualizada, o `400/404`.

- [ ] **Step 1: Implementar la ruta** — añadir en `server/routes/activities.js` antes de `module.exports`:

```js
// PUT /:id/bundle — reemplazar el bundle de una actividad existente (solo admin)
router.put('/:id/bundle', protect, requireRole('admin'), upload.single('bundle'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Falta el archivo bundle (.zip).' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(400).json({ message: 'ID de actividad inválido.' });
  }

  const activity = await Activity.findById(req.params.id);
  if (!activity) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(404).json({ message: 'Actividad no encontrada.' });
  }

  const tempDir = path.join(storage.root(), `.tmp-${req.params.id}-${Date.now()}`);

  try {
    await extractZipToDir(req.file.path, tempDir, BUNDLE_LIMITS);
    const manifest = loadAndValidateManifest(tempDir);

    if (activity.gameId && manifest.id !== activity.gameId) {
      throw new BundleError(
        'GAMEID_MISMATCH',
        400,
        `El juego subido (${manifest.id}) no coincide con el de esta actividad (${activity.gameId}).`
      );
    }

    storage.replace(req.params.id, tempDir); // swap atómico con rollback

    activity.gameVersion = manifest.version;
    activity.entryPoint = manifest.entryPoint;
    activity.manifest = manifest;
    activity.bundleUrl = storage.serveUrl(req.params.id, manifest.entryPoint);
    if (!activity.gameId) activity.gameId = manifest.id;
    await activity.save();

    return res.status(200).json(activity);
  } catch (err) {
    if (err instanceof BundleError) {
      if (err.code === 'ZIP_SLIP' || err.code === 'SYMLINK') {
        console.warn(`[seguridad] re-subida rechazada (${err.code}) admin=${req.user._id} actividad=${req.params.id}: ${err.message}`);
      }
      return res.status(err.httpStatus).json({ message: err.message, details: err.details || undefined });
    }
    return next(err);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ya movido */ }
    try { fs.rmSync(req.file.path, { force: true }); } catch { /* ya borrado */ }
  }
});
```

- [ ] **Step 2: Verificación runtime**

Con una actividad creada en Task 5 (`gameId=prueba-upload`, id en `$ACT_ID`):
```bash
# Re-subir el MISMO juego (versión 1.0.1) → 200
# (regenerar /tmp/good.zip con "version":"1.0.1")
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3001/api/activities/$ACT_ID/bundle \
  -H "Authorization: Bearer $ADMIN_JWT" -F "bundle=@/tmp/good.zip"
```
Expected: `200`; `gameVersion` pasa a `1.0.1`; los archivos del juego se reemplazaron y no quedan carpetas `.old-*` en `server/storage-data/game-bundles/`.

```bash
# Re-subir un juego con OTRO gameId → 400 GAMEID_MISMATCH
# (manifest con "id":"otro-juego")
curl -s -w "\n%{http_code}\n" -X PUT http://localhost:3001/api/activities/$ACT_ID/bundle \
  -H "Authorization: Bearer $ADMIN_JWT" -F "bundle=@/tmp/otro.zip"
```
Expected: `400` con mensaje de no-coincidencia de `gameId`.

- [ ] **Step 3: Commit**

```bash
git add server/routes/activities.js
git commit -m "feat(activities): endpoint PUT /:id/bundle (re-subida versionada con swap atómico)"
```

---

### Task 7: Servir los bundles en `/games` con cabeceras de seguridad

**Files:**
- Modify: `server/index.js`

**Interfaces:**
- Consumes: instancia `storage` (Task 4).
- Produces: ruta estática `GET /games/<activityId>/<...>` que sirve los archivos del bundle con cabeceras de seguridad y sin listado de directorios. No cambia la API existente.

- [ ] **Step 1: Localizar el punto de montaje** — en `server/index.js`, identificar dónde se montan las rutas (`app.use('/api/...')`) y el require de `express`. Añadir el require de storage junto a los demás requires:

```js
const gameStorage = require('./storage');
```

- [ ] **Step 2: Montar el estático** — añadir junto a los demás `app.use`, **antes** del manejador 404/error global:

```js
// Servido de bundles de juego subidos. Cross-origin respecto al cliente; el iframe
// del GameHost ya aplica sandbox sin allow-same-origin. Cabeceras de seguridad +
// sin listado de directorios + dotfiles denegados (oculta .tmp-* y .old-*).
app.use(
  '/games',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *"
    );
    next();
  },
  express.static(gameStorage.root(), { index: false, dotfiles: 'deny' })
);
```

> Si `helmet` está aplicado globalmente y fija una CSP que rompe los juegos, ajustar para que `/games` use la CSP de arriba (el `setHeader` posterior la sobre-escribe). La CSP final del servido la revisa `didactifonis-security` en Task 9.

- [ ] **Step 3: Verificación runtime**

Con un bundle ya subido (Task 5) y el server corriendo:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/games/$ACT_ID/index.html
curl -s -D - -o /dev/null http://localhost:3001/games/$ACT_ID/index.html | grep -i "x-content-type-options"
# Intento de servir un dotfile/temporal → 403/404
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3001/games/.tmp-x/index.html"
```
Expected: `200` para `index.html`; cabecera `X-Content-Type-Options: nosniff` presente; `403`/`404` para rutas dotfile.

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(server): servir bundles en /games con cabeceras de seguridad"
```

---

### Task 8: UI de Admin — subir y reemplazar bundle

**Files:**
- Modify: `client/src/pages/admin/AdminActividades.jsx`

**Interfaces:**
- Consumes: `POST /api/activities/upload` (Task 5), `PUT /api/activities/:id/bundle` (Task 6).
- Produces: en **crear**, un input de archivo `.zip` (en lugar del campo URL placeholder) que envía multipart a `/upload`; en **editar**, un botón "Reemplazar bundle" que envía a `/:id/bundle`. Muestra errores de validación legibles (incluyendo `details`).

- [ ] **Step 1: Estado para el archivo y errores** — en `AdminActividades.jsx`, dentro del componente, añadir estado para el archivo seleccionado y para los detalles de error:

```js
  const [bundleFile, setBundleFile] = useState(null);
  const [errorDetails, setErrorDetails] = useState([]);
```

En `openCreate` y `openEdit`, resetear: `setBundleFile(null); setErrorDetails([]);`.

- [ ] **Step 2: Reemplazar el `handleSubmit` de creación por envío multipart** — sustituir el cuerpo de `handleSubmit` para que, **al crear** (sin `editTarget`), envíe `FormData` a `/upload`; al **editar**, mantener el `PUT` de metadatos actual (sin bundle). Código completo del handler:

```js
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    try {
      if (!editTarget) {
        // ── Crear: subir ZIP (multipart) ──
        if (!bundleFile) {
          throw new Error('Debes seleccionar el archivo .zip del juego.');
        }
        const fd = new FormData();
        fd.append('bundle', bundleFile);
        fd.append('type', form.type);
        fd.append('difficultyLevel', String(form.difficultyLevel));
        fd.append('therapeuticGoal', form.therapeuticGoal || '');
        fd.append('availableToTutors', String(form.availableToTutors));
        const res = await fetch(`${API_URL}/api/activities/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }, // NO fijar Content-Type: el navegador pone el boundary
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (Array.isArray(err.details)) setErrorDetails(err.details);
          throw new Error(err.message || 'Error al subir el juego');
        }
      } else {
        // ── Editar metadatos (sin bundle) ──
        const body = {
          title: form.title,
          type: form.type,
          therapeuticGoal: form.therapeuticGoal || null,
          difficultyLevel: Number(form.difficultyLevel),
          ageRange: {
            min: form.ageMin !== '' ? Number(form.ageMin) : null,
            max: form.ageMax !== '' ? Number(form.ageMax) : null,
          },
          durationMinutes: form.durationMinutes !== '' ? Number(form.durationMinutes) : null,
          availableToTutors: form.availableToTutors,
          thumbnailUrl: form.thumbnailUrl || null,
        };
        const res = await fetch(`${API_URL}/api/activities/${editTarget._id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error al guardar');
        }
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 3: Función para reemplazar bundle en edición** — añadir dentro del componente:

```js
  const handleReplaceBundle = async (file) => {
    if (!file || !editTarget) return;
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    try {
      const fd = new FormData();
      fd.append('bundle', file);
      const res = await fetch(`${API_URL}/api/activities/${editTarget._id}/bundle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (Array.isArray(err.details)) setErrorDetails(err.details);
        throw new Error(err.message || 'Error al reemplazar el bundle');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 4: Sustituir el campo URL bundle por el input de archivo** — reemplazar el bloque `<Field label="URL bundle / juego (placeholder)">...</Field>` (líneas ~287-291) por:

```jsx
              {!editTarget ? (
                <Field label="Archivo del juego (.zip)" required>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    required
                    onChange={(e) => setBundleFile(e.target.files?.[0] || null)}
                    className={INPUT_CLASS}
                  />
                  <p className="font-body text-xs text-text-soft mt-1">
                    Sube el .zip exportado por el Engine. El título, la edad y la duración se toman del manifest.
                  </p>
                </Field>
              ) : (
                <Field label="Reemplazar bundle del juego">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(e) => e.target.files?.[0] && handleReplaceBundle(e.target.files[0])}
                    className={INPUT_CLASS}
                  />
                  <p className="font-body text-xs text-text-soft mt-1">
                    Versión actual: {editTarget.gameVersion || '—'}. Subir un .zip reemplaza el juego (mismo gameId).
                  </p>
                </Field>
              )}
```

- [ ] **Step 5: Mostrar los detalles de error de validación** — justo después de la línea `{error && <p ...>{error}</p>}` (línea ~300), añadir:

```jsx
              {errorDetails.length > 0 && (
                <ul className="font-body text-xs text-red-500 list-disc pl-5 space-y-0.5">
                  {errorDetails.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
```

- [ ] **Step 6: Al crear, el título no es editable manualmente (viene del manifest)** — en el formulario, cuando `!editTarget`, el campo "Título" puede dejarse pero el backend usa el del manifest. Para evitar confusión, marcar el placeholder. Cambiar el input de título para mostrar una nota cuando se crea:

```jsx
              <Field label={editTarget ? 'Título' : 'Título (se tomará del manifest del juego)'} required={!!editTarget}>
                <input type="text" required={!!editTarget} value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={!editTarget}
                  className={INPUT_CLASS} placeholder={editTarget ? 'Ej: Espejo mágico' : 'Se completa desde el .zip'} />
              </Field>
```

- [ ] **Step 7: Verificación manual (smoke UI)**

Con server + client corriendo y sesión de admin:
1. Abrir Admin → Actividades → "Crear actividad". Verificar que aparece el input de archivo `.zip` (no el campo URL).
2. Seleccionar un `.zip` válido + tipo + dificultad → "Crear". Debe cerrarse el modal y aparecer la actividad en la tabla.
3. Subir un `.zip` con manifest inválido → debe mostrarse el mensaje + la lista de `details`.
4. Editar una actividad con bundle → usar "Reemplazar bundle" con un `.zip` del mismo `gameId` → éxito; con otro `gameId` → mensaje de no-coincidencia.

Expected: los 4 casos se comportan como se describe. (Esta verificación la ejecuta QA en Task 9.)

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/admin/AdminActividades.jsx
git commit -m "feat(admin-ui): subir y reemplazar bundle de juego desde Actividades"
```

---

### Task 9: Verificación de oro (E2E) + revisión de seguridad

**Files:**
- Create: `docs/qa-upload-bundle-juego.md` (registro de verificación)

**Interfaces:**
- Consumes: todo lo anterior, con server + client + MongoDB corriendo.
- Produces: evidencia documentada de que el flujo Engine→plataforma funciona de punta a punta y de que la superficie de subida es segura.

- [ ] **Step 1: Conseguir un ZIP real del Engine** — exportar **La Casa Mágica** desde el Engine (H2/H3) como `.zip`. Si no está disponible localmente, construir un bundle representativo válido (manifest conforme + `index.html` mínimo) como sustituto y dejarlo anotado.

- [ ] **Step 2: Delegar la verificación E2E al agente QA** — el agente `didactifonis-qa` ejecuta y documenta en `docs/qa-upload-bundle-juego.md`:
  - Suite unitaria: `node --test` (en `server/`) → todos los tests de Tasks 1-4 en verde.
  - Subida del ZIP real vía `POST /upload` → `201`; actividad creada con `gameId/gameVersion/bundleUrl`; archivos en `server/storage-data/game-bundles/<id>/`; contraprueba directa en MongoDB del documento `Activity`.
  - Asignar la actividad a un niño; abrir el `GameHost`; verificar que el iframe carga `bundleUrl` y el juego corre; completar y verificar `POST /results` → resultado registrado (contraprueba Mongo).
  - Re-subida (`PUT /:id/bundle`) versión nueva → `200`, swap correcto, sin carpetas `.old-*`.
  - Casos de rechazo: manifest inválido → `400`+details; `entryPoint` ausente → `400`; ZIP zip-slip → `400`; no-admin → `403`; `gameId` distinto en re-subida → `400`.

- [ ] **Step 3: Delegar la revisión de seguridad al agente `didactifonis-security`** — auditar: guards de extracción (zip-slip/symlink/bomb), CSP y cabeceras de `/games`, aislamiento del iframe, que el bundle no exponga PII, autorización admin-only, y manejo/limpieza de temporales. Reporta hallazgos; el arquitecto decide correcciones.

- [ ] **Step 4: Registrar el cierre** — completar `docs/qa-upload-bundle-juego.md` con veredictos (PASA/FALLA por criterio) y, si hay hallazgos de seguridad, listarlos con severidad.

- [ ] **Step 5: Commit**

```bash
git add docs/qa-upload-bundle-juego.md
git commit -m "test(qa): verificación E2E + seguridad de carga de bundle de juego"
```

---

## Notas de cierre

- Al terminar las 9 tareas, la rama `feature/upload-bundle-juego` queda lista para integrar a `master` (decisión del arquitecto + Emiliano).
- Pendiente fuera de alcance (registrado en el spec §10): subida de thumbnail como archivo, migración a nube/subdominio, cualquier cambio al contrato/Engine.
- Este corte cierra el **bloqueante de despliegue #2** del inventario de plataforma. Tras integrarlo, el siguiente ítem de la Tanda 1 es el `.env` de producción.
