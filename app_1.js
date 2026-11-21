"use strict";
/* LoppoMart 3.1 — keuangan & operasional warung.
   Kunci penyimpanan lama dipertahankan agar data versi 2/3 tetap terbaca. */

const $ = id => document.getElementById(id);
const KEY = "loppomart_v2_records", SHOPKEY = "loppomart_v2_shopping", BACKUPKEY = "loppomart_last_backup";
const VIEWS = ["home", "entry", "shopping", "report", "more"];
const FIELDS = ["date", "opening", "revenue", "cogs", "stock", "supplier", "salary", "operating", "personal", "installment", "note"];
const MONEY_FIELDS = ["opening", "revenue", "cogs", "stock", "supplier", "salary", "operating", "personal", "installment"];
const BLANK = { opening: 0, revenue: 0, cogs: 0, stock: 0, supplier: 0, salary: 60000, operating: 0, personal: 0, installment: 0, note: "" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Data ---------- */
let rows = [], items = [], editingId = null;
try {
  const s = localStorage.getItem(KEY);
  const parsed = JSON.parse(s || localStorage.getItem("loppomart_v1") || "[]");
  rows = Array.isArray(parsed) ? parsed.filter(r => r && r.date) : [];
  if (!s && rows.length) localStorage.setItem(KEY, JSON.stringify(rows));
} catch (e) { rows = []; }
try {
  const p = JSON.parse(localStorage.getItem(SHOPKEY) || "[]");
  items = Array.isArray(p) ? p : [];
} catch (e) { items = []; }

/* ---------- Profil usaha ---------- */
const PROFILEKEY = "loppomart_profile";
const RESERVED_SUPPLIERS = ["Semua", "Semua barang", "Sudah dibeli"];
const DEFAULT_PROFILE = {
  business: "LoppoMart", owner: "", salary: 60000,
  suppliers: ["Sabtu - Sayap Mas", "Senin - Sayap Mas", "Sales lain", "Belanja sendiri"],
  pinHash: "", pinSalt: "", pinLen: 0
};
function cleanProfile(p) {
  const out = {};
  if (!p || typeof p !== "object") return out;
  if (typeof p.business === "string") out.business = p.business.trim().slice(0, 40);
  if (typeof p.owner === "string") out.owner = p.owner.trim().slice(0, 40);
  const sal = Number(p.salary);
  if (p.salary !== "" && p.salary != null && Number.isFinite(sal) && sal >= 0) out.salary = Math.round(sal);
  if (Array.isArray(p.suppliers)) {
    const seen = [];
    p.suppliers.forEach(s => {
      s = String(s).trim().slice(0, 40);
      if (s && !RESERVED_SUPPLIERS.includes(s) && !seen.includes(s)) seen.push(s);
    });
    if (seen.length) out.suppliers = seen.slice(0, 12);
  }
  return out;
}
function loadProfile() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(PROFILEKEY) || "{}") || {}; } catch (e) { stored = {}; }
  const p = Object.assign({}, DEFAULT_PROFILE, cleanProfile(stored));
  if (!p.business) p.business = DEFAULT_PROFILE.business;
  p.suppliers = p.suppliers.slice();
  const len = Number(stored.pinLen);
  if (typeof stored.pinHash === "string" && stored.pinHash && typeof stored.pinSalt === "string" && len >= 4 && len <= 6) {
    p.pinHash = stored.pinHash; p.pinSalt = stored.pinSalt; p.pinLen = len;
  } else { p.pinHash = ""; p.pinSalt = ""; p.pinLen = 0; }
  return p;
}
let profile = loadProfile();

/* ---------- Helper ---------- */
const pad = n => String(n).padStart(2, "0");
const fmtDate = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => fmtDate(new Date());
const dateFromOffset = off => { const d = new Date(); d.setDate(d.getDate() + off); return fmtDate(d); };
const byDate = (a, b) => a.date.localeCompare(b.date);
const money = n => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
const dateLabel = s => {
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? String(s) : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function btn(label, cls, onclick, aria) {
  const b = el("button", cls, label);
  b.type = "button";
  b.onclick = onclick;
  if (aria) b.setAttribute("aria-label", aria);
  return b;
}
function calc(r) {
  const revenue = +r.revenue || 0, cogs = +r.cogs || 0, salary = +r.salary || 0, operating = +r.operating || 0;
  const gross = revenue - cogs, profit = gross - salary - operating;
  const change = revenue - (+r.stock || 0) - (+r.supplier || 0) - salary - operating - (+r.personal || 0) - (+r.installment || 0);
  return { gross, profit, change, end: (+r.opening || 0) + change };
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch (e) { toast("Gagal menyimpan: penyimpanan penuh atau diblokir browser"); return false; }
}
const persist = () => save(KEY, rows);
const persistItems = () => save(SHOPKEY, items);

function toast(msg, action) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("has-action", !!action);
  if (action) {
    const b = el("button", null, action.label);
    b.type = "button";
    b.onclick = () => { action.run(); t.classList.remove("show"); };
    t.append(b);
  }
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), action ? 6500 : 2400);
}

