const FOODS = [
  {n:"Weet-Bix 2 biscuits",k:140,p:5,c:25,f:1,shop:"Woolworths"},
  {n:"Bakers Life toast 1 slice",k:120,p:4,c:22,f:1.5,shop:"ALDI"},
  {n:"Farmdale full cream milk 250ml",k:160,p:8,c:12,f:8,shop:"ALDI"},
  {n:"Hillcrest oats 40g",k:150,p:5,c:27,f:3,shop:"ALDI"},
  {n:"Belmont tasty cheese 30g",k:120,p:7,c:0.5,f:10,shop:"ALDI"},
  {n:"Baked beans 1/2 can",k:120,p:6,c:20,f:0.5,shop:"ALDI"},
  {n:"Choceur dark chocolate 20g",k:110,p:1.5,c:8,f:8,shop:"ALDI"},
  {n:"Coles white bread 1 slice",k:80,p:3,c:15,f:1,shop:"Coles"},
  {n:"Woolworths free range egg",k:70,p:6,c:0.5,f:5,shop:"Woolworths"},
  {n:"Chicken breast 100g cooked",k:165,p:31,c:0,f:3.6,shop:"generic"},
  {n:"Banana medium",k:105,p:1.3,c:27,f:0.4,shop:"generic"},
  {n:"Coffee black",k:2,p:0.1,c:0,f:0,shop:"generic"},
  {n:"Greek yoghurt 150g",k:90,p:10,c:6,f:2,shop:"generic"},
  {n:"Rice 1 cup cooked",k:205,p:4,c:45,f:0.4,shop:"generic"},
  {n:"Olive oil 1 tbsp",k:120,p:0,c:0,f:14,shop:"generic"}
];

const MEALS = ["breakfast","lunch","dinner","snacks"];
let state = load();
let scanner = null;

function load(){
  try { return JSON.parse(localStorage.getItem("dailyplate")||"{}"); } catch(e){ return {}; }
}
function save(){ localStorage.setItem("dailyplate", JSON.stringify(state)); }

function todayKey(){ return new Date().toISOString().slice(0,10); }
function ydayKey(){ const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }

function ensureDay(k){
  if(!state.days) state.days={};
  if(!state.days[k]) state.days[k]={breakfast:[],lunch:[],dinner:[],snacks:[],water:0,weight:null};
  return state.days[k];
}

function bmr(){
  const s=state.profile||{};
  const w=+s.weight||70, h=+s.height||165, a=+s.age||30;
  const base = s.sex==="male" ? (10*w+6.25*h-5*a+5) : (10*w+6.25*h-5*a-161);
  return Math.round(base*(+s.activity||1.2));
}

function target(){ return bmr(); }

function render(){
  const k=todayKey(); const day=ensureDay(k);
  const eaten = MEALS.flatMap(m=>day[m]).reduce((a,f)=>a+f.k,0);
  const p = MEALS.flatMap(m=>day[m]).reduce((a,f)=>a+f.p,0);
  const c = MEALS.flatMap(m=>day[m]).reduce((a,f)=>a+f.c,0);
  const f = MEALS.flatMap(m=>day[m]).reduce((a,f)=>a+f.f,0);
  const t = target();
  document.getElementById("eaten-kcal").textContent = Math.round(eaten);
  document.getElementById("eaten-sub").textContent = "of about "+t+" kcal gentle target";
  document.getElementById("m-p").textContent = Math.round(p)+"g";
  document.getElementById("m-c").textContent = Math.round(c)+"g";
  document.getElementById("m-f").textContent = Math.round(f)+"g";
  const g = document.getElementById("greeting");
  g.textContent = state.profile&&state.profile.name ? "Hi "+state.profile.name+". Here is how today looks." : "Here is how today looks.";
  const mealsEl = document.getElementById("meals");
  mealsEl.innerHTML = MEALS.map(m=>{
    const items = day[m];
    if(!items.length) return "";
    return `<div class="meal"><div class="meal-head"><b style="text-transform:capitalize">${m}</b><span class="tiny">${Math.round(items.reduce((a,f)=>a+f.k,0))} kcal</span></div>`+
      items.map((f,i)=>`<div class="food-row"><span>${f.n}</span><button data-del="${m}:${i}">×</button></div>`).join("")+`</div>`;
  }).join("") || `<p class="tiny">Nothing logged yet. Tap + Log food.</p>`;
  const rec = document.getElementById("recents");
  const recentFoods = Object.values(state.days||{}).flatMap(d=>MEALS.flatMap(m=>d[m]||[])).slice(-12).reverse();
  const uniq = []; const seen=new Set();
  for(const f of recentFoods){ if(!seen.has(f.n)){seen.add(f.n); uniq.push(f);} if(uniq.length>=8) break; }
  rec.innerHTML = uniq.map(f=>`<button class="chip" data-add='${JSON.stringify(f).replace(/'/g,"&#39;")}'>${f.n}</button>`).join("") || `<span class="tiny">Your repeats will appear here.</span>`;
  const gl = document.getElementById("glasses");
  const glasses = Math.round((day.water||0)/250);
  gl.innerHTML = Array.from({length:8},(_,i)=>`<button class="glass ${i<glasses?'on':''}" data-water="${i+1}"></button>`).join("");
  document.getElementById("water-label").textContent = (day.water||0)+" ml";
  document.getElementById("w-today").value = day.weight||"";
  bind();
}

