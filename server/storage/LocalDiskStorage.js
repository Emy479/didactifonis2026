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
