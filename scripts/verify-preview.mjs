/**
 * Independent, offline-first browser acceptance checks.
 * Run after starting Vite: node scripts/verify-preview.mjs
 * Optional: PREVIEW_URL, PLAYWRIGHT_CHROMIUM_EXECUTABLE, PREVIEW_EVIDENCE_DIR.
 * A production backend request is intercepted, blocked, and fails the run.
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const baseURL = process.env.PREVIEW_URL || 'http://127.0.0.1:8087';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('This suite must run against a local preview, never a deployed site.');
}
const evidenceDir = path.resolve(process.env.PREVIEW_EVIDENCE_DIR || '.local-verification/acceptance');
await mkdir(evidenceDir, { recursive: true });
const installedChrome = path.join(homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const results = [];
const blockedBackend = [];
const unexpectedRemote = [];
const backendSockets = [];
const runtimeErrors = [];
const downloadableFiles = [];
const safeName = value => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const purposes = ['build', 'research', 'initiative', 'decision'];

async function check(name, width, operation) {
  try {
    const detail = await operation();
    results.push({ name, width, status: 'passed', ...(detail ? { detail } : {}) });
    console.log(`PASS ${width} ${name}`);
  } catch (error) {
    results.push({ name, width, status: 'failed', error: error.message });
    console.error(`FAIL ${width} ${name}: ${error.message}`);
  }
}

async function visit(page, pathname) {
  await page.goto(`${baseURL}${pathname}`, { waitUntil: 'networkidle' });
  await page.locator('main').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function download(page, button, label, extension) {
  const pending = page.waitForEvent('download');
  await button.click();
  const item = await pending;
  assert.ok(item.suggestedFilename().toLowerCase().endsWith(extension), `Unexpected download: ${item.suggestedFilename()}`);
  const destination = path.join(evidenceDir, `${label}${extension}`);
  await item.saveAs(destination);
  const metadata = await stat(destination);
  assert.ok(metadata.size > 300, 'Downloaded report was unexpectedly empty');
  if (extension === '.pdf') assert.equal((await readFile(destination)).subarray(0, 4).toString(), '%PDF');
  if (extension === '.md') assert.match(await readFile(destination, 'utf8'), /## (Recommendation|Sources)/);
  downloadableFiles.push({ path: destination, bytes: metadata.size });
}

for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'blob:' || url.protocol === 'data:' || url.origin === new URL(baseURL).origin) return route.continue();
    if (/supabase|preview\.invalid|ai\.gateway|anthropic|openai/.test(url.hostname)) {
      blockedBackend.push({ width, url: url.href });
      return route.abort('blockedbyclient');
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    unexpectedRemote.push({ width, url: url.href });
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => runtimeErrors.push({ width, page: page.url(), error: error.message }));
  page.on('websocket', socket => {
    if (new URL(socket.url()).hostname !== new URL(baseURL).hostname) backendSockets.push({ width, url: socket.url() });
  });

  for (const pathname of ['/', '/examples', '/about', '/simulate', ...purposes.map(purpose => `/simulate?example=${purpose}`), '/signal', '/auth', '/my-simulations', '/hub', '/portfolio']) {
    await check(`route ${pathname}`, width, async () => {
      await visit(page, pathname);
      assert.ok(await page.locator('h1').count(), 'Route must have an accessible page heading');
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert.ok(dimensions.document <= dimensions.viewport, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
      await page.screenshot({ path: path.join(evidenceDir, `${safeName(pathname) || 'home'}-${width}.jpg`), type: 'jpeg', quality: 78, fullPage: true });
      return { url: page.url(), title: await page.title() };
    });
  }

  await check('reduced motion is respected', width, async () => {
    await visit(page, '/');
    assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
    const duration = await page.locator('.studio-button').first().evaluate(element => getComputedStyle(element).transitionDuration);
    assert.equal(duration, '0s');
  });

  await check('home starter waits for deliberate review', width, async () => {
    await visit(page, '/');
    await page.getByRole('button', { name: 'Try a starting question' }).click();
    assert.equal(new URL(page.url()).pathname, '/');
    assert.match(await page.getByRole('textbox', { name: 'Your question or idea' }).inputValue(), /independent coaches/);
    assert.equal(await page.getByRole('status').count(), 0);
  });

  await check('custom question and purpose reach the workbench unchanged', width, async () => {
    await visit(page, '/');
    const question = 'What does A&B need from a partner program? Compare growth and cost.';
    await page.getByRole('radio', { name: 'Company or topic' }).check();
    await page.getByRole('textbox', { name: 'Your question or idea' }).fill(question);
    await page.getByRole('button', { name: "Let's work it through" }).click();
    await page.getByRole('textbox', { name: 'Your question', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('purpose'), 'research');
    assert.equal(await page.getByRole('textbox', { name: 'Your question', exact: true }).inputValue(), question);
    assert.equal(await page.locator('.work-report').count(), 0, 'Question handoff must not start analysis');
  });

  await check('purpose switches preserve the latest typed question', width, async () => {
    await visit(page, '/simulate?purpose=research&question=Original%20question%20to%20edit');
    const edited = 'Keep this newly edited question while I change the lens.';
    await page.getByRole('textbox', { name: 'Your question', exact: true }).fill(edited);
    await page.getByRole('button', { name: 'Business initiative', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Your question', exact: true }).inputValue(), edited);
    await page.getByRole('button', { name: 'Idea or app', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Your idea or app', exact: true }).inputValue(), edited);
    const buildEdit = 'Keep this new build question as I switch to a decision.';
    await page.getByRole('textbox', { name: 'Your idea or app', exact: true }).fill(buildEdit);
    await page.getByRole('button', { name: 'Decision or disagreement', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Your question', exact: true }).inputValue(), buildEdit);
  });

  await check('local live-analysis attempt keeps input and explains isolation', width, async () => {
    await visit(page, '/simulate?purpose=research&question=A%20useful%20research%20question%20about%20partnerships');
    await page.getByRole('button', { name: 'Think it through', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /disconnected|preview/i);
    assert.match(await page.getByRole('textbox', { name: 'Your question', exact: true }).inputValue(), /partnerships/);
  });

  await check('research report has sources and expandable perspectives', width, async () => {
    await visit(page, '/simulate?example=research');
    const sourceLinks = page.locator('#evidence a[href^="https://"]');
    assert.ok(await sourceLinks.count() >= 1, 'Research report needs evidence links');
    assert.match(await page.locator('#evidence').innerText(), /does not verify a claim/);
    const skeptic = page.locator('.perspective-row').nth(1);
    await skeptic.locator('summary').click();
    await skeptic.getByRole('button', { name: 'Keep this insight' }).click();
    assert.ok(await skeptic.getByRole('button', { name: /Kept for this session/ }).isVisible());
    assert.ok(await page.getByRole('heading', { name: 'Insights kept in this session' }).isVisible());
  });

  for (const purpose of ['research', 'initiative', 'decision']) {
    await check(`${purpose} Markdown and PDF exports`, width, async () => {
      await visit(page, `/simulate?example=${purpose}`);
      await download(page, page.getByRole('button', { name: 'Markdown', exact: true }), `${purpose}-${width}`, '.md');
      await download(page, page.getByRole('button', { name: 'PDF', exact: true }), `${purpose}-${width}`, '.pdf');
    });
  }
  await check('legacy build PDF export', width, async () => {
    await visit(page, '/simulate?example=build');
    await download(page, page.getByRole('button', { name: 'PDF', exact: true }), `build-${width}`, '.pdf');
  });

  await check('signal sample never claims to scan the supplied topic', width, async () => {
    await visit(page, '/signal');
    await page.getByRole('textbox', { name: 'Industry, niche, or topic' }).fill('Raleigh partner programs');
    await page.getByRole('button', { name: 'Scan this', exact: true }).click();
    assert.match(await page.locator('main').innerText(), /Illustrative sample.*not a scan of your topic/);
    assert.ok(!(await page.locator('main').innerText()).includes('Results for “Raleigh partner programs”'));
    assert.equal(await page.getByText(/Scan complete/).count(), 0);
  });

  await check('auth remains visible with correctly labeled inputs', width, async () => {
    await visit(page, '/auth');
    assert.equal(new URL(page.url()).pathname, '/auth');
    assert.ok(await page.getByRole('textbox', { name: 'Email', exact: true }).isVisible());
    assert.ok(await page.getByLabel('Password', { exact: true }).isVisible());
  });

  await check('legacy projects hash opens the matching section', width, async () => {
    await visit(page, '/about');
    await visit(page, '/#projects');
    const position = await page.locator('#projects').boundingBox();
    assert.ok(position && position.y >= 65 && position.y < 140, `Project anchor hidden by navigation or not scrolled: ${JSON.stringify(position)}`);
  });

  if (width === 390) {
    await check('mobile menu works by keyboard and restores focus', width, async () => {
      await visit(page, '/');
      const toggle = page.getByRole('button', { name: 'Open navigation' });
      await toggle.focus(); await page.keyboard.press('Enter');
      assert.ok(await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible());
      await page.keyboard.press('Escape');
      assert.ok(await toggle.evaluate(element => document.activeElement === element));
      await toggle.click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Examples', exact: true }).click();
      assert.equal(new URL(page.url()).pathname, '/examples');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    });
    await check('purpose radios have 44px targets and keyboard selection', width, async () => {
      await visit(page, '/');
      const radios = page.getByRole('radio');
      await radios.nth(0).focus(); await page.keyboard.press('ArrowRight');
      assert.ok(await radios.nth(1).isChecked());
      for (const label of await page.locator('.studio-starter').all()) {
        const rect = await label.boundingBox();
        assert.ok(rect && rect.height >= 44 && rect.width >= 44, 'Purpose target is smaller than 44px');
      }
    });
  }
  await context.close();
}

await browser.close();
await check('no production backend requests or sockets', 'all', async () => {
  assert.deepEqual(blockedBackend, []);
  assert.deepEqual(backendSockets, []);
});
await check('no unexpected remote assets', 'all', async () => { assert.deepEqual(unexpectedRemote, []); });
await check('no uncaught browser errors', 'all', async () => { assert.deepEqual(runtimeErrors, []); });
const summary = { at: new Date().toISOString(), baseURL, totals: { passed: results.filter(result => result.status === 'passed').length, failed: results.filter(result => result.status === 'failed').length }, results, blockedBackend, backendSockets, unexpectedRemote, runtimeErrors, downloadableFiles };
await writeFile(path.join(evidenceDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.totals));
process.exitCode = summary.totals.failed ? 1 : 0;
