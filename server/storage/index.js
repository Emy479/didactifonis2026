/**
 * storage/index.js — instancia única de almacenamiento configurada por entorno.
 * El resto de la app importa de aquí; no instancia LocalDiskStorage directamente.
 */
const path = require('path');
const LocalDiskStorage = require('./LocalDiskStorage');

const baseDir = process.env.GAME_STORAGE_DIR || path.join(__dirname, '..', 'storage-data', 'game-bundles');
const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

module.exports = new LocalDiskStorage({ baseDir, baseUrl });
