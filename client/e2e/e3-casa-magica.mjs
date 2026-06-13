/**
 * e3-casa-magica.mjs — Arnés E2E H2: Piloto 1 "La Casa Mágica" en GameHost.
 *
 * Uso: node e2e/e3-casa-magica.mjs <ASSIGNMENT_ID>
 *
 * Requiere:
 *   - MongoDB corriendo con seed ejecutado (B2_BUNDLE_URL apuntando a casa-magica).
 *   - Express en http://localhost:3001.
 *   - Vite en http://localhost:5173.
 *   - Servidor estatico engine en http://127.0.0.1:8788 (npm run serve:b2 en repo engine).
 *   - Playwright (devDependency del cliente) con chromium instalado.
 *
 * Estrategia de juego: mecanismo (b) — window.__demoAutoplay() en la demo.
 * El engine es canvas Phaser puro (sin DOM markup de aserciones).
 * El hook simula 10 rondas (24 objetos, 10 por sesion) disparando callbacks del
 * sessionState directamente. El outroHigh del juego ("!Increible! Ordenaste la
 * casa como todo un experto.") se renderiza en canvas Phaser (dentro del iframe,
 * inaccesible al DOM del host). La pantalla de exito es la del GameHost React
 * ("!Lo hiciste genial!"), que si esta en el DOM. El veredicto final se apoya
 * en la contraprueba Mongo (verifyE3Result.js).
 */

import { chromium } from '../node_modules/playwright/index.mjs';

const ASSIGNMENT_ID = process.argv[2];
if (!ASSIGNMENT_ID) {
  console.error('[e3-arnes] ERROR: debes pasar el assignmentId como argumento.');
  process.exit(1);
}

const APP_URL      = 'http://localhost:5173';
const API_URL      = 'http://localhost:3001';
const GAME_URL     = APP_URL + '/nino/game/' + ASSIGNMENT_ID;
const SUCCESS_TXT  = '¡Lo hiciste genial!';
const TIMEOUT_AUTOPLAY_MS = 30000;
const TIMEOUT_SUCCESS_MS  = 20000;

function log(msg) { console.log('[e3-arnes] ' + msg); }
function fail(msg) { console.error('[e3-arnes] FALLO: ' + msg); }

async function doLogin() {
  log('Login via API...');
  const res = await fetch(API_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo-tutor@didactifonis.dev', password: 'Demo1234!' }),
  });
  if (!res.ok) throw new Error('Login fallo: ' + res.status);
  const body = await res.json();
  const token = body.token || body.accessToken;
  const user  = body.user;
  if (!token || !user) throw new Error('Respuesta login inesperada');
  log('Login OK. role=' + user.role);
  return { token, user };
}

