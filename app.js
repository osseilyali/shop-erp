// Shop ERP: stock, purchases & imports, sales & customer credit, expenses, reports.
// Data lives in the shop's own Firebase project (Cloud Firestore) and keeps working offline.
'use strict';
import * as F from './vendor/firebase.js';
import { firebaseConfig, ownerEmails } from './config.js';
const OWNERS = (Array.isArray(ownerEmails) ? ownerEmails : [ownerEmails]).map(e => String(e || '').trim().toLowerCase()).filter(Boolean);
const ownerLetter = e => 'ABC'[OWNERS.indexOf(e)] || 'A';

/* ================= constants ================= */
const METHODS = ['Cash','Orange Money','MTN MoMo','Bank transfer','Cheque','Other'];
const EXP_CATS = ['Rent','Salaries','Transport & fuel','Electricity & generator','Phone & internet','Taxes & fees','Repairs & maintenance','Meals','Other'];
const UNITS = ['piece','box','carton','set','pair','meter','roll','bar','kg','liter','lot'];
const CURRENCIES = ['GNF','USD','EUR','CNY','AED'];
const IMPORT_EXTRAS = ['Sea freight','Customs duties','Transit agent','Port & handling','Transport to shop'];
const MARKET_EXTRAS = ['Transport','Loading & porters'];
const ADJ_REASONS = ['Opening stock','Stock count correction','Damaged or lost','Own use','Other increase','Other decrease'];
const DEFAULT_CATS = ['Appliances','Plumbing'];
const ROUTES = ['home','sell','sales','stock','purchases','customers','suppliers','expenses','reports','money','shop','team'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const APP_VERSION = '2026-11-26 · 18';
const COLS = ['config','members','products','customers','suppliers','purchases','adjustments','sales','payments','expenses','accounts','transfers','equity','cashcounts','rates','debts','supdebts'];
const ACC_TYPES = {cash:'Cash', safe:'Safe', mobile:'Mobile money', bank:'Bank'};
// Older records only say how they were paid; this maps them to the matching account.
const METHOD_ACC = {'Cash':'cash', 'Orange Money':'orange', 'MTN MoMo':'mtn', 'Bank transfer':'bank', 'Cheque':'bank'};
const DEFAULT_ACCOUNTS = [
  {id:'cash', name:'Cash box', type:'cash', currency:'GNF'},
  {id:'orange', name:'Orange Money', type:'mobile', currency:'GNF'},
  {id:'mtn', name:'MTN MoMo', type:'mobile', currency:'GNF'},
  {id:'bank', name:'Bank account', type:'bank', currency:'GNF'},
  {id:'safe', name:'Home safe', type:'safe', currency:'GNF'},
  {id:'usd', name:'US dollars', type:'cash', currency:'USD'}
];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ICONS = {
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  cart:'<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/>',
  receipt:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  truck:'<path d="M2 6h12v10H2z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
  wallet:'<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="13.5" r="1.3"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 15v3M11 10v8M15 12v6M19 6v12"/>',
  sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  bank:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>',
  dollar:'<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  team:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M19 8h3M20.5 6.5v3"/>',
  dots:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload:'<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  printer:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  adjust:'<path d="M12 3v18M3 12h18"/><path d="M8 7l4-4 4 4M8 17l4 4 4-4"/>',
  logout:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  clip:'<path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
  file:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;

/* ================= helpers ================= */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const r3 = x => Math.round(x * 1000) / 1000;
function todayStr(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function parseNum(v){
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/[\s  ']/g, '').replace(/gnf$/i,'');
  if (!s) return NaN;
  const commas = (s.match(/,/g) || []).length, dots = (s.match(/\./g) || []).length;
  if (commas && dots){
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (commas === 1 && /,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}
const num = v => { const n = parseNum(v); return isNaN(n) ? 0 : n; };
const nf0 = new Intl.NumberFormat('en-US', {maximumFractionDigits:0});
const nf2 = new Intl.NumberFormat('en-US', {maximumFractionDigits:2});
const money = n => nf0.format(Math.round(n || 0));
const qtyFmt = n => nf2.format(r3(n || 0));
function trimDec(s){ return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }
function short(n){
  const a = Math.abs(n || 0), sg = n < 0 ? '−' : '';
  if (a >= 1e9) return sg + trimDec((a/1e9).toFixed(a >= 1e11 ? 0 : 2)) + 'B';
  if (a >= 1e6) return sg + trimDec((a/1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)) + 'M';
  if (a >= 1e4) return sg + trimDec((a/1e3).toFixed(0)) + 'K';
  return sg + nf0.format(a);
}
const pct = x => (isFinite(x) ? Math.round(x * 1000) / 10 : 0) + '%';
function fdate(s){ if (!s) return ''; const [y,m,d] = s.split('-'); return `${+d} ${MON[+m-1]} ${y}`; }
function fdateShort(s){ if (!s) return ''; const [,m,d] = s.split('-'); return `${+d} ${MON[+m-1]}`; }
function mlabel(k){ const [y,m] = k.split('-'); return `${MON[+m-1]} ${y}`; }
function addMonths(k, n){ let [y,m] = k.split('-').map(Number); m += n; while (m < 1){ m += 12; y--; } while (m > 12){ m -= 12; y++; } return `${y}-${String(m).padStart(2,'0')}`; }
function timeOf(iso){ try { const d = new Date(iso); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); } catch { return ''; } }
function setPath(obj, path, val){ const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++){ o = o[ks[i]]; if (o == null) return; } o[ks[ks.length-1]] = val; }
const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
const opts = (list, cur) => list.map(v => opt(v, v, v === cur)).join('');
const isPlainObj = v => v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function deepMerge(a, b){ const o = {...(a || {})}; for (const [k, v] of Object.entries(b || {})){ if (v === undefined) continue; o[k] = (isPlainObj(v) && isPlainObj(o[k])) ? deepMerge(o[k], v) : v; } return o; }
const nowIso = () => new Date().toISOString();

/* ================= state ================= */
const RAW = Object.fromEntries(COLS.map(c => [c, new Map()]));
const LIVE = {};
const S = {
  auth:'loading', user:null, email:'', isOwner:false, fs:null, authObj:null,
  cacheLoaded:false, slow:false, online:navigator.onLine, unsynced:false, listenErr:'', installEvt:null, updateReady:false,
  settings:{}, members:{}, products:{}, customers:{}, suppliers:{}, purchases:{}, adjustments:{}, sales:{}, payments:{}, expenses:{}, accounts:{}, transfers:{}, equity:{}, cashcounts:{}, rates:{}, debts:{}, supdebts:{}
};
const freshCart = () => ({items:[], customerId:'', walkin:'', discount:'', paid:'', paidTouched:false, method:'Cash', accountId:'', date:todayStr(), note:'', q:''});
const UI = {
  view:'home', busy:false,
  cart: freshCart(), cartFiles: [], attaching: 0,
  stockQ:'', stockCat:'', stockLow:false, stockHidden:false,
  salesQ:'', salesMonth: todayStr().slice(0,7),
  purchQ:'', purchStatus:'',
  custQ:'', supQ:'',
  expMonth: todayStr().slice(0,7), exp:{date:todayStr(), category:'Rent', amount:'', method:'Cash', accountId:'', note:''}, accSetup:null, rateQuick:'', rateCheck:null, confirmExp:'',
  repPeriod:'m:' + todayStr().slice(0,7),
  shop:null,
  team:{email:'', name:'', code:''},
  gate:{mode:'signin', email:'', password:'', err:'', note:'', busy:false},
  importInfo:''
};
try { const d = JSON.parse(localStorage.getItem('erp-cart') || 'null'); if (d && Array.isArray(d.items)) UI.cart = Object.assign(freshCart(), d, {date: todayStr(), q:''}); } catch {}
function saveDraft(){ try { localStorage.setItem('erp-cart', JSON.stringify(UI.cart)); } catch {} }

function syncState(){
  for (const c of COLS){
    if (c === 'config') continue;
    const o = {};
    for (const [id, v] of RAW[c]) if (v && !v.deleted) o[id] = v;
    S[c] = o;
  }
  S.settings = RAW.config.get('settings') || {};
}

/* ================= derived data ================= */
let D = null;
function purchaseCalc(p){
  const rate = (p.currency && p.currency !== 'GNF') ? num(p.rate) : 1;
  const lines = (p.lines || []).map(l => { const qty = num(l.qty), price = num(l.price); return {...l, qty, price, goods: qty * price * rate}; });
  const goods = sum(lines, l => l.goods);
  const extras = sum(p.extras || [], x => num(x.amount));
  lines.forEach(l => { l.extra = goods > 0 ? extras * l.goods / goods : (lines.length ? extras / lines.length : 0); l.landed = l.goods + l.extra; l.unit = l.qty > 0 ? l.landed / l.qty : 0; });
  const paid = sum(Object.values(p.payments || {}).filter(x => x && !x.void), x => num(x.amount));
  const unpaidExtras = sum((p.extras || []).filter(x => !x.accountId), x => num(x.amount));
  return {rate, lines, goods, extras, landed: goods + extras, paid, balance: goods - paid, unpaidExtras};
}
function derive(){
  const sales = [], expenses = [], payments = [];
  for (const [id, s] of Object.entries(S.sales)){
    if (!s || !Array.isArray(s.items) || !s.date) continue;
    const items = s.items.map(i => ({productId:i.productId, name:i.name, brand:i.brand, sku:i.sku, qty:+i.qty || 0, price:+i.price || 0, cost:+i.cost || 0, special: !!i.special, costAcc: i.costAcc || ''}));
    const subtotal = sum(items, i => i.qty * i.price), discount = +s.discount || 0, total = subtotal - discount;
    const paid = +s.paid || 0;
    sales.push({...s, id, series: (s.series || 'A'), items, subtotal, discount, total, cogs: sum(items, i => i.qty * i.cost), paid, balance: total - paid, void: !!s.void});
  }
  for (const [id, e] of Object.entries(S.expenses)) if (e && e.amount != null && e.date) expenses.push({...e, id, amount: +e.amount || 0, void: !!e.void});
  for (const [id, p] of Object.entries(S.payments)) if (p && p.amount != null && p.date) payments.push({...p, id, amount: +p.amount || 0, void: !!p.void});
  const desc = (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  sales.sort((a, b) => desc(a, b) || String(b.at || '').localeCompare(String(a.at || '')) || (b.no || 0) - (a.no || 0));
  expenses.sort((a, b) => desc(a, b) || String(b.at || '').localeCompare(String(a.at || '')));
  payments.sort((a, b) => desc(a, b) || String(b.at || '').localeCompare(String(a.at || '')));

  const prod = {};
  const P = id => prod[id] || (prod[id] = {stock:0, costQty:0, costSum:0, transit:0, moves:0, sold:0});
  Object.keys(S.products).forEach(P);
  const pc = {};
  for (const [id, p] of Object.entries(S.purchases)){
    const c = purchaseCalc(p); pc[id] = c;
    for (const l of c.lines){
      if (!l.productId) continue;
      const x = P(l.productId); x.moves++;
      if (p.status === 'received'){ x.stock += l.qty; x.costQty += l.qty; x.costSum += l.landed; } else x.transit += l.qty;
    }
  }
  for (const a of Object.values(S.adjustments)){
    if (!a.productId) continue;
    const x = P(a.productId), q = +a.qty || 0;
    x.stock += q; x.moves++;
    if (q > 0 && +a.unitCost > 0){ x.costQty += q; x.costSum += q * (+a.unitCost); }
  }
  const maxNoBy = {};
  for (const s of sales){
    maxNoBy[s.series] = Math.max(maxNoBy[s.series] || 0, +s.no || 0);
    if (s.void) continue;
    for (const i of s.items){ if (!i.productId) continue; const x = P(i.productId); if (!i.special) x.stock -= i.qty; x.sold += i.qty; x.moves++; }
  }
  let stockValue = 0;
  for (const [id, x] of Object.entries(prod)){
    x.stock = r3(x.stock);
    x.avg = x.costQty > 0 ? x.costSum / x.costQty : (+(S.products[id] && S.products[id].cost) || 0);
    if (x.stock > 0 && S.products[id] && !S.products[id].special) stockValue += x.stock * x.avg;
  }
  let transitValue = 0, transitCount = 0;
  for (const [id, p] of Object.entries(S.purchases)) if (p.status !== 'received'){ transitValue += pc[id].landed; transitCount++; }
  const custBal = {};
  const debts = Object.entries(S.debts).filter(([, d]) => d && !d.void && d.customerId && +d.amount > 0).map(([id, d]) => ({...d, id, amount: +d.amount, balance: +d.amount, date: d.date || '', isDebt: true}));
  for (const d of debts) custBal[d.customerId] = (custBal[d.customerId] || 0) + d.amount;
  for (const s of sales){ if (s.void || !s.customerId) continue; custBal[s.customerId] = (custBal[s.customerId] || 0) + s.balance; }
  for (const p of payments){ if (p.void || !p.customerId) continue; custBal[p.customerId] = (custBal[p.customerId] || 0) - p.amount; }
  // later payments settle the oldest unpaid invoices first
  const invRemain = {}, pools = {};
  for (const p of payments) if (!p.void && p.customerId) pools[p.customerId] = (pools[p.customerId] || 0) + p.amount;
  const asc = [...debts, ...sales.filter(s => !s.void && s.balance > 0.5)].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.at || '').localeCompare(String(b.at || '')));
  for (const s of asc){
    if (!s.customerId){ invRemain[s.id] = s.balance; continue; }
    const pool = pools[s.customerId] || 0, take = Math.min(pool, s.balance);
    pools[s.customerId] = pool - take; invRemain[s.id] = s.balance - take;
  }
  const supBal = {};
  for (const [id, p] of Object.entries(S.purchases)){ if (!p.supplierId) continue; supBal[p.supplierId] = (supBal[p.supplierId] || 0) + pc[id].balance; }
  // old supplier debts from before the app; paid like purchases
  const supDebts = Object.entries(S.supdebts).filter(([, d]) => d && !d.void && d.supplierId && +d.amount > 0).map(([id, d]) => { const paid = sum(Object.values(d.payments || {}).filter(x => x && !x.void), x => num(x.amount)); return {...d, id, amount: +d.amount, paid, balance: +d.amount - paid, date: d.date || ''}; });
  for (const d of supDebts) supBal[d.supplierId] = (supBal[d.supplierId] || 0) + d.balance;
  // money accounts: opening balance + every movement dated on or after the account's start date
  const acc = {}, extraCosts = [];
  for (const [id, a] of Object.entries(S.accounts)) acc[id] = {bal: +a.opening || 0, from: a.openingDate || '', cur: a.currency || 'GNF', rows: [], lastCount: null};
  const accOf = r => { if (r.accountId && acc[r.accountId]) return r.accountId; const m = METHOD_ACC[r.method]; return m && acc[m] ? m : ''; };
  const mv = (id, date, amt, kind, what, sub, act, at) => { const x = acc[id]; if (!x || !amt || !date || (x.from && date < x.from)) return; x.bal += amt; x.rows.push({date, amt, kind, what, sub, act, at: at || ''}); };
  const nm = id => (S.accounts[id] || {}).name || '?';
  for (const s of sales) if (!s.void && s.paid) mv(accOf(s), s.date, s.paid, 'sale', `Sale ${invNoS(s)}`, custName(s), `data-act="openSale" data-id="${s.id}"`, s.at);
  for (const s of sales) if (!s.void) for (const i of s.items) if (i.special && i.costAcc && acc[i.costAcc] && acc[i.costAcc].cur !== 'USD' && i.qty * i.cost > 0)
    mv(i.costAcc, s.date, -(i.qty * i.cost), 'sup', 'Special order bought', `${i.name} · ${invNoS(s)}`, `data-act="openSale" data-id="${s.id}"`, s.at);
  for (const p of payments) if (!p.void) mv(accOf(p), p.date, p.amount, 'sale', 'Customer payment', (S.customers[p.customerId] || {}).name || '', p.customerId ? `data-act="openCustomer" data-id="${p.customerId}"` : '', p.at);
  for (const e of expenses) if (!e.void) mv(accOf(e), e.date, -e.amount, 'exp', e.category, e.note || '', '', e.at);
  for (const [id, p] of Object.entries(S.purchases)) for (const pay of Object.values(p.payments || {})){
    if (!pay || pay.void) continue; const a = accOf(pay);
    mv(a, pay.date || p.date, -((acc[a] && acc[a].cur === 'USD') ? (+pay.fxAmount || 0) : (+pay.amount || 0)), 'sup', 'Supplier payment', (S.suppliers[p.supplierId] || {}).name || p.ref || '', `data-act="openPurchase" data-id="${id}"`, pay.at);
  }
  for (const d of supDebts) for (const pay of Object.values(d.payments || {})){
    if (!pay || pay.void) continue; const a = accOf(pay);
    mv(a, pay.date || d.date, -((acc[a] && acc[a].cur === 'USD') ? (+pay.fxAmount || 0) : (+pay.amount || 0)), 'sup', 'Old debt payment', (S.suppliers[d.supplierId] || {}).name || '', `data-act="openSupplier" data-id="${d.supplierId}"`, pay.at);
  }
  for (const [id, p] of Object.entries(S.purchases)) (p.extras || []).forEach((x, i) => {
    if (!x || !x.accountId || !acc[x.accountId] || acc[x.accountId].cur === 'USD' || !(+x.amount > 0)) return;
    mv(x.accountId, x.paidDate || p.date, -(+x.amount), 'sup', x.label || 'Purchase cost', p.ref || (S.suppliers[p.supplierId] || {}).name || (p.kind === 'import' ? 'Import' : 'Purchase'), `data-act="openPurchase" data-id="${id}"`, (p.createdAt || '') + i);
  });
  for (const [id, t] of Object.entries(S.transfers)){
    if (t.void) continue; const fee = +t.fee || 0, fcur = (acc[t.from] || {}).cur;
    mv(t.from, t.date, -((+t.amount || 0) + fee), 'tr', `Transfer to ${nm(t.to)}`, fee ? `includes ${fmtAcc(fee, fcur)} fee` : (t.note || ''), `data-act="openTransfer" data-id="${id}"`, t.at);
    mv(t.to, t.date, +t.toAmount || 0, 'tr', `Transfer from ${nm(t.from)}`, t.note || '', `data-act="openTransfer" data-id="${id}"`, t.at);
    if (fee && acc[t.from] && !(acc[t.from].from && t.date < acc[t.from].from)) extraCosts.push({id: 'fee-' + id, date: t.date, category: 'Bank & mobile money fees', amount: fcur === 'USD' ? fee * (+t.rate || 0) : fee, method: nm(t.from), note: 'Transfer fee', auto: true});
  }
  for (const [id, q] of Object.entries(S.equity)){
    if (q.void) continue;
    mv(q.accountId, q.date, q.kind === 'out' ? -(+q.amount || 0) : (+q.amount || 0), 'own', q.kind === 'out' ? 'Owner took money out' : 'Owner put money in', q.note || '', `data-act="openEquity" data-id="${id}"`, q.at);
  }
  for (const [id, k] of Object.entries(S.cashcounts)){
    const x = acc[k.accountId]; if (!x) continue;
    if (!x.lastCount || String(k.at || k.date) > String(x.lastCount.at || x.lastCount.date)) x.lastCount = k;
    const diff = +k.diff || 0;
    mv(k.accountId, k.date, diff, 'count', 'Cash count difference', `counted ${fmtAcc(+k.counted || 0, x.cur)}`, '', k.at);
    if (diff && x.cur !== 'USD' && !(x.from && k.date < x.from)) extraCosts.push({id: 'cc-' + id, date: k.date, category: 'Cash count difference', amount: -diff, method: nm(k.accountId), note: diff < 0 ? 'Cash short at the count' : 'Cash over at the count', auto: true});
  }
  // dollar rate: set by hand, one entry per day; the newest day wins
  const rateHist = Object.entries(S.rates).map(([id, r]) => ({id, date: r.date || id, rate: +r.rate || 0, by: r.by, at: r.at})).filter(r => r.rate > 0).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : String(b.at || '').localeCompare(String(a.at || '')));
  D = {debts, supDebts, sales, expenses, payments, prod, pc, maxNoBy, stockValue, transitValue, transitCount, custBal, supBal, invRemain, acc, extraCosts, rateHist, rate: rateHist[0] || null};
}
derive();

function periodStats(pred){
  const ss = D.sales.filter(s => !s.void && pred(s.date));
  const revenue = sum(ss, s => s.total), cogs = sum(ss, s => s.cogs), gross = revenue - cogs;
  const ex = [...D.expenses, ...D.extraCosts].filter(e => !e.void && pred(e.date)), expenses = sum(ex, e => e.amount);
  const pays = D.payments.filter(p => !p.void && pred(p.date));
  return {ss, ex, pays, count: ss.length, revenue, cogs, gross, expenses, net: gross - expenses, margin: revenue > 0 ? gross / revenue : 0, cashIn: sum(ss, s => s.paid) + sum(pays, p => p.amount)};
}
// Shop details printed on invoices. Empty settings fall back to the shop's paper invoice book.
const SHOP_DEFAULTS = {shopName: 'OSSEILY GROUP', tagline: 'Tout pour le bâtiment · Électroménager · Plomberie', address: 'Madina Boussoura, Route du Niger, en face du Centre Alpha Amadou', phone: '(+224) 624 00 27 38 / 628 20 00 00', email: 'osseilyali@gmail.com', city: 'Conakry', footer: 'Les marchandises vendues ne sont ni reprises, ni échangées'};
function shopInfo(){ const o = {}; for (const k of Object.keys(SHOP_DEFAULTS)){ const v = S.settings[k]; o[k] = v != null && String(v).trim() !== '' ? String(v) : SHOP_DEFAULTS[k]; } return o; }
const shopName = () => (shopInfo().shopName || '').trim() || 'Your shop';
const initials = () => { const w = shopName().split(/\s+/).filter(Boolean); return ((w[0] || 'S')[0] + ((w[1] || '')[0] || '')).toUpperCase(); };
const mySeries = () => ((S.members[S.email] || {}).code || (OWNERS.includes(S.email) ? ownerLetter(S.email) : 'A')).toUpperCase();
function usedCodes(except){
  const used = new Set(Object.entries(S.members).filter(([e, x]) => e !== except && x.active !== false).map(([, x]) => (x.code || '').toUpperCase()));
  OWNERS.forEach(e => { if (e !== except && !S.members[e]) used.add(ownerLetter(e)); });
  return used;
}
const invNo = (no, series) => `${series || 'A'}-${String(no || 0).padStart(6, '0')}`;
const invNoS = s => invNo(s.no, s.series);
const nextNo = () => Math.max((D.maxNoBy[mySeries()] || 0) + 1, parseInt(S.settings.invoiceStart, 10) || 1);
const custName = s => s.customerId ? ((S.customers[s.customerId] || {}).name || 'Removed customer') : (s.walkin || 'Walk-in customer');
const prodName = id => (S.products[id] || {}).name || 'Removed product';
const prodLabel = (id, p) => { p = p || S.products[id]; return p ? [p.name, p.brand, p.sku].filter(Boolean).join(' · ') : ''; };
function staffName(e){
  if (!e) return 'Unknown';
  if (e === 'imported') return 'Claude version';
  const m = S.members[e]; const n = (m && m.name) || String(e).split('@')[0];
  return e === S.email ? `${n} (you)` : n;
}
function findProdByLabel(label){
  const t = String(label || '').trim().toLowerCase(); if (!t) return '';
  for (const [id, p] of Object.entries(S.products)) if (prodLabel(id, p).toLowerCase() === t) return id;
  const byName = Object.entries(S.products).filter(([, p]) => (p.name || '').toLowerCase() === t);
  return byName.length === 1 ? byName[0][0] : '';
}
function itemDetail(i){ const p = S.products[i.productId] || {}; return [i.brand != null ? i.brand : p.brand, i.sku != null ? i.sku : p.sku].filter(Boolean).join(' · '); }
/* ----- dollar rate ----- */
const curRate = () => (D.rate ? D.rate.rate : 0);
const rateIsToday = () => !!D.rate && D.rate.date === todayStr();
const rateNote = () => !D.rate ? 'No dollar rate entered yet' : rateIsToday() ? `Today’s rate: ${money(D.rate.rate)} GNF` : `Last rate ${money(D.rate.rate)} GNF is from ${fdate(D.rate.date)}. Update it if it changed`;
/* ----- money accounts ----- */
const accList = filter => Object.entries(S.accounts).filter(([, a]) => a.active !== false && (!filter || filter(a))).sort((a, b) => ((a[1].order ?? 99) - (b[1].order ?? 99)) || String(a[1].name).localeCompare(String(b[1].name)));
const hasAccounts = () => accList().length > 0;
const accName = id => (S.accounts[id] || {}).name || 'No account';
const accCur = id => (S.accounts[id] || {}).currency || 'GNF';
const isUSD = id => accCur(id) === 'USD';
const fmtAcc = (v, cur) => cur === 'USD' ? (v < 0 ? '−$' : '$') + nf2.format(Math.abs(Math.round((v || 0) * 100) / 100)) : money(v) + ' GNF';
const forStaff = a => S.isOwner || a.type !== 'safe';
function saleAccId(s){ if (s.accountId && S.accounts[s.accountId]) return s.accountId; const m = METHOD_ACC[s.method]; return m && S.accounts[m] ? m : ''; }
function defaultAcc(){ const l = accList(a => a.currency !== 'USD' && forStaff(a)); const c = l.find(([id]) => id === 'cash'); return (c || l[0] || [''])[0]; }
function accSelect(id, bind, cur, o = {}){
  const list = accList(a => (o.usd || a.currency !== 'USD') && (o.only ? o.only(a) : forStaff(a)));
  return `<select id="${id}" class="inp" data-bind="${bind}"${o.rr ? ' data-rr' : ''}>${list.map(([k, a]) => opt(k, a.name + (a.currency === 'USD' ? ' (USD)' : ''), k === cur)).join('')}</select>`;
}
// "Paid into / from" for GNF money: an account once accounts exist, otherwise the old payment method list.
function payField(id, label, bindAcc, bindMethod, st){
  if (hasAccounts()){
    if (!st.accountId || !S.accounts[st.accountId] || isUSD(st.accountId) || S.accounts[st.accountId].active === false) st.accountId = defaultAcc();
    return `<div class="field"><label for="${id}">${label}</label>${accSelect(id, bindAcc, st.accountId)}</div>`;
  }
  return `<div class="field"><label for="${id}">Paid by</label><select id="${id}" class="inp" data-bind="${bindMethod}">${opts(METHODS, st.method)}</select></div>`;
}
function payData(st){
  if (!hasAccounts()) return {method: st.method};
  const a = st.accountId && S.accounts[st.accountId] && !isUSD(st.accountId) ? st.accountId : defaultAcc();
  return {accountId: a, method: accName(a)};
}
// Supplier payments may also come out of the dollar account.
function supplierPayFields(px, pay, p){
  if (hasAccounts() && (!pay.accountId || !S.accounts[pay.accountId])) pay.accountId = defaultAcc();
  const usd = hasAccounts() && isUSD(pay.accountId);
  if (usd && !pay.rate && !pay.ratePrefilled){ pay.rate = p && p.currency === 'USD' && num(p.rate) ? String(p.rate) : (curRate() ? String(curRate()) : ''); pay.ratePrefilled = true; }
  return `${hasAccounts() ? `<div class="field"><label for="${px}-acc">Paid from</label>${accSelect(px + '-acc', 'pay.accountId', pay.accountId, {usd: true, rr: true})}</div>` : `<div class="field"><label for="${px}-m">Paid by</label><select id="${px}-m" class="inp" data-bind="pay.method">${opts(METHODS, pay.method)}</select></div>`}
    <div class="field"><label for="${px}-a">Amount (${usd ? 'USD' : 'GNF'})</label><input id="${px}-a" class="inp n" inputmode="decimal" value="${esc(pay.amount)}" data-bind="pay.amount"${usd ? ' data-rr' : ''} placeholder="0"></div>
    ${usd ? `<div class="field"><label for="${px}-r">Rate: GNF for 1 USD</label><input id="${px}-r" class="inp n" inputmode="decimal" value="${esc(pay.rate || '')}" data-bind="pay.rate" data-rr placeholder="e.g. 8650"><span class="hint">${num(pay.amount) && num(pay.rate) ? `Takes ${money(num(pay.amount) * num(pay.rate))} GNF off what you owe` : 'Used to take the payment off what you owe in GNF'}</span></div>` : ''}`;
}
function supplierPayData(pay){
  const a = num(pay.amount); if (!(a > 0)) return {err: 'Enter the amount paid.'};
  if (hasAccounts() && isUSD(pay.accountId)){
    const r = num(pay.rate); if (!(r > 0)) return {err: 'Enter the exchange rate for the dollars paid.'};
    return {data: {amount: Math.round(a * r), fxAmount: a, rate: r, accountId: pay.accountId, method: accName(pay.accountId)}};
  }
  return {data: {amount: a, ...payData(pay)}};
}
const qtyU = (q, unit) => `${qtyFmt(q)} ${esc(unit && unit !== 'piece' ? unit : 'pcs')}`;
function allCats(){ const s = new Set(DEFAULT_CATS); Object.values(S.products).forEach(p => { if (p.category) s.add(p.category); }); return [...s]; }
function isLow(id){ const p = S.products[id], x = D.prod[id]; if (!p || !x || p.active === false || p.special) return false; const min = +p.min || 0; return min > 0 ? x.stock <= min : (x.moves > 0 && x.stock <= 0); }
const sortedBy = (obj, key = 'name') => Object.entries(obj).sort((a, b) => String(a[1][key] || '').localeCompare(String(b[1][key] || '')));
const loading = () => !S.cacheLoaded;
function emptyBox(title, text, action = ''){
  if (loading()) return `<div class="empty"><span>Loading your data…</span></div>`;
  return `<div class="empty"><strong>${esc(title)}</strong><span>${esc(text)}</span>${action}</div>`;
}

/* ================= database writes ================= */
function errText(e){
  const c = e && e.code;
  if (c === 'permission-denied') return 'This change was refused. Ask the owner to check your access in Team.';
  if (c === 'resource-exhausted') return 'The free daily limit on Firebase was reached, so this change wasn’t saved. Try again tomorrow.';
  if (c === 'unauthenticated') return 'You were signed out. Sign in again to save changes.';
  if (c === 'invalid-argument') return 'This record couldn’t be saved because it’s too large or badly formed.';
  return 'Couldn’t save this change. Check the connection and try again.';
}
function localApply(col, id, data, merge){ const cur = RAW[col].get(id); RAW[col].set(id, merge ? deepMerge(cur, data) : {...data}); }
async function revert(col, id){
  try { const s = await F.getDocFromCache(F.doc(S.fs, col, id)); if (s.exists()) RAW[col].set(id, s.data({serverTimestamps:'estimate'})); else RAW[col].delete(id); }
  catch { RAW[col].delete(id); }
  schedule();
}
// ops: [{col, id, data, merge}] — written together; shown at once, uploaded when online.
async function write(ops, okMsg){
  if (!S.fs){ toast('Not connected to the database. Reload the page.'); return false; }
  try {
    for (let i = 0; i < ops.length; i += 400){
      const chunk = ops.slice(i, i + 400);
      const b = F.writeBatch(S.fs);
      for (const o of chunk){
        const merge = o.merge !== false;
        b.set(F.doc(S.fs, o.col, o.id), {...o.data, updatedAt: F.serverTimestamp()}, {merge});
        localApply(o.col, o.id, {...o.data, updatedAt: null}, merge);
      }
      b.commit().catch(e => { toast(errText(e)); chunk.forEach(o => revert(o.col, o.id)); });
    }
  } catch (e){ console.error(e); toast(errText(e)); return false; }
  trackPending(); schedule();
  if (okMsg) toast(S.online ? okMsg : `${okMsg}. Saved on this device; it uploads when the internet is back.`);
  return true;
}
/* ================= attached documents =================
   Photos and PDFs attached to a sale. Firebase Storage needs a paid plan, so each file is kept in
   Firestore itself: photos are shrunk on the phone first, then the file is cut into parts under the
   1 MB document limit ('files' collection, ids `${fileId}-${n}`). The sale lists its files in a map
   (sale.files[fileId] = {name, type, size, parts, at, by}). Files are fetched only when opened, so
   they never slow down syncing or use phone data until someone looks at them. */
const FILE_PART = 700000;              // base64 characters per Firestore document
const FILE_MAX_PDF = 4 * 1024 * 1024;  // 4 MB: 8 parts, one upload of about 5.6 MB
const FILE_CACHE = new Map();          // fileId -> Blob, for files made or opened on this device
const fileSize = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const liveFiles = rec => Object.entries((rec && rec.files) || {}).filter(([, f]) => f && !f.removed).sort((a, b) => String(a[1].at || '').localeCompare(String(b[1].at || '')));
const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function b64ToBlob(b64, type){ const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type}); }
async function loadImage(file){
  if (window.createImageBitmap){ try { return await createImageBitmap(file, {imageOrientation: 'from-image'}); } catch {} }
  return await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; });
}
// Turn a picked file into {name, type, size, blob}: photos become a JPEG of at most 1600 px.
async function prepFile(file){
  const type = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : '');
  if (type.startsWith('image/')){
    let img; try { img = await loadImage(file); } catch { throw new Error(`“${file.name}” couldn’t be read as a photo.`); }
    const w0 = img.width, h0 = img.height, k = Math.min(1, 1600 / Math.max(w0, h0));
    const cv = document.createElement('canvas'); cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.72));
    if (!blob) throw new Error(`“${file.name}” couldn’t be prepared.`);
    return {name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', size: blob.size, blob};
  }
  if (type === 'application/pdf'){
    if (file.size > FILE_MAX_PDF) throw new Error(`“${file.name}” is ${fileSize(file.size)}. PDFs can be up to 4 MB; take a photo of the pages instead.`);
    return {name: file.name, type, size: file.size, blob: file};
  }
  throw new Error(`“${file.name}” isn’t a photo or a PDF.`);
}
// Save prepared files under a sale. Works offline: the parts upload when the internet is back.
async function attachFiles(saleId, files){
  if (!S.fs || !files.length) return false;
  const add = {};
  try {
    for (const f of files){
      const fid = uid(), b64 = await blobToB64(f.blob), n = Math.max(1, Math.ceil(b64.length / FILE_PART)), at = nowIso();
      const b = F.writeBatch(S.fs);
      for (let i = 0; i < n; i++) b.set(F.doc(S.fs, 'files', `${fid}-${i}`), {saleId, i, n, data: b64.slice(i * FILE_PART, (i + 1) * FILE_PART), by: S.email, at, updatedAt: F.serverTimestamp()});
      b.commit().catch(e => toast(`“${f.name}”: ${errText(e)}`));
      FILE_CACHE.set(fid, f.blob);
      add[fid] = {name: f.name, type: f.type, size: f.size, parts: n, at, by: S.email};
    }
  } catch (e){ console.error(e); toast('Couldn’t read one of the files. Try again.'); return false; }
  const k = Object.keys(add).length;
  const ok = await write([{col:'sales', id: saleId, data: {files: add}}]);
  // A read from the device's copy queues behind the writes, so once it answers the files are safely stored on this device.
  try { await F.getDocFromCache(F.doc(S.fs, 'sales', saleId)); } catch {}
  if (ok) toast(`${k === 1 ? 'Document saved' : `${k} documents saved`}${S.online ? '' : '. It uploads when the internet is back'}.`);
  return ok;
}
async function fetchFile(fid, meta){
  if (FILE_CACHE.has(fid)) return FILE_CACHE.get(fid);
  const snaps = await Promise.all(Array.from({length: meta.parts || 1}, (_, i) => F.getDoc(F.doc(S.fs, 'files', `${fid}-${i}`))));
  if (snaps.some(d => !d.exists() || !d.data().data)) throw new Error('missing');
  const blob = b64ToBlob(snaps.map(d => d.data().data).join(''), meta.type || 'application/octet-stream');
  FILE_CACHE.set(fid, blob); return blob;
}
function removeFile(saleId, fid, meta){
  const b = F.writeBatch(S.fs);
  for (let i = 0; i < (meta.parts || 1); i++) b.set(F.doc(S.fs, 'files', `${fid}-${i}`), {data: '', removed: true, updatedAt: F.serverTimestamp()}, {merge: true});
  b.commit().catch(() => {});
  FILE_CACHE.delete(fid);
  return write([{col:'sales', id: saleId, data: {files: {[fid]: {removed: true, removedAt: nowIso(), removedBy: S.email}}}}], 'Document removed');
}
const canRemoveFile = f => S.isOwner || f.by === S.email;
function fileChips(files, act){
  return files.map(([fid, f]) => `<button type="button" class="doc" data-act="${act}" data-fid="${fid}" title="${esc(f.name)}">${ic(f.type === 'application/pdf' ? 'file' : 'image')}<span class="doc-n">${esc(f.name)}</span><span class="doc-s">${fileSize(f.size || 0)}</span></button>`).join('');
}
// Picker shown in the cart (files wait in memory until the sale is recorded) and on an invoice.
const fileInput = (id, target) => `<label class="btn sm" for="${id}">${ic('clip')}Attach photo or PDF</label><input id="${id}" type="file" accept="image/*,application/pdf" multiple hidden data-file="${target}">`;
function fileViewer(saleId, fid){
  const st = {url: '', err: '', confirm: false};
  const meta = () => (((S.sales[saleId] || {}).files) || {})[fid];
  const m = openModal({
    state: st, mid: true, live: true,
    title: () => (meta() || {}).name || 'Document',
    body: () => { const f = meta(); if (!f || f.removed) return '<p class="sub">This document was removed.</p>';
      if (st.err) return `<p class="errline">${esc(st.err)}</p>`;
      if (!st.url) return '<p class="sub">Opening…</p>';
      return `${f.type.startsWith('image/') ? `<img class="doc-img" src="${st.url}" alt="${esc(f.name)}">` : `<div class="empty"><strong>PDF document</strong><span>${esc(f.name)} · ${fileSize(f.size || 0)}</span></div>`}
        <p class="sub">Added ${f.at ? fdate(f.at.slice(0, 10)) : ''}${f.by ? ` by ${esc(staffName(f.by))}` : ''}</p>`; },
    foot: () => { const f = meta(); if (!f || f.removed) return '<span class="spacer"></span><button type="button" class="btn primary" data-close>Close</button>';
      if (st.confirm) return confirmBar('Remove this document from the sale?', 'delYes', 'Remove');
      return `${canRemoveFile(f) ? '<button type="button" class="btn ghost danger" data-act="delAsk">Remove</button>' : ''}<span class="spacer"></span>${st.url ? `<a class="btn" href="${st.url}" download="${esc(f.name)}">${ic('download')}Download</a><a class="btn primary" href="${st.url}" target="_blank" rel="noopener">Open</a>` : '<button type="button" class="btn primary" data-close>Close</button>'}`; },
    acts: {
      delAsk: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
      delYes: async () => { const f = meta(); if (f && await removeFile(saleId, fid, f)) m.close(); }
    },
    onClose: () => { if (st.url) setTimeout(() => URL.revokeObjectURL(st.url), 60000); }
  });
  const f = meta();
  if (f) fetchFile(fid, f).then(b => { st.url = URL.createObjectURL(b); m.render(); })
    .catch(() => { st.err = S.online ? 'This document couldn’t be opened. It may still be uploading from the phone that added it.' : 'You’re offline and this document isn’t on this device yet. Open it again when the internet is back.'; m.render(); });
}
async function onFilePick(el, m){
  const picked = [...(el.files || [])]; el.value = ''; if (!picked.length) return;
  const t = el.dataset.file;
  UI.attaching += picked.length; schedule();
  try {
    const ready = [];
    for (const f of picked){ try { ready.push(await prepFile(f)); } catch (e){ toast(e.message); } }
    if (!ready.length) return;
    if (t === 'cart') UI.cartFiles.push(...ready);
    else if (t.startsWith('sale:')) await attachFiles(t.slice(5), ready);
  } finally { UI.attaching = Math.max(0, UI.attaching - picked.length); schedule(); }
}
const savingFiles = () => UI.attaching ? `<span class="sub saving">Saving ${UI.attaching === 1 ? 'document' : UI.attaching + ' documents'}…</span>` : '';

