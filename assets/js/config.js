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

/* --------------------------------------------------------------------------
   Spray and crop-protection programme: one full Pixie season, about 7-8
   months from the first open flower to harvest, in four phases.
   Every stage is driven by the orchard's own reported flowering date.
   Products are named by ACTIVE INGREDIENT / CHEMICAL GROUP only - the farmer
   must use a product registered by the Pest Control Products Board (PCPB)
   for citrus, follow the label rate, and observe the pre-harvest interval.
   Content to be validated by Makueni County agricultural officers before use.
   -------------------------------------------------------------------------- */
PM.SPRAY_PHASES = [
  { id:"p1", name:"Phase 1 · Flowering",            window:"Month 1",      colour:"#129139" },
  { id:"p2", name:"Phase 2 · Fruit set and sizing", window:"Months 2-3",   colour:"#124491" },
  { id:"p3", name:"Phase 3 · Fruit development",    window:"Months 4-5",   colour:"#C4600E" },
  { id:"p4", name:"Phase 4 · Maturity and harvest", window:"Months 6-8",   colour:"#6B3FA0" }
];

PM.SPRAY_STAGES = [
  { key:"s1", phase:"p1", day:0, title:"Flower bud swell and first open flowers",
    body:"Record the date the first flowers open - the whole programme is timed from here. Do not apply any insecticide while flowers are open: bees are pollinating and the crop depends on them. Irrigate lightly and evenly; water stress now means fewer fruits set.",
    chemicals:["Foliar boron (solubor-type) at low rate - supports pollen tube growth and fruit set","Foliar zinc and manganese chelate - corrects the deficiencies common on Makueni sandy loams","No insecticide. No systemic fungicide unless disease is already visible"],
    safety:"Spray early morning or late evening when bees are not foraging. Full PPE: overalls, gloves, goggles, respirator." },

  { key:"s2", phase:"p1", day:14, title:"Petal fall (about 75% of petals down)",
    body:"The first safe spray window of the season. Scout 10 trees across the block for thrips scarring on young fruitlets and for brown rot on fallen petals. Only spray what you actually find.",
    chemicals:["Protectant fungicide - copper hydroxide or copper oxychloride, or a mancozeb-group product, if the season is wet","Thrips, only above threshold - spinosad group (Group 5) is the softest option on beneficials","Foliar calcium nitrate - starts building rind strength"],
    safety:"Bees may still be working late flowers; wait until petal fall is near complete. Note the product and date in your spray record." },

  { key:"s3", phase:"p2", day:30, title:"Fruit set and marble stage",
    body:"Fruitlets are pea to marble size and natural fruit drop begins - some drop is normal. Hang fruit fly traps now, before the first flights, and start weekly trap counts. Scout for false codling moth entry holes at the stem end.",
    chemicals:["Fruit fly traps - methyl eugenol lures for males plus protein bait stations around the block edge","Protein bait spray (spinosad-based) as spot sprays on the tree skirt, not full cover, if trap counts rise","Foliar NPK high in phosphorus and calcium to hold the set fruit"],
    safety:"Bait sprays are spot applications - never spray the fruit itself with bait. Keep traps away from where children play." },

  { key:"s4", phase:"p2", day:55, title:"Cell division and early fruit sizing",
    body:"This is the stage that decides fruit size, and it is the most water-sensitive period of the whole season. Check the underside of leaves for red and rust mites, and for aphid colonies on new flush.",
    chemicals:["Mites, above threshold - abamectin group (Group 6) or wettable sulphur in cooler weather","Aphids and leaf miner on new flush - a soft Group 4 or horticultural oil, rotated to avoid resistance","Calcium nitrate and potassium foliar; continue soil fertigation if you irrigate"],
    safety:"Do not apply sulphur and horticultural oil within three weeks of each other, and not above 30 C. Rotate chemical groups every season." },

  { key:"s5", phase:"p3", day:95, title:"Mid-season scale, mealybug and canopy health",
    body:"Fruit is now developing steadily. Inspect branches and the fruit calyx for scale insects, mealybug and sooty mould. Remove any water shoots and open the canopy so spray reaches the inside of the tree.",
    chemicals:["Scale and mealybug - horticultural mineral oil at summer rate, or a Group 23 insect growth regulator","Fungal leaf and fruit spot - copper-based protectant, especially after a wet spell","Potassium sulphate foliar - the main driver of fruit size and sugar"],
    safety:"Mineral oil must not be mixed with copper or sulphur. Spray to the point of run-off but not beyond; drift wastes product and money." },

  { key:"s6", phase:"p3", day:130, title:"Pre-colour-break protection",
    body:"The last window for systemic products. From here on every application must be counted back from your expected harvest date so the pre-harvest interval is cleared. Keep fruit fly bait stations serviced - pressure peaks as the fruit sweetens.",
    chemicals:["Last systemic insecticide of the season, only if false codling moth or fruit fly counts justify it","Continue protein bait stations weekly","Potassium and magnesium foliar; reduce nitrogen from now on - late nitrogen keeps the rind green"],
    safety:"Write your planned harvest date on the spray record and subtract each product's pre-harvest interval before you mix anything." },

  { key:"s7", phase:"p4", day:170, title:"Colour break",
    body:"The rind starts turning from green to orange. Stop all systemic sprays. Keep monitoring traps and remove any fallen or stung fruit from the orchard floor - leaving it there breeds the next generation of fruit flies.",
    chemicals:["No systemic insecticides","Sanitation only: collect and bury or solarise fallen fruit","Light potassium foliar is still acceptable if the label allows it at this stage"],
    safety:"Any product applied now must clear its pre-harvest interval before picking, or the fruit cannot be sold to a formal buyer." },

  { key:"s8", phase:"p4", day:205, title:"Pre-harvest check and maturity testing",
    body:"Sample 20 fruits from across the block. Check colour, juice content and the sugar-to-acid balance. Count fruit on five representative trees and update your yield forecast in PixieMap so buyers and the county see the right volume.",
    chemicals:["No sprays inside the pre-harvest interval","Clean and disinfect harvesting crates and secateurs","Confirm the last application date on every product used this season"],
    safety:"Keep the spray record - buyers, exporters and the county extension office may all ask to see it." },

  { key:"s9", phase:"p4", day:235, title:"Harvest, then post-harvest orchard reset",
    body:"Harvest in the cool of the morning, clip rather than pull the fruit, and grade before transport. Once the crop is off, prune out dead and crossing wood, and feed the trees for next season's flowers.",
    chemicals:["Post-harvest sanitation spray - copper-based, applied after pruning to protect the cuts","Soil application of compost or manure plus a balanced NPK for recovery","Paint or seal large pruning wounds"],
    safety:"Burn or bury pruned diseased material; do not leave it between the rows. Record this season's actual harvest against the forecast." }
];
