/* =========================================================================
   CertPay — calculation & compliance engine
   Pure logic, no DOM. Runs in the browser and under Node (for tests).
   ========================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const num   = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const r2    = n => Math.round((+n || 0) * 100) / 100;
const money = n => (isFinite(n) ? n : 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const hrs   = n => { n = r2(n); return n ? String(n) : ''; };

/* ---------------------------------------------------------------------
   OVERTIME
   Davis-Bacon (federal): premium applies to hours over 40 in the week.
   The premium is 1.5x the BASE rate only — fringe is paid on every hour
   at the straight rate and is NEVER multiplied.

   California: daily overtime on top of the weekly rule.
     > 8 hrs in a day      -> 1.5x
     > 12 hrs in a day     -> 2.0x
     7th consecutive day   -> first 8 hrs at 1.5x, beyond 8 at 2.0x
     > 40 straight hrs/wk  -> 1.5x
   --------------------------------------------------------------------- */

function splitFederal(projHrs, otherHrs) {
  const all = projHrs + otherHrs;
  const totalOT = Math.max(0, all - 40);
  // Allocate the week's overtime to this project in proportion to project hours.
  const projOT = all > 0 ? Math.min(projHrs, totalOT * (projHrs / all)) : 0;
  const ot = r2(projOT);
  return { st: r2(projHrs - ot), ot, dt: 0 };
}

function splitCalifornia(daily) {
  const per = [];
  let streak = 0;
  for (const raw of daily) {
    const h = num(raw);
    if (h <= 0) { streak = 0; per.push({ st: 0, ot: 0, dt: 0 }); continue; }
    streak++;
    let st = 0, ot = 0, dt = 0;
    if (streak === 7) {                       // 7th consecutive day worked
      ot = Math.min(h, 8);
      if (h > 8) dt = h - 8;
    } else {
      st = Math.min(h, 8);
      if (h > 8)  ot = Math.min(h - 8, 4);    // hours 8-12
      if (h > 12) dt = h - 12;                // hours beyond 12
    }
    per.push({ st, ot, dt });
  }
  // Weekly 40-hour rule: shift straight-time above 40 into overtime,
  // taking it from the latest days first so earlier days read naturally.
  let totalST = per.reduce((s, d) => s + d.st, 0);
  let excess = totalST - 40;
  for (let i = per.length - 1; i >= 0 && excess > 1e-9; i--) {
    const move = Math.min(per[i].st, excess);
    per[i].st -= move; per[i].ot += move; excess -= move;
  }
  const sum = k => r2(per.reduce((s, d) => s + d[k], 0));
  return { st: sum('st'), ot: sum('ot'), dt: sum('dt'), per: per.map(d => ({ st: r2(d.st), ot: r2(d.ot), dt: r2(d.dt) })) };
}

/* Chronological allocation for the federal weekly rule: the first hours of
   the week are straight time until the ST budget is exhausted, the rest are
   overtime. Produces the natural "10,10,10,10 / 8" reading on the form. */
function allocateFederal(daily, stTotal, otTotal) {
  let st = stTotal, ot = otTotal;
  return daily.map(raw => {
    let h = num(raw);
    const s = Math.min(h, st); st -= s; h -= s;
    const o = Math.min(h, ot); ot -= o;
    return { st: r2(s), ot: r2(o), dt: 0 };
  });
}

/* --------------------------------------------------------------- line calc */
function findClass(ctx, id) { return (ctx.classes || []).find(c => c.id === id) || null; }

