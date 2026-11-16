const STORAGE_KEY = 'profitplus-auto-finance-v1';
const VIEW_MODE_KEY = 'profitplus-interface-mode-v1';
const today = new Date();
const isoDate = (date = today) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const shiftDate = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return isoDate(d); };
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const shortDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—';
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'NA';
const seed = {
  customers: [
    { code: 'HP-1042', name: 'Ananya Rao', phone: '98••• 41 82', village: 'Kothavalasa', vehicle: 'Honda Activa 6G', vehicleType: 'Scooter', regNo: 'AP 31 AB 2468', principal: 82000, downPayment: 18000, interestRate: 12, months: 24, emi: 3863, totalPayable: 92712, paid: 46356, nextDue: shiftDate(5), status: 'Active', guarantor: 'S. Rao', created: shiftDate(-54), address: 'Main Road, Kothavalasa' },
    { code: 'HP-1037', name: 'Rohan Kumar', phone: '97••• 88 14', village: 'Pendurthi', vehicle: 'TVS Jupiter', vehicleType: 'Scooter', regNo: 'AP 39 CD 1852', principal: 68000, downPayment: 12000, interestRate: 12, months: 24, emi: 3207, totalPayable: 76968, paid: 19242, nextDue: shiftDate(-3), status: 'Active', guarantor: 'K. Ramesh', created: shiftDate(-68), address: 'Market Street, Pendurthi' },
    { code: 'HP-1028', name: 'Meera Devi', phone: '99••• 06 73', village: 'S Kota', vehicle: 'Hero Splendor+', vehicleType: 'Motorcycle', regNo: 'AP 35 EF 5501', principal: 74000, downPayment: 16000, interestRate: 11, months: 24, emi: 3428, totalPayable: 82272, paid: 71988, nextDue: shiftDate(12), status: 'Active', guarantor: 'V. Naidu', created: shiftDate(-103), address: 'Temple Lane, S Kota' },
    { code: 'HP-1014', name: 'Arjun Prasad', phone: '96••• 52 09', village: 'Kothavalasa', vehicle: 'Bajaj Pulsar 125', vehicleType: 'Motorcycle', regNo: 'AP 31 GH 9022', principal: 95000, downPayment: 25000, interestRate: 12, months: 30, emi: 3767, totalPayable: 113010, paid: 113010, nextDue: '', status: 'Closed', guarantor: 'P. Suresh', created: shiftDate(-320), address: 'Railway Quarters, Kothavalasa' },
  ],
  transactions: [
    { id: 'RC-587', code: 'HP-1042', date: shiftDate(-1), amount: 3863, mode: 'UPI', type: 'Collection', narration: 'November installment' },
    { id: 'RC-586', code: 'HP-1037', date: shiftDate(-2), amount: 3207, mode: 'Cash', type: 'Collection', narration: 'Part payment' },
    { id: 'RC-584', code: 'HP-1028', date: shiftDate(-4), amount: 3428, mode: 'Cash', type: 'Collection', narration: 'Monthly installment' },
    { id: 'RC-581', code: 'HP-1042', date: shiftDate(-8), amount: 3863, mode: 'Cash', type: 'Collection', narration: 'Monthly installment' },
  ],
  nextCode: 1043,
  nextReceipt: 588,
  nextVoucher: 1,
  vouchers: [],
  branches: [{id:'BR-01',code:'01',name:'Kothavalasa',address:'',phone:'',manager:'',active:'Yes'},{id:'BR-02',code:'02',name:'Pendurthi',address:'',phone:'',manager:'',active:'Yes'},{id:'BR-03',code:'03',name:'S Kota',address:'',phone:'',manager:'',active:'Yes'}],
  lines: [{id:'LN-01',type:'Main Zone',code:'01',name:'Kothavalasa',parent:''},{id:'LN-02',type:'Sub Zone',code:'02',name:'Pendurthi',parent:'01'}],
  books: [{id:'BK-1',bookNo:'1',branch:'Office',zone:'Office'},{id:'BK-2',bookNo:'2',branch:'Pendurthi',zone:'Zone'}],
  vehicleEvents: [],
};
let store = loadStore();
let currentPage = 'home';
let dueViewMode = 'all';
let ledgerViewMode = 'ledger';
let hpBalanceMode = 'today';
let selectedCalculationCode = '';
let selectedDaybookDate = isoDate();
let toastTimer;

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.customers) && Array.isArray(saved.transactions)) return {
      ...structuredClone(seed), ...saved,
      vouchers:Array.isArray(saved.vouchers)?saved.vouchers:[],
      branches:Array.isArray(saved.branches)?saved.branches:structuredClone(seed.branches),
      lines:Array.isArray(saved.lines)?saved.lines:structuredClone(seed.lines),
      books:Array.isArray(saved.books)?saved.books:structuredClone(seed.books),
      vehicleEvents:Array.isArray(saved.vehicleEvents)?saved.vehicleEvents:[],
      nextVoucher:Number(saved.nextVoucher)||1,
    };
  } catch { /* Start with the sample book when browser storage is unavailable. */ }
  return structuredClone(seed);
}
function persist(nextStore = store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore)); } catch {
    if (nextStore !== store) {
      showToast('The account could not be saved. Browser storage may be full or unavailable.', 'error');
      return false;
    }
    showToast('Browser storage is unavailable. Changes will last until this tab closes.');
  }
  store = nextStore;
  updateCounts();
  return true;
}
function updateCounts() {
  const count = document.querySelector('#application-count');
  if (count) count.textContent = store.customers.filter((customer) => customer.status !== 'Closed').length;
}
function showToast(message, kind = 'success') {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.className = `toast visible ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3100);
}
function updateClock() {
  const clock = document.querySelector('#live-clock');
  if (clock) clock.textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
}
function pageTitle(page) {
  return ({ home: 'Dashboard', applications: 'Customer list', 'new-application': 'Customer creation', calculation: 'Calculation', customers: 'Customer directory', receipts: 'Receipt entry', voucher: 'Voucher entry', journal: 'Journal entry', payment: 'Payment entry', contra: 'Contra voucher', 'hp-details': 'HP details', 'od-calculation': 'OD calculation', due: 'Due list', ledger: 'Ledger', 'hp-register': 'HP register', monthly: 'Monthly transactions', vehicles: 'Vehicle status', 'vehicle-seizing': 'Vehicle seizing', branches: 'Branch creation', lines: 'Line creation', books: 'Book creation', 'account-close': 'Account closing', daybook: 'Daybook details', reports: 'Reports', 'showroom': 'Showroom', 'about': 'About PROFIT+' })[page] || 'Dashboard';
}
function navigate(page, accountCode) {
  if (page === 'due') dueViewMode = 'all';
  if (page === 'ledger') ledgerViewMode = 'ledger';
  currentPage = page;
  document.querySelector('#breadcrumb-current').textContent = pageTitle(page);
  document.querySelectorAll('.side-link').forEach((link) => link.classList.toggle('active', link.dataset.page === page));
  document.querySelectorAll('.top-nav button').forEach((link) => link.classList.toggle('active', link.dataset.page === page));
  document.querySelector('#popup-module').value = page;
  render(accountCode);
}
const popupPageGroups=[
  ['Home and customers',[['home','Dashboard'],['applications','Customer list'],['new-application','Customer creation'],['customers','Customer directory'],['calculation','Calculation']]],
  ['Transactions',[['receipts','Receipt entry'],['voucher','Voucher entry'],['payment','Payment entry'],['journal','Journal entry'],['contra','Contra voucher'],['due','Due list']]],
  ['Management',[['ledger','Ledger'],['hp-register','HP register'],['hp-details','HP details'],['od-calculation','OD calculation'],['monthly','Monthly transactions'],['vehicles','Vehicle status'],['vehicle-seizing','Vehicle seizing'],['account-close','Account closing'],['daybook','Daybook details'],['reports','Reports']]],
  ['Master data',[['branches','Branch creation'],['lines','Line creation'],['books','Book creation']]],
  ['Other',[['showroom','Showroom'],['about','About PROFIT+']]],
];
function buildPopupNavigation(){
  const picker = document.querySelector('#popup-module');
  picker.innerHTML = popupPageGroups.map(([group, pages]) =>
    `<optgroup label="${esc(group)}">${pages.map(([page, label]) => `<option value="${esc(page)}">${esc(label)}</option>`).join('')}</optgroup>`
  ).join('');
  picker.value = currentPage;
  picker.addEventListener('change', () => navigate(picker.value));
}
function setViewMode(mode) {
  const popup = mode === 'popup';
  document.body.classList.toggle('popup-interface-mode', popup);
  document.querySelector('.popup-module-picker').hidden = !popup;
  document.querySelector('#view-mode-toggle').textContent = popup ? 'Sidebar view' : 'Popup view';
  try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch {}
}
function paginateTables(content, frameHeight) {
  const defaultLimit = Math.max(4, Math.min(12, Math.floor((frameHeight - 250) / 30)));
  for (const wrap of content.querySelectorAll('.table-wrap')) {
    const body = wrap.querySelector('table > tbody');
    if (!body || !wrap.getClientRects().length) continue;
    const limit = wrap.closest('.calculation-report') ? Math.min(defaultLimit, 5) : defaultLimit;
    const rows = [...body.rows].filter(row => !row.hidden);
    let pager = wrap.nextElementSibling;
    if (!pager?.matches('.popup-pagination')) {
      if (rows.length <= limit) continue;
      pager = document.createElement('div');
      pager.className = 'popup-pagination';
      pager.innerHTML = '<button class="btn" type="button">Previous</button><span aria-live="polite"></span><button class="btn" type="button">Next</button>';
      wrap.after(pager);
      pager.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        pager.dataset.popupPage = Number(pager.dataset.popupPage) + (button === pager.firstElementChild ? -1 : 1);
        fitPageContent();
      });
    }
    const lastPage = Math.max(0, Math.ceil(rows.length / limit) - 1);
    const page = Math.max(0, Math.min(Number(pager.dataset.popupPage) || 0, lastPage));
    pager.dataset.popupPage = page;
    pager.toggleAttribute('hidden', lastPage === 0);
    rows.forEach((row, index) => row.toggleAttribute('data-popup-row-hidden', Math.floor(index / limit) !== page));
    pager.firstElementChild.disabled = page === 0;
    pager.lastElementChild.disabled = page === lastPage;
    const label = pager.querySelector('span');
    const range = `${page * limit + 1}–${Math.min((page + 1) * limit, rows.length)} of ${rows.length}`;
    if (label.textContent !== range) label.textContent = range;
  }
}
function fitPageContent() {
  const frame = document.querySelector('#popup-page-frame');
  const content = document.querySelector('#page-content');
  if (!frame.clientWidth || !frame.clientHeight) return;
  paginateTables(content, frame.clientHeight);
  const scale = Math.min(1, frame.clientWidth / content.scrollWidth, frame.clientHeight / content.scrollHeight);
  content.style.setProperty('--popup-scale', scale);
  content.style.setProperty('--popup-inline-shift', `${(content.offsetWidth - content.scrollWidth) * scale / 2}px`);
}
function heading(title, subtitle, action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">Padma Bhushan Auto Finance</div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${action}</div></div>`;
}
function btn(label, action, style = 'btn', extra = '') { return `<button class="${style}" data-action="${action}" ${extra}>${label}</button>`; }
function customerOptions(selected = '') {
  return store.customers.map((customer) => `<option value="${esc(customer.code)}" ${customer.code === selected ? 'selected' : ''}>${esc(customer.code)} · ${esc(customer.name)}</option>`).join('');
}
function statusPill(status) {
  const key = status === 'Closed' ? 'closed' : status === 'Seized' ? 'seized' : status === 'Due' ? 'due' : 'active';
  return `<span class="status-pill ${key}">${esc(status || 'Active')}</span>`;
}
function initialsCell(name, sub = '') { return `<div class="customer-cell"><span class="mini-avatar">${initials(name)}</span><span><strong>${esc(name)}</strong><small>${esc(sub)}</small></span></div>`; }
function dueAmount(customer) {
  if (customer.status === 'Closed') return 0;
  const remaining = Math.max(0, customer.totalPayable - customer.paid);
  return Math.min(customer.emi, remaining);
}
function totalOutstanding() { return store.customers.reduce((sum, customer) => sum + Math.max(0, customer.totalPayable - customer.paid), 0); }
function dashboard() {
  const active = store.customers.filter((customer) => customer.status === 'Active');
  const dueToday = store.customers.filter((customer) => customer.status === 'Active' && customer.nextDue && customer.nextDue <= isoDate());
  const collections = store.transactions.filter((transaction) => transaction.date === isoDate()).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const recent = store.transactions.filter((transaction)=>transaction.type==='Collection'||transaction.type==='Cheque Return').sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 4);
  const modules = [
    ['applications', '♙', 'Customer list'], ['receipts', '↙', 'Receipt entry'], ['voucher', '▤', 'Voucher entry'], ['payment', '↗', 'Payment entry'],
    ['journal', '≡', 'Journal entry'], ['contra', '⇄', 'Contra voucher'], ['hp-details', '⌕', 'HP details'], ['daybook', '▧', 'Daybook details'],
    ['new-application', '＋', 'Account opening'], ['account-close', '×', 'Account closing'], ['due', '◷', 'Due list'], ['hp-register', '▦', 'HP register'],
    ['ledger', '▥', 'Ledger'], ['od-calculation', '%', 'OD calculation'], ['monthly', '▣', 'Monthly transactions'], ['books', '▤', 'Receipt books'],
  ];
  return `${heading('Welcome back, Padma Bhushan', 'Here is your auto finance portfolio at a glance.', btn('＋ New application', 'navigate:new-application', 'btn btn-primary'))}
    <section class="dashboard-hero"><div class="hero-copy"><div class="hero-kicker">Your finance desk</div><h1>Move every account forward.</h1><p>Manage customer finance, track collections, and keep your vehicle portfolio up to date from one simple workspace.</p><div class="hero-actions">${btn('＋ Open an account', 'navigate:new-application', 'btn btn-primary')}${btn('View due list', 'navigate:due', 'btn')}</div></div>
      <div class="hero-visual" aria-hidden="true"><svg viewBox="0 0 360 230" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="177" cy="204" rx="144" ry="9" fill="#14172B" fill-opacity=".34"/><circle cx="92" cy="165" r="43" stroke="#1A1C2B" stroke-width="10"/><circle cx="92" cy="165" r="31" stroke="#C7D2E5" stroke-width="2"/><circle cx="270" cy="165" r="43" stroke="#1A1C2B" stroke-width="10"/><circle cx="270" cy="165" r="31" stroke="#C7D2E5" stroke-width="2"/><path d="M92 164L143 164L174 122L215 162L270 164M143 164L160 104L212 104L235 165" stroke="#D7DFEC" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M160 104C164 83 185 72 211 76L239 83L249 103L219 111L173 112" fill="#E55C45" stroke="#A64039" stroke-width="3"/><path d="M180 79L210 78L225 86L189 88Z" fill="#F28A68"/><path d="M231 100L258 94L273 99L251 108" stroke="#D7DFEC" stroke-width="7" stroke-linecap="round"/><path d="M168 103L157 85L139 85" stroke="#D7DFEC" stroke-width="6" stroke-linecap="round"/><path d="M222 108L207 145L228 157L246 112" fill="#BAC7DA" stroke="#64718A" stroke-width="3"/><path d="M164 111L150 151L170 164L194 117" fill="#BAC7DA" stroke="#64718A" stroke-width="3"/><path d="M142 164L158 164M213 164L230 164" stroke="#D7DFEC" stroke-width="7" stroke-linecap="round"/><path d="M258 123L279 122L290 129" stroke="#D7DFEC" stroke-width="4" stroke-linecap="round"/><path d="M272 157L287 149" stroke="#E5A05C" stroke-width="4" stroke-linecap="round"/><path d="M86 164H98M92 158V171M264 164H276M270 158V171" stroke="#CFD9E7" stroke-width="3"/></svg></div>
      <div class="hero-stats"><div class="hero-stat"><small>Active finance accounts</small><strong>${active.length}</strong><span>● Portfolio</span></div><div class="hero-stat"><small>Outstanding balance</small><strong>${money(totalOutstanding())}</strong><span class="neutral">Across all accounts</span></div><div class="hero-stat"><small>Collections today</small><strong>${money(collections)}</strong><span>● Updated live</span></div></div></section>
    <section class="stats-grid"><div class="stat-card"><span class="stat-icon purple">♙</span><div class="stat-copy"><small>Total accounts</small><strong>${store.customers.length}</strong><em>Finance book</em></div></div><div class="stat-card"><span class="stat-icon green">↙</span><div class="stat-copy"><small>Active accounts</small><strong>${active.length}</strong><em>In repayment</em></div></div><div class="stat-card"><span class="stat-icon amber">◷</span><div class="stat-copy"><small>Installments overdue</small><strong>${dueToday.length}</strong><em style="color:#b17e2c">Need follow-up</em></div></div><div class="stat-card"><span class="stat-icon blue">₹</span><div class="stat-copy"><small>Due this month</small><strong>${money(store.customers.filter((c) => c.status === 'Active').reduce((s,c) => s + dueAmount(c),0))}</strong><em>Scheduled EMI</em></div></div></section>
    <section class="finance-workspace" aria-labelledby="finance-workspace-title">
      <header class="workspace-window-title"><h1 id="finance-workspace-title">Finance workspace</h1></header>
      <div class="module-grid">${modules.map(([page, icon, title]) => `<button class="module-card" data-page="${page}"><span class="module-icon" aria-hidden="true">${icon}</span><span class="module-copy"><strong>${title}</strong></span></button>`).join('')}</div>
    </section>
    <div class="dashboard-bottom"><section class="panel"><div class="panel-pad"><div class="section-head"><div><h2>Recent finance accounts</h2><p>Latest customer activity in your portfolio</p></div><button class="text-button" data-page="applications">View all →</button></div></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Account</th><th>Vehicle</th><th>Balance</th><th>Status</th></tr></thead><tbody>${store.customers.slice(0,4).map((c) => `<tr><td>${initialsCell(c.name, c.village)}</td><td>${esc(c.code)}</td><td>${esc(c.vehicle)}</td><td>${money(Math.max(0,c.totalPayable-c.paid))}</td><td>${statusPill(c.status)}</td></tr>`).join('')}</tbody></table></div></section><section class="panel panel-pad"><div class="section-head"><div><h2>Recent collections</h2><p>Latest receipt activity</p></div><button class="text-button" data-page="receipts">All receipts →</button></div><div class="activity-list">${recent.map((t) => { const c = store.customers.find((x) => x.code === t.code); return `<div class="activity-row"><span class="activity-dot">↙</span><div><strong>${esc(c?.name || t.code)} · ${esc(t.id)}</strong><small>${esc(t.narration || t.mode)} · ${shortDate(t.date)}</small></div><span class="activity-amount">+${money(t.amount)}</span></div>`; }).join('') || '<div class="empty-state">No receipts recorded yet.</div>'}</div></section></div>`;
}

function applicationPhotoField(name, label) {
  return `<div class="application-photo">
    <img alt="${label} preview" width="32" height="32" hidden />
    <input id="${name}" name="${name}" type="file" accept="image/jpeg,image/png,image/webp" data-photo-label="${label}" />
    <label class="btn" for="${name}">Add ${label.toLowerCase()}</label>
    <button class="text-button" type="button" data-action="remove-application-photo" aria-label="Remove ${label.toLowerCase()}" hidden>Remove</button>
  </div>`;
}

function showApplicationSection(form, index) {
  form.querySelectorAll('.form-panel > .form-section').forEach((section, position) => {
    section.classList.toggle('active-application-section', position === index);
  });
  form.querySelectorAll('[data-action="application-section"]').forEach((button, position) => {
    button.setAttribute('aria-pressed', String(position === index));
  });
}

function setApplicationPhoto(input, photo = '') {
  const group = input.closest('.application-photo');
  const preview = group.querySelector('img');
  const hasPhoto = typeof photo === 'string' && photo.startsWith('data:image/jpeg;base64,');
  if (hasPhoto) preview.src = photo;
  else preview.removeAttribute('src');
  preview.hidden = !hasPhoto;
  group.querySelector('button').hidden = !hasPhoto;
  group.querySelector('label').textContent = `${hasPhoto ? 'Change' : 'Add'} ${input.dataset.photoLabel.toLowerCase()}`;
  input.value = '';
  input.removeAttribute('aria-busy');
}

async function readApplicationPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  input.setAttribute('aria-busy', 'true');
  let bitmap;
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      throw new Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
    }
    bitmap = await createImageBitmap(file);
    if (!input.isConnected || input.files[0] !== file) return;
    const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    setApplicationPhoto(input, canvas.toDataURL('image/jpeg', .78));
  } catch (error) {
    if (!input.isConnected || input.files[0] !== file) return;
    input.value = '';
    input.removeAttribute('aria-busy');
    showToast(error instanceof DOMException ? 'This photo could not be opened. Choose a different image.' : error.message, 'error');
  } finally {
    bitmap?.close();
  }
}