/* ---------- Navigasi ---------- */
function switchView(name, push = true) {
  if (!VIEWS.includes(name)) name = "home";
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  document.querySelectorAll(".nav-item").forEach(b => {
    const on = b.dataset.view === name;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  document.querySelectorAll(".drawer-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  window.scrollTo({ top: 0, behavior: reduceMotion || !push ? "auto" : "smooth" });
  $("bottomNav").classList.remove("nav-hidden");
  if (push) { try { if (!history.state || history.state.v !== name) history.pushState({ v: name }, "", "#" + name); } catch (e) { /* abaikan */ } }
  if (name === "home") renderHome();
  if (name === "report") renderReport();
  if (name === "shopping") renderShopping();
}
document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => switchView(b.dataset.go)));
addEventListener("popstate", e => switchView((e.state && e.state.v) || location.hash.slice(1) || "home", false));
/* Menu geser (tombol ☰) */
function openDrawer() {
  $("drawer").classList.add("open");
  $("drawerOverlay").classList.add("open");
  $("drawer").setAttribute("aria-hidden", "false");
  $("menuBtn").setAttribute("aria-expanded", "true");
  document.body.classList.add("drawer-open");
  setTimeout(() => $("drawerClose").focus({ preventScroll: true }), 50);
}
function closeDrawer(restoreFocus = true) {
  if (!$("drawer").classList.contains("open")) return;
  $("drawer").classList.remove("open");
  $("drawerOverlay").classList.remove("open");
  $("drawer").setAttribute("aria-hidden", "true");
  $("menuBtn").setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");
  if (restoreFocus) $("menuBtn").focus({ preventScroll: true });
}
$("menuBtn").onclick = () => ($("drawer").classList.contains("open") ? closeDrawer() : openDrawer());
$("drawerClose").onclick = () => closeDrawer();
$("drawerOverlay").onclick = () => closeDrawer();
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
document.querySelectorAll(".drawer-item[data-view]").forEach(b => b.addEventListener("click", () => closeDrawer(false)));
$("drawerToday").onclick = () => {
  closeDrawer(false);
  $("date").value = today();
  $("date").dispatchEvent(new Event("change"));
  switchView("entry");
};
$("drawerBackup").onclick = () => { closeDrawer(false); exportBackup(); };
$("drawerLock").onclick = () => { closeDrawer(false); showLock(); };
$("quickBackup").onclick = () => switchView("more");

/* ---------- Form catatan harian ---------- */
function current() { return Object.fromEntries(FIELDS.map(k => [k, $(k).value])); }
function blankFor(date) {
  const prev = rows.filter(x => x.date < date).sort(byDate).pop();
  return Object.assign({}, BLANK, { date, opening: prev ? calc(prev).end : 0 });
}
function selectedRecord() { return rows.find(r => r.date === $("date").value); }
function latestRecord() { return rows.slice().sort((a, b) => b.date.localeCompare(a.date))[0]; }
function setForm(r) {
  FIELDS.forEach(k => {
    const input = $(k);
    if (!input) return;
    input.value = r && r[k] != null ? r[k] : (k === "date" ? today() : BLANK[k]);
  });
  preview();
}
function initHints() {
  MONEY_FIELDS.concat(["itemPrice"]).forEach(k => {
    const input = $(k), hint = el("small", "money-hint");
    hint.id = "hint-" + k;
    hint.setAttribute("aria-hidden", "true");
    input.after(hint);
  });
}
function preview() {
  const r = current(), c = calc(r);
  $("gross").textContent = money(c.gross);
  $("profit").textContent = money(c.profit);
  $("change").textContent = money(c.change);
  $("cashEnd").textContent = money(c.end);
  $("cashEnd2").textContent = money(c.end);
  [["profit", c.profit], ["change", c.change], ["cashEnd", c.end], ["cashEnd2", c.end]].forEach(([id, v]) => $(id).classList.toggle("neg", v < 0));
  MONEY_FIELDS.forEach(k => { $("hint-" + k).textContent = +r[k] ? money(r[k]) : ""; });
  const warn = [];
  if ((+r.revenue || 0) > 0 && (+r.cogs || 0) > (+r.revenue || 0)) warn.push("HPP lebih besar dari omzet. Cek lagi angkanya.");
  if (c.end < 0) warn.push("Saldo kas akhir minus. Cek saldo awal atau pengeluaran.");
  $("entryWarn").textContent = warn.join(" ");
  $("entryWarn").hidden = !warn.length;
  const exists = !!selectedRecord();
  $("dateHint").textContent = exists ? "✎ Sudah ada catatan di tanggal ini. Menyimpan akan memperbarui." : "＋ Catatan baru untuk tanggal ini.";
  $("dateHint").classList.toggle("is-new", !exists);
  document.querySelectorAll(".chip[data-date]").forEach(ch => ch.classList.toggle("active", dateFromOffset(+ch.dataset.date) === r.date));
}
FIELDS.forEach(k => $(k).addEventListener("input", preview));
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener("focus", () => { if (input.value === "0") input.value = ""; else if (input.select) input.select(); });
  /* Hapus nol di depan saat mengetik: "05" menjadi "5", "-007" menjadi "-7". */
  input.addEventListener("input", () => {
    const v = input.value;
    if (/^-?0+\d/.test(v)) input.value = v.replace(/^(-?)0+(?=\d)/, "$1");
  });
  input.addEventListener("blur", () => {
    if (input.value === "") { input.value = input.dataset.empty || "0"; input.dispatchEvent(new Event("input")); }
  });
});
$("date").addEventListener("change", () => {
  const r = selectedRecord();
  setForm(r || blankFor($("date").value));
});
document.querySelectorAll(".chip[data-date]").forEach(ch => ch.addEventListener("click", () => {
  $("date").value = dateFromOffset(+ch.dataset.date);
  $("date").dispatchEvent(new Event("change"));
}));

