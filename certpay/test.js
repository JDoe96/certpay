/* CertPay engine tests — run: node test.js */
const E = require('./app/engine.js');

let pass = 0, fail = 0;
const eq = (name, got, want, tol = 0.005) => {
  const ok = Math.abs(got - want) <= tol;
  ok ? pass++ : fail++;
  console.log((ok ? '  ok  ' : ' FAIL ') + name + '  (got ' + (+got).toFixed(2) + ', want ' + (+want).toFixed(2) + ')');
};
const is = (name, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log((ok ? '  ok  ' : ' FAIL ') + name + (ok ? '' : '  (got ' + got + ', want ' + want + ')'));
};
const sec = s => console.log('\n\x1b[1m' + s + '\x1b[0m');

const CLS = [{ id: 'c1', name: 'Electrician', base: '34.85', fringe: '14.20' }];
const P   = [{ id: 'p1', name: 'J. Ruiz', ssn4: '4417', addr: '12 Oak St' }];
const line = o => Object.assign({
  personId: 'p1', classId: 'c1', hours: [0,0,0,0,0,0,0], otherHours: '',
  baseOverride: '', fringeOverride: '', fringePaid: 'cash', autoFica: true, ded: {}
}, o);
const ctxF = ln => ({ jurisdiction:'federal', classes:CLS, people:P, lines:[ln],
  company:{name:'Acme',addr:'1 Bay St'}, project:{name:'School'},
  payroll:{num:'1',weekEnding:'2026-08-14',statement:{name:'D. W.',fringeMode:'cash'}} });
const ctxC = ln => Object.assign(ctxF(ln), { jurisdiction:'ca' });

/* --------------------------------------------------------------------- */
sec('Federal — straight 40-hour week, fringe in cash');
let r = E.calcLine(line({ hours:[0,8,8,8,8,8,0] }), ctxF());
eq('total project hours', r.projHrs, 40);
eq('no overtime', r.otH, 0);
eq('straight rate = base + fringe', r.stRate, 49.05);
eq('gross', r.gross, 40 * 49.05);
eq('FICA auto 7.65%', r.fica, 40 * 49.05 * 0.0765);
eq('net = gross - FICA', r.net, 40 * 49.05 - 40 * 49.05 * 0.0765);

sec('Federal — 50-hour week (fringe must NOT be multiplied)');
r = E.calcLine(line({ hours:[0,10,10,10,10,10,0] }), ctxF());
eq('straight hours capped at 40', r.stH, 40);
eq('overtime hours', r.otH, 10);
eq('OT rate = 1.5x base + fringe', r.otRate, 34.85 * 1.5 + 14.20);
eq('gross', r.gross, 40 * 49.05 + 10 * 66.475);

sec('Federal — fringe paid into a benefit plan');
r = E.calcLine(line({ hours:[0,8,8,8,8,8,0], fringePaid:'plan' }), ctxF());
eq('cash rate excludes plan fringe', r.stRate, 34.85);
eq('package still credited for compliance', r.actualPackage, 49.05);
eq('gross reflects cash only', r.gross, 40 * 34.85);

sec('Federal — split week: 30 project hrs + 20 other = 50 total');
r = E.calcLine(line({ hours:[0,6,6,6,6,6,0], otherHours:'20' }), ctxF());
eq('project hours', r.projHrs, 30);
eq('OT allocated in proportion (10 x 30/50)', r.otH, 6);
eq('straight hours', r.stH, 24);

sec('California — daily overtime over 8 hours');
r = E.calcLine(line({ hours:[0,10,10,10,10,0,0] }), ctxC());
eq('40 total hours', r.projHrs, 40);
eq('straight time = 8/day', r.stH, 32);
eq('overtime = 2/day', r.otH, 8);
eq('no double time', r.dtH, 0);
eq('gross', r.gross, 32 * 49.05 + 8 * 66.475);

sec('California — double time beyond 12 hours in a day');
r = E.calcLine(line({ hours:[0,14,0,0,0,0,0] }), ctxC());
eq('straight time', r.stH, 8);
eq('overtime (hours 8-12)', r.otH, 4);
eq('double time (beyond 12)', r.dtH, 2);
eq('DT rate = 2x base + fringe', r.dtRate, 34.85 * 2 + 14.20);

sec('California — 7th consecutive day');
r = E.calcLine(line({ hours:[8,8,8,8,8,8,8] }), ctxC());
eq('56 hours worked', r.projHrs, 56);
eq('straight time capped by weekly rule', r.stH, 40);
eq('overtime', r.otH, 16);
eq('no double time at 8 hrs on day 7', r.dtH, 0);
r = E.calcLine(line({ hours:[8,8,8,8,8,8,10] }), ctxC());
eq('7th day beyond 8 hrs is double time', r.dtH, 2);

sec('California — SDI withheld automatically');
r = E.calcLine(line({ hours:[0,8,8,8,8,8,0] }), ctxC());
eq('SDI at 1.1% of gross', r.sdi, 40 * 49.05 * 0.011);
r = E.calcLine(line({ hours:[0,8,8,8,8,8,0] }), ctxF());
eq('no SDI on federal payrolls', r.sdi, 0);

sec('California — itemised fringe contributions all deduct');
r = E.calcLine(line({ hours:[0,8,8,8,8,8,0], autoFica:false, autoSdi:false,
  ded:{ fica:'150.09', fed:'200', state:'80', sdi:'21.58', vac:'40', hw:'120',
        pension:'95', training:'12', fundadmin:'5', dues:'30', travel:'25', savings:'10', other:'15' } }), ctxC());
