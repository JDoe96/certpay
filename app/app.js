/* =========================================================================
   CertPay — application shell
   Multi-project, offline-first. All data stays in the browser.
   ========================================================================= */
'use strict';
const { DAYS, num, r2, money, hrs, calcLine, calcTotals, validate, errorCount } = Engine;

const CONFIG = { freeMaxWorkers: 5, freeMaxProjects: 1, watermark: true, pro: false };

const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const $  = id => document.getElementById(id);

/* ------------------------------------------------------------------ model */
function blankProject(name) {
  return {
    id: uid(),
    label: name || 'New project',
    jurisdiction: 'federal',
    freq: 'weekly',
    company: { name:'', addr:'', role:'contractor', license:'', pwcr:'', wc:'' },
    project: { name:'', contract:'', wd:'', agency:'', dirId:'' },
    payroll: { num:'1', weekEnding:'', final:'no',
               statement:{ name:'', title:'', fringeMode:'cash', exceptions:'', remarks:'' } },
    classes: [],
    people:  [],
    lines:   []
  };
}
let DB = { v: 3, activeId: null, projects: [] };
const P  = () => DB.projects.find(p => p.id === DB.activeId) || DB.projects[0];
const CA = () => P().jurisdiction === 'ca';

/* ---------------------------------------------------------------- storage */
const Store = {
  key: 'certpay.db.v3',
  save() { try { localStorage.setItem(this.key, JSON.stringify(DB)); } catch (e) { UI.toast('Could not save — storage full?'); } },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) { const d = JSON.parse(raw); if (d && d.projects && d.projects.length) { DB = d; return; } }
      const legacy = localStorage.getItem('certpay.v2');
      if (legacy) { Store.migrate(JSON.parse(legacy)); return; }
    } catch (e) {}
    DB = { v:3, activeId:null, projects:[ blankProject('My first project') ] };
    DB.activeId = DB.projects[0].id;
  },
  migrate(old) {
    const p = blankProject(old.project?.name || 'Imported project');
    p.company = Object.assign(p.company, old.contractor || {});
    p.project = Object.assign(p.project, old.project  || {});
    p.payroll = Object.assign(p.payroll, old.payroll  || {});
    p.payroll.statement = Object.assign(p.payroll.statement, old.statement || {});
    p.classes = old.classes || [];
    (old.workers || []).forEach(w => {
      const pid = uid();
      p.people.push({ id: pid, name: w.name, ssn4: w.idNum, addr: '', exempt: w.exempt });
      p.lines.push({ id: uid(), personId: pid, classId: w.classId, hours: w.hours,
        otherHours: w.otherHours, baseOverride: w.baseOverride, fringeOverride: w.fringeOverride,
        fringePaid: w.fringePaid, autoFica: w.autoFica, checkNo: '', ded: w.ded || {} });
    });
    DB = { v:3, activeId:p.id, projects:[p] };
    Store.save();
  },
  backup() {
    const p = P();
    const name = 'certpay-' + (p.payroll.weekEnding || 'draft') + '-' +
      (p.label || 'project').replace(/[^a-z0-9]+/gi,'-').slice(0,28).toLowerCase() + '.json';
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    UI.toast('Backup downloaded');
  },
  restore(input) {
    const f = input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        if (d.projects) DB = d;
        else if (d.workers || d.contractor) Store.migrate(d);
        else throw 0;
        if (!DB.activeId) DB.activeId = DB.projects[0].id;
        Store.save(); UI.renderAll(); UI.toast('Backup restored');
      } catch (e) { alert('That file could not be read as a CertPay backup.'); }
      input.value = '';
    };
    rd.readAsText(f);
  }
};

/* ------------------------------------------------------------------- pay */
const Pay = {
  CHECKOUT_URL: '',                       // ← paste your Stripe Payment Link here
  init() {
    const q = new URLSearchParams(location.search);
    if (q.get('upgraded') === '1') { localStorage.setItem('certpay.pro','1'); history.replaceState({},'',location.pathname); UI.toast('Pro unlocked — thank you'); }
    CONFIG.pro = localStorage.getItem('certpay.pro') === '1';
  },
  open() { $('upgradeDlg').showModal(); },
  checkout() {
    if (!Pay.CHECKOUT_URL) {
      alert('Checkout is not wired up yet.\n\nAdd your Stripe Payment Link to Pay.CHECKOUT_URL in app/app.js.\nSee DEPLOY.md, step 4.');
      return;
    }
    location.href = Pay.CHECKOUT_URL;
  },
  enterKey() {
    const k = prompt('Enter your licence key:');
    if (!k) return;
    if (k.trim().toUpperCase().startsWith('CP-')) {
      localStorage.setItem('certpay.pro','1'); CONFIG.pro = true;
      $('upgradeDlg').close(); UI.renderAll(); UI.toast('Pro unlocked');
    } else alert('That key was not recognised.');
  }
};

