/* ==========================================================================
   PixieMap Makueni — Leaflet maps
   Basemaps: OpenStreetMap, OSM Humanitarian, Esri World Imagery (+ labels)
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  const { WARDS, wardStats, fmt, kg } = PM.state;
  const maps = {};
  let tileWarned = false;

  function basemaps(){
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const hot = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors, Tiles: Humanitarian OSM Team'
    });
    const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, GeoEye"
    });
    const labels = L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png", {
      maxZoom: 18, opacity: .9, attribution: "Labels: Stamen Design"
    });
    return { osm, hot, esri, labels };
  }

  function make(id, opts){
    opts = opts || {};
    if(maps[id]){ setTimeout(() => maps[id].map.invalidateSize(), 60); return maps[id]; }
    const el = document.getElementById(id); if(!el) return null;

    const map = L.map(id, { zoomControl:true, scrollWheelZoom:true })
      .setView(PM.CONFIG.map.center, PM.CONFIG.map.zoom);
    const b = basemaps();
    const startSatellite = opts.satellite !== false;
    (startSatellite ? b.esri : b.osm).addTo(map);

    L.control.layers(
      { "Satellite (Esri World Imagery)": b.esri, "Street map (OpenStreetMap)": b.osm, "Humanitarian OSM": b.hot },
      { "Place labels": b.labels, },
      { position:"topright", collapsed:true }
    ).addTo(map);
    L.control.scale({ imperial:false }).addTo(map);

    b.esri.on("tileerror", flagTiles);
    b.osm.on("tileerror", flagTiles);

    const wards = L.geoJSON(WARDS, {
      style: { color:"#FFFFFF", weight:1.1, opacity:.85, fillOpacity:0 },
      interactive:false
    }).addTo(map);

    const obj = { map, base:b, wards };
    maps[id] = obj;
    setTimeout(() => map.invalidateSize(), 90);
    return obj;
  }

  function flagTiles(){
    if(tileWarned) return;
    tileWarned = true;
    const host = document.getElementById("tilebanner");
    if(host) host.classList.remove("hidden");
  }

  const fitWards = id => { const o = maps[id]; if(o) o.map.fitBounds(o.wards.getBounds(), {padding:[12,12]}); };

  function orchards(id, list, style){
    const o = maps[id]; if(!o) return;
    if(o.orch) o.map.removeLayer(o.orch);
    o.orch = L.layerGroup(list.map(x => {
      const poly = L.polygon(x.poly.map(p => [p[1], p[0]]),
        style || { color:"#F5A623", weight:2, fillColor:"#F5A623", fillOpacity:.45 });
      poly.bindPopup(
        `<b>${x.name}</b><br>${x.ward} ward · ${x.sub} sub-county<br>
         ${x.trees} trees · planted ${x.year} · ${x.ha} ha<br>
         Forecast <b>${fmt(kg(x))} kg</b> (${x.bloom} bloom, ${x.irrigation})`);
      return poly;
    })).addTo(o.map);
    if(list.length){
      const bounds = o.orch.getLayers().reduce((a,l) => a ? a.extend(l.getBounds()) : l.getBounds(), null);
      if(bounds) o.map.fitBounds(bounds, {padding:[40,40], maxZoom:16});
    }
  }

  function choropleth(id, metric){
    const o = maps[id]; if(!o) return;
    const stats = {}; wardStats().forEach(w => stats[w.ward] = w);
    const max = Math.max(1, ...Object.values(stats).map(metric).filter(v => v > 0));
    const col = v => !v ? "#8795A3" : (v/max > .75 ? "#0C6D2B" : v/max > .5 ? "#129139" : v/max > .25 ? "#63B96F" : "#BFE3C6");
    if(o.choro) o.map.removeLayer(o.choro);
    o.choro = L.geoJSON(WARDS, {
      style: f => ({ color:"#FFFFFF", weight:1, fillColor: col(metric(stats[f.properties.w])), fillOpacity:.68 }),
      onEachFeature: (f,l) => {
        const w = stats[f.properties.w];
        l.bindPopup(`<b>${w.ward}</b> (${w.sub} sub-county)<br>${w.n} orchards · ${fmt(w.trees)} trees<br>
          Forecast <b>${fmt(w.kg)} kg</b><br>${w.n ? (w.kg/Math.max(w.trees,1)).toFixed(1)+" kg per tree" : "no registry data yet"}`);
        l.on("mouseover", () => l.setStyle({weight:3}));
        l.on("mouseout",  () => l.setStyle({weight:1}));
      }
    }).addTo(o.map);
    o.wards.bringToFront();
    o.map.fitBounds(o.choro.getBounds(), {padding:[10,10]});
  }

  function markers(id, list, colorFor){
    const o = maps[id]; if(!o) return;
    if(o.pts) o.map.removeLayer(o.pts);
    o.pts = L.layerGroup(list.map(p =>
      L.circleMarker([p.lat, p.lng], { radius:8, color:"#FFFFFF", weight:2, fillColor: colorFor(p), fillOpacity:.95 })
        .bindPopup(p.popup))).addTo(o.map);
  }

  /* ---------- geometry ---------- */
  function areaHa(ring){
    if(ring.length < 3) return 0;
    const lat0 = ring.reduce((a,p) => a + p[1], 0) / ring.length;
    const k = Math.cos(lat0 * Math.PI / 180);
    let a = 0;
    for(let i = 0; i < ring.length; i++){
      const j = (i+1) % ring.length;
      a += (ring[i][0]*111320*k) * (ring[j][1]*110574) - (ring[j][0]*111320*k) * (ring[i][1]*110574);
    }
    return Math.abs(a/2) / 10000;
  }
  function pointInWard(lng, lat){
    for(const f of WARDS.features){
      const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
      let hit = false;
      for(const poly of polys){
        const r = poly[0]; let c = false;
        for(let i = 0, j = r.length - 1; i < r.length; j = i++){
          if(((r[i][1] > lat) !== (r[j][1] > lat)) &&
             (lng < (r[j][0]-r[i][0]) * (lat-r[i][1]) / (r[j][1]-r[i][1]) + r[i][0])) c = !c;
        }
        if(c) hit = !hit;
      }
      if(hit) return f.properties;
    }
    return null;
  }

  PM.map = { make, maps, fitWards, orchards, choropleth, markers, areaHa, pointInWard,
             destroyAll(){ for(const k in maps){ try{ maps[k].map.remove(); }catch(e){} delete maps[k]; } } };
})();