function calcLine(line, ctx) {
  const cls = findClass(ctx, line.classId);
  const reqBase   = cls ? num(cls.base)   : 0;
  const reqFringe = cls ? num(cls.fringe) : 0;

  const has = v => v !== '' && v !== null && v !== undefined;
  const base   = has(line.baseOverride)   ? num(line.baseOverride)   : reqBase;
  const fringe = has(line.fringeOverride) ? num(line.fringeOverride) : reqFringe;

  const daily   = (line.hours || []).map(num);
  const projHrs = r2(daily.reduce((a, b) => a + b, 0));
  const otherHrs = num(line.otherHours);

  const split = ctx.jurisdiction === 'ca'
    ? splitCalifornia(daily)
    : splitFederal(projHrs, otherHrs);

  // Per-day straight/overtime/double breakdown, for the printed form.
  const perDay = split.per || allocateFederal(daily, split.st, split.ot);

  // Cash fringe rides on every hour at the straight rate; it is never multiplied.
  const cashFringe = line.fringePaid === 'cash' ? fringe : 0;
  const stRate = base + cashFringe;
  const otRate = base * 1.5 + cashFringe;
  const dtRate = base * 2.0 + cashFringe;

  const grossST = split.st * stRate;
  const grossOT = split.ot * otRate;
  const grossDT = split.dt * dtRate;
  const gross   = grossST + grossOT + grossDT;

  const d = line.ded || {};
  const fica = line.autoFica !== false ? gross * 0.0765 : num(d.fica);
  const sdi  = ctx.jurisdiction === 'ca'
    ? (line.autoSdi !== false ? gross * 0.011 : num(d.sdi))
    : 0;

  const extraKeys = ['vac','hw','pension','training','fundadmin','dues','travel','savings','other'];
  const extras = extraKeys.reduce((s, k) => s + num(d[k]), 0);

  const ded = fica + sdi + num(d.fed) + num(d.state) + extras;
  const net = gross - ded;

  const allProjGross = has(line.allProjGross) ? num(line.allProjGross) : gross;

  return {
    cls, reqBase, reqFringe, reqPackage: reqBase + reqFringe,
    base, fringe, actualPackage: base + fringe,
    projHrs, otherHrs, perDay,
    stH: split.st, otH: split.ot, dtH: split.dt,
    stRate, otRate, dtRate,
    grossST, grossOT, grossDT, gross, allProjGross,
    fica, sdi, ded, net
  };
}

function calcTotals(lines, ctx) {
  const t = { count: lines.length, hours: 0, st: 0, ot: 0, dt: 0, gross: 0, ded: 0, net: 0 };
  for (const l of lines) {
    const r = calcLine(l, ctx);
    t.hours += r.projHrs; t.st += r.stH; t.ot += r.otH; t.dt += r.dtH;
    t.gross += r.gross;   t.ded += r.ded; t.net += r.net;
  }
  ['hours','st','ot','dt'].forEach(k => t[k] = r2(t[k]));
  return t;
}

/* --------------------------------------------------------------- validator */
/* Returns [{lv:'e'|'w'|'o', t:title, m:message}] — the errors that actually
   get certified payrolls rejected or produce back-wage findings.            */