/* -------------------------------------------------------------- app verbs */
const App = {
  ctx() { const p = P(); return {
    jurisdiction:p.jurisdiction, classes:p.classes, people:p.people, lines:p.lines,
    company:p.company, project:p.project, payroll:p.payroll }; },

  newProject() {
    if (!CONFIG.pro && DB.projects.length >= CONFIG.freeMaxProjects) { Pay.open(); return; }
    const n = prompt('Project name:', 'New project'); if (n === null) return;
    const p = blankProject(n || 'New project');
    DB.projects.push(p); DB.activeId = p.id; Store.save(); UI.renderAll(); UI.go('setup');
  },
  renameProject() {
    const p = P(); const n = prompt('Project name:', p.label); if (n === null) return;
    p.label = n || p.label; Store.save(); UI.renderProjBar();
  },
  deleteProject() {
    if (DB.projects.length === 1) { alert('You need at least one project.'); return; }
    if (!confirm('Delete "' + P().label + '" and all its payroll data?\n\nThis cannot be undone. Download a backup first if you need it.')) return;
    DB.projects = DB.projects.filter(x => x.id !== DB.activeId);
    DB.activeId = DB.projects[0].id; Store.save(); UI.renderAll();
  },
  switchProject(id) { DB.activeId = id; Store.save(); UI.renderAll(); },

  addClass() { P().classes.push({ id: uid(), name:'', base:'', fringe:'' }); Store.save(); UI.renderRates(); UI.renderCrew(); },
  delClass(id) {
    const p = P(); p.classes = p.classes.filter(c => c.id !== id);
    p.lines.forEach(l => { if (l.classId === id) l.classId = ''; });
    Store.save(); UI.renderAll();
  },
  sampleRates() {
    const p = P();
    if (p.classes.length && !confirm('Replace the current rate table with the example set?')) return;
    p.classes = CA()
      ? [ { id:uid(), name:'Electrician (Inside Wireman)', base:'54.15', fringe:'28.40' },
          { id:uid(), name:'Laborer, Group 1',             base:'34.20', fringe:'22.15' },
          { id:uid(), name:'Operating Engineer, Group 4',  base:'48.90', fringe:'26.75' },
          { id:uid(), name:'Carpenter',                    base:'46.30', fringe:'25.10' } ]
      : [ { id:uid(), name:'Electrician',        base:'34.85', fringe:'14.20' },
          { id:uid(), name:'Laborer, Group 1',   base:'19.40', fringe:'8.65'  },
          { id:uid(), name:'Operator, Backhoe',  base:'28.15', fringe:'11.90' },
          { id:uid(), name:'Carpenter',          base:'26.70', fringe:'10.55' } ];
    Store.save(); UI.renderAll(); UI.toast('Example rates loaded');
  },

  addWorker() {
    const p = P();
    if (!CONFIG.pro && p.lines.length >= CONFIG.freeMaxWorkers) { Pay.open(); return; }
    const pid = uid();
    p.people.push({ id: pid, name:'', ssn4:'', addr:'', exempt:'' });
    p.lines.push({ id: uid(), personId: pid, classId: p.classes[0]?.id || '',
      hours:[0,0,0,0,0,0,0], otherHours:'', baseOverride:'', fringeOverride:'',
      fringePaid:'cash', autoFica:true, autoSdi:true, checkNo:'', allProjGross:'', ded:{} });
    Store.save(); UI.renderCrew(); UI.renderHours(); UI.renderPay(); UI.renderTabs();
  },
  delWorker(lineId) {
    const p = P(); const l = p.lines.find(x => x.id === lineId); if (!l) return;
    p.lines  = p.lines.filter(x => x.id !== lineId);
    p.people = p.people.filter(pp => p.lines.some(x => x.personId === pp.id));
    Store.save(); UI.renderAll();
  },

  nextWeek() {
    const p = P();
    if (!p.payroll.weekEnding) { alert('Set the week ending date first.'); return; }
    if (!confirm('Start the next payroll week?\n\nCrew, classifications and rates carry over. Hours, cheque numbers and deductions reset.\n\nDownload a backup of this week first if you have not already.')) return;
    const d = new Date(p.payroll.weekEnding + 'T12:00:00');
    d.setDate(d.getDate() + (p.freq === 'biweekly' ? 14 : 7));
    p.payroll.num = String((parseInt(p.payroll.num, 10) || 0) + 1);
    p.payroll.weekEnding = d.toISOString().slice(0, 10);
    p.lines.forEach(l => { l.hours = [0,0,0,0,0,0,0]; l.otherHours = ''; l.checkNo = ''; l.allProjGross = ''; l.ded = {}; });
    Store.save(); UI.renderAll(); UI.go('hours'); UI.toast('Payroll #' + p.payroll.num + ' started');
  },

  exportCSV() {
    if (!CONFIG.pro) { Pay.open(); return; }
    const p = P(), ctx = App.ctx();
    const head = ['Name','ID','Classification','Sun','Mon','Tue','Wed','Thu','Fri','Sat',
      'Total','ST hrs','OT hrs','DT hrs','ST rate','OT rate','Gross','FICA','SDI','Fed','State','Deductions','Net','Check'];
    const rows = p.lines.map(l => {
      const r = calcLine(l, ctx), per = p.people.find(x => x.id === l.personId) || {};
      return [per.name, per.ssn4, r.cls?.name || '', ...l.hours.map(h => num(h) || ''),
        r.projHrs, r.stH, r.otH, r.dtH, r2(r.stRate), r2(r.otRate), r2(r.gross),
        r2(r.fica), r2(r.sdi), num(l.ded?.fed), num(l.ded?.state), r2(r.ded), r2(r.net), l.checkNo || ''];
    });
    const csv = [head, ...rows].map(r => r.map(c => {
      const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = 'certpay-' + (p.payroll.weekEnding || 'week') + '.csv'; a.click();
    UI.toast('CSV exported');
  }
};

/* -------------------------------------------------------------------- UI */
const TABS = [
  { id:'setup',  label:'Setup'  },
  { id:'rates',  label:'Wage rates' },
  { id:'crew',   label:'Crew'   },
  { id:'hours',  label:'Hours'  },
  { id:'pay',    label:'Pay & deductions' },
  { id:'review', label:'Review & file' }
];

const UI = {
  tab: 'setup',

  go(id) {
    UI.tab = id;
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.dataset.p === id));
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === id));
    if (id === 'hours')  UI.renderHours();
    if (id === 'pay')    UI.renderPay();
    if (id === 'review') UI.renderReview();
    if (id === 'crew')   UI.renderCrew();
    window.scrollTo(0, 0);
  },
  nextTab() { const i = TABS.findIndex(t => t.id === UI.tab); UI.go(TABS[Math.min(i + 1, TABS.length - 1)].id); },
  prevTab() { const i = TABS.findIndex(t => t.id === UI.tab); UI.go(TABS[Math.max(i - 1, 0)].id); },

  toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.remove('on'), 2200);
  },

  renderTabs() {
    const n = errorCount(App.ctx());
    $('tabs').innerHTML = TABS.map(t =>
      `<button data-t="${t.id}" class="${UI.tab === t.id ? 'on' : ''}" onclick="UI.go('${t.id}')">${t.label}` +
      (t.id === 'review' ? `<span class="badge ${n ? '' : 'zero'}">${n || '✓'}</span>` : '') + `</button>`).join('');
    const tag = $('planTag');
    tag.textContent = CONFIG.pro ? 'PRO' : 'FREE';
    tag.className = 'plan' + (CONFIG.pro ? ' pro' : '');
  },

  renderProjBar() {
    const p = P();
    $('projSel').innerHTML = DB.projects.map(x =>
      `<option value="${x.id}" ${x.id === DB.activeId ? 'selected' : ''}>${esc(x.label)}</option>`).join('');
    const b = $('jBadge');
    b.textContent = CA() ? 'CALIFORNIA A-1-131' : 'FEDERAL WH-347';
    b.className = 'jbadge' + (CA() ? ' ca' : '');
    $('weekLabel').textContent = p.payroll.weekEnding
      ? 'Payroll #' + (p.payroll.num || '?') + ' · w/e ' + Form.fmtDate(p.payroll.weekEnding) : 'No week set';
    document.querySelectorAll('.ca-only').forEach(el => el.style.display = CA() ? '' : 'none');
  },

  bind() {
    const p = P();
    const map = {
      f_jur:'jurisdiction', f_freq:'freq',
      p_num:'payroll.num', p_weekEnding:'payroll.weekEnding', p_final:'payroll.final',
      c_name:'company.name', c_addr:'company.addr', c_role:'company.role',
      c_license:'company.license', c_pwcr:'company.pwcr', c_wc:'company.wc',
      j_name:'project.name', j_contract:'project.contract', j_wd:'project.wd',
      j_agency:'project.agency', j_dirId:'project.dirId',
      s_name:'payroll.statement.name', s_title:'payroll.statement.title',
      s_exceptions:'payroll.statement.exceptions', s_remarks:'payroll.statement.remarks'
    };
    for (const [el, path] of Object.entries(map)) {
      const node = $(el); if (!node) continue;
      const keys = path.split('.');
      let v = p; keys.forEach(k => v = v?.[k]);
      node.value = v ?? '';
      node.oninput = node.onchange = () => {
        let o = p; for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
        o[keys[keys.length - 1]] = node.value;
        Store.save();
        if (el === 'f_jur') { UI.renderAll(); }
        else { UI.weekStart(); UI.renderProjBar(); UI.renderTabs(); }
      };
    }
    document.querySelectorAll('input[name=fmode]').forEach(r => {
      r.checked = p.payroll.statement.fringeMode === r.value;
      r.onchange = () => { p.payroll.statement.fringeMode = r.value; Store.save(); UI.renderTabs(); };
    });
    UI.weekStart();

    $('jurNote').innerHTML = CA()
      ? '<b>California.</b> Overtime is calculated daily, not just weekly: over 8 hours in a day at 1.5×, over 12 at 2×, and the seventh consecutive day worked at 1.5× for the first eight hours and 2× beyond. SDI is withheld at 1.1%. Prevailing wage applies to public works over <b>$1,000</b>, far below the federal $2,000 threshold, and most projects must also be filed electronically through the DIR eCPR portal.'
      : '<b>Federal Davis-Bacon.</b> Overtime is the weekly rule only — hours over 40 at 1.5× the base rate. Applies to federally funded contracts over <b>$2,000</b>. If your project is also state-funded, check whether your state adds its own form and rates; where both apply you pay whichever is higher.';

    $('wdNote').innerHTML = CA()
      ? '<b>Finding your rates:</b> the DIR publishes determinations twice a year, on 22 February and 22 August, at <b>dir.ca.gov/oprl/dprewagedetermination.htm</b>. Use the determination in effect on the date the contract was awarded. Classifications must match DIR wording exactly — "journeyman" or "helper" alone will be rejected.'
      : '<b>Finding your rates:</b> look up the active determination for your county and construction type at <b>sam.gov</b> → Wage Determinations. Use the modification in effect on the date of contract award. If it was modified mid-project, confirm with the contracting officer which one applies before entering rates.';

    $('ssnNote').innerHTML = CA()
      ? '<b>California requires the employee address</b> on Form A-1-131, unlike the federal form. On copies provided to the public the DIR requires the name, address and SSN to be redacted — but the copy you file with the awarding body or Labor Commissioner is unredacted. CertPay stores only the last four digits, which is what prints.'
      : '<b>Identifying number:</b> since 2009 the DOL requires only the <b>last four digits of the SSN</b> on submitted payrolls, never the full number. Keep full SSNs in your own records only.';

    $('hoursSub').textContent = CA()
      ? 'Site hours only. Daily overtime over 8 hours, double time over 12, and the seventh consecutive day are all calculated automatically.'
      : 'Site hours only. Overtime is calculated automatically above 40 hours in the week.';

    $('hoursNote').innerHTML = CA()
      ? 'Because California computes overtime <b>per day</b>, enter each day accurately — a 4/10 schedule generates 8 hours of overtime a week even though the total is only 40. That is the mistake most federal-only payroll software makes on California jobs.'
      : 'If a worker also worked <b>other jobs</b> this week, enter only this project\'s hours here, and put the rest in "Other job hrs" — their overtime threshold is based on all hours worked for you that week, and CertPay allocates the premium proportionally.';

    $('fileNote').innerHTML = CA()
      ? 'California: submit through the <b>DIR eCPR portal</b> at least every 30 days while work continues, and within 30 days of the final day of work. Late filing runs <b>$100 per worker per day</b>. Your awarding body may also require weekly copies — check the contract.'
      : 'Federal: due <b>within 7 days</b> of the pay date, every week, to whoever collects them — the prime contractor if you are a sub, otherwise the contracting agency.';
  },

  weekStart() {
    const p = P(), we = p.payroll.weekEnding, el = $('p_weekStart');
    if (!we) { el.value = ''; return; }
    const d = new Date(we + 'T12:00:00');
    d.setDate(d.getDate() - (p.freq === 'biweekly' ? 13 : 6));
    el.value = d.toISOString().slice(0, 10);
  },

  renderRates() {
    const p = P(), t = $('ratesTbl');
    if (!p.classes.length) {
      t.innerHTML = `<tr><td><div class="empty">No classifications yet.<br>Add the ones on your wage determination, or load the example set to see how it works.</div></td></tr>`;
      return;
    }
    t.innerHTML = `<thead><tr>
      <th style="min-width:200px">Work classification</th>
      <th class="num" style="width:130px">Base rate</th>
      <th class="num" style="width:130px">Fringe</th>
      <th class="num" style="width:130px">Total package</th>
      <th style="width:44px"></th></tr></thead><tbody>` +
      p.classes.map(c => `<tr>
        <td><input class="inp sm" value="${esc(c.name)}" placeholder="Electrician"
             oninput="Up.cls('${c.id}','name',this.value)"></td>
        <td><input class="inp sm num" value="${esc(c.base)}" placeholder="0.00" inputmode="decimal"
             oninput="Up.cls('${c.id}','base',this.value,1)"></td>
        <td><input class="inp sm num" value="${esc(c.fringe)}" placeholder="0.00" inputmode="decimal"
             oninput="Up.cls('${c.id}','fringe',this.value,1)"></td>
        <td class="num tot">$${money(num(c.base) + num(c.fringe))}</td>
        <td><button class="btn dgr" onclick="App.delClass('${c.id}')">✕</button></td>
      </tr>`).join('') + `</tbody>`;
  },

  renderCrew() {
    const p = P(), ctx = App.ctx();
    $('crewLock').innerHTML = (!CONFIG.pro && p.lines.length >= CONFIG.freeMaxWorkers)
      ? `<div class="lock" style="margin-bottom:15px"><div><b>Free plan limit reached — ${CONFIG.freeMaxWorkers} workers.</b><br>
         Upgrade for unlimited crew, no watermark, unlimited projects and CSV export.</div>
         <button class="btn" style="margin-left:auto" onclick="Pay.open()">Upgrade — $29/mo</button></div>` : '';

    const t = $('crewTbl');
    if (!p.lines.length) { t.innerHTML = `<tr><td><div class="empty">No workers yet.<br>Add everyone who performed manual labour on the site this week.</div></td></tr>`; return; }

    const opts = l => p.classes.map(c => `<option value="${c.id}" ${l.classId === c.id ? 'selected' : ''}>${esc(c.name || '(untitled)')}</option>`).join('');
    t.innerHTML = `<thead><tr>
        <th style="min-width:150px">Name</th>
        ${CA() ? '<th style="min-width:150px">Address</th>' : ''}
        <th style="width:90px">ID (last 4)</th><th style="width:70px">Exempt.</th>
        <th style="min-width:170px">Classification</th>
        <th style="width:130px">Fringe paid as</th>
        <th class="num" style="width:100px">Package</th><th style="width:44px"></th>
      </tr></thead><tbody>` +
      p.lines.map(l => {
        const per = p.people.find(x => x.id === l.personId) || {};
        const r = calcLine(l, ctx);
        const short = r.cls && r.actualPackage + 1e-4 < r.reqPackage;
        return `<tr>
          <td><input class="inp sm" value="${esc(per.name)}" placeholder="J. Ruiz" oninput="Up.per('${per.id}','name',this.value)"></td>
          ${CA() ? `<td><input class="inp sm" value="${esc(per.addr)}" placeholder="12 Oak St, Fresno" oninput="Up.per('${per.id}','addr',this.value)"></td>` : ''}
          <td><input class="inp sm" value="${esc(per.ssn4)}" placeholder="4417" maxlength="4" inputmode="numeric" oninput="Up.per('${per.id}','ssn4',this.value)"></td>
          <td><input class="inp sm" value="${esc(per.exempt)}" placeholder="2" inputmode="numeric" oninput="Up.per('${per.id}','exempt',this.value)"></td>
          <td><select class="inp sm" onchange="Up.line('${l.id}','classId',this.value,1)">
               <option value="">— select —</option>${opts(l)}</select></td>
          <td><select class="inp sm" onchange="Up.line('${l.id}','fringePaid',this.value,1)">
               <option value="cash" ${l.fringePaid === 'cash' ? 'selected' : ''}>Cash on cheque</option>
               <option value="plan" ${l.fringePaid === 'plan' ? 'selected' : ''}>Benefit plan</option></select></td>
          <td class="num"><span class="pill ${short ? 'bad' : 'good'}">$${money(r.actualPackage)}</span></td>
          <td><button class="btn dgr" onclick="App.delWorker('${l.id}')">✕</button></td>
        </tr>`;
      }).join('') + `</tbody>`;
  },

  renderHours() {
    const p = P(), ctx = App.ctx(), g = $('hoursGrid');
    if (!p.lines.length) { g.innerHTML = `<div class="empty">Add crew first.</div>`; return; }
    const D = Form.dates(p);
    g.innerHTML = `<table><thead><tr>
      <th style="text-align:left;min-width:150px">Worker</th>
      ${D.map(d => `<th class="${d.n === 'Sat' || d.n === 'Sun' ? 'wk' : ''}">${d.n}<br><span style="font-weight:400;font-size:10px">${d.d}</span></th>`).join('')}
      ${CA() ? '' : '<th>Other<br>job hrs</th>'}
      <th>Total</th><th>ST</th><th>OT</th>${CA() ? '<th>DT</th>' : ''}</tr></thead><tbody>` +
      p.lines.map(l => {
        const per = p.people.find(x => x.id === l.personId) || {};
        const r = calcLine(l, ctx);
        return `<tr data-line="${l.id}">
          <td style="font-weight:550">${esc(per.name || '—')}<br>
            <span style="font-size:11px;color:var(--mut)">${esc(r.cls?.name || 'no classification')}</span></td>
          ${l.hours.map((h, i) => `<td class="${D[i].n === 'Sat' || D[i].n === 'Sun' ? 'wk' : ''}">
            <input class="h" inputmode="decimal" value="${hrs(h)}" placeholder="0" onfocus="this.select()"
              oninput="Up.hour('${l.id}',${i},this.value)"></td>`).join('')}
          ${CA() ? '' : `<td><input class="h" inputmode="decimal" value="${esc(l.otherHours)}" placeholder="0"
              oninput="Up.line('${l.id}','otherHours',this.value);UI.refreshRow('${l.id}')"></td>`}
          <td class="tot c-tot">${hrs(r.projHrs) || '0'}</td>
          <td class="tot c-st">${hrs(r.stH) || '0'}</td>
          <td class="tot c-ot ${r.otH ? 'ot' : ''}">${hrs(r.otH) || '0'}</td>
          ${CA() ? `<td class="tot c-dt ${r.dtH ? 'dt' : ''}">${hrs(r.dtH) || '0'}</td>` : ''}
        </tr>`;
      }).join('') + `</tbody></table>`;
  },

  refreshRow(lineId) {
    const p = P(), l = p.lines.find(x => x.id === lineId); if (!l) return;
    const r = calcLine(l, App.ctx());
    const row = document.querySelector(`tr[data-line="${lineId}"]`); if (!row) return;
    const set = (sel, v, cls) => { const el = row.querySelector(sel); if (!el) return;
      el.textContent = v || '0'; if (cls !== undefined) el.className = 'tot ' + sel.slice(1) + (v ? ' ' + cls : ''); };
    set('.c-tot', hrs(r.projHrs)); set('.c-st', hrs(r.stH));
    set('.c-ot', hrs(r.otH), 'ot'); set('.c-dt', hrs(r.dtH), 'dt');
    UI.renderTabs();
  },

  renderPay() {
    const p = P(), ctx = App.ctx(), el = $('payList');
    if (!p.lines.length) { el.innerHTML = `<div class="empty">Add crew first.</div>`; return; }
    el.innerHTML = p.lines.map(l => {
      const per = p.people.find(x => x.id === l.personId) || {};
      const r = calcLine(l, ctx), d = l.ded || {};
      const short = r.cls && r.actualPackage + 1e-4 < r.reqPackage;
      const f = (k, lab, ph) => `<label class="f"><span>${lab}</span>
        <input class="inp sm num" value="${esc(d[k])}" placeholder="${ph || '0.00'}" inputmode="decimal"
          oninput="Up.ded('${l.id}','${k}',this.value)"></label>`;
      return `<div class="wcard ${short ? 'short' : ''}">
        <div class="row" style="margin-bottom:12px">
          <b style="font-size:15px">${esc(per.name || 'Unnamed')}</b>
          <span class="pill">${esc(r.cls?.name || 'no classification')}</span>
          <span class="note">${hrs(r.stH) || 0} ST × $${money(r.stRate)}${r.otH ? ` · ${hrs(r.otH)} OT × $${money(r.otRate)}` : ''}${r.dtH ? ` · ${hrs(r.dtH)} DT × $${money(r.dtRate)}` : ''}</span>
          <span class="right tot" style="font-size:16px">Gross $${money(r.gross)}</span>
        </div>
        <div class="grid g4">
          <label class="f"><span>Base rate override <span class="hint">blank = determination</span></span>
            <input class="inp sm num" value="${esc(l.baseOverride)}" placeholder="${money(r.reqBase)}" inputmode="decimal"
              oninput="Up.line('${l.id}','baseOverride',this.value,1)"></label>
          <label class="f"><span>Fringe override</span>
            <input class="inp sm num" value="${esc(l.fringeOverride)}" placeholder="${money(r.reqFringe)}" inputmode="decimal"
              oninput="Up.line('${l.id}','fringeOverride',this.value,1)"></label>
          <label class="f"><span>FICA <span class="hint">${l.autoFica !== false ? 'auto 7.65%' : 'manual'}</span></span>
            <input class="inp sm num" value="${l.autoFica !== false ? money(r.fica) : esc(d.fica)}"
              ${l.autoFica !== false ? 'disabled' : ''} inputmode="decimal" oninput="Up.ded('${l.id}','fica',this.value)"></label>
          ${f('fed','Federal withholding')}
          ${f('state','State withholding')}
          ${CA() ? `<label class="f"><span>SDI <span class="hint">${l.autoSdi !== false ? 'auto 1.1%' : 'manual'}</span></span>
            <input class="inp sm num" value="${l.autoSdi !== false ? money(r.sdi) : esc(d.sdi)}"
              ${l.autoSdi !== false ? 'disabled' : ''} inputmode="decimal" oninput="Up.ded('${l.id}','sdi',this.value)"></label>` : ''}
          ${CA() ? f('vac','Vacation / holiday') + f('hw','Health &amp; welfare') + f('pension','Pension') +
                   f('training','Training') + f('fundadmin','Fund admin') + f('dues','Dues') +
                   f('travel','Travel / subsistence') + f('savings','Savings') : ''}
          ${f('other','Other deductions')}
          <label class="f" style="grid-column:span 2"><span>Describe "other" <span class="hint">required on the certification</span></span>
            <input class="inp sm" value="${esc(d.otherDesc)}" placeholder="Union dues, authorised in writing"
              oninput="Up.ded('${l.id}','otherDesc',this.value,1)"></label>
          ${CA() ? `<label class="f"><span>Cheque no.</span>
            <input class="inp sm" value="${esc(l.checkNo)}" placeholder="10442" oninput="Up.line('${l.id}','checkNo',this.value,1)"></label>
          <label class="f"><span>Gross, all projects <span class="hint">blank = this project</span></span>
            <input class="inp sm num" value="${esc(l.allProjGross)}" placeholder="${money(r.gross)}" inputmode="decimal"
              oninput="Up.line('${l.id}','allProjGross',this.value,1)"></label>` : ''}
        </div>
        <div class="row" style="margin-top:12px;font-size:13.5px">
          <label style="font-size:13px"><input type="checkbox" ${l.autoFica !== false ? 'checked' : ''}
            onchange="Up.line('${l.id}','autoFica',this.checked,1)"> Auto FICA</label>
          ${CA() ? `<label style="font-size:13px"><input type="checkbox" ${l.autoSdi !== false ? 'checked' : ''}
            onchange="Up.line('${l.id}','autoSdi',this.checked,1)"> Auto SDI</label>` : ''}
          <span class="right">Deductions <b>$${money(r.ded)}</b> &nbsp;·&nbsp; Net <b style="font-size:16px">$${money(r.net)}</b></span>
        </div>
      </div>`;
    }).join('');
  },

  renderReview() {
    const ctx = App.ctx(), t = calcTotals(P().lines, ctx);
    $('kpi').innerHTML = `
      <div class="k"><div class="lab">Workers</div><div class="val">${t.count}</div></div>
      <div class="k"><div class="lab">Total hours</div><div class="val">${t.hours || 0}<span style="font-size:13px;color:var(--mut)"> · ${t.ot || 0} OT${CA() && t.dt ? ' · ' + t.dt + ' DT' : ''}</span></div></div>
      <div class="k"><div class="lab">Gross payroll</div><div class="val">$${money(t.gross)}</div></div>
      <div class="k"><div class="lab">Net wages</div><div class="val">$${money(t.net)}</div></div>`;
    $('checks').innerHTML = validate(ctx).map(f =>
      `<div class="flag ${f.lv}"><div class="ic">${f.lv === 'e' ? '!' : f.lv === 'w' ? '?' : '✓'}</div>
        <div><b>${esc(f.t)}</b><br>${esc(f.m)}</div></div>`).join('');
  },

  renderAll() {
    UI.renderProjBar(); UI.bind(); UI.renderRates(); UI.renderCrew();
    UI.renderHours(); UI.renderPay(); UI.renderReview(); UI.renderTabs();
  },

  print() {
    const n = errorCount(App.ctx());
    if (n && !confirm(n + ' compliance error' + (n > 1 ? 's' : '') + ' found.\n\nPrint anyway? Submitting a payroll with known errors can produce back-wage findings.')) {
      UI.go('review'); return;
    }
    Form.render();
    setTimeout(() => window.print(), 60);
  }
};