function applicationForm() {
  const nextHpCode = `HP-${String(store.nextCode).padStart(4, '0')}`;
  const branchOptions=[...new Set([...(store.branches||[]).map((branch)=>branch.name), 'Kothavalasa','Pendurthi','S Kota','Subbavaram','Other'].filter(Boolean))].map((branch)=>`<option>${esc(branch)}</option>`).join('');
  return `${heading('Customer creation', 'Record customer, guarantor, vehicle, and finance details.', `<button class="btn" type="button" popovertarget="application-summary">Account summary</button>${btn('▧ Calculation', 'navigate:calculation', 'btn')}${btn('← Back to applications', 'navigate:applications', 'btn')}`)}
    <form id="application-form" data-form="application" class="form-layout" autocomplete="off">
      <nav class="application-sections" aria-label="Application sections">${['Customer','Guarantor','Vehicle','Finance','Account and RTO','Follow-up'].map((label, index) => `<button class="btn" type="button" data-action="application-section" data-index="${index}" aria-pressed="${index === 0}">${label}</button>`).join('')}</nav>
      <div class="panel form-panel">
        <section class="form-section active-application-section"><div class="application-section-heading"><h2 class="form-section-head"><span>1</span> Customer details</h2>${applicationPhotoField('customerPhoto', 'Customer photo')}</div><div class="form-grid">
          <div class="field"><label>Party type <em>*</em></label><div class="choice-row"><label><input type="radio" name="partyType" value="HP" checked /> HP</label><label><input type="radio" name="partyType" value="HL" /> HL</label></div></div>
          <div class="field"><label for="hpCode">HP code <em>*</em></label><input id="hpCode" name="hpCode" required value="${nextHpCode}" maxlength="24" /><small class="field-hint">Suggested code is generated automatically; you can edit it.</small></div>
          <div class="field"><label for="customerName">Party name <em>*</em></label><input id="customerName" name="name" required placeholder="Enter full name" /></div>
          <div class="field"><label for="phone">Mobile number <em>*</em></label><input id="phone" name="phone" required inputmode="tel" placeholder="10 digit mobile number" maxlength="10" pattern="[0-9]{10}" /></div>
          <div class="field"><label for="father">Father / husband name</label><input id="father" name="father" placeholder="Name" /></div>
          <div class="field"><label for="partyAge">Age</label><input id="partyAge" name="age" type="number" min="18" max="100" placeholder="Years" /></div>
          <div class="field"><label for="partyDob">Date of birth</label><input id="partyDob" name="dob" type="date" /></div>
          <div class="field"><label for="occupation">Occupation</label><input id="occupation" name="occupation" placeholder="Occupation" /></div>
          <div class="field"><label for="doorNo">Door no.</label><input id="doorNo" name="doorNo" placeholder="Door / house number" /></div>
          <div class="field"><label for="street">Street name</label><input id="street" name="street" placeholder="Street or landmark" /></div>
          <div class="field"><label for="village">Village / town <em>*</em></label><input id="village" name="village" required placeholder="Enter village or town" /></div>
          <div class="field"><label for="mandal">Mandal</label><input id="mandal" name="mandal" placeholder="Mandal" /></div>
          <div class="field"><label for="district">District</label><input id="district" name="district" placeholder="District" /></div>
          <div class="field"><label for="state">State</label><input id="state" name="state" value="Andhra Pradesh" /></div>
          <div class="field"><label for="pinCode">PIN code</label><input id="pinCode" name="pinCode" inputmode="numeric" maxlength="6" placeholder="6 digit PIN" /></div>
          <div class="field"><label for="stdCode">STD code</label><input id="stdCode" name="stdCode" placeholder="Area code" /></div>
          <div class="field"><label for="phoneR">Phone (residence)</label><input id="phoneR" name="phoneR" inputmode="tel" placeholder="Residence phone" /></div>
          <div class="field"><label for="phoneO">Phone (office)</label><input id="phoneO" name="phoneO" inputmode="tel" placeholder="Office phone" /></div>
          <div class="field"><label for="zone">Zone / branch</label><select id="zone" name="zone">${branchOptions}</select></div>
        </div></section>
        <section class="form-section"><div class="application-section-heading"><h2 class="form-section-head"><span>2</span> Guarantor details</h2>${applicationPhotoField('guarantorPhoto', 'Guarantor photo')}</div><div class="form-grid">
          <div class="field"><label for="guarantor">Guarantor name</label><input id="guarantor" name="guarantor" placeholder="Full name" /></div>
          <div class="field"><label for="guarantorPhone">Mobile number</label><input id="guarantorPhone" name="guarantorPhone" inputmode="tel" placeholder="10 digit mobile number" maxlength="10" pattern="[0-9]{10}" /></div>
          <div class="field"><label for="guarantorFather">Father / husband name</label><input id="guarantorFather" name="guarantorFather" placeholder="Name" /></div>
          <div class="field"><label for="guarantorAge">Age</label><input id="guarantorAge" name="guarantorAge" type="number" min="18" max="100" placeholder="Years" /></div>
          <div class="field"><label for="guarantorOccupation">Occupation</label><input id="guarantorOccupation" name="guarantorOccupation" placeholder="Occupation" /></div>
          <div class="field"><label for="guarantorDoorNo">Door no.</label><input id="guarantorDoorNo" name="guarantorDoorNo" placeholder="Door / house number" /></div>
          <div class="field"><label for="guarantorStreet">Street name</label><input id="guarantorStreet" name="guarantorStreet" placeholder="Street or landmark" /></div>
          <div class="field"><label for="guarantorVillage">Village / town</label><input id="guarantorVillage" name="guarantorVillage" placeholder="Village or town" /></div>
          <div class="field"><label for="guarantorMandal">Mandal</label><input id="guarantorMandal" name="guarantorMandal" placeholder="Mandal" /></div>
          <div class="field"><label for="guarantorDistrict">District</label><input id="guarantorDistrict" name="guarantorDistrict" placeholder="District" /></div>
          <div class="field"><label for="guarantorStdCode">STD code</label><input id="guarantorStdCode" name="guarantorStdCode" placeholder="Area code" /></div>
          <div class="field"><label for="guarantorPhoneR">Phone (residence)</label><input id="guarantorPhoneR" name="guarantorPhoneR" inputmode="tel" placeholder="Residence phone" /></div>
          <div class="field"><label for="guarantorPhoneO">Phone (office)</label><input id="guarantorPhoneO" name="guarantorPhoneO" inputmode="tel" placeholder="Office phone" /></div>
        </div></section>
        <section class="form-section"><h2 class="form-section-head"><span>3</span> Vehicle details</h2><div class="form-grid">
          <div class="field"><label for="vehicleType">Vehicle type <em>*</em></label><select id="vehicleType" name="vehicleType" required><option value="">Select type</option><option>Motorcycle</option><option>Scooter</option><option>Three wheeler</option><option>Car</option><option>Commercial vehicle</option></select></div>
          <div class="field"><label for="vehicle">Vehicle name / make <em>*</em></label><input id="vehicle" name="vehicle" required placeholder="e.g. Honda Activa" /></div>
          <div class="field"><label for="vehicleModel">Model</label><input id="vehicleModel" name="vehicleModel" placeholder="Model / year" /></div>
          <div class="field"><label for="regNo">Vehicle number</label><input id="regNo" name="regNo" placeholder="Registration number" /></div>
          <div class="field"><label for="engineNo">Engine number</label><input id="engineNo" name="engineNo" placeholder="Engine number" /></div>
          <div class="field"><label for="chassisNo">Chassis number</label><input id="chassisNo" name="chassisNo" placeholder="Chassis number" /></div>
          <div class="field"><label for="purchasePrice">On-road price (₹) <em>*</em></label><input id="purchasePrice" name="purchasePrice" type="number" min="1" required placeholder="0" /></div>
          <div class="field"><label for="deliveryDate">Delivery date</label><input id="deliveryDate" name="deliveryDate" type="date" /></div>
        </div></section>
        <section class="form-section"><h2 class="form-section-head"><span>4</span> Finance details</h2><div class="form-grid">
          <div class="field"><label for="financeDate">Finance date <em>*</em></label><input id="financeDate" name="financeDate" type="date" required value="${isoDate()}" /></div>
          <div class="field"><label for="firstDue">First installment date <em>*</em></label><input id="firstDue" name="firstDue" type="date" required value="${shiftDate(30)}" /></div>
          <div class="field"><label for="downPayment">DP amount (₹)</label><input id="downPayment" name="downPayment" type="number" min="0" placeholder="0" /></div>
          <div class="field"><label for="initialPayment">Initial payment (₹)</label><input id="initialPayment" name="initialPayment" type="number" min="0" placeholder="0" /></div>
          <div class="field"><label for="dpDue">DP due (₹)</label><input id="dpDue" name="dpDue" type="number" readonly value="0" /></div>
          <div class="field"><label for="docCharges">Document charges (₹)</label><input id="docCharges" name="docCharges" type="number" min="0" placeholder="0" /></div>
          <div class="field"><label for="financeAmount">Finance amount (₹) <em>*</em></label><input id="financeAmount" name="principal" type="number" min="1" required placeholder="Auto calculated from price" /></div>
          <div class="field"><label for="interestRate">Interest rate (% p.a.)</label><input id="interestRate" name="interestRate" type="number" min="0" step="0.25" value="12" /></div>
          <div class="field"><label for="months">No. of installments <em>*</em></label><select id="months" name="months" required><option value="12">12 months</option><option value="18">18 months</option><option value="24" selected>24 months</option><option value="30">30 months</option><option value="36">36 months</option></select></div>
          <div class="field"><label for="ledgerCode">Ledger code</label><input id="ledgerCode" name="ledgerCode" placeholder="Account ledger code" /></div>
          <div class="field"><label for="mode">Initial payment mode</label><select id="mode" name="mode"><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Cheque</option></select></div>
          <div class="field"><label for="bankName">Bank name</label><input id="bankName" name="bankName" placeholder="Bank name, if applicable" /></div>
          <div class="field"><label for="chequeNo">Cheque / transaction no.</label><input id="chequeNo" name="chequeNo" placeholder="If applicable" /></div>
          <div class="field"><label for="partyStatus">Party status</label><select id="partyStatus" name="partyStatus"><option>Active</option><option>Pending</option><option>Closed</option><option>Seized</option></select></div>
        </div></section>
        <section class="form-section"><h2 class="form-section-head"><span>5</span> Account, RTO and recovery details</h2><div class="form-grid">
          <div class="field"><label for="company">Company</label><input id="company" name="company" value="PADMA BHUSHAN AUTO FINANCE" /></div>
          <div class="field"><label for="area">Area</label><input id="area" name="area" placeholder="Area / locality" /></div>
          <div class="field"><label for="accountNo">A/C no.</label><input id="accountNo" name="accountNo" value="${nextHpCode}" /></div>
          <div class="field"><label for="verifiedBy">Verified by</label><input id="verifiedBy" name="verifiedBy" placeholder="Staff name" /></div>
          <div class="field"><label for="seizingStatus">Seizing status</label><select id="seizingStatus" name="seizingStatus"><option>No</option><option>Yes</option></select></div>
          <div class="field"><label for="installmentsPending">Installments pending</label><input id="installmentsPending" name="installmentsPending" type="number" readonly value="24" /></div>
          <div class="field"><label for="maturityDate">Maturity date</label><input id="maturityDate" name="maturityDate" type="date" /></div>
          <div class="field"><label for="rtoAgent">RTO agent</label><input id="rtoAgent" name="rtoAgent" placeholder="RTO agent" /></div>
          <div class="field"><label for="cBook">C Book</label><input id="cBook" name="cBook" placeholder="C Book reference" /></div>
          <div class="field"><label for="eNo">E no.</label><input id="eNo" name="eNo" placeholder="E number" /></div>
          <div class="field"><label for="cNo">C no.</label><input id="cNo" name="cNo" placeholder="C number" /></div>
          <div class="field"><label for="assignedBy">Assigned / done by</label><input id="assignedBy" name="assignedBy" placeholder="Staff name" /></div>
          <div class="field"><label for="consultant">Consultant</label><input id="consultant" name="consultant" placeholder="Consultant" /></div>
          <div class="field"><label for="agentPhone">Agent phone no.</label><input id="agentPhone" name="agentPhone" inputmode="tel" placeholder="Phone number" /></div>
          <div class="field"><label for="hpReturn">HP return</label><select id="hpReturn" name="hpReturn"><option>No Entry</option><option>Returned</option></select></div>
          <div class="field full"><label for="accountDescription">Account description</label><textarea id="accountDescription" name="accountDescription" placeholder="Account or vehicle description"></textarea></div>
          <div class="field full"><label for="narration">Narration</label><textarea id="narration" name="narration" placeholder="Finance or account narration"></textarea></div>
          <div class="field full"><label for="noticeDescription">Notice description</label><textarea id="noticeDescription" name="noticeDescription" placeholder="Notice details"></textarea></div>
          <div class="field full"><label for="accountCloseDescription">Report account close description</label><textarea id="accountCloseDescription" name="accountCloseDescription" placeholder="Account close report description"></textarea></div>
        </div></section>
        <section class="form-section"><h2 class="form-section-head"><span>6</span> Collection follow-up</h2><div class="form-grid"><div class="field"><label for="ptp">PTP date</label><input id="ptp" name="ptp" type="date" /></div><div class="field"><label for="visitDate">Visit date</label><input id="visitDate" name="visitDate" type="date" /></div><div class="field full"><label for="remarks">Remarks</label><textarea id="remarks" name="remarks" placeholder="Collection or visit remarks"></textarea></div><div class="field full"><label for="notes">Application notes</label><textarea id="notes" name="notes" placeholder="Add any additional details for the account file"></textarea></div></div></section>
        <div class="form-actions application-actions"><button class="btn btn-success" type="submit">Save</button><button class="btn" type="button" data-action="find-application">Find</button><button class="btn btn-primary" type="button" data-action="update-application">Update</button><button class="btn btn-danger" type="button" data-action="delete-application">Delete</button><button class="btn" type="reset" data-action="reset-application">Cancel</button><button class="btn" type="button" data-action="navigate:applications">List</button><button class="btn" type="button" data-action="navigate:applications">Close</button></div>
      </div>
      <aside id="application-summary" class="panel summary-card" popover aria-labelledby="application-summary-title"><div class="section-head"><h3 id="application-summary-title">Account summary</h3><button class="btn" type="button" popovertarget="application-summary" popovertargetaction="hide">Close</button></div><div class="summary-line"><span>HP code</span><strong id="summary-code">${nextHpCode}</strong></div><div class="summary-line"><span>On-road price</span><strong id="summary-price">₹0</strong></div><div class="summary-line"><span>Down payment</span><strong id="summary-down">₹0</strong></div><div class="summary-line"><span>DP still due</span><strong id="summary-dp-due">₹0</strong></div><div class="summary-line"><span>Finance amount</span><strong id="summary-principal">₹0</strong></div><div class="summary-line"><span>Estimated interest</span><strong id="summary-interest">₹0</strong></div><div class="summary-line"><span>Term</span><strong id="summary-term">24 months</strong></div><div class="summary-line total"><span>Monthly installment</span><strong id="summary-emi">₹0</strong></div><div class="summary-note"><strong>Calculation guide</strong>Estimated using flat interest. Document charges are included in the finance amount. Confirm the final repayment schedule with your finance agreement before disbursal.</div></aside>
    </form>`;
}
function updateApplicationSummary() {
  const form = document.querySelector('#application-form'); if (!form) return;
  const priceField = form.elements.namedItem('purchasePrice'); const downField = form.elements.namedItem('downPayment');
  const initialField = form.elements.namedItem('initialPayment'); const docField = form.elements.namedItem('docCharges');
  const dpDueField = form.elements.namedItem('dpDue'); const codeField = form.elements.namedItem('hpCode');
  const principalField = form.elements.namedItem('principal'); const rateField = form.elements.namedItem('interestRate'); const monthsField = form.elements.namedItem('months');
  const price = Number(priceField.value) || 0; const down = Number(downField.value) || 0; const initial = Number(initialField.value) || 0; const docs = Number(docField.value) || 0;
  if (!form.dataset.editingCode && document.activeElement !== principalField) principalField.value = price ? Math.max(0, price - down + docs) : '';
  dpDueField.value = Math.max(0, down - initial);
  const principal = Number(principalField.value) || 0; const rate = Number(rateField.value) || 0; const months = Number(monthsField.value) || 24;
  const interest = Math.round(principal * rate * months / 1200); const emi = months ? Math.ceil((principal + interest) / months) : 0;
  const pendingField=form.elements.namedItem('installmentsPending');
  if(pendingField)pendingField.value=String(Math.max(0,months-Math.floor((Number(form.dataset.paid)||0)/Math.max(1,emi))));
  document.querySelector('#summary-code').textContent = codeField.value || '—'; document.querySelector('#summary-price').textContent = money(price); document.querySelector('#summary-down').textContent = money(down); document.querySelector('#summary-dp-due').textContent = money(dpDueField.value); document.querySelector('#summary-principal').textContent = money(principal); document.querySelector('#summary-interest').textContent = money(interest); document.querySelector('#summary-term').textContent = `${months} months`; document.querySelector('#summary-emi').textContent = money(emi);
}
function updateApplicationCode() {
  const form = document.querySelector('#application-form'); if (!form) return;
  if(form.dataset.editingCode)return;
  const partyType = form.querySelector('input[name="partyType"]:checked')?.value || 'HP';
  const code=`${partyType}-${String(store.nextCode).padStart(4, '0')}`;
  form.elements.namedItem('hpCode').value = code;
  if(form.elements.namedItem('accountNo'))form.elements.namedItem('accountNo').value=code;
  updateApplicationSummary();
}

function applicationRows(customers = store.customers) {
  if (!customers.length) return '<tr><td colspan="19"><div class="empty-state">No finance accounts found. Start by creating a new application.</div></td></tr>';
  return customers.map((c) => {
    const code = `data-code="${esc(c.code)}"`;
    const actions = [
      btn('Edit', 'edit-application', 'btn btn-small', code),
      btn('Calculation', 'open-calculation', 'btn btn-small', code),
      btn('Ledger', 'open-ledger', 'btn btn-small', code),
      btn('Download', 'export-application', 'btn btn-small', `${code} aria-label="Download details for ${esc(c.name)} (${esc(c.code)})"`),
    ].join('');
    return `<tr data-record><td><strong>${esc(c.code)}</strong></td><td>${esc(c.partyType || 'HP')}</td><td>${esc(c.name)}</td><td>${esc(c.father||'—')}</td><td>${esc(c.phone||'—')}</td><td>${esc(c.village||'—')}</td><td>${esc(c.guarantor||'—')}</td><td>${esc(c.vehicle)}<small class="table-secondary">${esc(c.vehicleType || '')}</small></td><td>${esc(c.regNo||'—')}</td><td>${shortDate(c.financeDate||c.created)}</td><td>${money(c.principal)}</td><td>${money(c.emi)} · ${c.months} mo.</td><td>${money(c.downPayment||0)}</td><td>${money(c.dpDue||0)}</td><td>${money(c.paid||0)}</td><td>${shortDate(c.nextDue)}</td><td>${money(Math.max(0,c.totalPayable-c.paid))}</td><td>${statusPill(c.status)}</td><td><div class="application-row-actions">${actions}</div></td></tr>`;
  }).join('');
}
function applicationsPage(savedCode) {
  const branches=[...new Set([...(store.branches||[]).map((branch)=>branch.name),...store.customers.map((customer)=>customer.zone||customer.village).filter(Boolean)])];
  const actions = [
    btn('▧ Calculation', 'navigate:calculation'),
    btn('⎙ Print list', 'print'),
    btn('↓ Export list', 'export-applications'),
    btn('＋ New application', 'navigate:new-application', savedCode ? 'btn' : 'btn btn-primary'),
  ];
  if (savedCode) actions.push(btn('Download saved customer', 'export-application', 'btn btn-primary', `data-code="${esc(savedCode)}"`));
  return `${heading('Finance applications', 'Create, find, and manage customer finance accounts.', actions.join(''))}
    <section class="metric-grid"><div class="metric-tile"><small>All accounts</small><strong>${store.customers.length}</strong><span>On the books</span></div><div class="metric-tile"><small>Active accounts</small><strong>${store.customers.filter((c) => c.status === 'Active').length}</strong><span>In repayment</span></div><div class="metric-tile"><small>Total receivable</small><strong>${money(totalOutstanding())}</strong><span>Outstanding balance</span></div></section>
    <section class="panel application-filter-panel"><div class="application-filter-grid"><div class="field"><label for="application-search">Customer / account search</label><input id="application-search" data-filter-table placeholder="Name, HP code, mobile, vehicle…" /></div><div class="field"><label for="application-from">From date</label><input id="application-from" type="date" data-app-filter /></div><div class="field"><label for="application-to">To date</label><input id="application-to" type="date" data-app-filter /></div><div class="field"><label for="application-branch">Branch</label><select id="application-branch" data-app-filter><option value="all">All branches</option>${branches.map((branch)=>`<option>${esc(branch)}</option>`).join('')}</select></div><div class="field"><label for="application-vehicle">Vehicle type</label><select id="application-vehicle" data-app-filter><option value="all">All vehicles</option><option>Motorcycle</option><option>Scooter</option><option>Three wheeler</option><option>Car</option><option>Commercial vehicle</option></select></div><div class="field"><label for="application-status">Account status</label><select id="application-status" data-app-filter><option value="all">All statuses</option><option>Active</option><option>Pending</option><option>Closed</option><option>Seized</option></select></div><div class="application-filter-actions"><button class="btn btn-primary" type="button" data-action="filter-applications">Search</button><button class="btn" type="button" data-action="display-all-applications">Display all</button></div></div></section>
    <section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Customer list</h2><p class="panel-subtitle" id="application-list-count">${store.customers.length} finance accounts</p></div></div><div class="table-wrap"><table><thead><tr><th>HP code</th><th>Type</th><th>Party name</th><th>Father / husband</th><th>Mobile</th><th>Village</th><th>Guarantor</th><th>Vehicle name / type</th><th>Vehicle no.</th><th>Finance date</th><th>Finance amount</th><th>EMI / term</th><th>Down payment</th><th>DP due</th><th>Paid</th><th>Next due</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody id="accounts-table">${applicationRows()}</tbody></table></div><div class="pagination"><span id="application-list-summary">Showing ${store.customers.length} accounts</span><span>Page 1 of 1</span></div></section>`;
}
function renderApplicationList() {
  const table=document.querySelector('#accounts-table');if(!table)return;
  const value=(id)=>document.querySelector(`#${id}`)?.value||'';
  const query=value('application-search').trim().toLowerCase();const from=value('application-from');const to=value('application-to');
  const branch=value('application-branch')||'all';const vehicle=value('application-vehicle')||'all';const status=value('application-status')||'all';
  const filtered=store.customers.filter((customer)=>{
    const financeDate=customer.financeDate||customer.created||'';
    const searchable=[customer.name,customer.code,customer.accountNo,customer.phone,customer.village,customer.vehicle,customer.regNo,customer.guarantor].join(' ').toLowerCase();
    return (!query||searchable.includes(query))&&(!from||financeDate>=from)&&(!to||financeDate<=to)&&(branch==='all'||(customer.zone||customer.village)===branch)&&(vehicle==='all'||customer.vehicleType===vehicle)&&(status==='all'||customer.status===status);
  });
  table.innerHTML=applicationRows(filtered);
  const count=document.querySelector('#application-list-count');if(count)count.textContent=`${filtered.length} of ${store.customers.length} finance accounts`;
  const summary=document.querySelector('#application-list-summary');if(summary)summary.textContent=`Showing ${filtered.length} account${filtered.length===1?'':'s'}`;
}

