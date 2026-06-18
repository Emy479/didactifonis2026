/**
 * storage/index.js — instancia única de almacenamiento configurada por entorno.
 * El resto de la app importa de aquí; no instancia LocalDiskStorage directamente.
 *
 * GAME_PUBLIC_ORIGIN apunta al origen dedicado que sirve los bundles (puerto propio).
 * En producción debe ser un subdominio, p.ej. https://juegos.<dominio>, servido por
 * reverse-proxy hacia GAME_PUBLIC_PORT. Así los bundles HTML/JS no confiables se
 * aíslan del origen de la API (hallazgo A1).
 */
const path = require('path');
const LocalDiskStorage = require('./LocalDiskStorage');

const baseDir = process.env.GAME_STORAGE_DIR || path.join(__dirname, '..', 'storage-data', 'game-bundles');
// baseUrl usa GAME_PUBLIC_ORIGIN (origen del listener de bundles), no API_BASE_URL.
const baseUrl = process.env.GAME_PUBLIC_ORIGIN || 'http://localhost:3002';

module.exports = new LocalDiskStorage({ baseDir, baseUrl });
