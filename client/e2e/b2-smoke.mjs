/**
 * b2-smoke.mjs — Arnés E2E B-2: SDK real ↔ GameHost en dev.
 *
 * Uso: node e2e/b2-smoke.mjs <B2_ASSIGNMENT_ID>
 *
 * Requiere:
 *   - MongoDB corriendo con seed:smoke-e2 ejecutado.
 *   - Express en http://localhost:3001.
 *   - Vite en http://localhost:5173.
 *   - Servidor estático engine en http://127.0.0.1:8788.
 *   - Playwright (devDependency del cliente) con chromium instalado.
 */

import { chromium } from '../node_modules/playwright/index.mjs';

// ── Configuración ─────────────────────────────────────────────────────────────
const ASSIGNMENT_ID = process.argv[2];
if (!ASSIGNMENT_ID) {
  console.error('[arnés] ERROR: debes pasar el B2_ASSIGNMENT_ID como argumento.');
  console.error('  Uso: node e2e/b2-smoke.mjs <id>');
  process.exit(1);
}

const APP_URL     = 'http://localhost:5173';
const API_URL     = 'http://localhost:3001';
const GAME_URL    = `${APP_URL}/nino/game/${ASSIGNMENT_ID}`;
const SUCCESS_TXT = '¡Lo hiciste genial!';
const TIMEOUT_MS  = 45_000;

// ── Estado del arnés ──────────────────────────────────────────────────────────
let token = null;
let user  = null;
const consoleLogs = [];
let assertPassCount = 0;
let assertFailCount = 0;

// ── Utilidades ────────────────────────────────────────────────────────────────
function log(msg) {
  console.log(`[arnés] ${msg}`);
}

function fail(msg) {
  console.error(`[arnés] FALLO: ${msg}`);
}

