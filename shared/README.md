# /shared — directorio vacío (puntero)

Las constantes del contrato de juego (`ROLES`, `CONTRACT_VERSION`, `EVENT_TYPES`,
`EVENTS_INGEST_CAP`, `RESULT_CONTRACT_SHAPE`) ya NO viven aquí.

Fueron promovidas al paquete **`@didactifonis/contract`** en el repo hermano
`C:\didactifonis-contract` (tarea B-0, 2026-06-11).

## Como consumirlas

```js
// CJS (server)
const { EVENT_TYPES, CONTRACT_VERSION } = require('@didactifonis/contract');

// ESM (client/Vite)
import { EVENT_TYPES, CONTRACT_VERSION } from '@didactifonis/contract';
```

La dependencia se declara en `server/package.json` y `client/package.json` como:

```json
"@didactifonis/contract": "file:../../didactifonis-contract"
```

**No recrear `index.js` ni `index.cjs` aquí.** Editar directamente el repo
`didactifonis-contract` y hacer commit allí.
