/**
 * UI E2E test: MTS-GOLD price display & P&L calculation (Playwright)
 * Usage: node scripts/ui-e2e-mtsgold.cjs
 * Requires: dev server running (npm run dev)
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  console.log('Opening app...');
  await page.goto(`${BASE_URL}/#/portfolio`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Add MTS-GOLD to Core section — no THB checkbox needed, treated as USD asset
  const addBtns = page.locator('button:has-text("+ Add")');
  console.log(`Add buttons found: ${await addBtns.count()}`);
  await addBtns.last().click();
  await page.waitForTimeout(500);

  await page.locator('input[placeholder="TICKER"]').fill('MTS-GOLD');

  // shares = oz weight
  await page.locator('input[min="0"][step="0.0001"]').last().fill('0.5');

  // cost = USD/oz (entry price)
  await page.locator('input[placeholder="USD/sh"]').fill('3800');

  // Confirm — no THB checkbox needed
  await page.locator('button').filter({ hasText: '✓' }).last().click();
  console.log('MTS-GOLD added (0.5 oz, cost $3800/oz). Waiting for price fetch...');
  await page.waitForTimeout(8000);

  // Read MTS-GOLD row from table
  let found = false;
  for (const row of await page.locator('tr').all()) {
    const text = await row.innerText();
    if (text.includes('MTS-GOLD')) {
      const cells = text.split('\t').map(s => s.trim()).filter(Boolean);
      console.log('\n=== MTS-GOLD row ===');
      ['ticker', 'shares', 'cost', 'price', 'mktVal', 'pnl'].forEach((k, i) => {
        if (cells[i]) console.log(`  ${k.padEnd(8)}: ${cells[i]}`);
      });
      const priceOk = cells[3] && cells[3].includes('$') && !cells[3].includes('$0');
      console.log(`\nPrice populated: ${priceOk ? 'PASS ✓' : 'FAIL ✗'}`);
      found = true;
      break;
    }
  }
  if (!found) console.log('FAIL ✗ — MTS-GOLD row not found in table');

  // Verify API values
  const api = await page.evaluate(async () => {
    const r = await fetch('/api/prices?symbols=VOO');
    return r.json();
  });
  console.log(`\nAPI — xauUsd: $${api.xauUsd} | fxRate: ${api.fxRate}`);
  console.log(`Market value: 0.5 oz × $${api.xauUsd} × ${api.fxRate} = ฿${Math.round(0.5 * api.xauUsd * api.fxRate).toLocaleString()}`);

  await page.screenshot({ path: 'scripts/last-run.png' });
  console.log('\nScreenshot saved: scripts/last-run.png');

  await browser.close();
})();