function customersPage() {
  return `${heading('Customer directory', 'Customer and guarantor details attached to finance accounts.', btn('＋ New application', 'navigate:new-application', 'btn btn-primary'))}<section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Customers</h2><p class="panel-subtitle">Browse the customer book</p></div><label class="search-box"><input data-filter-table placeholder="Search customers…" /></label></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>HP code</th><th>Village</th><th>Phone</th><th>Guarantor</th><th>Vehicle</th><th>Status</th></tr></thead><tbody>${store.customers.map((c) => `<tr data-record><td>${initialsCell(c.name,c.address)}</td><td>${esc(c.code)}</td><td>${esc(c.village)}</td><td>${esc(c.phone)}</td><td>${esc(c.guarantor || '—')}</td><td>${esc(c.vehicle)}</td><td>${statusPill(c.status)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function addMonthsToDate(value, months) {
  if(!value)return '';
  const source=new Date(`${value}T00:00:00`);const targetMonth=source.getMonth()+months;const lastDay=new Date(source.getFullYear(),targetMonth+1,0).getDate();
  return isoDate(new Date(source.getFullYear(),targetMonth,Math.min(source.getDate(),lastDay)));
}
function calculationInstallments(customer, reportDate, emi, percentage) {
  const receipts=store.transactions.filter((transaction)=>transaction.code===customer.code&&transaction.type==='Collection'&&transaction.narration!=='Initial down payment'&&!transaction.returned&&transaction.date<=reportDate).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.id||'').localeCompare(b.id||''));
  let receiptIndex=0;let receiptRemaining=Number(receipts[0]?.amount)||0;let totalOverdue=0;let totalInterest=0;let totalDue=0;
  const firstDue=customer.firstDueDate||customer.nextDue||addMonthsToDate(customer.financeDate||customer.created||reportDate,1);
  const rows=Array.from({length:Number(customer.months)||0},(_,index)=>{
    const dueDate=addMonthsToDate(firstDue,index);let paidAmount=0;let lastPaidDate='';const receiptIds=[];
    while(paidAmount<emi&&receiptIndex<receipts.length){
      const transaction=receipts[receiptIndex];if(!receiptRemaining){receiptIndex+=1;receiptRemaining=Number(receipts[receiptIndex]?.amount)||0;continue;}
      const applied=Math.min(emi-paidAmount,receiptRemaining);paidAmount+=applied;receiptRemaining-=applied;lastPaidDate=transaction.date||lastPaidDate;if(!receiptIds.includes(transaction.id))receiptIds.push(transaction.id);
    }
    const outstanding=Math.max(0,emi-paidAmount);const overdueDays=outstanding>0&&dueDate<reportDate?Math.floor((new Date(`${reportDate}T00:00:00`)-new Date(`${dueDate}T00:00:00`))/86400000):0;
    const odInterest=outstanding*(Number(percentage)||0)/100*overdueDays/365;totalOverdue+=overdueDays>0?outstanding:0;totalInterest+=odInterest;totalDue+=outstanding;
    return `<tr><td>${index+1}</td><td>${shortDate(dueDate)}</td><td>${shortDate(lastPaidDate)}</td><td>${money(emi)}</td><td>${esc(receiptIds.join(', ')||'—')}</td><td>${money(paidAmount)}</td><td>${money(paidAmount)}</td><td>${overdueDays}</td><td>${money(odInterest)}</td></tr>`;
  });
  return {rows, totalOverdue, totalInterest, totalDue};
}
function calculationReport(customer, reportDate, percentage, oldAccount = false) {
  if(!customer)return '<section class="panel blank-state">Choose an account and press Generate to view the calculation report.</section>';
  const rate=Number(percentage)||0;const months=Number(customer.months)||0;const interest=Math.round((Number(customer.principal)||0)*rate*months/1200);const totalFinance=(Number(customer.principal)||0)+interest;const emi=months?Math.ceil(totalFinance/months):0;
  const schedule=calculationInstallments(customer,reportDate,emi,rate);const balance=Math.max(0,totalFinance-(Number(customer.paid)||0));const dpDue=Number(customer.dpDue)||0;
  const fields=[
    ['Company',customer.company||'PADMA BHUSHAN AUTO FINANCE'],['Branch',customer.zone||'—'],['Area',customer.area||'—'],['Town',customer.village||'—'],['A/C No.',customer.accountNo||customer.code],['Verified by',customer.verifiedBy||'—'],['Seizing status',customer.seizingStatus||'No'],['Description',customer.accountDescription||'—'],['Installments pending',Math.max(0,months-Math.floor((Number(customer.paid)||0)/Math.max(1,Number(customer.emi)||1)))],['Narration',customer.narration||'—'],['Report account close desc.',customer.accountCloseDescription||'—'],
    ['Name',customer.name],['Vehicle no.',customer.regNo||'—'],['Vehicle make',customer.vehicle||'—'],['Vehicle model',customer.vehicleModel||'—'],['Matured',customer.maturityDate||addMonthsToDate(customer.firstDueDate||customer.nextDue,Math.max(0,months-1))||'—'],['Remarks',customer.remarks||'—'],['RTO agent',customer.rtoAgent||'—'],['C Book',customer.cBook||'—'],
    ['E no.',customer.eNo||'—'],['C no.',customer.cNo||'—'],['Assigned / done by',customer.assignedBy||'—'],['Consultant',customer.consultant||'—'],['Account',customer.status||'—'],['Notice desc.',customer.noticeDescription||'—'],['Agent phone no.',customer.agentPhone||'—'],['HP Return',customer.hpReturn||'No Entry']
  ];
  return `<section id="calculation-report" class="calculation-report"><header class="calculation-report-heading"><div><strong>${esc(customer.company||'PADMA BHUSHAN AUTO FINANCE')}</strong><span>Calculation ${oldAccount?'· Old account':''}</span></div><h2>Calculation details</h2><p>${esc(customer.code)} · ${esc(customer.name)} · ${shortDate(reportDate)}</p></header><div class="calculation-detail-grid">${fields.map(([label,value])=>`<div class="calculation-detail"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div><div class="calculation-schedule-layout"><div class="panel data-panel"><div class="panel-toolbar"><div><h3 class="panel-title">Installment schedule</h3><p class="panel-subtitle">${months} installments · ${money(emi)} each</p></div></div><div class="table-wrap"><table><thead><tr><th>No.</th><th>Due date</th><th>Paid date</th><th>Inst amount</th><th>Receipt no.</th><th>Paid amount</th><th>Receipt amount</th><th>OD days</th><th>OD interest</th></tr></thead><tbody>${schedule.rows.join('')}</tbody><tfoot><tr><th colspan="3">Totals</th><th>${money(emi*months)}</th><th>—</th><th>${money(customer.paid||0)}</th><th>${money(customer.paid||0)}</th><th>—</th><th>${money(schedule.totalInterest)}</th></tr></tfoot></table></div></div><aside class="panel calculation-summary"><h3>Finance summary</h3><div class="summary-line"><span>Total finance amount</span><strong>${money(customer.principal)}</strong></div><div class="summary-line"><span>HP charges</span><strong>${money(customer.docCharges||0)}</strong></div><div class="summary-line"><span>Total finance amount with interest</span><strong>${money(totalFinance)}</strong></div><div class="summary-line"><span>Total interest</span><strong>${money(interest)}</strong></div><div class="summary-line"><span>Balance</span><strong>${money(balance)}</strong></div><div class="summary-line"><span>Collected amount</span><strong>${money(customer.paid||0)}</strong></div><div class="summary-line"><span>Total due</span><strong>${money(balance+dpDue)}</strong></div><div class="summary-line"><span>OD due</span><strong>${money(schedule.totalOverdue)}</strong></div><div class="summary-line"><span>OD interest</span><strong>${money(schedule.totalInterest)}</strong></div><div class="summary-line"><span>DP due</span><strong>${money(dpDue)}</strong></div><div class="summary-line total"><span>Net amount due</span><strong>${money(balance+dpDue+schedule.totalInterest)}</strong></div></aside></div></section>`;
}
function calculationPage() {
  const selected=store.customers.find((customer)=>customer.code===selectedCalculationCode)||store.customers[0];const selectedCode=selected?.code||'';
  const options=store.customers.map((customer)=>`<option value="${esc(customer.code)}" ${customer.code===selectedCode?'selected':''}>${esc(customer.code)} · ${esc(customer.name)}</option>`).join('');
  return `${heading('Calculation', 'Generate and print the account repayment calculation.', `${btn('← Customer list', 'navigate:applications', 'btn')}`)}<section class="panel calculation-controls"><div class="calculation-control-grid"><div class="field"><label for="calculation-date">Report date</label><input id="calculation-date" type="date" value="${isoDate()}" /></div><div class="field"><label for="calculation-account">Account no.</label><select id="calculation-account">${options}</select></div><div class="field"><label for="calculation-percentage">Percentage (%)</label><input id="calculation-percentage" type="number" min="0" step="0.01" value="${Number(selected?.interestRate)||14}" /></div><label class="calculation-old-account"><input id="calculation-old-account" type="checkbox" /> Old account</label><button class="btn btn-primary" type="button" data-action="calculation-generate">Generate</button><button class="btn" type="button" data-action="print-calculation">Print</button></div></section><div id="calculation-report-container">${calculationReport(selected,isoDate(),Number(selected?.interestRate)||14,false)}</div>`;
}
function renderCalculation() {
  const container=document.querySelector('#calculation-report-container');if(!container)return;
  const code=document.querySelector('#calculation-account')?.value||'';const customer=store.customers.find((record)=>record.code===code);
  selectedCalculationCode=code;const date=document.querySelector('#calculation-date')?.value||isoDate();const percentage=document.querySelector('#calculation-percentage')?.value||customer?.interestRate||0;const oldAccount=!!document.querySelector('#calculation-old-account')?.checked;
  container.innerHTML=calculationReport(customer,date,percentage,oldAccount);
}

function receiptPage() {
  const lastCode = store.customers[0]?.code || '';
  return `<div class="receipt-page">${heading('Receipt entry', 'Record installment collections and issue a receipt number.', `${btn('View daybook', 'navigate:daybook', 'btn')}${btn('＋ New collection', 'clear-receipt', 'btn btn-primary')}`)}
    <form data-form="receipt" id="receipt-form" class="receipt-layout" autocomplete="off">
      <section class="panel form-panel receipt-entry-panel"><div class="form-section"><h2 class="form-section-head"><span>↙</span> Collection details <small class="receipt-previous">Previous entry <strong id="receipt-previous">—</strong></small></h2><div class="form-grid">
        <div class="field"><label for="receiptDate">Collection date <em>*</em></label><input id="receiptDate" name="date" type="date" required value="${isoDate()}" /></div>
        <div class="field"><label for="receiptAccount">HP code · customer <em>*</em></label><select id="receiptAccount" name="code" required>${customerOptions(lastCode)}</select></div>
        <div class="field"><label for="receiptAmount">Amount paid (₹) <em>*</em></label><input id="receiptAmount" name="amount" type="number" min="1" required placeholder="0" /></div>
        <div class="field"><label for="receiptMode">Mode of payment <em>*</em></label><select id="receiptMode" name="mode"><option>Cash</option><option>Cheque</option><option>Bank transfer</option><option>UPI</option></select></div>
        <div class="field"><label for="receiptNo">Receipt no.</label><input id="receiptNo" readonly value="RC-${String(store.nextReceipt).padStart(3,'0')}" /></div>
        <div class="field"><label for="bankName">Bank name</label><input id="bankName" name="bank" placeholder="If applicable" /></div>
        <div class="field"><label for="chequeNo">Cheque no. / reference</label><input id="chequeNo" name="reference" placeholder="Cheque or transaction no." /></div>
        <div class="field"><label for="bookNo">Receipt book no.</label><input id="bookNo" name="book" placeholder="Book number" /></div>
        <div class="field"><label for="lateDays">Late days</label><input id="lateDays" name="lateDays" type="number" readonly value="0" /></div>
        <div class="field full"><label for="narration">Narration</label><input id="narration" name="narration" placeholder="Collection details" /></div>
      </div></div>
      <div class="receipt-actions">
        <button class="btn btn-success" type="submit">Save</button><button class="btn" type="reset" data-action="clear-receipt">Clear</button><button class="btn" type="button" data-action="list-receipts">List</button><button class="btn" type="button" data-action="update-receipt">Update</button><button class="btn" type="button" data-action="cancel-receipt">Cancel</button><button class="btn" type="button" data-action="cheque-return">Cheque return</button><button class="btn" type="button" data-action="print">Print</button><button class="btn" type="button" data-action="navigate:home">Close</button>
      </div></section>
      <div class="receipt-info-grid">
        <section class="panel form-panel receipt-info-panel"><h2 class="form-section-head"><span>♙</span> Customer details</h2><div class="receipt-kv-grid">
          <div class="receipt-kv"><span>Customer type</span><strong id="receipt-customer-type">—</strong></div><div class="receipt-kv"><span>EMI amount</span><strong id="receipt-emi">—</strong></div>
          <div class="receipt-kv"><span>Party name</span><strong id="receipt-customer">—</strong></div><div class="receipt-kv"><span>Finance date</span><strong id="receipt-fin-date">—</strong></div>
          <div class="receipt-kv"><span>Father / husband</span><strong id="receipt-father">—</strong></div><div class="receipt-kv"><span>Vehicle no.</span><strong id="receipt-vehicle-no">—</strong></div>
          <div class="receipt-kv"><span>Phone (R)</span><strong id="receipt-phone-r">—</strong></div><div class="receipt-kv"><span>Phone (O)</span><strong id="receipt-phone-o">—</strong></div>
          <div class="receipt-kv"><span>Mobile no.</span><strong id="receipt-mobile">—</strong></div><div class="receipt-kv"><span>Guarantor name</span><strong id="receipt-guarantor">—</strong></div>
          <div class="receipt-kv full"><span>Vehicle</span><strong id="receipt-vehicle">—</strong></div>
        </div></section>
        <section class="panel form-panel receipt-info-panel"><h2 class="form-section-head"><span>▤</span> Installment details</h2><div class="receipt-kv-grid">
          <div class="receipt-kv"><span>Total no. of installments</span><strong id="receipt-total-inst">—</strong></div><div class="receipt-kv"><span>Already paid</span><strong id="receipt-paid-count">—</strong></div>
          <div class="receipt-kv"><span>Installment balance</span><strong id="receipt-inst-balance">—</strong></div><div class="receipt-kv"><span>Current installment no.</span><strong id="receipt-current-inst">—</strong></div>
        </div><h2 class="form-section-head amount-details-head"><span>₹</span> Amount details</h2><div class="receipt-kv-grid">
          <div class="receipt-kv"><span>Total financed amount</span><strong id="receipt-financed">—</strong></div><div class="receipt-kv"><span>Amount being paid</span><strong id="receipt-amount-being-paid">—</strong></div>
          <div class="receipt-kv"><span>Balance amount</span><strong id="receipt-balance">—</strong></div><div class="receipt-kv"><span>DP due</span><strong id="receipt-dp-due">—</strong></div>
        </div></section>
      </div>
    </form>
    <section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Recent receipts</h2><p class="panel-subtitle">Last 10 collection entries</p></div><button class="text-button" data-page="daybook">Open daybook →</button></div>${transactionsTable(store.transactions.filter((t) => t.type === 'Collection').slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,10))}</section></div>`;
}
function transactionsTable(transactions) {
  if (!transactions.length) return '<div class="blank-state"><div class="blank-icon">↙</div>No transaction entries yet.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Reference</th><th>Date</th><th>Customer</th><th>Account</th><th>Mode</th><th>Narration</th><th>Amount</th></tr></thead><tbody>${transactions.map((t) => { const customer = store.customers.find((c) => c.code === t.code); return `<tr><td><strong>${esc(t.id)}</strong></td><td>${shortDate(t.date)}</td><td>${esc(customer?.name || 'Unknown account')}</td><td>${esc(t.code)}</td><td>${esc(t.mode)}</td><td>${esc(t.narration || t.type)}</td><td><strong>${money(t.amount)}</strong></td></tr>`; }).join('')}</tbody></table></div>`;
}
function updateReceiptSummary() {
  const select = document.querySelector('#receiptAccount'); if (!select) return;
  const c = store.customers.find((x) => x.code === select.value);
  const paidCount = c ? Math.min(c.months, Math.floor(c.paid / Math.max(1,c.emi))) : 0;
  const amount = Number(document.querySelector('#receiptAmount')?.value) || 0;
  const latest = c ? store.transactions.filter((t) => t.code === c.code && t.type === 'Collection').sort((a,b) => b.date.localeCompare(a.date))[0] : null;
  const lateDays = c?.nextDue ? Math.max(0, Math.floor((new Date(`${document.querySelector('#receiptDate')?.value || isoDate()}T00:00:00`) - new Date(`${c.nextDue}T00:00:00`)) / 86400000)) : 0;
  document.querySelector('#receipt-previous').textContent = latest?.id || '—';
  document.querySelector('#lateDays').value = String(lateDays);
  document.querySelector('#receipt-customer-type').textContent = c?.partyType || 'HP'; document.querySelector('#receipt-customer').textContent = c?.name || '—'; document.querySelector('#receipt-vehicle').textContent = c?.vehicle || '—'; document.querySelector('#receipt-vehicle-no').textContent = c?.regNo || '—';
  document.querySelector('#receipt-emi').textContent = c ? money(c.emi) : '—'; document.querySelector('#receipt-fin-date').textContent = shortDate(c?.financeDate || c?.created);
  document.querySelector('#receipt-father').textContent = c?.father || '—'; document.querySelector('#receipt-phone-r').textContent = c?.phoneR || '—'; document.querySelector('#receipt-phone-o').textContent = c?.phoneO || '—'; document.querySelector('#receipt-mobile').textContent = c?.phone || '—'; document.querySelector('#receipt-guarantor').textContent = c?.guarantor || '—';
  document.querySelector('#receipt-total-inst').textContent = c ? String(c.months) : '—'; document.querySelector('#receipt-paid-count').textContent = c ? `${paidCount} of ${c.months}` : '—'; document.querySelector('#receipt-inst-balance').textContent = c ? String(Math.max(0,c.months-paidCount)) : '—'; document.querySelector('#receipt-current-inst').textContent = c ? String(Math.min(c.months,paidCount+1)) : '—';
  document.querySelector('#receipt-financed').textContent = c ? money(c.principal) : '—'; document.querySelector('#receipt-amount-being-paid').textContent = money(amount); document.querySelector('#receipt-balance').textContent = c ? money(Math.max(0,c.totalPayable-c.paid)) : '—'; document.querySelector('#receipt-dp-due').textContent = c ? money(c.dpDue || 0) : '—';
}

