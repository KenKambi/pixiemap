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

    doc.setFillColor(10,42,94);  doc.rect(0,0,W,80,"F");
    doc.setFillColor(18,145,57); doc.rect(0,80,W,5,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(17);
    doc.text("Makueni County Government", 40, 35);
    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    doc.text("PixieMap Makueni · Pixie orchard registry and decision support", 40, 56);
    doc.setTextColor(20,20,20);

    const titles = { county:"County Pixie Production Report", ward:"Ward Profile — " + ward,
                     surv:"Pest and Disease Surveillance Summary", plan:"Subsidy and Extension Priority List" };
    doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text(titles[type], 40, 118);
    doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(90,106,122);
    doc.text(`Season ${YEAR}  ·  Generated ${today}  ·  Prepared for: ${forWhom}`, 40, 136, {maxWidth:W-80});
    doc.setTextColor(20,20,20);
    let y = 162;

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
      table(["Reported","Ward","Finding","AI confidence","Status"],
        St.S.reports.map(r => [r.when, r.ward, r.issue, r.confidence + "%", r.status]), "All reports this season");
      doc.setFontSize(9.5); doc.setTextColor(90,106,122);
      doc.text("Findings below 75% confidence, and all high-risk findings, are held for officer confirmation before advice reaches the farmer.",
        40, y, {maxWidth:W-80});
    }
    if(type === "plan"){
      table(["Ward","Sub-county","Need score","kg/tree","% irrigated","Recommended support"],
        St.priorityRows().map(w => [w.ward, w.sub, w.score, w.perTree.toFixed(1), Math.round(w.irrShare*100) + "%", w.action]),
        "Priority ranking");
    }

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
