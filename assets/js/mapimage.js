/* ==========================================================================
   PixieMap Makueni — static map renderer
   Draws the 30-ward layer (optionally shaded, optionally with orchard and
   case markers) onto a canvas, so the same map can be embedded in a PDF
   report. Pure canvas: no tiles, no cross-origin taint, works offline.
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  const St = PM.state;

  const RAMP = ["#BFE3C6", "#8ACB99", "#4FAF6B", "#1E8A45", "#0C6D2B"];
  const NODATA = "#D7DCE2";

  function bounds(){
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    St.WARDS.features.forEach(f => {
      const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
      polys.forEach(p => p[0].forEach(([x,y]) => {
        if(x < x0) x0 = x; if(x > x1) x1 = x;
        if(y < y0) y0 = y; if(y > y1) y1 = y;
      }));
    });
    return { x0, y0, x1, y1 };
  }

  /* opts: { width, height, metric, label, title, subtitle, markers:[{lng,lat,color}], orchards:bool } */
  function render(opts){
    opts = opts || {};
    const W = opts.width || 1100, H = opts.height || 820;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");

    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, H);

    const pad = { l:24, r:24, t: opts.title ? 58 : 24, b: 86 };
    const b = bounds();
    const latMid = (b.y0 + b.y1) / 2;
    const kx = Math.cos(latMid * Math.PI / 180);
    const dataW = (b.x1 - b.x0) * kx, dataH = (b.y1 - b.y0);
    const scale = Math.min((W - pad.l - pad.r) / dataW, (H - pad.t - pad.b) / dataH);
    const offX = pad.l + ((W - pad.l - pad.r) - dataW * scale) / 2;
    const offY = pad.t + ((H - pad.t - pad.b) - dataH * scale) / 2;
    const px = (lng, lat) => [ offX + (lng - b.x0) * kx * scale, offY + (b.y1 - lat) * scale ];

    const stats = {}; St.wardStats().forEach(w => stats[w.ward] = w);
    const metric = opts.metric || (w => w.kg);
    const values = Object.values(stats).map(metric).filter(v => v > 0);
    const max = Math.max(1, ...values);
    const colour = v => !v ? NODATA : RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length - 1e-9))];

    // ward polygons
    g.lineJoin = "round";
    St.WARDS.features.forEach(f => {
      const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
      g.beginPath();
      polys.forEach(poly => poly.forEach((ring, ri) => {
        ring.forEach(([lng, lat], i) => {
          const [X, Y] = px(lng, lat);
          i === 0 ? g.moveTo(X, Y) : g.lineTo(X, Y);
        });
        g.closePath();
      }));
      g.fillStyle = colour(metric(stats[f.properties.w]));
      g.fill();
      g.strokeStyle = "#FFFFFF"; g.lineWidth = 1.2; g.stroke();
    });

    // ward labels for the wards that carry data
    g.font = "600 11px 'Source Sans 3', Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    St.WARDS.features.forEach(f => {
      const w = stats[f.properties.w];
      if(!w || !w.n) return;
      const [X, Y] = px(f.properties.cx, f.properties.cy);
      const t = f.properties.w;
      const tw = g.measureText(t).width;
      g.fillStyle = "rgba(255,255,255,.78)";
      g.fillRect(X - tw/2 - 3, Y - 8, tw + 6, 15);
      g.fillStyle = "#12202E";
      g.fillText(t, X, Y);
    });

    // orchards
    if(opts.orchards !== false){
      St.S.orchards.forEach(o => {
        const cx = o.poly.reduce((a,p) => a + p[0], 0) / o.poly.length;
        const cy = o.poly.reduce((a,p) => a + p[1], 0) / o.poly.length;
        const [X, Y] = px(cx, cy);
        g.beginPath(); g.arc(X, Y, 3.6, 0, Math.PI * 2);
        g.fillStyle = "#C4600E"; g.fill();
        g.strokeStyle = "#FFFFFF"; g.lineWidth = 1.2; g.stroke();
      });
    }

    // extra markers (pest cases)
    (opts.markers || []).forEach(m => {
      const [X, Y] = px(m.lng, m.lat);
      g.beginPath(); g.arc(X, Y, 7, 0, Math.PI * 2);
      g.fillStyle = m.color || "#B3261E"; g.fill();
      g.strokeStyle = "#FFFFFF"; g.lineWidth = 2; g.stroke();
    });

    // title
    if(opts.title){
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillStyle = "#0A2A5E"; g.font = "700 20px 'Source Sans 3', Arial, sans-serif";
      g.fillText(opts.title, pad.l, 30);
      if(opts.subtitle){
        g.fillStyle = "#5A6A7A"; g.font = "400 13px 'Source Sans 3', Arial, sans-serif";
        g.fillText(opts.subtitle, pad.l, 48);
      }
    }

    // legend
    const ly = H - 56, lx = pad.l, sw = 54, sh = 14;
    g.textAlign = "left"; g.textBaseline = "alphabetic";
    g.fillStyle = "#12202E"; g.font = "600 12px 'Source Sans 3', Arial, sans-serif";
    g.fillText(opts.label || "Forecast harvest (kg)", lx, ly - 8);
    RAMP.forEach((c, i) => {
      g.fillStyle = c; g.fillRect(lx + i * sw, ly, sw, sh);
      g.strokeStyle = "#FFFFFF"; g.lineWidth = 1; g.strokeRect(lx + i * sw, ly, sw, sh);
    });
    g.fillStyle = NODATA; g.fillRect(lx + RAMP.length * sw + 16, ly, sw, sh);
    g.fillStyle = "#5A6A7A"; g.font = "400 11px 'Source Sans 3', Arial, sans-serif";
    g.fillText("0", lx, ly + sh + 13);
    g.fillText(St.fmt(max), lx + RAMP.length * sw - 28, ly + sh + 13);
    g.fillText("no registry data", lx + RAMP.length * sw + 16, ly + sh + 13);
    g.fillStyle = "#C4600E";
    g.beginPath(); g.arc(W - pad.r - 150, ly + 7, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#5A6A7A"; g.fillText("registered orchard", W - pad.r - 140, ly + 11);

    return cv;
  }

  const dataURL = opts => render(opts).toDataURL("image/png");

  /* load a same-origin or data-URI image and return it as a PNG data URL */
  function imageData(src){
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        try { resolve(c.toDataURL("image/png")); } catch(e){ resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  PM.mapImage = { render, dataURL, imageData };
})();