function dueAccounts(options = {}) {
  const { filter = 'all', branch = 'All branches', onDate = isoDate(), mode = 'all' } = options;
  let customers = store.customers.filter((c) => (c.status === 'Active' || (options.includeSeized && c.status === 'Seized')) && (mode === 'dp' ? Number(c.dpDue) > 0 : dueAmount(c) > 0));
  const dueValue = (c) => mode === 'dp' ? Number(c.dpDue) || 0 : dueAmount(c);
  const overdueCount = (c) => c.nextDue && c.nextDue < onDate ? Math.floor((new Date(`${onDate}T00:00:00`) - new Date(`${c.nextDue}T00:00:00`)) / (30 * 86400000)) + 1 : 0;
  if (options.accountFrom) customers = customers.filter((c) => c.code.localeCompare(options.accountFrom) >= 0);
  if (options.accountTo) customers = customers.filter((c) => c.code.localeCompare(options.accountTo) <= 0);
  if (branch !== 'All branches') customers = customers.filter((c) => (c.zone || c.village) === branch);
  if (options.mainZone && options.mainZone !== 'All') customers = customers.filter((c) => (c.zone || c.village) === options.mainZone);
  if (options.subZone && options.subZone !== 'All') customers = customers.filter((c) => (c.mandal || c.village) === options.subZone);
  if (options.village && options.village !== 'All villages') customers = customers.filter((c) => c.village === options.village);
  if (options.vehicle && options.vehicle !== 'All') customers = customers.filter((c) => options.vehicle === 'Two wheels' ? ['Motorcycle','Scooter'].includes(c.vehicleType) : options.vehicle === 'Three wheels' ? c.vehicleType === 'Three wheeler' : c.vehicleType === options.vehicle);
  if (filter === 'overdue' || options.printTimeOver === 'Yes' || mode === 'time-over') customers = customers.filter((c) => overdueCount(c) > 0);
  if (filter === 'upcoming') customers = customers.filter((c) => c.nextDue && c.nextDue >= onDate);
  if (options.installments && options.installments !== 'All') customers = customers.filter((c) => overdueCount(c) === Number(options.installments));
  if (Number(options.minDue) > 0) customers = customers.filter((c) => dueValue(c) >= Number(options.minDue));
  if (options.seizingOnly || mode === 'seizing') customers = customers.filter((c) => c.status === 'Seized');
  if (mode === 'not-paid') customers = customers.filter((c) => Number(c.paid) === 0);
  if (mode === 'advance-payment' || options.advancePayment) customers = customers.filter((c) => Number(c.paid) > 0 && Number(c.paid) % Math.max(1,Number(c.emi)) !== 0);
  if (mode === 'monthly-collection' || options.monthlyCollection) {
    const monthStart = `${onDate.slice(0,7)}-01`;
    customers = customers.filter((c) => store.transactions.some((t) => t.code === c.code && t.type === 'Collection' && t.date >= monthStart && t.date <= onDate));
  }
  if (options.sort === 'Customer name') customers.sort((a,b) => a.name.localeCompare(b.name));
  else if (options.sort === 'Village') customers.sort((a,b) => a.village.localeCompare(b.village) || a.name.localeCompare(b.name));
  else if (options.sort === 'Due date') customers.sort((a,b) => (a.nextDue||'').localeCompare(b.nextDue||''));
  else if (mode === 'addresswise' || mode === 'mandalam' || options.addresswise) customers.sort((a,b) => (a.mandal||a.village).localeCompare(b.mandal||b.village) || a.village.localeCompare(b.village));
  else customers.sort((a,b) => a.code.localeCompare(b.code));
  return customers;
}
const DUE_REPORT_COLUMNS = [
  'S.No.', 'Code', 'Party Name', 'Village', 'Last Paid', 'Inst Date', 'EMI', 'Inst', 'Amt Due', 'DP_AmtDue', 'Date', 'Remarks',
  'Hirer Name', 'Doc Number', 'Agreement Date', 'Vehicle Type', 'Vehicle Name', 'Paid Date', 'Due Date', 'Current EMI No.',
  'Over Due EMIs', 'Opening Balance Amount', 'Last Month Paid Receipt', 'Current Month EMI', 'NET Total Pending Amount',
  'Loan Status', 'Net OD', 'Telephone', 'RegNo', 'PTP', 'Visit Date'
];
function dueReportMatrix(options = {}) {
  const onDate = options.onDate || isoDate();
  const reportDate = new Date(`${onDate}T00:00:00`);
  const monthStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
  const previousMonthStart = new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1);
  const dateKey = (date) => isoDate(date);
  const fromMonth = dateKey(previousMonthStart);
  const toPreviousMonth = dateKey(new Date(monthStart.getTime() - 86400000));
  const currentMonthStart = dateKey(monthStart);
  const dueCustomers = dueAccounts(options);
  const rows = dueCustomers.map((customer, index) => {
    const collections = store.transactions.filter((transaction) => transaction.code === customer.code && transaction.type === 'Collection' && transaction.narration !== 'Initial down payment' && !transaction.returned && transaction.date <= onDate);
    const orderedCollections = [...collections].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
    const lastCollection = orderedCollections[0];
    const previousMonthCollections = collections.filter((transaction) => transaction.date >= fromMonth && transaction.date <= toPreviousMonth);
    const currentMonthCollections = collections.filter((transaction) => transaction.date >= currentMonthStart && transaction.date <= onDate);
    const previousMonthPaid = previousMonthCollections.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const currentMonthPaid = currentMonthCollections.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const overdueInstallments = customer.nextDue && customer.nextDue <= onDate
      ? Math.floor((reportDate - new Date(`${customer.nextDue}T00:00:00`)) / (30 * 86400000)) + 1
      : 0;
    const installmentsPaid = Math.min(Number(customer.months) || 0, Math.floor((Number(customer.paid) || 0) / Math.max(1, Number(customer.emi) || 1)));
    const accountBalance = Math.max(0, (Number(customer.totalPayable) || 0) - (Number(customer.paid) || 0));
    const openingPaid = Math.max(0, (Number(customer.paid) || 0) - currentMonthPaid);
    const openingBalance = Math.max(0, (Number(customer.totalPayable) || 0) - openingPaid);
    const lastMonthReceipt = previousMonthCollections.length
      ? `${previousMonthCollections.map((transaction) => transaction.id).join(', ')} · ₹${previousMonthPaid.toLocaleString('en-IN')}`
      : '';
    const amountDue = options.mode === 'dp' ? Number(customer.dpDue) || 0 : accountBalance;
    const netPending = accountBalance + (Number(customer.dpDue) || 0);
    const netOverdue = Math.min(accountBalance, overdueInstallments * (Number(customer.emi) || 0));
    const agreementDate = customer.financeDate || customer.created || '';
    return [
      index + 1, customer.code, customer.name, customer.village || '', lastCollection?.date || '', customer.nextDue || '', Number(customer.emi) || 0,
      Number(customer.months) || 0, amountDue, Number(customer.dpDue) || 0, onDate, customer.remarks || customer.notes || '',
      customer.name, customer.docNumber || customer.ledgerCode || customer.code, agreementDate, customer.vehicleType || '', [customer.vehicle, customer.vehicleModel].filter(Boolean).join(' '), lastCollection?.date || '',
      customer.nextDue || '', Math.min(Number(customer.months) || 0, installmentsPaid + 1), overdueInstallments, openingBalance, lastMonthReceipt,
      Number(customer.emi) || 0, netPending, customer.status || 'Active', netOverdue, [customer.phone, customer.phoneR, customer.phoneO].filter(Boolean).join(' / '),
      customer.regNo || '', customer.ptp || '', customer.visitDate || ''
    ];
  });
  return [DUE_REPORT_COLUMNS, ...rows];
}
function dueRows(options = {}) {
  const customers = dueAccounts(options); const onDate = options.onDate || isoDate(); const mode = options.mode || 'all';
  if (!customers.length) return '<tr><td colspan="9"><div class="empty-state">No accounts match these due list filters.</div></td></tr>';
  if (mode === 'abstract') {
    const groups = new Map(); customers.forEach((c) => { const branch = c.zone || c.village || 'Unassigned'; const group = groups.get(branch) || { count: 0, amount: 0 }; group.count += 1; group.amount += mode === 'dp' ? Number(c.dpDue)||0 : dueAmount(c); groups.set(branch, group); });
    return [...groups.entries()].map(([branch, group]) => `<tr data-record><td>${esc(branch)}</td><td colspan="4">${group.count} accounts</td><td>—</td><td>${money(group.amount)}</td><td>Abstract</td><td>—</td></tr>`).join('');
  }
  return customers.map((c) => { const count = c.nextDue && c.nextDue < onDate ? Math.floor((new Date(`${onDate}T00:00:00`) - new Date(`${c.nextDue}T00:00:00`)) / (30 * 86400000)) + 1 : 1; const amount = mode === 'dp' ? Number(c.dpDue) || 0 : dueAmount(c); return `<tr data-record><td>${initialsCell(c.name,c.phone)}</td><td><strong>${esc(c.code)}</strong></td><td>${esc(c.partyType || 'HP')}</td><td>${esc(c.village)}${c.mandal ? `<small class="table-secondary">${esc(c.mandal)}</small>` : ''}</td><td>${shortDate(c.nextDue)}</td><td>${count}</td><td>${money(c.emi)}</td><td>${money(amount)}</td><td>${c.status === 'Seized' ? statusPill('Seized') : c.nextDue < onDate ? '<span class="status-pill due">Time over</span>' : '<span class="status-pill active">Upcoming</span>'}</td></tr>`; }).join('');
}
function duePage() {
  const accountOptions = store.customers.map((c) => `<option value="${esc(c.code)}">${esc(c.code)} · ${esc(c.name)}</option>`).join('');
  const zoneOptions = [...new Set([...(store.branches||[]).map((branch)=>branch.name),...(store.lines||[]).filter((line)=>line.type==='Main Zone').map((line)=>line.name),...store.customers.map((c) => c.zone || c.village)].filter(Boolean))].map((zone) => `<option>${esc(zone)}</option>`).join('');
  const subZoneOptions = [...new Set(store.customers.map((c) => c.mandal || c.village).filter(Boolean))].map((zone) => `<option>${esc(zone)}</option>`).join('');
  const villageOptions = [...new Set(store.customers.map((c) => c.village).filter(Boolean))].map((village) => `<option>${esc(village)}</option>`).join('');
  return `${heading('Installment due list', 'Filter, sort, print, and export the customer collection schedule.', `${btn('⎙ Print report', 'print-due', 'btn')}${btn('↓ Export to Excel', 'export-due', 'btn btn-primary')}`)}
    <section class="metric-grid"><div class="metric-tile"><small>Accounts with balance</small><strong>${store.customers.filter((c) => c.status === 'Active').length}</strong><span>Active agreements</span></div><div class="metric-tile"><small>Overdue installments</small><strong>${store.customers.filter((c) => c.status === 'Active' && c.nextDue && c.nextDue < isoDate()).length}</strong><span>Follow-up needed</span></div><div class="metric-tile"><small>Outstanding installment total</small><strong>${money(store.customers.filter((c) => c.status === 'Active').reduce((sum,c) => sum + dueAmount(c),0))}</strong><span>Next collection amount</span></div></section>
    <section class="panel due-filter-panel"><div class="due-filter-grid">
      <div class="field"><label for="due-from-account">From HP account</label><select id="due-from-account" data-refresh><option value="">First account</option>${accountOptions}</select></div>
      <div class="field"><label for="due-to-account">To HP account</label><select id="due-to-account" data-refresh><option value="">Last account</option>${accountOptions}</select></div>
      <div class="field"><label for="due-date">Reporting date</label><input id="due-date" type="date" value="${isoDate()}" data-refresh /></div>
      <div class="field"><label for="due-sort">Sorting order</label><select id="due-sort" data-refresh><option>HP code</option><option>Customer name</option><option>Village</option><option>Due date</option></select></div>
      <div class="field"><label for="due-installments">No. of installments due</label><select id="due-installments" data-refresh><option>All</option>${Array.from({length:24},(_,index)=>`<option>${index+1}</option>`).join('')}</select></div>
      <div class="field"><label for="due-main-zone">Main zone to print</label><select id="due-main-zone" data-refresh><option>All</option>${zoneOptions}</select></div>
      <div class="field"><label for="due-sub-zone">Sub zone to print</label><select id="due-sub-zone" data-refresh><option>All</option>${subZoneOptions}</select></div>
      <div class="field"><label for="due-time-over">Print time over</label><select id="due-time-over" data-refresh><option>No</option><option>Yes</option></select></div>
      <div class="field"><label for="due-page-no">From page no. to print</label><input id="due-page-no" type="number" min="1" value="1" /></div>
      <div class="field"><label for="due-wheels">Wheels / vehicle type</label><select id="due-wheels" data-refresh><option>All</option><option>Two wheels</option><option>Three wheels</option><option>Car</option></select></div>
      <div class="field"><label for="due-min-amount">Due amount from (₹)</label><input id="due-min-amount" type="number" min="0" value="0" data-refresh /></div>
      <div class="field"><label for="due-branch">Branch</label><select id="due-branch" data-refresh><option>All branches</option>${zoneOptions}</select></div>
      <div class="field"><label for="due-village">Select village</label><select id="due-village" data-refresh><option>All villages</option>${villageOptions}</select></div>
      <div class="field"><label for="due-status">Due status</label><select id="due-status" data-refresh><option value="all">All due</option><option value="overdue">Overdue</option><option value="upcoming">Upcoming</option></select></div>
      <div class="field"><label for="include-seized">Include seized vehicles?</label><select id="include-seized" data-refresh><option value="yes" selected>Yes</option><option value="no">No</option></select></div>
      <div class="field due-filter-button"><label>&nbsp;</label><button class="btn btn-primary" type="button" data-action="filter-due">Generate due list</button></div>
    </div>
    <div class="due-toggle-row"><label><input id="seizing-only" type="checkbox" data-refresh /> Seizing</label><label><input id="monthly-collection" type="checkbox" data-refresh /> Monthly collection</label><label><input id="addresswise" type="checkbox" data-refresh /> Addresswise</label><label><input id="advance-payment" type="checkbox" data-refresh /> Advance payment</label><button class="text-button" type="button" data-action="clear-village">Clear village filter</button></div></section>
    <section class="panel due-actions"><button class="btn btn-primary" type="button" data-action="generate-demand">Generate HP demand and collection</button><button class="btn" type="button" data-action="print-due">Print HP demand and collection</button><button class="btn" type="button" data-action="print-due">Print demand details</button><button class="btn" type="button" data-action="print-due">Print due list</button><button class="btn" type="button" data-action="due-view" data-view="dp">DP due list</button><button class="btn" type="button" data-action="due-view" data-view="not-paid">Not paid</button><button class="btn" type="button" data-action="due-view" data-view="abstract">Print abstract</button><button class="btn" type="button" data-action="due-view" data-view="time-over">Time over</button><button class="btn" type="button" data-action="due-view" data-view="mandalam">Due list Mandalam</button><button class="btn" type="button" data-action="navigate:home">Close</button></section>
    <div class="notice" id="due-notice">Due amounts are calculated from each account’s next scheduled installment and remaining balance.</div><section class="panel data-panel" id="due-screen-panel"><div class="panel-toolbar"><div><h2 class="panel-title" id="due-title">Accounts due</h2><p class="panel-subtitle" id="due-count">${dueAccounts({includeSeized:true}).length} accounts</p></div><label class="search-box"><input data-filter-table placeholder="Search customer, HP code, village…" /></label></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>HP code</th><th>Type</th><th>Village / mandal</th><th>Installment date</th><th>Installments due</th><th>EMI</th><th>Amount due</th><th>Collection status</th></tr></thead><tbody id="due-table">${dueRows({includeSeized:true})}</tbody></table></div></section>
    <section id="due-print-report" class="due-print-report" aria-hidden="true"><div class="due-print-heading"><strong>PADMA BHUSHAN AUTO FINANCE</strong><span>Installmentwise</span></div><h1>DUE LIST REPORT AS ON <span id="due-print-date">${esc(isoDate())}</span></h1><p id="due-print-summary"></p><div class="due-print-table-wrap"><table><thead><tr>${DUE_REPORT_COLUMNS.map((column) => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody id="due-print-table"></tbody></table></div></section>`;
}

function ledgerPage(code = store.customers[0]?.code || '', mode = 'ledger', from = shiftDate(-180), to = isoDate(), printBalances = 'Yes') {
  const c = store.customers.find((x) => x.code === code) || store.customers[0];
  if (!c) return `${heading('Ledger', 'Account wise finance and down payment statements.')}<div class="panel blank-state">Create a finance account to view its ledger.</div>`;
  const accountOptions=store.customers.map((x)=>`<option value="${esc(x.code)}" ${x.code===c.code?'selected':''}>${esc(x.code)} · ${esc(x.name)}</option>`).join('');
  const nameOptions=store.customers.map((x)=>`<option value="${esc(x.code)}" ${x.code===c.code?'selected':''}>${esc(x.name)}</option>`).join('');
  const selectedAccounts=mode==='group'?store.customers:mode==='new-cadp'?store.customers.filter((x)=>(x.created||'')>=from&&(x.created||'')<=to):store.customers.filter((x)=>x.code===c.code);
  let tableTitle='Customer ledger';let tableSubtitle=`${c.name} · ${c.code}`;let rows='';
  if(mode==='ledger'||mode==='group'){
    const transactions=store.transactions.filter((t)=>selectedAccounts.some((x)=>x.code===t.code)&&t.date>=from&&t.date<=to).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
    const running=new Map();
    rows=transactions.map((t)=>{const account=store.customers.find((x)=>x.code===t.code);const paid=(running.get(t.code)||0)+Number(t.amount);running.set(t.code,paid);return `<tr><td>${shortDate(t.date)}</td><td>${esc(t.id)}</td>${mode==='group'?`<td>${esc(account?.code||t.code)}</td><td>${esc(account?.name||'Unknown')}</td>`:''}<td>${esc(t.narration||t.type)}</td><td>${money(t.amount)}</td>${printBalances==='Yes'?`<td>${money(paid)}</td>`:''}</tr>`;}).join('');
    tableTitle=mode==='group'?'Group ledger':'Customer ledger';tableSubtitle=mode==='group'?`${selectedAccounts.length} accounts · ${shortDate(from)} to ${shortDate(to)}`:`${c.name} · ${c.code}`;
  } else {
    let accounts=selectedAccounts;
    if(mode==='cadp')tableTitle='CA & DP account statement';
    if(mode==='new-cadp')tableTitle='New CA DP accounts';
    if(mode==='full-cadp'){accounts=store.customers;tableTitle='Full CA DP statement';}
    tableSubtitle=`${accounts.length} account${accounts.length===1?'':'s'} · ${shortDate(from)} to ${shortDate(to)}`;
    rows=accounts.map((account)=>`<tr><td>${esc(account.code)}</td><td>${esc(account.partyType||'HP')}</td><td>${esc(account.name)}</td><td>${shortDate(account.financeDate||account.created)}</td><td>${money(account.principal)}</td><td>${money(account.downPayment||0)}</td><td>${money(account.initialPayment||0)}</td><td>${money(account.dpDue||0)}</td><td>${money(account.paid||0)}</td>${printBalances==='Yes'?`<td>${money(Math.max(0,account.totalPayable-account.paid))}</td>`:''}</tr>`).join('');
  }
  const ledgerHeaders=mode==='group'?'<th>Account</th><th>Customer</th>':'';
  const summary=mode==='group'?`<div class="summary-line"><span>Accounts in group ledger</span><strong>${selectedAccounts.length}</strong></div><div class="summary-line total"><span>Total outstanding</span><strong>${money(selectedAccounts.reduce((sum,x)=>sum+Math.max(0,x.totalPayable-x.paid),0))}</strong></div>`:`<div class="ledger-summary"><div><small>Finance amount</small><strong>${money(c.principal)}</strong></div><div><small>Down payment</small><strong>${money(c.downPayment||0)}</strong></div><div><small>Installment</small><strong>${money(c.emi)}</strong></div><div><small>DP due</small><strong>${money(c.dpDue||0)}</strong></div></div><div class="summary-line"><span>Amount paid</span><strong>${money(c.paid)}</strong></div>${printBalances==='Yes'?`<div class="summary-line total"><span>Current balance</span><strong>${money(Math.max(0,c.totalPayable-c.paid))}</strong></div>`:''}<div class="color-bar"><span style="width:${Math.min(100,Math.round(c.paid/Math.max(1,c.totalPayable)*100))}%"></span></div>`;
  const summaryMode=mode!=='ledger'&&mode!=='group';
  const emptyColspan=summaryMode?(printBalances==='Yes'?10:9):mode==='group'?(printBalances==='Yes'?7:6):(printBalances==='Yes'?5:4);
  const noRows=`<tr><td colspan="${emptyColspan}"><div class="empty-state">No records found for these dates and report type.</div></td></tr>`;
  const tableHeaders=summaryMode?`<th>HP code</th><th>Party type</th><th>Customer</th><th>Finance date</th><th>Finance amount</th><th>DP amount</th><th>Initial payment</th><th>DP due</th><th>Amount paid</th>${printBalances==='Yes'?'<th>Balance':''}`:`<th>Date</th><th>Reference</th>${ledgerHeaders}<th>Description</th><th>Amount</th>${printBalances==='Yes'?'<th>Paid to date</th>':''}`;
  const actionButtons=`<button class="btn ${mode==='ledger'?'btn-primary':''}" type="button" data-action="ledger-view" data-view="ledger">Ledger</button><button class="btn ${mode==='cadp'?'btn-primary':''}" type="button" data-action="ledger-view" data-view="cadp">CA &amp; DP</button><button class="btn ${mode==='group'?'btn-primary':''}" type="button" data-action="ledger-view" data-view="group">Group ledger</button><button class="btn" type="button" data-action="navigate:home">Close</button><button class="btn btn-success ${mode==='new-cadp'?'':''}" type="button" data-action="ledger-view" data-view="new-cadp">New CA DP</button><button class="btn btn-primary" type="button" data-action="ledger-view" data-view="full-cadp">Full CA DP</button>`;
  return `${heading('Ledger', 'View customer ledger, CA & DP, and grouped finance statements.', `${btn('⎙ Print current report', 'print', 'btn')}`)}
    <section class="panel ledger-control-panel"><div class="ledger-control-grid"><div class="field"><label for="ledger-from">From date</label><input id="ledger-from" type="date" value="${from}" /></div><div class="field"><label for="ledger-to">To date</label><input id="ledger-to" type="date" value="${to}" /></div><div class="field"><label for="ledger-account">Select account</label><select id="ledger-account">${accountOptions}</select></div><div class="field"><label for="ledger-name">Account name</label><select id="ledger-name">${nameOptions}</select></div><div class="field"><label for="ledger-print-balances">Print balances</label><select id="ledger-print-balances"><option ${printBalances==='Yes'?'selected':''}>Yes</option><option ${printBalances==='No'?'selected':''}>No</option></select></div><div class="field"><label>&nbsp;</label><button class="btn btn-primary" type="button" data-action="ledger-view" data-view="${mode}">View selected report</button></div></div><div class="ledger-action-row">${actionButtons}</div></section>
    <section class="content-split"><div class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">${tableTitle}</h2><p class="panel-subtitle">${tableSubtitle}</p></div>${mode==='ledger'?statusPill(c.status):''}</div><div class="table-wrap"><table><thead><tr>${tableHeaders}</tr></thead><tbody>${rows||noRows}</tbody></table></div></div><aside class="panel summary-card ledger-balance-summary"><h3>${mode==='group'?'Group balance summary':'Account summary'}</h3>${summary}<div class="summary-note">${printBalances==='Yes'?'Balance columns are included in this report.':'Balance columns are hidden for this report.'}</div></aside></section>`;
}
function renderLedgerView(mode = 'ledger') {
  const code=document.querySelector('#ledger-account')?.value||store.customers[0]?.code||'';
  const from=document.querySelector('#ledger-from')?.value||shiftDate(-180);const to=document.querySelector('#ledger-to')?.value||isoDate();const printBalances=document.querySelector('#ledger-print-balances')?.value||'Yes';
  ledgerViewMode=mode;document.querySelector('#page-content').innerHTML=ledgerPage(code,mode,from,to,printBalances);
}

