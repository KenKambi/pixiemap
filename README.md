# PixieMap Makueni

A digital Pixie mandarin **orchard registry and decision-support platform** for Makueni County, Kenya.
Farmers map their plots and record their trees; the county gets the first complete picture of the
sector; and both sides get AI help that is bounded, safe and reviewed by extension officers.

Built for the Kenya Red Cross Society / ICHA Digital Innovation Challenge (IFSL-Makueni, Agriculture Optimisation).

---

## What it does

### Farmer and Pixie Champion portal
| Section | What it does |
|---|---|
| Dashboard | Forecast, tree count, next action in the spray programme, plot on satellite imagery |
| My orchards and trees | Editable tree counts and planting years, with density checks against the mapped area |
| Map a new orchard | Trace the boundary on imagery or walk it by GPS; area, acreage and ward detected automatically; consent recorded; export to GeoJSON |
| Spray programme | Stage-by-stage schedule generated from the orchard's own flowering date |
| AI crop check | Photo or description in, likely issue + confidence out; low-confidence or high-risk cases escalate to an officer |
| Ask PixieBot | Domain-bounded assistant in English, Kiswahili and Kikamba |
| Market and agrovets | Ward-level volumes for buyers, map of licensed agrovets and their stock |
| SMS / USSD view | What the same service looks like on a basic phone |

### County government portal
| Section | What it does |
|---|---|
| County overview | KPIs plus a ward choropleth (forecast kg, trees, kg/tree, trees under 3 years) and coverage gaps |
| Ward statistics | All 30 wards, sortable and filterable by sub-county, CSV export |
| Production forecast | Harvest window, tree-age profile, volume coming into bearing |
| Pest surveillance | Report queue with AI confidence, officer assignment, mapped cases |
| Subsidy and extension planning | Need score per ward with recommended support and a dispatch list |
| Reports | Four PDF reports generated in the browser (county production, ward profile, surveillance, priority list) |

### The yield model

```
Y = Σ ( N · Ma · B · C )
```

`N` trees · `Ma` age maturity factor · `B` bloom score reported at flowering · `C` water factor.
Trees under two years contribute nothing, which is how the county sees volume that is still coming.
Parameters live in `assets/js/config.js` and are calibrated against a real Makueni orchard's
five-season harvest record.

---

## Running it

```bash
# 1. static preview (no AI backend)
npm run serve                 # http://localhost:5173

# 2. full stack with PixieBot and crop screening
cp .env.example .env          # add your OPENROUTER_API_KEY
npm install
npm run dev                   # netlify dev → http://localhost:8888

# 3. one-file build for a pitch laptop or flash disk
npm run build:standalone      # dist/pixiemap-standalone.html
```

Deploy to Netlify: connect the repo, set `OPENROUTER_API_KEY` in **Site settings → Environment
variables**, and the functions in `netlify/functions/` are picked up automatically.

---

## Project layout

```
index.html                     app shell + sticky navigation
assets/css/styles.css          design system (Makueni County blue #124491 / green #129139)
assets/js/config.js            constants, yield model, PixieBot system prompts
assets/js/state.js             state store, yield engine, ward aggregation
assets/js/map.js               Leaflet: OSM / OSM-HOT / Esri imagery, choropleth, drawing, geometry
assets/js/charts.js            Chart.js helpers (theme aware)
assets/js/ai.js                serverless client with graceful fallbacks
assets/js/reports.js           jsPDF + autoTable report builder
assets/js/views-farmer.js      farmer portal
assets/js/views-county.js      county portal
assets/js/app.js               routing, navigation, theming, shortcuts
data/makueni-wards.js|.geojson 30 ward boundaries (simplified to ~130 m) with sub-county and area
data/seed-orchards.js          24 demonstration orchards generated inside real ward polygons
netlify/functions/pixiebot.js  chat assistant (OpenRouter, server side)
netlify/functions/diagnose.js  crop screening, JSON out, vision-capable model
tools/build-standalone.mjs     inlines everything into a single HTML file
```

No build step and no framework: open `index.html` and it runs. Leaflet, Chart.js, jsPDF and
jsPDF-AutoTable load from CDN at pinned versions.

---

## Basemaps

Esri World Imagery is the default; OpenStreetMap and Humanitarian OSM are available from the layer
control on every map. Ward boundaries are drawn over whichever basemap is active. If the page is
opened inside a sandbox that blocks third-party tiles, a banner explains it and the vector layers
still work.

---

## AI design and safety

Both functions share one principle: **the model is bounded, and the human decides.**

- **Domain lock.** PixieBot answers only Pixie and citrus questions and offers an extension officer for anything else.
- **No brand names.** Product categories only, with a reminder to use a PCPB-registered product and follow the label and pre-harvest interval.
- **Safety first.** Protective equipment whenever spraying comes up; bee safety during flowering.
- **Escalation.** Screening results under 75% confidence, or flagged high risk (suspected citrus greening/HLB, false codling moth, fruit fly), are held for officer confirmation before advice reaches the farmer.
- **Keys stay server-side.** The browser never sees `OPENROUTER_API_KEY`.

Models are swappable through `PIXIEBOT_MODEL` and `DIAGNOSE_MODEL`.

---

## Data protection

Built for the Kenya Data Protection Act (2019):

- consent is recorded before any plot is registered,
- buyers and the county see **ward aggregates**, not farms, unless a farmer opts in,
- farmers can view, correct or withdraw their record,
- the demonstration register is local to the browser (`localStorage`); a deployment would use PostgreSQL + PostGIS with role-based access.

---

## Roadmap

1. PostgreSQL + PostGIS backend, offline-first Flutter app, Africa's Talking SMS/USSD/voice.
2. Vision model fine-tuned on locally confirmed images collected with extension officers.
3. Satellite tree-crown detection to verify counts, and NDVI-based stress alerts.
4. Mango and avocado on the same registry; other Lower Eastern counties.

## Team

- **Joseph Munyenze** — GIS and remote sensing specialist, lecturer, and Pixie grower in Makueni. Geospatial, yield modelling, agronomic content.
- **Kennedy Kambi** — electronics and computer engineer. Systems, mobile, AI engineering.

Licensed MIT. Ward boundary data: Makueni County Government.