let pendSeq = 0;
function trackPending(){
  if (!S.fs) return;
  const my = ++pendSeq; S.unsynced = true; schedule();
  F.waitForPendingWrites(S.fs).then(() => { if (my === pendSeq){ S.unsynced = false; schedule(); } }).catch(() => {});
}

/* ================= sync from Firestore ================= */
let syncStarted = false;
const tsMs = v => v && typeof v.toMillis === 'function' ? v.toMillis() : 0;
async function startSync(){
  if (syncStarted) return; syncStarted = true;
  // 1. Show what this device already has, instantly and at no cost.
  await Promise.all(COLS.map(async c => {
    try { const snap = await F.getDocsFromCache(F.collection(S.fs, c)); snap.forEach(d => RAW[c].set(d.id, d.data({serverTimestamps:'estimate'}))); } catch {}
  }));
  S.cacheLoaded = true; schedule();
  // 2. Then ask the server only for what changed since (keeps us inside the free daily quota).
  for (const c of COLS) listen(c);
  trackPending();
  setTimeout(() => { S.slow = true; schedule(); }, 10000);
}
function listen(c){
  let m = 0; for (const v of RAW[c].values()) m = Math.max(m, tsMs(v && v.updatedAt));
  const cutoff = F.Timestamp.fromMillis(m ? Math.max(0, m - 15 * 60 * 1000) : 0);
  F.onSnapshot(F.query(F.collection(S.fs, c), F.where('updatedAt', '>=', cutoff)), {includeMetadataChanges: true}, snap => {
    for (const ch of snap.docChanges()){
      if (ch.type === 'removed'){
        // A doc with an edit still waiting to upload drops out of this query locally; keep this device's copy.
        F.getDocFromCache(ch.doc.ref).then(d => { if (d.exists()) RAW[c].set(d.id, d.data({serverTimestamps:'estimate'})); else RAW[c].delete(ch.doc.id); schedule(); }).catch(() => {});
      } else RAW[c].set(ch.doc.id, ch.doc.data({serverTimestamps:'estimate'}));
    }
    LIVE[c] = !snap.metadata.fromCache;
    schedule();
  }, err => {
    console.error(c, err);
    if (err && err.code === 'permission-denied') S.auth = S.isOwner ? 'rules' : 'denied';
    else S.listenErr = (err && err.code) || 'error';
    schedule();
  });
}
let ownerBooted = false;
function afterSync(){
  if (S.auth !== 'ready' || !S.isOwner || ownerBooted || !LIVE.members) return;
  ownerBooted = true;
  if (!RAW.members.get(S.email)) write([{col:'members', id:S.email, data:{email:S.email, name:'', code: ownerLetter(S.email), role:'owner', active:true, addedAt: nowIso()}}]);
}

/* ================= toast ================= */
let toastT = 0;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3600); }

/* ================= sign-in screens ================= */
function authErr(e){
  const c = e && e.code;
  const m = {
    'auth/invalid-credential':'Wrong email or password.', 'auth/wrong-password':'Wrong email or password.', 'auth/user-not-found':'No account with this email. Choose “Create account”.',
    'auth/email-already-in-use':'An account with this email already exists. Choose “Sign in”.', 'auth/weak-password':'Use a password of at least 6 characters.',
    'auth/invalid-email':'That email address isn’t valid.', 'auth/too-many-requests':'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed':'No internet connection. Signing in needs the internet once; after that the app works offline.',
    'auth/popup-blocked':'The browser blocked the Google window. Allow pop-ups for this site and try again.', 'auth/popup-closed-by-user':'The Google window was closed before signing in.',
    'auth/cancelled-popup-request':'The Google window was closed before signing in.',
    'auth/unauthorized-domain':'This web address isn’t allowed yet. In Firebase, open Authentication → Settings → Authorized domains and add it.',
    'auth/operation-not-allowed':'This sign-in method is turned off. In Firebase, open Authentication → Sign-in method and enable it.'
  };
  return m[c] || 'Couldn’t sign in. Try again.';
}
const gateBrand = () => `<div class="brand"><span class="brand-mark">${esc(S.settings.shopName ? initials() : 'ERP')}</span><span><span class="brand-name">${esc(S.settings.shopName || 'Shop ERP')}</span><br><span class="brand-sub">Appliances · Plumbing</span></span></div>`;
function renderGate(){
  const g = UI.gate, el = $('#gate');
  let h = '';
  if (S.auth === 'setup'){
    h = `${gateBrand()}<h1>Connect the database</h1><p>This copy of the app doesn’t have its Firebase settings yet.</p>
      <ol><li>Open <code>config.js</code>.</li><li>Paste the <code>firebaseConfig</code> from Firebase console → Project settings → Your apps.</li><li>Put the owners’ emails in <code>ownerEmails</code>, then publish again.</li></ol>`;
  } else if (S.auth === 'loading'){
    h = `${gateBrand()}<p>Loading…</p>`;
  } else if (S.auth === 'signedOut'){
    const up = g.mode === 'signup';
    h = `${gateBrand()}<h1>${up ? 'Create your account' : 'Sign in'}</h1>
      <button type="button" class="btn big gbtn" data-act="google"${g.busy ? ' disabled' : ''}>Continue with Google</button>
      <div class="or">or use email</div>
      <form class="stack" id="gate-form" novalidate>
        <div class="field"><label for="g-email">Email</label><input id="g-email" class="inp" type="email" autocomplete="email" value="${esc(g.email)}" data-bind="gate.email"></div>
        <div class="field"><label for="g-pass">Password</label><input id="g-pass" class="inp" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" value="${esc(g.password)}" data-bind="gate.password">${up ? '<span class="hint">At least 6 characters</span>' : ''}</div>
        ${g.err ? `<p class="errline">${esc(g.err)}</p>` : ''}${g.note ? `<p class="sub">${esc(g.note)}</p>` : ''}
        <button type="submit" class="btn primary big"${g.busy ? ' disabled' : ''}>${g.busy ? 'Please wait…' : up ? 'Create account' : 'Sign in'}</button>
      </form>
      <div class="inline" style="justify-content:space-between">${up ? `<button type="button" class="linkbtn" data-act="gateMode" data-v="signin">I already have an account</button>` : `<button type="button" class="linkbtn" data-act="gateMode" data-v="signup">Create account</button><button type="button" class="linkbtn" data-act="resetPw">Forgot password?</button>`}</div>
      <p class="hint">Only people the owner has added to the team can open the shop’s records.</p>`;
  } else if (S.auth === 'unverified'){
    h = `${gateBrand()}<h1>Confirm your email</h1><p>We sent a link to <b>${esc(S.email)}</b>. Open it, then come back and tap Continue. Check the spam folder if you don’t see it.</p>
      ${g.err ? `<p class="errline">${esc(g.err)}</p>` : ''}${g.note ? `<p class="sub">${esc(g.note)}</p>` : ''}
      <button type="button" class="btn primary big" data-act="verified">Continue</button>
      <div class="inline" style="justify-content:space-between"><button type="button" class="linkbtn" data-act="resendVerify">Send the link again</button><button type="button" class="linkbtn" data-act="signOut">Use another account</button></div>`;
  } else if (S.auth === 'denied'){
    h = `${gateBrand()}<h1>Not on the team yet</h1><p><b>${esc(S.email)}</b> doesn’t have access to this shop. Ask the owner to add this email in <b>Team</b>, then tap Try again.</p>
      <button type="button" class="btn primary big" data-act="reload">Try again</button>
      <button type="button" class="linkbtn" data-act="signOut">Sign in with another account</button>`;
  } else if (S.auth === 'rules'){
    h = `${gateBrand()}<h1>Publish the security rules</h1><p>You’re signed in as the owner, but the database refused access. That usually means the rules aren’t published yet.</p>
      <ol><li>In Firebase, open <b>Firestore Database → Rules</b>.</li><li>Paste the contents of <code>firestore.rules</code>, with <code>${esc(OWNERS.join(', '))}</code> as the owner email${OWNERS.length > 1 ? 's' : ''}.</li><li>Tap <b>Publish</b>, then Try again.</li></ol>
      <button type="button" class="btn primary big" data-act="reload">Try again</button>
      <button type="button" class="linkbtn" data-act="signOut">Sign out</button>`;
  }
  withFocus(el, () => { el.innerHTML = `<div class="gate-card">${h}</div>`; });
}
async function googleSignIn(){
  UI.gate.err = ''; UI.gate.busy = true; renderGate();
  try { await F.signInWithPopup(S.authObj, new F.GoogleAuthProvider()); }
  catch (e){ UI.gate.err = authErr(e); }
  UI.gate.busy = false; renderGate();
}
async function emailSubmit(){
  const g = UI.gate; g.err = ''; g.note = '';
  const email = g.email.trim();
  if (!email || !g.password){ g.err = 'Enter your email and password.'; renderGate(); return; }
  g.busy = true; renderGate();
  try {
    if (g.mode === 'signup'){
      const cred = await F.createUserWithEmailAndPassword(S.authObj, email, g.password);
      try { await F.sendEmailVerification(cred.user); } catch {}
    } else await F.signInWithEmailAndPassword(S.authObj, email, g.password);
    g.password = '';
  } catch (e){ g.err = authErr(e); }
  g.busy = false; renderGate();
}

/* ================= render shell ================= */
const NAV = () => [
  {group:'Daily', items:[['home','Dashboard','home'], ['sell','New sale','cart'], ['sales','Sales & invoices','receipt'], ['expenses','Expenses','wallet']]},
  {group:'Goods', items:[['stock','Stock','box'], ['purchases','Purchases & imports','truck'], ['suppliers','Suppliers','store']]},
  {group:'Money', items:[['customers','Customers & credit','users'], ...(S.isOwner ? [['money','Money accounts','bank']] : []), ['reports','Reports','chart']]}
];
function syncInfo(){
  if (!S.online) return ['warn', S.unsynced ? 'Offline · changes saved on this device' : 'Offline · working from this device'];
  if (S.listenErr) return ['bad', 'Connection problem. Reload the page'];
  if (S.unsynced) return ['warn', 'Uploading changes…'];
  if (COLS.every(c => LIVE[c])) return ['live', 'Online · all changes saved'];
  return S.slow ? ['warn', 'Can’t reach the server yet'] : ['', 'Connecting…'];
}
function renderRail(){
  const low = Object.keys(S.products).filter(isLow).length;
  const [cls, txt] = syncInfo();
  $('#rail').innerHTML = `
    <a class="brand" href="#home"><span class="brand-mark">${esc(initials())}</span><span><span class="brand-name">${esc(shopName())}</span><br><span class="brand-sub">Appliances · Plumbing</span></span></a>
    ${NAV().map(g => `<div class="navgroup"><div class="navlabel">${g.group}</div>${g.items.map(([r, l, i]) => `<a class="navlink" href="#${r}"${UI.view === r ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${r === 'stock' && low ? `<span class="badge" title="Low stock">${low}</span>` : ''}</a>`).join('')}</div>`).join('')}
    <div class="rail-foot">
      ${S.isOwner ? `<a class="navlink" href="#team"${UI.view === 'team' ? ' aria-current="page"' : ''}>${ic('team')}<span>Team</span></a>` : ''}
      <a class="navlink" href="#shop"${UI.view === 'shop' ? ' aria-current="page"' : ''}>${ic('sliders')}<span>Shop settings</span></a>
      <button type="button" class="navlink" data-act="openRates">${ic('dollar')}<span>${D.rate ? `1 USD = ${money(D.rate.rate)} GNF` : 'Dollar rate not set'}</span>${D.rate && !rateIsToday() ? '<span class="badge">old</span>' : ''}</button>
      <div class="sync"><span class="dot ${cls}"></span><span>${txt}</span></div>
      <div class="who">${esc(S.email)} · invoices ${esc(mySeries())}</div>
    </div>`;
}
function renderTabbar(){
  const more = ['sales','customers','suppliers','expenses','reports','money','shop','team'].includes(UI.view);
  const t = (r, l, i, cls = '') => `<a class="tab ${cls}" href="#${r}"${UI.view === r ? ' aria-current="page"' : ''}><span class="ti">${ic(i)}</span>${l}</a>`;
  $('#tabbar').innerHTML = t('home','Home','home') + t('stock','Stock','box') + t('sell','Sell','cart','sell') + t('purchases','Buy','truck') +
    `<button class="tab" type="button" data-act="more"${more ? ' aria-current="page"' : ''}><span class="ti">${ic('dots')}</span>More</button>`;
}
let RESTORING = false;
function withFocus(container, fn){
  const a = document.activeElement; let id = null, s = null, e = null;
  if (a && a.id && container.contains(a)){ id = a.id; try { s = a.selectionStart; e = a.selectionEnd; } catch {} }
  fn();
  if (id){ const n = document.getElementById(id); if (n && n !== document.activeElement){ RESTORING = true; try { n.focus({preventScroll:true}); if (s != null) n.setSelectionRange(s, e); } catch {} RESTORING = false; } }
}
function banners(){
  let h = '';
  if (S.isOwner && S.cacheLoaded && LIVE.rates !== undefined && !rateIsToday()) h += `<div class="banner"><div style="flex:1;min-width:200px"><b>Enter today’s dollar rate</b><span class="sub">${D.rate ? `Last rate: ${money(D.rate.rate)} GNF for 1 USD, on ${fdate(D.rate.date)}.` : 'No rate entered yet.'} It’s used for imports, buying dollars and dollar payments.</span></div><div class="inline"><input id="rate-quick" class="inp n" style="width:130px" inputmode="decimal" placeholder="GNF for 1 USD" value="${esc(UI.rateQuick)}" data-bind="rateQuick" aria-label="Today's dollar rate"><button type="button" class="btn primary sm" data-act="saveRateQuick">Save</button></div></div>`;
  if (S.updateReady) h += `<div class="banner info"><div style="flex:1"><b>A new version of the app is ready.</b><span class="sub">Reload to start using it. Nothing you entered is lost.</span></div><button type="button" class="btn primary sm" data-act="reload">Reload</button></div>`;
  if (!S.online) h += `<div class="banner info"><div><b>You’re offline.</b><span class="sub">Keep working. Sales, payments and expenses are saved on this device and upload on their own when the internet is back.</span></div></div>`;
  else if (S.listenErr) h += `<div class="banner"><div><b>The connection to the database stopped.</b><span class="sub">Reload the page to reconnect. Nothing saved on this device is lost.</span></div></div>`;
  return h;
}
function mobileTop(){
  const [cls, txt] = syncInfo();
  return `<div class="mtop"><span class="brand-mark">${esc(initials())}</span><span class="brand-name">${esc(shopName())}</span><button type="button" class="ratechip${D.rate && !rateIsToday() ? ' old' : ''}" data-act="openRates" aria-label="Dollar rate">$ ${D.rate ? money(D.rate.rate) : '—'}</button><span class="dot ${cls}" title="${esc(txt)}"></span></div>`;
}
const VIEWS = {};
function renderView(){
  const v = $('#view');
  if ((UI.view === 'team' || UI.view === 'money') && !S.isOwner) UI.view = 'home';
  withFocus(v, () => { v.innerHTML = mobileTop() + banners() + (VIEWS[UI.view] || VIEWS.home)(); });
}
function renderAll(){
  const ready = S.auth === 'ready';
  $('#gate').hidden = ready; $('#app').hidden = !ready; $('#tabbar').hidden = !ready;
  if (!ready){ renderGate(); return; }
  renderRail(); renderTabbar(); renderView();
}
let raf = 0;
function schedule(){
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0; syncState(); derive(); renderAll();
    if (S.auth === 'ready') MODALS.forEach(m => { if (m.live) m.render(); });
    afterSync();
  });
}
const header = (eyebrow, title, actions = '') => `<header class="vh"><div><p class="eyebrow">${eyebrow}</p><h1>${esc(title)}</h1></div>${actions ? `<div class="actions">${actions}</div>` : ''}</header>`;
const tileRaw = (k, vHtml, s, href, cls = '', title = '') => `<${href ? `a href="${href}"` : 'div'} class="tile ${cls}"><span class="k">${k}</span><span class="v"${title ? ` title="${title}"` : ''}>${vHtml}</span><span class="s">${s}</span></${href ? 'a' : 'div'}>`;
const tile = (k, v, s, href, cls = '') => tileRaw(k, `${short(v)}<small>GNF</small>`, s, href, cls, `${money(v)} GNF`);

/* ================= views ================= */
VIEWS.home = function(){
  const t = todayStr(), m = t.slice(0, 7);
  const day = periodStats(d => d === t), mon = periodStats(d => d.slice(0, 7) === m);
  const debts = Object.entries(D.custBal).filter(([id, b]) => b > 0.5 && S.customers[id]);
  const owed = sum(debts, ([, b]) => b);
  const weOwe = sum(Object.values(D.supBal), b => Math.max(0, b));
  const nProd = Object.values(S.products).filter(p => p.active !== false).length;
  const nPurch = Object.keys(S.purchases).length, nAdj = Object.keys(S.adjustments).length;
  const steps = [
    {done: !!(S.settings.shopName || '').trim(), t:'Name your shop', s:'Shown on every invoice', act:'href="#shop"'},
    {done: nProd > 0, t:'Add your products', s:'With the quantity you have now', act:'data-act="newProduct"'},
    {done: nPurch > 0 || nAdj > 0, t:'Record a purchase', s:'From the market or an import', act:'href="#purchases"'},
    {done: D.sales.length > 0, t:'Record your first sale', s:'Cash or on credit', act:'href="#sell"'}
  ];
  const showSteps = !loading() && steps.some(s => !s.done);
  const low = Object.keys(S.products).filter(isLow).sort((a, b) => (D.prod[a].stock - D.prod[b].stock));
  const recent = D.sales.slice(0, 8);
  const transit = Object.entries(S.purchases).filter(([, p]) => p.status !== 'received').sort((a, b) => String(a[1].date).localeCompare(String(b[1].date)));
  return header(`Dashboard · ${fdate(t)}`, shopName(), `<a class="btn" href="#purchases">${ic('truck')}Purchase</a><a class="btn primary" href="#sell">${ic('plus')}New sale</a>`) +
  (showSteps ? `<section class="panel"><div class="panel-h"><h2>Getting started</h2><span class="sub">${steps.filter(s => s.done).length} of 4 done</span></div><div class="panel-b"><div class="steps">${steps.map((s, i) => `<${s.act.startsWith('href') ? 'a' : 'button type="button"'} class="step ${s.done ? 'done' : ''}" ${s.act}><span class="sn">${s.done ? 'DONE' : 'STEP ' + (i + 1)}</span><b>${s.t}</b><span class="sub">${s.s}</span></${s.act.startsWith('href') ? 'a' : 'button'}>`).join('')}</div></div></section>` : '') +
  `<section class="tiles">
    ${tile('Sales today', day.revenue, `${day.count} invoice${day.count === 1 ? '' : 's'} · ${short(day.cashIn)} cash in`, '#sales', 'hl')}
    ${tile('Sales this month', mon.revenue, `${mon.count} invoice${mon.count === 1 ? '' : 's'} in ${MON[+m.slice(5) - 1]}`, '#reports')}
    ${tile('Gross profit this month', mon.gross, `${pct(mon.margin)} margin on sales`, '#reports')}
    ${tile('Net profit this month', mon.net, `after ${short(mon.expenses)} of expenses`, '#reports', mon.net < 0 ? 'neg' : '')}
    ${tile('Customers owe you', owed, `${debts.length} customer${debts.length === 1 ? '' : 's'} on credit`, '#customers')}
    ${tile('You owe suppliers', weOwe, 'unpaid purchases', '#suppliers')}
    ${tile('Stock value at cost', D.stockValue, `${nProd} product${nProd === 1 ? '' : 's'} in the list`, '#stock')}
    ${tile('Imports in transit', D.transitValue, `${D.transitCount} shipment${D.transitCount === 1 ? '' : 's'} not yet received`, '#purchases')}
  </section>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>Recent sales</h2><a class="btn sm" href="#sales">All sales</a></div>
      ${recent.length ? `<div class="list">${recent.map(s => saleLi(s)).join('')}</div>` : emptyBox('No sales yet', 'Sales you record show up here.', `<a class="btn primary sm" href="#sell">${ic('plus')}New sale</a>`)}
    </section>
    <div class="stack">
      ${S.isOwner && hasAccounts() ? `<section class="panel"><div class="panel-h"><h2>Money</h2><a class="btn sm" href="#money">Accounts</a></div><div class="list">${accList().map(([id, a]) => `<button type="button" class="li" data-act="openAccount" data-id="${id}"><span class="nm"><b>${esc(a.name)}</b><span class="sub">${esc(ACC_TYPES[a.type] || '')}</span></span><span class="amt${D.acc[id].bal < 0 ? ' errline' : ''}">${esc(fmtAcc(D.acc[id].bal, a.currency))}</span></button>`).join('')}</div></section>` : ''}
      ${S.isOwner && !hasAccounts() && !loading() ? `<section class="panel"><div class="panel-h"><h2>Money accounts</h2><a class="btn sm primary" href="#money">Set up</a></div><div class="panel-b"><p class="sub">Track the cash box, Orange Money, MTN MoMo, the bank, the home safe and dollars.</p></div></section>` : ''}
      <section class="panel"><div class="panel-h"><h2>Low stock</h2>${low.length ? `<span class="pill warn">${low.length} to reorder</span>` : ''}</div>
        ${low.length ? `<div class="list">${low.slice(0, 8).map(id => { const p = S.products[id], x = D.prod[id]; return `<button type="button" class="li" data-act="openProduct" data-id="${id}"><span class="nm"><b>${esc(p.name)}</b><span class="sub">${esc(p.category || '')}${+p.min ? ` · reorder at ${qtyFmt(p.min)}` : ''}${x.transit ? ` · ${qtyFmt(x.transit)} on the way` : ''}</span></span><span class="amt"><span class="pill ${x.stock <= 0 ? 'bad' : 'warn'}">${qtyU(x.stock, p.unit)}</span></span></button>`; }).join('')}</div>` : emptyBox('Nothing running low', 'Set a reorder level on a product to get warned here.')}
      </section>
      ${transit.length ? `<section class="panel"><div class="panel-h"><h2>Imports on the way</h2></div><div class="list">${transit.slice(0, 6).map(([id, p]) => `<button type="button" class="li" data-act="openPurchase" data-id="${id}"><span class="nm"><b>${esc(p.ref || 'Import')}</b><span class="sub">${esc((S.suppliers[p.supplierId] || {}).name || 'No supplier')} · ordered ${fdate(p.date)}</span></span><span class="amt">${money(D.pc[id].landed)}<br><span class="sub">GNF landed</span></span></button>`).join('')}</div></section>` : ''}
    </div>
  </div>`;
};
function salePill(s){
  if (s.void) return '<span class="pill bad">Void</span>';
  const rem = D.invRemain[s.id] || 0;
  if (rem <= 0.5) return '<span class="pill good">Paid</span>';
  if (rem < s.total - 0.5) return `<span class="pill warn">${short(rem)} left</span>`;
  return `<span class="pill bad">Unpaid</span>`;
}
function saleLi(s){
  return `<button type="button" class="li" data-act="openSale" data-id="${s.id}"><span class="nm"><b>${esc(custName(s))}</b><span class="sub"><span class="mono">${invNoS(s)}</span> · ${fdateShort(s.date)} · ${s.items.length} item${s.items.length === 1 ? '' : 's'}</span></span><span class="amt">${money(s.total)}<br>${salePill(s)}</span></button>`;
}

