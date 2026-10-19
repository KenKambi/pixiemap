/* ==========================================================================
   PixieMap Makueni — state store, yield engine, ward aggregation
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  const WARDS = window.MAKUENI_WARDS;
  const SEED  = window.SEED_DATA;
  const YEAR  = PM.CONFIG.season;

  const wardIndex = {};
  WARDS.features.forEach(f => wardIndex[f.properties.w] = f);
  const wardNames  = WARDS.features.map(f => f.properties.w).sort();
  const subCounties = [...new Set(WARDS.features.map(f => f.properties.s))].sort();

  function fresh(){
    const stock = ["Copper fungicide","Fruit fly traps","Foliar zinc + boron","PPE kits","Calcium foliar","Horticultural oil"];
    return {
      orchards: SEED.orchards.map(o => ({...o})),
      agrovets: SEED.agrovets.map((a,i) => ({...a, stock: stock.slice(i%3, i%3 + 3)})),
      reports: [
        {id:"r1", ward:"Kilungu", issue:"Suspected false codling moth", confidence:68, status:"pending",  when:"2 days ago"},
        {id:"r2", ward:"Mbooni",  issue:"Citrus leaf miner",            confidence:91, status:"advised",  when:"5 days ago"},
        {id:"r3", ward:"Kalawa",  issue:"Water stress / fruit drop",    confidence:83, status:"assigned", when:"6 days ago"}
      ].map(r => ({...r, lng:wardIndex[r.ward].properties.cx, lat:wardIndex[r.ward].properties.cy})),
      flowering:null, done:[], me:"o01", portal:"farmer", section:"f_dash", theme:null
    };
  }

  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(PM.CONFIG.storageKey) || "{}")); }
  catch(e){ S = fresh(); }

  const save  = () => { try{ localStorage.setItem(PM.CONFIG.storageKey, JSON.stringify(S)); }catch(e){} };
  const reset = () => { try{ localStorage.removeItem(PM.CONFIG.storageKey); }catch(e){} S = fresh(); };

  /* ---------- yield engine ---------- */
  const M = PM.MODEL;
  const age      = o => YEAR - o.year;
  const maturity = a => a >= 9 ? M.mature : (M.curve[a] || 0);
  const kg       = o => Math.round(o.trees * maturity(age(o)) * M.bloom[o.bloom] * M.water[o.irrigation]);
  const perHa    = o => o.ha ? o.trees / o.ha : 0;
  const fmt      = n => Math.round(n).toLocaleString("en-KE");

  function densityFlag(o){
    const d = perHa(o);
    if(!d) return null;
    if(d > M.spacing.high) return "Tree count high for the mapped area (" + Math.round(d) + "/ha)";
    if(d < M.spacing.low)  return "Tree count low for the mapped area ("  + Math.round(d) + "/ha)";
    return null;
  }

  function wardStats(){
    const m = {};
    wardNames.forEach(w => m[w] = {
      ward:w, sub:wardIndex[w].properties.s, km2:wardIndex[w].properties.km2,
      n:0, trees:0, ha:0, kg:0, young:0, irrigated:0, women:0, youth:0
    });
    S.orchards.forEach(o => {
      const r = m[o.ward]; if(!r) return;
      r.n++; r.trees += o.trees; r.ha += o.ha; r.kg += kg(o);
      if(age(o) < 3) r.young += o.trees;
      if(o.irrigation !== "none") r.irrigated++;
      if(o.gender === "woman") r.women++;
      if(o.youth) r.youth++;
    });
    return Object.values(m);
  }
  const activeWards = () => wardStats().filter(w => w.n > 0);

  function county(){
    const a = activeWards();
    return {
      n: S.orchards.length,
      trees: a.reduce((x,w)=>x+w.trees,0),
      ha:    a.reduce((x,w)=>x+w.ha,0),
      kg:    a.reduce((x,w)=>x+w.kg,0),
      wards: a.length,
      young: a.reduce((x,w)=>x+w.young,0)
    };
  }

  /* need score: low yield per tree (50) + low irrigation coverage (30) + share still coming into bearing (20) */
  function priorityRows(){
    return activeWards().map(w => {
      const perTree = w.kg / Math.max(w.trees,1);
      const irrShare = w.irrigated / Math.max(w.n,1);
      const youngShare = w.young / Math.max(w.trees,1);
      const score = Math.round((1 - Math.min(perTree/30,1))*50 + (1 - irrShare)*30 + Math.min(youngShare,1)*20);
      const action = irrShare < .5 ? "Irrigation support and a water-budgeting visit"
        : perTree < 12 ? "Extension visit: bloom management and nutrition"
        : youngShare > .3 ? "Young-orchard support: training and seedling quality checks"
        : "Monitor; prioritise aggregation and market linkage";
      return {...w, perTree, irrShare, score, action};
    }).sort((a,b) => b.score - a.score);
  }

  function sprayStages(){
    const d = S.flowering ? new Date(S.flowering) : null;
    return PM.SPRAY_STAGES.map(s => {
      let when = "—";
      if(d){ const t = new Date(d); t.setDate(t.getDate() + s.day);
        when = t.toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"}); }
      return {...s, when};
    });
  }

  PM.state = {
    get S(){ return S; }, save, reset,
    WARDS, wardIndex, wardNames, subCounties, YEAR,
    age, maturity, kg, perHa, fmt, densityFlag, wardStats, activeWards, county, priorityRows, sprayStages,
    me: () => S.orchards.find(o => o.id === S.me) || S.orchards[0]
  };
})();
