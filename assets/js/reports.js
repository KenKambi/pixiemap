/* ==========================================================================
   PixieMap Makueni — PDF reports (jsPDF + autoTable)
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  const St = PM.state;

  async function build(type, ward, forWhom, statusEl){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
    const c = St.county(), stats = St.wardStats(), YEAR = St.YEAR, fmt = St.fmt;

    doc.setFillColor(10,42,94);  doc.rect(0,0,W,92,"F");
    doc.setFillColor(18,145,57); doc.rect(0,92,W,5,"F");
    const logoEl = document.querySelector("img.brandmark");
    const logo = await PM.mapImage.imageData(logoEl ? logoEl.src : "assets/img/makueni-logo.png").catch(() => null);
    let tx = 40;
    if(logo){
      doc.setFillColor(255,255,255);
      doc.circle(64, 46, 27, "F");
      doc.addImage(logo, "PNG", 40, 22, 48, 48);
      tx = 104;
    }
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(17);
    doc.text("Government of Makueni County", tx, 40);
    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    doc.text("PixieMap Makueni · Pixie orchard registry and decision support", tx, 60);
    doc.setFontSize(9);
    doc.text("Department of Agriculture, Irrigation, Livestock, Fisheries & Cooperative Development", tx, 76);
    doc.setTextColor(20,20,20);

    const titles = { county:"County Pixie Production Report", ward:"Ward Profile — " + ward,
                     surv:"Pest and Disease Surveillance Summary", plan:"Subsidy and Extension Priority List" };
    doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text(titles[type], 40, 130);
    doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(90,106,122);
    doc.text(`Season ${YEAR}  ·  Generated ${today}  ·  Prepared for: ${forWhom}`, 40, 148, {maxWidth:W-80});
    doc.setTextColor(20,20,20);
    let y = 174;

    const addMap = (doc, y, W, title, subtitle, markers, metric, legend) => {
      try {
        const png = PM.mapImage.dataURL({
          width: 1100, height: 800, title, subtitle,
          markers: markers || [], metric: metric || (w => w.kg),
          label: legend || "Forecast harvest (kg)"
        });
        const h = (W - 80) * 800 / 1100;
        if(y + h > doc.internal.pageSize.getHeight() - 60){ doc.addPage(); y = 60; }
        doc.addImage(png, "PNG", 40, y, W - 80, h);
        return y + h + 20;
      } catch(e){ return y; }
    };

    const box = (x,label,val) => {
      doc.setDrawColor(223,229,236); doc.roundedRect(x,y,120,54,6,6,"S");
      doc.setFontSize(8); doc.setTextColor(90,106,122); doc.text(label,x+10,y+18);
      doc.setFontSize(15); doc.setTextColor(20,20,20); doc.setFont("helvetica","bold");
      doc.text(String(val),x+10,y+40); doc.setFont("helvetica","normal");
    };
    const table = (head, body, title) => {
      if(title){ doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text(title,40,y); y += 6; }
      doc.autoTable({ startY:y+6, head:[head], body, theme:"grid",
        styles:{fontSize:8.5, cellPadding:4}, headStyles:{fillColor:[18,68,145], textColor:255},
        alternateRowStyles:{fillColor:[244,246,250]}, margin:{left:40,right:40} });
      y = doc.lastAutoTable.finalY + 22;
    };

    if(type === "county" || type === "ward"){
      if(type === "county"){ box(40,"ORCHARDS",c.n); box(170,"TREES",fmt(c.trees)); box(300,"ORCHARD HA",c.ha.toFixed(1)); box(430,"FORECAST KG",fmt(c.kg)); }
      else { const w = stats.find(s => s.ward === ward);
        box(40,"ORCHARDS",w.n); box(170,"TREES",fmt(w.trees)); box(300,"ORCHARD HA",w.ha.toFixed(1)); box(430,"FORECAST KG",fmt(w.kg)); }
      y += 76;
      y = addMap(doc, y, W,
        type === "ward" ? "Ward location and county registry coverage" : "Forecast production by ward",
        type === "ward" ? `${ward} ward within Makueni County` : `Season ${YEAR} · ${c.n} registered orchards`);
      const cv = document.getElementById("pdfchart");
      if(cv && window.Chart){
        const top = St.activeWards().sort((a,b) => b.kg - a.kg).slice(0,10);
        const tmp = new Chart(cv, { type:"bar",
          data:{ labels: top.map(w => w.ward), datasets:[{ label:"Forecast kg", data: top.map(w => w.kg), backgroundColor:"#124491" }] },
          options:{ responsive:false, animation:false, plugins:{legend:{display:false}},
                    scales:{ x:{ticks:{color:"#333"}}, y:{ticks:{color:"#333"}, beginAtZero:true} } } });
        await new Promise(r => setTimeout(r, 280));
        doc.setFont("helvetica","bold"); doc.setFontSize(11);
        doc.text("Forecast volume by ward (top 10)", 40, y); y += 8;
        doc.addImage(cv.toDataURL("image/png"), "PNG", 40, y, W-80, 240); y += 258;
        tmp.destroy();
      }
    }

    if(type === "county"){
      table(["Ward","Sub-county","Orchards","Trees","Ha","Forecast kg","kg/tree","Trees <3 yrs"],
        stats.filter(s => s.n).sort((a,b) => b.kg - a.kg)
          .map(s => [s.ward, s.sub, s.n, fmt(s.trees), s.ha.toFixed(2), fmt(s.kg), (s.kg/Math.max(s.trees,1)).toFixed(1), fmt(s.young)]),
        "Registered production by ward");
      const gaps = stats.filter(s => !s.n).map(s => s.ward);
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text("Wards with no registry coverage yet", 40, y); y += 16;
      doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
      doc.text(gaps.join(", ") || "None — full coverage", 40, y, {maxWidth:W-80});
    }
    if(type === "ward"){
      const list = St.S.orchards.filter(o => o.ward === ward);
      table(["Plot","Trees","Planted","Age","Area ha","Bloom","Water","Forecast kg"],
        list.map(o => [o.name, o.trees, o.year, St.age(o), o.ha, o.bloom, o.irrigation, fmt(St.kg(o))]),
        "Registered orchards");
      const rep = St.S.reports.filter(r => r.ward === ward);
      table(["Reported","Finding","AI confidence","Status"],
        rep.length ? rep.map(r => [r.when, r.issue, r.confidence + "%", r.status]) : [["—","No cases this season","—","—"]],
        "Pest and disease cases");
    }
    if(type === "surv"){
      y = addMap(doc, y, W, "Where pest and disease reports are coming from",
        `${St.S.reports.length} reports this season · rings mark reported cases`,
        St.S.reports.map(r => ({ lng:r.lng, lat:r.lat,
          color: r.status === "pending" ? "#C4600E" : r.status === "assigned" ? "#124491" : "#129139" })));
      table(["Reported","Ward","Finding","AI confidence","Status"],
        St.S.reports.map(r => [r.when, r.ward, r.issue, r.confidence + "%", r.status]), "All reports this season");
      doc.setFontSize(9.5); doc.setTextColor(90,106,122);
      doc.text("Findings below 75% confidence, and all high-risk findings, are held for officer confirmation before advice reaches the farmer.",
        40, y, {maxWidth:W-80});
    }
    if(type === "plan"){
      y = addMap(doc, y, W, "Yield per tree by ward", "Darker wards are already productive; lighter wards are where support changes the most",
        null, w => w.n ? w.kg / Math.max(w.trees,1) : 0, "Forecast yield per tree (kg)");
      table(["Ward","Sub-county","Need score","kg/tree","% irrigated","Recommended support"],
        St.priorityRows().map(w => [w.ward, w.sub, w.score, w.perTree.toFixed(1), Math.round(w.irrShare*100) + "%", w.action]),
        "Priority ranking");
    }

    // supporter strip on the final page
    try {
      const logos = [...document.querySelectorAll("footer.foot img.plogo")];
      if(logos.length){
        const srcs = await Promise.all(logos.map(l => PM.mapImage.imageData(l.src).catch(() => null)));
        const strip = 54;
        if(y + strip + 70 > H){ doc.addPage(); y = 60; }
        const sy = Math.max(y + 10, H - 150);
        doc.setDrawColor(223,229,236); doc.line(40, sy - 14, W - 40, sy - 14);
        doc.setFontSize(8); doc.setTextColor(120,130,140);
        doc.text("AN INITIATIVE OF", 40, sy - 2);
        let x = 40;
        srcs.forEach((src, i) => {
          if(!src) return;
          const el = logos[i];
          const ratio = (el.naturalWidth || 200) / (el.naturalHeight || 60);
          const h = 30, wdt = Math.min(130, h * ratio);
          doc.addImage(src, "PNG", x, sy + 6, wdt, h);
          x += wdt + 22;
        });
        y = sy + 46;
      }
    } catch(e){ /* logos are decorative */ }

    const pages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pages; i++){
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120,130,140);
      doc.text(`PixieMap Makueni · figures are forecasts from the orchard register · page ${i} of ${pages}`, 40, H - 24);
    }

    const name = `PixieMap_${type}_${YEAR}.pdf`;
    try {
      const dl = (window.claude && claude.use) ? await claude.use("downloads").catch(() => null) : null;
      if(dl){ await dl.save({ filename:name, data: doc.output("blob") }); }
      else { doc.save(name); }
      if(statusEl) statusEl.textContent = "Report ready.";
    } catch(e){
      try { doc.save(name); if(statusEl) statusEl.textContent = "Report downloaded."; }
      catch(e2){ if(statusEl) statusEl.textContent = "Download was declined."; }
    }
  }

  PM.reports = { build };
})();