/* --------------------------------------------------------- update helpers */
const Up = {
  cls(id, k, v, full) { const c = P().classes.find(x => x.id === id); if (!c) return;
    c[k] = v; Store.save(); if (full) { UI.renderRates(); UI.renderCrew(); } UI.renderTabs(); },
  per(id, k, v) { const p = P().people.find(x => x.id === id); if (!p) return;
    p[k] = v; Store.save(); UI.renderTabs(); },
  line(id, k, v, full) { const l = P().lines.find(x => x.id === id); if (!l) return;
    l[k] = v; Store.save(); if (full) { UI.renderCrew(); UI.renderPay(); UI.renderHours(); } UI.renderTabs(); },
  hour(id, i, v) { const l = P().lines.find(x => x.id === id); if (!l) return;
    l.hours[i] = num(v); Store.save(); UI.refreshRow(id); },
  ded(id, k, v, skip) { const l = P().lines.find(x => x.id === id); if (!l) return;
    l.ded = l.ded || {}; l.ded[k] = v; Store.save(); if (!skip) UI.renderPay(); UI.renderTabs(); }
};

/* ------------------------------------------------------- form renderers */
const Form = {
  dates(p) {
    const we = p.payroll.weekEnding;
    if (!we) return DAYS.map(n => ({ n, d: '' }));
    const end = new Date(we + 'T12:00:00');
    return [...Array(7)].map((_, i) => {
      const d = new Date(end); d.setDate(end.getDate() - (6 - i));
      return { n: DAYS[d.getDay()], d: (d.getMonth() + 1) + '/' + d.getDate() };
    });
  },
  fmtDate(s) { if (!s) return ''; const d = new Date(s + 'T12:00:00');
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); },

  /* split a worker's weekly ST/OT/DT back across the days they worked,
     proportionally, so the daily grid on the form still sums correctly */
  daily(l, r, band) {
    const key = band === 'S' ? 'st' : band === 'O' ? 'ot' : 'dt';
    return (r.perDay || []).map(d => {
      // On the overtime row, California double time is shown with the OT hours.
      const v = (band === 'O' && CA()) ? d.ot + d.dt : d[key];
      return v ? r2(v) : '';
    });
  },

  render() {
    const p = P(), ctx = App.ctx();
    document.getElementById('print').innerHTML =
      `<div class="fm">${CA() ? Form.ca(p, ctx) : Form.federal(p, ctx)}</div>`;
  },

  /* ----------------------------- FEDERAL WH-347 ----------------------------- */
  federal(p, ctx) {
    const D = Form.dates(p);
    const wm = (!CONFIG.pro && CONFIG.watermark) ? '<div class="wm">CertPay Free</div>' : '';
    const t = calcTotals(p.lines, ctx);

    const rows = p.lines.map(l => {
      const r = calcLine(l, ctx), per = p.people.find(x => x.id === l.personId) || {};
      const S = Form.daily(l, r, 'S'), O = Form.daily(l, r, 'O');
      return `<tr>
        <td rowspan="2" style="width:11%"><div class="val">${esc(per.name)}</div>
          <div class="tiny">${per.ssn4 ? 'xxx-xx-' + esc(per.ssn4) : ''}</div></td>
        <td rowspan="2" class="ctr val" style="width:2.6%">${esc(per.exempt)}</td>
        <td rowspan="2" style="width:9.5%"><div class="val" style="font-size:7.8px">${esc(r.cls?.name || '')}</div></td>
        <td class="ctr">S</td>${S.map(v => `<td class="ctr val">${v}</td>`).join('')}
        <td class="ctr val">${hrs(r.stH) || '0'}</td>
        <td class="rt val">${money(r.stRate)}</td>
        <td class="rt val">${money(r.grossST)}</td>
        <td rowspan="2" class="rt val">${money(r.fica)}</td>
        <td rowspan="2" class="rt val">${num(l.ded?.fed) ? money(num(l.ded.fed)) : ''}</td>
        <td rowspan="2" class="rt val">${num(l.ded?.state) ? money(num(l.ded.state)) : ''}</td>
        <td rowspan="2" class="rt val">${num(l.ded?.other) ? money(num(l.ded.other)) : ''}</td>
        <td rowspan="2" class="rt val">${money(r.ded)}</td>
        <td rowspan="2" class="rt val"><b>${money(r.net)}</b></td></tr>
      <tr><td class="ctr">O</td>${O.map(v => `<td class="ctr val">${v}</td>`).join('')}
        <td class="ctr val">${hrs(r.otH) || ''}</td>
        <td class="rt val">${r.otH ? money(r.otRate) : ''}</td>
        <td class="rt val">${r.grossOT ? money(r.grossOT) : ''}</td></tr>`;
    }).join('');

    const page1 = `<div class="sheet">
      <table class="nb"><tr>
        <td class="nb" style="width:23%"><div class="tiny">U.S. Department of Labor<br>Wage and Hour Division</div></td>
        <td class="nb ctr"><h1>PAYROLL</h1><div class="hdr">(For Contractor's Optional Use; See Instructions)<br>U.S. Wage and Hour Division</div></td>
        <td class="nb rt" style="width:23%"><div class="tiny">Form WH-347<br>OMB No. 1235-0008<br>Expires: 09/30/2026</div></td>
      </tr></table>
      <table style="margin-top:3px">
        <tr>
          <td style="width:34%"><div class="cap">Name of Contractor <span style="font-family:Arial">${p.company.role === 'contractor' ? '☑' : '☐'}</span> or Subcontractor <span style="font-family:Arial">${p.company.role === 'subcontractor' ? '☑' : '☐'}</span></div><div class="val">${esc(p.company.name)}</div></td>
          <td style="width:34%"><div class="cap">Address</div><div class="val">${esc(p.company.addr)}</div></td>
          <td style="width:16%"><div class="cap">Payroll No.</div><div class="val">${esc(p.payroll.num)}</div></td>
          <td style="width:16%"><div class="cap">For Week Ending</div><div class="val">${Form.fmtDate(p.payroll.weekEnding)}</div></td>
        </tr>
        <tr><td colspan="2"><div class="cap">Project and Location</div><div class="val">${esc(p.project.name)}</div></td>
            <td colspan="2"><div class="cap">Project or Contract No.</div><div class="val">${esc(p.project.contract)}</div></td></tr>
      </table>
      <table style="margin-top:3px">
        <thead>
          <tr>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(1)<br>Name and Individual<br>Identifying Number<br>of Worker</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(2)<br>No. of<br>With-<br>holding<br>Exemp-<br>tions</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(3)<br>Work<br>Classi-<br>fication</td>
            <td colspan="8" class="ctr cap">(4) Day and Date</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(5)<br>Total<br>Hours</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(6)<br>Rate<br>of Pay</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(7)<br>Gross<br>Amount<br>Earned</td>
            <td colspan="5" class="ctr cap">(8) Deductions</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(9)<br>Net<br>Wages<br>Paid<br>for Week</td>
          </tr>
          <tr><td class="ctr cap" style="width:2.4%">OT or ST</td>
            ${D.map(d => `<td class="ctr cap" style="width:3.1%">${d.n}</td>`).join('')}
            <td class="ctr cap" style="width:3.6%">FICA</td><td class="ctr cap" style="width:3.6%">With-<br>holding<br>Tax</td>
            <td class="ctr cap" style="width:3.6%">State<br>Tax</td><td class="ctr cap" style="width:3.6%">Other</td>
            <td class="ctr cap" style="width:4%">Total<br>Deduc-<br>tions</td></tr>
          <tr><td></td>${D.map(d => `<td class="ctr tiny">${d.d}</td>`).join('')}<td></td><td></td><td></td><td></td><td></td></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="22" class="ctr" style="height:44px;font-family:Arial;font-size:10px">NO WORK PERFORMED THIS WEEK</td></tr>'}</tbody>
        <tfoot><tr>
          <td colspan="11" class="rt cap" style="font-weight:700">Totals</td>
          <td class="ctr val"><b>${t.hours || '0'}</b></td><td></td>
          <td class="rt val"><b>${money(t.gross)}</b></td>
          <td colspan="4"></td><td class="rt val"><b>${money(t.ded)}</b></td>
          <td class="rt val"><b>${money(t.net)}</b></td>
        </tr></tfoot>
      </table>
      <div class="tiny" style="margin-top:2px">Prepared with CertPay — verify all figures against your payroll records before signing.</div>${wm}
    </div>`;

    return page1 + Form.compliance(p, 'federal', wm);
  },

  /* --------------------------- CALIFORNIA A-1-131 --------------------------- */
  ca(p, ctx) {
    const D = Form.dates(p);
    const wm = (!CONFIG.pro && CONFIG.watermark) ? '<div class="wm">CertPay Free</div>' : '';
    const t = calcTotals(p.lines, ctx);

    const rows = p.lines.map(l => {
      const r = calcLine(l, ctx), per = p.people.find(x => x.id === l.personId) || {}, d = l.ded || {};
      const S = Form.daily(l, r, 'S'), O = Form.daily(l, r, 'O');
      const cell = v => `<td class="ctr val" style="font-size:7.4px">${v ? money(num(v)) : ''}</td>`;
      return `<tr>
        <td rowspan="2" style="width:13%"><div class="val" style="font-size:8px">${esc(per.name)}</div>
          <div class="tiny">${esc(per.addr || '')}</div>
          <div class="tiny">${per.ssn4 ? 'xxx-xx-' + esc(per.ssn4) : ''}</div></td>
        <td rowspan="2" class="ctr val" style="width:2.4%">${esc(per.exempt)}</td>
        <td rowspan="2" style="width:9%"><div class="val" style="font-size:7.6px">${esc(r.cls?.name || '')}</div></td>
        <td class="ctr" style="width:2%">S</td>
        ${S.map(v => `<td class="ctr val" style="width:2.7%">${v}</td>`).join('')}
        <td class="ctr val">${hrs(r.stH) || '0'}</td>
        <td class="rt val">${money(r.stRate)}</td>
        <td class="rt val" style="font-size:7.4px">${money(r.grossST + r.grossOT + r.grossDT)}<div class="tiny">this project</div></td>
        ${cell(d.fed)}${cell(r.fica)}${cell(d.state)}${cell(r.sdi)}${cell(d.vac)}${cell(d.hw)}${cell(d.pension)}
        <td rowspan="2" class="rt val"><b>${money(r.net)}</b></td>
        <td rowspan="2" class="ctr val" style="font-size:7.4px">${esc(l.checkNo)}</td></tr>
      <tr>
        <td class="ctr">O</td>${O.map(v => `<td class="ctr val">${v}</td>`).join('')}
        <td class="ctr val">${hrs(r.otH) || ''}${r.dtH ? '<div class="tiny">DT ' + hrs(r.dtH) + '</div>' : ''}</td>
        <td class="rt val">${r.otH ? money(r.otRate) : ''}${r.dtH ? '<div class="tiny">' + money(r.dtRate) + '</div>' : ''}</td>
        <td class="rt val" style="font-size:7.4px">${money(r.allProjGross)}<div class="tiny">all projects</div></td>
        ${cell(d.training)}${cell(d.fundadmin)}${cell(d.dues)}${cell(d.travel)}${cell(d.savings)}${cell(d.other)}
        <td class="ctr val" style="font-size:7.4px">${money(r.ded)}<div class="tiny">total</div></td></tr>`;
    }).join('');

    const page1 = `<div class="sheet">
      <table class="nb"><tr>
        <td class="nb" style="width:26%"><div class="tiny">State of California<br>Department of Industrial Relations<br>Division of Labor Standards Enforcement</div></td>
        <td class="nb ctr"><h1>PUBLIC WORKS PAYROLL REPORTING FORM</h1></td>
        <td class="nb rt" style="width:20%"><div class="tiny">Page 1 of 2<br>Form A-1-131 (New 2-80)</div></td>
      </tr></table>
      <table style="margin-top:3px">
        <tr>
          <td style="width:26%"><div class="cap">Name of Contractor / Subcontractor</div><div class="val">${esc(p.company.name)}</div></td>
          <td style="width:15%"><div class="cap">Contractor's Licence No.</div><div class="val">${esc(p.company.license)}</div></td>
          <td style="width:15%"><div class="cap">DIR Registration No.</div><div class="val">${esc(p.company.pwcr)}</div></td>
          <td style="width:12%"><div class="cap">Payroll No.</div><div class="val">${esc(p.payroll.num)}</div></td>
          <td style="width:16%"><div class="cap">For Week Ending</div><div class="val">${Form.fmtDate(p.payroll.weekEnding)}</div></td>
          <td style="width:16%"><div class="cap">Workers' Comp Policy No.</div><div class="val">${esc(p.company.wc)}</div></td>
        </tr>
        <tr>
          <td colspan="2"><div class="cap">Address</div><div class="val">${esc(p.company.addr)}</div></td>
          <td colspan="2"><div class="cap">Project and Location</div><div class="val">${esc(p.project.name)}</div></td>
          <td><div class="cap">Contract No.</div><div class="val">${esc(p.project.contract)}</div></td>
          <td><div class="cap">DIR Project ID</div><div class="val">${esc(p.project.dirId)}</div></td>
        </tr>
      </table>
      <table style="margin-top:3px">
        <thead>
          <tr>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(1)<br>Name, Address and<br>Social Security Number<br>of Employee</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(2)<br>No. of<br>With-<br>holding<br>Exemp-<br>tions</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(3)<br>Work<br>Classi-<br>fication</td>
            <td colspan="8" class="ctr cap">(4) Hours Worked Each Day</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(5)<br>Total<br>Hours</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(6)<br>Rate<br>of Pay</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(7)<br>Gross Amount<br>Earned</td>
            <td colspan="7" class="ctr cap">(8) Deductions, Contributions and Payments</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">(9)<br>Net Wages<br>Paid for<br>Week</td>
            <td rowspan="3" class="ctr cap" style="vertical-align:middle">Check<br>No.</td>
          </tr>
          <tr><td class="ctr cap">S / O</td>
            ${D.map(d => `<td class="ctr cap">${d.n}</td>`).join('')}
            <td class="ctr cap">Federal<br>Tax</td><td class="ctr cap">FICA</td><td class="ctr cap">State<br>Tax</td>
            <td class="ctr cap">SDI</td><td class="ctr cap">Vac /<br>Holiday</td><td class="ctr cap">Health &amp;<br>Welfare</td>
            <td class="ctr cap">Pension</td></tr>
          <tr><td></td>${D.map(d => `<td class="ctr tiny">${d.d}</td>`).join('')}
            <td class="ctr cap">Training</td><td class="ctr cap">Fund<br>Admin</td><td class="ctr cap">Dues</td>
            <td class="ctr cap">Travel /<br>Subsist.</td><td class="ctr cap">Savings</td><td class="ctr cap">Other*</td>
            <td class="ctr cap">Total<br>Deductions</td></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="24" class="ctr" style="height:44px;font-family:Arial;font-size:10px">NO WORK PERFORMED THIS WEEK</td></tr>'}</tbody>
        <tfoot><tr>
          <td colspan="11" class="rt cap" style="font-weight:700">Totals</td>
          <td class="ctr val"><b>${t.hours || '0'}</b></td><td></td>
          <td class="rt val"><b>${money(t.gross)}</b></td>
          <td colspan="7"></td><td class="rt val"><b>${money(t.net)}</b></td><td></td>
        </tr></tfoot>
      </table>
      <div class="tiny" style="margin-top:2px">* Other — any other deductions, contributions and/or payments, whether or not included or required by prevailing wage determinations, must be separately listed.
      &nbsp;&nbsp;SDI = State Disability Insurance. &nbsp;S = Straight Time, O = Overtime. &nbsp;CERTIFICATION MUST be completed (see page 2). &nbsp;Prepared with CertPay.</div>${wm}
    </div>`;

    return page1 + Form.compliance(p, 'ca', wm);
  },

  /* ------------------------- certification / page 2 ------------------------- */
  compliance(p, kind, wm) {
    const st = p.payroll.statement, fm = st.fringeMode;
    const ws = $('p_weekStart')?.value || '';
    const descs = P().lines.map(l => l.ded?.otherDesc).filter(Boolean).join('; ');
    const ul = s => `<span style="text-decoration:underline">&nbsp;${s || '&nbsp;'.repeat(24)}&nbsp;</span>`;

    if (kind === 'ca') {
      return `<div class="sheet portrait" style="max-width:7.4in;margin:0 auto">
        <h1 style="font-size:12px;margin-bottom:3px">PUBLIC WORKS PAYROLL REPORTING FORM — CERTIFICATION</h1>
        <div class="ctr tiny" style="margin-bottom:10px">Page 2 of 2 · Form A-1-131 · Labor Code §1776</div>
        <div class="compl">
          <p>I, ${ul(esc(st.name))}, ${ul(esc(st.title))},<br>
          <span class="tiny">(Name of Signatory Party) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (Title)</span></p>

          <p>do hereby state:</p>

          <p><b>(1)</b> That I pay or supervise the payment of the persons employed by ${ul(esc(p.company.name))}
          on the ${ul(esc(p.project.name))}; that during the payroll period commencing on
          ${ul(Form.fmtDate(ws))} and ending ${ul(Form.fmtDate(p.payroll.weekEnding))},
          all persons employed on said project have been paid the full weekly wages earned, that no rebates have been or will be made
          either directly or indirectly to or on behalf of said contractor or subcontractor from the full weekly wages earned by any
          person, and that no deductions have been made either directly or indirectly from the full wages earned by any person, other
          than permissible deductions as defined in the California Labor Code and described below:</p>

          <div style="border:1px solid #000;padding:5px;min-height:32px;font-size:8.4px">${esc(descs) || 'None other than FICA, federal and state withholding taxes and SDI.'}</div>

          <p><b>(2)</b> That any payrolls otherwise under this contract required to be submitted for the above period are correct and
          complete; that the wage rates for laborers or mechanics contained therein are not less than the applicable wage rates
          contained in any wage determination incorporated into the contract; that the classifications set forth therein for each
          laborer or mechanic conform with the work he or she performed.</p>

          <p><b>(3)</b> That any apprentices employed in the above period are duly registered in a bona fide apprenticeship program
          registered with the California Division of Apprenticeship Standards.</p>

          <p><b>(4)</b> That fringe benefits are paid as follows:</p>
          <p style="margin-left:16px"><span class="box">${fm === 'plan' || fm === 'both' ? 'X' : ''}</span>
          <b>(a) WHERE FRINGE BENEFITS ARE PAID TO APPROVED PLANS, FUNDS, OR PROGRAMS</b><br>
          <span style="margin-left:16px">— in addition to the basic hourly wage rates paid to each laborer or mechanic listed in the
          above referenced payroll, payments of fringe benefits as listed in the contract have been or will be made to appropriate
          programs for the benefit of such employees, except as noted in section 4(c) below.</span></p>

          <p style="margin-left:16px"><span class="box">${fm === 'cash' || fm === 'both' ? 'X' : ''}</span>
          <b>(b) WHERE FRINGE BENEFITS ARE PAID IN CASH</b><br>
          <span style="margin-left:16px">— each laborer or mechanic listed in the above referenced payroll has been paid, as indicated
          on the payroll, an amount not less than the sum of the applicable basic hourly wage rate plus the amount of the required
          fringe benefits as listed in the contract, except as noted in section 4(c) below.</span></p>

          <p style="margin-left:16px"><b>(c) EXCEPTIONS</b></p>
          <table style="margin-left:16px;width:calc(100% - 16px)">
            <tr><td class="ctr cap" style="width:40%">Exception (Craft)</td><td class="ctr cap">Explanation</td></tr>
            <tr><td style="height:20px" class="val">${esc((st.exceptions || '').split('—')[0] || '')}</td>
                <td class="val">${esc((st.exceptions || '').split('—').slice(1).join('—') || (st.exceptions ? '' : 'None'))}</td></tr>
            <tr><td style="height:18px"></td><td></td></tr>
          </table>

          <p style="margin-top:8px"><b>REMARKS:</b></p>
          <div style="border:1px solid #000;padding:5px;min-height:34px;font-size:8.4px">${esc(st.remarks)}</div>

          <div class="sig" style="margin-top:16px">
            NAME AND TITLE ${ul(esc(st.name) + ', ' + esc(st.title))}
            &nbsp;&nbsp; SIGNATURE ${ul('')}
          </div>
          <p style="margin-top:12px;font-size:7.8px">I declare under penalty of perjury under the laws of the State of California that
          the foregoing is true and correct. THE WILLFUL FALSIFICATION OF ANY OF THE ABOVE STATEMENTS MAY SUBJECT THE CONTRACTOR OR
          SUBCONTRACTOR TO CIVIL OR CRIMINAL PROSECUTION.</p>
        </div>${wm}
      </div>`;
    }

    return `<div class="sheet portrait" style="max-width:7.4in;margin:0 auto">
      <div class="ctr" style="font-size:10.5px;font-weight:700;margin-bottom:6px">Date ${ul(Form.fmtDate(new Date().toISOString().slice(0, 10)))}</div>
      <h1 style="font-size:12px;margin-bottom:9px">STATEMENT OF COMPLIANCE</h1>
      <div class="compl">
        <p>I, ${ul(esc(st.name))}, ${ul(esc(st.title))}<br>
        <span class="tiny">(Name of Signatory Party) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (Title)</span></p>

        <p>do hereby state:</p>

        <p><b>(1)</b> That I pay or supervise the payment of the persons employed by ${ul(esc(p.company.name))} on the
        ${ul(esc(p.project.name))}; that during the payroll period commencing on ${ul(Form.fmtDate(ws))}
        and ending ${ul(Form.fmtDate(p.payroll.weekEnding))}, all persons employed on said project have been paid the full
        weekly wages earned, that no rebates have been or will be made either directly or indirectly to or on behalf of said contractor
        or subcontractor from the full weekly wages earned by any person and that no deductions have been made either directly or
        indirectly from the full wages earned by any person, other than permissible deductions as defined in Regulations, Part 3
        (29 C.F.R. Subtitle A), issued by the Secretary of Labor under the Copeland Act, as amended (48 Stat. 948, 63 Stat. 108,
        72 Stat. 967; 76 Stat. 357; 40 U.S.C. § 3145), and described below:</p>

        <div style="border:1px solid #000;padding:5px;min-height:32px;font-size:8.4px">${esc(descs) || 'None other than FICA, federal and state withholding taxes.'}</div>

        <p><b>(2)</b> That any payrolls otherwise under this contract required to be submitted for the above period are correct and
        complete; that the wage rates for laborers or mechanics contained therein are not less than the applicable wage rates contained
        in any wage determination incorporated into the contract; that the classifications set forth therein for each laborer or
        mechanic conform with the work he performed.</p>

        <p><b>(3)</b> That any apprentices employed in the above period are duly registered in a bona fide apprenticeship program
        registered with a State apprenticeship agency recognized by the Bureau of Apprenticeship and Training, United States Department
        of Labor, or if no such recognized agency exists in a State, are registered with the Bureau of Apprenticeship and Training,
        United States Department of Labor.</p>

        <p><b>(4)</b> That:</p>
        <p style="margin-left:16px"><span class="box">${fm === 'plan' || fm === 'both' ? 'X' : ''}</span>
        <b>(a) WHERE FRINGE BENEFITS ARE PAID TO APPROVED PLANS, FUNDS, OR PROGRAMS</b><br>
        <span style="margin-left:16px">— in addition to the basic hourly wage rates paid to each laborer or mechanic listed in the above
        referenced payroll, payments of fringe benefits as listed in the contract have been or will be made to appropriate programs for
        the benefit of such employees, except as noted in section 4(c) below.</span></p>

        <p style="margin-left:16px"><span class="box">${fm === 'cash' || fm === 'both' ? 'X' : ''}</span>
        <b>(b) WHERE FRINGE BENEFITS ARE PAID IN CASH</b><br>
        <span style="margin-left:16px">— Each laborer or mechanic listed in the above referenced payroll has been paid, as indicated on
        the payroll, an amount not less than the sum of the applicable basic hourly wage rate plus the amount of the required fringe
        benefits as listed in the contract, except as noted in section 4(c) below.</span></p>

        <p style="margin-left:16px"><b>(c) EXCEPTIONS</b></p>
        <table style="margin-left:16px;width:calc(100% - 16px)">
          <tr><td class="ctr cap" style="width:40%">Exception (Craft)</td><td class="ctr cap">Explanation</td></tr>
          <tr><td style="height:20px" class="val">${esc((st.exceptions || '').split('—')[0] || '')}</td>
              <td class="val">${esc((st.exceptions || '').split('—').slice(1).join('—') || (st.exceptions ? '' : 'None'))}</td></tr>
          <tr><td style="height:18px"></td><td></td></tr>
        </table>

        <p style="margin-top:8px"><b>REMARKS:</b></p>
        <div style="border:1px solid #000;padding:5px;min-height:34px;font-size:8.4px">${esc(st.remarks)}</div>

        <div class="sig" style="margin-top:18px">
          NAME AND TITLE ${ul(esc(st.name) + ', ' + esc(st.title))}
          &nbsp;&nbsp;&nbsp; SIGNATURE ${ul('')}
        </div>

        <p style="margin-top:14px;font-size:7.8px">THE WILLFUL FALSIFICATION OF ANY OF THE ABOVE STATEMENTS MAY SUBJECT THE CONTRACTOR
        OR SUBCONTRACTOR TO CIVIL OR CRIMINAL PROSECUTION. SEE SECTION 1001 OF TITLE 18 AND SECTION 231 OF TITLE 31 OF THE UNITED
        STATES CODE.</p>
      </div>${wm}
    </div>`;
  }
};

/* ------------------------------------------------------------------ boot */
Pay.init();
Store.load();
UI.renderAll();
UI.go('setup');

$('projSel').onchange = e => App.switchProject(e.target.value);
$('restoreFile').onchange = function () { Store.restore(this); };
window.addEventListener('beforeunload', Store.save);

/* offline indicator */
const netDot = () => { const d = $('offlineDot');
  d.classList.toggle('off', !navigator.onLine);
  d.title = navigator.onLine ? 'Online' : 'Offline — your data is safe and saved on this device'; };
window.addEventListener('online', netDot); window.addEventListener('offline', netDot); netDot();

/* PWA install */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e; $('btnInstall').hidden = false;
});
$('btnInstall').onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt = null; $('btnInstall').hidden = true;
};
if ('serviceWorker' in navigator)
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

/* keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  if (e.key === 'ArrowRight') UI.nextTab();
  if (e.key === 'ArrowLeft')  UI.prevTab();
  if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); UI.print(); }
});
