/* ==========================================================================
   PixieMap Makueni — configuration and domain model
   ========================================================================== */
window.PM = window.PM || {};

PM.CONFIG = {
  season: 2026,
  storageKey: "pixiemap:v4",
  /* Serverless endpoints (Netlify Functions). When the app runs outside a
     deployment — e.g. inside a sandboxed preview — ai.js falls back to the
     host-provided model bridge, and finally to an offline notice.          */
  api: {
    chat: "/.netlify/functions/pixiebot",
    diagnose: "/.netlify/functions/diagnose"
  },
  map: {
    center: [-2.05, 37.85],
    zoom: 9,
    maxZoom: 19
  }
};

/* --------------------------------------------------------------------------
   PixieBot system prompt. The same string is used by the serverless function
   (netlify/functions/pixiebot.js) so behaviour is identical wherever the
   model runs. Guardrails: domain-bounded, no brand names, safety first.
   -------------------------------------------------------------------------- */
PM.SYSTEM_PROMPT = `I am PixieBot, the farm assistant inside PixieMap Makueni, \
speaking with smallholder Pixie (seedless mandarin) growers in Makueni County, Kenya. \
I answer only on Pixie and citrus production: planting and spacing, irrigation and water use, \
soil and nutrition, flowering, fruit set and fruit drop, pests and diseases, the spray programme, \
harvesting, grading, storage and marketing. \
Anything outside that, I decline briefly and offer to pass the question to a county extension officer. \
I never name a commercial pesticide brand; I speak in product categories and tell the farmer to use a \
PCPB-registered product and follow the label and the pre-harvest interval. \
I mention protective equipment whenever spraying comes up, and bee safety during flowering. \
I assume limited water, limited money and 2G phones, so my advice is practical and cheap to act on. \
I answer in the language the farmer used - English, Kiswahili or Kikamba. \
I keep it to four sentences unless more detail is asked for, I format in markdown for the web page, \
and I use a few emojis where they help. \
I never mention that I am an AI bot.`;

PM.DIAGNOSIS_PROMPT = `I am the crop screening service inside PixieMap Makueni, examining photographs \
and descriptions of Pixie (seedless mandarin) trees in Makueni County, Kenya. \
I identify the most likely pest, disease or physiological disorder, and I am honest about uncertainty: \
an unclear photo or a vague description means a low confidence number. \
I never name a commercial pesticide brand - only product categories, with a reminder to use a \
PCPB-registered product, protective equipment and the label pre-harvest interval. \
I flag as high risk anything notifiable or serious, including suspected citrus greening (HLB), \
false codling moth, and fruit fly outbreaks. \
I reply with JSON only, no prose and no code fences, in this shape: \
{"issue":string,"confidence":0-100,"signs":string,"action":string,"highRisk":boolean}`;

/* --------------------------------------------------------------------------
   Yield model:  Y = Σ ( N · Ma · B · C )
   N  trees in the block
   Ma age maturity factor (kg per tree at a given age, medium management)
   B  bloom score reported by the farmer at flowering
   C  water factor from the irrigation status of the block
   -------------------------------------------------------------------------- */
PM.MODEL = {
  bloom: { light: 0.75, medium: 1.0, heavy: 1.25 },
  water: { none: 0.75, supplemental: 1.0, drip: 1.15 },
  curve: { 0:0, 1:0, 2:1.5, 3:4, 4:9, 5:15, 6:22, 7:28, 8:33 },
  mature: 36,
  spacing: { trees_per_ha_target: 400, high: 900, low: 140 }
};

/* Harvest spread used for the county harvest-window chart */
PM.HARVEST_WINDOW = [
  ["Jun", 0.05], ["Jul", 0.15], ["Aug", 0.30], ["Sep", 0.30], ["Oct", 0.15], ["Nov", 0.05]
];

/* Spray programme, driven by each orchard's reported flowering date */
PM.SPRAY_STAGES = [
  { key:"s0", day:0,   title:"Flowering starts",
    body:"Log the date. No insecticide while flowers are open — bees are working the orchard. Foliar zinc and boron support fruit set." },
  { key:"s1", day:12,  title:"Petal fall",
    body:"Scout leaves and young fruit. A protective fungicide is justified only in wet conditions. Full protective equipment." },
  { key:"s2", day:25,  title:"Fruit set",
    body:"Hang fruit fly traps. Scout for false codling moth and thrips before deciding to spray anything." },
  { key:"s3", day:50,  title:"Fruit sizing",
    body:"Bait for fruit fly if trap counts rise. Calcium foliar for rind quality. Water stress now causes fruit drop — irrigate if you can." },
  { key:"s4", day:85,  title:"Mid-season",
    body:"Check undersides of leaves for mites and scale. Horticultural oil where pressure is real." },
  { key:"s5", day:130, title:"Pre-harvest",
    body:"Stop spraying in line with each product's pre-harvest interval. Record the last application date for traceability." },
  { key:"s6", day:170, title:"Harvest and report",
    body:"Count fruit on sample trees, confirm the forecast, and post expected volume to the buyer portal." }
];
