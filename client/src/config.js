// Configuración de entorno del cliente. Único lugar donde se resuelve la URL del backend.
// En producción, definir VITE_API_URL en el build (ver client/.env.example).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