VIEWS.sell = function(){
  const c = UI.cart;
  const toks = c.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = Object.entries(S.products).filter(([, p]) => p.active !== false);
  const list = all.filter(([, p]) => { const h = `${p.name} ${p.sku || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase(); return toks.every(t => h.includes(t)); }).sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)));
  const shown = list.slice(0, 40);
  const subtotal = sum(c.items, i => num(i.qty) * num(i.price));
  const discount = num(c.discount), total = subtotal - discount;
  const paid = c.paidTouched ? num(c.paid) : total;
  const credit = total - paid;
  const cust = c.customerId ? S.customers[c.customerId] : null;
  const custOwes = c.customerId ? (D.custBal[c.customerId] || 0) : 0;
  const custs = sortedBy(S.customers);

  const picker = `<section class="panel">
    <div class="panel-h"><div class="search">${ic('search')}<input id="sell-q" class="inp" type="search" placeholder="Search by name, code or brand" value="${esc(c.q)}" data-bind="cart.q" data-rr autocomplete="off" aria-label="Search products"></div><button type="button" class="btn sm" data-act="newProduct">${ic('plus')}Product</button></div>
    ${shown.length ? `<div class="list">${shown.map(([id, p]) => { const x = D.prod[id] || {stock:0}; const inCart = c.items.find(i => i.productId === id); return `<button type="button" class="li pitem" data-act="cartAdd" data-id="${id}"><span class="nm"><b>${esc(p.name)}</b><span class="sub">${esc([p.sku, p.brand, p.category].filter(Boolean).join(' · ')) || '&nbsp;'}</span></span>${inCart ? `<span class="pill accent">× ${esc(inCart.qty)}</span>` : ''}${p.special ? '<span class="pst">Special order</span><span class="pp"></span>' : `<span class="pst ${x.stock <= 0 ? 'neg' : ''}">${qtyU(x.stock, p.unit)}</span><span class="pp">${money(p.price)}</span>`}</button>`; }).join('')}</div>${list.length > 40 ? `<p class="sub" style="padding:10px 14px">Showing 40 of ${list.length}. Keep typing to narrow the list.</p>` : ''}`
      : (all.length ? `<div class="empty"><strong>No match</strong><span>Nothing matches “${esc(c.q)}”.</span></div>` : emptyBox('No products yet', 'Add the items you sell, with the quantity you have now.', `<button type="button" class="btn primary sm" data-act="newProduct">${ic('plus')}Add product</button>`))}
  </section>`;

  const lines = c.items.map((it, i) => {
    const p = S.products[it.productId] || {name: it.name || 'Removed product'}; const x = D.prod[it.productId] || {stock:0, avg:0};
    const qn = num(it.qty), pn = num(it.price);
    if (it.special){
      const cn = num(it.cost), prof = qn * (pn - cn);
      if (it.costAcc && (!S.accounts[it.costAcc] || isUSD(it.costAcc))) it.costAcc = defaultAcc();
      return `<div class="cline special">
      <div class="cl-top"><div class="nm"><b>${esc(p.name)}</b><span class="sub">Special order · not taken from stock</span></div><button type="button" class="btn ghost sm iconbtn" data-act="cartRemove" data-i="${i}" aria-label="Remove ${esc(p.name)}">${ic('x')}</button></div>
      <div class="cl-bot"><input id="cq-${i}" class="inp n qty" inputmode="decimal" value="${esc(it.qty)}" data-bind="cart.items.${i}.qty" data-rr data-sa aria-label="Quantity"><span class="x">×</span><input id="cp-${i}" class="inp n pr" inputmode="decimal" value="${esc(it.price)}" data-bind="cart.items.${i}.price" data-rr data-sa aria-label="Price for the client in GNF" placeholder="Price"><span class="cl-total">${money(qn * pn)}</span></div>
      <div class="cl-cost"><label for="cc-${i}">You paid${qn > 1 ? ' each' : ''}</label><input id="cc-${i}" class="inp n" inputmode="decimal" value="${esc(it.cost || '')}" data-bind="cart.items.${i}.cost" data-rr data-sa placeholder="Cost"></div>
      ${hasAccounts() ? `<div class="cl-cost"><label for="ca-${i}">Paid from</label><select id="ca-${i}" class="inp" data-bind="cart.items.${i}.costAcc" data-rr>${accList(a => a.currency !== 'USD' && forStaff(a)).map(([k, a]) => opt(k, a.name, k === it.costAcc)).join('')}${opt('', 'Not paid yet — no account', !it.costAcc)}</select></div>` : ''}
      ${cn > 0 && pn > 0 ? `<p class="${prof < 0 ? 'errline' : 'sub'}">${prof < 0 ? 'Loss' : 'Profit'} on this line: <b>${money(Math.abs(prof))} GNF</b></p>` : `<p class="sub">Type what you paid, so the profit is right.</p>`}
    </div>`;
    }
    const short1 = qn > x.stock, below = pn > 0 && x.avg > 0 && pn < x.avg;
    return `<div class="cline">
      <div class="cl-top"><div class="nm"><b>${esc(p.name)}</b><span class="sub">${itemDetail(it) ? esc(itemDetail(it)) + ' · ' : ''}${qtyU(x.stock, p.unit)} in stock${x.avg ? ` · cost ${money(x.avg)}` : ''}</span></div><button type="button" class="btn ghost sm iconbtn" data-act="cartRemove" data-i="${i}" aria-label="Remove ${esc(p.name)}">${ic('x')}</button></div>
      <div class="cl-bot"><input id="cq-${i}" class="inp n qty" inputmode="decimal" value="${esc(it.qty)}" data-bind="cart.items.${i}.qty" data-rr data-sa aria-label="Quantity"><span class="x">×</span><input id="cp-${i}" class="inp n pr" inputmode="decimal" value="${esc(it.price)}" data-bind="cart.items.${i}.price" data-rr data-sa aria-label="Unit price in GNF" placeholder="Price"><span class="cl-total">${money(qn * pn)}</span></div>
      ${short1 ? `<p class="warnline">Only ${qtyU(x.stock, p.unit)} recorded in stock.</p>` : ''}${below ? `<p class="warnline">Below average cost of ${money(x.avg)} GNF.</p>` : ''}
    </div>`;
  }).join('');

  const cart = `<section class="panel cart">
    <div class="panel-h"><h2>Invoice <span class="mono muted">${invNo(nextNo(), mySeries())}</span></h2>${c.items.length ? `<button type="button" class="btn ghost sm" data-act="cartClear">Clear</button>` : ''}</div>
    <div class="panel-b stack">
      ${c.items.length ? `<div>${lines}</div>` : `<div class="empty" style="padding:18px 8px"><span>Tap a product to add it.</span></div>`}
      <div class="form">
        <div class="field"><label for="sell-cust">Customer</label><select id="sell-cust" class="inp" data-bind="cart.customerId" data-rr>${opt('', 'Walk-in customer', !c.customerId)}${custs.map(([id, k]) => opt(id, k.name, id === c.customerId)).join('')}</select>
          <span class="inline"><button type="button" class="btn ghost sm" data-act="newCustomerForSale">${ic('plus')}New customer</button>${custOwes > 0.5 ? `<span class="pill warn">Already owes ${short(custOwes)}</span>` : ''}</span></div>
        ${c.customerId ? '' : `<div class="field"><label for="sell-walkin">Name on invoice <span class="hint">(optional)</span></label><input id="sell-walkin" class="inp" value="${esc(c.walkin)}" data-bind="cart.walkin" autocomplete="off"></div>`}
        <div class="field"><label for="sell-date">Date</label><input id="sell-date" class="inp" type="date" value="${esc(c.date)}" data-bind="cart.date"></div>
        <div class="field"><label for="sell-disc">Discount (GNF)</label><input id="sell-disc" class="inp n" inputmode="decimal" value="${esc(c.discount)}" data-bind="cart.discount" data-rr data-sa placeholder="0"></div>
      </div>
      <div class="totals">
        <div class="row"><span class="muted">Subtotal</span><span>${money(subtotal)}</span></div>
        ${discount ? `<div class="row"><span class="muted">Discount</span><span>−${money(discount)}</span></div>` : ''}
        <div class="row grand"><span>Total</span><span>${money(total)} <small class="sub">GNF</small></span></div>
      </div>
      <div class="form">
        <div class="field"><label for="sell-paid">Amount paid now</label><input id="sell-paid" class="inp n" inputmode="decimal" value="${esc(c.paidTouched ? c.paid : (total ? String(Math.round(total)) : ''))}" data-in="paid" data-sa>
          <span class="inline"><button type="button" class="btn ghost sm" data-act="paidFull">Paid in full</button><button type="button" class="btn ghost sm" data-act="paidCredit">All on credit</button></span></div>
        ${hasAccounts() ? '' : payField('sell-method', 'Paid into', 'cart.accountId', 'cart.method', c)}
      </div>
      ${hasAccounts() ? (paid > 0.5 ? (() => { if (!c.accountId || !S.accounts[c.accountId] || isUSD(c.accountId) || S.accounts[c.accountId].active === false || !forStaff(S.accounts[c.accountId])) c.accountId = defaultAcc();
        return `<div class="field"><span class="lbl">Money received in</span><div class="chips acc-chips" role="group" aria-label="Money received in">${accList(a => a.currency !== 'USD' && forStaff(a)).map(([k, a]) => `<button type="button" class="chip" data-act="saleAcc" data-v="${k}" aria-pressed="${k === c.accountId}">${esc(a.name)}</button>`).join('')}</div></div>`; })()
        : `<p class="sub">Nothing is received now, so no account changes.</p>`) : ''}
      ${credit > 0.5 ? `<div class="banner" style="padding:9px 12px"><div><b>${money(credit)} GNF on credit</b><span class="sub">${cust ? `Added to what ${esc(cust.name)} owes.` : 'Choose a customer so the balance is tracked.'}</span></div></div>` : ''}
      ${credit < -0.5 ? `<p class="errline">Amount paid is more than the total.</p>` : ''}
      <div class="field"><span class="lbl">Documents <span class="hint">(optional)</span></span>
        ${UI.cartFiles.length ? `<div class="docs">${UI.cartFiles.map((f, i) => `<span class="doc">${ic(f.type === 'application/pdf' ? 'file' : 'image')}<span class="doc-n">${esc(f.name)}</span><span class="doc-s">${fileSize(f.size)}</span><button type="button" class="doc-x" data-act="cartFileRemove" data-i="${i}" aria-label="Remove ${esc(f.name)}">${ic('x')}</button></span>`).join('')}</div>` : ''}
        <span class="inline">${fileInput('sell-file', 'cart')}${savingFiles() || '<span class="hint">Market receipt, the client’s list… kept with the sale.</span>'}</span></div>
      <div class="field"><label for="sell-note">Note <span class="hint">(optional)</span></label><input id="sell-note" class="inp" value="${esc(c.note)}" data-bind="cart.note" placeholder="Delivery, warranty, serial number…"></div>
      ${hasAccounts() && paid > 0.5 && c.items.length ? `<p class="sub"><b>${money(Math.min(paid, total))} GNF</b> goes into <b>${esc(accName(c.accountId))}</b>.</p>` : ''}
      <button type="button" class="btn primary big" data-act="recordSale"${UI.busy || !c.items.length ? ' disabled' : ''}>${UI.busy ? 'Saving…' : `Record sale · ${money(total)} GNF`}</button>
    </div>
  </section>`;
  return header('Point of sale', 'New sale') + `<div class="pos">${picker}${cart}</div>`;
};

VIEWS.sales = function(){
  const months = [...new Set([todayStr().slice(0, 7), ...D.sales.map(s => s.date.slice(0, 7))])].sort().reverse();
  const q = UI.salesQ.trim().toLowerCase();
  const list = D.sales.filter(s => (UI.salesMonth === 'all' || s.date.slice(0, 7) === UI.salesMonth) && (!q || `${invNoS(s)} ${custName(s)} ${s.items.map(i => i.name).join(' ')}`.toLowerCase().includes(q)));
  const live = list.filter(s => !s.void);
  const total = sum(live, s => s.total), atSale = sum(live, s => s.paid), left = sum(live, s => D.invRemain[s.id] || 0);
  return header('Sales & invoices', 'Sales', `<a class="btn primary" href="#sell">${ic('plus')}New sale</a>`) +
  `<div class="toolbar"><div class="search">${ic('search')}<input id="sales-q" class="inp" type="search" placeholder="Invoice no., customer or product" value="${esc(UI.salesQ)}" data-bind="salesQ" data-rr aria-label="Search sales"></div>
   <select id="sales-m" class="inp" data-bind="salesMonth" data-rr aria-label="Month">${opt('all', 'All months', UI.salesMonth === 'all')}${months.map(k => opt(k, mlabel(k), k === UI.salesMonth)).join('')}</select></div>
  <section class="tiles">
    ${tileRaw('Invoices', String(live.length), list.length - live.length ? `${list.length - live.length} voided` : (UI.salesMonth === 'all' ? 'all months' : mlabel(UI.salesMonth)))}
    ${tile('Sold', total, 'after discounts')}
    ${tile('Paid at the counter', atSale, `${pct(total ? atSale / total : 0)} of sales`)}
    ${tile('Still unpaid', left, 'on these invoices', '#customers', left > 0.5 ? 'neg' : '')}
  </section>
  <section class="panel">${list.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="hide-sm">Items</th><th class="hide-sm">Received in</th><th class="n">Total</th><th>Status</th></tr></thead><tbody>
    ${list.map(s => `<tr tabindex="0" class="click${s.void ? ' void' : ''}" data-act="openSale" data-id="${s.id}"><td class="mono">${invNoS(s)}</td><td>${fdateShort(s.date)}</td><td>${esc(custName(s))}</td><td class="hide-sm"><span class="sub">${esc(s.items.map(i => `${qtyFmt(i.qty)}× ${i.name}`).join(', ').slice(0, 70))}</span></td><td class="hide-sm">${s.paid ? esc(saleAccId(s) ? accName(saleAccId(s)) : (s.method || '—')) : '<span class="sub">On credit</span>'}</td><td class="n">${money(s.total)}</td><td>${salePill(s)}</td></tr>`).join('')}
  </tbody></table></div>` : emptyBox('No sales here', UI.salesMonth === 'all' ? 'Record a sale to see it here.' : `No sales in ${mlabel(UI.salesMonth)}${q ? ' match your search' : ''}.`)}</section>`;
};

VIEWS.stock = function(){
  const cats = allCats();
  const toks = UI.stockQ.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let rows = Object.entries(S.products).filter(([, p]) => UI.stockHidden || p.active !== false);
  rows = rows.filter(([, p]) => (!UI.stockCat || (p.category || '') === UI.stockCat) && toks.every(t => `${p.name} ${p.sku || ''} ${p.brand || ''}`.toLowerCase().includes(t)));
  if (UI.stockLow) rows = rows.filter(([id]) => isLow(id));
  rows.sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)));
  const stk = ([id, p]) => p.special ? 0 : Math.max(0, (D.prod[id] || {}).stock || 0);
  const val = sum(rows, r => stk(r) * ((D.prod[r[0]] || {}).avg || 0));
  const units = sum(rows, stk);
  const lowN = Object.keys(S.products).filter(isLow).length;
  return header('Goods', 'Stock', `<button type="button" class="btn" data-act="adjustStock">${ic('adjust')}Adjust stock</button><button type="button" class="btn primary" data-act="newProduct">${ic('plus')}Add product</button>`) +
  `<div class="toolbar"><div class="search">${ic('search')}<input id="stock-q" class="inp" type="search" placeholder="Search products" value="${esc(UI.stockQ)}" data-bind="stockQ" data-rr aria-label="Search products"></div>
    <div class="chips" role="group" aria-label="Category">${['', ...cats].map(c => `<button type="button" class="chip" data-act="stockCat" data-v="${esc(c)}" aria-pressed="${UI.stockCat === c}">${esc(c || 'All')}</button>`).join('')}
    <button type="button" class="chip" data-act="stockLow" aria-pressed="${UI.stockLow}">Low stock${lowN ? ` (${lowN})` : ''}</button></div></div>
  <section class="tiles">
    ${tile('Value at cost', val, `${rows.length} product${rows.length === 1 ? '' : 's'} shown`)}
    ${tile('Potential sales value', sum(rows, r => stk(r) * (+r[1].price || 0)), 'at current sale prices')}
    ${tileRaw('Units in stock', qtyFmt(units), 'all units added together')}
    ${tile('On the way', sum(rows, ([id]) => ((D.prod[id] || {}).transit || 0) * ((D.prod[id] || {}).avg || 0)), 'imports not yet received, at cost')}
  </section>
  <section class="panel">${rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Product</th><th class="hide-sm">Category</th><th class="n">In stock</th><th class="n hide-sm">Avg cost</th><th class="n">Sale price</th><th class="n">Margin</th><th class="n hide-sm">Value</th></tr></thead><tbody>
    ${rows.map(([id, p]) => { const x = D.prod[id] || {stock:0, avg:0, transit:0};
      if (p.special) return `<tr tabindex="0" class="click" data-act="openProduct" data-id="${id}"><td><b>${esc(p.name)}</b>${p.active === false ? ' <span class="pill">Hidden</span>' : ''}<span class="sub">${esc([p.sku, p.brand].filter(Boolean).join(' · ')) || 'Price and cost typed at each sale'}</span></td><td class="hide-sm">${esc(p.category || '')}</td><td class="n"><span class="pill accent">Special order</span></td><td class="n hide-sm">—</td><td class="n">—</td><td class="n">—</td><td class="n hide-sm">—</td></tr>`;
      const mg = (+p.price > 0 && x.avg > 0) ? (p.price - x.avg) / p.price : null; const low = isLow(id);
      return `<tr tabindex="0" class="click" data-act="openProduct" data-id="${id}"><td><b>${esc(p.name)}</b>${p.active === false ? ' <span class="pill">Hidden</span>' : ''}<span class="sub">${esc([p.sku, p.brand].filter(Boolean).join(' · '))}${x.transit ? ` · ${qtyFmt(x.transit)} on the way` : ''}</span></td><td class="hide-sm">${esc(p.category || '')}</td><td class="n">${low ? `<span class="pill ${x.stock <= 0 ? 'bad' : 'warn'}">${qtyU(x.stock, p.unit)}</span>` : qtyU(x.stock, p.unit)}</td><td class="n hide-sm">${x.avg ? money(x.avg) : '—'}</td><td class="n">${+p.price ? money(p.price) : '—'}</td><td class="n">${mg == null ? '—' : `<span class="${mg < 0 ? 'errline' : ''}">${pct(mg)}</span>`}</td><td class="n hide-sm">${money(Math.max(0, x.stock) * x.avg)}</td></tr>`; }).join('')}
  </tbody></table></div>` : (Object.keys(S.products).length ? `<div class="empty"><strong>No match</strong><span>No products match these filters.</span></div>` : emptyBox('Your stock list is empty', 'Add each product with the quantity you have today. Purchases and sales then keep the count up to date.', `<button type="button" class="btn primary sm" data-act="newProduct">${ic('plus')}Add product</button>`))}
  ${Object.values(S.products).some(p => p.active === false) ? `<div class="panel-h" style="border-top:1px solid var(--line);border-bottom:0"><span class="sub">Some products are hidden.</span><button type="button" class="btn ghost sm" data-act="stockHidden">${UI.stockHidden ? 'Hide them' : 'Show them'}</button></div>` : ''}
  </section>`;
};

VIEWS.purchases = function(){
  const q = UI.purchQ.trim().toLowerCase();
  let rows = Object.entries(S.purchases);
  rows = rows.filter(([, p]) => (!UI.purchStatus || (UI.purchStatus === 'received' ? p.status === 'received' : p.status !== 'received')) &&
    (!q || `${p.ref || ''} ${(S.suppliers[p.supplierId] || {}).name || ''} ${(p.lines || []).map(l => prodName(l.productId)).join(' ')}`.toLowerCase().includes(q)));
  rows.sort((a, b) => String(b[1].date).localeCompare(String(a[1].date)));
  const m = todayStr().slice(0, 7);
  const monRows = Object.entries(S.purchases).filter(([, p]) => String(p.date).slice(0, 7) === m);
  const owed = sum(Object.values(D.supBal), b => Math.max(0, b));
  return header('Goods', 'Purchases & imports', `<button type="button" class="btn" data-act="newPurchase" data-kind="market">${ic('plus')}Market purchase</button><button type="button" class="btn primary" data-act="newPurchase" data-kind="import">${ic('plus')}Import</button>`) +
  `<div class="toolbar"><div class="search">${ic('search')}<input id="purch-q" class="inp" type="search" placeholder="Reference, supplier or product" value="${esc(UI.purchQ)}" data-bind="purchQ" data-rr aria-label="Search purchases"></div>
   <div class="chips" role="group" aria-label="Status">${[['', 'All'], ['transit', 'In transit'], ['received', 'Received']].map(([v, l]) => `<button type="button" class="chip" data-act="purchStatus" data-v="${v}" aria-pressed="${UI.purchStatus === v}">${l}</button>`).join('')}</div></div>
  <section class="tiles">
    ${tile('Bought this month', sum(monRows, ([id]) => D.pc[id].landed), 'landed cost, all purchases')}
    ${tile('Extra costs this month', sum(monRows, ([id]) => D.pc[id].extras), 'freight, customs, transport…')}
    ${tile('In transit', D.transitValue, `${D.transitCount} shipment${D.transitCount === 1 ? '' : 's'}`)}
    ${tile('You owe suppliers', owed, 'goods not yet paid', '#suppliers', owed > 0.5 ? 'neg' : '')}
  </section>
  <section class="panel">${rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Reference · supplier</th><th>Type</th><th>Status</th><th class="n">Landed cost</th><th class="n">Still owed</th></tr></thead><tbody>
    ${rows.map(([id, p]) => { const c = D.pc[id]; return `<tr tabindex="0" class="click" data-act="openPurchase" data-id="${id}"><td>${fdateShort(p.date)}</td><td><b>${esc(p.ref || (p.kind === 'import' ? 'Import' : 'Market purchase'))}</b><span class="sub">${esc((S.suppliers[p.supplierId] || {}).name || 'No supplier')} · ${(p.lines || []).length} line${(p.lines || []).length === 1 ? '' : 's'}</span></td><td>${p.kind === 'import' ? `<span class="pill copper">Import · ${esc(p.currency || 'GNF')}</span>` : '<span class="pill">Market</span>'}</td><td>${p.status === 'received' ? '<span class="pill good">Received</span>' : '<span class="pill warn">In transit</span>'}</td><td class="n">${money(c.landed)}</td><td class="n">${c.balance > 0.5 ? money(c.balance) : '<span class="pill good">Paid</span>'}</td></tr>`; }).join('')}
  </tbody></table></div>` : emptyBox('No purchases yet', 'Record goods bought at the market, or an import with its freight and customs costs. Received goods are added to stock.', `<span class="inline"><button type="button" class="btn sm" data-act="newPurchase" data-kind="market">Market purchase</button><button type="button" class="btn primary sm" data-act="newPurchase" data-kind="import">Import</button></span>`)}</section>`;
};

VIEWS.customers = function(){
  const q = UI.custQ.trim().toLowerCase();
  const last = {}; for (const s of D.sales) if (!s.void && s.customerId && !last[s.customerId]) last[s.customerId] = s.date;
  let rows = Object.entries(S.customers).filter(([, k]) => !q || `${k.name} ${k.phone || ''}`.toLowerCase().includes(q));
  rows.sort((a, b) => ((D.custBal[b[0]] || 0) - (D.custBal[a[0]] || 0)) || String(a[1].name).localeCompare(String(b[1].name)));
  const owed = sum(Object.entries(D.custBal).filter(([id]) => S.customers[id]), ([, b]) => Math.max(0, b));
  const n = Object.entries(D.custBal).filter(([id, b]) => b > 0.5 && S.customers[id]).length;
  return header('Money', 'Customers & credit', `${S.isOwner ? `<button type="button" class="btn" data-act="oldDebts">Enter old debts</button>` : ''}<button type="button" class="btn primary" data-act="newCustomer">${ic('plus')}Add customer</button>`) +
  `<div class="toolbar"><div class="search">${ic('search')}<input id="cust-q" class="inp" type="search" placeholder="Name or phone" value="${esc(UI.custQ)}" data-bind="custQ" data-rr aria-label="Search customers"></div><span class="sub">${n ? `${n} customer${n === 1 ? '' : 's'} owe a total of <b>${money(owed)} GNF</b>` : 'No one owes you money right now.'}</span></div>
  <section class="panel">${rows.length ? `<div class="list">${rows.map(([id, k]) => { const b = D.custBal[id] || 0; return `<button type="button" class="li" data-act="openCustomer" data-id="${id}"><span class="nm"><b>${esc(k.name)}</b><span class="sub">${esc(k.phone || 'No phone')}${last[id] ? ` · last bought ${fdate(last[id])}` : ''}</span></span><span class="amt">${b > 0.5 ? `<span class="pill bad">Owes ${money(b)}</span>` : b < -0.5 ? `<span class="pill accent">Credit ${money(-b)}</span>` : '<span class="pill good">Settled</span>'}</span></button>`; }).join('')}</div>`
    : emptyBox(Object.keys(S.customers).length ? 'No match' : 'No customers yet', Object.keys(S.customers).length ? 'No customer matches your search.' : 'Add regular buyers, plumbers and contractors so credit sales are tracked by name.', Object.keys(S.customers).length ? '' : `<button type="button" class="btn primary sm" data-act="newCustomer">${ic('plus')}Add customer</button>`)}</section>`;
};

VIEWS.suppliers = function(){
  const q = UI.supQ.trim().toLowerCase();
  const count = {}; Object.values(S.purchases).forEach(p => { if (p.supplierId) count[p.supplierId] = (count[p.supplierId] || 0) + 1; });
  let rows = Object.entries(S.suppliers).filter(([, k]) => !q || `${k.name} ${k.phone || ''} ${k.location || ''}`.toLowerCase().includes(q));
  rows.sort((a, b) => ((D.supBal[b[0]] || 0) - (D.supBal[a[0]] || 0)) || String(a[1].name).localeCompare(String(b[1].name)));
  const owed = sum(Object.values(D.supBal), b => Math.max(0, b));
  return header('Goods', 'Suppliers', `${S.isOwner ? `<button type="button" class="btn" data-act="supOldDebts">Enter old debts</button>` : ''}<button type="button" class="btn primary" data-act="newSupplier">${ic('plus')}Add supplier</button>`) +
  `<div class="toolbar"><div class="search">${ic('search')}<input id="sup-q" class="inp" type="search" placeholder="Name, phone or location" value="${esc(UI.supQ)}" data-bind="supQ" data-rr aria-label="Search suppliers"></div><span class="sub">${owed > 0.5 ? `You owe suppliers <b>${money(owed)} GNF</b>` : 'All suppliers are paid.'}</span></div>
  <section class="panel">${rows.length ? `<div class="list">${rows.map(([id, k]) => { const b = D.supBal[id] || 0; return `<button type="button" class="li" data-act="openSupplier" data-id="${id}"><span class="nm"><b>${esc(k.name)}</b><span class="sub">${k.kind === 'import' ? 'Import' : k.kind === 'both' ? 'Market & import' : 'Market'}${k.location ? ' · ' + esc(k.location) : ''} · ${count[id] || 0} purchase${(count[id] || 0) === 1 ? '' : 's'}</span></span><span class="amt">${b > 0.5 ? `<span class="pill bad">You owe ${money(b)}</span>` : '<span class="pill good">Paid up</span>'}</span></button>`; }).join('')}</div>`
    : emptyBox(Object.keys(S.suppliers).length ? 'No match' : 'No suppliers yet', Object.keys(S.suppliers).length ? 'No supplier matches your search.' : 'Add the wholesalers you buy from at the market and your import suppliers abroad.', Object.keys(S.suppliers).length ? '' : `<button type="button" class="btn primary sm" data-act="newSupplier">${ic('plus')}Add supplier</button>`)}</section>`;
};

