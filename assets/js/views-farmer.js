/* ==========================================================================
   PixieMap Makueni — farmer / Pixie Champion portal
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  const St = PM.state, M = PM.map;
  const head = (t,p) => `<div class="pagehead"><h1>${t}</h1><p>${p}</p></div>`;
  const banner = `<div id="tilebanner" class="banner hidden">Basemap tiles are blocked in this preview sandbox.
    Open the project from a web server or a deployment and OpenStreetMap / Esri imagery load normally.</div>`;

  /* ---------------- dashboard ---------------- */
  function dash(){
    const me = St.me(), c = St.county();
    const next = St.S.flowering ? St.sprayStages().find(s => !St.S.done.includes(s.key)) : null;
    return head("Farmer dashboard","Your orchard, your trees, and what the season needs from you next.") + `
    <div class="hero"><img src="assets/img/orchard-hero.jpg" alt="Pixie mandarin orchard in full fruit"><div class="veil"></div>
      <div class="inner"><h2>${me.name}</h2>
      <p>${me.ward} ward, ${me.sub} sub-county · ${me.trees} trees on ${me.ha} ha · planted ${me.year} (${St.age(me)} years old)</p></div></div>
    <div class="grid g4">
      <div class="kpi accent"><div class="lab">Forecast this season</div><div class="val">${St.fmt(St.kg(me))} kg</div><div class="sub">${(St.kg(me)/me.trees).toFixed(1)} kg per tree</div></div>
      <div class="kpi accent3"><div class="lab">Trees registered</div><div class="val">${me.trees}</div><div class="sub">${Math.round(St.perHa(me))} trees per hectare</div></div>
      <div class="kpi accent2"><div class="lab">Next action</div><div class="val" style="font-size:19px;line-height:1.3">${next ? next.title : (St.S.flowering ? "Programme complete" : "Report flowering")}</div><div class="sub">${next ? next.when : "Open the spray programme"}</div></div>
      <div class="kpi"><div class="lab">County register</div><div class="val">${St.fmt(c.trees)}</div><div class="sub">trees across ${c.wards} wards</div></div>
    </div>
    ${banner}
    <div class="card"><h3>Your orchard on the imagery</h3>
      <p class="hint">Satellite basemap by default. Use the layer control on the map to switch to OpenStreetMap.</p>
      <div class="maptools"><button class="btn ghost sm" data-go="f_map">Map another plot</button>
        <button class="btn ghost sm" data-fit="m_fdash">Zoom to county</button></div>
      <div id="m_fdash" class="map sm"></div></div>
    <div class="card"><h3>What the register is used for</h3>
      <p class="hint">Your record feeds three things, and only ward totals ever leave your farm.</p>
      <div class="grid g3">
        <div><b>Your own planning</b><div class="sub" style="color:var(--muted)">Yield forecast, spray timing from your own flowering date, and a record of what you applied.</div></div>
        <div><b>Group selling</b><div class="sub" style="color:var(--muted)">Buyers see expected volume by ward and harvest month, so your group negotiates with numbers.</div></div>
        <div><b>County support</b><div class="sub" style="color:var(--muted)">Subsidies and extension visits are targeted where tree age, water and yields say they are needed.</div></div>
      </div>
      <p class="note">Consent first: you can view, correct or withdraw your record at any time, in line with the Data Protection Act 2019.</p></div>`;
  }

  /* ---------------- orchards & trees ---------------- */
  function orchards(){
    return head("My orchards and trees","Tree numbers and planting years drive the forecast. Edit them here and the system checks them against the mapped area.") + `
    <div class="card"><h3>Registered plots</h3>
      <div class="scroll"><table><thead><tr><th>Plot</th><th>Ward</th><th class="n">Area (ha)</th><th class="n">Trees</th>
      <th class="n">Planted</th><th class="n">Age</th><th>Bloom</th><th>Water</th><th class="n">Forecast kg</th><th>Check</th></tr></thead><tbody>
      ${St.S.orchards.map(o => { const f = St.densityFlag(o); return `<tr>
        <td><b>${o.name}</b>${o.id === St.S.me ? ' <span class="tag">mine</span>' : ""}</td><td>${o.ward}</td><td class="n">${o.ha}</td>
        <td class="n"><input data-ed="trees" data-id="${o.id}" type="number" min="1" value="${o.trees}" style="width:84px;padding:4px 6px"></td>
        <td class="n"><input data-ed="year" data-id="${o.id}" type="number" min="1990" max="${St.YEAR}" value="${o.year}" style="width:88px;padding:4px 6px"></td>
        <td class="n">${St.age(o)}</td>
        <td><select data-ed="bloom" data-id="${o.id}" style="padding:4px 6px">${["light","medium","heavy"].map(b => `<option ${b===o.bloom?"selected":""}>${b}</option>`).join("")}</select></td>
        <td><select data-ed="irrigation" data-id="${o.id}" style="padding:4px 6px">${["none","supplemental","drip"].map(b => `<option ${b===o.irrigation?"selected":""}>${b}</option>`).join("")}</select></td>
        <td class="n"><b>${St.fmt(St.kg(o))}</b></td>
        <td>${f ? `<span class="tag w">${f}</span>` : `<span class="tag g">consistent</span>`}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="note">Forecast = trees × age maturity factor × bloom score × water factor. Trees under two years contribute nothing yet, which is how the county sees volume that is still coming.</p></div>
    ${banner}
    <div class="card"><h3>All registered plots</h3>
      <div class="maptools"><button class="btn ghost sm" data-fit="m_forch">Zoom to county</button></div>
      <div id="m_forch" class="map"></div></div>`;
  }

  /* ---------------- map a new orchard ---------------- */
  function mapper(){
    return head("Map a new orchard","Drawing is already switched on: tap each corner of the plot on the satellite image, or walk the boundary with the phone's GPS. A Pixie Champion can do this for a farmer who has no smartphone.") +
    banner + `
    <div class="card">
      <div class="maptools">
        <button class="btn sm green" id="dStart">Drawing on — click each corner</button>
        <button class="btn ghost sm" id="dUndo">Undo corner</button>
        <button class="btn ghost sm" id="dClear">Clear</button>
        <button class="btn ghost sm" id="dGps">Walk boundary (GPS)</button>
        <button class="btn ghost sm" data-fit="m_draw">Zoom to county</button>
        <span class="tag" id="dInfo">no boundary yet</span>
      </div>
      <div id="m_draw" class="map"></div>
      <div class="grid g3" style="margin-top:14px">
        <div><label for="nName">Farmer or group</label><input id="nName" placeholder="Name for the register"></div>
        <div><label for="nTrees">Number of trees</label><input id="nTrees" type="number" min="1" value="80"></div>
        <div><label for="nYear">Year planted</label><input id="nYear" type="number" min="1990" max="${St.YEAR}" value="2023"></div>
        <div><label for="nBloom">Bloom this season</label><select id="nBloom"><option value="light">Light</option><option value="medium" selected>Medium</option><option value="heavy">Heavy</option></select></div>
        <div><label for="nIrr">Water source</label><select id="nIrr"><option value="none">Rainfed only</option><option value="supplemental" selected>Supplemental</option><option value="drip">Drip</option></select></div>
        <div><label for="nGender">Registered to</label><select id="nGender"><option value="woman">Woman</option><option value="man">Man</option><option value="group">Group</option></select></div>
      </div>
      <div class="row" style="margin-top:14px"><label style="margin:0;text-transform:none;letter-spacing:0;font-weight:400;color:var(--ink)">
        <input type="checkbox" id="nConsent"> Farmer consents to registration and to ward-level sharing with the county and buyers</label></div>
      <div class="row" style="margin-top:12px"><button class="btn green" id="nSave">Register orchard</button>
        <button class="btn ghost" id="nGeo">Export GeoJSON</button><span id="nOut" class="sub"></span></div>
      <p class="note">The ward is detected from the boundary itself using the county's 30-ward file, so nobody has to pick it from a list.</p>
    </div>`;
  }

  /* ---------------- spray programme (sequential) ---------------- */
  function spray(){
    const st = St.sprayStages();
    const done = St.S.done;
    // the first stage that is not yet ticked is the only one the farmer can act on
    const currentIdx = st.findIndex(x => !done.includes(x.key));
    const started = !!St.S.flowering;
    const finished = currentIdx === -1;
    const pct = Math.round(done.length / st.length * 100);

    const phaseHead = p => `<div class="phasehead" style="border-left-color:${p.colour}">
        <b style="color:${p.colour}">${p.name}</b><span>${p.window}</span></div>`;

    let html = "", lastPhase = null;
    st.forEach((s0, i) => {
      const ph = PM.SPRAY_PHASES.find(p => p.id === s0.phase);
      if(ph && ph.id !== lastPhase){ html += phaseHead(ph); lastPhase = ph.id; }
      const isDone = done.includes(s0.key);
      const isCurrent = i === currentIdx;
      const locked = !isDone && !isCurrent;
      if(locked){
        html += `<div class="step locked"><h4>🔒 Step ${i+1} — locked</h4>
          <div class="meta">Opens once step ${i} is marked done</div></div>`;
        return;
      }
      html += `<div class="step ${isDone ? "done" : "current"}" id="stage-${s0.key}">
        <h4>${isDone ? "✓ " : ""}Step ${i+1} · ${s0.title}</h4>
        <div class="meta">Day ${s0.day} after flowering · ${s0.when}${ph ? " · " + ph.name : ""}</div>
        <p style="margin:6px 0">${s0.body}</p>
        <div class="chem"><b>What to apply</b><ul>${s0.chemicals.map(c => `<li>${c}</li>`).join("")}</ul></div>
        <p class="note warn" style="margin-top:8px">${s0.safety}</p>
        ${isCurrent ? `<div class="row" style="margin-top:10px">
            <button class="btn green" data-done="${s0.key}">Mark this step done</button>
            ${i > 0 ? `<button class="btn ghost sm" data-undo="${st[i-1].key}">Reopen previous step</button>` : ""}
          </div>` : ""}
      </div>`;
    });

    return head("Spray and crop-protection programme",
      "One full Pixie season — about eight months from the first open flower to harvest, in four phases. Steps unlock one at a time, so nobody skips ahead.") + `
    <div class="card"><div class="row">
      <div style="flex:1;min-width:230px"><label for="bd">Date flowering started</label><input type="date" id="bd" value="${St.S.flowering || ""}"></div>
      <button class="btn" id="bset" style="margin-top:18px">${started ? "Change date" : "Start programme"}</button>
      ${started ? `<button class="btn ghost" id="breset" style="margin-top:18px">Reset programme</button>` : ""}
    </div>
    ${started ? `<div class="progwrap"><div class="progbar"><div class="progfill" style="width:${pct}%"></div></div>
        <span class="sub">${done.length} of ${st.length} steps done${finished ? " — season complete 🎉" : ""}</span></div>` : ""}
    </div>
    ${started ? `<div class="card"><div class="timeline">${html}</div>
      <p class="note warn">Products are named by active ingredient and chemical group, never by brand. Use a PCPB-registered product for citrus, follow the label rate, rotate chemical groups between seasons, and observe every pre-harvest interval. County agricultural officers validate this schedule before the pilot.</p></div>`
      : `<div class="card"><p class="note">Enter the date flowering started and the eight-month programme is generated for this orchard. On a basic phone the same steps arrive as SMS or voice notes in Kikamba.</p></div>`}`;
  }

  /* ---------------- AI crop check ---------------- */
  function diag(){
    return head("AI crop check","Photograph the affected leaf, fruit or stem. Low-confidence or high-risk findings go to an extension officer instead of straight to the farmer.") + `
    <div class="card"><div class="grid g2">
      <div>
        <label for="ph">Photo of the affected part</label><input type="file" id="ph" accept="image/*">
        <label for="sym">Or describe what you see</label><textarea id="sym" rows="3" placeholder="e.g. yellow blotchy leaves on one branch, young fruit dropping"></textarea>
        <label for="dw">Ward</label><select id="dw">${St.wardNames.map(w => `<option ${w === St.me().ward ? "selected" : ""}>${w}</option>`).join("")}</select>
        <div class="row" style="margin-top:12px"><button class="btn" id="runDiag">Check it</button><span class="sub" id="dStatus"></span></div>
      </div>
      <div><img id="pv" alt="" style="max-width:100%;border-radius:12px;display:none"><div id="dOut" style="margin-top:10px"></div></div>
    </div>
    <p class="note">Every confirmed case is mapped, which is how the county sees an outbreak building before it spreads.</p></div>`;
  }

  /* ---------------- PixieBot ---------------- */
  function bot(){
    return head("Ask PixieBot","Bounded to the validated Pixie production guide. Out-of-scope questions are declined and routed to an extension officer. English, Kiswahili and Kikamba.") + `
    <div class="card"><div class="chat" id="chat"><div class="msg a">Niki! 🍊 Ask me about your Pixie trees — watering, flowering, fruit drop, pests, harvesting or selling. Uliza kwa Kiswahili au Kikamba kama unapenda.</div></div>
      <div class="row" style="margin-top:10px"><input id="q" placeholder="Why are my young fruits dropping?" style="flex:1;min-width:240px"><button class="btn" id="ask">Send</button></div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost sm" data-q="Matunda yangu machanga yanaanguka, nifanye nini?">Kiswahili example</button>
        <button class="btn ghost sm" data-q="How much water does a five year old Pixie tree need at fruit set?">Water question</button>
        <button class="btn ghost sm" data-q="What is the capital of France?">Out-of-scope test</button></div>
      <p class="note">Served by a Netlify Function so the model key never reaches the browser. The same system prompt runs on the server and in this preview.</p></div>`;
  }

  /* ---------------- market ---------------- */
  function market(){
    const w = St.activeWards().sort((a,b) => b.kg - a.kg);
    return head("Market and agrovets","Buyers see ward volumes, never individual farms, unless a farmer opts in. Agrovets show what they stock for the current spray stage.") + `
    <div class="card"><h3>Expected volume by ward</h3>
      <div class="scroll"><table><thead><tr><th>Ward</th><th>Sub-county</th><th class="n">Farms</th><th class="n">Forecast kg</th><th>Selling as</th><th></th></tr></thead><tbody>
      ${w.map(x => `<tr><td>${x.ward}</td><td>${x.sub}</td><td class="n">${x.n}</td><td class="n">${St.fmt(x.kg)}</td>
        <td><span class="tag g">group</span></td><td><button class="btn ghost sm" data-offer="${x.ward}">Request quote</button></td></tr>`).join("")}
      </tbody></table></div><div id="offerOut"></div></div>
    ${banner}
    <div class="card"><h3>Licensed agrovets near registered orchards</h3>
      <div id="m_mkt" class="map sm"></div>
      <div class="scroll" style="margin-top:12px"><table><thead><tr><th>Agrovet</th><th>Ward</th><th>In stock for the current stage</th></tr></thead><tbody>
      ${St.S.agrovets.map(a => `<tr><td>${a.name}</td><td>${a.ward}</td><td>${a.stock.join(", ")}</td></tr>`).join("")}</tbody></table></div></div>`;
  }

  /* ---------------- SMS / USSD ---------------- */
  function sms(){
    const me = St.me(), st = St.sprayStages();
    const next = St.S.flowering ? (st.find(s => !St.S.done.includes(s.key)) || st[st.length-1]) : st[2];
    const women = St.S.orchards.filter(o => o.gender === "woman").length;
    const groups = St.S.orchards.filter(o => o.gender === "group").length;
    const youth = St.S.orchards.filter(o => o.youth).length;
    return head("SMS and USSD view","Everything in the farmer portal reaches basic phones, so the register is not limited to farmers who can afford data.") + `
    <div class="grid g2">
      <div class="card"><h3>USSD session</h3><div class="phone">*384*77#

PIXIEMAP MAKUENI
1. Report flowering
2. This week's step
3. My forecast
4. Ask a question
5. Market prices
6. Nearest agrovet

Reply with a number</div></div>
      <div class="card"><h3>SMS the farmer receives</h3><div class="phone">PixieMap: ${next.title} (day ${next.day}).
${next.body.split(". ")[0]}.
Vaa PPE wakati wa kunyunyizia.

${me.name}: ${me.trees} trees
Forecast ${St.fmt(St.kg(me))} kg this season.
Reply 4 to ask a question.</div></div>
    </div>
    <div class="card"><h3>Why this matters for equity</h3>
      <p class="hint">On the demo register, ${women} plots are registered to women, ${groups} to groups and ${youth} to youth-led households. Voice and USSD keep them on the register whether or not they own a smartphone.</p></div>`;
  }

  /* ========================= interactions ========================= */
  let draft = [], drawOn = true, dLayer = null, gpsWatch = null, history = [];

  function wire(section, ui){
    if(section === "f_dash"){ M.make("m_fdash"); M.orchards("m_fdash",[St.me()]); }

    if(section === "f_orch"){
      M.make("m_forch"); M.orchards("m_forch", St.S.orchards);
      document.querySelectorAll("[data-ed]").forEach(el => el.onchange = () => {
        const o = St.S.orchards.find(x => x.id === el.dataset.id);
        o[el.dataset.ed] = el.type === "number" ? Math.max(1, +el.value || 1) : el.value;
        St.save(); ui.render(); ui.toast("Register updated");
      });
    }

    if(section === "f_map") wireDraw(ui);

    if(section === "f_spray"){
      const b = document.getElementById("bset");
      if(b) b.onclick = () => { St.S.flowering = document.getElementById("bd").value || null; St.save(); ui.render(); };
      const r = document.getElementById("breset");
      if(r) r.onclick = () => {
        if(!confirm("Reset the programme and clear every tick?")) return;
        St.S.flowering = null; St.S.done = []; St.save(); ui.render();
      };
      // ticking a step unlocks the next one and scrolls straight to it
      document.querySelectorAll("[data-done]").forEach(x => x.onclick = () => {
        const k = x.dataset.done;
        if(!St.S.done.includes(k)) St.S.done = [...St.S.done, k];
        St.save();
        const stages = St.sprayStages();
        const next = stages.find(s0 => !St.S.done.includes(s0.key));
        ui.render(next ? "stage-" + next.key : null);
        ui.toast(next ? "Step done — next step unlocked" : "Season complete. Record your harvest next.");
      });
      document.querySelectorAll("[data-undo]").forEach(x => x.onclick = () => {
        St.S.done = St.S.done.filter(y => y !== x.dataset.undo);
        St.save(); ui.render("stage-" + x.dataset.undo);
      });
    }

    if(section === "f_diag"){
      const ph = document.getElementById("ph");
      ph.onchange = () => { const f = ph.files[0]; if(!f) return;
        const i = document.getElementById("pv"); i.src = URL.createObjectURL(f); i.style.display = "block"; };
      document.getElementById("runDiag").onclick = () => runDiagnosis(ui);
    }

    if(section === "f_bot"){
      const send = () => sendChat(document.getElementById("q").value, ui);
      document.getElementById("ask").onclick = send;
      document.getElementById("q").addEventListener("keydown", e => { if(e.key === "Enter") send(); });
      document.querySelectorAll("[data-q]").forEach(b => b.onclick = () => sendChat(b.dataset.q, ui));
    }

    if(section === "f_mkt"){
      const m = M.make("m_mkt");
      M.orchards("m_mkt", St.S.orchards, { color:"#F5A623", weight:1, fillOpacity:.35 });
      M.markers("m_mkt", St.S.agrovets.map(a => ({ lat:a.lat, lng:a.lng,
        popup:`<b>${a.name}</b><br>${a.ward} ward<br>${a.stock.join(", ")}` })), () => "#129139");
      document.querySelectorAll("[data-offer]").forEach(b => b.onclick = () => {
        document.getElementById("offerOut").innerHTML =
          `<p class="note">Quote request sent to the ${b.dataset.offer} group. The lead farmer receives it by SMS and replies with a price and collection date.</p>`;
      });
    }
  }

  /* ---------- boundary drawing ---------- */
  function wireDraw(ui){
    const m = M.make("m_draw"); M.fitWards("m_draw");
    M.orchards("m_draw", St.S.orchards, { color:"#F5A623", weight:1, fillOpacity:.22 });
    draft = []; drawOn = true; redraw();
    const info = document.getElementById("dInfo");
    const startBtn = document.getElementById("dStart");
    startBtn.textContent = "Drawing on — click each corner";
    startBtn.classList.add("green");
    ui.toast("Drawing is on: tap each corner of the plot on the satellite image");

    m.map.on("click", e => { if(!drawOn) return;
      draft.push([+e.latlng.lng.toFixed(5), +e.latlng.lat.toFixed(5)]); redraw(); });

    startBtn.onclick = () => {
      drawOn = !drawOn;
      startBtn.textContent = drawOn ? "Drawing on — click each corner" : "Drawing paused — tap to resume";
      startBtn.classList.toggle("green", drawOn);
      ui.toast(drawOn ? "Drawing on: tap each corner of the plot" : "Drawing paused — pan and zoom freely");
    };
    document.getElementById("dUndo").onclick = () => { draft.pop(); redraw(); };
    document.getElementById("dClear").onclick = () => { draft = []; redraw(); };
    document.getElementById("dGps").onclick = () => {
      if(gpsWatch){ navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; ui.toast("GPS walk stopped"); return; }
      if(!navigator.geolocation){ ui.toast("This device has no GPS available"); return; }
      ui.toast("Walk the boundary — a corner is dropped as you move");
      gpsWatch = navigator.geolocation.watchPosition(p => {
        draft.push([+p.coords.longitude.toFixed(5), +p.coords.latitude.toFixed(5)]); redraw();
        M.maps["m_draw"].map.setView([p.coords.latitude, p.coords.longitude], 17);
      }, () => ui.toast("GPS not permitted — trace the boundary on the map instead"),
         { enableHighAccuracy:true, maximumAge:5000 });
    };
    document.getElementById("nSave").onclick = () => saveOrchard(ui);
    document.getElementById("nGeo").onclick = () => exportGeoJSON(ui);

    function redraw(){
      const map = M.maps["m_draw"].map;
      if(dLayer) map.removeLayer(dLayer);
      dLayer = L.layerGroup();
      draft.forEach(p => L.circleMarker([p[1], p[0]], { radius:5, color:"#FFFFFF", weight:2, fillColor:"#129139", fillOpacity:1 }).addTo(dLayer));
      if(draft.length > 1) L.polygon(draft.map(p => [p[1], p[0]]), { color:"#129139", weight:3, fillOpacity:.3 }).addTo(dLayer);
      dLayer.addTo(map);
      const ha = M.areaHa(draft);
      const w = draft.length > 2 ? M.pointInWard(cx(), cy()) : null;
      info.textContent = draft.length < 3
        ? `${draft.length} corner${draft.length === 1 ? "" : "s"} — need at least 3`
        : `${ha.toFixed(2)} ha (${(ha*2.471).toFixed(2)} acres)${w ? " · " + w.w + " ward, " + w.s : " · outside Makueni"} · ~${Math.round(ha*400)} trees at 5 m × 5 m`;
    }
    function cx(){ return draft.reduce((a,p) => a + p[0], 0) / draft.length; }
    function cy(){ return draft.reduce((a,p) => a + p[1], 0) / draft.length; }
  }

  function saveOrchard(ui){
    const out = document.getElementById("nOut");
    if(draft.length < 3){ out.textContent = "Trace at least three corners on the map first."; return; }
    if(!document.getElementById("nConsent").checked){ out.textContent = "Record the farmer's consent before registering."; return; }
    const cx = draft.reduce((a,p) => a + p[0], 0) / draft.length;
    const cy = draft.reduce((a,p) => a + p[1], 0) / draft.length;
    const w = M.pointInWard(cx, cy);
    if(!w){ out.textContent = "That boundary falls outside Makueni County."; return; }
    const o = {
      id:"o" + Date.now(), name:(document.getElementById("nName").value.trim() || "Unnamed plot"),
      ward:w.w, sub:w.s, trees:Math.max(1, +document.getElementById("nTrees").value || 1),
      year:+document.getElementById("nYear").value || St.YEAR,
      bloom:document.getElementById("nBloom").value, irrigation:document.getElementById("nIrr").value,
      ha:+M.areaHa(draft).toFixed(2), poly:draft.slice(),
      gender:document.getElementById("nGender").value, youth:true
    };
    St.S.orchards.push(o); St.S.me = o.id; draft = []; St.save();
    const f = St.densityFlag(o);
    ui.toast(`${o.name} registered in ${o.ward} ward`);
    St.S.section = "f_orch"; ui.render();
    document.getElementById("view").insertAdjacentHTML("afterbegin",
      `<div class="card" style="border-left:4px solid var(--green)"><b>${o.name} registered.</b> ${o.ha} ha in ${o.ward} ward
       (${o.sub} sub-county), ${o.trees} trees, forecast <b>${St.fmt(St.kg(o))} kg</b> this season.
       ${f ? `<span class="tag w">${f}</span>` : `<span class="tag g">tree count consistent with mapped area</span>`}</div>`);
  }

  function exportGeoJSON(ui){
    const fc = { type:"FeatureCollection", features: St.S.orchards.map(o => ({
      type:"Feature",
      properties:{ name:o.name, ward:o.ward, subcounty:o.sub, trees:o.trees, planted:o.year,
                   area_ha:o.ha, bloom:o.bloom, irrigation:o.irrigation, forecast_kg:St.kg(o) },
      geometry:{ type:"Polygon", coordinates:[[...o.poly, o.poly[0]]] } })) };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type:"application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "pixiemap-orchards.geojson";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    ui.toast("Orchard register exported as GeoJSON for QGIS or ArcGIS");
  }

  /* ---------- AI handlers ---------- */
  const escHtml = s0 => String(s0).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  async function runDiagnosis(ui){
    const st = document.getElementById("dStatus"), out = document.getElementById("dOut");
    const text = document.getElementById("sym").value.trim(), file = document.getElementById("ph").files[0];
    const ward = document.getElementById("dw").value;
    if(!text && !file){ st.textContent = "Add a photo or a description."; return; }
    st.innerHTML = '<span class="spinner"></span> screening…'; out.innerHTML = "";
    const r = await PM.ai.diagnose({ description:text, file, ward });
    st.textContent = "";
    if(r.offline){
      out.innerHTML = `<div class="card" style="margin:0;border-left:4px solid var(--orange)">
        <h3>Screening unavailable</h3>
        <p class="hint">${r.error ? escHtml(r.error) : "The screening service did not respond."}</p>
        <p class="note warn">Check that <code>OPENROUTER_API_KEY</code> is set on the deployment, that the OpenRouter account has credit, and that <code>DIAGNOSE_MODEL</code> names a vision-capable model. The farmer's case can still be sent to an extension officer.</p>
        <button class="btn ghost sm" id="escalate">Send to an extension officer instead</button></div>`;
      const b = document.getElementById("escalate");
      if(b) b.onclick = () => {
        const p2 = St.wardIndex[ward].properties;
        St.S.reports.unshift({ id:"r"+Date.now(), ward, issue:(text || "Photo submitted, not yet identified"),
          confidence:0, status:"pending", when:"just now", lng:p2.cx, lat:p2.cy });
        St.save(); ui.toast("Case sent to the county surveillance queue");
      };
      return;
    }
    const conf = Math.round(r.confidence || 0), esc = conf < 75 || r.highRisk;
    out.innerHTML = `<div class="card" style="margin:0;border-left:4px solid ${esc ? "var(--orange)" : "var(--green)"}">
      <h3>${r.issue || "Not identified"}</h3>
      <p><span class="tag ${esc ? "w" : "g"}">confidence ${conf}%</span> ${r.highRisk ? '<span class="tag r">high risk</span>' : ""}</p>
      <p class="hint">${r.signs || ""}</p><p><b>What to do:</b> ${r.action || ""}</p>
      ${esc ? `<p class="note warn">Held for county extension officer confirmation before the farmer acts. It is now in the surveillance queue.</p>`
            : `<p class="note">Advice delivered to the farmer and the case mapped for county early warning.</p>`}
      ${r.model ? `<p class="sub" style="margin-top:6px">Screened by ${escHtml(r.model)}</p>` : ""}</div>`;
    const p = St.wardIndex[ward].properties;
    St.S.reports.unshift({ id:"r"+Date.now(), ward, issue:r.issue || "Unidentified", confidence:conf,
      status: esc ? "pending" : "advised", when:"just now", lng:p.cx, lat:p.cy });
    St.save();
  }

  async function sendChat(q, ui){
    q = (q || "").trim(); if(!q) return;
    const box = document.getElementById("chat"), input = document.getElementById("q");
    if(input) input.value = "";
    const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    box.insertAdjacentHTML("beforeend", `<div class="msg u">${esc(q)}</div>`);
    const node = document.createElement("div"); node.className = "msg a";
    node.innerHTML = '<span class="spinner"></span>';
    box.appendChild(node); box.scrollTop = box.scrollHeight;
    history.push({ role:"user", content:q });
    const r = await PM.ai.chat(history, t => { node.innerHTML = PM.ai.md(t); box.scrollTop = box.scrollHeight; });
    node.innerHTML = PM.ai.md(r.text);
    history.push({ role:"assistant", content:r.text });
    box.scrollTop = box.scrollHeight;
  }

  PM.farmer = { views:{ f_dash:dash, f_orch:orchards, f_map:mapper, f_spray:spray, f_diag:diag, f_bot:bot, f_mkt:market, f_sms:sms }, wire };
})();