/* Saat catatan diubah, saldo awal catatan berikutnya ikut disesuaikan
   selama saldo awal itu memang meneruskan saldo akhir sebelumnya. */
function rechain(date, oldEnd, newEnd) {
  if (oldEnd === null || oldEnd === newEnd) return 0;
  let n = 0;
  for (const r of rows) {
    if (r.date <= date) continue;
    if ((+r.opening || 0) !== oldEnd) break;
    const nextOld = calc(r).end;
    r.opening = String(newEnd);
    oldEnd = nextOld;
    newEnd = calc(r).end;
    n++;
    if (oldEnd === newEnd) break;
  }
  return n;
}
$("entryForm").onsubmit = e => {
  e.preventDefault();
  const r = current();
  if (!r.date) return;
  const i = rows.findIndex(x => x.date === r.date);
  const prev = rows.filter(x => x.date < r.date).sort(byDate).pop();
  const oldEnd = i >= 0 ? calc(rows[i]).end : (prev ? calc(prev).end : null);
  if (i < 0) rows.push(r); else rows[i] = r;
  rows.sort(byDate);
  const fixed = rechain(r.date, oldEnd, calc(r).end);
  if (!persist()) return;
  $("entryStatus").textContent = "Catatan " + dateLabel(r.date) + (i >= 0 ? " diperbarui." : " disimpan.") +
    (fixed ? " " + fixed + " catatan berikutnya disesuaikan saldo awalnya." : "");
  toast(i >= 0 ? "Catatan diperbarui" : "Catatan harian tersimpan");
  preview(); renderHome(); renderReport();
};
$("clearEntry").onclick = () => {
  setForm(blankFor($("date").value || today()));
  $("entryStatus").textContent = "Form dikosongkan.";
};

function editRecord(r) { setForm(r); switchView("entry"); }
function removeRecord(r) {
  const snap = JSON.stringify(rows);
  const prev = rows.filter(x => x.date < r.date).sort(byDate).pop();
  const oldEnd = calc(r).end;
  rows = rows.filter(x => x.date !== r.date);
  const fixed = prev ? rechain(r.date, oldEnd, calc(prev).end) : 0;
  persist();
  if ($("date").value === r.date) setForm(blankFor(r.date));
  renderReport(); renderHome();
  toast("Catatan " + dateLabel(r.date) + " dihapus" + (fixed ? " · " + fixed + " saldo awal disesuaikan" : ""), {
    label: "Urungkan",
    run: () => { rows = JSON.parse(snap); persist(); preview(); renderReport(); renderHome(); }
  });
}

/* ---------- Beranda ---------- */
function monthRows() { const m = $("month").value || today().slice(0, 7); return rows.filter(r => (r.date || "").startsWith(m)); }
function totalPending() { return items.filter(x => !x.done).reduce((a, x) => a + (+x.qty || 0) * (+x.price || 0), 0); }
function renderBackupHint() {
  const ts = localStorage.getItem(BACKUPKEY), strip = $("backupStrip");
  let text, stale = false;
  if (!rows.length && !items.length) text = "Catat setiap transaksi setiap hari agar arus kas LoppoMart lebih mudah dipantau.";
  else if (!ts) { text = "Belum pernah backup. Ketuk di sini untuk mengamankan data."; stale = true; }
  else {
    const d = Math.floor((Date.now() - new Date(ts)) / 864e5);
    stale = d >= 7;
    text = d <= 0 ? "Backup terakhir hari ini. Data Anda aman." : "Backup terakhir " + d + " hari lalu." + (stale ? " Ketuk di sini untuk backup lagi." : "");
  }
  $("backupHint").textContent = text;
  strip.classList.toggle("stale", stale);
  strip.onclick = stale ? () => switchView("more") : null;
  strip.style.cursor = stale ? "pointer" : "";
  $("backupDot").hidden = !stale;
  $("lastBackup").textContent = ts ? "Backup terakhir: " + new Date(ts).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Belum pernah backup.";
}
function renderHome() {
  const r = rows.find(x => x.date === today()) || latestRecord();
  $("homeDate").textContent = r ? dateLabel(r.date) : dateLabel(today());
  $("homeBalance").textContent = r ? money(calc(r).end) : money(0);
  $("homeChange").textContent = r ? "Perubahan kas " + money(calc(r).change) + " · Saldo awal " + money(r.opening) : "Belum ada catatan hari ini";
  $("homeCash").textContent = r ? money(calc(r).end) : money(0);
  $("homeShopping").textContent = money(totalPending());
  const list = rows.filter(x => (x.date || "").startsWith(today().slice(0, 7)));
  const sum = k => list.reduce((a, x) => a + (+x[k] || 0), 0);
  $("homeRevenue").textContent = money(sum("revenue"));
  $("homeStock").textContent = money(sum("stock"));
  $("homeSupplier").textContent = money(sum("supplier"));
  $("homeProfit").textContent = money(list.reduce((a, x) => a + calc(x).profit, 0));
  const host = $("homeRecent");
  host.innerHTML = "";
  const recent = rows.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (!recent.length) {
    host.className = "list-card empty-state";
    host.textContent = "Belum ada catatan. Mulai catat transaksi LoppoMart hari ini.";
  } else {
    host.className = "stack-list";
    recent.forEach(rec => {
      const row = el("div", "data-row clickable");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", "Buka catatan " + dateLabel(rec.date));
      const left = el("div", "data-main");
      left.append(el("b", null, dateLabel(rec.date)), el("small", null, "Omzet " + money(rec.revenue) + " · " + (rec.note || "Tanpa catatan")));
      const right = el("div", "data-right");
      right.append(el("b", calc(rec).end < 0 ? "neg" : null, money(calc(rec).end)), el("small", null, "Saldo akhir"));
      row.append(left, right);
      row.onclick = () => editRecord(rec);
      row.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); editRecord(rec); } };
      host.append(row);
    });
  }
  renderBackupHint();
}

