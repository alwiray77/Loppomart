const $=id=>document.getElementById(id);
const KEY="loppomart_v2_records",SHOPKEY="loppomart_v2_shopping";
const ids=["date","opening","revenue","cogs","stock","supplier","salary","operating","personal","installment","note"];
let rows=[],items=[];
try{const s=localStorage.getItem(KEY);rows=JSON.parse(s||localStorage.getItem("loppomart_v1")||"[]");if(!s&&rows.length)localStorage.setItem(KEY,JSON.stringify(rows));}catch(e){rows=[]}
try{items=JSON.parse(localStorage.getItem(SHOPKEY)||"[]")}catch(e){items=[]}
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const num=id=>Number($(id)?.value)||0;
const dateLabel=s=>new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
function calc(r){const revenue=+r.revenue||0,cogs=+r.cogs||0,salary=+r.salary||0,operating=+r.operating||0;const gross=revenue-cogs,profit=gross-salary-operating;const change=revenue-(+r.stock||0)-(+r.supplier||0)-salary-operating-(+r.personal||0)-(+r.installment||0);return{gross,profit,change,end:(+r.opening||0)+change}}
function persist(){localStorage.setItem(KEY,JSON.stringify(rows))}
function persistItems(){localStorage.setItem(SHOPKEY,JSON.stringify(items))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2300)}
function current(){return Object.fromEntries(ids.map(k=>[k,$(k).value]))}
function setForm(r){ids.forEach(k=>{if($(k))$(k).value=r?.[k]??(k==="date"?today():k==="salary"?"60000":k==="note"?"":"0")});preview()}
function preview(){const c=calc(current());$("gross").textContent=money(c.gross);$("profit").textContent=money(c.profit);$("change").textContent=money(c.change);$("cashEnd").textContent=money(c.end)}
function selectedRecord(){return rows.find(r=>r.date===$("date").value)}
function latestRecord(){return rows.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]}
function switchView(name){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));window.scrollTo({top:0,behavior:"smooth"});$("bottomNav").classList.remove("nav-hidden");if(name==="home")renderHome();if(name==="report")renderReport();if(name==="shopping")renderShopping()}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.go)));
$("menuBtn").onclick=()=>switchView("more");$("quickBackup").onclick=()=>{switchView("more");toast("Menu backup dibuka")};
$("date").value=today();$("month").value=today().slice(0,7);
ids.forEach(k=>{const el=$(k);el.addEventListener("input",preview);if(el.type==="number"){el.addEventListener("focus",()=>{if(el.value==="0")el.value=""});el.addEventListener("blur",()=>{if(el.value==="")el.value="0";preview()})}});
$("date").addEventListener("change",()=>{const r=selectedRecord();if(r)setForm(r);else{const prev=rows.filter(x=>x.date<=$("date").value).sort((a,b)=>b.date.localeCompare(a.date))[0];setForm({date:$("date").value,opening:prev?calc(prev).end:0,revenue:0,cogs:0,stock:0,supplier:0,salary:60000,operating:0,personal:0,installment:0,note:""})}});
$("entryForm").onsubmit=e=>{e.preventDefault();const r=current();if(!r.date)return;const i=rows.findIndex(x=>x.date===r.date);if(i<0)rows.push(r);else rows[i]=r;rows.sort((a,b)=>a.date.localeCompare(b.date));persist();$("entryStatus").textContent="Catatan berhasil disimpan di perangkat ini.";toast("Catatan harian tersimpan");renderHome();renderReport()};
$("clearEntry").onclick=()=>{setForm({date:today(),opening:0,revenue:0,cogs:0,stock:0,supplier:0,salary:60000,operating:0,personal:0,installment:0,note:""});$("entryStatus").textContent="Form dikosongkan."};
function monthRows(){const m=$("month").value||today().slice(0,7);return rows.filter(r=>(r.date||"").startsWith(m))}
function totalPending(){return items.filter(x=>!x.done).reduce((a,x)=>a+(+x.qty||0)*(+x.price||0),0)}
function renderHome(){
 const r=rows.find(x=>x.date===today())||latestRecord();
 $("homeDate").textContent=r?dateLabel(r.date):dateLabel(today());
 $("homeBalance").textContent=r?money(calc(r).end):money(0);
 $("homeChange").textContent=r?"Perubahan kas "+money(calc(r).change)+" · Saldo awal "+money(r.opening):"Belum ada catatan hari ini";
 $("homeCash").textContent=r?money(calc(r).end):money(0);
 $("homeShopping").textContent=money(totalPending());
 const list=rows.filter(x=>(x.date||"").startsWith(today().slice(0,7)));
 const sum=k=>list.reduce((a,x)=>a+(+x[k]||0),0);
 $("homeRevenue").textContent=money(sum("revenue"));$("homeStock").textContent=money(sum("stock"));
 $("homeSupplier").textContent=money(sum("supplier"));$("homeProfit").textContent=money(list.reduce((a,x)=>a+calc(x).profit,0));
 const host=$("homeRecent");host.innerHTML="";
 const recent=rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 if(!recent.length){host.className="list-card empty-state";host.textContent="Belum ada catatan. Mulai catat transaksi LoppoMart hari ini.";return}
 host.className="stack-list";recent.forEach(r=>{const el=document.createElement("div");el.className="data-row";el.innerHTML=`<div class="data-main"><b>${dateLabel(r.date)}</b><small>Omzet ${money(r.revenue)} · ${safe(r.note||"Tanpa catatan")}</small></div><div class="data-right"><b>${money(calc(r).end)}</b><small>Saldo akhir</small></div>`;host.append(el)});
}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderReport(){
 const list=monthRows(),sum=k=>list.reduce((a,r)=>a+(+r[k]||0),0);
 $("rRevenue").textContent=money(sum("revenue"));$("rCogs").textContent=money(sum("cogs"));
 $("rProfit").textContent=money(list.reduce((a,r)=>a+calc(r).profit,0));$("rStock").textContent=money(sum("stock"));
 $("rSupplier").textContent=money(sum("supplier"));$("rPersonal").textContent=money(sum("personal"));
 const host=$("history");host.innerHTML="";
 if(!list.length){host.className="stack-list empty-state";host.textContent="Belum ada catatan untuk bulan ini.";return}
 host.className="stack-list";
 list.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(r=>{
  const row=document.createElement("div");row.className="data-row";
  const left=document.createElement("div");left.className="data-main";
  const title=document.createElement("b");title.textContent=dateLabel(r.date);
  const detail=document.createElement("small");detail.textContent="Omzet "+money(r.revenue)+" · "+(r.note||"Tanpa catatan");
  left.append(title,detail);
  const right=document.createElement("div");right.className="data-right";
  const amount=document.createElement("b");amount.textContent=money(calc(r).end);
  const actions=document.createElement("div");actions.className="row-actions";
  const edit=document.createElement("button");edit.className="mini-btn";edit.textContent="Edit";edit.onclick=()=>{setForm(r);switchView("entry")};
  const del=document.createElement("button");del.className="mini-btn danger";del.textContent="Hapus";del.onclick=()=>{if(confirm("Hapus catatan "+r.date+"?")){rows=rows.filter(x=>x.date!==r.date);persist();renderReport();renderHome();toast("Catatan dihapus")}};
  actions.append(edit,del);right.append(amount,actions);row.append(left,right);host.append(row)
 });
}
$("month").onchange=renderReport;
function renderShopping(){
 $("shoppingTotal").textContent=money(totalPending());const pending=items.filter(x=>!x.done);
 $("shoppingCount").textContent=pending.length+" barang belum dibeli";$("shoppingTotalSmall").textContent=items.length+" item";
 const f=$("shoppingFilter").value;const list=items.filter(x=>f==="Semua"||(f==="Sudah dibeli"?x.done:x.supplier===f));
 const host=$("shoppingList");host.innerHTML="";
 if(!list.length){host.className="stack-list empty-state";host.textContent="Belum ada barang pada filter ini.";return}
 host.className="stack-list";
 list.slice().reverse().forEach(x=>{
  const row=document.createElement("div");row.className="data-row";
  const left=document.createElement("div");left.className="data-main";
  const name=document.createElement("b");name.className=x.done?"done-text":"";name.textContent=x.name;
  const meta=document.createElement("small");meta.textContent=`${x.qty} × ${money(x.price)} · ${x.supplier}`;
  const sub=document.createElement("small");sub.textContent="Subtotal: "+money(x.qty*x.price);
  left.append(name,meta,sub);
  const right=document.createElement("div");right.className="data-right";
  const price=document.createElement("b");price.textContent=money(x.qty*x.price);
  const actions=document.createElement("div");actions.className="row-actions";
  const toggle=document.createElement("button");toggle.className="mini-btn";toggle.textContent=x.done?"Belum dibeli":"Sudah dibeli";toggle.onclick=()=>{x.done=!x.done;persistItems();renderShopping();renderHome()};
  const del=document.createElement("button");del.className="mini-btn danger";del.textContent="Hapus";del.onclick=()=>{if(confirm("Hapus "+x.name+"?")){items=items.filter(y=>y.id!==x.id);persistItems();renderShopping();renderHome()}};
  actions.append(toggle,del);right.append(price,actions);row.append(left,right);host.append(row)
 });
}
function updateItemSubtotal(){$("itemSubtotal").textContent=money((Number($("itemQty").value)||0)*(Number($("itemPrice").value)||0))}
["itemQty","itemPrice"].forEach(id=>$(id).addEventListener("input",updateItemSubtotal));
$("itemForm").onsubmit=e=>{e.preventDefault();const name=$("itemName").value.trim();if(!name)return;items.push({id:Date.now().toString()+"-"+Math.random().toString(36).slice(2,7),name,qty:Math.max(1,Number($("itemQty").value)||1),price:Math.max(0,Number($("itemPrice").value)||0),supplier:$("itemSupplier").value,done:false,createdAt:new Date().toISOString()});persistItems();$("itemName").value="";$("itemQty").value="1";$("itemPrice").value="0";updateItemSubtotal();$("itemStatus").textContent="Barang berhasil ditambahkan.";renderShopping();renderHome();toast("Barang ditambahkan")};
$("shoppingFilter").onchange=renderShopping;
function exportBackup(){const blob=new Blob([JSON.stringify({app:"LoppoMart",version:3,exportedAt:new Date().toISOString(),records:rows,shoppingItems:items},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="backup-loppomart-"+today()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$("backupStatus").textContent="Backup catatan dan daftar belanja berhasil dibuat.";toast("Backup berhasil diunduh")}
$("export").onclick=exportBackup;$("quickBackup").onclick=()=>{switchView("more");};
$("import").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!confirm("Pulihkan data backup? Catatan dengan tanggal dan barang dengan ID sama akan diganti."))return;const arr=d.records||[],shop=d.shoppingItems||[];if(!Array.isArray(arr)||!Array.isArray(shop))throw Error("Format backup tidak dikenali");arr.forEach(r=>{if(!r.date)return;const i=rows.findIndex(x=>x.date===r.date);if(i<0)rows.push(r);else rows[i]=r});shop.forEach(x=>{if(!x.id)return;const i=items.findIndex(y=>y.id===x.id);if(i<0)items.push(x);else items[i]=x});persist();persistItems();renderHome();renderReport();renderShopping();$("backupStatus").textContent="Backup berhasil dipulihkan.";toast("Data berhasil dipulihkan")}catch(err){$("backupStatus").textContent="Gagal memulihkan: "+err.message}e.target.value=""};
$("exportCsv").onclick=()=>{const data=monthRows();const cols=["date","opening","revenue","cogs","stock","supplier","salary","operating","personal","installment","note","cashEnd","profit"];const esc=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const lines=[cols.join(","),...data.map(r=>cols.map(k=>esc(k==="cashEnd"?calc(r).end:k==="profit"?calc(r).profit:r[k])).join(","))];const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="laporan-loppomart-"+$("month").value+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
function updateNet(){const online=navigator.onLine;const el=$("connection");if(el){el.textContent=online?"Online":"Offline";el.classList.toggle("offline",!online)}}
addEventListener("online",updateNet);addEventListener("offline",updateNet);
let lastY=window.scrollY||0,ticking=false;window.addEventListener("scroll",()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=window.scrollY||0,delta=y-lastY;const nav=$("bottomNav");if(y<35||delta< -4)nav.classList.remove("nav-hidden");else if(delta>7&&y>75)nav.classList.add("nav-hidden");lastY=y;ticking=false})},{passive:true});
$("bottomNav").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{$("bottomNav").classList.remove("nav-hidden")}));
function registerSW(){if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{})}
function init(){const saved=selectedRecord();if(saved)setForm(saved);else{const prev=rows.filter(x=>x.date<=today()).sort((a,b)=>b.date.localeCompare(a.date))[0];setForm({date:today(),opening:prev?calc(prev).end:0,revenue:0,cogs:0,stock:0,supplier:0,salary:60000,operating:0,personal:0,installment:0,note:""})}renderHome();renderReport();renderShopping();updateNet();updateItemSubtotal();registerSW()}
init();
