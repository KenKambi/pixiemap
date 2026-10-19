/* ==========================================================================
   PixieMap Makueni — county government portal
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  const St = PM.state, M = PM.map, C = PM.charts;
  const head = (t,p) => `<div class="pagehead"><h1>${t}</h1><p>${p}</p></div>`;
  const banner = `<div id="tilebanner" class="banner hidden">Basemap tiles are blocked in this preview sandbox.
    Open the project from a web server or a deployment and OpenStreetMap / Esri imagery load normally.</div>`;

  function overview(){
    const c = St.county(), open = St.S.reports.filter(r => r.status === "pending").length;
    const gaps = St.wardStats().filter(x => !x.n);
    return head("County overview","Live picture of the Pixie sector across all 30 wards, built from the orchard register.") + `
    <div class="grid g4">
      <div class="kpi accent3"><div class="lab">Orchards registered</div><div class="val">${c.n}</div><div class="sub">across ${c.wards} of 30 wards</div></div>
      <div class="kpi accent3"><div class="lab">Trees mapped</div><div class="val">${St.fmt(c.trees)}</div><div class="sub">${c.ha.toFixed(1)} ha of orchard</div></div>
      <div class="kpi accent"><div class="lab">Forecast ${St.YEAR} harvest</div><div class="val">${St.fmt(c.kg)} kg</div><div class="sub">${(c.kg/Math.max(c.trees,1)).toFixed(1)} kg per tree average</div></div>
      <div class="kpi accent2"><div class="lab">Cases awaiting an officer</div><div class="val">${open}</div><div class="sub">${St.S.reports.length} reports this season</div></div>
    </div>
    ${banner}
    <div class="card"><h3>Forecast production by ward</h3>
      <p class="hint">Darker wards carry more of the expected harvest. Grey wards have no registry coverage yet — the first place to send Pixie Champions.</p>
      <div class="maptools">
        <button class="btn ghost sm" data-shade="kg">Shade by forecast kg</button>
        <button class="btn ghost sm" data-shade="trees">Shade by tree numbers</button>
        <button class="btn ghost sm" data-shade="perTree">Shade by kg per tree</button>
        <button class="btn ghost sm" data-shade="young">Shade by trees under 3 years</button></div>
      <div id="m_cover" class="map"></div>
      <div class="legend">
        <span><span class="sw" style="background:#0C6D2B"></span>highest quartile</span>
        <span><span class="sw" style="background:#129139"></span>upper middle</span>
        <span><span class="sw" style="background:#63B96F"></span>lower middle</span>
        <span><span class="sw" style="background:#BFE3C6"></span>lowest quartile</span>
        <span><span class="sw" style="background:#8795A3"></span>no data yet</span></div></div>
    <div class="grid g2">
      <div class="card"><h3>Top wards by forecast volume</h3><div class="chartbox"><canvas id="ch_top"></canvas></div></div>
      <div class="card"><h3>Coverage gap</h3><p class="hint">Wards with no registered orchard yet (${gaps.length} of 30).</p>
        <div>${gaps.map(x => `<span class="tag" style="margin:3px 4px 3px 0">${x.ward}</span>`).join("") || '<span class="tag g">full coverage</span>'}</div>
        <p class="note">Registration drives are planned ward by ward with the Red Cross IFSL farmer groups.</p></div>
    </div>`;
  }

  function wards(){
    return head("Ward statistics","Every ward in the county, with the numbers behind subsidy, extension and aggregation decisions. Click a column heading to sort.") + `
    <div class="card">
      <div class="row" style="margin-bottom:10px">
        <div><label for="scf">Sub-county</label><select id="scf"><option value="">All sub-counties</option>${St.subCounties.map(s => `<option>${s}</option>`).join("")}</select></div>
        <div><label for="onlyreg">Coverage</label><select id="onlyreg"><option value="all">All 30 wards</option><option value="reg">Only wards with registered orchards</option></select></div>
        <button class="btn ghost sm" style="margin-top:18px" id="csv">Download CSV</button>
        <button class="btn ghost sm" style="margin-top:18px" data-go="c_rep">Export PDF</button></div>
      <div class="scroll"><table id="wtab"><thead><tr>
        <th data-k="ward">Ward</th><th data-k="sub">Sub-county</th><th class="n" data-k="km2">Area km²</th>
        <th class="n" data-k="n">Orchards</th><th class="n" data-k="trees">Trees</th><th class="n" data-k="ha">Orchard ha</th>
        <th class="n" data-k="kg">Forecast kg</th><th class="n" data-k="perTree">kg / tree</th>
        <th class="n" data-k="young">Trees &lt; 3 yrs</th><th class="n" data-k="irr">% irrigated</th>
        <th class="n" data-k="women">Women-registered</th></tr></thead><tbody id="wbody"></tbody></table></div>
      <p class="note">Only aggregated ward figures are shared with buyers and planners. Farm-level records stay with the farmer under the Data Protection Act 2019.</p></div>
    <div class="card"><h3>Trees and forecast side by side</h3><div class="chartbox" style="height:340px"><canvas id="ch_ward"></canvas></div></div>`;
  }

  function forecast(){
    return head("Production forecast","What is coming, when it arrives, and what is still growing into bearing.") + `
    <div class="grid g2">
      <div class="card"><h3>Harvest window</h3><p class="hint">Modelled from reported flowering dates across the register.</p>
        <div class="chartbox"><canvas id="ch_month"></canvas></div></div>
      <div class="card"><h3>Tree age profile</h3><p class="hint">Where future volume sits. Trees under three years are not yielding yet.</p>
        <div class="chartbox"><canvas id="ch_age"></canvas></div></div>
    </div>
    <div class="card"><h3>Volume coming into bearing</h3>
      <div class="scroll"><table><thead><tr><th>Ward</th><th class="n">Bearing trees</th><th class="n">Trees under 3 yrs</th>
        <th class="n">Forecast ${St.YEAR} kg</th><th class="n">Potential at maturity</th><th>Planning note</th></tr></thead><tbody>
      ${St.activeWards().sort((a,b) => b.young - a.young).map(w => `<tr>
        <td>${w.ward}</td><td class="n">${St.fmt(w.trees - w.young)}</td><td class="n">${St.fmt(w.young)}</td>
        <td class="n">${St.fmt(w.kg)}</td><td class="n">${St.fmt(w.trees * PM.MODEL.curve[8])}</td>
        <td>${w.young > 0 ? "Volume rises within two seasons — line up aggregation and buyers" : "Stable; focus on yield per tree"}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="note">Potential at maturity assumes every registered tree reaching about ${PM.MODEL.curve[8]} kg under medium bloom. Forecast accuracy improves each season as actual harvests are recorded against it.</p></div>`;
  }

  function surveillance(){
    return head("Pest and disease surveillance","Farmer reports, AI screening and officer confirmation in one queue, mapped for early warning.") + `
    <div class="card"><h3>Report queue</h3>
      <div class="scroll"><table><thead><tr><th>Reported</th><th>Ward</th><th>Finding</th><th class="n">AI confidence</th><th>Status</th><th></th></tr></thead><tbody>
      ${St.S.reports.map(r => `<tr><td>${r.when}</td><td>${r.ward}</td><td>${r.issue}</td><td class="n">${r.confidence}%</td>
        <td>${r.status === "pending" ? '<span class="tag w">awaiting officer</span>'
              : r.status === "assigned" ? '<span class="tag">officer assigned</span>'
              : '<span class="tag g">advice sent</span>'}</td>
        <td>${r.status === "pending" ? `<button class="btn sm" data-assign="${r.id}">Assign officer</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="note warn">Anything under 75% confidence, or any high-risk finding such as suspected citrus greening, is held for officer confirmation before advice reaches the farmer.</p></div>
    ${banner}
    <div class="card"><h3>Where reports are coming from</h3><div id="m_surv" class="map sm"></div></div>`;
  }

  function planning(){
    const rows = St.priorityRows();
    return head("Subsidy and extension planning","A ranked case for where county money and officer time change the most, built from registry evidence rather than requests.") + `
    <div class="card"><h3>Priority ranking</h3>
      <p class="hint">Need score combines low yield per tree (50), low irrigation coverage (30) and the share of trees still coming into bearing (20).</p>
      <div class="scroll"><table><thead><tr><th class="n">Rank</th><th>Ward</th><th>Sub-county</th><th class="n">Need score</th>
        <th class="n">kg / tree</th><th class="n">% irrigated</th><th>Recommended support</th></tr></thead><tbody>
      ${rows.map((w,i) => `<tr><td class="n">${i+1}</td><td><b>${w.ward}</b></td><td>${w.sub}</td>
        <td class="n"><span class="tag ${w.score > 60 ? "r" : w.score > 40 ? "w" : "g"}">${w.score}</span></td>
        <td class="n">${w.perTree.toFixed(1)}</td><td class="n">${Math.round(w.irrShare*100)}%</td><td>${w.action}</td></tr>`).join("")}
      </tbody></table></div></div>
    <div class="card"><h3>Extension officer dispatch this week</h3>
      <div class="scroll"><table><thead><tr><th>Priority</th><th>Ward</th><th>Reason</th><th class="n">Farms to visit</th></tr></thead><tbody>
      ${St.S.reports.filter(r => r.status !== "advised").map(r => `<tr><td><span class="tag r">case</span></td><td>${r.ward}</td>
        <td>${r.issue} (${r.confidence}% confidence)</td><td class="n">1</td></tr>`).join("")}
      ${rows.slice(0,3).map(w => `<tr><td><span class="tag w">planned</span></td><td>${w.ward}</td><td>${w.action}</td><td class="n">${w.n}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  }

  function reports(){
    return head("Reports","Generate a department-ready PDF for the executive, the assembly, or a partner such as the Kenya Red Cross.") + `
    <div class="card"><h3>Build a report</h3>
      <div class="grid g3">
        <div><label for="rtype">Report</label><select id="rtype">
          <option value="county">County Pixie production report</option>
          <option value="ward">Ward profile</option>
          <option value="surv">Pest and disease surveillance summary</option>
          <option value="plan">Subsidy and extension priority list</option></select></div>
        <div><label for="rward">Ward (for ward profile)</label><select id="rward">${St.activeWards().map(w => `<option>${w.ward}</option>`).join("")}</select></div>
        <div><label for="rfor">Prepared for</label><input id="rfor" value="Department of Agriculture, Irrigation, Livestock, Fisheries &amp; Cooperative Development"></div>
      </div>
      <div class="row" style="margin-top:14px"><button class="btn" id="genpdf">Generate PDF</button><span class="sub" id="pdfOut"></span></div>
      <p class="note">Reports carry the generation date, the registry coverage behind the numbers, and a note that figures are forecasts from the orchard register.</p></div>
    <div class="card"><h3>What goes into each report</h3>
      <div class="grid g2">
        <div><b>County production report</b><p class="hint">Coverage, trees, hectares, forecast volume, a ward chart, the full ward table and the wards with no coverage yet.</p></div>
        <div><b>Ward profile</b><p class="hint">One ward in detail: orchards, tree ages, yield per tree, irrigation share, and open cases.</p></div>
        <div><b>Surveillance summary</b><p class="hint">Every report this season, AI confidence, officer status, and repeat findings.</p></div>
        <div><b>Priority list</b><p class="hint">Need scores with the evidence behind each one, ready to attach to a budget submission.</p></div>
      </div></div>
    <canvas id="pdfchart" width="900" height="420" style="display:none"></canvas>`;
  }

  /* ========================= interactions ========================= */
  let sortK = "kg", sortDir = -1;

  function wire(section, ui){
    if(section === "c_over"){
      M.make("m_cover"); M.choropleth("m_cover", w => w.kg);
      document.querySelectorAll("[data-shade]").forEach(b => b.onclick = () => {
        const k = b.dataset.shade;
        const f = k === "perTree" ? (w => w.n ? w.kg/Math.max(w.trees,1) : 0) : (w => w[k]);
        M.choropleth("m_cover", f);
      });
      const top = St.activeWards().sort((a,b) => b.kg - a.kg).slice(0,8), c = C.colors();
      C.add("ch_top", { type:"bar",
        data:{ labels: top.map(w => w.ward), datasets:[{ label:"Forecast kg", data: top.map(w => w.kg), backgroundColor:c.green }] },
        options:{ ...C.base(), indexAxis:"y" } });
    }

    if(section === "c_ward") wireWardTable(ui);

    if(section === "c_fore"){
      const c = C.colors(), total = St.county().kg;
      C.add("ch_month", { type:"line",
        data:{ labels: PM.HARVEST_WINDOW.map(m => m[0]),
               datasets:[{ label:"Expected kg", data: PM.HARVEST_WINDOW.map(m => Math.round(total*m[1])),
                           borderColor:c.blue, backgroundColor:c.blue, tension:.35, fill:false, pointRadius:4 }] },
        options: C.base() });
      const buckets = {"0-2 yrs":0,"3-4 yrs":0,"5-6 yrs":0,"7-8 yrs":0,"9+ yrs":0};
      St.S.orchards.forEach(o => { const a = St.age(o);
        buckets[a<3?"0-2 yrs":a<5?"3-4 yrs":a<7?"5-6 yrs":a<9?"7-8 yrs":"9+ yrs"] += o.trees; });
      C.add("ch_age", { type:"bar",
        data:{ labels:Object.keys(buckets), datasets:[{ label:"Trees", data:Object.values(buckets), backgroundColor:c.orange }] },
        options: C.base() });
    }

    if(section === "c_surv"){
      M.make("m_surv");
      M.markers("m_surv", St.S.reports.map(r => ({ lat:r.lat, lng:r.lng, status:r.status,
        popup:`<b>${r.issue}</b><br>${r.ward} · ${r.when}<br>AI confidence ${r.confidence}%` })),
        p => p.status === "pending" ? "#C4600E" : p.status === "assigned" ? "#124491" : "#129139");
      M.fitWards("m_surv");
      document.querySelectorAll("[data-assign]").forEach(b => b.onclick = () => {
        const r = St.S.reports.find(x => x.id === b.dataset.assign);
        r.status = "assigned"; St.save(); ui.render(); ui.toast("Officer assigned and farmer notified by SMS");
      });
    }

    if(section === "c_rep"){
      document.getElementById("genpdf").onclick = () => {
        const out = document.getElementById("pdfOut");
        out.innerHTML = '<span class="spinner"></span> building…';
        PM.reports.build(document.getElementById("rtype").value,
                         document.getElementById("rward").value,
                         document.getElementById("rfor").value, out);
      };
    }
  }

  function wireWardTable(ui){
    const body = document.getElementById("wbody");
    let current = [];
    const paint = () => {
      const sc = document.getElementById("scf").value, only = document.getElementById("onlyreg").value;
      let rows = St.wardStats().map(w => ({ ...w,
        perTree: w.n ? w.kg/Math.max(w.trees,1) : 0, irr: w.n ? Math.round(w.irrigated/w.n*100) : 0 }));
      if(sc) rows = rows.filter(r => r.sub === sc);
      if(only === "reg") rows = rows.filter(r => r.n > 0);
      rows.sort((a,b) => { const x = a[sortK], y = b[sortK];
        return (typeof x === "string" ? x.localeCompare(y) : x - y) * sortDir; });
      current = rows;
      body.innerHTML = rows.map(r => `<tr><td><b>${r.ward}</b></td><td>${r.sub}</td><td class="n">${r.km2}</td>
        <td class="n">${r.n || "—"}</td><td class="n">${r.trees ? St.fmt(r.trees) : "—"}</td>
        <td class="n">${r.ha ? r.ha.toFixed(2) : "—"}</td><td class="n"><b>${r.kg ? St.fmt(r.kg) : "—"}</b></td>
        <td class="n">${r.n ? r.perTree.toFixed(1) : "—"}</td><td class="n">${r.young ? St.fmt(r.young) : "—"}</td>
        <td class="n">${r.n ? r.irr + "%" : "—"}</td><td class="n">${r.n ? r.women : "—"}</td></tr>`).join("");
      const c = C.colors(), top = rows.filter(r => r.n).slice(0,12);
      C.destroyAll();
      C.add("ch_ward", { type:"bar",
        data:{ labels: top.map(r => r.ward), datasets:[
          { label:"Trees", data: top.map(r => r.trees), backgroundColor:c.blue, yAxisID:"y" },
          { label:"Forecast kg", data: top.map(r => r.kg), backgroundColor:c.green, yAxisID:"y1" }] },
        options:{ ...C.base(), scales:{ ...C.base().scales,
          y:{ ...C.base().scales.y, position:"left" },
          y1:{ ...C.base().scales.y, position:"right", grid:{ drawOnChartArea:false } } } } });
    };
    document.querySelectorAll("#wtab th").forEach(th => th.onclick = () => {
      const k = th.dataset.k; if(!k) return;
      if(sortK === k) sortDir *= -1; else { sortK = k; sortDir = (k === "ward" || k === "sub") ? 1 : -1; }
      paint();
    });
    document.getElementById("scf").onchange = paint;
    document.getElementById("onlyreg").onchange = paint;
    document.getElementById("csv").onclick = () => {
      const head = ["Ward","Sub-county","Area km2","Orchards","Trees","Orchard ha","Forecast kg","kg per tree","Trees under 3 yrs","% irrigated","Women-registered"];
      const csv = [head.join(",")].concat(current.map(r =>
        [r.ward, r.sub, r.km2, r.n, r.trees, r.ha.toFixed(2), r.kg, r.perTree.toFixed(1), r.young, r.irr, r.women].join(","))).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
      a.download = "pixiemap-ward-statistics.csv"; document.body.appendChild(a); a.click(); a.remove();
      ui.toast("Ward statistics exported as CSV");
    };
    paint();
  }

  PM.county = { views:{ c_over:overview, c_ward:wards, c_fore:forecast, c_surv:surveillance, c_plan:planning, c_rep:reports }, wire };
})();