/* ---------- Laporan ---------- */
function shiftMonth(delta) {
  const [y, m] = ($("month").value || today().slice(0, 7)).split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  $("month").value = d.getFullYear() + "-" + pad(d.getMonth() + 1);
  renderReport();
}
function renderChart(list) {
  const host = $("dailyChart");
  host.innerHTML = "";
  $("chartCard").hidden = !list.length;
  if (!list.length) return;
  const max = Math.max(1, ...list.map(r => +r.revenue || 0));
  list.slice().sort(byDate).forEach(r => {
    const col = el("button", "bar-col");
    col.type = "button";
    col.setAttribute("aria-label", dateLabel(r.date) + ", omzet " + money(r.revenue));
    const track = el("span", "track"), bar = el("i");
    bar.style.height = Math.max(2, Math.round((+r.revenue || 0) / max * 100)) + "%";
    track.append(bar);
    col.append(track, el("small", null, String(+r.date.slice(8, 10))));
    col.onclick = () => toast(dateLabel(r.date) + " · Omzet " + money(r.revenue));
    host.append(col);
  });
}
function renderReport() {
  const list = monthRows(), sum = k => list.reduce((a, r) => a + (+r[k] || 0), 0);
  $("rRevenue").textContent = money(sum("revenue"));
  $("rCogs").textContent = money(sum("cogs"));
  $("rProfit").textContent = money(list.reduce((a, r) => a + calc(r).profit, 0));
  $("rStock").textContent = money(sum("stock"));
  $("rSupplier").textContent = money(sum("supplier"));
  $("rPersonal").textContent = money(sum("personal"));
  $("rOpex").textContent = money(sum("salary") + sum("operating"));
  $("rInstall").textContent = money(sum("installment"));
  $("rProfit").classList.toggle("neg", list.reduce((a, r) => a + calc(r).profit, 0) < 0);
  renderChart(list);
  const host = $("history");
  host.innerHTML = "";
  if (!list.length) {
    host.className = "stack-list empty-state";
    host.textContent = "Belum ada catatan untuk bulan ini.";
    return;
  }
  host.className = "stack-list";
  list.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
    const row = el("div", "data-row");
    const left = el("div", "data-main");
    left.append(el("b", null, dateLabel(r.date)), el("small", null, "Omzet " + money(r.revenue) + " · " + (r.note || "Tanpa catatan")));
    const right = el("div", "data-right");
    const actions = el("div", "row-actions");
    actions.append(
      btn("Edit", "mini-btn", () => editRecord(r), "Edit catatan " + dateLabel(r.date)),
      btn("Hapus", "mini-btn danger", () => removeRecord(r), "Hapus catatan " + dateLabel(r.date))
    );
    right.append(el("b", calc(r).end < 0 ? "neg" : null, money(calc(r).end)), actions);
    row.append(left, right);
    host.append(row);
  });
}
$("month").onchange = renderReport;
$("prevMonth").onclick = () => shiftMonth(-1);
$("nextMonth").onclick = () => shiftMonth(1);

