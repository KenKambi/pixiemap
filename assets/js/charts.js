/* ==========================================================================
   PixieMap Makueni — Chart.js helpers (theme aware)
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  let live = [];

  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    return {
      ink:   cs.getPropertyValue("--ink").trim(),
      line:  cs.getPropertyValue("--line").trim(),
      blue:  cs.getPropertyValue("--blue").trim(),
      green: cs.getPropertyValue("--green").trim(),
      orange:cs.getPropertyValue("--orange").trim()
    };
  };

  const base = () => {
    const c = colors();
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:c.ink, font:{ family:"Source Sans 3" } } },
                tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y ?? ctx.parsed.x).toLocaleString("en-KE")}` } } },
      scales:{ x:{ ticks:{ color:c.ink }, grid:{ color:c.line } },
               y:{ ticks:{ color:c.ink }, grid:{ color:c.line }, beginAtZero:true } }
    };
  };

  function add(canvasId, cfg){
    const el = document.getElementById(canvasId); if(!el) return null;
    const ch = new Chart(el, cfg); live.push(ch); return ch;
  }
  function destroyAll(){ live.forEach(c => { try{ c.destroy(); }catch(e){} }); live = []; }

  PM.charts = { colors, base, add, destroyAll };
})();