// ── PASO 1: Login API ─────────────────────────────────────────────────────────
async function doLogin() {
  log('Iniciando sesión via API…');
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo-tutor@didactifonis.dev', password: 'Demo1234!' }),
  });

  if (!res.ok) {
    throw new Error(`Login falló: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  // El servidor devuelve { token, user } (o variante con accessToken)
  token = body.token || body.accessToken;
  user  = body.user;

  if (!token || !user) {
    throw new Error(`Login OK pero respuesta inesperada: ${JSON.stringify(body).slice(0, 200)}`);
  }

  log(`Login OK. user.role=${user.role} user.email=${user.email}`);
  return { token, user };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`=== Arnés B-2 iniciando. AssignmentId: ${ASSIGNMENT_ID} ===`);

  // 1. Login
  await doLogin();

  // 2. Lanzar Chromium headless
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Sembrar localStorage ANTES de navegar (addInitScript se ejecuta antes de cada page load)
  // H-4 auditoría B-2: solo actuar en el frame principal para no filtrar JWT al iframe sandboxed.
  await context.addInitScript(({ t, u }) => {
    if (window === window.top) {
      localStorage.setItem('auth_token', t);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }
  }, { t: token, u: user });

  const page = await context.newPage();

  // 3. Capturar consola (todos los frames: la página host + el iframe del bundle)
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });

    // Contabilizar aserciones machine-readable del bundle
    if (text.includes('[B2-ASSERT] PASS:')) {
      assertPassCount++;
      log(`  ASSERT PASS capturado: ${text}`);
    } else if (text.includes('[B2-ASSERT] FAIL:')) {
      assertFailCount++;
      fail(`  ASSERT FAIL capturado: ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
    log(`  pageerror: ${err.message}`);
  });

  // 4. Navegar a la URL del juego
  log(`Navegando a ${GAME_URL} …`);
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });

  // 4-B. Captura temprana del #ctxBox: poll cada 200 ms buscando el frame del bundle
  // ANTES de que el GameHost desmonte el iframe al llegar a SUCCESS.
  let ctxBoxEarlyText = null;
  {
    const CTX_POLL_MS   = 200;
    const CTX_MAX_TRIES = 100; // 20 s máximo de espera
    log('Iniciando polling de #ctxBox en iframe del bundle…');
    for (let i = 0; i < CTX_MAX_TRIES; i++) {
      const frames = page.frames();
      const gameFrame =
        frames.find((f) => f.url().includes('test-game-b2')) ||
        frames.find((f) => f !== page.mainFrame() && f.url() !== page.url());
      if (gameFrame) {
        try {
          const txt = await gameFrame.locator('#ctxBox').textContent({ timeout: 1000 });
          if (txt && txt.includes('{')) {
            ctxBoxEarlyText = txt.trim();
            log(`#ctxBox capturado en intento ${i + 1}: ${ctxBoxEarlyText.slice(0, 120)}…`);
            break;
          }
        } catch (_) {
          // ctxBox aún no existe o está vacío — seguir esperando
        }
      }
      await page.waitForTimeout(CTX_POLL_MS);
    }
    if (!ctxBoxEarlyText) {
      log('WARN: #ctxBox no capturado antes del desmontaje del iframe (el flujo continúa).');
    }
  }

  // 5. Esperar texto de éxito del GameHost
  log(`Esperando pantalla de éxito ("${SUCCESS_TXT}") — timeout ${TIMEOUT_MS / 1000} s…`);
  try {
    await page.waitForSelector(`text="${SUCCESS_TXT}"`, { timeout: TIMEOUT_MS });
    log(`Pantalla de éxito detectada.`);
  } catch (e) {
    fail(`Timeout esperando "${SUCCESS_TXT}": ${e.message}`);
    // Capturar screenshot para diagnóstico
    const ssPath = '/tmp/b2-smoke-timeout.png';
    await page.screenshot({ path: ssPath }).catch(() => {});
    log(`Screenshot guardado en ${ssPath}`);
    await browser.close();
    printSummary(false, 'Timeout esperando pantalla de éxito');
    process.exit(1);
  }

  // 6. Verificar aserciones del bundle
  // Dar 1 s extra para que todos los console.log del bundle lleguen
  await page.waitForTimeout(1000);

  log(`Aserciones capturadas: PASS=${assertPassCount}, FAIL=${assertFailCount}`);

  // Playwright captura los console.log del bundle desde AMBOS frames (host + iframe),
  // por lo que cada assert aparece duplicado (x2). La condición acepta 5 o 10 PASS.
  // Lo invariante: que haya exactamente 5 aserciones PASS únicas y 0 FAIL.
  // Usamos el conjunto de textos únicos para contar las 5 afirmaciones distintas.
  const uniquePassTexts = new Set(
    consoleLogs
      .filter((l) => l.text.includes('[B2-ASSERT] PASS:'))
      .map((l) => l.text.trim())
  );
  const uniquePassCount = uniquePassTexts.size;
  log(`Aserciones PASS únicas: ${uniquePassCount} — textos: ${[...uniquePassTexts].join(' | ')}`);

  let assertionsOk = false;
  if (uniquePassCount === 5 && assertFailCount === 0) {
    log('VERDE: exactamente 5 aserciones [B2-ASSERT] PASS distintas y 0 FAIL.');
    assertionsOk = true;
  } else {
    fail(`Aserciones fuera de spec: esperadas 5 PASS únicos / 0 FAIL, obtenidas ${uniquePassCount} únicos / ${assertFailCount} FAIL.`);
  }

  // 7. Capturar evidencia de seguridad
  log('Capturando evidencia de seguridad…');

  // 7-A: JSON del contexto recibido por el bundle.
  // Preferimos ctxBoxEarlyText (capturado antes del desmontaje via polling).
  // Si no se capturó (iframe desmontado antes de que el poll lo alcanzara),
  // intentamos leerlo desde el frame post-éxito o desde los logs de consola.
  let ctxBoxText = ctxBoxEarlyText || '(no disponible)';
  if (!ctxBoxEarlyText) {
    try {
      const allFrames = page.frames();
      const gameFrame =
        allFrames.find((f) => f.url().includes('test-game-b2')) ||
        allFrames.find((f) => f !== page.mainFrame() && f.url() !== page.url());
      if (gameFrame) {
        log(`Frame del bundle encontrado post-éxito: "${gameFrame.url() || '(sandboxed — URL vacía)'}"`);
        ctxBoxText = await gameFrame.locator('#ctxBox').textContent({ timeout: 5000 });
      } else {
        log('WARN: frame del bundle no encontrado post-éxito. Frames disponibles:');
        allFrames.forEach((f) => log(`  frame url: "${f.url()}"`));
        // Alternativa: leer el ctxBox desde el log de consola capturado
        const ctxLog = consoleLogs.find((l) => l.text.startsWith('Contexto: '));
        if (ctxLog) {
          ctxBoxText = ctxLog.text.replace('Contexto: ', '');
        }
      }
    } catch (e) {
      log(`WARN: no se pudo leer #ctxBox del frame post-éxito: ${e.message}`);
    }
  }

  // 7-B: Estado del storage del host (verificar ausencia de sessionToken)
  const storageState = await page.evaluate(() => {
    return JSON.stringify({
      ls: Object.keys(localStorage),
      ss: Object.keys(sessionStorage),
      url: location.href,
    });
  });

  const storageObj = JSON.parse(storageState);
  const lsKeys = storageObj.ls;
  const ssKeys = storageObj.ss;
  const hostUrl = storageObj.url;

  // Verificar que no hay sessionToken en localStorage/sessionStorage/URL del host
  const tokenLeakInLs  = lsKeys.some((k) => /session.*token|^token$|jwt/i.test(k));
  const tokenLeakInSs  = ssKeys.some((k) => /session.*token|^token$|jwt/i.test(k));
  const tokenLeakInUrl = /sessionToken|jwt=/i.test(hostUrl);
  const storageOk = !tokenLeakInLs && !tokenLeakInSs && !tokenLeakInUrl;

  log(`localStorage keys del host: [${lsKeys.join(', ')}]`);
  log(`sessionStorage keys del host: [${ssKeys.join(', ')}]`);
  log(`URL del host: ${hostUrl}`);
  log(`No-fuga en storage/URL: ${storageOk ? 'OK' : 'FALLO'}`);

  await browser.close();
  log('Browser cerrado.');

  // 8. Imprimir log completo de consola capturado
  log('=== LOG DE CONSOLA CAPTURADO ===');
  const relevantLogs = consoleLogs.filter((l) =>
    l.text.includes('[B2-ASSERT]') ||
    l.text.includes('[GameHost]') ||
    l.text.includes('[SDK]') ||
    l.text.includes('[B2]') ||
    l.type === 'pageerror' ||
    l.type === 'error'
  );
  relevantLogs.forEach((l) => console.log(`  [${l.type}] ${l.text}`));
  log('=== FIN LOG CONSOLA ===');

  // 9. Resumen final
  const allGreen = assertionsOk && storageOk;
  printSummary(allGreen, null, {
    ctxBoxText,
    storageObj,
    assertPassCount,
    assertFailCount,
    storageOk,
  });

  process.exit(allGreen ? 0 : 1);
}

function printSummary(ok, errMsg, details) {
  console.log('\n' + '='.repeat(60));
  console.log(`VEREDICTO ARNÉS B-2: ${ok ? 'VERDE' : 'ROJO'}`);
  if (errMsg) console.log(`  Error: ${errMsg}`);
  if (details) {
    console.log(`  Aserciones B2-ASSERT: PASS=${details.assertPassCount} FAIL=${details.assertFailCount}`);
    console.log(`  No-fuga storage/URL: ${details.storageOk ? 'OK' : 'FALLO'}`);
    console.log('\n  === CONTEXTO RECIBIDO POR EL BUNDLE ===');
    console.log(details.ctxBoxText);
    console.log('\n  === ESTADO STORAGE HOST ===');
    console.log(JSON.stringify(details.storageObj, null, 2));
  }
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  fail(`Error inesperado: ${err.message}\n${err.stack}`);
  process.exit(1);
});