/* ---------- Daftar belanja ---------- */
function ensureOption(value) {
  const sel = $("itemSupplier");
  if (value && ![...sel.options].some(o => o.value === value || o.text === value)) sel.add(new Option(value, value));
}
function itemMatches(x) {
  const f = $("shoppingFilter").value, q = $("shoppingSearch").value.trim().toLowerCase();
  const okFilter = f === "Semua" || (f === "Sudah dibeli" ? x.done : x.supplier === f);
  return okFilter && (!q || String(x.name).toLowerCase().includes(q));
}
function renderShopping() {
  $("shoppingTotal").textContent = money(totalPending());
  $("shoppingCount").textContent = items.filter(x => !x.done).length + " barang belum dibeli";
  const list = items.filter(itemMatches);
  const listPending = list.filter(x => !x.done).reduce((a, x) => a + x.qty * x.price, 0);
  $("shoppingTotalSmall").textContent = list.length + " item" + (listPending ? " · " + money(listPending) : "");
  $("clearDone").hidden = !items.some(x => x.done);
  $("shareShopping").disabled = !items.some(x => !x.done);
  const host = $("shoppingList");
  host.innerHTML = "";
  if (!list.length) {
    host.className = "stack-list empty-state";
    host.textContent = items.length ? "Tidak ada barang yang cocok dengan pencarian atau filter." : "Belum ada barang di daftar. Tambahkan barang yang kosong lewat formulir.";
    return;
  }
  host.className = "stack-list";
  list.slice().reverse().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).forEach(x => {
    const row = el("div", "data-row" + (x.done ? " done" : ""));
    const chk = el("button", "check");
    chk.type = "button";
    chk.setAttribute("aria-pressed", String(!!x.done));
    chk.setAttribute("aria-label", (x.done ? "Tandai belum dibeli: " : "Tandai sudah dibeli: ") + x.name);
    chk.append(el("span", null, "✓"));
    chk.onclick = () => { x.done = !x.done; persistItems(); renderShopping(); renderHome(); };
    const left = el("div", "data-main");
    left.append(
      el("b", x.done ? "done-text" : "", x.name),
      el("small", null, x.qty + " × " + money(x.price) + " · " + x.supplier)
    );
    const right = el("div", "data-right");
    const actions = el("div", "row-actions");
    actions.append(
      btn("Edit", "mini-btn", () => startEditItem(x), "Edit " + x.name),
      btn("Hapus", "mini-btn danger", () => removeItem(x), "Hapus " + x.name)
    );
    right.append(el("b", null, money(x.qty * x.price)), actions);
    row.append(chk, left, right);
    host.append(row);
  });
}
function updateItemSubtotal() {
  const price = Number($("itemPrice").value) || 0;
  $("itemSubtotal").textContent = money((Number($("itemQty").value) || 0) * price);
  $("hint-itemPrice").textContent = price ? money(price) : "";
}
["itemQty", "itemPrice"].forEach(id => $(id).addEventListener("input", updateItemSubtotal));
function resetItemForm() {
  editingId = null;
  $("itemName").value = "";
  $("itemQty").value = "1";
  $("itemPrice").value = "0";
  $("itemFormTitle").textContent = "Tambah barang";
  $("itemSubmit").textContent = "+ Simpan ke daftar belanja";
  $("cancelItemEdit").hidden = true;
  updateItemSubtotal();
}
function startEditItem(x) {
  editingId = x.id;
  $("itemName").value = x.name;
  $("itemQty").value = x.qty;
  $("itemPrice").value = x.price;
  ensureOption(x.supplier);
  $("itemSupplier").value = x.supplier;
  $("itemFormTitle").textContent = "Edit barang";
  $("itemSubmit").textContent = "Simpan perubahan";
  $("cancelItemEdit").hidden = false;
  $("itemStatus").textContent = "";
  updateItemSubtotal();
  $("itemName").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  $("itemName").focus({ preventScroll: true });
}
$("cancelItemEdit").onclick = () => { resetItemForm(); $("itemStatus").textContent = ""; };
$("itemForm").onsubmit = e => {
  e.preventDefault();
  const name = $("itemName").value.trim();
  if (!name) return;
  const data = {
    name,
    qty: Math.max(1, Number($("itemQty").value) || 1),
    price: Math.max(0, Number($("itemPrice").value) || 0),
    supplier: $("itemSupplier").value
  };
  if (editingId) {
    const it = items.find(y => y.id === editingId);
    if (it) Object.assign(it, data);
    toast("Barang diperbarui");
    $("itemStatus").textContent = "Perubahan disimpan.";
  } else {
    items.push(Object.assign({ id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 7), done: false, createdAt: new Date().toISOString() }, data));
    toast("Barang ditambahkan");
    $("itemStatus").textContent = "Barang berhasil ditambahkan.";
  }
  persistItems();
  resetItemForm();
  renderShopping(); renderHome();
  $("itemName").focus({ preventScroll: true });
};
function removeItem(x) {
  const snap = JSON.stringify(items);
  items = items.filter(y => y.id !== x.id);
  if (editingId === x.id) resetItemForm();
  persistItems(); renderShopping(); renderHome();
  toast("“" + x.name + "” dihapus", { label: "Urungkan", run: () => { items = JSON.parse(snap); persistItems(); renderShopping(); renderHome(); } });
}
$("clearDone").onclick = () => {
  const snap = JSON.stringify(items), n = items.filter(x => x.done).length;
  items = items.filter(x => !x.done);
  resetItemForm();
  persistItems(); renderShopping(); renderHome();
  toast(n + " barang yang sudah dibeli dibersihkan", { label: "Urungkan", run: () => { items = JSON.parse(snap); persistItems(); renderShopping(); renderHome(); } });
};
function shoppingText() {
  const f = $("shoppingFilter").value;
  const list = items.filter(x => !x.done && (f === "Semua" || f === "Sudah dibeli" || x.supplier === f));
  if (!list.length) return "";
  const groups = {};
  list.forEach(x => { (groups[x.supplier] = groups[x.supplier] || []).push(x); });
  let txt = "*Daftar belanja " + profile.business + "* — " + dateLabel(today()) + "\n";
  Object.keys(groups).forEach(s => {
    txt += "\n*" + s + "*\n";
    groups[s].forEach((x, i) => { txt += (i + 1) + ". " + x.name + " × " + x.qty + (x.price ? " (" + money(x.price) + ")" : "") + "\n"; });
  });
  return txt + "\nEstimasi: " + money(list.reduce((a, x) => a + x.qty * x.price, 0));
}
$("shareShopping").onclick = async () => {
  const text = shoppingText();
  if (!text) { toast("Tidak ada barang untuk dibagikan"); return; }
  try {
    if (navigator.share) await navigator.share({ text });
    else window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
  } catch (err) { if (err && err.name !== "AbortError") toast("Gagal membagikan daftar"); }
};
$("shoppingFilter").onchange = renderShopping;
$("shoppingSearch").addEventListener("input", renderShopping);

