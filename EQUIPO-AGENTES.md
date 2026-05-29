# Equipo de Agentes Didactifonis — Guía de uso

Esta guía explica cómo instalar y orquestar el sistema multi-agente en **Claude Code**.

## 1. Qué hay en este paquete

```
CLAUDE.md                    → Memoria global. Va en la raíz del proyecto.
design-system.md             → Tokens de diseño. Va en la raíz del proyecto.
EQUIPO-AGENTES.md            → Esta guía (referencia para el equipo humano).
docs/
  ├── especificacion-funcional.md  → Fuente de verdad funcional. Léela primero.
  └── marco-legal.md               → Informe de abogado (autoritativo). Lo usa security.
.claude/agents/
  ├── didactifonis-architect.md   → Tech Lead / orquestador
  ├── didactifonis-frontend.md    → UI / UX (Landing + App)
  ├── didactifonis-backend.md     → API y datos
  ├── didactifonis-qa.md          → Debugging
  └── didactifonis-security.md    → Seguridad y compliance
```

**Alcance del proyecto** (tenlo presente al hablar con el arquitecto): este repo entrega
la **Landing** (sitio público) y la **Plataforma** (app con roles). Los **juegos** son
externos: se suben y la plataforma los aloja, asigna y registra. No se construyen aquí.

Copia todo a la raíz de tu repositorio respetando esa estructura y haz commit. Así el
equipo comparte la misma configuración.

## 2. Cómo funcionan los subagentes (en corto)

Un **subagente** es una instancia de Claude Code con su **propio contexto limpio**, su
propio system prompt (el cuerpo de su archivo `.md`) y sus propias herramientas. No ve
el historial de tu conversación; solo recibe la tarea que se le delega y el `CLAUDE.md`.

Por qué importa para ti:

- **Ahorra tokens y evita alucinaciones.** El trabajo ruidoso (leer muchos archivos,
  correr tests, logs largos) ocurre en el contexto del subagente; a tu conversación
  principal solo vuelve un resumen. El contexto principal se mantiene limpio y enfocado.
- **Enfoca el comportamiento.** Cada agente solo sabe hacer su trabajo y solo tiene las
  herramientas de su trabajo. El de QA no puede reescribir archivos enteros; el de
  seguridad no puede modificar código. Eso es intencional.

Límite clave: **un subagente no puede crear otros subagentes.** Solo la sesión principal
delega. Por eso el arquitecto se ejecuta *como* sesión principal (ver abajo).

## 3. El modelo de orquestación

```
        Tú  ──hablas con──►  ARQUITECTO  (sesión principal)
                                  │
                 ┌────────────────┼────────────────┬─────────────┐
                 ▼                ▼                ▼             ▼
            frontend          backend             qa         security
            (subagente)      (subagente)      (subagente)   (subagente)
```

El arquitecto planifica, divide la tarea y delega cada parte al especialista. Cada
especialista trabaja aislado y devuelve un resumen. El arquitecto revisa, integra y te
reporta. Tú hablas casi siempre solo con el arquitecto.

**Para arrancar una sesión orquestada**, ejecuta el arquitecto como sesión principal:

```bash
claude --agent didactifonis-architect
```

Así el hilo principal toma el rol de Tech Lead y puede delegar a los otros cuatro.
También puedes fijarlo por defecto en `.claude/settings.json`:

```json
{ "agent": "didactifonis-architect" }
```

Para tareas sueltas sin orquestar, puedes invocar un agente directamente con `@`:

```
@didactifonis-qa revisa el error de la consola
```

## 4. Instalar superpowers (flujo de desarrollo)

`superpowers` aporta un flujo disciplinado de 7 fases (brainstorm → spec → plan → TDD →
desarrollo → review → finalize). Instálalo como plugin:

```
/plugin marketplace add obra/superpowers-marketplace
```

El arquitecto ya está instruido para apoyarse en este flujo (`/brainstorm`,
`/write-plan`, `/execute-plan`). Revisa los nombres exactos de comandos tras instalar.

## 5. Conectar la base de datos (agente backend)

El agente `didactifonis-backend` declara el MCP oficial de MongoDB en **modo solo
lectura** (`--readOnly`), para inspeccionar esquemas sin riesgo de escrituras
accidentales. Antes de usarlo, define la variable de entorno con tu cadena de conexión:

```bash
export MDB_MCP_CONNECTION_STRING="mongodb+srv://usuario:clave@cluster/..."
```

Usa una cuenta de servicio con permisos mínimos. Nunca pongas la cadena en el código ni
la subas al repositorio.

## 6. Skills recomendadas

- **`frontend-design`** (oficial de Anthropic) — ya precargada en el agente frontend.
- **`webapp-testing`** (oficial) — ya precargada en el agente QA (navegador real).
- Instala las skills oficiales con `/plugin` desde el marketplace de Anthropic.

No instales más de lo necesario: cada skill consume contexto.

## 7. Anti-alucinación y anti-bucles (resumen de los mecanismos)

- `CLAUDE.md` corto y siempre verdadero → menos ruido en cada agente.
- Herramientas acotadas por agente → cada uno solo hace lo suyo.
- `maxTurns` en los agentes ejecutores → tope duro de iteraciones.
- QA sin herramienta `Write` → imposible reescribir archivos completos.
- Regla "si falla 2 veces, detente y reporta" → corta los loops infinitos.
- Trabajar siempre en modo plan antes de construir → menos retrabajo.

## 8. Capricho opcional: visualización de agentes

Si quieres *ver* a los agentes trabajar como personajes:

- **Pixel Agents** — extensión de VS Code; cada agente es un personaje en una oficina
  pixel art. Es la opción más directa si usas VS Code.
- **Miniverse** — mundo pixel vía hooks HTTP. Si lo usas, **córrelo siempre local**,
  nunca el mundo público: la plataforma maneja datos de menores.

Son capas de observabilidad; no afectan el código ni la calidad. Instalación aparte.