function hpRegisterPage(code = store.customers[0]?.code || '', mode = 'today', reportDate = isoDate()) {
  const c=store.customers.find((customer)=>customer.code===code)||store.customers[0];
  const accountOptions=store.customers.map((customer)=>`<option value="${esc(customer.code)}" ${customer.code===c?.code?'selected':''}>${esc(customer.code)} · ${esc(customer.name)}</option>`).join('');
  if(!c)return `${heading('HP register','Account balance lookup and repayment status.',btn('Close','navigate:home','btn'))}<div class="panel blank-state">Create an HP account to view its register.</div>`;
  const paidInstallments=Math.min(c.months,Math.floor(c.paid/Math.max(1,c.emi)));
  const installmentsLeft=Math.max(0,c.months-paidInstallments);
  const amountDue=c.status==='Closed'?0:(c.nextDue&&c.nextDue<=reportDate?dueAmount(c):0);
  const balance=Math.max(0,c.totalPayable-c.paid);
  const dpDue=Number(c.dpDue)||0;
  const shownBalance=mode==='complete'?balance+dpDue:amountDue+dpDue;
  const totalBalance=balance+dpDue;
  return `${heading('HP register', 'Look up an HP account and review today or complete balance.', `${btn('↓ Export register', 'export-applications', 'btn')}${btn('⎙ Print register', 'print', 'btn')}`)}
    <section class="panel hp-lookup-panel"><div class="hp-lookup-fields"><div class="field"><label for="hp-account">HP account</label><select id="hp-account">${accountOptions}</select></div><div class="field"><label for="hp-report-date">Reporting date</label><input id="hp-report-date" type="date" value="${reportDate}" /></div><button class="btn btn-primary" type="button" data-action="hp-select">Select</button></div>
      <div class="hp-register-actions"><button class="btn ${mode==='today'?'btn-primary':''}" type="button" data-action="hp-balance" data-mode="today">✓ Today balance</button><button class="btn ${mode==='complete'?'btn-primary':''}" type="button" data-action="hp-balance" data-mode="complete">▤ Complete balance</button><button class="btn btn-danger" type="button" data-action="navigate:home">× Close</button></div>
    </section>
    <div class="hp-balance-grid"><section class="panel hp-balance-card"><h2>Party details</h2><div class="hp-detail-row"><span>Party</span><strong>${esc(c.name)}</strong></div><div class="hp-detail-row"><span>Zone</span><strong>${esc(c.zone||c.village||'—')}</strong></div><div class="hp-detail-row"><span>EMI amount</span><strong>${money(c.emi)}</strong></div><div class="hp-detail-row"><span>Installment date</span><strong>${shortDate(c.nextDue)}</strong></div><div class="hp-detail-row"><span>Amount due</span><strong>${money(mode==='complete'?balance:amountDue)}</strong></div><div class="hp-detail-row"><span>DP due</span><strong>${money(dpDue)}</strong></div><div class="hp-detail-row"><span>No. of installments</span><strong>${c.months}</strong></div><div class="hp-detail-row"><span>Installments remaining</span><strong>${installmentsLeft}</strong></div><div class="hp-detail-row total"><span>Total balance</span><strong>${money(totalBalance)}</strong></div></section>
      <section class="panel hp-balance-card"><h2>Balance details <span>${statusPill(c.status)}</span></h2><div class="hp-detail-row"><span>Party</span><strong>${esc(c.name)}</strong></div><div class="hp-detail-row"><span>Zone</span><strong>${esc(c.zone||c.village||'—')}</strong></div><div class="hp-detail-row"><span>Party status</span><strong>${esc(c.status)}</strong></div><div class="hp-detail-row"><span>EMI due</span><strong>${money(mode==='complete'?balance:amountDue)}</strong></div><div class="hp-detail-row"><span>Installment date</span><strong>${shortDate(c.nextDue)}</strong></div><div class="hp-detail-row"><span>Amount due</span><strong>${money(mode==='complete'?balance:amountDue)}</strong></div><div class="hp-detail-row"><span>No. installments already paid</span><strong>${paidInstallments}</strong></div><div class="hp-detail-row"><span>Current installment no.</span><strong>${Math.min(c.months,paidInstallments+1)}</strong></div><div class="hp-detail-row total"><span>Net balance</span><strong>${money(shownBalance)}</strong></div></section></div>
    <section class="metric-grid hp-register-metrics"><div class="metric-tile"><small>Finance disbursed</small><strong>${money(store.customers.reduce((sum,customer)=>sum+customer.principal,0))}</strong><span>Principal amount</span></div><div class="metric-tile"><small>Repayment received</small><strong>${money(store.customers.reduce((sum,customer)=>sum+customer.paid,0))}</strong><span>Collected to date</span></div><div class="metric-tile"><small>All-account balance</small><strong>${money(totalOutstanding())}</strong><span>Receivable</span></div></section>
    <section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Hire purchase register</h2><p class="panel-subtitle">Account repayment overview</p></div><label class="search-box"><input data-filter-table placeholder="Search account…" /></label></div><div class="table-wrap"><table><thead><tr><th>HP code</th><th>Party type</th><th>Customer</th><th>Vehicle</th><th>Finance amount</th><th>EMI</th><th>Collected</th><th>Balance</th><th>Progress</th></tr></thead><tbody>${store.customers.map((customer)=>`<tr data-record><td><strong>${esc(customer.code)}</strong></td><td>${esc(customer.partyType||'HP')}</td><td>${esc(customer.name)}</td><td>${esc(customer.vehicle)}</td><td>${money(customer.principal)}</td><td>${money(customer.emi)}</td><td>${money(customer.paid)}</td><td>${money(Math.max(0,customer.totalPayable-customer.paid))}</td><td><span class="status-pill ${customer.status==='Closed'?'closed':'active'}">${Math.min(100,Math.round(customer.paid/Math.max(1,customer.totalPayable)*100))}%</span></td></tr>`).join('')}</tbody></table></div></section>`;
}
function renderHpRegister(mode = hpBalanceMode) {
  const code=document.querySelector('#hp-account')?.value||store.customers[0]?.code||'';
  const date=document.querySelector('#hp-report-date')?.value||isoDate();hpBalanceMode=mode;
  document.querySelector('#page-content').innerHTML=hpRegisterPage(code,mode,date);
}

function monthlyPage() {
  const monthStart = `${isoDate().slice(0,7)}-01`;
  const branchOptions=[...new Set([...(store.branches||[]).map((branch)=>branch.name),...store.customers.map((customer)=>customer.zone||customer.village).filter(Boolean)])].map((branch)=>`<option>${esc(branch)}</option>`).join('');
  return `${heading('Monthly transactions', 'View finance disbursals and collection activity by date and branch.', `${btn('↓ Export to Excel','export-monthly','btn')}${btn('⎙ Print report', 'print', 'btn')}`)}<section class="panel report-filters"><div class="field"><label>From date</label><input type="date" id="monthly-from" value="${monthStart}" /></div><div class="field"><label>To date</label><input type="date" id="monthly-to" value="${isoDate()}" /></div><div class="field"><label>Transaction type</label><select id="monthly-type"><option value="all">Collection and finance</option><option value="Collection">Collection</option><option value="Finance">Finance</option></select></div><div class="field"><label>Branch</label><select id="monthly-branch"><option value="all">All branches</option>${branchOptions}</select></div><div class="spacer"></div><button class="btn btn-primary" type="button" data-action="filter-monthly">Show transactions</button></section><section class="metric-grid" id="monthly-metrics"></section><section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Transaction details</h2><p class="panel-subtitle" id="monthly-period">${shortDate(monthStart)} — ${shortDate(isoDate())}</p></div><div class="section-tabs"><button class="active" data-action="month-tab" data-type="all">All entries</button><button data-action="month-tab" data-type="Collection">Collection</button><button data-action="month-tab" data-type="Finance">Finance</button></div></div><div id="monthly-transactions"></div></section>`;
}

