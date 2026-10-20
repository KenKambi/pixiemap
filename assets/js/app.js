/* ==========================================================================
   PixieMap Makueni — application shell, routing and sticky navigation
   ========================================================================== */
(function(){
  const St = PM.state;

  const NAV = {
    farmer:[["f_dash","▦","Dashboard"],["f_orch","🌳","My orchards &amp; trees"],["f_map","✎","Map a new orchard"],
            ["f_spray","🗓","Spray programme"],["f_diag","🔬","AI crop check"],["f_bot","💬","Ask PixieBot"],
            ["f_mkt","🛒","Market &amp; agrovets"],["f_sms","📱","SMS / USSD view"]],
    county:[["c_over","▦","County overview"],["c_ward","📊","Ward statistics"],["c_comp","⚖","Compare wards"],["c_fore","📈","Production forecast"],
            ["c_surv","⚠","Pest surveillance"],["c_plan","🎯","Subsidy &amp; extension planning"],["c_rep","📄","Reports (PDF)"]]
  };
  const VIEWS = Object.assign({}, PM.farmer.views, PM.county.views);

  function toast(msg){
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 4200);
  }
  const ui = { render, toast };

  function drawNav(){
    const items = NAV[St.S.portal];
    document.getElementById("side").innerHTML =
      `<div class="grouplabel">${St.S.portal === "farmer" ? "Farmer &amp; Pixie Champion" : "County government"}</div>` +
      items.map(i => `<button data-sec="${i[0]}" aria-current="${St.S.section === i[0]}"><span class="ic">${i[1]}</span>${i[2]}</button>`).join("") +
      `<div class="sidefoot">${St.S.portal === "farmer"
        ? "Works offline-first in the field build; data syncs when network returns."
        : "Ward figures only. Farm records stay with the farmer."}</div>`;
    document.getElementById("pfarmer").setAttribute("aria-pressed", St.S.portal === "farmer");
    document.getElementById("pcounty").setAttribute("aria-pressed", St.S.portal === "county");
    document.getElementById("whochip").innerHTML = St.S.portal === "farmer"
      ? `Farm <select id="mesel">${St.S.orchards.map(o => `<option value="${o.id}" ${o.id === St.S.me ? "selected" : ""}>${o.name}</option>`).join("")}</select>`
      : `Signed in as <b style="margin-left:4px">County Agriculture Officer</b>`;
  }

  function render(scrollTo){
    PM.charts.destroyAll();
    PM.map.destroyAll();
    drawNav();
    document.getElementById("view").innerHTML = (VIEWS[St.S.section] || VIEWS.f_dash)();
    if(scrollTo){
      requestAnimationFrame(() => {
        const el = document.getElementById(scrollTo);
        if(el) el.scrollIntoView({ behavior:"smooth", block:"center" });
        else window.scrollTo({ top:0 });
      });
    } else {
      window.scrollTo({ top:0 });
    }
    const mesel = document.getElementById("mesel");
    if(mesel) mesel.onchange = () => { St.S.me = mesel.value; St.save(); render(); };
    document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
    document.querySelectorAll("[data-fit]").forEach(b => b.onclick = () => PM.map.fitWards(b.dataset.fit));
    (St.S.portal === "farmer" ? PM.farmer : PM.county).wire(St.S.section, ui);
    St.save();
  }
  function go(sec){ St.S.section = sec; St.save(); render(); }

  /* nav wiring */
  document.getElementById("pfarmer").onclick = () => { St.S.portal = "farmer"; St.S.section = "f_dash"; St.save(); render(); };
  document.getElementById("pcounty").onclick = () => { St.S.portal = "county"; St.S.section = "c_over"; St.save(); render(); };
  document.getElementById("side").addEventListener("click", e => {
    const b = e.target.closest("[data-sec]"); if(b) go(b.dataset.sec);
  });
  document.getElementById("theme").onclick = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    St.S.theme = next; St.save(); render();
  };
  document.getElementById("resetdemo").onclick = () => {
    if(confirm("Reset the demo register to its seeded state?")){ St.reset(); location.reload(); }
  };
  if(St.S.theme) document.documentElement.setAttribute("data-theme", St.S.theme);

  /* shadow on the sticky bar once the page scrolls */
  const bar = document.querySelector(".topbar");
  const onScroll = () => bar.classList.toggle("scrolled", window.scrollY > 6);
  window.addEventListener("scroll", onScroll, { passive:true }); onScroll();

  /* keyboard shortcuts: 1-9 jump between sections, f / c switch portal */
  document.addEventListener("keydown", e => {
    if(e.target.matches("input,textarea,select")) return;
    if(e.key === "f"){ St.S.portal = "farmer"; St.S.section = "f_dash"; render(); }
    if(e.key === "c"){ St.S.portal = "county"; St.S.section = "c_over"; render(); }
    const n = parseInt(e.key, 10);
    if(n >= 1 && n <= NAV[St.S.portal].length) go(NAV[St.S.portal][n-1][0]);
  });

  render();
})();
