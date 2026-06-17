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
      const fail = (e) => { if (!settled) { settled = true; zip.close(); reject(e); } };

      zip.on('error', (zipErr) => {
        // yauzl v3 emits path validation errors as zip errors; map them to ZIP_SLIP.
        const msg = zipErr && zipErr.message ? zipErr.message : '';
        if (msg.startsWith('invalid relative path') || msg.startsWith('absolute path')) {
          return fail(new BundleError('ZIP_SLIP', 400, 'Ruta no permitida en el ZIP: ' + msg));
        }
        fail(new BundleError('ZIP_INVALID', 400, 'No se pudo leer el ZIP.'));
      });
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