VIEWS.expenses = function(){
  const e = UI.exp;
  const months = [...new Set([todayStr().slice(0, 7), ...D.expenses.map(x => x.date.slice(0, 7))])].sort().reverse();
  const list = [...D.expenses, ...D.extraCosts].filter(x => UI.expMonth === 'all' || x.date.slice(0, 7) === UI.expMonth).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const live = list.filter(x => !x.void);
  const byCat = {}; live.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + x.amount; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...cats.map(c => c[1]));
  const total = sum(live, x => x.amount);
  return header('Running costs', 'Expenses') +
  `<section class="panel"><div class="panel-h"><h2>Add an expense</h2></div><div class="panel-b"><div class="form">
    <div class="field"><label for="exp-date">Date</label><input id="exp-date" class="inp" type="date" value="${esc(e.date)}" data-bind="exp.date"></div>
    <div class="field"><label for="exp-cat">Category</label><select id="exp-cat" class="inp" data-bind="exp.category">${opts(EXP_CATS, e.category)}</select></div>
    <div class="field"><label for="exp-amt">Amount (GNF)</label><input id="exp-amt" class="inp n" inputmode="decimal" value="${esc(e.amount)}" data-bind="exp.amount" placeholder="0"></div>
    ${payField('exp-method', 'Paid from', 'exp.accountId', 'exp.method', e)}
    <div class="field full"><label for="exp-note">Note</label><div class="inline"><input id="exp-note" class="inp grow" value="${esc(e.note)}" data-bind="exp.note" placeholder="e.g. Generator fuel, 20 liters"><button type="button" class="btn primary" data-act="addExpense">${ic('plus')}Add expense</button></div></div>
  </div></div></section>
  <div class="toolbar"><select id="exp-m" class="inp" data-bind="expMonth" data-rr aria-label="Month">${opt('all', 'All months', UI.expMonth === 'all')}${months.map(k => opt(k, mlabel(k), k === UI.expMonth)).join('')}</select><span class="sub">Total <b>${money(total)} GNF</b></span></div>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>By category</h2></div><div class="panel-b">${cats.length ? `<div class="bars">${cats.map(([c, v]) => `<div class="bar-row"><span>${esc(c)}</span><span class="num">${money(v)}</span><div class="bar-track"><div class="bar-fill copper" style="width:${(Math.max(0, v) / max * 100).toFixed(1)}%"></div></div></div>`).join('')}</div>` : emptyBox('No expenses', 'Nothing recorded for this period.')}</div></section>
    <section class="panel"><div class="panel-h"><h2>Entries</h2></div>${list.length ? `<div class="scroll"><table class="tbl"><tbody>${list.map(x => `<tr class="${x.void ? 'void' : ''}"><td>${fdateShort(x.date)}</td><td><b>${esc(x.category)}</b><span class="sub">${esc(x.note || '')}${x.note ? ' · ' : ''}${esc(x.method || '')}</span></td><td class="n">${money(x.amount)}</td><td class="n">${x.auto ? '<span class="pill">Automatic</span>' : x.void ? '<span class="pill bad">Removed</span>' : UI.confirmExp === x.id ? `<span class="inline"><button type="button" class="btn danger solid sm" data-act="voidExpense" data-id="${x.id}">Remove</button><button type="button" class="btn ghost sm" data-act="cancelExp">Keep</button></span>` : `<button type="button" class="btn ghost sm iconbtn" data-act="askExp" data-id="${x.id}" aria-label="Remove expense">${ic('x')}</button>`}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No expenses', 'Rent, salaries, fuel and other running costs go here. They are taken off gross profit in Reports.')}</section>
  </div>`;
};

VIEWS.reports = function(){
  const cur = todayStr().slice(0, 7), y = cur.slice(0, 4);
  const choices = [['m:' + cur, 'This month'], ['m:' + addMonths(cur, -1), 'Last month']];
  for (let i = 2; i < 12; i++){ const k = addMonths(cur, -i); choices.push(['m:' + k, mlabel(k)]); }
  choices.push(['y:' + y, 'This year (' + y + ')'], ['y:' + (+y - 1), 'Last year (' + (+y - 1) + ')'], ['all', 'All time']);
  const per = UI.repPeriod;
  const pred = per === 'all' ? () => true : per.startsWith('y:') ? d => d.slice(0, 4) === per.slice(2) : d => d.slice(0, 7) === per.slice(2);
  const st = periodStats(pred);
  const byProd = {}, byCat = {}, byStaff = {}, byMethod = {};
  for (const s of st.ss){
    const sh = s.subtotal > 0 ? s.total / s.subtotal : 1; // spread invoice discount across lines
    for (const i of s.items){
      const rev = i.qty * i.price * sh, cost = i.qty * i.cost;
      const k = i.productId || i.name; const b = byProd[k] || (byProd[k] = {name: (S.products[i.productId] || {}).name || i.name, qty:0, rev:0, cost:0});
      b.qty += i.qty; b.rev += rev; b.cost += cost;
      const cat = (S.products[i.productId] || {}).category || 'Other'; const c = byCat[cat] || (byCat[cat] = {rev:0, cost:0}); c.rev += rev; c.cost += cost;
    }
    const sk = s.by || ''; const f = byStaff[sk] || (byStaff[sk] = {n:0, rev:0}); f.n++; f.rev += s.total;
    if (s.paid) byMethod[s.method || 'Cash'] = (byMethod[s.method || 'Cash'] || 0) + s.paid;
  }
  st.pays.forEach(p => { byMethod[p.method || 'Cash'] = (byMethod[p.method || 'Cash'] || 0) + p.amount; });
  const top = Object.values(byProd).sort((a, b) => (b.rev - b.cost) - (a.rev - a.cost)).slice(0, 10);
  const cats = Object.entries(byCat).sort((a, b) => b[1].rev - a[1].rev);
  const exCats = {}; st.ex.forEach(x => { exCats[x.category] = (exCats[x.category] || 0) + x.amount; });
  const methods = Object.entries(byMethod).sort((a, b) => b[1] - a[1]); const mMax = Math.max(1, ...methods.map(m => m[1]));
  const label = (choices.find(c => c[0] === per) || [0, 'Period'])[1];
  return header('Reports', 'Profit & performance') +
  `<div class="toolbar"><select id="rep-p" class="inp" data-bind="repPeriod" data-rr aria-label="Period">${choices.map(([v, l]) => opt(v, l, v === per)).join('')}</select><span class="sub">${esc(label)} · ${st.count} invoice${st.count === 1 ? '' : 's'}</span></div>
  <section class="tiles">
    ${tile('Sales', st.revenue, 'after discounts', '', 'hl')}
    ${tile('Cost of goods sold', st.cogs, 'landed cost of what was sold')}
    ${tile('Gross profit', st.gross, `${pct(st.margin)} margin`, '', st.gross < 0 ? 'neg' : '')}
    ${tile('Net profit', st.net, `gross profit minus ${short(st.expenses)} expenses`, '', st.net < 0 ? 'neg' : 'pos')}
  </section>
  <section class="panel"><div class="panel-h"><h2>Last 12 months</h2><div class="legend"><span><i style="background:var(--accent)"></i>Sales</span><span><i style="background:var(--good)"></i>Gross profit</span></div></div><div class="panel-b"><div class="scroll">${monthChart()}</div></div></section>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>By category</h2></div>${cats.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Category</th><th class="n">Sales</th><th class="n">Gross profit</th><th class="n">Margin</th></tr></thead><tbody>${cats.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="n">${money(v.rev)}</td><td class="n">${money(v.rev - v.cost)}</td><td class="n">${pct(v.rev ? (v.rev - v.cost) / v.rev : 0)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No sales in this period', 'Pick another period above.')}</section>
    <section class="panel"><div class="panel-h"><h2>Money received</h2><span class="sub">${money(st.cashIn)} GNF</span></div><div class="panel-b">${methods.length ? `<div class="bars">${methods.map(([k, v]) => `<div class="bar-row"><span>${esc(k)}</span><span class="num">${money(v)}</span><div class="bar-track"><div class="bar-fill" style="width:${(v / mMax * 100).toFixed(1)}%"></div></div></div>`).join('')}</div>` : emptyBox('Nothing received', 'No payments in this period.')}</div></section>
  </div>
  <section class="panel"><div class="panel-h"><h2>Most profitable products</h2></div>${top.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Product</th><th class="n">Qty sold</th><th class="n">Sales</th><th class="n hide-sm">Cost</th><th class="n">Gross profit</th><th class="n hide-sm">Margin</th></tr></thead><tbody>${top.map(b => `<tr><td>${esc(b.name)}</td><td class="n">${qtyFmt(b.qty)}</td><td class="n">${money(b.rev)}</td><td class="n hide-sm">${money(b.cost)}</td><td class="n">${money(b.rev - b.cost)}</td><td class="n hide-sm">${pct(b.rev ? (b.rev - b.cost) / b.rev : 0)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No sales in this period', 'Pick another period above.')}</section>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>Expenses</h2><span class="sub">${money(st.expenses)} GNF</span></div>${Object.keys(exCats).length ? `<div class="scroll"><table class="tbl"><tbody>${Object.entries(exCats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${money(v)}</td><td class="n">${pct(st.expenses ? v / st.expenses : 0)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No expenses', 'Nothing recorded in this period.')}</section>
    <section class="panel"><div class="panel-h"><h2>Sales by team member</h2></div>${Object.keys(byStaff).length ? `<div class="scroll"><table class="tbl"><tbody>${Object.entries(byStaff).sort((a, b) => b[1].rev - a[1].rev).map(([k, v]) => `<tr><td>${esc(staffName(k))}</td><td class="n">${v.n} invoice${v.n === 1 ? '' : 's'}</td><td class="n">${money(v.rev)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No sales in this period', 'Pick another period above.')}</section>
  </div>`;
};
function monthChart(){
  const cur = todayStr().slice(0, 7); const months = Array.from({length:12}, (_, i) => addMonths(cur, i - 11));
  const data = months.map(k => { const s = periodStats(d => d.slice(0, 7) === k); return {k, rev: s.revenue, gross: Math.max(0, s.gross)}; });
  const max = Math.max(1, ...data.map(d => d.rev));
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const ticks = [0]; while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  const top = ticks[ticks.length - 1];
  const W = 720, H = 250, L = 52, R = 10, T = 12, B = 30, cw = (W - L - R) / 12, bw = Math.min(20, (cw - 12) / 2);
  const y = v => T + (H - T - B) * (1 - v / top);
  let g = ticks.map(t => `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text x="${L - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${t === 0 ? '0' : short(t)}</text>`).join('');
  g += data.map((d, i) => {
    const cx = L + cw * i + cw / 2, x1 = cx - bw - 1, x2 = cx + 1;
    const h1 = (H - T - B) * d.rev / top, h2 = (H - T - B) * d.gross / top;
    return `<rect class="b1" x="${x1.toFixed(1)}" y="${(H - B - h1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h1).toFixed(1)}" rx="2"><title>${mlabel(d.k)} sales: ${money(d.rev)} GNF</title></rect>
      <rect class="b2" x="${x2.toFixed(1)}" y="${(H - B - h2).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h2).toFixed(1)}" rx="2"><title>${mlabel(d.k)} gross profit: ${money(d.gross)} GNF</title></rect>
      <text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle"${i === 11 ? ' class="now"' : ''}>${MON[+d.k.slice(5) - 1]}${d.k.slice(5) === '01' || i === 0 ? ' ’' + d.k.slice(2, 4) : ''}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sales and gross profit for each of the last 12 months">${g}</svg>`;
}

VIEWS.money = function(){
  const head = (actions = '') => header('Money', 'Money accounts', actions);
  if (!S.isOwner) return head() + `<section class="panel">${emptyBox('Only the owners see this page', 'Ask the owner for account balances.')}</section>`;
  if (!Object.keys(S.accounts).length) return head() + accountSetup();
  const accs = accList(), mth = todayStr().slice(0, 7);
  const gnfAccs = accs.filter(([, a]) => a.currency !== 'USD');
  const gnf = sum(gnfAccs, ([id]) => D.acc[id].bal);
  const rowsM = gnfAccs.flatMap(([id]) => D.acc[id].rows).filter(r => r.date.slice(0, 7) === mth);
  const byKind = k => sum(rowsM.filter(r => r.kind === k), r => r.amt);
  const neg = v => Math.round(v) ? '−' + money(v) : '0';
  const ownIn = sum(rowsM.filter(r => r.kind === 'own' && r.amt > 0), r => r.amt), ownOut = -sum(rowsM.filter(r => r.kind === 'own' && r.amt < 0), r => r.amt);
  const recent = accs.flatMap(([id, a]) => D.acc[id].rows.map(r => ({...r, acc: a.name, cur: a.currency}))).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : String(b.at).localeCompare(String(a.at))).slice(0, 20);
  return head(`<button type="button" class="btn" data-act="cashCount">Count cash</button><button type="button" class="btn" data-act="ownerMoney">Owner money</button><button type="button" class="btn primary" data-act="newTransfer">Transfer</button>`) +
  `<section class="tiles">
    ${tileRaw('All GNF accounts', `${short(gnf)}<small>GNF</small>`, `${gnfAccs.length} account${gnfAccs.length === 1 ? '' : 's'}`, '', 'hl', `${money(gnf)} GNF`)}
    ${accs.map(([id, a]) => { const x = D.acc[id], lc = x.lastCount; return `<button type="button" class="tile" data-act="openAccount" data-id="${id}"><span class="k">${esc(a.name)}</span><span class="v${x.bal < 0 ? ' negv' : ''}" title="${esc(fmtAcc(x.bal, a.currency))}">${a.currency === 'USD' ? esc(fmtAcc(x.bal, 'USD')) : `${short(x.bal)}<small>GNF</small>`}</span><span class="s">${a.currency === 'USD' && curRate() ? `≈ ${short(x.bal * curRate())} GNF at ${money(curRate())}` : esc(ACC_TYPES[a.type] || '')}${lc ? ` · counted ${fdateShort(lc.date)}` : ''}</span></button>`; }).join('')}
  </section>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>Latest movements</h2><button type="button" class="btn sm" data-act="newAccount">${ic('plus')}Add account</button></div>
      ${recent.length ? `<div class="list">${recent.map(r => `<${r.act ? 'button type="button"' : 'div'} class="li" ${r.act || ''}><span class="nm"><b>${esc(r.what)}</b><span class="sub">${fdateShort(r.date)} · ${esc(r.acc)}${r.sub ? ' · ' + esc(r.sub) : ''}</span></span><span class="amt ${r.amt < 0 ? 'out' : 'in'}">${r.amt > 0 ? '+' : '−'}${esc(fmtAcc(Math.abs(r.amt), r.cur))}</span></${r.act ? 'button' : 'div'}>`).join('')}</div>` : emptyBox('No movements yet', 'Sales, payments, expenses and transfers will show here.')}
    </section>
    <section class="panel"><div class="panel-h"><h2>${MON[+mth.slice(5) - 1]} in the GNF accounts</h2></div><div class="panel-b"><div class="totals">
      <div class="row"><span class="muted">Received from customers</span><span>${money(byKind('sale'))}</span></div>
      <div class="row"><span class="muted">Spent on expenses</span><span>${neg(-byKind('exp'))}</span></div>
      <div class="row"><span class="muted">Paid for purchases (suppliers, freight, customs…)</span><span>${neg(-byKind('sup'))}</span></div>
      <div class="row"><span class="muted">Owner took out</span><span>${neg(ownOut)}</span></div>
      <div class="row"><span class="muted">Owner put in</span><span>${money(ownIn)}</span></div>
      <div class="row"><span class="muted">Transfers, fees and count differences</span><span>${money(byKind('tr') + byKind('count'))}</span></div>
      <div class="row grand"><span>Change this month</span><span>${money(sum(rowsM, r => r.amt))} <small class="sub">GNF</small></span></div>
    </div><p class="hint" style="margin-top:10px">Money the owner takes out isn’t an expense, so it doesn’t lower the profit in Reports.</p></div></section>
  </div>
  ${(() => { const hid = Object.entries(S.accounts).filter(([, a]) => a.active === false); if (!hid.length) return '';
    return `<section class="panel"><div class="panel-h"><h2>Hidden accounts</h2><span class="sub">Not counted in the totals above</span></div><div class="list">${hid.map(([id, a]) => `<div class="li"><span class="nm"><b>${esc(a.name)}</b><span class="sub">${esc(ACC_TYPES[a.type] || '')} · balance ${esc(fmtAcc((D.acc[id] || {}).bal || 0, a.currency))}</span></span><button type="button" class="btn sm" data-act="unhideAccount" data-id="${id}">Show again</button></div>`).join('')}</div></section>`; })()}`;
};
function rateModal(){
  const st = {rate: rateIsToday() ? String(D.rate.rate) : '', date: todayStr()};
  const m = openModal({state: st, live: true, title: () => 'Dollar rate',
    body: () => `${S.isOwner ? `<div class="form">
        <div class="field"><label for="rt-rate">GNF for 1 USD</label><input id="rt-rate" class="inp n" inputmode="decimal" value="${esc(st.rate)}" data-bind="rate" placeholder="${D.rate ? esc(String(D.rate.rate)) : 'e.g. 8650'}"></div>
        <div class="field"><label for="rt-date">For the day</label><input id="rt-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
      </div><p class="hint">Enter it every morning. New imports, dollar purchases and dollar payments start from this rate; you can still change it on each one. Rates already used on past records don’t change.</p>`
      : `<p>${esc(rateNote())}.</p><p class="hint">The owners update the rate.</p>`}
      <div class="sect"><h3>History</h3>${D.rateHist.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Day</th><th class="n">GNF for 1 USD</th><th class="n">Change</th><th class="hide-sm">Entered by</th></tr></thead><tbody>${D.rateHist.slice(0, 60).map((r, i, a) => { const prev = a[i + 1]; const ch = prev ? r.rate - prev.rate : 0; return `<tr><td>${fdate(r.date)}</td><td class="n">${money(r.rate)}</td><td class="n">${prev ? (ch > 0 ? '+' : ch < 0 ? '−' : '') + money(Math.abs(ch)) : ''}</td><td class="hide-sm">${esc(staffName(r.by))}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="sub">No rates entered yet.</p>'}</div>`,
    foot: () => S.isOwner ? '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save rate</button>' : '<span class="spacer"></span><button type="button" class="btn primary" data-close>Done</button>',
    acts: { save: async () => { if (await saveRate(st.rate, st.date)) m.close(); } }
  });
}
async function saveRate(v, date){
  const r = parseNum(v);
  if (!(r > 0)) { toast('Enter the rate: how many GNF for 1 USD.'); return false; }
  if (D.rate && Math.abs(r - D.rate.rate) / D.rate.rate > 0.2) { toast(`That’s far from the last rate (${money(D.rate.rate)}). Check the number and save again.`); if (UI.rateCheck !== r){ UI.rateCheck = r; return false; } }
  UI.rateCheck = null;
  return write([{col:'rates', id: date || todayStr(), merge:false, data:{date: date || todayStr(), rate: r, by: S.email, at: nowIso()}}], `Dollar rate saved: ${money(r)} GNF`);
}
function accountSetup(){
  if (!UI.accSetup) UI.accSetup = {date: todayStr(), rows: DEFAULT_ACCOUNTS.map(a => ({...a, on: true, opening: ''}))};
  const s = UI.accSetup;
  return `<section class="panel"><div class="panel-h"><h2>Set up the money accounts</h2></div><div class="panel-b stack">
    <p class="sub">One account for each place the shop keeps money. Enter how much is in each one at the start of the day you pick. From then on, sales, customer payments, expenses, supplier payments and transfers keep the balances up to date.</p>
    <div class="field" style="max-width:260px"><label for="as-date">Balances at the start of</label><input id="as-date" class="inp" type="date" value="${esc(s.date)}" data-bind="accSetup.date"></div>
    <div class="scroll"><table class="tbl"><thead><tr><th>Use</th><th>Account</th><th>Currency</th><th class="n">Amount in it</th></tr></thead><tbody>
    ${s.rows.map((r, i) => `<tr><td><input type="checkbox" id="as-on-${i}" data-bind="accSetup.rows.${i}.on"${r.on ? ' checked' : ''} aria-label="Use ${esc(r.name)}"></td><td><input id="as-name-${i}" class="inp" style="min-width:150px" value="${esc(r.name)}" data-bind="accSetup.rows.${i}.name" aria-label="Account name"></td><td>${r.currency}</td><td><input id="as-open-${i}" class="inp n" style="width:150px" inputmode="decimal" value="${esc(r.opening)}" data-bind="accSetup.rows.${i}.opening" placeholder="0" aria-label="Amount in ${esc(r.name)} (${r.currency})"></td></tr>`).join('')}
    </tbody></table></div>
    <div><button type="button" class="btn primary" data-act="createAccounts">Create accounts</button></div>
  </div></section>`;
}
function accountModal(id){
  const src = id ? (S.accounts[id] || {}) : {};
  const st = {name: src.name || '', opening: src.opening != null ? String(src.opening) : '', openingDate: src.openingDate || todayStr(), type: src.type || 'cash', currency: src.currency || 'GNF', edit: !id};
  const m = openModal({
    state: st, live: true, wide: !!id,
    title: () => id ? ((S.accounts[id] || {}).name || 'Account') : 'Add account',
    body: () => {
      const form = `<div class="form">
        <div class="field"><label for="am-name">Name</label><input id="am-name" class="inp" value="${esc(st.name)}" data-bind="name" placeholder="e.g. Ecobank, Wave, Second cash box"></div>
        <div class="field"><label for="am-type">Type</label><select id="am-type" class="inp" data-bind="type"${id ? ' disabled' : ''}>${Object.entries(ACC_TYPES).map(([k, l]) => opt(k, l, k === st.type)).join('')}</select></div>
        <div class="field"><label for="am-cur">Currency</label><select id="am-cur" class="inp" data-bind="currency"${id ? ' disabled' : ''}>${opts(['GNF', 'USD'], st.currency)}</select></div>
        <div class="field"><label for="am-open">Amount in it at the start date</label><input id="am-open" class="inp n" inputmode="decimal" value="${esc(st.opening)}" data-bind="opening" placeholder="0"></div>
        <div class="field"><label for="am-date">Start date</label><input id="am-date" class="inp" type="date" value="${esc(st.openingDate)}" data-bind="openingDate"><span class="hint">Movements before this date don’t count</span></div>
      </div>`;
      if (!id) return form;
      const a = S.accounts[id] || src, x = D.acc[id] || {bal: 0, rows: [], cur: 'GNF'}, mth = todayStr().slice(0, 7);
      const inM = sum(x.rows.filter(r => r.amt > 0 && r.date.slice(0, 7) === mth), r => r.amt), outM = -sum(x.rows.filter(r => r.amt < 0 && r.date.slice(0, 7) === mth), r => r.amt);
      const asc = x.rows.slice().sort((p, q) => p.date < q.date ? -1 : p.date > q.date ? 1 : String(p.at).localeCompare(String(q.at)));
      let run = +a.opening || 0; const lines = asc.map(r => { run += r.amt; return {...r, run}; }).reverse();
      const lc = x.lastCount;
      return `<section class="tiles">
          ${tileRaw('Balance now', esc(fmtAcc(x.bal, x.cur)), esc(ACC_TYPES[a.type] || ''), '', 'hl')}
          ${tileRaw('In this month', esc(fmtAcc(inM, x.cur)), MON[+mth.slice(5) - 1])}
          ${tileRaw('Out this month', esc(fmtAcc(outM, x.cur)), MON[+mth.slice(5) - 1])}
          ${tileRaw('Last cash count', lc ? fdateShort(lc.date) : '—', lc ? (Math.abs(+lc.diff || 0) > 0.005 ? `difference ${esc(fmtAcc(+lc.diff, x.cur))}` : 'matched') : 'not counted yet')}
        </section>
        <div class="sect"><div class="sect-h"><h3>Statement</h3><span class="sub">Newest first</span></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Movement</th><th class="n">In</th><th class="n">Out</th><th class="n">Balance</th></tr></thead><tbody>
        ${lines.slice(0, 200).map(r => `<tr${r.act ? ` tabindex="0" class="click" ${r.act}` : ''}><td>${fdateShort(r.date)}</td><td>${esc(r.what)}<span class="sub">${esc(r.sub || '')}</span></td><td class="n">${r.amt > 0 ? esc(fmtAcc(r.amt, x.cur)) : ''}</td><td class="n">${r.amt < 0 ? esc(fmtAcc(-r.amt, x.cur)) : ''}</td><td class="n">${esc(fmtAcc(r.run, x.cur))}</td></tr>`).join('')}
        <tr><td>${a.openingDate ? fdateShort(a.openingDate) : ''}</td><td>Opening balance</td><td class="n"></td><td class="n"></td><td class="n">${esc(fmtAcc(+a.opening || 0, x.cur))}</td></tr>
        </tbody></table></div>${lines.length > 200 ? `<p class="hint">Showing the latest 200 of ${lines.length}.</p>` : ''}</div>
        ${st.edit ? `<div class="sect"><h3>Edit account</h3>${form}</div>` : ''}`;
    },
    foot: () => id && !st.edit
      ? `<button type="button" class="btn ghost" data-act="edit">Edit account</button><span class="spacer"></span>${['cash', 'safe'].includes((S.accounts[id] || {}).type) ? `<button type="button" class="btn" data-act="count">Count cash</button>` : ''}<button type="button" class="btn primary" data-close>Done</button>`
      : `${id ? '<button type="button" class="btn ghost danger" data-act="hide">Hide account</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">${id ? 'Save' : 'Add account'}</button>`,
    acts: {
      edit: () => { st.edit = true; m.render(); },
      count: () => cashCountModal(id),
      hide: async () => { if (await write([{col:'accounts', id, data:{active:false}}], 'Account hidden')) m.close(); },
      save: async () => {
        const name = st.name.trim(); if (!name) return toast('Give the account a name.');
        if (st.opening && isNaN(parseNum(st.opening))) return toast('The amount isn’t a number.');
        const data = {name, opening: num(st.opening), openingDate: st.openingDate || todayStr()};
        if (!id) Object.assign(data, {type: st.type, currency: st.currency, active: true, order: Object.keys(S.accounts).length});
        if (await write([{col:'accounts', id: id || uid(), data}], id ? 'Account saved' : 'Account added')){ if (id){ st.edit = false; m.render(); } else m.close(); }
      }
    }
  });
}
function toAmountOf(st){ const cf = accCur(st.from), ct = accCur(st.to), a = num(st.amount), r = num(st.rate); if (cf === ct) return a; if (!r) return 0; return cf === 'GNF' ? Math.round(a / r * 100) / 100 : Math.round(a * r); }
function transferModal(tid){
  if (tid){
    const st = {confirm: false};
    const m = openModal({state: st, live: true, title: () => 'Transfer',
      body: () => { const t = S.transfers[tid]; if (!t) return '<p class="sub">This transfer isn’t available.</p>'; return `<div class="totals">
        <div class="row"><span class="muted">Date</span><span>${fdate(t.date)}</span></div>
        <div class="row"><span class="muted">From ${esc(accName(t.from))}</span><span>${esc(fmtAcc(+t.amount || 0, accCur(t.from)))}</span></div>
        <div class="row"><span class="muted">Into ${esc(accName(t.to))}</span><span>${esc(fmtAcc(+t.toAmount || 0, accCur(t.to)))}</span></div>
        ${+t.rate ? `<div class="row"><span class="muted">Rate</span><span>${money(t.rate)} GNF for 1 USD</span></div>` : ''}
        ${+t.fee ? `<div class="row"><span class="muted">Fee</span><span>${esc(fmtAcc(+t.fee, accCur(t.from)))}</span></div>` : ''}
        ${t.note ? `<div class="row"><span class="muted">Note</span><span>${esc(t.note)}</span></div>` : ''}
        <div class="row"><span class="muted">Recorded by</span><span>${esc(staffName(t.by))}</span></div>
        ${t.void ? '<p class="errline">Cancelled</p>' : ''}</div>`; },
      foot: () => { const t = S.transfers[tid]; if (!t || t.void) return '<span class="spacer"></span><button type="button" class="btn primary" data-close>Done</button>';
        return st.confirm ? confirmBar('Cancel this transfer? Both balances go back to how they were.', 'voidT', 'Cancel transfer') : '<button type="button" class="btn ghost danger" data-act="ask">Cancel transfer</button><span class="spacer"></span><button type="button" class="btn primary" data-close>Done</button>'; },
      acts: { ask: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
        voidT: async () => { if (await write([{col:'transfers', id: tid, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Transfer cancelled')) m.close(); } }
    });
    return;
  }
  const list = accList(), pick = (k, i) => (list.find(([x]) => x === k) || list[i] || list[0] || [''])[0];
  const st = {from: pick('cash', 0), to: pick('bank', 1), amount:'', rate:'', fee:'', date: todayStr(), note:''};
  const m = openModal({state: st, live: true, title: () => 'Move money between accounts',
    body: () => {
      const cf = accCur(st.from), ct = accCur(st.to), fx = cf !== ct;
      if (fx && !st.ratePrefilled && !st.rate && curRate()){ st.rate = String(curRate()); st.ratePrefilled = true; }
      const recv = toAmountOf(st);
      return `<div class="form">
        <div class="field"><label for="tr-from">From</label>${accSelect('tr-from', 'from', st.from, {usd: true, rr: true, only: () => true})}</div>
        <div class="field"><label for="tr-to">Into</label>${accSelect('tr-to', 'to', st.to, {usd: true, rr: true, only: () => true})}</div>
        <div class="field"><label for="tr-amt">Amount taken out (${cf})</label><input id="tr-amt" class="inp n" inputmode="decimal" value="${esc(st.amount)}" data-bind="amount" data-rr placeholder="0"></div>
        ${fx ? `<div class="field"><label for="tr-rate">Rate: GNF for 1 USD</label><input id="tr-rate" class="inp n" inputmode="decimal" value="${esc(st.rate)}" data-bind="rate" data-rr placeholder="e.g. 8650"><span class="hint">${recv ? `${esc(accName(st.to))} receives ${esc(fmtAcc(recv, ct))}. ` : ''}${esc(rateNote())}</span></div>` : ''}
        <div class="field"><label for="tr-fee">Fee (${cf}) <span class="hint">(optional)</span></label><input id="tr-fee" class="inp n" inputmode="decimal" value="${esc(st.fee)}" data-bind="fee" placeholder="0"><span class="hint">Withdrawal or bank charge; counted as an expense</span></div>
        <div class="field"><label for="tr-date">Date</label><input id="tr-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
        <div class="field full"><label for="tr-note">Note</label><input id="tr-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="e.g. Deposit at the bank, dollars for the container"></div>
      </div>`;
    },
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Record transfer</button>',
    acts: { save: async () => {
      if (!st.from || !st.to || st.from === st.to) return toast('Pick two different accounts.');
      const a = num(st.amount); if (!(a > 0)) return toast('Enter the amount moved.');
      const fx = accCur(st.from) !== accCur(st.to);
      if (fx && !(num(st.rate) > 0)) return toast('Enter the exchange rate.');
      if (st.fee && isNaN(parseNum(st.fee))) return toast('The fee isn’t a number.');
      if (await write([{col:'transfers', id: uid(), merge:false, data:{date: st.date || todayStr(), from: st.from, to: st.to, amount: a, toAmount: toAmountOf(st), rate: fx ? num(st.rate) : 0, fee: num(st.fee), note: st.note.trim(), by: S.email, at: nowIso()}}], 'Transfer recorded')) m.close();
    } }
  });
}
function equityModal(qid){
  if (qid){
    const st = {confirm: false};
    const m = openModal({state: st, live: true, title: () => 'Owner money',
      body: () => { const q = S.equity[qid]; if (!q) return '<p class="sub">Not available.</p>'; return `<div class="totals">
        <div class="row"><span class="muted">${q.kind === 'out' ? 'Owner took money out' : 'Owner put money in'}</span><span>${esc(fmtAcc(+q.amount || 0, accCur(q.accountId)))}</span></div>
        <div class="row"><span class="muted">Account</span><span>${esc(accName(q.accountId))}</span></div>
        <div class="row"><span class="muted">Date</span><span>${fdate(q.date)}</span></div>
        ${q.note ? `<div class="row"><span class="muted">Note</span><span>${esc(q.note)}</span></div>` : ''}
        <div class="row"><span class="muted">Recorded by</span><span>${esc(staffName(q.by))}</span></div>
        ${q.void ? '<p class="errline">Cancelled</p>' : ''}</div>`; },
      foot: () => { const q = S.equity[qid]; if (!q || q.void) return '<span class="spacer"></span><button type="button" class="btn primary" data-close>Done</button>';
        return st.confirm ? confirmBar('Cancel this entry? The account balance goes back to how it was.', 'voidQ', 'Cancel entry') : '<button type="button" class="btn ghost danger" data-act="ask">Cancel entry</button><span class="spacer"></span><button type="button" class="btn primary" data-close>Done</button>'; },
      acts: { ask: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
        voidQ: async () => { if (await write([{col:'equity', id: qid, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Entry cancelled')) m.close(); } }
    });
    return;
  }
  const st = {kind: 'out', accountId: defaultAcc(), amount: '', date: todayStr(), note: ''};
  const m = openModal({state: st, live: true, title: () => 'Owner money',
    body: () => `<div class="form">
      <div class="field full"><div class="seg" role="group">${[['out', 'Owner takes money out'], ['in', 'Owner puts money in']].map(([v, l]) => `<button type="button" data-act="kind" data-v="${v}" aria-pressed="${st.kind === v}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="eq-acc">${st.kind === 'out' ? 'Taken from' : 'Put into'}</label>${accSelect('eq-acc', 'accountId', st.accountId, {usd: true, rr: true, only: () => true})}</div>
      <div class="field"><label for="eq-amt">Amount (${accCur(st.accountId)})</label><input id="eq-amt" class="inp n" inputmode="decimal" value="${esc(st.amount)}" data-bind="amount" placeholder="0"></div>
      <div class="field"><label for="eq-date">Date</label><input id="eq-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
      <div class="field full"><label for="eq-note">Note</label><input id="eq-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="${st.kind === 'out' ? 'e.g. Family expenses, school fees' : 'e.g. Money added to buy stock'}"></div>
    </div><p class="hint">This isn’t an expense or a sale, so profit in Reports stays correct. The account balance changes.</p>`,
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save</button>',
    acts: {
      kind: el => { st.kind = el.dataset.v; m.render(); },
      save: async () => {
        const a = num(st.amount); if (!(a > 0)) return toast('Enter the amount.');
        if (!st.accountId) return toast('Pick an account.');
        if (await write([{col:'equity', id: uid(), merge:false, data:{date: st.date || todayStr(), kind: st.kind, accountId: st.accountId, amount: a, note: st.note.trim(), by: S.email, at: nowIso()}}], st.kind === 'out' ? 'Withdrawal recorded' : 'Money added')) m.close();
      }
    }
  });
}
function cashCountModal(accId){
  const cashAccs = accList(a => ['cash', 'safe'].includes(a.type));
  if (!cashAccs.length) return toast('Add a cash or safe account first.');
  const st = {accountId: accId && S.accounts[accId] ? accId : cashAccs[0][0], counted: '', note: ''};
  const m = openModal({state: st, live: true, title: () => 'Count the cash',
    body: () => {
      const x = D.acc[st.accountId] || {bal: 0, cur: 'GNF'}, cur = x.cur;
      const has = st.counted !== '' && !isNaN(parseNum(st.counted)), diff = has ? Math.round((num(st.counted) - x.bal) * 100) / 100 : 0;
      return `<div class="form">
        <div class="field"><label for="cc-acc">Account</label>${accSelect('cc-acc', 'accountId', st.accountId, {usd: true, rr: true, only: a => ['cash', 'safe'].includes(a.type)})}</div>
        <div class="field"><label for="cc-amt">Cash counted (${cur})</label><input id="cc-amt" class="inp n" inputmode="decimal" value="${esc(st.counted)}" data-bind="counted" data-rr placeholder="0"></div>
        <div class="field full"><label for="cc-note">Note</label><input id="cc-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="Optional"></div>
      </div>
      <div class="totals">
        <div class="row"><span class="muted">The app expects</span><span>${esc(fmtAcc(x.bal, cur))}</span></div>
        ${has ? `<div class="row grand"><span>${Math.abs(diff) < 0.005 ? 'It matches' : diff < 0 ? 'Short by' : 'Over by'}</span><span class="${diff < 0 ? 'errline' : ''}">${Math.abs(diff) < 0.005 ? '✓' : esc(fmtAcc(Math.abs(diff), cur))}</span></div>` : ''}
      </div>
      <p class="hint">Saving sets the balance to what you counted. A difference is recorded so you can see it in the statement${cur === 'GNF' ? ' and in Expenses' : ''}.</p>`;
    },
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save count</button>',
    acts: { save: async () => {
      if (st.counted === '' || isNaN(parseNum(st.counted))) return toast('Enter the amount you counted.');
      const x = D.acc[st.accountId] || {bal: 0, cur: 'GNF'}, counted = num(st.counted), diff = Math.round((counted - x.bal) * 100) / 100;
      const msg = Math.abs(diff) < 0.005 ? 'Count saved. It matches.' : `Count saved. ${diff < 0 ? 'Short' : 'Over'} by ${fmtAcc(Math.abs(diff), x.cur)}`;
      if (await write([{col:'cashcounts', id: uid(), merge:false, data:{date: todayStr(), accountId: st.accountId, expected: Math.round(x.bal * 100) / 100, counted, diff, note: st.note.trim(), by: S.email, at: nowIso()}}], msg)) m.close();
    } }
  });
}

VIEWS.team = function(){
  const t = UI.team;
  const members = Object.entries(S.members).sort((a, b) => (a[1].role === 'owner' ? -1 : 0) - (b[1].role === 'owner' ? -1 : 0) || String(a[0]).localeCompare(String(b[0])));
  const used = usedCodes();
  const nextCode = LETTERS.find(l => !used.has(l)) || '';
  const link = location.origin + location.pathname;
  return header('Setup', 'Team') +
  `<section class="panel"><div class="panel-h"><h2>Add a team member</h2></div><div class="panel-b stack"><div class="form">
    <div class="field"><label for="tm-email">Their email</label><input id="tm-email" class="inp" type="email" value="${esc(t.email)}" data-bind="team.email" placeholder="name@gmail.com" autocomplete="off"></div>
    <div class="field"><label for="tm-name">Name</label><input id="tm-name" class="inp" value="${esc(t.name)}" data-bind="team.name" placeholder="Shown on sales and reports"></div>
    <div class="field"><label for="tm-code">Invoice letter</label><input id="tm-code" class="inp" maxlength="2" value="${esc(t.code)}" data-bind="team.code" placeholder="${esc(nextCode)}"><span class="hint">Their invoices are numbered F-${esc((t.code || nextCode || 'B').toUpperCase())}-00001, so two phones offline never clash</span></div>
  </div><div><button type="button" class="btn primary" data-act="addMember">${ic('plus')}Add to team</button></div></div></section>
  <section class="panel"><div class="panel-h"><h2>People with access</h2></div>${members.length ? `<div class="list">${members.map(([e, m]) => `<button type="button" class="li" data-act="editMember" data-id="${esc(e)}"><span class="nm"><b>${esc(m.name || e.split('@')[0])}</b><span class="sub">${esc(e)}</span></span><span class="amt"><span class="pill ${m.active === false ? 'bad' : m.role === 'owner' ? 'accent' : 'good'}">${m.active === false ? 'Removed' : m.role === 'owner' ? 'Owner' : 'Staff'}</span><br><span class="sub mono">Invoices ${esc((m.code || 'A').toUpperCase())}</span></span></button>`).join('')}</div>` : emptyBox('Only you so far', 'Add the people who sell or buy for the shop.')}</section>
  <section class="panel"><div class="panel-h"><h2>How staff get in</h2></div><div class="panel-b stack">
    <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>Add their email above.</li><li>Send them the app link: <b class="mono" style="overflow-wrap:anywhere">${esc(link)}</b> <button type="button" class="btn ghost sm" data-act="copyLink">${ic('copy')}Copy</button></li><li>They open it and tap <b>Continue with Google</b>, or create an account with that same email and confirm the link we email them.</li><li>On their phone, they can add it to the home screen to open it like an app.</li></ol>
  </div></section>`;
};

VIEWS.shop = function(){
  if (!UI.shop) UI.shop = {...shopInfo(), invoiceStart: S.settings.invoiceStart != null ? String(S.settings.invoiceStart) : '', invoiceStyle: S.settings.invoiceStyle || 'simple'};
  const f = UI.shop;
  const counts = `${Object.keys(S.products).length} products · ${D.sales.length} invoices · ${Object.keys(S.purchases).length} purchases · ${Object.keys(S.customers).length} customers`;
  const startN = parseInt(f.invoiceStart, 10) || 1, nextShown = invNo(Math.max((D.maxNoBy[mySeries()] || 0) + 1, startN), mySeries());
  return header('Setup', 'Shop settings') +
  `<section class="panel"><div class="panel-h"><h2>Invoice details</h2><span class="sub">Printed on every invoice, in French</span></div><div class="panel-b stack"><div class="form">
    <div class="field"><label for="sh-name">Shop name</label><input id="sh-name" class="inp" value="${esc(f.shopName)}" data-bind="shop.shopName"></div>
    <div class="field"><label for="sh-tag">Line under the name</label><input id="sh-tag" class="inp" value="${esc(f.tagline)}" data-bind="shop.tagline"></div>
    <div class="field full"><label for="sh-addr">Address</label><input id="sh-addr" class="inp" value="${esc(f.address)}" data-bind="shop.address"></div>
    <div class="field"><label for="sh-phone">Phone numbers</label><input id="sh-phone" class="inp" value="${esc(f.phone)}" data-bind="shop.phone"><span class="hint">Shown in the blue band, after “Tél :”</span></div>
    <div class="field"><label for="sh-mail">Email</label><input id="sh-mail" class="inp" type="email" value="${esc(f.email)}" data-bind="shop.email"></div>
    <div class="field"><label for="sh-city">City</label><input id="sh-city" class="inp" value="${esc(f.city)}" data-bind="shop.city"><span class="hint">“${esc(f.city || 'Conakry')}, le ${frDate(todayStr())}”</span></div>
    <div class="field"><label for="sh-start">Number invoices from</label><input id="sh-start" class="inp n" inputmode="numeric" value="${esc(f.invoiceStart)}" data-bind="shop.invoiceStart" data-rr placeholder="1"><span class="hint">Your next invoice: ${esc(nextShown)}. Use this to continue after the paper book.</span></div>
    <div class="field"><label for="sh-style">Invoice design</label><select id="sh-style" class="inp" data-bind="shop.invoiceStyle">${opt('simple', 'Simple, black only (saves ink)', f.invoiceStyle !== 'paper')}${opt('paper', 'Blue, like the paper book', f.invoiceStyle === 'paper')}</select></div>
    <div class="field full"><label for="sh-foot">Note at the bottom</label><input id="sh-foot" class="inp" value="${esc(f.footer)}" data-bind="shop.footer"><span class="hint">Printed after “NB :”</span></div>
  </div><div><button type="button" class="btn primary" data-act="saveShop">Save invoice details</button></div></div></section>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>Your account</h2></div><div class="panel-b stack">
      <p>Signed in as <b>${esc(S.email)}</b>${S.isOwner ? ' (owner)' : ''}. Your invoices use the letter <b>${esc(mySeries())}</b>.</p>
      <p class="hint">App version ${esc(APP_VERSION)}</p>
      ${S.installEvt ? `<div><button type="button" class="btn" data-act="install">${ic('download')}Install as an app</button></div>` : `<p class="sub">To open it like an app: on Android, Chrome menu → <b>Add to Home screen</b>. On iPhone, Safari → Share → <b>Add to Home Screen</b>.</p>`}
      <div><button type="button" class="btn" data-act="signOut">${ic('logout')}Sign out</button></div>
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Backup & export</h2></div><div class="panel-b stack">
      <p class="sub">${counts}</p>
      <div class="inline"><button type="button" class="btn" data-act="backupJson">${ic('download')}Full backup (.json)</button><button type="button" class="btn" data-act="exportSales">${ic('download')}Sales lines (.csv)</button><button type="button" class="btn" data-act="exportStock">${ic('download')}Stock list (.csv)</button></div>
      <p class="hint">CSV files open in Excel or Google Sheets. Firebase keeps the data safe online; a monthly backup on a computer is a good extra copy.</p>
    </div></section>
  </div>
  ${S.isOwner ? `<section class="panel"><div class="panel-h"><h2>Bring in records from the Claude version</h2></div><div class="panel-b stack">
      <p class="sub">Choose the backup file from the earlier version of this app. Products, customers, suppliers, purchases, sales, payments and expenses are copied in with the same numbers. Importing the same file twice doesn’t create duplicates. Do this before recording new sales, so invoice numbers continue in order.</p>
      <div class="inline"><label class="btn" for="imp-file">${ic('upload')}Choose backup file</label><input id="imp-file" type="file" accept=".json,application/json" hidden></div>
      ${UI.importInfo ? `<p class="sub">${esc(UI.importInfo)}</p>` : ''}
    </div></section>` : ''}`;
};

/* ================= modals ================= */
const MODALS = [], MODAL_BY_EL = new Map();
function openModal(cfg){
  const m = Object.assign({state:{}, acts:{}, ins:{}}, cfg);
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  scrim.innerHTML = `<div class="modal${cfg.wide ? ' wide' : cfg.mid ? ' mid' : ''}" role="dialog" aria-modal="true" tabindex="-1"><div class="modal-h"><h2></h2><button type="button" class="btn ghost iconbtn" data-close aria-label="Close">${ic('x')}</button></div><div class="modal-b"></div><div class="modal-f"></div></div>`;
  m.el = scrim; m.hEl = scrim.querySelector('h2'); m.bEl = scrim.querySelector('.modal-b'); m.fEl = scrim.querySelector('.modal-f');
  m.render = () => { const top = scrim.scrollTop; withFocus(scrim, () => { m.hEl.textContent = m.title(); m.bEl.innerHTML = m.body(); const f = m.foot ? m.foot() : ''; m.fEl.innerHTML = f; m.fEl.hidden = !f; }); scrim.scrollTop = top; };
  m.close = () => closeModal(m);
  $('#modals').appendChild(scrim); MODALS.push(m); MODAL_BY_EL.set(scrim, m); document.body.classList.add('locked');
  m.render();
  scrim.querySelector('.modal').focus({preventScroll:true});
  return m;
}
function closeModal(m){
  if (!m) return;
  const i = MODALS.indexOf(m); if (i >= 0) MODALS.splice(i, 1);
  MODAL_BY_EL.delete(m.el); m.el.remove();
  if (m.onClose) m.onClose();
  if (!MODALS.length) document.body.classList.remove('locked');
}
const closeAll = () => { while (MODALS.length) closeModal(MODALS[MODALS.length - 1]); };

function moreSheet(){
  const items = [['rates','Dollar rate','dollar'], ['sales','Sales & invoices','receipt'], ['customers','Customers & credit','users'], ['suppliers','Suppliers','store'], ['expenses','Expenses','wallet'], ...(S.isOwner ? [['money','Money accounts','bank']] : []), ['reports','Reports','chart'], ...(S.isOwner ? [['team','Team','team']] : []), ['shop','Shop settings','sliders']];
  openModal({title: () => 'More', live: true, body: () => `<div class="navgroup">${items.map(([r, l, i]) => `<button type="button" class="navlink" data-act="go" data-to="${r}"${UI.view === r ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</div><div class="sync"><span class="dot ${syncInfo()[0]}"></span>${syncInfo()[1]}</div><div class="sync"><span>${esc(S.email)}${S.isOwner ? ' · owner' : ''} · version ${esc(APP_VERSION)}</span></div>`});
}

function confirmBar(text, yesAct, yesLabel){ return `<div class="confirmbar"><p>${text}</p><button type="button" class="btn ghost" data-act="confirmNo">Keep it</button><button type="button" class="btn danger solid" data-act="${yesAct}">${yesLabel}</button></div>`; }

/* ----- product ----- */
function productModal(id, o = {}){
  const src = id ? S.products[id] : null;
  const pid = id || uid();
  const st = src ? {name:src.name || '', sku:src.sku || '', category:src.category || '', brand:src.brand || '', unit:src.unit || 'piece', price: src.price != null ? String(src.price) : '', cost: src.cost ? String(src.cost) : '', min: src.min ? String(src.min) : '', note:src.note || '', special: !!src.special, confirm:false}
                 : {name:o.name || '', sku:'', category:o.category || UI.stockCat || '', brand:'', unit: o.special ? 'lot' : 'piece', price:'', cost:'', min:'', note:'', openQty:'', special: !!o.special, confirm:false};
  const m = openModal({
    state: st, live: !!id, wide: !!id,
    title: () => id ? (st.name || 'Product') : 'Add product',
    body: () => {
      const x = D.prod[pid] || {stock:0, avg:0, transit:0, moves:0, sold:0};
      const form = `<div class="form">
        <div class="field full"><label for="pm-name">Product name</label><input id="pm-name" class="inp" value="${esc(st.name)}" data-bind="name" placeholder="e.g. Fridge LG 260 L, or PVC pipe 32 mm"></div>
        <div class="field"><label for="pm-cat">Category</label><input id="pm-cat" class="inp" list="pm-cats" value="${esc(st.category)}" data-bind="category" placeholder="Appliances or Plumbing"><datalist id="pm-cats">${allCats().map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="field"><label for="pm-brand">Brand</label><input id="pm-brand" class="inp" value="${esc(st.brand)}" data-bind="brand" placeholder="LG, Samsung, Grohe…"></div>
        <div class="field"><label for="pm-sku">Code / model</label><input id="pm-sku" class="inp" value="${esc(st.sku)}" data-bind="sku" placeholder="Optional"></div>
        <div class="field"><label for="pm-unit">Sold by</label><select id="pm-unit" class="inp" data-bind="unit">${opts(UNITS, st.unit)}</select></div>
        <div class="field full"><label class="check" for="pm-special"><input type="checkbox" id="pm-special" data-bind="special" data-in="special"${st.special ? ' checked' : ''}><span><b>Special order</b> — bought at the market for a client, no stock kept</span></label><span class="hint">Each time you sell it you type what you paid and which account paid. Good for “Plomberie – divers”.</span></div>
        ${st.special ? '' : `<div class="field"><label for="pm-price">Sale price (GNF)</label><input id="pm-price" class="inp n" inputmode="decimal" value="${esc(st.price)}" data-bind="price" data-sa placeholder="0"></div>
        <div class="field"><label for="pm-cost">Cost price (GNF)</label><input id="pm-cost" class="inp n" inputmode="decimal" value="${esc(st.cost)}" data-bind="cost" data-sa placeholder="0"><span class="hint">Used until you record a purchase of it</span></div>
        <div class="field"><label for="pm-min">Reorder when stock reaches</label><input id="pm-min" class="inp n" inputmode="decimal" value="${esc(st.min)}" data-bind="min" placeholder="0"></div>
        ${id ? '' : `<div class="field"><label for="pm-open">Quantity in stock now</label><input id="pm-open" class="inp n" inputmode="decimal" value="${esc(st.openQty)}" data-bind="openQty" placeholder="0"><span class="hint">Recorded as opening stock at the cost price</span></div>`}`}
        <div class="field full"><label for="pm-note">Note</label><input id="pm-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="Size, color, warranty…"></div>
      </div>`;
      if (!id) return form;
      const cur = S.products[pid] || src;
      if (cur.special){
        const ls = []; for (const s of D.sales) if (!s.void) for (const i of s.items) if (i.productId === pid) ls.push(i);
        const rev = sum(ls, i => i.qty * i.price), cost = sum(ls, i => i.qty * i.cost);
        return `<section class="tiles">
          ${tileRaw('Stock', 'Not kept', 'special order')}
          ${tileRaw('Times sold', String(ls.length), `${qtyFmt(x.sold)} ${esc(cur.unit || 'lot')} in total`)}
          ${tile('Sold for', rev, 'all invoices')}
          ${tile('Profit', rev - cost, rev ? `${pct((rev - cost) / rev)} margin` : 'nothing sold yet')}
        </section>
        ${form}
        <div class="sect"><div class="sect-h"><h3>Sales</h3></div>${movements(pid)}</div>`;
      }
      const mg = (+cur.price > 0 && x.avg > 0) ? (cur.price - x.avg) / cur.price : null;
      return `<section class="tiles">
          ${tileRaw('In stock', `${qtyFmt(x.stock)}<small>${esc((cur.unit || 'piece').toUpperCase())}</small>`, x.transit ? qtyFmt(x.transit) + ' on the way' : 'none on the way')}
          ${tile('Average cost', x.avg, 'landed, per unit')}
          ${tile('Stock value', Math.max(0, x.stock) * x.avg, 'at cost')}
          ${tileRaw('Margin', mg == null ? '—' : pct(mg), `${qtyFmt(x.sold)} sold in total`)}
        </section>
        ${form}
        <div class="sect"><div class="sect-h"><h3>Stock movements</h3><button type="button" class="btn sm" data-act="adjustThis">${ic('adjust')}Adjust stock</button></div>${movements(pid)}</div>`;
    },
    foot: () => st.confirm ? confirmBar('Delete this product?', 'del', 'Delete product') :
      `${id ? ((D.prod[pid] || {}).moves ? `<button type="button" class="btn ghost" data-act="toggleActive">${(S.products[pid] || src).active === false ? 'Show in lists again' : 'Hide from lists'}</button>` : `<button type="button" class="btn ghost danger" data-act="askDel">Delete</button>`) : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">${id ? 'Save changes' : 'Add product'}</button>`,
    acts: {
      save: async () => {
        const name = st.name.trim(); if (!name) return toast('Give the product a name.');
        const price = parseNum(st.price), cost = parseNum(st.cost), min = parseNum(st.min);
        if (st.price && isNaN(price)) return toast('The sale price isn’t a number.');
        if (st.cost && isNaN(cost)) return toast('The cost price isn’t a number.');
        // The same model can exist under different brands: only name + brand + model together must be unique.
        const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
        const dup = Object.entries(S.products).find(([k, p]) => k !== pid && same(p.name, name) && same(p.sku, st.sku) && same(p.brand, st.brand));
        if (dup) return toast(`“${[name, st.brand.trim(), st.sku.trim()].filter(Boolean).join(' · ')}” already exists${dup[1].active === false ? ' (hidden)' : ''}.`);
        const base = S.products[pid] || src || {};
        const doc = {name, sku: st.sku.trim(), category: st.category.trim(), brand: st.brand.trim(), unit: st.unit, price: isNaN(price) || st.special ? 0 : price, cost: isNaN(cost) || st.special ? 0 : cost, min: isNaN(min) || st.special ? 0 : min, note: st.note.trim(), special: !!st.special, active: base.active !== false, editedAt: nowIso()};
        if (!src){ doc.createdAt = nowIso(); doc.by = S.email; }
        const ops = [{col:'products', id:pid, data:doc}];
        const open = num(st.openQty);
        if (!src && open > 0 && !st.special) ops.push({col:'adjustments', id:uid(), merge:false, data:{date: todayStr(), productId: pid, qty: open, unitCost: doc.cost || 0, reason: 'Opening stock', note: '', by: S.email, at: nowIso()}});
        if (await write(ops, src ? 'Product saved' : 'Product added')){ m.close(); if (o.onSaved) o.onSaved(pid, doc); }
      },
      askDel: () => { st.confirm = true; m.render(); },
      confirmNo: () => { st.confirm = false; m.render(); },
      del: async () => { if (await write([{col:'products', id:pid, data:{deleted:true}}], 'Product deleted')) m.close(); },
      toggleActive: async () => { const cur = S.products[pid] || src; await write([{col:'products', id:pid, data:{active: cur.active === false}}], cur.active === false ? 'Shown in lists again' : 'Hidden from lists'); m.close(); },
      adjustThis: () => adjustModal(pid)
    },
    ins: { special: () => { if (st.special && st.unit === 'piece') st.unit = 'lot'; else if (!st.special && st.unit === 'lot') st.unit = 'piece'; m.render(); } }
  });
}
function movements(pid){
  const ev = [];
  for (const [id, p] of Object.entries(S.purchases)) for (const l of (D.pc[id] ? D.pc[id].lines : [])) if (l.productId === pid)
    ev.push({date: p.status === 'received' ? (p.receivedDate || p.date) : p.date, what: `${p.kind === 'import' ? 'Import' : 'Purchase'} ${p.ref || ''}`.trim(), sub: (S.suppliers[p.supplierId] || {}).name || '', qty: l.qty, transit: p.status !== 'received', cost: l.unit, act: `data-act="openPurchase" data-id="${id}"`});
  for (const a of Object.values(S.adjustments)) if (a.productId === pid) ev.push({date: a.date, what: a.reason || 'Adjustment', sub: a.note || '', qty: +a.qty || 0});
  for (const s of D.sales) if (!s.void) for (const i of s.items) if (i.productId === pid) ev.push({date: s.date, what: `Sale ${invNoS(s)}`, sub: custName(s), qty: -i.qty, price: i.price, act: `data-act="openSale" data-id="${s.id}"`});
  ev.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!ev.length) return `<p class="sub">No movements yet.</p>`;
  return `<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Movement</th><th class="n">Qty</th><th class="n hide-sm">Unit GNF</th></tr></thead><tbody>${ev.slice(0, 30).map(e => `<tr${e.act ? ` tabindex="0" class="click" ${e.act}` : ''}><td>${fdateShort(e.date)}</td><td>${esc(e.what)}${e.transit ? ' <span class="pill warn">In transit</span>' : ''}<span class="sub">${esc(e.sub)}</span></td><td class="n">${e.transit ? '' : e.qty > 0 ? '+' : ''}${qtyFmt(e.qty)}</td><td class="n hide-sm">${e.cost ? money(e.cost) : e.price ? money(e.price) : ''}</td></tr>`).join('')}</tbody></table></div>${ev.length > 30 ? `<p class="hint">Showing the latest 30 of ${ev.length}.</p>` : ''}`;
}

/* ----- stock adjustment ----- */
function adjustModal(productId){
  const st = {label: productId ? prodLabel(productId) : '', productId: productId || '', reason: 'Stock count correction', qty:'', counted:'', unitCost:'', date: todayStr(), note:''};
  const m = openModal({
    state: st, live: true,
    title: () => 'Adjust stock',
    body: () => {
      const x = D.prod[st.productId] || {stock:0, avg:0}; const p = S.products[st.productId];
      const r = st.reason;
      return `<div class="form">
        <div class="field full"><label for="ad-prod">Product</label><input id="ad-prod" class="inp" list="ad-prods" value="${esc(st.label)}" data-in="adProd" placeholder="Start typing a product name" autocomplete="off"><datalist id="ad-prods">${sortedBy(S.products).filter(([, q]) => q.active !== false).map(([k]) => `<option value="${esc(prodLabel(k))}">`).join('')}</datalist>${p ? `<span class="hint">${qtyU(x.stock, p.unit)} recorded in stock now</span>` : ''}</div>
        <div class="field full"><label for="ad-reason">Reason</label><select id="ad-reason" class="inp" data-bind="reason" data-rr>${opts(ADJ_REASONS, r)}</select></div>
        ${r === 'Stock count correction' ? `<div class="field"><label for="ad-count">Quantity counted on the shelf</label><input id="ad-count" class="inp n" inputmode="decimal" value="${esc(st.counted)}" data-bind="counted" data-rr placeholder="0">${p && st.counted !== '' ? `<span class="hint">Change: ${num(st.counted) - x.stock > 0 ? '+' : ''}${qtyFmt(num(st.counted) - x.stock)}</span>` : ''}</div>`
          : `<div class="field"><label for="ad-qty">${['Damaged or lost', 'Own use', 'Other decrease'].includes(r) ? 'Quantity to remove' : 'Quantity to add'}</label><input id="ad-qty" class="inp n" inputmode="decimal" value="${esc(st.qty)}" data-bind="qty" placeholder="0"></div>`}
        ${['Opening stock', 'Other increase'].includes(r) ? `<div class="field"><label for="ad-cost">Cost per unit (GNF)</label><input id="ad-cost" class="inp n" inputmode="decimal" value="${esc(st.unitCost)}" data-bind="unitCost" placeholder="${p && p.cost ? esc(String(p.cost)) : '0'}"></div>` : ''}
        <div class="field"><label for="ad-date">Date</label><input id="ad-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
        <div class="field full"><label for="ad-note">Note</label><input id="ad-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="Optional"></div>
      </div>`;
    },
    foot: () => `<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save adjustment</button>`,
    ins: { adProd: el => { st.label = el.value; const id = findProdByLabel(el.value); if (id !== st.productId){ st.productId = id; m.render(); } } },
    acts: {
      save: async () => {
        if (!st.productId) return toast('Pick a product from the list.');
        const x = D.prod[st.productId] || {stock:0}; const p = S.products[st.productId] || {};
        let q;
        if (st.reason === 'Stock count correction'){ if (st.counted === '' || isNaN(parseNum(st.counted))) return toast('Enter the quantity you counted.'); q = r3(num(st.counted) - x.stock); if (!q) return toast('The count matches the stock. Nothing to change.'); }
        else { q = num(st.qty); if (!(q > 0)) return toast('Enter a quantity above zero.'); if (['Damaged or lost', 'Own use', 'Other decrease'].includes(st.reason)) q = -q; }
        const unitCost = q > 0 ? (st.unitCost !== '' ? num(st.unitCost) : (+p.cost || (x.avg || 0))) : 0;
        if (await write([{col:'adjustments', id:uid(), merge:false, data:{date: st.date || todayStr(), productId: st.productId, qty: q, unitCost, reason: st.reason, note: st.note.trim(), by: S.email, at: nowIso()}}], 'Stock adjusted')) m.close();
      }
    }
  });
}

/* ----- customer ----- */
function customerForm(id, onSaved){
  const src = id ? S.customers[id] : null; const cid = id || uid();
  const st = {name: src ? src.name : '', phone: src ? src.phone || '' : '', address: src ? src.address || '' : '', note: src ? src.note || '' : '', confirm:false};
  const used = id && D.sales.some(s => s.customerId === id);
  const m = openModal({
    state: st, title: () => id ? 'Edit customer' : 'Add customer',
    body: () => `<div class="form">
      <div class="field full"><label for="cf-name">Name</label><input id="cf-name" class="inp" value="${esc(st.name)}" data-bind="name" placeholder="Person or company"></div>
      <div class="field"><label for="cf-phone">Phone</label><input id="cf-phone" class="inp" inputmode="tel" value="${esc(st.phone)}" data-bind="phone" placeholder="+224 …"></div>
      <div class="field"><label for="cf-addr">Area / address</label><input id="cf-addr" class="inp" value="${esc(st.address)}" data-bind="address" placeholder="Kaloum, Ratoma…"></div>
      <div class="field full"><label for="cf-note">Note</label><input id="cf-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="Plumber, contractor, credit limit…"></div></div>`,
    foot: () => st.confirm ? confirmBar('Delete this customer?', 'del', 'Delete customer') : `${id && !used ? '<button type="button" class="btn ghost danger" data-act="askDel">Delete</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">${id ? 'Save' : 'Add customer'}</button>`,
    acts: {
      save: async () => {
        const name = st.name.trim(); if (!name) return toast('Enter the customer’s name.');
        const doc = {name, phone: st.phone.trim(), address: st.address.trim(), note: st.note.trim(), editedAt: nowIso()};
        if (!src) doc.createdAt = nowIso();
        if (await write([{col:'customers', id:cid, data:doc}], id ? 'Customer saved' : 'Customer added')){ m.close(); if (onSaved) onSaved(cid); }
      },
      askDel: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
      del: async () => { if (await write([{col:'customers', id:cid, data:{deleted:true}}], 'Customer deleted')) closeAll(); }
    }
  });
}
const findCust = name => { const t = String(name || '').trim().toLowerCase(); if (!t) return ''; const e = Object.entries(S.customers).find(([, k]) => String(k.name || '').trim().toLowerCase() === t); return e ? e[0] : ''; };
const OLD_DEBT_HELP = 'What the customer still owed before you started using the app. It’s added to what they owe, but isn’t a sale, isn’t counted in profit and doesn’t change any money account. Their payments settle the oldest debt first.';
function oldDebtModal(customerId){
  const st = {amount: '', date: todayStr(), note: ''};
  const m = openModal({state: st, title: () => `Old debt · ${(S.customers[customerId] || {}).name || ''}`,
    body: () => `<p class="sub">${OLD_DEBT_HELP}</p><div class="form">
      <div class="field"><label for="odm-a">Amount owed (GNF)</label><input id="odm-a" class="inp n" inputmode="decimal" value="${esc(st.amount)}" data-bind="amount" placeholder="0"></div>
      <div class="field"><label for="odm-d">Owed as of</label><input id="odm-d" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
      <div class="field full"><label for="odm-n">Note</label><input id="odm-n" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="e.g. Paper invoice 000312, old notebook"></div></div>`,
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save old debt</button>',
    acts: { save: async () => {
      const a = num(st.amount); if (!(a > 0)) return toast('Enter the amount owed.');
      if (await write([{col:'debts', id: uid(), merge:false, data:{customerId, amount: a, date: st.date || todayStr(), note: st.note.trim(), by: S.email, at: nowIso()}}], `Old debt of ${money(a)} GNF saved`)) m.close();
    } }
  });
}
function oldDebtsBulk(){
  const blank = () => ({name: '', phone: '', amount: '', note: ''});
  const st = {date: todayStr(), rows: [blank(), blank(), blank(), blank(), blank()]};
  const m = openModal({state: st, wide: true, live: true, title: () => 'Old debts from before the app',
    body: () => {
      const filled = st.rows.filter(r => r.name.trim() && num(r.amount) > 0);
      return `<p class="sub">${OLD_DEBT_HELP} Type a name: if it matches a customer already in the app, the debt goes to them; otherwise a new customer is created.</p>
      <div class="field" style="max-width:240px"><label for="od-date">Owed as of</label><input id="od-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
      <datalist id="od-custs">${sortedBy(S.customers).map(([, k]) => `<option value="${esc(k.name)}">`).join('')}</datalist>
      <div class="scroll"><table class="tbl"><thead><tr><th>Customer</th><th>Phone</th><th class="n">Amount owed (GNF)</th><th>Note</th><th></th></tr></thead><tbody>
      ${st.rows.map((r, i) => { const ex = findCust(r.name); return `<tr>
        <td style="min-width:190px"><input id="od-n-${i}" class="inp" list="od-custs" value="${esc(r.name)}" data-bind="rows.${i}.name" data-rr autocomplete="off" aria-label="Customer name">${r.name.trim() ? `<span class="sub">${ex ? 'Already in the app' + ((D.custBal[ex] || 0) > 0.5 ? ` · owes ${money(D.custBal[ex])}` : '') : 'New customer'}</span>` : ''}</td>
        <td style="min-width:140px"><input id="od-p-${i}" class="inp" value="${esc(ex ? (S.customers[ex].phone || '') : r.phone)}" data-bind="rows.${i}.phone"${ex ? ' disabled' : ''} placeholder="+224 …" aria-label="Phone"></td>
        <td style="min-width:140px"><input id="od-a-${i}" class="inp n" inputmode="decimal" value="${esc(r.amount)}" data-bind="rows.${i}.amount" data-rr placeholder="0" aria-label="Amount owed"></td>
        <td style="min-width:160px"><input id="od-x-${i}" class="inp" value="${esc(r.note)}" data-bind="rows.${i}.note" placeholder="e.g. Paper invoice 000312" aria-label="Note"></td>
        <td><button type="button" class="btn ghost sm iconbtn" data-act="rm" data-i="${i}" aria-label="Remove row">${ic('x')}</button></td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="inline" style="justify-content:space-between"><button type="button" class="btn sm" data-act="add">${ic('plus')}Add 5 rows</button><span class="sub">Total <b>${money(sum(filled, r => num(r.amount)))} GNF</b> from ${filled.length} customer${filled.length === 1 ? '' : 's'}</span></div>`;
    },
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save old debts</button>',
    acts: {
      add: () => { for (let i = 0; i < 5; i++) st.rows.push(blank()); m.render(); },
      rm: el => { st.rows.splice(+el.dataset.i, 1); if (!st.rows.length) st.rows.push(blank()); m.render(); },
      save: async () => {
        const rows = st.rows.filter(r => r.name.trim() || String(r.amount).trim());
        if (!rows.length) return toast('Enter at least one customer and the amount they owe.');
        for (const r of rows){
          if (!r.name.trim()) return toast('A row has an amount but no customer name.');
          if (!(num(r.amount) > 0)) return toast(`Enter the amount ${r.name.trim()} owes.`);
        }
        const ops = [], made = {};
        for (const r of rows){
          const key = r.name.trim().toLowerCase();
          let cid = findCust(r.name) || made[key];
          if (!cid){ cid = uid(); made[key] = cid; ops.push({col:'customers', id: cid, merge:false, data:{name: r.name.trim(), phone: r.phone.trim(), address: '', note: '', createdAt: nowIso(), editedAt: nowIso()}}); }
          ops.push({col:'debts', id: uid(), merge:false, data:{customerId: cid, amount: num(r.amount), date: st.date || todayStr(), note: r.note.trim(), by: S.email, at: nowIso()}});
        }
        const total = sum(rows, r => num(r.amount));
        if (await write(ops, `${rows.length} old debt${rows.length === 1 ? '' : 's'} saved · ${money(total)} GNF`)) m.close();
      }
    }
  });
}
function customerDetail(id){
  const st = {pay: {amount:'', method:'Cash', date: todayStr(), note:''}, confirmPay:'', confirmDebt:''};
  const m = openModal({
    state: st, live: true, wide: true,
    title: () => (S.customers[id] || {}).name || 'Customer',
    body: () => {
      const k = S.customers[id]; if (!k) return `<p>This customer was deleted.</p>`;
      const bal = D.custBal[id] || 0;
      const inv = D.sales.filter(s => !s.void && s.customerId === id);
      const pays = D.payments.filter(p => p.customerId === id);
      const olds = D.debts.filter(d => d.customerId === id);
      const rows = [...olds.map(d => ({date: d.date, o: ' ' + String(d.at || ''), kind:'debt', d})), ...inv.map(s => ({date: s.date, o: String(s.at || ''), kind:'inv', s})), ...pays.map(p => ({date: p.date, o: '~' + String(p.at || ''), kind:'pay', p}))]
        .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.o.localeCompare(b.o));
      let run = 0;
      const lines = rows.map(r => {
        if (r.kind === 'debt'){ const d = r.d; run += d.amount; const left = D.invRemain[d.id] || 0;
          return `<tr><td>${fdateShort(r.date)}</td><td>Old debt<span class="sub">${esc(d.note || 'From before the app')}${left > 0.5 && left < d.amount - 0.5 ? ` · ${money(left)} left` : left <= 0.5 ? ' · settled' : ''}</span></td><td class="n">${money(d.amount)}</td><td class="n"></td><td class="n">${money(run)}</td><td class="n">${!S.isOwner ? '' : st.confirmDebt === d.id ? `<span class="inline"><button type="button" class="btn danger solid sm" data-act="voidDebt" data-id="${d.id}">Remove</button><button type="button" class="btn ghost sm" data-act="keepDebt">Keep</button></span>` : `<button type="button" class="btn ghost sm iconbtn" data-act="askDebt" data-id="${d.id}" aria-label="Remove old debt">${ic('x')}</button>`}</td></tr>`; }
        if (r.kind === 'inv'){ run += r.s.total - r.s.paid; return `<tr tabindex="0" class="click" data-act="openSale" data-id="${r.s.id}"><td>${fdateShort(r.date)}</td><td><span class="mono">${invNoS(r.s)}</span><span class="sub">${r.s.paid ? `${money(r.s.paid)} paid at the counter` : 'On credit'}</span></td><td class="n">${money(r.s.total - r.s.paid)}</td><td class="n"></td><td class="n">${money(run)}</td><td></td></tr>`; }
        const p = r.p; if (!p.void) run -= p.amount;
        return `<tr class="${p.void ? 'void' : ''}"><td>${fdateShort(r.date)}</td><td>Payment · ${esc(p.method || '')}<span class="sub">${esc(p.note || '')}</span></td><td class="n"></td><td class="n">${money(p.amount)}</td><td class="n">${p.void ? '' : money(run)}</td><td class="n">${p.void ? '<span class="pill bad">Removed</span>' : st.confirmPay === p.id ? `<span class="inline"><button type="button" class="btn danger solid sm" data-act="voidPay" data-id="${p.id}">Remove</button><button type="button" class="btn ghost sm" data-act="keepPay">Keep</button></span>` : `<button type="button" class="btn ghost sm iconbtn" data-act="askPay" data-id="${p.id}" aria-label="Remove payment">${ic('x')}</button>`}</td></tr>`;
      }).reverse().join('');
      const unpaid = [...olds, ...inv].filter(s => (D.invRemain[s.id] || 0) > 0.5);
      return `<p class="sub">${esc([k.phone, k.address, k.note].filter(Boolean).join(' · ') || 'No contact details')}</p>
        <section class="tiles">
          ${tile('Bought in total', sum(inv, s => s.total), `${inv.length} invoice${inv.length === 1 ? '' : 's'}`)}
          ${tile('Paid in total', sum(inv, s => s.paid) + sum(pays.filter(p => !p.void), p => p.amount), 'at the counter and later')}
          ${tile(bal < -0.5 ? 'Credit in advance' : 'Owes you', Math.abs(bal), `${unpaid.length} unpaid invoice${unpaid.length === 1 ? '' : 's'}`, '', bal > 0.5 ? 'neg' : 'pos')}
          ${tileRaw('Last purchase', `<span style="font-size:1.2rem">${inv[0] ? fdate(inv[0].date) : '—'}</span>`, k.phone ? esc(k.phone) : '&nbsp;')}
        </section>
        <div class="sect"><div class="sect-h"><h3>Receive a payment</h3>${bal > 0.5 ? `<span class="sub">Applied to the oldest unpaid invoice first</span>` : ''}</div>
          <div class="form">
            <div class="field"><label for="cp-amt">Amount (GNF)</label><input id="cp-amt" class="inp n" inputmode="decimal" value="${esc(st.pay.amount)}" data-bind="pay.amount" placeholder="${bal > 0.5 ? esc(String(Math.round(bal))) : '0'}"></div>
            ${payField('cp-method', 'Paid into', 'pay.accountId', 'pay.method', st.pay)}
            <div class="field"><label for="cp-date">Date</label><input id="cp-date" class="inp" type="date" value="${esc(st.pay.date)}" data-bind="pay.date"></div>
            <div class="field"><label for="cp-note">Note</label><input id="cp-note" class="inp" value="${esc(st.pay.note)}" data-bind="pay.note" placeholder="Optional"></div>
          </div>
          <div class="inline"><button type="button" class="btn primary" data-act="recordPay">Record payment</button>${bal > 0.5 ? `<button type="button" class="btn ghost" data-act="payAll">Fill in full balance</button>` : ''}</div>
        </div>
        <div class="sect"><div class="sect-h"><h3>Statement</h3><span class="sub">Newest first</span></div>
          ${rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Entry</th><th class="n">Credit given</th><th class="n">Paid</th><th class="n">Balance</th><th></th></tr></thead><tbody>${lines}</tbody></table></div>` : '<p class="sub">No invoices or payments yet.</p>'}
        </div>`;
    },
    foot: () => `<button type="button" class="btn ghost" data-act="edit">Edit details</button>${S.isOwner ? `<button type="button" class="btn ghost" data-act="oldDebt">${ic('plus')}Old debt</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-act="sellTo">${ic('cart')}New sale</button><button type="button" class="btn primary" data-close>Done</button>`,
    acts: {
      edit: () => customerForm(id),
      sellTo: () => { UI.cart.customerId = id; saveDraft(); closeAll(); if (UI.view === 'sell') renderView(); else location.hash = '#sell'; },
      payAll: () => { st.pay.amount = String(Math.round(D.custBal[id] || 0)); m.render(); },
      recordPay: async () => {
        const a = num(st.pay.amount); if (!(a > 0)) return toast('Enter the amount received.');
        if (await write([{col:'payments', id:uid(), merge:false, data:{date: st.pay.date || todayStr(), customerId: id, amount: a, ...payData(st.pay), note: st.pay.note.trim(), by: S.email, at: nowIso()}}], `Payment of ${money(a)} GNF recorded`)){ st.pay = {amount:'', method: st.pay.method, accountId: st.pay.accountId, date: todayStr(), note:''}; m.render(); }
      },
      askPay: el => { st.confirmPay = el.dataset.id; m.render(); }, keepPay: () => { st.confirmPay = ''; m.render(); },
      oldDebt: () => oldDebtModal(id),
      askDebt: el => { st.confirmDebt = el.dataset.id; m.render(); }, keepDebt: () => { st.confirmDebt = ''; m.render(); },
      voidDebt: async el => { if (await write([{col:'debts', id: el.dataset.id, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Old debt removed')){ st.confirmDebt = ''; m.render(); } },
      voidPay: async el => { if (await write([{col:'payments', id:el.dataset.id, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Payment removed')){ st.confirmPay = ''; m.render(); } }
    }
  });
}

/* ----- supplier ----- */
function supplierForm(id, onSaved){
  const src = id ? S.suppliers[id] : null; const sid = id || uid();
  const st = {name: src ? src.name : '', phone: src ? src.phone || '' : '', kind: src ? src.kind || 'market' : 'market', location: src ? src.location || '' : '', note: src ? src.note || '' : '', confirm:false};
  const used = id && Object.values(S.purchases).some(p => p.supplierId === id);
  const m = openModal({
    state: st, title: () => id ? 'Edit supplier' : 'Add supplier',
    body: () => `<div class="form">
      <div class="field full"><label for="sf-name">Name</label><input id="sf-name" class="inp" value="${esc(st.name)}" data-bind="name" placeholder="Wholesaler or factory"></div>
      <div class="field full"><span class="lbl">Where you buy from them</span><div class="seg" role="group">${[['market', 'Local market'], ['import', 'Import'], ['both', 'Both']].map(([v, l]) => `<button type="button" data-act="kind" data-v="${v}" aria-pressed="${st.kind === v}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="sf-phone">Phone / WhatsApp</label><input id="sf-phone" class="inp" value="${esc(st.phone)}" data-bind="phone"></div>
      <div class="field"><label for="sf-loc">Location</label><input id="sf-loc" class="inp" value="${esc(st.location)}" data-bind="location" placeholder="Madina, Guangzhou, Dubai…"></div>
      <div class="field full"><label for="sf-note">Note</label><input id="sf-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="What you buy, payment terms…"></div></div>`,
    foot: () => st.confirm ? confirmBar('Delete this supplier?', 'del', 'Delete supplier') : `${id && !used ? '<button type="button" class="btn ghost danger" data-act="askDel">Delete</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">${id ? 'Save' : 'Add supplier'}</button>`,
    acts: {
      kind: el => { st.kind = el.dataset.v; m.render(); },
      save: async () => {
        const name = st.name.trim(); if (!name) return toast('Enter the supplier’s name.');
        const doc = {name, phone: st.phone.trim(), kind: st.kind, location: st.location.trim(), note: st.note.trim(), editedAt: nowIso()};
        if (await write([{col:'suppliers', id:sid, data:doc}], id ? 'Supplier saved' : 'Supplier added')){ m.close(); if (onSaved) onSaved(sid); }
      },
      askDel: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
      del: async () => { if (await write([{col:'suppliers', id:sid, data:{deleted:true}}], 'Supplier deleted')) closeAll(); }
    }
  });
}
const findSup = name => { const t = String(name || '').trim().toLowerCase(); if (!t) return ''; const e = Object.entries(S.suppliers).find(([, k]) => String(k.name || '').trim().toLowerCase() === t); return e ? e[0] : ''; };
const SUP_DEBT_HELP = 'What you still owed this supplier before you started using the app. It’s added to what you owe them, but isn’t a purchase, adds nothing to stock and doesn’t change any money account. Pay it from the supplier’s page like a purchase.';
function supDebtDoc(supplierId, cur, amount, rate, date, note){
  const a = num(amount), r = num(rate), usd = cur === 'USD';
  return {supplierId, amount: usd ? Math.round(a * r) : a, currency: usd ? 'USD' : 'GNF', ...(usd ? {fxAmount: a, rate: r} : {}), date: date || todayStr(), note: String(note || '').trim(), payments: {}, by: S.email, at: nowIso()};
}
function supOldDebtModal(supplierId){
  const st = {cur: 'GNF', amount: '', rate: '', date: todayStr(), note: ''};
  const m = openModal({state: st, live: true, title: () => `Old debt · ${(S.suppliers[supplierId] || {}).name || ''}`,
    body: () => { if (st.cur === 'USD' && !st.rate && curRate()) st.rate = String(curRate());
      return `<p class="sub">${SUP_DEBT_HELP}</p><div class="form">
      <div class="field"><span class="lbl">Currency</span><div class="seg" role="group">${['GNF', 'USD'].map(c => `<button type="button" data-act="cur" data-v="${c}" aria-pressed="${st.cur === c}">${c}</button>`).join('')}</div></div>
      <div class="field"><label for="sdm-a">Amount owed (${st.cur})</label><input id="sdm-a" class="inp n" inputmode="decimal" value="${esc(st.amount)}" data-bind="amount" data-rr placeholder="0"></div>
      ${st.cur === 'USD' ? `<div class="field"><label for="sdm-r">Rate: GNF for 1 USD</label><input id="sdm-r" class="inp n" inputmode="decimal" value="${esc(st.rate)}" data-bind="rate" data-rr placeholder="e.g. 8650"><span class="hint">${num(st.amount) && num(st.rate) ? `= ${money(num(st.amount) * num(st.rate))} GNF owed` : esc(rateNote())}</span></div>` : ''}
      <div class="field"><label for="sdm-d">Owed as of</label><input id="sdm-d" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
      <div class="field full"><label for="sdm-n">Note</label><input id="sdm-n" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="e.g. Container of March, balance on invoice 4471"></div></div>`; },
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save old debt</button>',
    acts: {
      cur: el => { st.cur = el.dataset.v; m.render(); },
      save: async () => {
        if (!(num(st.amount) > 0)) return toast('Enter the amount owed.');
        if (st.cur === 'USD' && !(num(st.rate) > 0)) return toast('Enter the exchange rate.');
        const doc = supDebtDoc(supplierId, st.cur, st.amount, st.rate, st.date, st.note);
        if (await write([{col:'supdebts', id: uid(), merge:false, data: doc}], `Old debt of ${money(doc.amount)} GNF saved`)) m.close();
      }
    }
  });
}
function supOldDebtsBulk(){
  const blank = () => ({name: '', phone: '', cur: 'GNF', amount: '', rate: '', note: ''});
  const st = {date: todayStr(), rows: [blank(), blank(), blank(), blank(), blank()]};
  const m = openModal({state: st, wide: true, live: true, title: () => 'Old debts to suppliers',
    body: () => {
      st.rows.forEach(r => { if (r.cur === 'USD' && !r.rate && curRate()) r.rate = String(curRate()); });
      const gnf = r => r.cur === 'USD' ? num(r.amount) * num(r.rate) : num(r.amount);
      const filled = st.rows.filter(r => r.name.trim() && num(r.amount) > 0);
      return `<p class="sub">${SUP_DEBT_HELP} Type a name: if it matches a supplier already in the app, the debt goes to them; otherwise a new supplier is created.</p>
      <div class="field" style="max-width:240px"><label for="sd-date">Owed as of</label><input id="sd-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
      <datalist id="sd-sups">${sortedBy(S.suppliers).map(([, k]) => `<option value="${esc(k.name)}">`).join('')}</datalist>
      <div class="scroll"><table class="tbl"><thead><tr><th>Supplier</th><th>Phone</th><th>Currency</th><th class="n">Amount owed</th><th class="n">Rate</th><th>Note</th><th></th></tr></thead><tbody>
      ${st.rows.map((r, i) => { const ex = findSup(r.name); return `<tr>
        <td style="min-width:180px"><input id="sd-n-${i}" class="inp" list="sd-sups" value="${esc(r.name)}" data-bind="rows.${i}.name" data-rr autocomplete="off" aria-label="Supplier name">${r.name.trim() ? `<span class="sub">${ex ? 'Already in the app' + ((D.supBal[ex] || 0) > 0.5 ? ` · you owe ${money(D.supBal[ex])}` : '') : 'New supplier'}</span>` : ''}</td>
        <td style="min-width:130px"><input id="sd-p-${i}" class="inp" value="${esc(ex ? (S.suppliers[ex].phone || '') : r.phone)}" data-bind="rows.${i}.phone"${ex ? ' disabled' : ''} placeholder="Phone / WhatsApp" aria-label="Phone"></td>
        <td><select id="sd-c-${i}" class="inp" style="width:auto" data-bind="rows.${i}.cur" data-rr aria-label="Currency">${opts(['GNF', 'USD'], r.cur)}</select></td>
        <td style="min-width:130px"><input id="sd-a-${i}" class="inp n" inputmode="decimal" value="${esc(r.amount)}" data-bind="rows.${i}.amount" data-rr placeholder="0" aria-label="Amount owed">${r.cur === 'USD' && num(r.amount) && num(r.rate) ? `<span class="sub">= ${money(gnf(r))} GNF</span>` : ''}</td>
        <td style="min-width:100px">${r.cur === 'USD' ? `<input id="sd-r-${i}" class="inp n" inputmode="decimal" value="${esc(r.rate)}" data-bind="rows.${i}.rate" data-rr placeholder="8650" aria-label="Rate">` : '<span class="sub">—</span>'}</td>
        <td style="min-width:150px"><input id="sd-x-${i}" class="inp" value="${esc(r.note)}" data-bind="rows.${i}.note" placeholder="e.g. Invoice 4471" aria-label="Note"></td>
        <td><button type="button" class="btn ghost sm iconbtn" data-act="rm" data-i="${i}" aria-label="Remove row">${ic('x')}</button></td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="inline" style="justify-content:space-between"><button type="button" class="btn sm" data-act="add">${ic('plus')}Add 5 rows</button><span class="sub">Total <b>${money(sum(filled, gnf))} GNF</b> owed to ${filled.length} supplier${filled.length === 1 ? '' : 's'}</span></div>`;
    },
    foot: () => '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save old debts</button>',
    acts: {
      add: () => { for (let i = 0; i < 5; i++) st.rows.push(blank()); m.render(); },
      rm: el => { st.rows.splice(+el.dataset.i, 1); if (!st.rows.length) st.rows.push(blank()); m.render(); },
      save: async () => {
        const rows = st.rows.filter(r => r.name.trim() || String(r.amount).trim());
        if (!rows.length) return toast('Enter at least one supplier and the amount you owe.');
        for (const r of rows){
          if (!r.name.trim()) return toast('A row has an amount but no supplier name.');
          if (!(num(r.amount) > 0)) return toast(`Enter the amount you owe ${r.name.trim()}.`);
          if (r.cur === 'USD' && !(num(r.rate) > 0)) return toast(`Enter the exchange rate for ${r.name.trim()}.`);
        }
        const ops = [], made = {};
        let total = 0;
        for (const r of rows){
          const key = r.name.trim().toLowerCase();
          let sid = findSup(r.name) || made[key];
          if (!sid){ sid = uid(); made[key] = sid; ops.push({col:'suppliers', id: sid, merge:false, data:{name: r.name.trim(), phone: r.phone.trim(), kind: r.cur === 'USD' ? 'import' : 'market', location: '', note: '', editedAt: nowIso()}}); }
          const doc = supDebtDoc(sid, r.cur, r.amount, r.rate, st.date, r.note); total += doc.amount;
          ops.push({col:'supdebts', id: uid(), merge:false, data: doc});
        }
        if (await write(ops, `${rows.length} old debt${rows.length === 1 ? '' : 's'} saved · ${money(total)} GNF`)) m.close();
      }
    }
  });
}
function supplierDetail(id){
  const st = {pay: {target:'', amount:'', method:'Cash', accountId:'', rate:'', date: todayStr(), note:''}, confirmDebt:''};
  const m = openModal({
    state: st, live: true, wide: true,
    title: () => (S.suppliers[id] || {}).name || 'Supplier',
    body: () => {
      const k = S.suppliers[id]; if (!k) return '<p>This supplier was deleted.</p>';
      const ps = Object.entries(S.purchases).filter(([, p]) => p.supplierId === id).sort((a, b) => String(b[1].date).localeCompare(String(a[1].date)));
      const olds = D.supDebts.filter(d => d.supplierId === id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const openP = ps.filter(([pid]) => D.pc[pid].balance > 0.5);
      // what can be paid: old debts first (oldest), then unpaid purchases, oldest first
      const targets = [...olds.filter(d => d.balance > 0.5).map(d => ({v: 'debt:' + d.id, label: `Old debt${d.note ? ' · ' + d.note : ''} · owes ${money(d.balance)}`, ref: {currency: d.currency, rate: d.rate}})),
        ...openP.slice().reverse().map(([pid, p]) => ({v: pid, label: `${p.ref || fdate(p.date)} · owes ${money(D.pc[pid].balance)}`, ref: p}))];
      if (!targets.some(t => t.v === st.pay.target)) st.pay.target = targets.length ? targets[0].v : '';
      const tgt = targets.find(t => t.v === st.pay.target);
      const bal = D.supBal[id] || 0;
      return `<p class="sub">${esc([k.kind === 'import' ? 'Import supplier' : k.kind === 'both' ? 'Market & import' : 'Market supplier', k.phone, k.location, k.note].filter(Boolean).join(' · '))}</p>
        <section class="tiles">
          ${tile('Bought in total', sum(ps, ([pid]) => D.pc[pid].goods), `${ps.length} purchase${ps.length === 1 ? '' : 's'}, goods only`)}
          ${tile('Paid', sum(ps, ([pid]) => D.pc[pid].paid) + sum(olds, d => d.paid), 'to this supplier')}
          ${tile('You owe', Math.max(0, bal), `${targets.length} unpaid item${targets.length === 1 ? '' : 's'}`, '', bal > 0.5 ? 'neg' : 'pos')}
          ${olds.length ? tile('Old debts', sum(olds, d => d.amount), 'from before the app') : tile('Extra costs', sum(ps, ([pid]) => D.pc[pid].extras), 'freight, customs, transport')}
        </section>
        ${targets.length ? `<div class="sect"><h3>Pay this supplier</h3><div class="form">
          <div class="field"><label for="sp-p">For</label><select id="sp-p" class="inp" data-bind="pay.target" data-rr>${targets.map(t => opt(t.v, t.label, t.v === st.pay.target)).join('')}</select></div>
          ${supplierPayFields('sp', st.pay, tgt && tgt.ref)}
          <div class="field"><label for="sp-d">Date</label><input id="sp-d" class="inp" type="date" value="${esc(st.pay.date)}" data-bind="pay.date"></div>
        </div><div><button type="button" class="btn primary" data-act="pay">Record payment</button></div></div>` : ''}
        ${olds.length ? `<div class="sect"><h3>Old debts</h3><div class="scroll"><table class="tbl"><thead><tr><th>Owed as of</th><th>Note</th><th class="n">Amount GNF</th><th class="n">Still owed</th><th></th></tr></thead><tbody>${olds.map(d => `<tr><td>${fdateShort(d.date)}</td><td>${esc(d.note || 'From before the app')}${d.currency === 'USD' ? `<span class="sub">${esc(fmtAcc(+d.fxAmount || 0, 'USD'))} at ${money(d.rate)}</span>` : ''}</td><td class="n">${money(d.amount)}</td><td class="n">${d.balance > 0.5 ? money(d.balance) : '<span class="pill good">Paid</span>'}</td><td class="n">${S.isOwner && !d.paid ? (st.confirmDebt === d.id ? `<span class="inline"><button type="button" class="btn danger solid sm" data-act="voidDebt" data-id="${d.id}">Remove</button><button type="button" class="btn ghost sm" data-act="keepDebt">Keep</button></span>` : `<button type="button" class="btn ghost sm iconbtn" data-act="askDebt" data-id="${d.id}" aria-label="Remove old debt">${ic('x')}</button>`) : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
        <div class="sect"><h3>Purchases</h3>${ps.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Reference</th><th>Status</th><th class="n">Goods GNF</th><th class="n">Still owed</th></tr></thead><tbody>${ps.map(([pid, p]) => `<tr tabindex="0" class="click" data-act="openPurchase" data-id="${pid}"><td>${fdateShort(p.date)}</td><td>${esc(p.ref || (p.kind === 'import' ? 'Import' : 'Market purchase'))}</td><td>${p.status === 'received' ? '<span class="pill good">Received</span>' : '<span class="pill warn">In transit</span>'}</td><td class="n">${money(D.pc[pid].goods)}</td><td class="n">${D.pc[pid].balance > 0.5 ? money(D.pc[pid].balance) : '<span class="pill good">Paid</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="sub">No purchases from this supplier yet.</p>'}</div>`;
    },
    foot: () => `<button type="button" class="btn ghost" data-act="edit">Edit details</button>${S.isOwner ? `<button type="button" class="btn ghost" data-act="oldDebt">${ic('plus')}Old debt</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-act="buy">${ic('plus')}New purchase</button><button type="button" class="btn primary" data-close>Done</button>`,
    acts: {
      edit: () => supplierForm(id),
      buy: () => purchaseEditor(null, (S.suppliers[id] || {}).kind === 'import' ? 'import' : 'market', id),
      oldDebt: () => supOldDebtModal(id),
      askDebt: el => { st.confirmDebt = el.dataset.id; m.render(); }, keepDebt: () => { st.confirmDebt = ''; m.render(); },
      voidDebt: async el => { if (await write([{col:'supdebts', id: el.dataset.id, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Old debt removed')){ st.confirmDebt = ''; m.render(); } },
      pay: async () => {
        const t = st.pay.target;
        if (!t) return toast('Pick what you are paying for.');
        const r = supplierPayData(st.pay); if (r.err) return toast(r.err);
        const isDebt = t.startsWith('debt:'), owed = isDebt ? ((D.supDebts.find(d => 'debt:' + d.id === t) || {}).balance || 0) : (D.pc[t] ? D.pc[t].balance : 0);
        if (r.data.amount > owed + 0.5) return toast(`That’s more than the ${money(owed)} GNF still owed.`);
        const pay = {...r.data, date: st.pay.date || todayStr(), note: st.pay.note.trim(), by: S.email, at: nowIso()};
        if (await write([{col: isDebt ? 'supdebts' : 'purchases', id: isDebt ? t.slice(5) : t, data:{payments: {[uid()]: pay}}}], `Payment of ${money(pay.amount)} GNF recorded`)){ st.pay = {target:'', amount:'', method: st.pay.method, accountId: st.pay.accountId, rate:'', date: todayStr(), note:''}; m.render(); }
      }
    }
  });
}

/* ----- purchase / import editor ----- */
function purchaseEditor(id, kind = 'market', supplierId = ''){
  const src = id ? S.purchases[id] : null; const pid = id || uid();
  const blankPay = () => ({amount:'', method:'Cash', accountId:'', rate:'', date: todayStr(), note:''});
  const extraAcc = () => hasAccounts() ? defaultAcc() : '';
  const st = src ? {
    date: src.date || todayStr(), ref: src.ref || '', supplierId: src.supplierId || '', kind: src.kind || 'market', currency: src.currency || 'GNF', rate: src.rate && src.currency !== 'GNF' ? String(src.rate) : '', status: src.status || 'received', receivedDate: src.receivedDate || '', note: src.note || '',
    lines: (src.lines || []).map(l => ({productId: l.productId, label: prodLabel(l.productId) || 'Removed product', qty: String(l.qty ?? ''), price: String(l.price ?? '')})),
    extras: (src.extras || []).map(x => ({label: x.label || '', amount: String(x.amount ?? ''), accountId: x.accountId || '', paidDate: x.paidDate || ''})),
    payments: {...(src.payments || {})}, pay: {...blankPay(), amount: D.pc[id] && D.pc[id].balance > 0.5 ? String(Math.round(D.pc[id].balance)) : ''}, confirm:false
  } : {
    date: todayStr(), ref:'', supplierId, kind, currency: kind === 'import' ? 'USD' : 'GNF', rate:'', status: kind === 'import' ? 'ordered' : 'received', receivedDate:'', note:'',
    lines: [{productId:'', label:'', qty:'', price:''}], extras: kind === 'import' ? IMPORT_EXTRAS.map(l => ({label:l, amount:'', accountId: extraAcc()})) : [], payments:{}, pay: blankPay(), payMode: 'full', confirm:false
  };
  const calc = () => purchaseCalc({currency: st.currency, rate: st.rate, lines: st.lines.map(l => ({productId: l.productId, qty: l.qty, price: l.price})), extras: st.extras, payments: st.payments});
  // New purchase: what is paid to the supplier right now, in the paying account's currency and in GNF.
  const payNow = () => {
    const c = calc(), usd = hasAccounts() && isUSD(st.pay.accountId), r = num(st.pay.rate);
    if (st.payMode === 'credit') return {acc: 0, gnf: 0, usd};
    if (st.payMode === 'part'){ const a = num(st.pay.amount); return {acc: a, gnf: usd ? Math.round(a * r) : a, usd}; }
    if (!usd) return {acc: c.goods, gnf: c.goods, usd};
    if (st.currency === 'USD') return {acc: Math.round(sum(st.lines, l => num(l.qty) * num(l.price)) * 100) / 100, gnf: c.goods, usd};
    return {acc: r ? Math.round(c.goods / r * 100) / 100 : 0, gnf: c.goods, usd};
  };
  const payNowBlock = () => {
    if (hasAccounts() && (!st.pay.accountId || !S.accounts[st.pay.accountId])) st.pay.accountId = defaultAcc();
    const usd = hasAccounts() && isUSD(st.pay.accountId);
    if (usd && !st.pay.rate && !st.pay.ratePrefilled){ st.pay.rate = st.currency === 'USD' && num(st.rate) ? String(st.rate) : (curRate() ? String(curRate()) : ''); st.pay.ratePrefilled = true; }
    const c = calc(), pn = payNow(), left = Math.max(0, c.goods - pn.gnf);
    return `<div class="sect-h"><h3>Payment to the supplier</h3></div>
      <div class="seg" role="group" aria-label="Payment">${[['full', 'Paid in full'], ['part', 'Part paid'], ['credit', 'Not paid yet']].map(([v, l]) => `<button type="button" data-act="payMode" data-v="${v}" aria-pressed="${st.payMode === v}">${l}</button>`).join('')}</div>
      ${st.payMode === 'credit' ? `<p class="sub">The whole ${money(c.goods)} GNF stays owed to the supplier. Record payments later here or on the supplier’s page.</p>` : `<div class="form">
        ${hasAccounts() ? `<div class="field"><label for="pn-acc">Paid from</label>${accSelect('pn-acc', 'pay.accountId', st.pay.accountId, {usd: true, rr: true})}</div>` : `<div class="field"><label for="pn-m">Paid by</label><select id="pn-m" class="inp" data-bind="pay.method">${opts(METHODS, st.pay.method)}</select></div>`}
        ${st.payMode === 'part' ? `<div class="field"><label for="pn-a">Amount paid (${usd ? 'USD' : 'GNF'})</label><input id="pn-a" class="inp n" inputmode="decimal" value="${esc(st.pay.amount)}" data-bind="pay.amount" data-rr placeholder="0"></div>`
          : `<div class="field"><span class="lbl">Amount paid</span><div class="inp n" id="pn-full" style="display:flex;align-items:center;justify-content:flex-end;background:var(--sunken)">${esc(fmtAcc(pn.acc, usd ? 'USD' : 'GNF'))}</div></div>`}
        ${usd ? `<div class="field"><label for="pn-r">Rate: GNF for 1 USD</label><input id="pn-r" class="inp n" inputmode="decimal" value="${esc(st.pay.rate)}" data-bind="pay.rate" data-rr placeholder="e.g. 8650"><span class="hint">${st.currency === 'USD' ? 'The import’s rate, so the balance clears exactly' : esc(rateNote())}</span></div>` : ''}
      </div>`}
      <div class="totals"><div class="row"><span class="muted">Still owed after this</span><span class="${left > 0.5 ? 'errline' : ''}">${money(left)} GNF</span></div></div>`;
  };
  // Switching the paying account between GNF and dollars converts the suggested amount instead of keeping a GNF figure as dollars.
  const payCurGuard = c => {
    const now = hasAccounts() && isUSD(st.pay.accountId) ? 'USD' : 'GNF';
    if (st.pay.cur && st.pay.cur !== now){
      const r = num(st.pay.rate) || num(st.currency === 'USD' ? st.rate : curRate());
      st.pay.amount = now === 'GNF' ? String(Math.round(c.balance)) : (r ? String(Math.round(c.balance / r * 100) / 100) : '');
    }
    st.pay.cur = now; return '';
  };
  const extraAccSelect = (i, cur) => hasAccounts() ? `<select id="xacc-${i}" class="inp" style="width:auto;min-width:9em" data-bind="extras.${i}.accountId" aria-label="Paid from">${opt('', 'Not paid yet', !cur)}${accList(a => a.currency !== 'USD' && forStaff(a)).map(([k, a]) => opt(k, 'Paid from ' + a.name, k === cur)).join('')}</select>` : '';
  const m = openModal({
    state: st, wide: true, live: true,
    title: () => id ? `${st.kind === 'import' ? 'Import' : 'Market purchase'}${st.ref ? ' · ' + st.ref : ''}` : (st.kind === 'import' ? 'New import' : 'New market purchase'),
    body: () => {
      if (!id && !st.ratePrefilled && st.currency === 'USD' && !st.rate && curRate()){ st.rate = String(curRate()); st.ratePrefilled = true; }
      const c = calc(); const cur = st.currency; const fx = cur !== 'GNF';
      const sups = sortedBy(S.suppliers);
      const defaults = (st.kind === 'import' ? IMPORT_EXTRAS : MARKET_EXTRAS).filter(l => !st.extras.some(x => x.label === l));
      const pays = Object.entries(st.payments).filter(([, p]) => p && !p.void).sort((a, b) => String(a[1].date).localeCompare(String(b[1].date)));
      return `<div class="form">
          <div class="field"><span class="lbl">Type</span><div class="seg" role="group">${[['market', 'Market'], ['import', 'Import']].map(([v, l]) => `<button type="button" data-act="setKind" data-v="${v}" aria-pressed="${st.kind === v}">${l}</button>`).join('')}</div></div>
          <div class="field"><span class="lbl">Status</span><div class="seg" role="group">${[['ordered', 'In transit'], ['received', 'Received']].map(([v, l]) => `<button type="button" data-act="setStatus" data-v="${v}" aria-pressed="${st.status === v}">${l}</button>`).join('')}</div></div>
          <div class="field"><label for="pe-sup">Supplier</label><select id="pe-sup" class="inp" data-bind="supplierId">${opt('', 'No supplier', !st.supplierId)}${sups.map(([k, v]) => opt(k, v.name, k === st.supplierId)).join('')}</select><button type="button" class="btn ghost sm" data-act="newSup" style="align-self:flex-start">${ic('plus')}New supplier</button></div>
          <div class="field"><label for="pe-ref">${st.kind === 'import' ? 'Reference (invoice, BL or container no.)' : 'Reference'}</label><input id="pe-ref" class="inp" value="${esc(st.ref)}" data-bind="ref" placeholder="${st.kind === 'import' ? 'e.g. MSKU 123456-7' : 'Optional'}"></div>
          <div class="field"><label for="pe-date">${st.kind === 'import' ? 'Order date' : 'Date'}</label><input id="pe-date" class="inp" type="date" value="${esc(st.date)}" data-bind="date"></div>
          ${st.status === 'received' && st.kind === 'import' ? `<div class="field"><label for="pe-rdate">Received on</label><input id="pe-rdate" class="inp" type="date" value="${esc(st.receivedDate)}" data-bind="receivedDate"></div>` : ''}
          <div class="field"><label for="pe-cur">Currency of supplier prices</label><select id="pe-cur" class="inp" data-bind="currency" data-rr>${opts(CURRENCIES, cur)}</select></div>
          ${fx ? `<div class="field"><label for="pe-rate">Exchange rate: GNF for 1 ${esc(cur)}</label><input id="pe-rate" class="inp n" inputmode="decimal" value="${esc(st.rate)}" data-bind="rate" data-rr placeholder="${cur === 'USD' ? 'e.g. 8650' : cur === 'EUR' ? 'e.g. 10000' : cur === 'CNY' ? 'e.g. 1200' : 'e.g. 2350'}"><span class="hint">${cur === 'USD' ? esc(rateNote()) + '. Use the rate you actually paid' : 'Use the rate you actually paid'}</span></div>` : ''}
        </div>
        ${st.status === 'ordered' ? `<p class="banner info" style="padding:9px 12px"><span class="sub">In-transit goods are not counted in stock. Switch to <b>Received</b> when they arrive at the shop.</span></p>` : ''}

        <div class="sect"><div class="sect-h"><h3>Products</h3><span class="inline"><button type="button" class="btn sm" data-act="addLine">${ic('plus')}Add line</button><button type="button" class="btn sm" data-act="newProd">${ic('plus')}New product</button></span></div>
          <datalist id="pe-prods">${sortedBy(S.products).filter(([, p]) => p.active !== false).map(([k]) => `<option value="${esc(prodLabel(k))}">`).join('')}</datalist>
          <div class="scroll"><table class="tbl"><thead><tr><th style="min-width:240px">Product · brand · model</th><th class="n">Qty</th><th class="n">Unit price ${esc(cur)}</th><th class="n">Goods GNF</th><th class="n">+ Extra costs</th><th class="n">Landed per unit</th><th class="n">Sale price · margin</th><th></th></tr></thead><tbody>
          ${st.lines.map((l, i) => { const cl = c.lines[i]; const p = S.products[l.productId]; const mg = p && +p.price > 0 && cl.unit > 0 ? (p.price - cl.unit) / p.price : null;
            return `<tr><td><input id="pl-${i}" class="inp${l.label && !l.productId ? ' bad' : ''}" list="pe-prods" value="${esc(l.label)}" data-in="lineProd" data-i="${i}" placeholder="Type a product, brand or model" autocomplete="off" aria-label="Product">${p ? `<span class="sub pl-detail">${esc(p.brand ? 'Brand: ' + p.brand : 'No brand')}${p.sku ? ' · Model: ' + esc(p.sku) : ''} · ${qtyU((D.prod[l.productId] || {}).stock || 0, p.unit)} in stock</span>` : ''}</td>
              <td><input id="pq-${i}" class="inp n" style="width:76px" inputmode="decimal" value="${esc(l.qty)}" data-bind="lines.${i}.qty" data-rr aria-label="Quantity"></td>
              <td><input id="pp-${i}" class="inp n" style="width:110px" inputmode="decimal" value="${esc(l.price)}" data-bind="lines.${i}.price" data-rr aria-label="Unit price"></td>
              <td class="n">${money(cl.goods)}</td><td class="n">${money(cl.extra)}</td><td class="n"><b>${cl.unit ? money(cl.unit) : '—'}</b></td>
              <td class="n">${p && +p.price ? `${money(p.price)}<span class="sub ${mg != null && mg < 0 ? 'errline' : ''}">${mg == null ? '' : pct(mg)}</span>` : '<span class="sub">no price</span>'}</td>
              <td><button type="button" class="btn ghost sm iconbtn" data-act="rmLine" data-i="${i}" aria-label="Remove line">${ic('x')}</button></td></tr>`; }).join('')}
          </tbody></table></div>
          ${st.lines.some(l => l.label && !l.productId) ? `<p class="errline">Lines in red aren’t in your product list. Pick from the suggestions or use New product.</p>` : ''}
        </div>

        <div class="sect"><div class="sect-h"><h3>Extra costs (GNF)</h3><span class="sub">Shared across the lines by value, to get the landed cost${hasAccounts() ? '. Each one comes out of the account you pick' : ''}</span></div>
          <datalist id="pe-xl">${[...IMPORT_EXTRAS, ...MARKET_EXTRAS].map(l => `<option value="${esc(l)}">`).join('')}</datalist>
          ${st.extras.map((x, i) => `<div class="inline"><input id="xl-${i}" class="inp grow" list="pe-xl" value="${esc(x.label)}" data-bind="extras.${i}.label" aria-label="Cost name"><input id="xa-${i}" class="inp n" style="width:150px" inputmode="decimal" value="${esc(x.amount)}" data-bind="extras.${i}.amount" data-rr placeholder="0" aria-label="Amount in GNF">${extraAccSelect(i, x.accountId)}<button type="button" class="btn ghost sm iconbtn" data-act="rmExtra" data-i="${i}" aria-label="Remove cost">${ic('x')}</button></div>`).join('')}
          <div class="chips"><button type="button" class="chip" data-act="addExtra" data-v="">+ Other cost</button>${defaults.map(l => `<button type="button" class="chip" data-act="addExtra" data-v="${esc(l)}">+ ${esc(l)}</button>`).join('')}</div>
        </div>

        <div class="grid2">
          <div class="totals panel panel-b">
            <div class="row"><span class="muted">Goods${fx ? ` (${money(sum(c.lines, l => l.qty * l.price))} ${esc(cur)})` : ''}</span><span>${money(c.goods)}</span></div>
            <div class="row"><span class="muted">Extra costs${c.goods ? ` · ${pct(c.extras / c.goods)} of goods` : ''}</span><span>${money(c.extras)}</span></div>
            <div class="row grand"><span>Landed cost</span><span>${money(c.landed)} <small class="sub">GNF</small></span></div>
            ${hasAccounts() && c.unpaidExtras > 0.5 ? `<div class="row"><span class="muted">Extra costs not paid yet</span><span class="errline">${money(c.unpaidExtras)}</span></div>` : ''}
          </div>
          <div class="panel panel-b stack">${!id ? payNowBlock() : `
            <div class="sect-h"><h3>Payments to the supplier</h3><span class="sub">${c.balance > 0.5 ? `<b class="errline">${money(c.balance)}</b> still owed` : c.goods ? '<span class="pill good">Fully paid</span>' : ''}</span></div>
            ${pays.length ? `<div class="bars">${pays.map(([, p]) => `<div class="totals"><div class="row"><span>${fdateShort(p.date)} · ${esc(p.method || '')}${p.fxAmount ? ` · ${esc(fmtAcc(p.fxAmount, 'USD'))}` : ''}</span><span>${money(p.amount)}</span></div></div>`).join('')}</div>` : '<p class="sub">No payment recorded yet.</p>'}
            ${c.balance > 0.5 ? `<div class="sect-h"><h3>Record a payment</h3></div><div class="form">${payCurGuard(c)}${supplierPayFields('pe-pay', st.pay, {currency: st.currency, rate: st.rate})}<div class="field"><label for="pe-pay-d">Date paid</label><input id="pe-pay-d" class="inp" type="date" value="${esc(st.pay.date)}" data-bind="pay.date"></div></div>
            <div class="inline"><button type="button" class="btn primary" data-act="addPay">Record payment</button><button type="button" class="btn ghost sm" data-act="paidFull">Fill in what’s left</button></div>` : ''}`}
          </div>
        </div>
        <div class="field"><label for="pe-note">Note</label><input id="pe-note" class="inp" value="${esc(st.note)}" data-bind="note" placeholder="Shipping line, transit agent, arrival date…"></div>`;
    },
    foot: () => st.confirm ? confirmBar('Delete this purchase? Its goods come off stock and the supplier balance.', 'del', 'Delete purchase') :
      `${id ? '<button type="button" class="btn ghost danger" data-act="askDel">Delete</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">${id ? 'Save purchase' : 'Record purchase'}</button>`,
    ins: {
      lineProd: (el) => { const i = +el.dataset.i, l = st.lines[i]; l.label = el.value; const pid2 = findProdByLabel(el.value); if (pid2 !== l.productId){ l.productId = pid2; if (pid2 && !l.price && st.currency === 'GNF' && S.products[pid2] && +S.products[pid2].cost) l.price = String(S.products[pid2].cost); m.render(); } }
    },
    acts: {
      setKind: el => {
        st.kind = el.dataset.v;
        if (!id && !st.extras.some(x => num(x.amount))){
          st.extras = st.kind === 'import' ? IMPORT_EXTRAS.map(l => ({label:l, amount:'', accountId: extraAcc()})) : [];
          if (!st.lines.some(l => l.price)) st.currency = st.kind === 'import' ? 'USD' : 'GNF';
          st.status = st.kind === 'import' ? 'ordered' : 'received';
        }
        m.render();
      },
      setStatus: el => { st.status = el.dataset.v; if (st.status === 'received' && !st.receivedDate) st.receivedDate = todayStr(); m.render(); },
      newSup: () => supplierForm(null, sid => { st.supplierId = sid; m.render(); }),
      addLine: () => { st.lines.push({productId:'', label:'', qty:'', price:''}); m.render(); const n = document.getElementById('pl-' + (st.lines.length - 1)); if (n) n.focus(); },
      rmLine: el => { st.lines.splice(+el.dataset.i, 1); if (!st.lines.length) st.lines.push({productId:'', label:'', qty:'', price:''}); m.render(); },
      newProd: () => productModal(null, {onSaved: (newId, doc) => { const empty = st.lines.find(l => !l.productId && !l.label); const line = {productId: newId, label: prodLabel(newId, doc), qty:'', price: st.currency === 'GNF' && doc.cost ? String(doc.cost) : ''}; if (empty) Object.assign(empty, line); else st.lines.push(line); m.render(); }}),
      payMode: el => { st.payMode = el.dataset.v; if (st.payMode === 'part' && !st.pay.amount) st.pay.amount = ''; m.render(); },
      addExtra: el => { st.extras.push({label: el.dataset.v || '', amount:'', accountId: extraAcc()}); m.render(); const n = document.getElementById('xa-' + (st.extras.length - 1)); if (n) n.focus(); },
      rmExtra: el => { st.extras.splice(+el.dataset.i, 1); m.render(); },
      paidFull: () => { const bal = calc().balance, r = num(st.pay.rate || (st.currency === 'USD' ? st.rate : '')); st.pay.amount = hasAccounts() && isUSD(st.pay.accountId) && r ? String(Math.round(bal / r * 100) / 100) : String(Math.round(bal)); m.render(); },
      addPay: async () => {
        const r = supplierPayData(st.pay); if (r.err) return toast(r.err);
        if (r.data.amount > calc().balance + 0.5) return toast(`That’s more than the ${money(calc().balance)} GNF still owed.`);
        const payId = uid(); const pay = {...r.data, date: st.pay.date || todayStr(), note:'', by: S.email, at: nowIso()};
        if (!(await write([{col:'purchases', id:pid, data:{payments: {[payId]: pay}}}], `Payment of ${money(pay.amount)} GNF recorded`))) return;
        st.payments[payId] = pay;
        const left = Math.max(0, calc().balance);
        st.pay = {...blankPay(), accountId: st.pay.accountId, amount: left > 0.5 && !isUSD(st.pay.accountId) ? String(Math.round(left)) : ''}; m.render();
      },
      askDel: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
      del: async () => { if (await write([{col:'purchases', id:pid, data:{deleted:true}}], 'Purchase deleted')) m.close(); },
      save: async () => {
        const lines = st.lines.filter(l => l.productId || l.label.trim() || l.qty || l.price);
        if (!lines.length) return toast('Add at least one product line.');
        for (const l of lines){
          if (!l.productId) return toast(`“${l.label || 'A line'}” isn’t in your product list. Pick it from the suggestions or use New product.`);
          if (!(num(l.qty) > 0)) return toast(`Enter a quantity for ${prodName(l.productId)}.`);
          if (isNaN(parseNum(l.price || '0')) || num(l.price) < 0) return toast(`Check the price of ${prodName(l.productId)}.`);
        }
        if (st.currency !== 'GNF' && !(num(st.rate) > 0)) return toast(`Enter the exchange rate: how many GNF for 1 ${st.currency}.`);
        const payments = {...((S.purchases[pid] || {}).payments || {}), ...st.payments};
        if (!id && st.payMode !== 'credit'){
          const c = calc(), pn = payNow();
          if (st.payMode === 'part' && !(pn.acc > 0)) return toast('Enter the amount paid, or choose Not paid yet.');
          if (pn.usd && !(num(st.pay.rate) > 0)) return toast('Enter the exchange rate for the dollars paid.');
          if (pn.gnf > c.goods + 0.5) return toast(`The amount paid is more than the goods total of ${money(c.goods)} GNF.`);
          if (pn.acc > 0){
            const a = hasAccounts() ? (st.pay.accountId || defaultAcc()) : '';
            payments[uid()] = {amount: Math.round(pn.gnf), ...(pn.usd ? {fxAmount: pn.acc, rate: num(st.pay.rate)} : {}), ...(a ? {accountId: a, method: accName(a)} : {method: st.pay.method}), date: st.date || todayStr(), note: 'Paid with the purchase', by: S.email, at: nowIso()};
          }
        }
        const doc = {date: st.date || todayStr(), ref: st.ref.trim(), supplierId: st.supplierId || null, kind: st.kind, currency: st.currency, rate: st.currency === 'GNF' ? 1 : num(st.rate),
          status: st.status, receivedDate: st.status === 'received' ? (st.kind === 'import' ? (st.receivedDate || todayStr()) : (st.date || todayStr())) : '',
          lines: lines.map(l => ({productId: l.productId, qty: num(l.qty), price: num(l.price)})),
          extras: st.extras.filter(x => x.label.trim() || num(x.amount)).map(x => ({label: x.label.trim() || 'Other cost', amount: num(x.amount), accountId: x.accountId || '', paidDate: x.accountId ? (x.paidDate || '') : ''})),
          payments, note: st.note.trim(), by: (src && src.by) || S.email, createdAt: (src && src.createdAt) || nowIso(), editedAt: nowIso()};
        const paidMsg = id ? '' : st.payMode === 'credit' ? ', not paid yet' : purchaseCalc(doc).balance > 0.5 ? ', part paid' : ', paid in full';
        if (await write([{col:'purchases', id:pid, data:doc, merge:false}], id ? 'Purchase saved' : (st.status === 'received' ? 'Purchase recorded and added to stock' : 'Import recorded as in transit') + paidMsg)) m.close();
      }
    }
  });
}

/* ----- invoice ----- */
// Amount in French words, traditional spelling (as written on Guinean invoices).
function enLettres(n){
  n = Math.round(Math.abs(n));
  if (n === 0) return 'zéro';
  const U = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const T = ['','dix','vingt','trente','quarante','cinquante','soixante'];
  const below100 = x => {
    if (x < 20) return U[x];
    if (x < 70){ const t = Math.floor(x / 10), u = x % 10; return T[t] + (u === 1 ? ' et un' : u ? '-' + U[u] : ''); }
    if (x < 80) return 'soixante' + (x === 71 ? ' et onze' : '-' + U[x - 60]);
    if (x === 80) return 'quatre-vingts';
    return 'quatre-vingt-' + U[x - 80];
  };
  const below1000 = (x, last) => {
    const c = Math.floor(x / 100), r = x % 100;
    let s = c === 0 ? '' : c === 1 ? 'cent' : U[c] + ' cent' + (r === 0 && last ? 's' : '');
    if (r) s += (s ? ' ' : '') + (r === 80 && !last ? 'quatre-vingt' : below100(r));
    return s;
  };
  const parts = [];
  const mds = Math.floor(n / 1e9), mns = Math.floor(n / 1e6) % 1000, ms = Math.floor(n / 1000) % 1000, rest = n % 1000;
  if (mds) parts.push((mds === 1 ? 'un' : below1000(mds, true)) + ' milliard' + (mds > 1 ? 's' : ''));
  if (mns) parts.push((mns === 1 ? 'un' : below1000(mns, true)) + ' million' + (mns > 1 ? 's' : ''));
  if (ms) parts.push(ms === 1 ? 'mille' : below1000(ms, false) + ' mille');
  if (rest) parts.push(below1000(rest, true));
  return parts.join(' ');
}
const frNum = v => new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0}).format(Math.round(v || 0)).replace(/[  ]/g, ' ');
const frQty = v => new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(r3(v || 0)).replace(/[  ]/g, ' ');
const frDate = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const METHOD_FR = {'Cash': 'Espèces', 'Bank transfer': 'Virement bancaire', 'Cheque': 'Chèque', 'Other': 'Autre'};
function payLabelFr(r){
  const a = r.accountId && S.accounts[r.accountId];
  if (a) return ['cash', 'safe'].includes(a.type) ? 'Espèces' : a.name;
  return METHOD_FR[r.method] || r.method || 'Espèces';
}
const montantEnLettres = v => { const w = enLettres(v); return w.charAt(0).toUpperCase() + w.slice(1) + ' francs guinéens'; };
// The invoice, laid out like the shop's paper invoice book. Same markup on screen and on the printed A4 page.
function invoiceSheet(s){
  const sh = shopInfo(), k = s.customerId ? S.customers[s.customerId] : null;
  const rem = Math.max(0, D.invRemain[s.id] || 0), paid = s.total - rem;
  const client = [custName(s), k && k.address].filter(Boolean).join(' — ');
  if ((S.settings.invoiceStyle || 'simple') !== 'paper') return invoiceSimple(s, sh, k, rem, paid);
  return `<div class="inv-doc ifr">
    <div class="ifr-hd">
      <div class="ifr-name">${esc(sh.shopName)}</div>
      ${sh.tagline ? `<div class="ifr-tag">${esc(sh.tagline)}</div>` : ''}
      ${sh.address ? `<div class="ifr-addr">${esc(sh.address)}</div>` : ''}
      ${sh.phone ? `<div class="ifr-tel">Tél : ${esc(sh.phone)}</div>` : ''}
      ${sh.email ? `<div class="ifr-mail">E-mail : ${esc(sh.email)}</div>` : ''}
    </div>
    <div class="ifr-row"><div class="ifr-fact">FACTURE <span class="ifr-no">N° ${esc(invNoS(s))}</span></div><div class="ifr-date">${esc(sh.city)}, le <b>${frDate(s.date)}</b></div></div>
    <div class="ifr-line"><span class="ifr-lbl">Nom et Adresse du Client :</span><span class="ifr-fill">${esc(client)}</span></div>
    <div class="ifr-line"><span class="ifr-lbl">Tél :</span><span class="ifr-fill">${esc((k && k.phone) || '')}</span></div>
    <div class="ifr-tw"><table class="ifr-t"><thead><tr><th class="c-no">N°</th><th>DÉSIGNATIONS</th><th class="c-q">Qté</th><th class="c-pu">P. UNITAIRE</th><th class="c-pt">Prix Total</th></tr></thead><tbody>
      ${s.items.map((i, x) => { const d = itemDetail(i); return `<tr><td class="c-no">${x + 1}</td><td>${esc(i.name)}${d ? `<small>${esc(d)}</small>` : ''}</td><td class="c-q">${frQty(i.qty)}</td><td class="c-pu">${frNum(i.price)}</td><td class="c-pt">${frNum(i.qty * i.price)}</td></tr>`; }).join('')}
      ${s.discount ? `<tr class="ifr-sub"><td colspan="3" class="t-lbl2">Sous-total</td><td colspan="2" class="t-val2">${frNum(s.subtotal)} GNF</td></tr><tr class="ifr-sub"><td colspan="3" class="t-lbl2">Remise</td><td colspan="2" class="t-val2">− ${frNum(s.discount)} GNF</td></tr>` : ''}
      <tr class="tot"><td colspan="3" class="t-lbl">TOTAL</td><td colspan="2" class="t-val">${frNum(s.total)} GNF</td></tr>
    </tbody></table></div>
    <div class="ifr-pay">
      <div class="ifr-line"><span class="ifr-lbl">Payé :</span><span class="ifr-fill">${frNum(paid)} GNF${paid > 0 ? ` <span class="ifr-m">(${esc(payLabelFr(s))})</span>` : ''}</span></div>
      <div class="ifr-line"><span class="ifr-lbl">Reste à payer :</span><span class="ifr-fill">${frNum(rem)} GNF</span></div>
    </div>
    <div class="ifr-line"><span class="ifr-lbl">Arrête la présente Facture à la somme de :</span></div>
    <div class="ifr-line ifr-words"><span class="ifr-fill">${esc(montantEnLettres(s.total))} (${frNum(s.total)} GNF)</span></div>
    ${s.note ? `<div class="ifr-line"><span class="ifr-lbl">Note :</span><span class="ifr-fill">${esc(s.note)}</span></div>` : ''}
    <div class="ifr-ft"><div class="ifr-sig"><span></span>Le Gérant</div><div class="ifr-nb">${sh.footer ? `<i>NB :</i> ${esc(sh.footer)}` : ''}</div><div class="ifr-sig"><span></span>Le Client</div></div>
    <div class="ifr-meta">Servi par ${esc(staffName(s.by).replace(' (you)', ''))}</div>
    ${s.void ? '<div class="ifr-void">ANNULÉE</div>' : ''}
  </div>`;
}
// Default invoice: black text and thin lines only, to save ink.
function invoiceSimple(s, sh, k, rem, paid){
  // Faint monogram in the free space: full size for short sales, smaller for medium ones, none when the items need the room.
  const wm = s.items.length <= 4 && !s.note && !s.discount ? 'lg' : s.items.length <= 7 ? 'sm' : '';
  return `<div class="inv-doc ivs">
    <div class="ivs-top">
      <div class="ivs-shop"><div class="ivs-name">${esc(sh.shopName)}</div>${sh.tagline ? `<div class="ivs-tag">${esc(sh.tagline)}</div>` : ''}${sh.address ? `<div>${esc(sh.address)}</div>` : ''}${sh.phone ? `<div>Tél : ${esc(sh.phone)}</div>` : ''}${sh.email ? `<div>${esc(sh.email)}</div>` : ''}</div>
      <div class="ivs-doc"><div class="ivs-title">FACTURE</div><div class="ivs-no">N° ${esc(invNoS(s))}</div><div class="ivs-d">${esc(sh.city)}, le ${frDate(s.date)}</div></div>
    </div>
    <hr class="ivs-hr">
    <div class="ivs-client"><div><span>Client :</span> <b>${esc(custName(s))}</b>${k && k.address ? ' — ' + esc(k.address) : ''}</div>${k && k.phone ? `<div><span>Tél :</span> ${esc(k.phone)}</div>` : ''}</div>
    <div class="ivs-tw"><table class="ivs-t"><thead><tr><th class="c-no">N°</th><th>Désignation</th><th class="c">Qté</th><th class="n">P. unitaire</th><th class="n">Prix total</th></tr></thead><tbody>
      ${s.items.map((i, x) => { const d = itemDetail(i); return `<tr><td class="c-no">${x + 1}</td><td>${esc(i.name)}${d ? `<small>${esc(d)}</small>` : ''}</td><td class="c">${frQty(i.qty)}</td><td class="n">${frNum(i.price)}</td><td class="n">${frNum(i.qty * i.price)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="ivs-sum">
      ${s.discount ? `<div><span>Sous-total</span><span class="v">${frNum(s.subtotal)} GNF</span></div><div><span>Remise</span><span class="v">− ${frNum(s.discount)} GNF</span></div>` : ''}
      <div><span>Total</span><b>${frNum(s.total)} GNF</b></div>
      <div><span>Payé${paid > 0 ? ` (${esc(payLabelFr(s))})` : ''}</span><span class="v">${frNum(paid)} GNF</span></div>
      <div class="ivs-due"><span>Reste à payer</span><span>${frNum(rem)} GNF</span></div>
    </div>
    <div class="ivs-words"><span>Arrêtée la présente facture à la somme de :</span> <i>${esc(montantEnLettres(s.total))} (${frNum(s.total)} GNF).</i></div>
    ${s.note ? `<div class="ivs-words"><span>Note :</span> ${esc(s.note)}</div>` : ''}
    ${wm ? `<div class="ivs-wm ${wm}" aria-hidden="true"><div class="ivs-wm-ring"></div><div class="ivs-wm-mono">${esc(initials())}</div><div class="ivs-wm-thanks">Merci de votre confiance</div>${sh.tagline ? `<div class="ivs-wm-cats">${esc(sh.tagline)}</div>` : ''}</div>` : ''}
    <div class="ivs-sig"><div>Le Gérant</div><div>Le Client</div></div>
    ${sh.footer ? `<div class="ivs-nb">NB : ${esc(sh.footer)}</div>` : ''}
    <div class="ivs-meta">Servi par ${esc(staffName(s.by).replace(' (you)', ''))}</div>
    ${s.void ? '<div class="ivs-void">ANNULÉE</div>' : ''}
  </div>`;
}
function printInvoice(s){
  let pa = document.getElementById('print-area');
  if (!pa){ pa = document.createElement('div'); pa.id = 'print-area'; document.body.appendChild(pa); }
  pa.innerHTML = invoiceSheet(s);
  const title = document.title; document.title = `Facture ${invNoS(s)}`;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); pa.innerHTML = ''; document.title = title; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  try { window.print(); } catch { toast('Printing isn’t available in this browser.'); done(); }
}
// Text version for WhatsApp or SMS, in the same order as the printed invoice.
function invoiceText(s){
  const sh = shopInfo(), k = s.customerId ? S.customers[s.customerId] : null;
  const rem = Math.max(0, D.invRemain[s.id] || 0), paid = s.total - rem;
  const L = [sh.shopName, sh.tagline, [sh.address, sh.phone ? 'Tél : ' + sh.phone : ''].filter(Boolean).join(' · '), '',
    `FACTURE N° ${invNoS(s)} · ${sh.city}, le ${frDate(s.date)}`,
    `Client : ${[custName(s), k && k.address].filter(Boolean).join(' — ')}${k && k.phone ? ' · Tél : ' + k.phone : ''}`, ''];
  s.items.forEach((i, x) => { const d = itemDetail(i); L.push(`${x + 1}. ${i.name}${d ? ` (${d})` : ''} : ${frQty(i.qty)} × ${frNum(i.price)} = ${frNum(i.qty * i.price)}`); });
  L.push('');
  if (s.discount) L.push(`Sous-total : ${frNum(s.subtotal)} GNF`, `Remise : − ${frNum(s.discount)} GNF`);
  L.push(`TOTAL : ${frNum(s.total)} GNF`, `Payé : ${frNum(paid)} GNF${paid > 0 ? ` (${payLabelFr(s)})` : ''}`, `Reste à payer : ${frNum(rem)} GNF`);
  L.push(`Arrête la présente Facture à la somme de : ${montantEnLettres(s.total)}`);
  if (sh.footer) L.push('', 'NB : ' + sh.footer);
  return L.filter((x, i, a) => x !== undefined && !(x === '' && a[i - 1] === '')).join('\n');
}
function invoiceModal(saleId){
  const st = {confirm:false, showText:false};
  const find = () => D.sales.find(s => s.id === saleId);
  const m = openModal({
    state: st, live: true, mid: true,
    title: () => { const s = find(); return s ? `Invoice ${invNoS(s)}` : 'Invoice'; },
    body: () => {
      const s = find(); if (!s) return `<p class="sub">This invoice isn’t available.</p>`;
      const accNow = saleAccId(s), canFix = hasAccounts() && s.paid > 0 && !s.void && (S.isOwner || s.by === S.email);
      if (st.acc === undefined) st.acc = accNow || defaultAcc();
      return `${hasAccounts() && s.paid > 0 ? `<div class="banner info noprint" style="align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:180px"><b>${money(s.paid)} GNF received in ${esc(accNow ? accName(accNow) : 'no account')}</b><span class="sub">${s.accountId ? 'Paid at the counter' : accNow ? `Matched from the payment method “${esc(s.method || '')}”` : 'This sale doesn’t say where the money went'}</span></div>${canFix ? `<div class="inline"><label class="sr" for="inv-acc">Change account</label>${accSelect('inv-acc', 'acc', st.acc, {rr: true})}${st.acc !== accNow ? '<button type="button" class="btn primary sm" data-act="fixAcc">Save</button>' : ''}</div>` : ''}</div>` : ''}
      ${(() => { const sp = s.items.filter(i => i.special); if (!sp.length) return '';
        return `<div class="banner info noprint"><div><b>Special order · ${money(sum(sp, i => i.qty * i.cost))} GNF paid to the market</b><span class="sub">${sp.map(i => `${esc(i.name)}: ${money(i.qty * i.cost)} from ${esc(i.costAcc ? accName(i.costAcc) : 'no account')}`).join(' · ')} · profit ${money(sum(sp, i => i.qty * (i.price - i.cost)))} GNF</span></div></div>`; })()}
      ${(() => { const files = liveFiles(S.sales[s.id]);
        return `<div class="docbar noprint"><span class="lbl">${ic('clip')}Documents</span>${files.length ? `<div class="docs">${fileChips(files, 'openFile')}</div>` : (UI.attaching ? '' : '<span class="sub">None attached</span>')}${savingFiles()}<span class="spacer"></span>${s.void ? '' : fileInput('inv-file', 'sale:' + s.id)}</div>`; })()}
      ${invoiceSheet(s)}
      ${st.showText ? `<div class="field noprint"><label for="inv-text">Copy this text into WhatsApp or SMS</label><textarea id="inv-text" class="inp copytext" readonly>${esc(invoiceText(s))}</textarea></div>` : ''}`;
    },
    foot: () => { const s = find(); if (!s) return '';
      if (st.confirm) return confirmBar('Void this sale? Its items go back into stock and any credit is cancelled.', 'voidYes', 'Void sale');
      return `${s.void ? '' : '<button type="button" class="btn ghost danger" data-act="voidAsk">Void sale</button>'}<span class="spacer"></span>${s.customerId ? `<button type="button" class="btn" data-act="toCustomer">Customer account</button>` : ''}<button type="button" class="btn" data-act="copy">${ic('copy')}Copy as text</button><button type="button" class="btn" data-act="print">${ic('printer')}Print</button><button type="button" class="btn primary" data-close>Done</button>`; },
    acts: {
      copy: () => { const s = find(); if (!s) return; const txt = invoiceText(s);
        const fallback = () => { st.showText = true; m.render(); const t = document.getElementById('inv-text'); if (t){ t.focus(); t.select(); } };
        try { navigator.clipboard.writeText(txt).then(() => toast('Invoice copied. Paste it into WhatsApp or SMS.'), fallback); } catch { fallback(); } },
      print: () => { const s = find(); if (s) printInvoice(s); },
      openFile: el => fileViewer(saleId, el.dataset.fid),
      toCustomer: () => { const s = find(); if (s && s.customerId){ m.close(); customerDetail(s.customerId); } },
      voidAsk: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
      voidYes: async () => { const s = find(); if (!s) return; if (await write([{col:'sales', id:s.id, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Sale voided')){ st.confirm = false; m.render(); } },
      fixAcc: async () => { const s = find(); if (!s || !st.acc) return; if (await write([{col:'sales', id:s.id, data:{accountId: st.acc, method: accName(st.acc)}}], `Money now counted in ${accName(st.acc)}`)) m.render(); }
    }
  });
}

/* ----- team member ----- */
function memberModal(email){
  const src = S.members[email] || {};
  const st = {name: src.name || '', code: (src.code || '').toUpperCase(), active: src.active !== false, confirm:false};
  const isOwnerRow = src.role === 'owner' || OWNERS.includes(email);
  const m = openModal({
    state: st, title: () => src.name || email,
    body: () => `<p class="sub">${esc(email)}</p><div class="form">
      <div class="field"><label for="mm-name">Name</label><input id="mm-name" class="inp" value="${esc(st.name)}" data-bind="name"></div>
      <div class="field"><label for="mm-code">Invoice letter</label><input id="mm-code" class="inp" maxlength="2" value="${esc(st.code)}" data-bind="code"></div></div>
      ${isOwnerRow ? '<p class="hint">Owners can’t be removed here. To change who owns the shop, change the owner emails in config.js and in the security rules.</p>' : ''}`,
    foot: () => st.confirm ? confirmBar('Remove this person? They lose access right away. Their past sales stay.', 'remove', 'Remove access') :
      `${!isOwnerRow ? (st.active ? '<button type="button" class="btn ghost danger" data-act="askRemove">Remove access</button>' : '<button type="button" class="btn ghost" data-act="restore">Give access again</button>') : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">Save</button>`,
    acts: {
      save: async () => {
        const code = st.code.trim().toUpperCase();
        if (!/^[A-Z]{1,2}$/.test(code)) return toast('Use one or two letters for the invoice series.');
        if (usedCodes(email).has(code)) return toast(`Letter ${code} is already used by someone else.`);
        if (await write([{col:'members', id:email, data:{name: st.name.trim(), code}}], 'Saved')) m.close();
      },
      askRemove: () => { st.confirm = true; m.render(); }, confirmNo: () => { st.confirm = false; m.render(); },
      remove: async () => { if (await write([{col:'members', id:email, data:{active:false, removedAt: nowIso()}}], 'Access removed')) m.close(); },
      restore: async () => { if (await write([{col:'members', id:email, data:{active:true}}], 'Access restored')) m.close(); }
    }
  });
}

/* ================= import from the Claude version ================= */
function importClaude(json){
  if (!json || typeof json !== 'object' || !json.products || !json.journal) throw new Error('format');
  const ops = [];
  const clean = (o) => { const c = {...o}; delete c.updatedAt; if (typeof c.by === 'string' && c.by.startsWith('u_')) c.by = 'imported'; if (c.voidBy && String(c.voidBy).startsWith('u_')) c.voidBy = 'imported'; return c; };
  if (json.settings && Object.keys(json.settings).length) ops.push({col:'config', id:'settings', data: clean(json.settings)});
  for (const col of ['products','customers','suppliers','purchases','adjustments']){
    for (const [id, v] of Object.entries(json[col] || {})){
      if (!v) continue;
      const d = clean(v);
      if (col === 'purchases' && d.payments) for (const k of Object.keys(d.payments)) d.payments[k] = clean(d.payments[k] || {});
      ops.push({col, id, data: d, merge:false});
    }
  }
  let nSales = 0, nPay = 0, nExp = 0;
  for (const [key, day] of Object.entries(json.journal || {})){
    if (!day) continue; const date = day.date || key;
    for (const [id, s] of Object.entries(day.sales || {})){ if (!s) continue; ops.push({col:'sales', id, merge:false, data:{...clean(s), date, series: s.series || 'A'}}); nSales++; }
    for (const [id, p] of Object.entries(day.payments || {})){ if (!p) continue; ops.push({col:'payments', id, merge:false, data:{...clean(p), date}}); nPay++; }
    for (const [id, e] of Object.entries(day.expenses || {})){ if (!e) continue; ops.push({col:'expenses', id, merge:false, data:{...clean(e), date}}); nExp++; }
  }
  const n = c => Object.keys(json[c] || {}).length;
  return {ops, summary: `${n('products')} products, ${n('customers')} customers, ${n('suppliers')} suppliers, ${n('purchases')} purchases, ${nSales} sales, ${nPay} payments, ${nExp} expenses`};
}

/* ================= files ================= */
function saveFile(filename, data, type){
  try {
    const blob = new Blob([data], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch { toast('Couldn’t prepare the file.'); }
}
function toCsv(rows){ return '﻿' + rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n'); }
const jsonReplacer = (k, v) => (v && typeof v === 'object' && typeof v.toDate === 'function') ? v.toDate().toISOString() : v;

/* ================= actions ================= */
const ACT = {
  more: () => moreSheet(),
  go: el => { closeAll(); if (el.dataset.to === 'rates') return rateModal(); location.hash = '#' + el.dataset.to; },
  reload: () => location.reload(),
  google: () => googleSignIn(),
  gateMode: el => { UI.gate.mode = el.dataset.v; UI.gate.err = ''; UI.gate.note = ''; renderGate(); },
  resetPw: async () => {
    const g = UI.gate; g.err = ''; g.note = '';
    if (!g.email.trim()){ g.err = 'Type your email first, then tap Forgot password.'; renderGate(); return; }
    try { await F.sendPasswordResetEmail(S.authObj, g.email.trim()); g.note = 'We sent a link to reset your password. Check your email, including spam.'; }
    catch (e){ g.err = authErr(e); }
    renderGate();
  },
  verified: async () => {
    const g = UI.gate; g.err = ''; g.note = '';
    try {
      await S.user.reload();
      if (S.authObj.currentUser && S.authObj.currentUser.emailVerified){ await S.authObj.currentUser.getIdToken(true); S.auth = 'ready'; renderAll(); startSync(); return; }
      g.err = 'Not confirmed yet. Open the link in the email first.';
    } catch (e){ g.err = authErr(e); }
    renderGate();
  },
  resendVerify: async () => { const g = UI.gate; g.err = ''; try { await F.sendEmailVerification(S.user); g.note = 'Sent. Check your email, including spam.'; } catch (e){ g.err = authErr(e); } renderGate(); },
  signOut: () => {
    if (S.unsynced && S.auth === 'ready'){
      const mm = openModal({title: () => 'Sign out?', body: () => `<p>Some changes on this device haven’t uploaded yet. If you sign out now, they may be lost. Connect to the internet and wait for “All changes saved” first.</p>`,
        foot: () => `<button type="button" class="btn" data-close>Stay signed in</button><button type="button" class="btn danger solid" data-act="forceOut">Sign out anyway</button>`,
        acts: {forceOut: async () => { mm.close(); await F.signOut(S.authObj); location.reload(); }}});
      return;
    }
    F.signOut(S.authObj).then(() => location.reload());
  },
  install: async () => { const e = S.installEvt; if (!e) return; S.installEvt = null; try { e.prompt(); await e.userChoice; } catch {} renderView(); },
  copyLink: () => { const link = location.origin + location.pathname; try { navigator.clipboard.writeText(link).then(() => toast('Link copied'), () => toast(link)); } catch { toast(link); } },
  newProduct: () => productModal(null),
  openProduct: el => productModal(el.dataset.id),
  adjustStock: () => adjustModal(''),
  stockCat: el => { UI.stockCat = el.dataset.v; renderView(); },
  stockLow: () => { UI.stockLow = !UI.stockLow; renderView(); },
  stockHidden: () => { UI.stockHidden = !UI.stockHidden; renderView(); },
  newPurchase: el => purchaseEditor(null, el.dataset.kind),
  openPurchase: el => purchaseEditor(el.dataset.id),
  purchStatus: el => { UI.purchStatus = el.dataset.v; renderView(); },
  newCustomer: () => customerForm(null, id => customerDetail(id)),
  oldDebts: () => oldDebtsBulk(),
  openCustomer: el => customerDetail(el.dataset.id),
  newSupplier: () => supplierForm(null),
  supOldDebts: () => supOldDebtsBulk(),
  openSupplier: el => supplierDetail(el.dataset.id),
  openSale: el => invoiceModal(el.dataset.id),
  editMember: el => memberModal(el.dataset.id),
  openAccount: el => accountModal(el.dataset.id),
  newAccount: () => accountModal(null),
  newTransfer: () => transferModal(null),
  openTransfer: el => transferModal(el.dataset.id),
  ownerMoney: () => equityModal(null),
  openEquity: el => equityModal(el.dataset.id),
  cashCount: () => cashCountModal(''),
  openRates: () => rateModal(),
  saveRateQuick: async () => { if (await saveRate(UI.rateQuick, todayStr())){ UI.rateQuick = ''; renderView(); } },
  createAccounts: async () => {
    const s = UI.accSetup; if (!s) return;
    const rows = s.rows.filter(r => r.on && String(r.name).trim());
    if (!rows.length) return toast('Tick at least one account.');
    if (rows.some(r => r.opening && isNaN(parseNum(r.opening)))) return toast('One of the amounts isn’t a number.');
    const ops = rows.map((r, i) => ({col:'accounts', id: r.id, data:{name: String(r.name).trim(), type: r.type, currency: r.currency, opening: num(r.opening), openingDate: s.date || todayStr(), active: true, order: i}}));
    if (await write(ops, 'Money accounts created')){ UI.accSetup = null; renderView(); }
  },
  addMember: async () => {
    const t = UI.team; const email = t.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('Enter a valid email address.');
    const used = usedCodes(email);
    const code = (t.code.trim() || LETTERS.find(l => !used.has(l)) || '').toUpperCase();
    if (!/^[A-Z]{1,2}$/.test(code)) return toast('Use one or two letters for the invoice series.');
    const ex = S.members[email];
    if (used.has(code)) return toast(`Letter ${code} is already used by someone else.`);
    if (await write([{col:'members', id:email, data:{email, name: t.name.trim(), code, role: (ex && ex.role === 'owner') || OWNERS.includes(email) ? 'owner' : 'staff', active:true, addedAt: (ex && ex.addedAt) || nowIso()}}], `${email} can now sign in`)){ UI.team = {email:'', name:'', code:''}; renderView(); }
  },
  cartAdd: el => {
    const id = el.dataset.id, p = S.products[id]; if (!p) return;
    const ex = UI.cart.items.find(i => i.productId === id);
    if (p.special){ if (!ex) UI.cart.items.push({productId: id, name: p.name, qty: '1', price: '', cost: '', special: true, costAcc: hasAccounts() ? defaultAcc() : ''}); }
    else if (ex) ex.qty = String(r3(num(ex.qty) + 1)); else UI.cart.items.push({productId: id, name: p.name, qty: '1', price: +p.price ? String(p.price) : ''});
    saveDraft(); renderView();
  },
  unhideAccount: async el => { await write([{col:'accounts', id: el.dataset.id, data:{active: true}}], 'Account shown again'); },
  saleAcc: el => { UI.cart.accountId = el.dataset.v; saveDraft(); renderView(); },
  cartRemove: el => { UI.cart.items.splice(+el.dataset.i, 1); saveDraft(); renderView(); },
  cartClear: () => { UI.cart = Object.assign(freshCart(), {method: UI.cart.method, accountId: UI.cart.accountId}); UI.cartFiles = []; saveDraft(); renderView(); },
  cartFileRemove: el => { UI.cartFiles.splice(+el.dataset.i, 1); renderView(); },
  paidFull: () => { UI.cart.paidTouched = false; UI.cart.paid = ''; saveDraft(); renderView(); },
  paidCredit: () => { UI.cart.paidTouched = true; UI.cart.paid = '0'; saveDraft(); renderView(); },
  newCustomerForSale: () => customerForm(null, id => { UI.cart.customerId = id; saveDraft(); renderView(); }),
  recordSale: async () => {
    if (UI.busy) return;
    const c = UI.cart;
    const items = c.items.map(it => ({productId: it.productId, name: (S.products[it.productId] || {}).name || it.name || 'Item', brand: (S.products[it.productId] || {}).brand || '', sku: (S.products[it.productId] || {}).sku || '', qty: num(it.qty), price: num(it.price),
      ...(it.special ? {cost: num(it.cost), special: true, costAcc: it.costAcc || ''} : {cost: Math.round(((D.prod[it.productId] || {}).avg || 0) * 100) / 100})}));
    if (!items.length) return toast('Add at least one product.');
    const noCost = items.find(i => i.special && !(i.cost > 0)); if (noCost) return toast(`Type what you paid for “${noCost.name}”.`);
    const noPrice = items.find(i => i.special && !(i.price > 0)); if (noPrice) return toast(`Type the client’s price for “${noPrice.name}”.`);
    if (items.some(i => !(i.qty > 0))) return toast('Each line needs a quantity above zero.');
    if (c.items.some(it => it.price !== '' && isNaN(parseNum(it.price)))) return toast('One of the prices isn’t a number.');
    const subtotal = sum(items, i => i.qty * i.price), discount = num(c.discount);
    if (discount < 0 || discount > subtotal) return toast('The discount can’t be more than the subtotal.');
    const total = subtotal - discount, paid = c.paidTouched ? num(c.paid) : total;
    if (paid < 0 || paid > total + 0.5) return toast('Amount paid can’t be more than the total.');
    if (paid < total - 0.5 && !c.customerId) return toast('Choose a customer for a credit sale, so the balance is tracked.');
    const id = uid();
    const sale = {no: nextNo(), series: mySeries(), date: c.date || todayStr(), customerId: c.customerId || null, walkin: c.customerId ? '' : c.walkin.trim(), items, discount, paid: Math.min(paid, total), ...payData(c), note: c.note.trim(), by: S.email, at: nowIso()};
    UI.busy = true;
    const ok = await write([{col:'sales', id, data: sale, merge:false}], 'Sale recorded');
    UI.busy = false;
    if (ok){ const files = UI.cartFiles; UI.cartFiles = []; UI.cart = Object.assign(freshCart(), {method: c.method, accountId: c.accountId}); saveDraft(); renderView(); invoiceModal(id); if (files.length){ UI.attaching += files.length; schedule(); attachFiles(id, files).finally(() => { UI.attaching = Math.max(0, UI.attaching - files.length); schedule(); }); } }
    else renderView();
  },
  addExpense: async () => {
    const e = UI.exp, a = num(e.amount);
    if (!(a > 0)) return toast('Enter the amount spent.');
    if (await write([{col:'expenses', id:uid(), merge:false, data:{date: e.date || todayStr(), category: e.category, amount: a, ...payData(e), note: e.note.trim(), by: S.email, at: nowIso()}}], 'Expense added')){ UI.exp = {date: e.date, category: e.category, amount:'', method: e.method, accountId: e.accountId, note:''}; renderView(); }
  },
  askExp: el => { UI.confirmExp = el.dataset.id; renderView(); },
  cancelExp: () => { UI.confirmExp = ''; renderView(); },
  voidExpense: async el => { if (await write([{col:'expenses', id:el.dataset.id, data:{void: true, voidAt: nowIso(), voidBy: S.email}}], 'Expense removed')){ UI.confirmExp = ''; renderView(); } },
  saveShop: async () => {
    const f = UI.shop;
    if (String(f.invoiceStart || '').trim() && !/^\d{1,9}$/.test(String(f.invoiceStart).trim())) return toast('“Number invoices from” must be a whole number, like 362.');
    const doc = {shopName: (f.shopName || '').trim(), tagline: (f.tagline || '').trim(), address: (f.address || '').trim(), phone: (f.phone || '').trim(), email: (f.email || '').trim(), city: (f.city || '').trim(), footer: (f.footer || '').trim(), invoiceStart: parseInt(f.invoiceStart, 10) || null, invoiceStyle: f.invoiceStyle === 'paper' ? 'paper' : 'simple'};
    if (await write([{col:'config', id:'settings', data:doc}], 'Invoice details saved')) UI.shop = null;
  },
  backupJson: () => {
    const dump = {format: 'shop-erp-v1', exportedAt: nowIso(), settings: S.settings};
    for (const c of COLS) if (c !== 'config') dump[c] = S[c];
    saveFile(`shop-erp-backup-${todayStr()}.json`, JSON.stringify(dump, jsonReplacer, 1), 'application/json');
  },
  exportSales: () => {
    const rows = [['Date', 'Invoice', 'Customer', 'Product', 'Brand · model', 'Category', 'Qty', 'Unit price GNF', 'Line total GNF', 'Unit cost GNF', 'Line profit GNF', 'Invoice discount GNF', 'Invoice paid GNF', 'Method', 'Sold by', 'Status']];
    for (const s of D.sales.slice().reverse()) for (const i of s.items) rows.push([s.date, invNoS(s), custName(s), i.name, itemDetail(i), (S.products[i.productId] || {}).category || '', i.qty, i.price, i.qty * i.price, i.cost, Math.round(i.qty * (i.price - i.cost)), s.discount, s.paid, s.method || '', staffName(s.by), s.void ? 'Void' : 'OK']);
    saveFile(`sales-lines-${todayStr()}.csv`, toCsv(rows), 'text/csv');
  },
  exportStock: () => {
    const rows = [['Product', 'Code', 'Brand', 'Category', 'Unit', 'In stock', 'On the way', 'Avg cost GNF', 'Sale price GNF', 'Value at cost GNF', 'Reorder at']];
    for (const [id, p] of sortedBy(S.products)){ const x = D.prod[id] || {}; rows.push([p.name, p.sku || '', p.brand || '', p.category || '', p.unit || 'piece', x.stock || 0, x.transit || 0, Math.round(x.avg || 0), p.price || 0, Math.round(Math.max(0, x.stock || 0) * (x.avg || 0)), p.min || 0]); }
    saveFile(`stock-${todayStr()}.csv`, toCsv(rows), 'text/csv');
  }
};
const IN = {
  paid: el => { UI.cart.paid = el.value; UI.cart.paidTouched = true; saveDraft(); renderView(); }
};

/* ================= events ================= */
function onInput(ev){
  const el = ev.target; if (!(el instanceof HTMLElement)) return;
  if (el.id === 'imp-file'){ if (ev.type === 'change') handleImport(el); return; }
  if (el.dataset && el.dataset.file){ if (ev.type === 'change'){ const sc = el.closest('.scrim'); onFilePick(el, sc ? MODAL_BY_EL.get(sc) : null); } return; }
  if (ev.type === 'change' && !(el.tagName === 'SELECT' || el.type === 'date' || el.type === 'checkbox')) return;
  const scrim = el.closest('.scrim'); const m = scrim ? MODAL_BY_EL.get(scrim) : null;
  const root = m ? m.state : UI;
  if (el.dataset.bind){
    if (!m && el.dataset.bind.startsWith('shop.') && !UI.shop) UI.shop = {...S.settings};
    setPath(root, el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
    if (!m && el.dataset.bind.startsWith('cart.')) saveDraft();
  }
  if (el.dataset.in){ const h = (m && m.ins[el.dataset.in]) || IN[el.dataset.in]; if (h){ h(el, m); return; } }
  if ('rr' in el.dataset){ if (m) m.render(); else renderView(); }
}
async function handleImport(el){
  const file = el.files && el.files[0]; if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    const {ops, summary} = importClaude(json);
    if (!ops.length){ UI.importInfo = 'That file has no records in it.'; renderView(); return; }
    if (await write(ops)){ UI.importInfo = `Imported ${summary}.`; toast('Import finished'); }
  } catch (e){ UI.importInfo = 'That file isn’t a backup from the Claude version of this app.'; }
  el.value = ''; renderView();
}
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);
document.addEventListener('submit', ev => { if (ev.target && ev.target.id === 'gate-form'){ ev.preventDefault(); emailSubmit(); } });
document.addEventListener('click', ev => {
  const t = ev.target; if (!(t instanceof Element)) return;
  const scrim = t.closest('.scrim'); const m = scrim ? MODAL_BY_EL.get(scrim) : null;
  if (scrim && t === scrim){ closeModal(m); return; }
  if (t.closest('[data-close]')){ closeModal(m); return; }
  const a = t.closest('[data-act]'); if (!a || a.disabled) return;
  const h = (m && m.acts[a.dataset.act]) || ACT[a.dataset.act];
  if (h){ ev.preventDefault(); h(a, m, ev); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && MODALS.length){ closeModal(MODALS[MODALS.length - 1]); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target instanceof Element && ev.target.matches('tr[data-act]')){ ev.preventDefault(); ev.target.click(); return; }
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'sell-q'){ const b = document.querySelector('#view .pitem'); if (b){ ev.preventDefault(); ACT.cartAdd(b); UI.cart.q = ''; saveDraft(); renderView(); } }
});
document.addEventListener('focusin', ev => { const t = ev.target; if (!RESTORING && t && t.dataset && 'sa' in t.dataset && t.select){ setTimeout(() => { try { if (document.activeElement === t) t.select(); } catch {} }, 0); } });
function route(){ const h = location.hash.replace('#', ''); UI.view = ROUTES.includes(h) ? h : 'home'; if (UI.view !== 'shop') UI.shop = null; if (S.auth === 'ready'){ closeAll(); renderAll(); window.scrollTo(0, 0); } }
window.addEventListener('hashchange', route);
window.addEventListener('online', () => { S.online = true; schedule(); });
window.addEventListener('offline', () => { S.online = false; schedule(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; schedule(); });

/* ================= boot ================= */
function boot(){
  const h = location.hash.replace('#', ''); UI.view = ROUTES.includes(h) ? h : 'home';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController){ S.updateReady = true; schedule(); } });
    navigator.serviceWorker.register('./sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
  if (!firebaseConfig || !firebaseConfig.apiKey || String(firebaseConfig.apiKey).startsWith('PASTE')){ S.auth = 'setup'; renderAll(); return; }
  const app = F.initializeApp(firebaseConfig);
  S.fs = F.initializeFirestore(app, {ignoreUndefinedProperties: true, localCache: F.persistentLocalCache({tabManager: F.persistentMultipleTabManager(), cacheSizeBytes: F.CACHE_SIZE_UNLIMITED})});
  S.authObj = F.getAuth(app);
  renderAll();
  F.onAuthStateChanged(S.authObj, user => {
    if (!user){ S.auth = 'signedOut'; S.user = null; renderAll(); return; }
    S.user = user; S.email = (user.email || '').toLowerCase(); S.isOwner = !!S.email && OWNERS.includes(S.email);
    UI.gate.email = UI.gate.email || S.email;
    if (!user.emailVerified){ S.auth = 'unverified'; renderAll(); return; }
    if (S.auth !== 'denied' && S.auth !== 'rules') S.auth = 'ready';
    renderAll(); startSync();
  });
}
boot();

// Exposed for automated checks only; nothing in the app depends on it.
window.__erp = { S, D: () => D, RAW, LIVE, purchaseCalc, parseNum, importClaude, enLettres, invoiceText: id => invoiceText(D.sales.find(x => x.id === id)) };
