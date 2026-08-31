/* CertPay end-to-end UI tests — node e2e.js
   Drives the real app in Chromium and fails on any console error. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok  = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : ' FAIL ') + n); };
const eqs = (n, got, want) => { const c = String(got) === String(want);
  c ? pass++ : fail++; console.log((c ? '  ok  ' : ' FAIL ') + n + (c ? '' : `  (got "${got}", want "${want}")`)); };
const sec = s => console.log('\n\x1b[1m' + s + '\x1b[0m');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  /* ---------------------------------------------------- marketing site */
  sec('Marketing site');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  eqs('homepage title', (await page.title()).includes('CertPay'), true);
  ok('hero headline renders', (await page.locator('h1').first().innerText()).length > 20);
  ok('pricing section present', await page.locator('#pricing').count() === 1);
  ok('three pricing tiers', await page.locator('.p').count() === 3);

  await page.goto(BASE + '/guides/certified-payroll-overtime-fringe-benefits/', { waitUntil: 'networkidle' });
  sec('Guide calculator (live JS)');
  const out0 = await page.locator('#out').innerText();
  ok('calculator renders a result', /Gross this week/.test(out0));
  ok('default inputs are compliant', /Meets the determination/.test(out0));
  ok('OT rate shown as 66.48', /66\.48/.test(out0));
  await page.fill('#pb', '30.00'); await page.fill('#pf', '10.00');
  await page.waitForTimeout(120);
  const out1 = await page.locator('#out').innerText();
  ok('underpayment detected in guide calc', /Below the determination/.test(out1));
  ok('shortfall dollar figure shown', /\$9\.05\/hr/.test(out1));

  /* ------------------------------------------------------------- app */
  sec('App — federal workflow');
  await page.goto(BASE + '/app/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  eqs('starts on Setup tab', await page.locator('.panel.on').getAttribute('data-p'), 'setup');
  eqs('jurisdiction badge', (await page.locator('#jBadge').innerText()).trim(), 'FEDERAL WH-347');

  await page.fill('#c_name', 'Acme Electric LLC');
  await page.fill('#c_addr', '118 Bay St, Brunswick, GA 31520');
  await page.fill('#j_name', 'Glynn County Elementary — Brunswick, GA');
  await page.fill('#j_contract', 'ED-2026-114');
  await page.fill('#p_num', '1');
  await page.fill('#p_weekEnding', '2026-08-14');
  await page.waitForTimeout(150);
  eqs('week start auto-computed', await page.inputValue('#p_weekStart'), '2026-08-08');

  await page.click('button[data-t="rates"]');
  await page.click('text=Load example set');
  await page.waitForTimeout(200);
  eqs('4 example classifications', await page.locator('#ratesTbl tbody tr').count(), 4);
  ok('total package computed', (await page.locator('#ratesTbl tbody tr').first().innerText()).includes('49.05'));

  await page.click('button[data-t="crew"]');
  await page.click('text=+ Add worker');
  await page.waitForTimeout(150);
  const nameInput = page.locator('#crewTbl tbody tr').first().locator('input').first();
  await nameInput.fill('Marcus Bell');
  await page.locator('#crewTbl tbody tr').first().locator('input').nth(1).fill('4417');
  await page.waitForTimeout(150);
  ok('worker added to crew', (await page.locator('#crewTbl tbody tr').count()) === 1);

  sec('App — hours & overtime');
  await page.click('button[data-t="hours"]');
  await page.waitForTimeout(150);
  const hourInputs = page.locator('.hourgrid input.h');
  // Mon-Fri 9.6h each = 48
  for (const i of [1,2,3,4,5]) await hourInputs.nth(i).fill('9.6');
  await page.waitForTimeout(250);
  const row = page.locator('.hourgrid tbody tr').first();
  eqs('total hours = 48', (await row.locator('.c-tot').innerText()).trim(), '48');
  eqs('straight time = 40', (await row.locator('.c-st').innerText()).trim(), '40');
  eqs('overtime = 8', (await row.locator('.c-ot').innerText()).trim(), '8');

  sec('App — pay calculation');
  await page.click('button[data-t="pay"]');
  await page.waitForTimeout(200);
  const payTxt = await page.locator('#payList').innerText();
  ok('gross is $2,493.80', payTxt.includes('2,493.80'));
  ok('ST rate $49.05 shown', payTxt.includes('49.05'));
  ok('OT rate $66.48 shown', payTxt.includes('66.48'));
  ok('FICA auto-calculated', payTxt.includes('190.78'));

  sec('App — compliance validator');
  await page.click('button[data-t="review"]');
  await page.waitForTimeout(250);
  let checks = await page.locator('#checks').innerText();
  ok('warns about unsigned statement', /unsigned|Statement of Compliance/i.test(checks));
  await page.fill('#s_name', 'Dana Whitfield');
  await page.fill('#s_title', 'Owner');
  await page.click('button[data-t="setup"]'); await page.click('button[data-t="review"]');
  await page.waitForTimeout(250);
  checks = await page.locator('#checks').innerText();
  ok('clean payroll passes', /No issues found/.test(checks));
  eqs('error badge shows tick', (await page.locator('#tabs .badge').innerText()).trim(), '✓');

  const kpi = await page.locator('#kpi').innerText();
  ok('KPI gross correct', kpi.includes('2,493.80'));
  ok('KPI hours correct', /48/.test(kpi));

  sec('App — underpayment is caught');
  await page.click('button[data-t="pay"]');
  await page.waitForTimeout(150);
  await page.locator('#payList input').first().fill('30.00');
  await page.waitForTimeout(150);
  await page.locator('#payList input').nth(1).fill('10.00');
  await page.waitForTimeout(250);
  await page.click('button[data-t="review"]');
  await page.waitForTimeout(250);
  checks = await page.locator('#checks').innerText();
  ok('underpayment flagged', /below prevailing wage/i.test(checks));
  ok('exact back-wage figure given (48hrs x $9.05 = $434.40)', /434\.40/.test(checks));
  ok('error badge is numeric', /^\d+$/.test((await page.locator('#tabs .badge').innerText()).trim()));
  // restore
  await page.click('button[data-t="pay"]');
  await page.locator('#payList input').first().fill('');
  await page.locator('#payList input').nth(1).fill('');
  await page.waitForTimeout(200);

  sec('App — persistence across reload');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  eqs('contractor name persisted', await page.inputValue('#c_name'), 'Acme Electric LLC');
  await page.click('button[data-t="hours"]');
  await page.waitForTimeout(200);
  eqs('hours persisted', (await page.locator('.hourgrid tbody tr').first().locator('.c-tot').innerText()).trim(), '48');

  sec('App — free plan limits');
  await page.click('button[data-t="crew"]');
  for (let i = 0; i < 14; i++) { await page.click('text=+ Add worker'); await page.waitForTimeout(60); }
  eqs('15 workers allowed', await page.locator('#crewTbl tbody tr').count(), 15);
  ok('limit banner shown', (await page.locator('#crewLock').innerText()).includes('limit reached'));
  await page.click('text=+ Add worker');
  await page.waitForTimeout(200);
  ok('16th worker opens upgrade dialog', await page.locator('#upgradeDlg[open]').count() === 1);
  await page.evaluate(() => document.getElementById('upgradeDlg').close());

  sec('App — California engine');
  await page.click('button[data-t="setup"]');
  await page.selectOption('#f_jur', 'ca');
  await page.waitForTimeout(350);
  eqs('badge switches to CA', (await page.locator('#jBadge').innerText()).trim(), 'CALIFORNIA A-1-131');
  ok('CA-only fields appear', await page.locator('#c_license').isVisible());
  await page.click('button[data-t="hours"]');
  await page.waitForTimeout(250);
  const caRow = page.locator('.hourgrid tbody tr').first();
  ok('DT column present in CA', await caRow.locator('.c-dt').count() === 1);
  // 4x10 schedule => 32 ST / 8 OT under CA daily rule
  const caH = page.locator('.hourgrid tbody tr').first().locator('input.h');
  for (const i of [0,1,2,3,4,5,6]) await caH.nth(i).fill('0');
  for (const i of [1,2,3,4]) await caH.nth(i).fill('10');
  await page.waitForTimeout(300);
  eqs('CA 4x10: total 40', (await caRow.locator('.c-tot').innerText()).trim(), '40');
  eqs('CA 4x10: ST 32', (await caRow.locator('.c-st').innerText()).trim(), '32');
  eqs('CA 4x10: OT 8 (federal would say 0)', (await caRow.locator('.c-ot').innerText()).trim(), '8');
  // 14h day -> 8 ST / 4 OT / 2 DT
  for (const i of [2,3,4]) await caH.nth(i).fill('0');
  await caH.nth(1).fill('14');
  await page.waitForTimeout(300);
  eqs('CA 14h day: ST 8', (await caRow.locator('.c-st').innerText()).trim(), '8');
  eqs('CA 14h day: OT 4', (await caRow.locator('.c-ot').innerText()).trim(), '4');
  eqs('CA 14h day: DT 2', (await caRow.locator('.c-dt').innerText()).trim(), '2');

  sec('App — printed form renders');
  await page.evaluate(() => { Form.render(); });
  await page.waitForTimeout(200);
  const printHTML = await page.locator('#print').innerHTML();
  ok('CA form title rendered', /PUBLIC WORKS PAYROLL REPORTING FORM/.test(printHTML));
  ok('CA form has 2 sheets', (printHTML.match(/class="sheet/g) || []).length === 2);
  ok('certification text present', /penalty of perjury/i.test(printHTML));
  ok('watermark on free plan', /CertPay Free/.test(printHTML));

  await page.click('button[data-t="setup"]');
  await page.selectOption('#f_jur', 'federal');
  await page.waitForTimeout(300);
  await page.evaluate(() => { Form.render(); });
  const fedHTML = await page.locator('#print').innerHTML();
  ok('federal form renders', /Form WH-347/.test(fedHTML));
  ok('federal has OMB number', /1235-0008/.test(fedHTML));
  ok('federal Copeland Act text', /Copeland Act/.test(fedHTML));
  ok('federal has 2 sheets', (fedHTML.match(/class="sheet/g) || []).length === 2);

  sec('App — multi-project');
  await page.evaluate(() => { localStorage.setItem('certpay.pro','1'); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  eqs('pro badge active', (await page.locator('#planTag').innerText()).trim(), 'PRO');
  await page.evaluate(() => { window.__p = prompt; window.prompt = () => 'Second Job'; });
  await page.click('text=+ New project');
  await page.waitForTimeout(300);
  eqs('two projects in switcher', await page.locator('#projSel option').count(), 2);
  await page.evaluate(() => { Form.render(); });
  ok('no watermark on pro', !/CertPay Free/.test(await page.locator('#print').innerHTML()));

  sec('App — PWA assets');
  const mf = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
  eqs('manifest name', mf.name, 'CertPay — Certified Payroll');
  eqs('manifest display', mf.display, 'standalone');
  eqs('manifest icon count', mf.icons.length, 4);
  ok('has maskable icon', mf.icons.some(i => i.purpose === 'maskable'));
  const sw = await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length));
  ok('service worker registered', sw >= 1);

  sec('App — mobile viewport');
  const mob = await ctx.newPage();
  await mob.goto(BASE + '/app/', { waitUntil: 'networkidle' });
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.waitForTimeout(300);
  ok('mobile nav visible', await mob.locator('nav.tabs').isVisible());
  ok('FAB next button visible', await mob.locator('.fab .btn').last().isVisible());
  const hOverflow = await mob.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
  ok('no horizontal page overflow on mobile', hOverflow);
  await mob.close();

  sec('Console errors');
  const real = errors.filter(e => !/favicon|manifest|Download the React/i.test(e));
  ok('no console errors (' + real.length + ')', real.length === 0);
  if (real.length) real.slice(0, 8).forEach(e => console.log('      ' + e.slice(0, 180)));

  await browser.close();
  console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + ' passed, ' + fail + ' failed\x1b[0m\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