function bind(){
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    const [m,i]=b.dataset.del.split(":"); const day=ensureDay(todayKey()); day[m].splice(+i,1); save(); render();
  });
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{
    const f=JSON.parse(b.dataset.add); addFood(f); go("today");
  });
  document.querySelectorAll("[data-water]").forEach(b=>b.onclick=()=>{
    const day=ensureDay(todayKey()); day.water = +b.dataset.water*250; save(); render();
  });
}

function go(v){
  document.querySelectorAll(".view").forEach(s=>s.classList.remove("on"));
  document.getElementById(v).classList.add("on");
  document.querySelectorAll("nav.dock button").forEach(b=>b.classList.toggle("on", b.dataset.go===v));
  if(v==="log"){ document.getElementById("search").value=""; document.getElementById("results").innerHTML=""; document.getElementById("custom-box").hidden=true; renderRecents(); }
  if(v==="today") render();
}

function addFood(f){
  const day=ensureDay(todayKey());
  const meal = document.getElementById("meal-pick") ? document.getElementById("meal-pick").value : "snacks";
  day[meal].push({n:f.n,k:f.k,p:f.p,c:f.c,f:f.f});
  save(); render();
}

function renderRecents(){
  const rec = document.getElementById("recents");
  const recentFoods = Object.values(state.days||{}).flatMap(d=>MEALS.flatMap(m=>d[m]||[])).slice(-12).reverse();
  const uniq=[]; const seen=new Set();
  for(const f of recentFoods){ if(!seen.has(f.n)){seen.add(f.n); uniq.push(f);} if(uniq.length>=8) break; }
  rec.innerHTML = uniq.map(f=>`<button class="chip" data-add='${JSON.stringify(f).replace(/'/g,"&#39;")}'>${f.n}</button>`).join("") || `<span class="tiny">Your repeats will appear here.</span>`;
  bind();
}

function searchFoods(q){
  q=q.trim().toLowerCase();
  if(!q) return [];
  return FOODS.filter(f=>f.n.toLowerCase().includes(q)|| (f.shop&&f.shop.toLowerCase().includes(q))).slice(0,12);
}