function vehiclePage() {
  return `${heading('Vehicle status register', 'Review financed vehicles and record seizure or release updates.', `${btn('Vehicle seizing / release', 'navigate:vehicle-seizing', 'btn')}${btn('＋ New application', 'navigate:new-application', 'btn btn-primary')}`)}<section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Financed vehicles</h2><p class="panel-subtitle">${store.customers.filter((c)=>c.status!=='Closed').length} vehicles under active accounts</p></div><label class="search-box"><input data-filter-table placeholder="Search customer, code, vehicle…" /></label></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>HP code</th><th>Vehicle</th><th>Registration</th><th>Village</th><th>Loan balance</th><th>Status</th><th></th></tr></thead><tbody>${store.customers.map((c)=>`<tr data-record><td>${initialsCell(c.name,c.phone)}</td><td>${esc(c.code)}</td><td>${esc(c.vehicle)}</td><td>${esc(c.regNo||'—')}</td><td>${esc(c.village)}</td><td>${money(Math.max(0,c.totalPayable-c.paid))}</td><td>${statusPill(c.status)}</td><td>${c.status==='Closed'?'—':btn(c.status==='Seized'?'Release':'Mark seized',`toggle-vehicle:${c.code}`,c.status==='Seized'?'btn btn-small btn-success':'btn btn-small btn-danger')}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function accountClosePage() {
  const c = store.customers.find((customer) => customer.status !== 'Closed') || store.customers[0];
  const balance=c?Math.max(0,c.totalPayable-c.paid)+Math.max(0,Number(c.dpDue)||0):0;
  return `${heading('Account closing', 'Review customer details, settle the remaining amount, and close a finance account.', '')}<section class="content-split"><div class="panel form-panel"><form data-form="close-account"><div class="form-section"><h2 class="form-section-head"><span>1</span> Customer and account details</h2><div class="form-grid"><div class="field full"><label for="close-account-select">HP code · customer *</label><select name="code" id="close-account-select" required>${customerOptions(c?.code)}</select></div><div class="field"><label>Father / husband name</label><input id="close-father" readonly value="${esc(c?.father||'—')}" /></div><div class="field"><label>Mobile number</label><input id="close-phone" readonly value="${esc(c?.phone||'—')}" /></div><div class="field full"><label>Address</label><input id="close-address" readonly value="${esc(c?.address||c?.village||'—')}" /></div><div class="field"><label>Vehicle name</label><input id="close-vehicle" readonly value="${esc(c?.vehicle||'—')}" /></div><div class="field"><label>Vehicle registration no.</label><input id="close-reg-no" readonly value="${esc(c?.regNo||'—')}" /></div><div class="field"><label>Account status</label><input id="close-status" readonly value="${esc(c?.status||'—')}" /></div><div class="field"><label>Closing date *</label><input name="date" type="date" required value="${isoDate()}" /></div></div></div><div class="form-section"><h2 class="form-section-head"><span>2</span> Final finance and payment details</h2><div class="form-grid"><div class="field"><label>Total finance amount</label><input id="close-principal" readonly value="${c?money(c.principal):'—'}" /></div><div class="field"><label>Down payment amount</label><input id="close-down-payment" readonly value="${c?money(c.downPayment):'—'}" /></div><div class="field"><label>DP paid</label><input id="close-dp-paid" readonly value="${c?money(c.initialPayment):'—'}" /></div><div class="field"><label>DP balance</label><input id="close-dp-due" readonly value="${c?money(c.dpDue):'—'}" /></div><div class="field"><label>Installment amount</label><input id="close-emi" readonly value="${c?money(c.emi):'—'}" /></div><div class="field"><label>Total amount paid</label><input id="close-paid" readonly value="${c?money(c.paid):'—'}" /></div><div class="field"><label>Balance amount *</label><input id="close-balance" readonly value="${money(balance)}" /></div><div class="field"><label>Final amount paid (₹) *</label><input name="finalAmount" id="close-final-amount" type="number" min="0" step="0.01" required value="${balance}" /></div><div class="field"><label>Mode of payment *</label><select name="mode"><option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>UPI</option></select></div><div class="field"><label>Bank name</label><input name="bank" placeholder="If applicable" /></div><div class="field"><label>Cheque / transaction no.</label><input name="reference" placeholder="Optional" /></div><div class="field"><label>Receipt / book no.</label><input name="book" placeholder="Optional" /></div><div class="field full"><label>Amount paid details / narration</label><textarea name="narration" placeholder="Final settlement details"></textarea></div></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Save closure</button><button class="btn" type="reset">Clear</button><button class="btn" type="button" data-action="navigate:applications">Cancel</button><button class="btn" type="button" data-action="navigate:home">Close</button></div></form></div><aside class="panel summary-card"><h3>Closing checklist</h3><div class="activity-list"><div class="activity-row"><span class="activity-dot">1</span><div><strong>Confirm customer account</strong><small>Verify the selected HP account details</small></div></div><div class="activity-row"><span class="activity-dot">2</span><div><strong>Record the final settlement</strong><small>Settlement must cover the remaining balance</small></div></div><div class="activity-row"><span class="activity-dot">3</span><div><strong>Save account closure</strong><small>Closed accounts stay in the register</small></div></div></div><div class="summary-note">Current account balance: <strong id="close-balance-note">${money(balance)}</strong></div></aside></section>`;
}
function updateCloseSummary() {
  const select = document.querySelector('#close-account-select'); if (!select) return;
  const c=store.customers.find((customer)=>customer.code===select.value); if (!c) return;
  const balance=Math.max(0,c.totalPayable-c.paid)+Math.max(0,Number(c.dpDue)||0);document.querySelector('#close-principal').value=money(c.principal);document.querySelector('#close-down-payment').value=money(c.downPayment);document.querySelector('#close-dp-paid').value=money(c.initialPayment);document.querySelector('#close-dp-due').value=money(c.dpDue);document.querySelector('#close-emi').value=money(c.emi);document.querySelector('#close-paid').value=money(c.paid);document.querySelector('#close-balance').value=money(balance);document.querySelector('#close-final-amount').value=balance;document.querySelector('#close-status').value=c.status;document.querySelector('#close-father').value=c.father||'—';document.querySelector('#close-phone').value=c.phone||'—';document.querySelector('#close-address').value=c.address||c.village||'—';document.querySelector('#close-vehicle').value=c.vehicle||'—';document.querySelector('#close-reg-no').value=c.regNo||'—';document.querySelector('#close-balance-note').textContent=money(balance);
}
function daybookPage(date=selectedDaybookDate) {
  const transactions = store.transactions.filter((t)=>t.date===date).sort((a,b)=>b.id.localeCompare(a.id));const collections=transactions.filter((transaction)=>transaction.type==='Collection');
  return `${heading('Daybook details', 'Daily collections and finance account activity.', `${btn('＋ Record collection', 'navigate:receipts', 'btn btn-primary')}${btn('⎙ Print daybook', 'print', 'btn')}`)}<section class="metric-grid"><div class="metric-tile"><small>Cash received</small><strong>${money(collections.filter((t)=>t.mode==='Cash').reduce((s,t)=>s+Number(t.amount),0))}</strong><span>Cash collection</span></div><div class="metric-tile"><small>Digital and bank</small><strong>${money(collections.filter((t)=>t.mode!=='Cash').reduce((s,t)=>s+Number(t.amount),0))}</strong><span>Non-cash collection</span></div><div class="metric-tile"><small>Receipt entries</small><strong>${collections.length}</strong><span>${shortDate(date)}</span></div></section><section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Daybook entries</h2><p class="panel-subtitle">${shortDate(date)}</p></div><div class="field"><input type="date" value="${date}" data-daybook-date /></div></div>${transactionsTable(transactions)}</section>`;
}

function voucherPage(kind='voucher') {
  const config={voucher:{title:'Voucher entry',prefix:'VCH',subtitle:'Record a general receipt, debit, or credit voucher.'},journal:{title:'Journal entry',prefix:'JV',subtitle:'Post a debit and credit journal entry.'},payment:{title:'Payment entry',prefix:'PV',subtitle:'Record cash, bank, and account payments.'},contra:{title:'Contra voucher',prefix:'CV',subtitle:'Record cash and bank transfers between accounts.'}}[kind];
  const number=`${config.prefix}-${String(store.nextVoucher).padStart(4,'0')}`;const records=store.vouchers.filter((voucher)=>voucher.kind===kind).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.number||'').localeCompare(a.number||''));
  const customerSelect=`<option value="">No HP customer</option>${customerOptions()}`;
  let fields='';
  if(kind==='journal')fields=`<div class="field"><label for="voucher-main-code">Main A/C code *</label><input id="voucher-main-code" name="mainCode" required placeholder="Account code" /></div><div class="field"><label for="voucher-main-name">Select A/C name *</label><input id="voucher-main-name" name="mainName" required placeholder="Account name" /></div><div class="field"><label for="voucher-amount">Amount (₹) *</label><input id="voucher-amount" name="amount" type="number" min="0.01" step="0.01" required /></div><div class="field"><label for="voucher-entry-type">Debit / credit *</label><select id="voucher-entry-type" name="entryType" required><option>Debit</option><option>Credit</option></select></div><div class="field"><label for="voucher-contra-code">Contra A/C code *</label><input id="voucher-contra-code" name="contraCode" required placeholder="Account code" /></div><div class="field"><label for="voucher-contra-name">Select contra name *</label><input id="voucher-contra-name" name="contraName" required placeholder="Contra account name" /></div><div class="field"><label for="voucher-entry-description">Description</label><input id="voucher-entry-description" name="description" placeholder="Journal description" /></div>`;
  else if(kind==='payment')fields=`<div class="field"><label for="voucher-payee">Paid to / party *</label><input id="voucher-payee" name="payee" required placeholder="Party or supplier name" /></div><div class="field"><label for="voucher-account-code">Main A/C code</label><input id="voucher-account-code" name="accountCode" placeholder="Account code" /></div><div class="field"><label for="voucher-account-name">Account name *</label><input id="voucher-account-name" name="accountName" required placeholder="Cash / bank / expense account" /></div><div class="field"><label for="voucher-mode">Mode of payment *</label><select id="voucher-mode" name="mode"><option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>UPI</option></select></div><div class="field"><label for="voucher-bank">Bank name</label><input id="voucher-bank" name="bank" placeholder="Bank name" /></div><div class="field"><label for="voucher-reference">Cheque / transaction no.</label><input id="voucher-reference" name="reference" placeholder="Reference number" /></div><div class="field"><label for="voucher-book">Payment book no.</label><input id="voucher-book" name="bookNo" placeholder="Book / voucher no." /></div><div class="field"><label for="voucher-amount">Amount paid (₹) *</label><input id="voucher-amount" name="amount" type="number" min="0.01" step="0.01" required /></div><div class="field full"><label for="voucher-entry-description">Description / narration</label><textarea id="voucher-entry-description" name="description" placeholder="Payment details"></textarea></div>`;
  else if(kind==='contra')fields=`<div class="field"><label for="voucher-from-code">From A/C code *</label><input id="voucher-from-code" name="fromCode" required placeholder="Cash / bank code" /></div><div class="field"><label for="voucher-from-name">From account name *</label><input id="voucher-from-name" name="fromName" required placeholder="Cash or bank account" /></div><div class="field"><label for="voucher-to-code">To A/C code *</label><input id="voucher-to-code" name="toCode" required placeholder="Cash / bank code" /></div><div class="field"><label for="voucher-to-name">To account name *</label><input id="voucher-to-name" name="toName" required placeholder="Cash or bank account" /></div><div class="field"><label for="voucher-mode">Transfer mode</label><select id="voucher-mode" name="mode"><option>Bank transfer</option><option>Cash</option><option>Cheque</option></select></div><div class="field"><label for="voucher-bank">Bank name</label><input id="voucher-bank" name="bank" placeholder="If applicable" /></div><div class="field"><label for="voucher-reference">Cheque / transaction no.</label><input id="voucher-reference" name="reference" placeholder="Reference number" /></div><div class="field"><label for="voucher-amount">Transfer amount (₹) *</label><input id="voucher-amount" name="amount" type="number" min="0.01" step="0.01" required /></div><div class="field full"><label for="voucher-entry-description">Description</label><textarea id="voucher-entry-description" name="description" placeholder="Contra voucher narration"></textarea></div>`;
  else fields=`<div class="field"><label for="voucher-type">Voucher type *</label><select id="voucher-type" name="voucherType"><option>Receipt</option><option>Debit</option><option>Credit</option><option>Adjustment</option></select></div><div class="field"><label for="voucher-account-code">Main A/C code</label><input id="voucher-account-code" name="accountCode" placeholder="Account code" /></div><div class="field"><label for="voucher-account-name">Account name *</label><input id="voucher-account-name" name="accountName" required placeholder="Account name" /></div><div class="field"><label for="voucher-customer">HP customer</label><select id="voucher-customer" name="customerCode">${customerSelect}</select></div><div class="field"><label for="voucher-mode">Mode</label><select id="voucher-mode" name="mode"><option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>UPI</option></select></div><div class="field"><label for="voucher-bank">Bank name</label><input id="voucher-bank" name="bank" placeholder="Bank name" /></div><div class="field"><label for="voucher-reference">Cheque / transaction no.</label><input id="voucher-reference" name="reference" placeholder="Reference number" /></div><div class="field"><label for="voucher-book">Book no.</label><input id="voucher-book" name="bookNo" placeholder="Receipt / voucher book" /></div><div class="field"><label for="voucher-amount">Amount (₹) *</label><input id="voucher-amount" name="amount" type="number" min="0.01" step="0.01" required /></div><div class="field full"><label for="voucher-entry-description">Narration / description</label><textarea id="voucher-entry-description" name="description" placeholder="Voucher details"></textarea></div>`;
  const recordsHtml=records.length?records.map((voucher)=>`<tr data-record><td>${shortDate(voucher.date)}</td><td><strong>${esc(voucher.number)}</strong></td><td>${esc(voucher.accountName||voucher.mainName||voucher.payee||voucher.fromName||'—')}</td><td>${esc(voucher.contraName||voucher.toName||voucher.voucherType||'—')}</td><td>${money(voucher.amount)}</td><td>${esc(voucher.mode||voucher.entryType||'—')}</td><td>${esc(voucher.description||'—')}</td><td><button class="btn btn-small" type="button" data-action="load-voucher" data-id="${esc(voucher.id)}">Select</button></td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-state">No entries recorded for this page yet.</div></td></tr>';
  return `${heading(config.title,config.subtitle,`${btn('⎙ Print list','print','btn')}${btn('↓ Export Excel','export-vouchers','btn btn-primary')}${btn('Close','navigate:home','btn')}`)}<div class="voucher-layout"><form id="voucher-form" class="panel form-panel" data-form="voucher" data-kind="${kind}"><div class="form-section"><h2 class="form-section-head"><span>1</span> ${config.title} details</h2><div class="form-grid"><div class="field"><label for="voucher-date">Date *</label><input id="voucher-date" name="date" type="date" required value="${isoDate()}" /></div><div class="field"><label for="voucher-number">${kind==='journal'?'Journal':'Voucher'} no. *</label><input id="voucher-number" name="number" required value="${number}" /></div>${fields}</div></div><div class="form-actions voucher-actions"><button class="btn btn-success" type="submit">Save</button><button class="btn" type="button" data-action="find-voucher">Find</button><button class="btn btn-primary" type="button" data-action="update-voucher">Update</button><button class="btn btn-danger" type="button" data-action="delete-voucher">Delete</button><button class="btn" type="button" data-action="cancel-voucher">Cancel</button><button class="btn" type="button" data-action="list-vouchers">List</button><button class="btn" type="button" data-action="navigate:home">Close</button></div></form><aside class="panel summary-card"><h3>Entry summary</h3><div class="summary-line"><span>Entry type</span><strong>${config.title}</strong></div><div class="summary-line"><span>Saved entries</span><strong>${records.length}</strong></div><div class="summary-line"><span>Next number</span><strong>${number}</strong></div><div class="summary-note">Saved ${kind} records stay in this browser and can be selected, updated, printed, or deleted.</div></aside></div><section class="panel data-panel voucher-list" id="voucher-list"><div class="panel-toolbar"><div><h2 class="panel-title">${config.title} list</h2><p class="panel-subtitle">${records.length} saved entries</p></div><label class="search-box"><input data-filter-table placeholder="Search voucher no., account, description…" /></label></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Voucher no.</th><th>Account</th><th>Contra / type</th><th>Amount</th><th>Mode</th><th>Description</th><th></th></tr></thead><tbody>${recordsHtml}</tbody></table></div></section>`;
}
function saveVoucherEntry(form, update=false) {
  const kind=form.dataset.kind;const data=Object.fromEntries(new FormData(form).entries());const amount=Number(data.amount)||0;const editingId=form.dataset.editingId||'';
  if(amount<=0){showToast('Enter an amount greater than zero.','error');return;}
  if(!form.reportValidity())return;
  if(kind==='journal'&&data.mainCode===data.contraCode){showToast('Main and contra accounts must be different.','error');return;}
  if(kind==='contra'&&data.fromCode===data.toCode){showToast('Choose two different accounts for the transfer.','error');return;}
  if(update&&!editingId){showToast('Select an existing entry before updating it.','error');return;}
  const duplicate=store.vouchers.find((entry)=>entry.kind===kind&&entry.number.toLowerCase()===String(data.number).toLowerCase()&&entry.id!==editingId);
  if(duplicate){showToast(`${data.number} is already used on this page.`,'error');return;}
  if(editingId){const existing=store.vouchers.find((entry)=>entry.id===editingId);if(!existing){showToast('The selected entry could not be found.','error');return;}Object.assign(existing,data,{amount,kind,updated:isoDate()});showToast(`${data.number} updated.`);}
  else {const prefix={voucher:'VCH',journal:'JV',payment:'PV',contra:'CV'}[kind];store.vouchers.unshift({id:`${prefix}-${Date.now()}-${store.nextVoucher}`,kind,...data,amount,created:isoDate()});store.nextVoucher+=1;showToast(`${data.number} saved.`);}
  persist();render();
}
function loadVoucherEntry(id) {
  const voucher=store.vouchers.find((entry)=>entry.id===id);const form=document.querySelector('#voucher-form');if(!voucher||!form)return;
  Object.entries(voucher).forEach(([name,value])=>{const field=form.elements.namedItem(name);if(field&&value!=null&&field.tagName!=='FIELDSET')field.value=String(value);});
  form.dataset.editingId=voucher.id;document.querySelector('#voucher-number').value=voucher.number;showToast(`Loaded ${voucher.number} for editing.`);form.querySelector('#voucher-date')?.focus({preventScroll:true});
}
function findVoucherEntry() {
  const form=document.querySelector('#voucher-form');const number=form?.elements.namedItem('number')?.value.trim().toLowerCase();const entry=store.vouchers.find((voucher)=>voucher.kind===form?.dataset.kind&&voucher.number.toLowerCase()===number);
  if(!entry){showToast('Voucher number was not found.','error');return;}loadVoucherEntry(entry.id);
}
function deleteVoucherEntry() {
  const form=document.querySelector('#voucher-form');const id=form?.dataset.editingId;const entry=store.vouchers.find((voucher)=>voucher.id===id);
  if(!entry){showToast('Select an entry before deleting it.','error');return;}
  if(!window.confirm(`Delete ${entry.number}?`))return;
  store.vouchers=store.vouchers.filter((voucher)=>voucher.id!==id);persist();render();showToast(`${entry.number} deleted.`);
}
function cancelVoucherEntry() { const form=document.querySelector('#voucher-form');if(!form)return;form.reset();form.dataset.editingId='';const prefix={voucher:'VCH',journal:'JV',payment:'PV',contra:'CV'}[form.dataset.kind];form.elements.namedItem('number').value=`${prefix}-${String(store.nextVoucher).padStart(4,'0')}`; }
function exportVouchers() {
  const kind=document.querySelector('#voucher-form')?.dataset.kind||'voucher';const entries=store.vouchers.filter((entry)=>entry.kind===kind);const keys=[...new Set(entries.flatMap((entry)=>Object.keys(entry)))].filter((key)=>!['id','kind','created','updated'].includes(key));
  exportCsv(`profit-plus-${kind}-entries.csv`,[['Entry type',...keys],...entries.map((entry)=>[kind,...keys.map((key)=>entry[key]??'')])]);
}

function hpDetailsPage() {
  const branches=[...new Set(store.customers.map((customer)=>customer.zone||customer.village).filter(Boolean))];
  return `${heading('HP details','Search account, customer, vehicle and guarantor details.',`${btn('Display all','display-all-hp-details','btn')}${btn('Close','navigate:home','btn')}`)}<section class="panel hp-details-controls"><div class="hp-details-grid"><div class="field"><label for="hp-detail-type">Account type</label><select id="hp-detail-type"><option value="all">All types</option><option>HP</option><option>HL</option></select></div><div class="field"><label for="hp-detail-search-by">Search with</label><select id="hp-detail-search-by"><option value="code">HP code</option><option value="name">Party name</option><option value="vehicle">Vehicle name</option><option value="vehicleNo">Vehicle no.</option><option value="guarantor">Guarantor</option></select></div><div class="field"><label for="hp-detail-query">Enter search value</label><input id="hp-detail-query" placeholder="Account, name or vehicle" /></div><div class="field"><label for="hp-detail-source">Source / branch</label><select id="hp-detail-source"><option value="all">All branches</option>${branches.map((branch)=>`<option>${esc(branch)}</option>`).join('')}</select></div><button class="btn btn-primary" type="button" data-action="search-hp-details">Search</button></div></section><section class="content-split hp-details-layout"><section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">HP customer details</h2><p class="panel-subtitle" id="hp-detail-count">${store.customers.length} accounts</p></div></div><div class="table-wrap"><table><thead><tr><th>Code</th><th>Party name</th><th>Father / husband</th><th>Guarantor</th><th>Vehicle name</th><th>Vehicle no.</th><th>Finance date</th><th></th></tr></thead><tbody id="hp-details-table"></tbody></table></div></section><aside id="hp-detail-summary" class="panel summary-card"><h3>Selected account</h3><p class="panel-subtitle">Choose an account row to show its details.</p></aside></section>`;
}
function renderHpDetails() {
  const table=document.querySelector('#hp-details-table');if(!table)return;
  const type=document.querySelector('#hp-detail-type')?.value||'all';const field=document.querySelector('#hp-detail-search-by')?.value||'code';const query=(document.querySelector('#hp-detail-query')?.value||'').trim().toLowerCase();const source=document.querySelector('#hp-detail-source')?.value||'all';
  const filtered=store.customers.filter((customer)=>{const fieldValue=({code:customer.code,name:customer.name,vehicle:customer.vehicle,vehicleNo:customer.regNo,guarantor:customer.guarantor})[field]||'';return (type==='all'||(customer.partyType||'HP')===type)&&(!query||String(fieldValue).toLowerCase().includes(query))&&(source==='all'||(customer.zone||customer.village)===source);});
  table.innerHTML=filtered.length?filtered.map((customer)=>`<tr><td><strong>${esc(customer.code)}</strong></td><td>${esc(customer.name)}</td><td>${esc(customer.father||'—')}</td><td>${esc(customer.guarantor||'—')}</td><td>${esc(customer.vehicle||'—')}</td><td>${esc(customer.regNo||'—')}</td><td>${shortDate(customer.financeDate||customer.created)}</td><td><button class="btn btn-small" type="button" data-action="view-hp-detail" data-code="${esc(customer.code)}">Select</button></td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-state">No accounts match these search details.</div></td></tr>';
  const count=document.querySelector('#hp-detail-count');if(count)count.textContent=`${filtered.length} account${filtered.length===1?'':'s'} found`;
}
function showHpDetail(code) {
  const customer=store.customers.find((record)=>record.code===code);const panel=document.querySelector('#hp-detail-summary');if(!panel||!customer)return;
  const groups=[
    ['Party details',[['HP code',customer.code],['Account no.',customer.accountNo],['Party type',customer.partyType||'HP'],['Party name',customer.name],['Father / husband',customer.father],['Age',customer.age],['Date of birth',shortDate(customer.dob)],['Occupation',customer.occupation],['Door no.',customer.doorNo],['Street',customer.street],['Village / town',customer.village],['Mandal',customer.mandal],['District',customer.district],['State',customer.state],['PIN code',customer.pinCode],['Area',customer.area],['Zone / branch',customer.zone],['Mobile',customer.phone],['STD code',customer.stdCode],['Phone (residence)',customer.phoneR],['Phone (office)',customer.phoneO]]],
    ['Guarantor details',[['Guarantor name',customer.guarantor],['Father / husband',customer.guarantorFather],['Age',customer.guarantorAge],['Occupation',customer.guarantorOccupation],['Mobile',customer.guarantorPhone],['Door no.',customer.guarantorDoorNo],['Street',customer.guarantorStreet],['Village / town',customer.guarantorVillage],['Mandal',customer.guarantorMandal],['District',customer.guarantorDistrict],['STD code',customer.guarantorStdCode],['Phone (residence)',customer.guarantorPhoneR],['Phone (office)',customer.guarantorPhoneO]]],
    ['Vehicle details',[['Vehicle type',customer.vehicleType],['Vehicle name / make',customer.vehicle],['Model',customer.vehicleModel],['Registration no.',customer.regNo],['Engine no.',customer.engineNo],['Chassis no.',customer.chassisNo],['On-road price',money(customer.purchasePrice)],['Delivery date',shortDate(customer.deliveryDate)]]],
    ['Finance details',[['Finance date',shortDate(customer.financeDate||customer.created)],['First installment date',shortDate(customer.firstDueDate||customer.nextDue)],['Maturity date',shortDate(customer.maturityDate)],['Finance amount',money(customer.principal)],['Down payment',money(customer.downPayment)],['Initial payment',money(customer.initialPayment)],['DP due',money(customer.dpDue)],['Document charges',money(customer.docCharges)],['Interest rate',`${Number(customer.interestRate)||0}%`],['No. of installments',customer.months],['Installment amount',money(customer.emi)],['Total payable',money(customer.totalPayable)],['Amount paid',money(customer.paid)],['Balance',money(Math.max(0,customer.totalPayable-customer.paid))],['Next due date',shortDate(customer.nextDue)],['Account status',customer.status]]],
    ['Account and recovery details',[['Company',customer.company],['Ledger code',customer.ledgerCode],['Verified by',customer.verifiedBy],['Seizing status',customer.seizingStatus],['RTO agent',customer.rtoAgent],['C Book',customer.cBook],['E no.',customer.eNo],['C no.',customer.cNo],['Assigned / done by',customer.assignedBy],['Consultant',customer.consultant],['Agent phone no.',customer.agentPhone],['HP return',customer.hpReturn],['Account description',customer.accountDescription],['Narration',customer.narration],['Notice description',customer.noticeDescription],['Account close description',customer.accountCloseDescription],['Promise to pay',shortDate(customer.ptp)],['Visit date',shortDate(customer.visitDate)],['Remarks',customer.remarks],['Application notes',customer.notes]]],
  ];
  panel.innerHTML=`<h3>${esc(customer.name)} · ${esc(customer.code)}</h3>${groups.map(([title,rows])=>`<h4 class="hp-detail-section-title">${esc(title)}</h4>${rows.map(([label,value])=>`<div class="summary-line"><span>${esc(label)}</span><strong>${esc(value??'—')}</strong></div>`).join('')}`).join('')}<div class="hp-details-actions"><button class="btn btn-small" type="button" data-action="edit-application" data-code="${esc(customer.code)}">Edit account</button><button class="btn btn-small btn-primary" type="button" data-action="open-calculation" data-code="${esc(customer.code)}">Calculation</button></div>`;
}

let odCalculationMode='od';
function odCalculationPage() {
  const options=store.customers.map((customer)=>`<option value="${esc(customer.code)}">${esc(customer.code)} · ${esc(customer.name)}</option>`).join('');
  return `${heading('OD calculation','Calculate overdue principal, OD interest, and total overdue by account.',`${btn('⎙ Print OD list','print','btn')}`)}<section class="panel od-controls"><div class="od-control-grid"><div class="field"><label for="od-from-account">From HP account</label><select id="od-from-account"><option value="">First account</option>${options}</select></div><div class="field"><label for="od-to-account">To HP account</label><select id="od-to-account"><option value="">Last account</option>${options}</select></div><div class="field"><label for="od-date">Reporting date</label><input id="od-date" type="date" value="${isoDate()}" /></div><div class="field"><label for="od-rate">Percentage / OD interest (%)</label><input id="od-rate" type="number" min="0" step="0.01" value="18" /></div><label class="od-old-account"><input id="od-old-account" type="checkbox" /> Old account</label><div class="od-control-actions"><button class="btn" type="button" data-action="od-previous-date">Prev date</button><button class="btn" type="button" data-action="od-new-account">New account</button><button class="btn" type="button" data-action="od-add-all">Add all</button><button class="btn btn-primary" type="button" data-action="od-generate">Generate</button><button class="btn" type="button" data-action="print">Print</button></div></div><div class="od-action-row"><button class="btn" type="button" data-action="od-calculate" data-mode="pd">Cal PD</button><button class="btn" type="button" data-action="od-calculate" data-mode="interest">Cal Interest</button><button class="btn btn-primary" type="button" data-action="od-calculate" data-mode="od">Cal OD</button><button class="btn" type="button" data-action="navigate:home">Close</button></div></section><div class="metric-grid od-metrics"><div class="metric-tile"><small>Overdue principal</small><strong id="od-total-principal">₹0</strong></div><div class="metric-tile"><small>OD interest</small><strong id="od-total-interest">₹0</strong></div><div class="metric-tile"><small>Total OD</small><strong id="od-total-amount">₹0</strong></div></div><section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">Overdue installment calculation</h2><p class="panel-subtitle" id="od-result-count">Generate the calculation for the selected date.</p></div></div><div class="table-wrap"><table><thead><tr><th>HP code</th><th>Party name</th><th>Village</th><th>Installment date</th><th>EMI</th><th>Installments overdue</th><th>OD days</th><th>OD principal</th><th>OD interest</th><th>Total OD</th></tr></thead><tbody id="od-calculation-table"></tbody></table></div></section>`;
}
function renderODCalculation(mode=odCalculationMode) {
  const table=document.querySelector('#od-calculation-table');if(!table)return;odCalculationMode=mode;
  const date=document.querySelector('#od-date')?.value||isoDate();const rate=Number(document.querySelector('#od-rate')?.value)||0;const from=document.querySelector('#od-from-account')?.value||'';const to=document.querySelector('#od-to-account')?.value||'';
  const oldAccount=!!document.querySelector('#od-old-account')?.checked;
  const customers=store.customers.filter((customer)=>(oldAccount||['Active','Seized','Due'].includes(customer.status))&&customer.nextDue&&customer.nextDue<=date&&(oldAccount?Math.max(0,customer.totalPayable-customer.paid)>0:dueAmount(customer)>0)&&(!from||customer.code.localeCompare(from)>=0)&&(!to||customer.code.localeCompare(to)<=0));
  let totalPrincipal=0,totalInterest=0;
  table.innerHTML=customers.length?customers.map((customer)=>{const days=Math.max(0,Math.floor((new Date(`${date}T00:00:00`)-new Date(`${customer.nextDue}T00:00:00`))/86400000));const installments=Math.floor(days/30)+1;const principal=Math.min(Math.max(0,customer.totalPayable-customer.paid),customer.emi*installments);const interest=principal*rate/100*days/365;totalPrincipal+=principal;totalInterest+=interest;const shownInterest=mode==='pd'?0:interest;const shownPrincipal=mode==='interest'?0:principal;return `<tr><td><strong>${esc(customer.code)}</strong></td><td>${esc(customer.name)}</td><td>${esc(customer.village||'—')}</td><td>${shortDate(customer.nextDue)}</td><td>${money(customer.emi)}</td><td>${installments}</td><td>${days}</td><td>${money(shownPrincipal)}</td><td>${money(shownInterest)}</td><td>${money(shownPrincipal+shownInterest)}</td></tr>`;}).join(''):'<tr><td colspan="10"><div class="empty-state">No overdue installment accounts for this date and account range.</div></td></tr>';
  const principal=document.querySelector('#od-total-principal');const interest=document.querySelector('#od-total-interest');const total=document.querySelector('#od-total-amount');
  if(principal)principal.textContent=money(mode==='interest'?0:totalPrincipal);if(interest)interest.textContent=money(mode==='pd'?0:totalInterest);if(total)total.textContent=money((mode==='interest'?0:totalPrincipal)+(mode==='pd'?0:totalInterest));
  const count=document.querySelector('#od-result-count');if(count)count.textContent=`${customers.length} overdue account${customers.length===1?'':'s'} · ${shortDate(date)} · OD rate ${rate}%${oldAccount?' · includes old accounts':''}`;
}

function masterDataPage(kind) {
  const config={branches:{title:'Branch creation',collection:'branches',prefix:'BR',fields:[['code','Branch code','text'],['name','Branch name','text'],['address','Address','text'],['phone','Phone no.','tel'],['manager','Branch manager','text'],['active','Active','select']]},lines:{title:'Line creation',collection:'lines',prefix:'LN',fields:[['type','Line type','line-type'],['code','Zone code','text'],['name','Zone name','text'],['parent','Parent main zone','text']]},books:{title:'Book creation',collection:'books',prefix:'BK',fields:[['bookNo','Book no.','text'],['branch','Branch','branch'],['zone','Office / zone','text']]}}[kind];
  const entries=store[config.collection]||[];const branchOptions=(store.branches||[]).map((branch)=>`<option>${esc(branch.name)}</option>`).join('');
  const fields=config.fields.map(([name,label,type])=>{let control='';if(type==='select')control='<select name="active"><option>Yes</option><option>No</option></select>';else if(type==='line-type')control='<select name="type"><option>Main Zone</option><option>Sub Zone</option></select>';else if(type==='branch')control=`<select name="branch"><option>Office</option>${branchOptions}</select>`;else control=`<input name="${name}" type="${type}" ${name==='code'||name==='name'||name==='bookNo'?'required':''} />`;return `<div class="field"><label>${esc(label)}${name==='code'||name==='name'||name==='bookNo'?' *':''}</label>${control}</div>`;}).join('');
  const columnLabels=config.fields.map(([,label])=>`<th>${esc(label)}</th>`).join('');const rows=entries.map((entry)=>`<tr data-record>${config.fields.map(([name])=>`<td>${esc(entry[name]||'—')}</td>`).join('')}<td><button class="btn btn-small" type="button" data-action="load-master" data-kind="${kind}" data-id="${esc(entry.id)}">Select</button></td></tr>`).join('');
  return `${heading(config.title,'Create and maintain office setup records.',btn('Close','navigate:home','btn'))}<section class="content-split master-layout"><form id="master-form" class="panel form-panel" data-form="master-data" data-kind="${kind}"><input type="hidden" name="id" /><h2 class="panel-title master-form-title">${config.title} details</h2><div class="form-grid master-form-grid">${fields}</div><div class="form-actions"><button class="btn btn-success" type="submit">Save</button><button class="btn btn-primary" type="button" data-action="update-master">Update</button><button class="btn btn-danger" type="button" data-action="delete-master">Delete</button><button class="btn" type="button" data-action="cancel-master">Cancel</button><button class="btn" type="button" data-action="navigate:home">Close</button></div></form><section class="panel data-panel"><div class="panel-toolbar"><div><h2 class="panel-title">${config.title.replace('creation','list')}</h2><p class="panel-subtitle">${entries.length} saved records</p></div><label class="search-box"><input data-filter-table placeholder="Search ${kind}…" /></label></div><div class="table-wrap"><table><thead><tr>${columnLabels}<th></th></tr></thead><tbody>${rows||`<tr><td colspan="${config.fields.length+1}"><div class="empty-state">No setup records yet.</div></td></tr>`}</tbody></table></div></section></section>`;
}
function saveMasterRecord(form, update=false) {
  const kind=form.dataset.kind;const config={branches:'branches',lines:'lines',books:'books'};const collection=store[config[kind]];const data=Object.fromEntries(new FormData(form).entries());const id=form.elements.namedItem('id').value;
  if(update&&!id){showToast('Select a saved row before updating it.','error');return;}
  const key=kind==='books'?'bookNo':'code';if(kind!=='books'&&collection.some((entry)=>String(entry[key]).toLowerCase()===String(data[key]).toLowerCase()&&entry.id!==id)){showToast(`${data[key]} is already in use.`,'error');return;}
  if(kind==='books'&&collection.some((entry)=>String(entry.bookNo)===String(data.bookNo)&&entry.id!==id)){showToast(`Book ${data.bookNo} already exists.`,'error');return;}
  if(id){const existing=collection.find((entry)=>entry.id===id);if(!existing)return;Object.assign(existing,data,{id});showToast('Setup record updated.');}
  else {collection.unshift({...data,id:`${{branches:'BR',lines:'LN',books:'BK'}[kind]}-${Date.now()}`});showToast('Setup record saved.');}
  persist();render();
}
function loadMasterRecord(kind,id) {
  const collection={branches:'branches',lines:'lines',books:'books'}[kind];const record=store[collection].find((entry)=>entry.id===id);const form=document.querySelector('#master-form');if(!record||!form)return;
  Object.entries(record).forEach(([name,value])=>{const field=form.elements.namedItem(name);if(field&&value!=null)field.value=String(value);});form.elements.namedItem('id').value=id;showToast('Setup record loaded.');
}
function deleteMasterRecord() {
  const form=document.querySelector('#master-form');const id=form?.elements.namedItem('id').value;if(!id){showToast('Select a saved record before deleting it.','error');return;}
  const kind=form.dataset.kind;const collection={branches:'branches',lines:'lines',books:'books'}[kind];const record=store[collection].find((entry)=>entry.id===id);if(!window.confirm(`Delete ${record?.name||record?.bookNo||'this setup record'}?`))return;
  store[collection]=store[collection].filter((entry)=>entry.id!==id);persist();render();showToast('Setup record deleted.');
}
function cancelMasterRecord() { const form=document.querySelector('#master-form');if(form){form.reset();form.elements.namedItem('id').value='';} }

let selectedSeizingCode='';
function vehicleSeizingPage() {
  const selected=store.customers.find((customer)=>customer.code===selectedSeizingCode)||store.customers.find((customer)=>customer.status!=='Closed')||store.customers[0];const options=store.customers.map((customer)=>`<option value="${esc(customer.code)}" ${customer.code===selected?.code?'selected':''}>${esc(customer.code)} · ${esc(customer.name)}</option>`).join('');
  const lastEvent=store.vehicleEvents.filter((event)=>event.code===selected?.code).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  const details=selected?[['Party name',selected.name],['Father / husband',selected.father],['Door no.',selected.doorNo],['Street name',selected.street],['Village',selected.village],['Mandal',selected.mandal],['District',selected.district],['Mobile no.',selected.phone],['Guarantor name',selected.guarantor],['Zone',selected.zone||selected.village]]:[];
  const account=selected?[['Total EMI',selected.months],['EMI paid',Math.min(selected.months,Math.floor(selected.paid/Math.max(1,selected.emi)))],['Last EMI paid date',shortDate(store.transactions.find((transaction)=>transaction.code===selected.code&&transaction.type==='Collection')?.date)],['Total amount',money(selected.totalPayable)],['Amount paid',money(selected.paid)],['Balance',money(Math.max(0,selected.totalPayable-selected.paid))]]:[];
  const vehicle=selected?[['Vehicle no.',selected.regNo],['Vehicle name',selected.vehicle],['Engine no.',selected.engineNo],['Chassis no.',selected.chassisNo],['Model',selected.vehicleModel],['Vehicle type',selected.vehicleType]]:[];
  return `${heading('Vehicle seizing','Record vehicle seizure and release details.',btn('Vehicle register','navigate:vehicles','btn'))}<section class="panel seizure-controls"><div class="field"><label for="seizing-account">HP account</label><select id="seizing-account">${options}</select></div><div class="seizure-status">${selected?statusPill(selected.status):'No account selected'}</div></section>${selected?`<div class="seizure-detail-grid"><section class="panel seizure-card"><h2>Party details</h2>${details.map(([label,value])=>`<div class="hp-detail-row"><span>${esc(label)}</span><strong>${esc(value||'—')}</strong></div>`).join('')}</section><section class="panel seizure-card"><h2>Account details</h2>${account.map(([label,value])=>`<div class="hp-detail-row"><span>${esc(label)}</span><strong>${esc(value||'—')}</strong></div>`).join('')}</section><section class="panel seizure-card"><h2>Vehicle details</h2>${vehicle.map(([label,value])=>`<div class="hp-detail-row"><span>${esc(label)}</span><strong>${esc(value||'—')}</strong></div>`).join('')}</section></div><section class="panel seizure-actions"><div class="field"><label for="vehicle-seizing-date">Vehicle seizing date</label><input id="vehicle-seizing-date" type="date" value="${lastEvent?.type==='Seized'?lastEvent.date:isoDate()}" /></div><div class="field"><label for="vehicle-released-date">Vehicle released date</label><input id="vehicle-released-date" type="date" value="${lastEvent?.type==='Released'?lastEvent.date:''}" /></div><div class="field"><label for="seizing-remarks">Remarks</label><input id="seizing-remarks" value="${esc(lastEvent?.remarks||'')}" placeholder="Seizure or release notes" /></div><div class="seizure-buttons"><button class="btn btn-danger" type="button" data-action="save-seizure">Save seizure</button><button class="btn btn-success" type="button" data-action="release-vehicle">Release</button><button class="btn" type="button" data-action="navigate:vehicles">Cancel</button><button class="btn btn-primary" type="button" data-action="navigate:home">Close</button></div></section>`:'<div class="panel blank-state">Create an HP account before recording a vehicle seizure.</div>'}`;
}
function saveVehicleSeizure(release=false) {
  const code=document.querySelector('#seizing-account')?.value;const customer=store.customers.find((record)=>record.code===code);if(!customer){showToast('Select an HP account first.','error');return;}
  const dateId=release?'vehicle-released-date':'vehicle-seizing-date';const date=document.querySelector(`#${dateId}`)?.value||isoDate();const remarks=document.querySelector('#seizing-remarks')?.value.trim()||'';
  customer.status=release?'Active':'Seized';if(release)customer.releasedDate=date;else customer.seizureDate=date;
  store.vehicleEvents.unshift({id:`VE-${Date.now()}`,code,type:release?'Released':'Seized',date,remarks});persist();selectedSeizingCode=code;render();showToast(`${customer.code} marked ${release?'released':'seized'}.`);
}

function reportsPage() {
  const items=[['due','◷','Due list report','Installment schedule by account, branch, and date.','orange'],['calculation','▧','Calculation report','Customer account details and installment repayment schedule.','red'],['hp-register','▦','HP register','Repayment and balance summary for the full book.','purple'],['ledger','▥','Customer ledger','Account level finance and collection statement.','blue'],['daybook','▧','Daybook details','Daily receipts with cash and digital totals.','green'],['monthly','▣','Monthly transactions','Monthly finance and collection summary.','red'],['vehicles','◉','Vehicle status','Active, seized, and released vehicle details.','orange']];
  return `${heading('Reports and registers', 'Print, review, and export your finance records.', '')}<div class="simple-grid">${items.map(([page,icon,title,description,tone])=>`<button class="panel simple-card module-card" data-page="${page}"><span class="module-icon ${tone}">${icon}</span><h3>${title}</h3><p>${description}</p><span class="text-button">Open report →</span></button>`).join('')}</div>`;
}
function simplePage(page) {
  if (page==='showroom') return `${heading('Showroom', 'Vehicle inventory linked to your finance desk.', btn('＋ New application','navigate:new-application','btn btn-primary'))}<div class="notice">Your finance desk currently tracks vehicles attached to customer accounts. Use account opening to add a vehicle to the portfolio.</div><section class="panel data-panel"><div class="table-wrap"><table><thead><tr><th>Vehicle</th><th>Type</th><th>Customer</th><th>HP code</th><th>Village</th><th>Status</th></tr></thead><tbody>${store.customers.map(c=>`<tr><td>${esc(c.vehicle)}</td><td>${esc(c.vehicleType)}</td><td>${esc(c.name)}</td><td>${esc(c.code)}</td><td>${esc(c.village)}</td><td>${statusPill(c.status)}</td></tr>`).join('')}</tbody></table></div></section>`;
  return `${heading('About PROFIT+', 'Padma Bhushan Auto Finance management workspace.', '')}<section class="panel form-panel"><div class="form-grid"><div><div class="eyebrow">FINANCE SUITE</div><h2 class="panel-title" style="font-size:18px;margin:8px 0">PROFIT+ Auto Finance</h2><p style="font-size:10px;color:#858da0;line-height:1.8;max-width:500px">A simple account and collection workspace inspired by the desktop finance system in your reference photos. Manage hire purchase applications, customer balances, receipts, due installments, and vehicle status.</p></div><div class="summary-card"><h3>Workspace details</h3><div class="summary-line"><span>Finance branch</span><strong>Padma Bhushan Auto Finance</strong></div><div class="summary-line"><span>Build</span><strong>Finance Suite 2.6</strong></div><div class="summary-line"><span>Storage</span><strong>This browser</strong></div></div></div></section>`;
}

function render(accountCode) {
  const content = document.querySelector('#page-content');
  switch (currentPage) {
    case 'home': content.innerHTML = dashboard(); break;
    case 'applications': content.innerHTML = applicationsPage(accountCode); renderApplicationList(); break;
    case 'new-application': content.innerHTML = applicationForm(); updateApplicationSummary(); break;
    case 'calculation': content.innerHTML = calculationPage(); renderCalculation(); break;
    case 'customers': content.innerHTML = customersPage(); break;
    case 'receipts': content.innerHTML = receiptPage(); updateReceiptSummary(); break;
    case 'voucher': content.innerHTML = voucherPage('voucher'); break;
    case 'journal': content.innerHTML = voucherPage('journal'); break;
    case 'payment': content.innerHTML = voucherPage('payment'); break;
    case 'contra': content.innerHTML = voucherPage('contra'); break;
    case 'due': content.innerHTML = duePage(); renderDueList(); break;
    case 'ledger': content.innerHTML = ledgerPage(accountCode); break;
    case 'hp-register': content.innerHTML = hpRegisterPage(); break;
    case 'hp-details': content.innerHTML = hpDetailsPage(); renderHpDetails(); break;
    case 'od-calculation': content.innerHTML = odCalculationPage(); renderODCalculation(); break;
    case 'monthly': content.innerHTML = monthlyPage(); renderMonthly(); break;
    case 'vehicles': content.innerHTML = vehiclePage(); break;
    case 'vehicle-seizing': content.innerHTML = vehicleSeizingPage(); break;
    case 'branches': content.innerHTML = masterDataPage('branches'); break;
    case 'lines': content.innerHTML = masterDataPage('lines'); break;
    case 'books': content.innerHTML = masterDataPage('books'); break;
    case 'account-close': content.innerHTML = accountClosePage(); break;
    case 'daybook': content.innerHTML = daybookPage(); break;
    case 'reports': content.innerHTML = reportsPage(); break;
    default: content.innerHTML = simplePage(currentPage);
  }
  updateCounts();
}

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const link = document.createElement('a');const url=URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(`${filename} downloaded.`);
}
function exportApplications(customers = store.customers, filename = 'profit-plus-account-register.csv') {
  const columns=['HP code','A/C no.','Party type','Party name','Mobile','Father / husband','Age','Date of birth','Occupation','Door no.','Street','Village / town','Mandal','District','State','PIN code','STD code','Phone residence','Phone office','Zone / branch','Area','Guarantor name','Guarantor mobile','Guarantor father / husband','Guarantor age','Guarantor occupation','Guarantor door no.','Guarantor street','Guarantor village','Guarantor mandal','Guarantor district','Guarantor STD code','Guarantor phone residence','Guarantor phone office','Vehicle type','Vehicle name / make','Vehicle model','Vehicle no.','Engine no.','Chassis no.','On-road price','Delivery date','Finance date','First installment date','Maturity date','Finance amount','Down payment','Initial payment','DP due','Document charges','Interest rate','No. installments','EMI','Total payable','Amount paid','Balance','Account status','Ledger code','Company','Verified by','Seizing status','Installments pending','RTO agent','C Book','E no.','C no.','Assigned / done by','Consultant','Agent phone','HP return','Account description','Narration','Notice description','Account close description','PTP date','Visit date','Remarks','Application notes'];
  exportCsv(filename, [columns,...customers.map((c)=>[c.code,c.accountNo,c.partyType||'HP',c.name,c.phone,c.father,c.age,c.dob,c.occupation,c.doorNo,c.street,c.village,c.mandal,c.district,c.state,c.pinCode,c.stdCode,c.phoneR,c.phoneO,c.zone,c.area,c.guarantor,c.guarantorPhone,c.guarantorFather,c.guarantorAge,c.guarantorOccupation,c.guarantorDoorNo,c.guarantorStreet,c.guarantorVillage,c.guarantorMandal,c.guarantorDistrict,c.guarantorStdCode,c.guarantorPhoneR,c.guarantorPhoneO,c.vehicleType,c.vehicle,c.vehicleModel,c.regNo,c.engineNo,c.chassisNo,c.purchasePrice,c.deliveryDate,c.financeDate||c.created,c.firstDueDate,c.maturityDate,c.principal,c.downPayment,c.initialPayment,c.dpDue,c.docCharges,c.interestRate,c.months,c.emi,c.totalPayable,c.paid,Math.max(0,c.totalPayable-c.paid),c.status,c.ledgerCode,c.company,c.verifiedBy,c.seizingStatus,c.installmentsPending,c.rtoAgent,c.cBook,c.eNo,c.cNo,c.assignedBy,c.consultant,c.agentPhone,c.hpReturn,c.accountDescription,c.narration,c.noticeDescription,c.accountCloseDescription,c.ptp,c.visitDate,c.remarks,c.notes])]);
}
function exportApplication(code) {
  const customer = store.customers.find(record => record.code === code);
  if (!customer) { showToast('This customer account could not be found.', 'error'); return; }
  const fileCode = customer.code.replace(/[^a-z0-9_-]+/gi, '-');
  exportApplications([customer], `profit-plus-customer-${fileCode}.csv`);
}
function exportDue() {
  exportCsv('profit-plus-due-list.csv', dueReportMatrix(getDueFilterOptions()));
}
function updateTableFilter(input) {
  if (currentPage === 'applications') { renderApplicationList(); return; }
  const query = input.value.trim().toLowerCase();
  const table = input.closest('.panel')?.querySelector('tbody') || document.querySelector('tbody');
  if (table) table.querySelectorAll('tr[data-record]').forEach((row)=>row.hidden=!row.textContent.toLowerCase().includes(query));
}
function saveApplication(form) {
  const customer=applicationDataFromForm(form);
  if (!customer) return;
  if(customer.principal<=0){showToast('Enter a finance amount to continue.','error');return;}
  if(customer.initialPayment>customer.downPayment){showToast('Initial payment cannot exceed the down payment amount.','error');return;}
  if(store.customers.some((existing)=>existing.code.toUpperCase()===customer.code)){showToast(`HP code ${customer.code} is already in use. Choose a unique code.`,'error');return;}
  customer.created=isoDate();customer.paid=0;
  const nextStore = { ...store, nextCode: store.nextCode + 1, customers: [customer, ...store.customers], transactions: [...store.transactions] };
  if(customer.initialPayment>0)nextStore.transactions.unshift({id:`RC-${String(nextStore.nextReceipt++).padStart(3,'0')}`,code:customer.code,date:customer.financeDate||isoDate(),amount:customer.initialPayment,mode:customer.mode||'Cash',bank:customer.bankName||'',reference:customer.chequeNo||'',type:'Collection',narration:'Initial down payment'});
  if (!persist(nextStore)) return;
  showToast(`Finance account ${customer.code} created for ${customer.name}.`);navigate('applications', customer.code);
}
function applicationDataFromForm(form, existing = null) {
  if (form.querySelector('[data-photo-label][aria-busy="true"]')) {
    showToast('Wait for the photo preview to finish loading, then try again.', 'error');
    return null;
  }
  const photos = Object.fromEntries([...form.querySelectorAll('[data-photo-label]')].map(input =>
    [input.name, input.closest('.application-photo').querySelector('img').getAttribute('src') || '']
  ));
  const data=new FormData(form);const text=(name)=>String(data.get(name)||'').trim();const amount=(name)=>Number(data.get(name))||0;
  const code=text('hpCode').toUpperCase();const principal=amount('principal');const months=Number(data.get('months'))||24;const interestRate=amount('interestRate');
  const downPayment=amount('downPayment');const initialPayment=amount('initialPayment');const totalPayable=principal+Math.round(principal*interestRate*months/1200);
  const firstDueDate=text('firstDue')||existing?.firstDueDate||existing?.nextDue||'';
  return {
    ...photos,
    code,accountNo:text('accountNo')||code,partyType:text('partyType')||'HP',name:text('name'),phone:text('phone'),father:text('father'),age:amount('age'),dob:text('dob'),occupation:text('occupation'),
    doorNo:text('doorNo'),street:text('street'),village:text('village'),mandal:text('mandal'),district:text('district'),state:text('state'),pinCode:text('pinCode'),stdCode:text('stdCode'),phoneR:text('phoneR'),phoneO:text('phoneO'),
    address:[text('doorNo'),text('street')].filter(Boolean).join(', '),zone:text('zone'),area:text('area'),
    guarantor:text('guarantor'),guarantorPhone:text('guarantorPhone'),guarantorFather:text('guarantorFather'),guarantorAge:amount('guarantorAge'),guarantorOccupation:text('guarantorOccupation'),guarantorDoorNo:text('guarantorDoorNo'),guarantorStreet:text('guarantorStreet'),guarantorVillage:text('guarantorVillage'),guarantorMandal:text('guarantorMandal'),guarantorDistrict:text('guarantorDistrict'),guarantorStdCode:text('guarantorStdCode'),guarantorPhoneR:text('guarantorPhoneR'),guarantorPhoneO:text('guarantorPhoneO'),
    vehicleType:text('vehicleType'),vehicle:text('vehicle'),vehicleModel:text('vehicleModel'),regNo:text('regNo'),engineNo:text('engineNo'),chassisNo:text('chassisNo'),deliveryDate:text('deliveryDate'),purchasePrice:amount('purchasePrice'),
    principal,downPayment,initialPayment,dpDue:Math.max(0,downPayment-initialPayment),docCharges:amount('docCharges'),interestRate,months,emi:months?Math.ceil(totalPayable/months):0,totalPayable,
    financeDate:text('financeDate'),firstDueDate,nextDue:existing?.nextDue||firstDueDate,maturityDate:text('maturityDate'),ledgerCode:text('ledgerCode'),mode:text('mode'),bankName:text('bankName'),chequeNo:text('chequeNo'),status:text('partyStatus')||existing?.status||'Active',
    company:text('company'),verifiedBy:text('verifiedBy'),seizingStatus:text('seizingStatus'),installmentsPending:Math.max(0,months-Math.floor((Number(existing?.paid)||0)/Math.max(1,Math.ceil(totalPayable/months)))),rtoAgent:text('rtoAgent'),cBook:text('cBook'),eNo:text('eNo'),cNo:text('cNo'),assignedBy:text('assignedBy'),consultant:text('consultant'),agentPhone:text('agentPhone'),hpReturn:text('hpReturn'),accountDescription:text('accountDescription'),narration:text('narration'),noticeDescription:text('noticeDescription'),accountCloseDescription:text('accountCloseDescription'),
    created:existing?.created||isoDate(),ptp:text('ptp'),visitDate:text('visitDate'),remarks:text('remarks'),notes:text('notes'),paid:Number(existing?.paid)||0
  };
}
function loadApplicationIntoForm(customer) {
  const form=document.querySelector('#application-form');if(!form||!customer)return;
  const dataNames=['hpCode','name','phone','father','age','dob','occupation','doorNo','street','village','mandal','district','state','pinCode','stdCode','phoneR','phoneO','zone','guarantor','guarantorPhone','guarantorFather','guarantorAge','guarantorOccupation','guarantorDoorNo','guarantorStreet','guarantorVillage','guarantorMandal','guarantorDistrict','guarantorStdCode','guarantorPhoneR','guarantorPhoneO','vehicleType','vehicle','vehicleModel','regNo','engineNo','chassisNo','purchasePrice','deliveryDate','financeDate','firstDue','downPayment','initialPayment','dpDue','docCharges','principal','interestRate','months','ledgerCode','mode','bankName','chequeNo','partyStatus','company','accountNo','area','verifiedBy','seizingStatus','installmentsPending','maturityDate','rtoAgent','cBook','eNo','cNo','assignedBy','consultant','agentPhone','hpReturn','accountDescription','narration','noticeDescription','accountCloseDescription','ptp','visitDate','remarks','notes'];
  const property={hpCode:'code',firstDue:'firstDueDate',principal:'principal',partyStatus:'status'};
  dataNames.forEach((name)=>{const field=form.elements.namedItem(name);if(!field)return;let value=customer[property[name]||name];if(name==='firstDue')value=value||customer.nextDue;if(name==='accountNo')value=value||customer.code;if(name==='company')value=value||'PADMA BHUSHAN AUTO FINANCE';if(name==='zone')value=value||customer.village;if(name==='dpDue')value=customer.dpDue;if(name==='installmentsPending')value=Math.max(0,(Number(customer.months)||0)-Math.floor((Number(customer.paid)||0)/Math.max(1,Number(customer.emi)||1)));if(value==null)return;if(field instanceof RadioNodeList)return;if(field.tagName==='SELECT'&&![...field.options].some((option)=>option.value===String(value)))field.add(new Option(String(value),String(value)));field.value=String(value);});
  form.querySelectorAll('input[name="partyType"]').forEach((radio)=>radio.checked=radio.value===(customer.partyType||'HP'));
  form.querySelectorAll('[data-photo-label]').forEach(input => setApplicationPhoto(input, customer[input.name]));
  form.dataset.editingCode=customer.code;form.dataset.paid=String(customer.paid||0);updateApplicationSummary();
  showToast(`Loaded ${customer.code} · ${customer.name}.`);
}
function findApplication() {
  const form=document.querySelector('#application-form');if(!form)return;
  const code=form.elements.namedItem('hpCode').value.trim().toUpperCase();
  let customer=store.customers.find((record)=>record.code.toUpperCase()===code||String(record.accountNo||'').toUpperCase()===code);
  if(!customer){const query=window.prompt('Enter an HP code, account number, or customer name to find:');if(query)customer=store.customers.find((record)=>record.code.toLowerCase()===query.trim().toLowerCase()||String(record.accountNo||'').toLowerCase()===query.trim().toLowerCase()||record.name.toLowerCase().includes(query.trim().toLowerCase()));}
  if(!customer){showToast('No matching finance account was found.','error');return;}
  loadApplicationIntoForm(customer);
}
function updateApplicationEntry() {
  const form=document.querySelector('#application-form');const oldCode=form?.dataset.editingCode;
  if(!oldCode){showToast('Use Find to load an account before updating it.','error');return;}
  const existing=store.customers.find((record)=>record.code===oldCode);if(!existing){showToast('The loaded account is no longer available.','error');return;}
  const updated=applicationDataFromForm(form,existing);
  if (!updated) return;
  if(updated.principal<=0){showToast('Enter a finance amount to continue.','error');return;}
  if(updated.initialPayment>updated.downPayment){showToast('Initial payment cannot exceed the down payment amount.','error');return;}
  if(store.customers.some((record)=>record!==existing&&record.code.toUpperCase()===updated.code)){showToast(`HP code ${updated.code} is already in use.`,'error');return;}
  const customer = {...existing, ...updated, paid:Number(existing.paid)||0, nextDue:existing.nextDue||updated.firstDueDate, created:existing.created||updated.created, status:(Number(existing.paid)||0)>=updated.totalPayable?'Closed':updated.status};
  const nextStore = {
    ...store,
    customers: store.customers.map(record => record === existing ? customer : record),
    transactions: store.transactions.map(transaction => transaction.code === existing.code ? {...transaction, code:customer.code} : transaction),
  };
  const initialReceipt=nextStore.transactions.find((transaction)=>transaction.code===customer.code&&transaction.narration==='Initial down payment');
  if(initialReceipt){initialReceipt.amount=customer.initialPayment;initialReceipt.date=customer.financeDate||initialReceipt.date;initialReceipt.mode=customer.mode||initialReceipt.mode;}
  else if(customer.initialPayment>0)nextStore.transactions.unshift({id:`RC-${String(nextStore.nextReceipt++).padStart(3,'0')}`,code:customer.code,date:customer.financeDate||isoDate(),amount:customer.initialPayment,mode:customer.mode||'Cash',type:'Collection',narration:'Initial down payment'});
  if (!persist(nextStore)) return;
  showToast(`Finance account ${customer.code} updated.`);navigate('applications', customer.code);
}
function deleteApplicationEntry() {
  const form=document.querySelector('#application-form');const code=form?.dataset.editingCode;
  if(!code){showToast('Use Find to load an account before deleting it.','error');return;}
  const customer=store.customers.find((record)=>record.code===code);if(!customer)return;
  if(!window.confirm(`Delete ${customer.code} · ${customer.name} and its linked transactions?`))return;
  store.customers=store.customers.filter((record)=>record!==customer);store.transactions=store.transactions.filter((transaction)=>transaction.code!==code);persist();showToast(`${code} was deleted.`);navigate('applications');
}
function saveReceipt(form) {
  const data=new FormData(form); const c=store.customers.find((customer)=>customer.code===data.get('code')); const amount=Number(data.get('amount'))||0;
  if(!c||amount<=0){showToast('Select an account and enter an amount paid.','error');return;}
  if(amount>Math.max(0,c.totalPayable-c.paid)){showToast('Amount paid cannot exceed the account balance.','error');return;}
  const transaction={id:`RC-${String(store.nextReceipt++).padStart(3,'0')}`,code:c.code,date:String(data.get('date')),amount,mode:String(data.get('mode')),type:'Collection',narration:String(data.get('narration')||'Installment collection').trim(),bank:String(data.get('bank')||''),reference:String(data.get('reference')||''),book:String(data.get('book')||''),lateDays:Number(data.get('lateDays'))||0};
  store.transactions.unshift(transaction);c.paid+=amount;if(c.paid>=c.totalPayable)c.status='Closed';if(c.nextDue&&c.nextDue<=transaction.date){const due=new Date(`${c.nextDue}T00:00:00`);due.setMonth(due.getMonth()+1);c.nextDue=isoDate(due);}persist();showToast(`Receipt ${transaction.id} saved for ${c.name}.`);navigate('receipts');
}
function clearReceiptEntry() {
  const form=document.querySelector('#receipt-form');if(!form)return;
  form.reset();form.dataset.editingId='';
  document.querySelector('#receiptNo').value=`RC-${String(store.nextReceipt).padStart(3,'0')}`;
  updateReceiptSummary();
}
function loadLatestReceipt() {
  const form=document.querySelector('#receipt-form');const code=document.querySelector('#receiptAccount')?.value;
  if(!form||!code)return;
  const receipt=store.transactions.find((t)=>t.code===code&&t.type==='Collection'&&t.narration!=='Initial down payment');
  if(!receipt){showToast('No installment receipts found for this customer.','error');return;}
  form.dataset.editingId=receipt.id;
  form.elements.namedItem('date').value=receipt.date||isoDate();form.elements.namedItem('code').value=receipt.code;form.elements.namedItem('amount').value=receipt.amount;
  form.elements.namedItem('mode').value=receipt.mode||'Cash';form.elements.namedItem('bank').value=receipt.bank||'';form.elements.namedItem('reference').value=receipt.reference||'';form.elements.namedItem('book').value=receipt.book||'';form.elements.namedItem('narration').value=receipt.narration||'';
  document.querySelector('#receiptNo').value=receipt.id;updateReceiptSummary();showToast(`Loaded receipt ${receipt.id} for update.`);
}
function updateReceiptEntry() {
  const form=document.querySelector('#receipt-form');const receiptId=form?.dataset.editingId;
  if(!form||!receiptId){showToast('Choose List to load a saved receipt before updating.','error');return;}
  const receipt=store.transactions.find((t)=>t.id===receiptId&&t.type==='Collection');const data=new FormData(form);const customer=store.customers.find((c)=>c.code===data.get('code'));const amount=Number(data.get('amount'))||0;
  if(!receipt||!customer||amount<=0){showToast('Select a customer and enter an amount paid.','error');return;}
  const oldCustomer=store.customers.find((c)=>c.code===receipt.code);const oldAmount=Number(receipt.amount)||0;
  const available=Math.max(0,customer.totalPayable-customer.paid+(customer===oldCustomer?oldAmount:0));
  if(amount>available){showToast('Amount paid cannot exceed the account balance.','error');return;}
  if(oldCustomer){oldCustomer.paid=Math.max(0,oldCustomer.paid-oldAmount);if(oldCustomer.status==='Closed'&&oldCustomer.paid<oldCustomer.totalPayable)oldCustomer.status='Active';}
  receipt.code=customer.code;receipt.date=String(data.get('date'));receipt.amount=amount;receipt.mode=String(data.get('mode'));receipt.bank=String(data.get('bank')||'');receipt.reference=String(data.get('reference')||'');receipt.book=String(data.get('book')||'');receipt.narration=String(data.get('narration')||'Installment collection').trim();receipt.lateDays=Number(data.get('lateDays'))||0;
  customer.paid+=amount;customer.status=customer.paid>=customer.totalPayable?'Closed':'Active';persist();showToast(`Receipt ${receipt.id} updated.`);navigate('receipts');
}
function returnCheque() {
  const code=document.querySelector('#receiptAccount')?.value;const customer=store.customers.find((c)=>c.code===code);
  const receipt=store.transactions.find((t)=>t.code===code&&t.type==='Collection'&&t.mode==='Cheque'&&!t.returned&&t.narration!=='Initial down payment');
  if(!customer||!receipt){showToast('No unreturned cheque receipt was found for this account.','error');return;}
  receipt.returned=true;customer.paid=Math.max(0,customer.paid-Number(receipt.amount));if(customer.status==='Closed')customer.status='Active';
  store.transactions.unshift({id:`CR-${String(store.nextReceipt++).padStart(3,'0')}`,code,date:isoDate(),amount:-Number(receipt.amount),mode:'Cheque',type:'Cheque Return',narration:`Cheque returned · ${receipt.id}`});
  persist();updateReceiptSummary();showToast(`Cheque receipt ${receipt.id} returned and balance adjusted.`,'error');
}
function closeAccount(form) {
  const data=new FormData(form); const c=store.customers.find((customer)=>customer.code===data.get('code')); if(!c)return;
  const loanBalance=Math.max(0,c.totalPayable-c.paid);const dpBalance=Math.max(0,Number(c.dpDue)||0);const balance=loanBalance+dpBalance;const finalAmount=Number(data.get('finalAmount'))||0;
  if(c.status==='Closed'){showToast('This account is already closed.','error');return;}
  if(finalAmount+0.009<balance){showToast(`Final settlement must cover the outstanding ${money(balance)} balance.`, 'error');return;}
  if(finalAmount>balance+0.009){showToast(`Final amount cannot exceed the outstanding ${money(balance)} balance.`, 'error');return;}
  if(finalAmount>0){const receiptId=`RC-${String(store.nextReceipt++).padStart(3,'0')}`;store.transactions.unshift({id:receiptId,code:c.code,date:String(data.get('date')||isoDate()),amount:finalAmount,mode:String(data.get('mode')||'Cash'),bank:String(data.get('bank')||''),reference:String(data.get('reference')||''),book:String(data.get('book')||''),type:'Collection',narration:String(data.get('narration')||'Final account settlement').trim()||'Final account settlement',accountClosing:true});const dpSettlement=Math.min(finalAmount,dpBalance);c.dpDue=Math.max(0,dpBalance-dpSettlement);c.paid+=Math.max(0,finalAmount-dpSettlement);}
  c.status='Closed';c.closedDate=String(data.get('date')||isoDate());persist();showToast(`${c.code} has been settled and closed.`);navigate('applications');
}
function renderDueList() {
  const options=getDueFilterOptions();const table=document.querySelector('#due-table');if(!table)return;
  const accounts=dueAccounts(options);table.innerHTML=dueRows(options);
  document.querySelector('#due-count').textContent = `${table.querySelectorAll('tr[data-record]').length} accounts`;
  const names={all:'Accounts due',dp:'DP due list','not-paid':'Not paid accounts','abstract':'Due list abstract','time-over':'Time over accounts',seizing:'Seizing accounts','monthly-collection':'Monthly collection accounts',addresswise:'Addresswise due list','advance-payment':'Advance payment accounts',mandalam:'Due list by mandalam'};
  document.querySelector('#due-title').textContent=names[options.mode]||names.all;
  document.querySelector('#due-notice').textContent=`${accounts.length} account${accounts.length===1?'':'s'} match the selected filters. Report date: ${shortDate(options.onDate)}.`;
  const reportDate=document.querySelector('#due-print-date');
  const reportSummary=document.querySelector('#due-print-summary');
  const printTable=document.querySelector('#due-print-table');
  if(reportDate)reportDate.textContent=shortDate(options.onDate);
  if(reportSummary)reportSummary.textContent=`${names[options.mode]||names.all} · ${accounts.length} account${accounts.length===1?'':'s'} · Page ${options.pageNo || '1'}`;
  if(printTable){
    const matrix=dueReportMatrix(options);
    printTable.innerHTML=matrix.slice(1).map((row)=>`<tr>${row.map((value)=>{
      const text=String(value??'');
      const printValue=/^\d{4}-\d{2}-\d{2}$/.test(text)?`${text.slice(8,10)}-${text.slice(5,7)}-${text.slice(0,4)}`:text;
      return `<td>${esc(printValue)}</td>`;
    }).join('')}</tr>`).join('');
  }
}
function printDueReport() {
  if(currentPage==='due')renderDueList();
  document.body.classList.add('printing-due-report');
  window.print();
}
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-due-report'));
function getDueFilterOptions() {
  const value=(id)=>document.querySelector(`#${id}`)?.value;
  return {
    mode:dueViewMode,filter:value('due-status')||'all',branch:value('due-branch')||'All branches',onDate:value('due-date')||isoDate(),
    accountFrom:value('due-from-account')||'',accountTo:value('due-to-account')||'',sort:value('due-sort')||'HP code',
    installments:value('due-installments')||'All',mainZone:value('due-main-zone')||'All',subZone:value('due-sub-zone')||'All',
    printTimeOver:value('due-time-over')||'No',vehicle:value('due-wheels')||'All',minDue:value('due-min-amount')||0,
    village:value('due-village')||'All villages',includeSeized:value('include-seized')!=='no',seizingOnly:!!document.querySelector('#seizing-only')?.checked,
    monthlyCollection:!!document.querySelector('#monthly-collection')?.checked,addresswise:!!document.querySelector('#addresswise')?.checked,
    advancePayment:!!document.querySelector('#advance-payment')?.checked,pageNo:value('due-page-no')||'1'
  };
}
function renderMonthly(type='all') {
  const from=document.querySelector('#monthly-from')?.value||'0000-01-01';const to=document.querySelector('#monthly-to')?.value||isoDate();
  const branch=document.querySelector('#monthly-branch')?.value||'all';const transactions=monthlyRecords(from,to,type,branch).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.id||'').localeCompare(b.id||''));
  const totalCollections=transactions.filter((transaction)=>transaction.type==='Collection').reduce((sum,transaction)=>sum+Number(transaction.amount),0);const financeRows=monthlyRecords(from,to,'Finance',branch);const totalFinance=financeRows.reduce((sum,transaction)=>sum+Number(transaction.amount),0);const newAccounts=financeRows.length;
  const metrics=document.querySelector('#monthly-metrics');if(metrics)metrics.innerHTML=`<div class="metric-tile"><small>Collections this period</small><strong>${money(totalCollections)}</strong><span>${transactions.filter((transaction)=>transaction.type==='Collection').length} receipts</span></div><div class="metric-tile"><small>New accounts</small><strong>${newAccounts}</strong><span>Finance opened</span></div><div class="metric-tile"><small>Finance disbursed</small><strong>${money(totalFinance)}</strong><span>${financeRows.length} accounts</span></div>`;
  const period=document.querySelector('#monthly-period');if(period)period.textContent=`${shortDate(from)} — ${shortDate(to)} · ${branch==='all'?'All branches':branch}`;
  const table=document.querySelector('#monthly-transactions');if(table)table.innerHTML=transactionsTable(transactions);
}
function monthlyRecords(from,to,type='all',branch='all') {
  const financeRows=store.customers.filter((customer)=>{const date=customer.financeDate||customer.created||'';return date>=from&&date<=to&&(branch==='all'||(customer.zone||customer.village)===branch);}).map((customer)=>({id:`FIN-${customer.code}`,code:customer.code,date:customer.financeDate||customer.created,amount:customer.principal,mode:'Finance',type:'Finance',narration:'Finance disbursed'}));
  if(type==='Finance')return financeRows;
  const entries=store.transactions.filter((transaction)=>{const customer=store.customers.find((account)=>account.code===transaction.code);return transaction.date>=from&&transaction.date<=to&&(type==='all'||transaction.type===type)&&(branch==='all'||(customer?.zone||customer?.village)===branch);});
  return type==='all'?[...entries,...financeRows]:entries;
}
function exportMonthly() {
  const from=document.querySelector('#monthly-from')?.value||'0000-01-01';const to=document.querySelector('#monthly-to')?.value||isoDate();const branch=document.querySelector('#monthly-branch')?.value||'all';const type=document.querySelector('#monthly-type')?.value||'all';
  const rows=monthlyRecords(from,to,type,branch);
  exportCsv('profit-plus-monthly-transactions.csv',[['Reference','Date','HP code','Customer','Transaction type','Mode','Bank','Transaction no.','Amount','Narration'],...rows.map((transaction)=>[transaction.id,transaction.date,transaction.code,store.customers.find((customer)=>customer.code===transaction.code)?.name||'',transaction.type,transaction.mode,transaction.bank,transaction.reference,transaction.amount,transaction.narration])]);
}

