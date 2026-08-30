/* Generate Play Store screenshots (1080x1920) — node shots.js */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

const seedFederal = () => {
  const p = P();
  p.jurisdiction = 'federal';
  Object.assign(p.company, { name:'Acme Electric LLC', addr:'118 Bay Street, Brunswick, GA 31520', role:'subcontractor' });
  Object.assign(p.project, { name:'Glynn County Elementary School — Brunswick, GA', contract:'ED-2026-114', wd:'GA20260012 Mod 4' });
  Object.assign(p.payroll, { num:'7', weekEnding:'2026-08-14' });
  Object.assign(p.payroll.statement, { name:'Dana Whitfield', title:'Owner', fringeMode:'cash' });
  p.classes = [
    { id:'c1', name:'Electrician',       base:'34.85', fringe:'14.20' },
    { id:'c2', name:'Laborer, Group 1',  base:'19.40', fringe:'8.65'  },
    { id:'c3', name:'Operator, Backhoe', base:'28.15', fringe:'11.90' }
  ];
  p.people = []; p.lines = [];
  const mk = (id, nm, s4, cl, hours, ded) => {
    p.people.push({ id, name:nm, ssn4:s4, addr:'', exempt:'2' });
    p.lines.push({ id:'l'+id, personId:id, classId:cl, hours, otherHours:'', baseOverride:'',
      fringeOverride:'', fringePaid:'cash', autoFica:true, checkNo:'', allProjGross:'', ded });
  };
  mk('p1','Marcus Bell','4417','c1',[0,10,10,10,10,8,0],{fed:'310'});
  mk('p2','Dana Whitfield','8823','c2',[0,8,8,8,8,8,0],{fed:'142'});
  mk('p3','Luis Ortega','2094','c3',[0,9,9,8,8,8,4],{fed:'188'});
  Store.save(); UI.renderAll();
};

const seedUnderpay = () => { const p = P(); p.lines[0].baseOverride = '30.00'; p.lines[0].fringeOverride = '10.00'; Store.save(); UI.renderAll(); };
const seedCA = () => {
  const p = P();
  p.jurisdiction = 'ca';
  Object.assign(p.company, { name:'Sierra Mechanical Inc.', addr:'4120 Almond Ave, Fresno, CA 93720',
    license:'1043928', pwcr:'1000012345', wc:'WC-8841203' });
  Object.assign(p.project, { name:'Fresno USD Science Wing — Fresno, CA', contract:'FUSD-2026-088', dirId:'412977' });
  p.classes = [
    { id:'c1', name:'Electrician (Inside Wireman)', base:'54.15', fringe:'28.40' },
    { id:'c2', name:'Laborer, Group 1',             base:'34.20', fringe:'22.15' }
  ];
  p.people = []; p.lines = [];
  const mk = (id, nm, s4, ad, cl, hours, chk) => {
    p.people.push({ id, name:nm, ssn4:s4, addr:ad, exempt:'2' });
    p.lines.push({ id:'l'+id, personId:id, classId:cl, hours, otherHours:'', baseOverride:'',
      fringeOverride:'', fringePaid:'cash', autoFica:true, autoSdi:true, checkNo:chk, allProjGross:'', ded:{fed:'420',state:'180'} });
  };
  mk('p1','Ana Delgado','7731','221 Fig St, Fresno','c1',[0,10,10,10,10,0,0],'10440');
  mk('p2','Kyle Barrett','1188','88 Palm Ave, Clovis','c2',[0,14,8,8,8,8,0],'10441');
  Store.save(); UI.renderAll();
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/app/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.evaluate(seedFederal);
  await page.waitForTimeout(400);

  await page.evaluate(() => UI.go('hours'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'store/screens/1-hours.png' });

  await page.evaluate(() => UI.go('review'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'store/screens/2-clean.png' });

  await page.evaluate(seedUnderpay);
  await page.evaluate(() => UI.go('review'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'store/screens/3-underpayment.png' });

  await page.evaluate(() => { const p = P(); p.lines[0].baseOverride=''; p.lines[0].fringeOverride=''; Store.save(); UI.renderAll(); });
  await page.evaluate(() => UI.go('pay'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'store/screens/4-pay.png' });

  await page.evaluate(seedCA);
  await page.evaluate(() => UI.go('review'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'store/screens/5-california.png' });

  await browser.close();
  console.log('screenshots written to store/screens/');
})().catch(e => { console.error(e); process.exit(1); });