eq('all thirteen deduction fields sum', r.ded, 150.09+200+80+21.58+40+120+95+12+5+30+25+10+15);

sec('Per-day allocation printed on the form');
r = E.calcLine(line({ hours:[0,10,10,10,10,8,0] }), ctxF());
is('federal fills straight time chronologically',
   r.perDay.map(d => d.st + '/' + d.ot).join(' '),
   '0/0 10/0 10/0 10/0 10/0 0/8 0/0');
eq('per-day ST sums to weekly ST', r.perDay.reduce((a,d)=>a+d.st,0), r.stH);
eq('per-day OT sums to weekly OT', r.perDay.reduce((a,d)=>a+d.ot,0), r.otH);
eq('per-day total equals hours worked', r.perDay.reduce((a,d)=>a+d.st+d.ot+d.dt,0), 48);
r = E.calcLine(line({ hours:[0,8,8,8,8,8,0] }), ctxF());
is('40-hour week shows no overtime on any day', r.perDay.every(d => d.ot === 0), true);
r = E.calcLine(line({ hours:[0,10,10,10,10,0,0] }), ctxC());
is('CA 4x10 shows 8 ST + 2 OT each day',
   r.perDay.map(d => d.st + '/' + d.ot).join(' '),
   '0/0 8/2 8/2 8/2 8/2 0/0 0/0');
r = E.calcLine(line({ hours:[0,14,0,0,0,0,0] }), ctxC());
is('CA 14-hour day splits 8/4/2',
   r.perDay[1].st + '/' + r.perDay[1].ot + '/' + r.perDay[1].dt, '8/4/2');
r = E.calcLine(line({ hours:[8,8,8,8,8,8,8] }), ctxC());
eq('CA seven days: per-day ST sums to 40', r.perDay.reduce((a,d)=>a+d.st,0), 40);
eq('CA seven days: per-day OT sums to 16', r.perDay.reduce((a,d)=>a+d.ot,0), 16);
is('CA seventh day is entirely overtime', r.perDay[6].st === 0 && r.perDay[6].ot === 8, true);

sec('Weekly totals across a crew');
const crew = {
  jurisdiction:'federal', classes:CLS, people:P,
  company:{name:'Acme',addr:'1 Bay St'}, project:{name:'School'},
  payroll:{num:'1',weekEnding:'2026-08-14',statement:{name:'D',fringeMode:'cash'}},
  lines:[ line({hours:[0,8,8,8,8,8,0]}), line({hours:[0,10,10,10,10,10,0]}) ]
};
const t = E.calcTotals(crew.lines, crew);
eq('crew hours', t.hours, 90);
eq('crew overtime', t.ot, 10);
eq('crew gross', t.gross, (40*49.05) + (40*49.05 + 10*66.475));

sec('Validator — catches underpayment with dollar figure');
let v = E.validate(ctxF(line({ hours:[0,8,8,8,8,8,0], baseOverride:'30.00', fringeOverride:'10.00' })));
let hit = v.find(f => /below prevailing wage/.test(f.t));
is('underpayment flagged as an error', !!hit && hit.lv === 'e', true);
is('states the exact amount owed', /362\.00/.test(hit ? hit.m : ''), true);

sec('Validator — catches a full SSN');
v = E.validate({ ...ctxF(line({ hours:[0,8,0,0,0,0,0] })), people:[{id:'p1',name:'J. Ruiz',ssn4:'123456789'}] });
is('full SSN blocked', !!v.find(f => /full SSN/.test(f.t) && f.lv === 'e'), true);

sec('Validator — catches missing classification');
v = E.validate(ctxF(line({ hours:[0,8,0,0,0,0,0], classId:'' })));
is('missing classification is an error', !!v.find(f => /no work classification/.test(f.t) && f.lv === 'e'), true);

sec('Validator — California-specific requirements');
v = E.validate(ctxC(line({ hours:[0,8,0,0,0,0,0] })));
is('flags missing CSLB licence', !!v.find(f => /CSLB/.test(f.t)), true);
is('flags missing DIR registration', !!v.find(f => /DIR registration/.test(f.t)), true);
is('flags missing cheque number', !!v.find(f => /check number/.test(f.t)), true);

sec('Validator — clean payroll passes');
v = E.validate({
  jurisdiction:'federal', classes:CLS, people:P,
  company:{name:'Acme Electric LLC', addr:'118 Bay St'},
  project:{name:'Glynn County School'},
  payroll:{num:'1', weekEnding:'2026-08-14', statement:{name:'Dana W.', title:'Owner', fringeMode:'cash'}},
  lines:[ line({ hours:[0,8,8,8,8,8,0] }) ]
});
is('no errors on a clean payroll', v.filter(f => f.lv === 'e').length, 0);
is('reports the all-clear', v.some(f => f.lv === 'o'), true);

sec('Edge cases');
r = E.calcLine(line({ hours:[0,0,0,0,0,0,0] }), ctxF());
eq('zero hours -> zero gross', r.gross, 0);
eq('zero hours -> no overtime', r.otH, 0);
r = E.calcLine(line({ hours:[0,'x',null,undefined,'',8,0] }), ctxF());
eq('junk input treated as zero', r.projHrs, 8);
r = E.calcLine(line({ hours:[0,7.25,7.5,8.75,6,4.5,0] }), ctxF());
eq('fractional hours', r.projHrs, 34);
r = E.calcLine(line({ hours:[0,8,8,8,8,8,0], classId:'nope' }), ctxF());
eq('unknown classification -> zero required rate', r.reqPackage, 0);

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + ' passed, ' + fail + ' failed\x1b[0m\n');
process.exit(fail ? 1 : 0);