async function main() {
  log('=== Arnes E3-H2 Casa Magica iniciando. AssignmentId: ' + ASSIGNMENT_ID + ' ===');

  const { token, user } = await doLogin();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();

  await ctx.addInitScript(({ t, u }) => {
    if (window === window.top) {
      localStorage.setItem('auth_token', t);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }
  }, { t: token, u: user });

  const page = await ctx.newPage();
  const consoleLogs = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (
      text.includes('[autoplay]') ||
      text.includes('[SDK]') ||
      text.includes('[GameHost]') ||
      text.includes('[DidactifonisEngine]') ||
      msg.type() === 'error'
    ) {
      log('  console[' + msg.type() + ']: ' + text);
    }
  });

  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
    log('  pageerror: ' + err.message);
  });

  log('Navegando a ' + GAME_URL + ' ...');
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });

  log('Esperando que el iframe del juego sea montado por GameHost...');
  let iframeHandle = null;
  try {
    await page.waitForSelector('iframe[src*="casa-magica"]', { timeout: 15000 });
    log('Iframe del engine detectado (src contiene casa-magica).');
    iframeHandle = await page.$('iframe[src*="casa-magica"]');
  } catch (_) {
    log('WARN: iframe con src demo-engine-h1 no detectado; buscando cualquier iframe...');
    try {
      await page.waitForSelector('iframe', { timeout: 10000 });
      iframeHandle = await page.$('iframe');
      log('Iframe generico detectado.');
    } catch (e2) {
      fail('Ningun iframe encontrado en el DOM: ' + e2.message);
      await browser.close();
      process.exit(1);
    }
  }

  if (!iframeHandle) {
    fail('No se encontro handle del iframe.');
    await browser.close();
    process.exit(1);
  }

  const gameFrame = await iframeHandle.contentFrame();
  if (!gameFrame) {
    fail('contentFrame() devolvio null (iframe inaccesible).');
    await browser.close();
    process.exit(1);
  }
  log('Frame del engine obtenido. URL: "' + gameFrame.url() + '"');

  log('Esperando window.__demoAutoplay en el frame del engine...');
  try {
    await gameFrame.waitForFunction(
      () => typeof window.__demoAutoplay === 'function',
      { timeout: TIMEOUT_AUTOPLAY_MS }
    );
    log('window.__demoAutoplay disponible.');
  } catch (e) {
    fail('window.__demoAutoplay no disponible en ' + TIMEOUT_AUTOPLAY_MS + 'ms: ' + e.message);
    const ssPath = '/tmp/e3-h1-autoplay-timeout.png';
    await page.screenshot({ path: ssPath }).catch(() => {});
    log('Screenshot guardado: ' + ssPath);
    await browser.close();
    process.exit(1);
  }

  log('Invocando window.__demoAutoplay()...');
  let autoplayResult = false;
  try {
    autoplayResult = await gameFrame.evaluate(() => window.__demoAutoplay());
  } catch (e) {
    fail('Error al ejecutar __demoAutoplay: ' + e.message);
    await browser.close();
    process.exit(1);
  }

  if (!autoplayResult) {
    fail('__demoAutoplay() retorno false (sessionState no listo o error interno).');
    await browser.close();
    process.exit(1);
  }
  log('__demoAutoplay() completado con exito. Esperando pantalla de exito...');

  let successOk = false;
  try {
    await page.waitForSelector('text="' + SUCCESS_TXT + '"', { timeout: TIMEOUT_SUCCESS_MS });
    log('Pantalla de exito detectada: "' + SUCCESS_TXT + '"');
    successOk = true;
  } catch (e) {
    fail('Timeout esperando pantalla de exito: ' + e.message);
    const ssPath = '/tmp/e3-h1-success-timeout.png';
    await page.screenshot({ path: ssPath }).catch(() => {});
    log('Screenshot guardado: ' + ssPath);
  }

  await page.waitForTimeout(1000);

  const storageState = await page.evaluate(() => JSON.stringify({
    ls: Object.keys(localStorage),
    ss: Object.keys(sessionStorage),
    url: location.href,
  }));
  const storageObj = JSON.parse(storageState);
  const tokenLeakInLs  = storageObj.ls.some((k) => /session.*token|^sessionToken$|jwt/i.test(k));
  const tokenLeakInSs  = storageObj.ss.some((k) => /session.*token|^sessionToken$|jwt/i.test(k));
  const tokenLeakInUrl = /sessionToken|jwt=/i.test(storageObj.url);
  const storageOk = !tokenLeakInLs && !tokenLeakInSs && !tokenLeakInUrl;
  log('localStorage keys del host: [' + storageObj.ls.join(', ') + ']');
  log('sessionStorage keys del host: [' + storageObj.ss.join(', ') + ']');
  log('No-fuga sessionToken en storage/URL: ' + (storageOk ? 'OK' : 'FALLO'));

  await browser.close();
  log('Browser cerrado.');

  log('=== LOG DE CONSOLA RELEVANTE ===');
  consoleLogs
    .filter((l) =>
      l.text.includes('[autoplay]') ||
      l.text.includes('[SDK]') ||
      l.text.includes('[GameHost]') ||
      l.text.includes('[DidactifonisEngine]') ||
      l.type === 'pageerror' ||
      l.type === 'error'
    )
    .forEach((l) => console.log('  [' + l.type + '] ' + l.text));
  log('=== FIN LOG CONSOLA ===');

  const allGreen = successOk && storageOk;
  console.log('');
  console.log('============================================================');
  console.log('VEREDICTO ARNES E3-H2-CASA-MAGICA: ' + (allGreen ? 'VERDE' : 'ROJO'));
  console.log('  autoplay:              ' + (autoplayResult ? 'OK' : 'FALLO'));
  console.log('  pantalla exito GameHost: ' + (successOk ? 'OK' : 'FALLO'));
  console.log('  no-fuga storage/URL:   ' + (storageOk ? 'OK' : 'FALLO'));
  console.log('============================================================');
  console.log('');

  process.exit(allGreen ? 0 : 1);
}

main().catch((err) => {
  fail('Error inesperado: ' + err.message);
  process.exit(1);
});
