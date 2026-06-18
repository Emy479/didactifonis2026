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
    const backup = path.join(this.baseDir, '.old-' + String(activityId) + '-' + Date.now());
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

  /**
   * sweepOrphans() — borra entradas cuyo basename empieza por '.tmp-' o '.old-'.
   * Se invoca al arrancar para limpiar carpetas que quedaron huérfanas por
   * procesos interrumpidos (crash durante upload/replace).
   * Idempotente: no lanza si baseDir está vacío o no existe.
   * @returns {number} cantidad de entradas borradas (útil para log).
   */
  sweepOrphans() {
    let removed = 0;
    let entries;
    try {
      entries = fs.readdirSync(this.baseDir);
    } catch {
      // baseDir inexistente o ilegible: nada que barrer
      return 0;
    }
    for (const name of entries) {
      if (name.startsWith('.tmp-') || name.startsWith('.old-')) {
        try {
          fs.rmSync(path.join(this.baseDir, name), { recursive: true, force: true });
          removed++;
        } catch (err) {
          // log mínimo pero no propaga; el servidor debe seguir arrancando
          console.warn(`[storage] sweepOrphans: no se pudo borrar ${name}: ${err.message}`);
        }
      }
    }
    return removed;
  }

  root() {
    return this.baseDir;
  }
}

module.exports = LocalDiskStorage;
