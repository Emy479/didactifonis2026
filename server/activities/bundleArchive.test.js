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

/**
 * buildRawZip — construye un ZIP binario a mano sin validación de rutas.
 * Necesario para fixtures de zip-slip: yazl v3 rechaza rutas con '..' en el API,
 * así que usamos bytes crudos para crear el archivo de prueba.
 */
function buildRawZip(name, data) {
  return new Promise((resolve) => {
    const nameBuf = Buffer.from(name);
    const dataBuf = Buffer.from(data);

    // CRC32 (IEEE 802.3)
    let crc = 0xFFFFFFFF;
    for (const byte of dataBuf) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
      }
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0;

    // Local file header (30 + name)
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);   // stored
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    // Central directory
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(dataBuf.length, 20);
    cd.writeUInt32LE(dataBuf.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);       // external attrs (no symlink)
    cd.writeUInt32LE(0, 42);       // local header offset
    nameBuf.copy(cd, 46);

    const localSize = local.length + dataBuf.length;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(localSize, 16);
    eocd.writeUInt16LE(0, 20);

    const buf = Buffer.concat([local, dataBuf, cd, eocd]);
    const zipPath = path.join(tmpDir(), 'bundle.zip');
    fs.writeFile(zipPath, buf, () => resolve(zipPath));
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
  // yazl v3 rechaza '../' en su API, por lo que usamos un ZIP binario crudo
  // para simular un archivo malicioso que burlaría la validación del cliente.
  const zipPath = await buildRawZip('../evil.txt', 'x');
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