function validate(ctx) {
  const out = [];
  const E = (t, m) => out.push({ lv: 'e', t, m });
  const W = (t, m) => out.push({ lv: 'w', t, m });

  const { company = {}, project = {}, payroll = {}, classes = [], lines = [], people = [] } = ctx;
  const ca = ctx.jurisdiction === 'ca';
  const person = id => people.find(p => p.id === id) || {};

  if (!String(company.name || '').trim())  E('Contractor name missing', 'The form cannot be submitted without the contractor or subcontractor name.');
  if (!String(company.addr || '').trim())  W('Contractor address missing', 'Required in the header of both WH-347 and A-1-131.');
  if (!String(project.name || '').trim())  E('Project and location missing', 'Identify the project the way the contract does.');
  if (!payroll.weekEnding)                 E('Week ending date missing', 'Every certified payroll covers one specific workweek.');
  if (!String(payroll.num || '').trim())   W('Payroll number missing', 'Number payrolls consecutively from 1 so the agency can spot a gap.');
  if (!String((payroll.statement || {}).name || '').trim())
    W('Statement of Compliance unsigned', 'The certification needs a name and title or the submission is incomplete.');
  if (!classes.length) E('No wage determination rates entered', 'Without rates CertPay cannot verify you are paying the prevailing wage.');
  if (!lines.length)   E('No workers on this payroll', 'If nobody worked on site this week, submit a "no work performed" payroll for the week instead.');

  if (ca) {
    if (!String(company.license || '').trim())  W('CSLB license number missing', 'Form A-1-131 has a dedicated field for the contractor licence number.');
    if (!String(company.pwcr || '').trim())     W('DIR registration number missing', 'Public works contractors must be registered with the DIR and show the registration number.');
    if (!String(project.dirId || '').trim())    W('DIR Project ID missing', 'Needed to submit through the eCPR portal.');
  }

  classes.forEach(c => {
    if (!String(c.name || '').trim()) W('Unnamed classification', 'A rate row has no title — it must match the determination wording exactly.');
    if (num(c.base) <= 0) E('Missing base rate for "' + (c.name || 'untitled') + '"', 'Enter the hourly base rate from the wage determination.');
  });

  lines.forEach(l => {
    const r = calcLine(l, ctx);
    const p = person(l.personId);
    const who = String(p.name || '').trim() || 'Unnamed worker';

    if (!String(p.name || '').trim()) E('Worker name missing', 'Every payroll line needs a named worker.');
    if (!String(p.ssn4 || '').trim()) W(who + ' — no identifying number', 'Use the last 4 digits of the SSN.');
    if (String(p.ssn4 || '').replace(/\D/g, '').length > 4)
      E(who + ' — full SSN entered', 'Federal WH-347 submissions must show only the last 4 digits. Remove the rest before filing.');
    if (ca && !String(p.addr || '').trim())
      W(who + ' — address missing', 'Form A-1-131 requires the employee address, unlike the federal WH-347.');
    if (!l.classId) E(who + ' — no work classification', 'Assign the classification from your wage determination.');

    if (r.cls) {
      if (r.base + 1e-4 < r.reqBase && l.fringePaid !== 'cash')
        E(who + ' — base rate below determination',
          'Paying $' + money(r.base) + '/hr against a required base of $' + money(r.reqBase) + '/hr. This is a back-wage finding.');
      if (r.actualPackage + 1e-4 < r.reqPackage) {
        const shortHr = r.reqPackage - r.actualPackage;
        E(who + ' — total package below prevailing wage',
          'Base + fringe is $' + money(r.actualPackage) + '/hr but the determination requires $' + money(r.reqPackage) +
          '/hr. Short $' + money(shortHr) + '/hr on ' + hrs(r.projHrs) + ' hours \u2248 $' + money(shortHr * r.projHrs) + ' owed.');
      }
    }

    if (r.otH > 0 && r.otRate + 1e-4 < r.base * 1.5)
      E(who + ' — overtime underpaid', 'Overtime must be at least 1.5\u00d7 the base rate.');
    if (r.dtH > 0 && r.dtRate + 1e-4 < r.base * 2)
      E(who + ' — double time underpaid', 'California double time must be at least 2\u00d7 the base rate.');
    if (r.net < 0) E(who + ' — negative net wages', 'Deductions exceed gross pay. Check the deduction entries.');
    if (r.projHrs === 0) W(who + ' — no hours entered', 'Remove the worker from this payroll or record their hours.');
    if (r.projHrs > 60) W(who + ' — ' + hrs(r.projHrs) + ' hours this week', 'Unusually high. Verify against daily time records; auditors compare the two.');
    if (r.gross > 0 && r.ded / r.gross > 0.35)
      W(who + ' — deductions are ' + Math.round(r.ded / r.gross * 100) + '% of gross',
        'Large deductions draw scrutiny. Anything beyond taxes and authorized items must be explained on the certification.');
    if (ca && !String(l.checkNo || '').trim())
      W(who + ' — check number missing', 'Form A-1-131 has a check number column; the DIR uses it to trace payment.');
    if (l.fringePaid === 'plan' && r.reqFringe > 0 && (payroll.statement || {}).fringeMode === 'cash')
      W(who + ' — fringe method conflicts with the certification', 'Worker is marked plan-paid but the statement elects cash (4b).');
  });

  if (lines.some(l => num(l.otherHours) > 0) && ctx.jurisdiction !== 'ca')
    W('Split-week workers present',
      'Overtime for workers with hours on other jobs is allocated to this project in proportion to project hours. Keep the other job\u2019s records with this payroll.');

  if (!out.length)
    out.push({ lv: 'o', t: 'No issues found', m: 'Rates, classifications, overtime and deductions all check out. Print, sign the certification, and submit on time.' });

  return out;
}

const errorCount = ctx => validate(ctx).filter(f => f.lv === 'e').length;

return { DAYS, num, r2, money, hrs, splitFederal, splitCalifornia, allocateFederal, calcLine, calcTotals, validate, errorCount };
});