/* ---------- Backup, pulihkan, CSV ---------- */
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportBackup() {
  const blob = new Blob([JSON.stringify({ app: "LoppoMart", version: 3, exportedAt: new Date().toISOString(), records: rows, shoppingItems: items, profile: { business: profile.business, owner: profile.owner, salary: profile.salary, suppliers: profile.suppliers } }, null, 2)], { type: "application/json" });
  download(blob, "backup-loppomart-" + today() + ".json");
  try { localStorage.setItem(BACKUPKEY, new Date().toISOString()); } catch (e) { /* abaikan */ }
  $("backupStatus").textContent = "Backup catatan dan daftar belanja berhasil dibuat.";
  toast("Backup berhasil diunduh");
  renderBackupHint();
}
$("export").onclick = exportBackup;

const nonNeg = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
function cleanRecord(r) {
  if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))) return null;
  const out = { date: String(r.date) };
  MONEY_FIELDS.forEach(k => {
    const n = Number(r[k]);
    out[k] = String(k === "opening" ? (Number.isFinite(n) ? n : 0) : nonNeg(r[k]));
  });
  out.note = String(r.note == null ? "" : r.note).slice(0, 500);
  return out;
}
function cleanItem(x) {
  if (!x || !String(x.name || "").trim()) return null;
  return {
    id: x.id ? String(x.id) : Date.now().toString() + "-" + Math.random().toString(36).slice(2, 7),
    name: String(x.name).trim().slice(0, 120),
    qty: Math.max(1, Number(x.qty) || 1),
    price: nonNeg(x.price),
    supplier: String(x.supplier || "Sales lain").slice(0, 60),
    done: !!x.done,
    createdAt: x.createdAt || new Date().toISOString()
  };
}
$("import").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    const rawRows = Array.isArray(d) ? d : d.records || [], rawItems = Array.isArray(d) ? [] : d.shoppingItems || [];
    if (!Array.isArray(rawRows) || !Array.isArray(rawItems)) throw Error("Format backup tidak dikenali");
    const newRows = rawRows.map(cleanRecord).filter(Boolean), newItems = rawItems.map(cleanItem).filter(Boolean);
    const newProfile = !Array.isArray(d) && d.profile ? cleanProfile(d.profile) : {};
    const hasProfile = Object.keys(newProfile).length > 0;
    if (!newRows.length && !newItems.length && !hasProfile) throw Error("Tidak ada data yang bisa dipulihkan");
    if (!confirm("Pulihkan " + newRows.length + " catatan dan " + newItems.length + " barang" + (hasProfile ? " beserta profil usaha" : "") + "? Data dengan tanggal atau ID sama akan diganti.")) return;
    if (hasProfile) {
      Object.assign(profile, newProfile);
      if (!profile.business) profile.business = DEFAULT_PROFILE.business;
      saveProfile();
    }
    newRows.forEach(r => { const i = rows.findIndex(x => x.date === r.date); if (i < 0) rows.push(r); else rows[i] = r; });
    newItems.forEach(x => { const i = items.findIndex(y => y.id === x.id); if (i < 0) items.push(x); else items[i] = x; });
    rows.sort(byDate);
    persist(); persistItems();
    applyProfile(); populateProfileForm();
    setForm(selectedRecord() || blankFor($("date").value || today()));
    renderHome(); renderReport(); renderShopping();
    $("backupStatus").textContent = "Backup berhasil dipulihkan (" + newRows.length + " catatan, " + newItems.length + " barang).";
    toast("Data berhasil dipulihkan");
  } catch (err) {
    $("backupStatus").textContent = "Gagal memulihkan: " + err.message;
  }
  e.target.value = "";
};
$("exportCsv").onclick = () => {
  const data = monthRows().slice().sort(byDate);
  if (!data.length) { toast("Tidak ada catatan di bulan ini"); return; }
  const cols = ["date", "opening", "revenue", "cogs", "stock", "supplier", "salary", "operating", "personal", "installment", "note", "cashEnd", "profit"];
  const head = ["Tanggal", "Saldo awal", "Omzet", "HPP", "Belanja stok", "Bayar tagihan sales", "Gaji", "Operasional", "Pengambilan pribadi", "Cicilan", "Catatan", "Saldo akhir", "Laba operasional"];
  const esc = v => { let s = String(v == null ? "" : v); if (/^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const lines = [head.map(esc).join(","), ...data.map(r => cols.map(k => esc(k === "cashEnd" ? calc(r).end : k === "profit" ? calc(r).profit : r[k])).join(","))];
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), "laporan-loppomart-" + $("month").value + ".csv");
  toast("Laporan CSV diunduh");
};