document.addEventListener('click',(event)=>{
  const viewToggle=event.target.closest('#view-mode-toggle');if(viewToggle){setViewMode(document.body.classList.contains('popup-interface-mode')?'sidebar':'popup');return;}
  const pageControl = event.target.closest('[data-page]');
  if (pageControl) {
    const link = pageControl.matches('a');
    if (link && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    navigate(pageControl.dataset.page);
    if (link) document.querySelector('.main-area').focus({ preventScroll: true });
    return;
  }
  const actionButton=event.target.closest('[data-action]'); if(!actionButton)return;
  const [action,arg]=actionButton.dataset.action.split(':');
  if(action==='navigate')navigate(arg);
  else if(action==='clear-receipt')clearReceiptEntry();
  else if(action==='list-receipts')loadLatestReceipt();
  else if(action==='update-receipt')updateReceiptEntry();
  else if(action==='cancel-receipt'){clearReceiptEntry();showToast('Receipt entry cancelled.');}
  else if(action==='cheque-return')returnCheque();
  else if(action==='find-voucher')findVoucherEntry();
  else if(action==='update-voucher'){const form=document.querySelector('#voucher-form');if(form)saveVoucherEntry(form,true);}
  else if(action==='delete-voucher')deleteVoucherEntry();
  else if(action==='cancel-voucher'){cancelVoucherEntry();showToast('Entry cleared.');}
  else if(action==='load-voucher')loadVoucherEntry(actionButton.dataset.id);
  else if(action==='list-vouchers'){const search=document.querySelector('#voucher-list [data-filter-table]');if(search){search.value='';search.focus({preventScroll:true});}document.querySelectorAll('#voucher-list tr[data-record]').forEach((row)=>row.hidden=false);}
  else if(action==='export-vouchers')exportVouchers();
  else if(action==='search-hp-details')renderHpDetails();
  else if(action==='display-all-hp-details'){['hp-detail-query'].forEach((id)=>{const input=document.querySelector(`#${id}`);if(input)input.value='';});['hp-detail-type','hp-detail-search-by','hp-detail-source'].forEach((id)=>{const input=document.querySelector(`#${id}`);if(input)input.value=id==='hp-detail-search-by'?'code':'all';});renderHpDetails();}
  else if(action==='view-hp-detail')showHpDetail(actionButton.dataset.code);
  else if(action==='od-previous-date'){const input=document.querySelector('#od-date');if(input){const date=new Date(`${input.value||isoDate()}T12:00:00`);date.setDate(date.getDate()-1);input.value=isoDate(date);}renderODCalculation();}
  else if(action==='od-new-account')navigate('new-application');
  else if(action==='od-add-all'){const from=document.querySelector('#od-from-account');const to=document.querySelector('#od-to-account');if(from)from.value='';if(to)to.value='';renderODCalculation();}
  else if(action==='od-generate')renderODCalculation('od');
  else if(action==='od-calculate')renderODCalculation(actionButton.dataset.mode||'od');
  else if(action==='load-master')loadMasterRecord(actionButton.dataset.kind,actionButton.dataset.id);
  else if(action==='update-master'){const form=document.querySelector('#master-form');if(form)saveMasterRecord(form,true);}
  else if(action==='delete-master')deleteMasterRecord();
  else if(action==='cancel-master'){cancelMasterRecord();showToast('Setup entry cleared.');}
  else if(action==='save-seizure')saveVehicleSeizure(false);
  else if(action==='release-vehicle')saveVehicleSeizure(true);
  else if(action==='hp-select')renderHpRegister(hpBalanceMode);
  else if(action==='hp-balance')renderHpRegister(actionButton.dataset.mode||'today');
  else if(action==='print')window.print();
  else if(action==='print-calculation'){renderCalculation();document.body.classList.add('printing-calculation-report');window.print();}
  else if(action==='print-due')printDueReport();
  else if(action==='find-application')findApplication();
  else if(action==='update-application')updateApplicationEntry();
  else if(action==='application-section')showApplicationSection(actionButton.closest('form'), Number(actionButton.dataset.index));
  else if(action==='remove-application-photo')setApplicationPhoto(actionButton.closest('.application-photo').querySelector('input'));
  else if(action==='delete-application')deleteApplicationEntry();
  else if(action==='filter-applications')renderApplicationList();
  else if(action==='display-all-applications'){['application-search','application-from','application-to'].forEach((id)=>{const field=document.querySelector(`#${id}`);if(field)field.value='';});['application-branch','application-vehicle','application-status'].forEach((id)=>{const field=document.querySelector(`#${id}`);if(field)field.value='all';});renderApplicationList();}
  else if(action==='calculation-generate')renderCalculation();
  else if(action==='open-calculation'){selectedCalculationCode=actionButton.dataset.code||'';navigate('calculation');}
  else if(action==='edit-application'){const customer=store.customers.find((record)=>record.code===actionButton.dataset.code);if(customer){navigate('new-application');loadApplicationIntoForm(customer);}}
  else if(action==='export-applications')exportApplications();
  else if(action==='export-application')exportApplication(actionButton.dataset.code);
  else if(action==='export-due')exportDue();
  else if(action==='open-ledger')navigate('ledger', actionButton.dataset.code);
  else if(action==='toggle-vehicle'){const c=store.customers.find((x)=>x.code===arg);if(c){c.status=c.status==='Seized'?'Active':'Seized';persist();render();showToast(`${c.code} status updated to ${c.status}.`);}}
  else if(action==='filter-due'){dueViewMode='all';renderDueList();showToast('Due list generated from the selected filters.');}
  else if(action==='generate-demand'){dueViewMode='all';renderDueList();showToast('HP demand and collection report generated from the selected filters.');}
  else if(action==='due-view'){dueViewMode=actionButton.dataset.view||'all';renderDueList();if(dueViewMode==='abstract')setTimeout(printDueReport,100);}
  else if(action==='clear-village'){const village=document.querySelector('#due-village');if(village)village.value='All villages';renderDueList();}
  else if(action==='ledger-view')renderLedgerView(actionButton.dataset.view||ledgerViewMode);
  else if(action==='show-ledger')renderLedgerView('ledger');
  else if(action==='filter-monthly')renderMonthly(document.querySelector('#monthly-type').value);
  else if(action==='export-monthly')exportMonthly();
  else if(action==='month-tab'){const type=actionButton.dataset.type;const select=document.querySelector('#monthly-type');if(select)select.value=type;document.querySelectorAll('.section-tabs button').forEach((b)=>b.classList.toggle('active',b===actionButton));renderMonthly(type);}
  else if(action==='reset-application'){setTimeout(updateApplicationCode,0);}
});
document.addEventListener('input',(event)=>{
  if(event.target.closest('#application-form'))updateApplicationSummary();
  if(event.target.matches('#hpCode')){const form=document.querySelector('#application-form');const account=form?.elements.namedItem('accountNo');if(form&&account&&(!form.dataset.editingCode||account.value===form.dataset.editingCode))account.value=event.target.value;}
  if(event.target.matches('#receiptAmount,#receiptDate'))updateReceiptSummary();
  if(event.target.matches('[data-filter-table]'))updateTableFilter(event.target);
  if(event.target.matches('#hp-detail-query'))renderHpDetails();
});
document.addEventListener('change',(event)=>{
  if(event.target.matches('[data-photo-label]'))readApplicationPhoto(event.target);
  if(event.target.matches('input[name="partyType"]'))updateApplicationCode();
  if(event.target.matches('[data-app-filter]'))renderApplicationList();
  if(event.target.matches('#receiptAccount')){const form=document.querySelector('#receipt-form');if(form)form.dataset.editingId='';document.querySelector('#receiptNo').value=`RC-${String(store.nextReceipt).padStart(3,'0')}`;updateReceiptSummary();}
  if(event.target.matches('#ledger-account')){const name=document.querySelector('#ledger-name');if(name)name.value=event.target.value;}
  if(event.target.matches('#ledger-name')){const account=document.querySelector('#ledger-account');if(account)account.value=event.target.value;}
  if(event.target.matches('#close-account-select'))updateCloseSummary();
  if(event.target.matches('#hp-detail-type,#hp-detail-search-by,#hp-detail-source'))renderHpDetails();
  if(event.target.matches('#seizing-account')){selectedSeizingCode=event.target.value;render();}
  if(event.target.matches('#od-old-account,#od-date,#od-rate,#od-from-account,#od-to-account'))renderODCalculation();
  if(event.target.matches('#monthly-type,#monthly-branch'))renderMonthly(document.querySelector('#monthly-type')?.value||'all');
  if(event.target.matches('[data-daybook-date]')){selectedDaybookDate=event.target.value||isoDate();render();}
  if(event.target.matches('[data-refresh]'))renderDueList();
});
document.addEventListener('reset',(event)=>{
  if(event.target.matches('#receipt-form'))setTimeout(()=>{event.target.dataset.editingId='';document.querySelector('#receiptNo').value=`RC-${String(store.nextReceipt).padStart(3,'0')}`;updateReceiptSummary();},0);
  if(event.target.matches('#application-form'))setTimeout(()=>{
    const form = event.target;
    form.dataset.editingCode='';form.dataset.paid='0';
    form.querySelectorAll('[data-photo-label]').forEach(input => setApplicationPhoto(input));
    showApplicationSection(form, 0);
    updateApplicationCode();updateApplicationSummary();
  },0);
});
document.addEventListener('invalid', event => {
  const form = event.target.closest('#application-form');
  if (!form || event.target !== form.querySelector(':invalid')) return;
  const section = event.target.closest('.form-section');
  if (section) showApplicationSection(form, [...form.querySelectorAll('.form-panel > .form-section')].indexOf(section));
}, true);
document.addEventListener('submit',(event)=>{
  const form=event.target.closest('form[data-form]');if(!form)return;event.preventDefault();
  if(form.dataset.form==='application')saveApplication(form);
  if(form.dataset.form==='receipt')saveReceipt(form);
  if(form.dataset.form==='close-account')closeAccount(form);
  if(form.dataset.form==='voucher')saveVoucherEntry(form);
  if(form.dataset.form==='master-data')saveMasterRecord(form);
});

window.addEventListener('afterprint',()=>document.body.classList.remove('printing-calculation-report'));
buildPopupNavigation();
let savedViewMode='sidebar';try{if(localStorage.getItem(VIEW_MODE_KEY)==='popup')savedViewMode='popup';}catch{}
setViewMode(savedViewMode);
const pageFit = new ResizeObserver(fitPageContent);
pageFit.observe(document.querySelector('#popup-page-frame'));
pageFit.observe(document.querySelector('#page-content'));
const pageContentChanges = new MutationObserver(fitPageContent);
pageContentChanges.observe(document.querySelector('#page-content'), {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
render();updateClock();setInterval(updateClock,30000);