async function offSearch(q){
  try{
    const r = await fetch("https://world.openfoodfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(q)+"&search_simple=1&action=process&json=1&page_size=8&countries=en:australia");
    const j = await r.json();
    return (j.products||[]).map(p=>({
      n: p.product_name || p.generic_name || "Packaged food",
      k: p.nutriments && p.nutriments["energy-kcal_100g"] ? +p.nutriments["energy-kcal_100g"] : (p.nutriments && p.nutriments["energy-kj_100g"]? +p.nutriments["energy-kj_100g"]/4.184 : 0),
      p: p.nutriments && p.nutriments.proteins_100g ? +p.nutriments.proteins_100g : 0,
      c: p.nutriments && p.nutriments.carbohydrates_100g ? +p.nutriments.carbohydrates_100g : 0,
      f: p.nutriments && p.nutriments.fat_100g ? +p.nutriments.fat_100g : 0,
      shop: "Open Food Facts"
    })).filter(f=>f.k>0);
  }catch(e){ return []; }
}

function showResults(list){
  const el=document.getElementById("results");
  el.innerHTML = list.map(f=>`<button class="btn result" data-add='${JSON.stringify(f).replace(/'/g,"&#39;")}'>${f.n}<small>${Math.round(f.k)} kcal · ${f.shop||""}</small></button>`).join("") || `<p class="tiny">No matches. Try a barcode or type your own.</p>`;
  bind();
}

async function doSearch(){
  const q=document.getElementById("search").value;
  let list = searchFoods(q);
  if(list.length<4){ list = list.concat(await offSearch(q)); }
  showResults(list.slice(0,12));
}

let codeReader=null;
async function startScan(){
  const note=document.getElementById("scan-note"); const vid=document.getElementById("scan-video");
  note.hidden=false; vid.hidden=false;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    vid.srcObject=stream;
    await vid.play();
    const {BarcodeDetector}=window;
    if(BarcodeDetector){
      const det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]});
      const loop=async()=>{
        if(vid.hidden) return;
        try{
          const codes=await det.detect(vid);
          if(codes.length){ await lookupBarcode(codes[0].rawValue); stopScan(); return; }
        }catch(e){}
        requestAnimationFrame(loop);
      };
      loop();
    } else {
      note.textContent="Barcode camera not supported here. Type the number instead.";
    }
  }catch(e){
    note.textContent="Camera blocked. Type the barcode number.";
  }
}
function stopScan(){
  const vid=document.getElementById("scan-video");
  if(vid.srcObject){ vid.srcObject.getTracks().forEach(t=>t.stop()); vid.srcObject=null; }
  vid.hidden=true; document.getElementById("scan-note").hidden=true;
}
async function lookupBarcode(code){
  try{
    const r=await fetch("https://world.openfoodfacts.org/api/v2/product/"+code+".json");
    const j=await r.json();
    if(j.status===1 && j.product){
      const p=j.product; const n=p.nutriments||{};
      addFood({n:p.product_name||"Scanned food", k:n["energy-kcal_100g"]|| (n["energy-kj_100g"]?n["energy-kj_100g"]/4.184:0), p:n.proteins_100g||0, c:n.carbohydrates_100g||0, f:n.fat_100g||0, shop:"barcode"});
      go("today"); return;
    }
  }catch(e){}
  alert("Not found in Open Food Facts. Save it as your own food.");
  go("log"); document.getElementById("custom-btn").click();
}

function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="daily-plate-"+todayKey()+".json"; a.click();
}

function resetAll(){
  if(confirm("Erase everything on this phone?")){ localStorage.removeItem("dailyplate"); state={}; location.reload(); }
}

window.addEventListener("load",()=>{
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
  if(!state.profile){ go("onboard"); } else { go("today"); }
  document.getElementById("start-btn").onclick=()=>{
    state.profile={
      name:document.getElementById("name").value.trim(),
      sex:document.getElementById("sex").value,
      age:+document.getElementById("age").value||30,
      height:+document.getElementById("height").value||165,
      weight:+document.getElementById("weight").value||70,
      activity:document.getElementById("activity").value
    };
    save(); go("today");
  };
  document.getElementById("search").addEventListener("input",doSearch);
  document.getElementById("scan-btn").onclick=startScan;
  document.getElementById("custom-btn").onclick=()=>{ document.getElementById("custom-box").hidden=false; };
  document.getElementById("c-save").onclick=()=>{
    const f={n:document.getElementById("c-name").value||"My food",k:+document.getElementById("c-kcal").value||0,p:+document.getElementById("c-p").value||0,c:+document.getElementById("c-c").value||0,f:+document.getElementById("c-f").value||0};
    addFood(f); document.getElementById("custom-box").hidden=true; go("today");
  };
  document.getElementById("copy-yday").onclick=()=>{
    const y=state.days&&state.days[ydayKey()]; if(!y){ alert("No yesterday to copy."); return; }
    const t=ensureDay(todayKey());
    MEALS.forEach(m=>{ t[m]=JSON.parse(JSON.stringify(y[m]||[])); });
    t.water=y.water||0; save(); render();
  };
  document.getElementById("w-save").onclick=()=>{ const day=ensureDay(todayKey()); day.weight=+document.getElementById("w-today").value||null; save(); };
  document.getElementById("export-btn").onclick=exportData;
  document.getElementById("reset-btn").onclick=resetAll;
  render();
});