/* ---------- PWA, koneksi, perilaku layar ---------- */
function updateNet(first) {
  const online = navigator.onLine, pill = $("connection");
  if (pill) { pill.textContent = online ? "Online" : "Offline"; pill.classList.toggle("offline", !online); }
  if (!first) toast(online ? "Kembali online" : "Anda offline. Aplikasi tetap bisa dipakai.");
}
addEventListener("online", () => updateNet());
addEventListener("offline", () => updateNet());

let installPrompt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; $("installBtn").hidden = false; });
$("installBtn").onclick = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  try { await installPrompt.userChoice; } catch (e) { /* abaikan */ }
  installPrompt = null;
  $("installBtn").hidden = true;
};
addEventListener("appinstalled", () => { $("installBtn").hidden = true; toast("LoppoMart terpasang di perangkat"); });

let lastY = window.scrollY || 0, ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY || 0, delta = y - lastY, nav = $("bottomNav");
    if (y < 35 || delta < -4) nav.classList.remove("nav-hidden");
    else if (delta > 7 && y > 75) nav.classList.add("nav-hidden");
    lastY = y;
    ticking = false;
  });
}, { passive: true });
/* Sembunyikan navigasi bawah saat mengetik agar tidak menutupi layar kecil. */
document.addEventListener("focusin", e => { if (e.target.matches("input,select,textarea")) $("bottomNav").classList.add("nav-hidden"); });
document.addEventListener("focusout", () => setTimeout(() => {
  if (!document.activeElement || !document.activeElement.matches("input,select,textarea")) $("bottomNav").classList.remove("nav-hidden");
}, 150));
$("bottomNav").querySelectorAll("button").forEach(b => b.addEventListener("click", () => $("bottomNav").classList.remove("nav-hidden")));

function registerSW() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

/* ---------- Terapkan profil ---------- */
const saveProfile = () => save(PROFILEKEY, profile);
function supplierList() {
  const extra = [...new Set(items.map(x => x.supplier).filter(Boolean))].filter(s => !profile.suppliers.includes(s));
  return profile.suppliers.concat(extra);
}
function applySuppliers() {
  const sel = $("itemSupplier"), fil = $("shoppingFilter"), curS = sel.value, curF = fil.value;
  sel.innerHTML = "";
  profile.suppliers.forEach(s => sel.add(new Option(s, s)));
  fil.innerHTML = "";
  fil.add(new Option("Semua barang", "Semua"));
  supplierList().forEach(s => fil.add(new Option(s, s)));
  fil.add(new Option("Sudah dibeli", "Sudah dibeli"));
  sel.value = profile.suppliers.includes(curS) ? curS : profile.suppliers[0];
  fil.value = [...fil.options].some(o => o.value === curF) ? curF : "Semua";
}
function applyProfile() {
  const name = profile.business;
  document.title = name;
  $("brandName").textContent = name;
  $("drawerBrand").textContent = name;
  $("lockTitle").textContent = name;
  BLANK.salary = profile.salary;
  $("homeGreeting").textContent = profile.owner ? "Halo, " + profile.owner + " 👋" : "";
  $("homeGreeting").hidden = !profile.owner;
  $("drawerLock").hidden = !profile.pinHash;
  applySuppliers();
}
function populateProfileForm() {
  $("profBusiness").value = profile.business;
  $("profOwner").value = profile.owner;
  $("profSalary").value = profile.salary;
  $("profSuppliers").value = profile.suppliers.join("\n");
}
$("profileForm").onsubmit = e => {
  e.preventDefault();
  const p = cleanProfile({ business: $("profBusiness").value, owner: $("profOwner").value, salary: $("profSalary").value, suppliers: $("profSuppliers").value.split("\n") });
  if (!p.suppliers) { $("profileStatus").textContent = "Isi minimal satu nama sales. Nama “Semua” dan “Sudah dibeli” tidak boleh dipakai."; return; }
  profile.business = p.business || DEFAULT_PROFILE.business;
  profile.owner = p.owner || "";
  if (p.salary != null) profile.salary = p.salary;
  profile.suppliers = p.suppliers;
  if (!saveProfile()) return;
  applyProfile(); populateProfileForm(); renderShopping(); renderHome();
  if (!selectedRecord()) setForm(blankFor($("date").value || today()));
  $("profileStatus").textContent = "Profil berhasil disimpan.";
  toast("Profil disimpan");
};

