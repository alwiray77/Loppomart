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
$("menuBtn").onclick = () => switchView("more");
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
  let txt = "*Daftar belanja LoppoMart* — " + dateLabel(today()) + "\n";
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
  const blob = new Blob([JSON.stringify({ app: "LoppoMart", version: 3, exportedAt: new Date().toISOString(), records: rows, shoppingItems: items }, null, 2)], { type: "application/json" });
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
    if (!newRows.length && !newItems.length) throw Error("Tidak ada data yang bisa dipulihkan");
    if (!confirm("Pulihkan " + newRows.length + " catatan dan " + newItems.length + " barang? Data dengan tanggal atau ID sama akan diganti.")) return;
    newRows.forEach(r => { const i = rows.findIndex(x => x.date === r.date); if (i < 0) rows.push(r); else rows[i] = r; });
    newItems.forEach(x => { const i = items.findIndex(y => y.id === x.id); if (i < 0) items.push(x); else items[i] = x; });
    rows.sort(byDate);
    persist(); persistItems();
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

function init() {
  initHints();
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