/* ---------- Kunci PIN ---------- */
function randomSalt() {
  const a = new Uint8Array(8);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPin(pin, salt) {
  const data = salt + ":" + pin;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  /* Cadangan jika halaman dibuka tanpa HTTPS (mis. file lokal) */
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < data.length; i++) { const c = data.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "f" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
async function verifyPin(pin) {
  return !!profile.pinHash && (await hashPin(String(pin), profile.pinSalt)) === profile.pinHash;
}
function renderPinUi() {
  const has = !!profile.pinHash;
  $("pinState").textContent = has ? "PIN aktif (" + profile.pinLen + " angka). Aplikasi meminta PIN saat dibuka." : "PIN belum diatur. Aplikasi bisa dibuka siapa saja yang memegang HP ini.";
  $("pinCurrentWrap").hidden = !has;
  $("pinRemove").hidden = !has;
  $("pinSave").textContent = has ? "Ubah PIN" : "Simpan PIN";
  $("drawerLock").hidden = !has;
}
document.querySelectorAll(".pin-input,#lockInput").forEach(input => input.addEventListener("input", () => {
  const v = input.value.replace(/\D/g, "");
  if (v !== input.value) input.value = v;
}));
function clearPinFields() { ["pinCurrent", "pinNew", "pinConfirm"].forEach(id => { $(id).value = ""; }); }
$("pinForm").onsubmit = async e => {
  e.preventDefault();
  const say = t => { $("pinStatus").textContent = t; };
  const has = !!profile.pinHash, n = $("pinNew").value, c = $("pinConfirm").value;
  if (has && !(await verifyPin($("pinCurrent").value))) { say("PIN saat ini salah."); return; }
  if (!/^\d{4,6}$/.test(n)) { say("PIN baru harus 4–6 angka."); return; }
  if (n !== c) { say("Ulangi PIN tidak sama dengan PIN baru."); return; }
  const salt = randomSalt();
  profile.pinSalt = salt;
  profile.pinHash = await hashPin(n, salt);
  profile.pinLen = n.length;
  if (!saveProfile()) return;
  clearPinFields(); renderPinUi();
  say("PIN berhasil disimpan.");
  toast("PIN disimpan");
};
$("pinRemove").onclick = async () => {
  const say = t => { $("pinStatus").textContent = t; };
  if (!(await verifyPin($("pinCurrent").value))) { say("Masukkan PIN saat ini dengan benar untuk menghapus PIN."); return; }
  if (!confirm("Hapus PIN? Aplikasi tidak akan terkunci lagi.")) return;
  profile.pinHash = ""; profile.pinSalt = ""; profile.pinLen = 0;
  if (!saveProfile()) return;
  clearPinFields(); renderPinUi(); hideLock();
  say("PIN dihapus.");
  toast("PIN dihapus");
};

/* Layar kunci */
let failCount = 0, lockUntil = 0, hiddenAt = 0, unlocking = false;
function showLock() {
  if (!profile.pinHash) return;
  document.documentElement.classList.add("locked");
  $("lockInput").maxLength = profile.pinLen;
  $("lockInput").value = "";
  $("lockMsg").textContent = "";
  $("lockForgotBox").hidden = true;
  setTimeout(() => $("lockInput").focus(), 60);
}
function hideLock() { document.documentElement.classList.remove("locked"); }
async function tryUnlock() {
  if (unlocking) return;
  const wait = Math.ceil((lockUntil - Date.now()) / 1000);
  if (wait > 0) { $("lockMsg").textContent = "Terlalu banyak percobaan. Coba lagi dalam " + wait + " detik."; return; }
  unlocking = true;
  try {
    if (await verifyPin($("lockInput").value)) { failCount = 0; hideLock(); $("lockInput").value = ""; }
    else {
      failCount++;
      $("lockInput").value = "";
      if (failCount >= 5) { failCount = 0; lockUntil = Date.now() + 30000; $("lockMsg").textContent = "PIN salah 5 kali. Tunggu 30 detik."; }
      else $("lockMsg").textContent = "PIN salah. Coba lagi.";
    }
  } finally { unlocking = false; }
}
$("lockForm").onsubmit = e => { e.preventDefault(); tryUnlock(); };
$("lockInput").addEventListener("input", () => { if (profile.pinLen && $("lockInput").value.length === profile.pinLen) tryUnlock(); });
$("lockForgot").onclick = () => { $("lockForgotBox").hidden = !$("lockForgotBox").hidden; };
$("lockReset").onclick = () => {
  if (!confirm("Ini akan MENGHAPUS semua catatan, daftar belanja, dan profil di perangkat ini. Lanjutkan?")) return;
  if (!confirm("Yakin? Tindakan ini tidak bisa diurungkan.")) return;
  [KEY, SHOPKEY, PROFILEKEY, BACKUPKEY, "loppomart_v1"].forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } });
  location.reload();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (profile.pinHash && hiddenAt && Date.now() - hiddenAt > 120000) showLock();
});

function init() {
  initHints();
  applyProfile(); populateProfileForm(); renderPinUi();
  if (profile.pinHash) showLock(); else hideLock();
  $("date").value = today();
  $("month").value = today().slice(0, 7);
  setForm(selectedRecord() || blankFor(today()));
  renderHome(); renderReport(); renderShopping();
  updateNet(true); updateItemSubtotal(); registerSW();
  const first = location.hash.slice(1), start = VIEWS.includes(first) ? first : "home";
  try { history.replaceState({ v: start }, "", "#" + start); } catch (e) { /* abaikan */ }
  switchView(start, false);
}
init();
