import OpenAI from "openai";

/* --------------------------------------------------------------------------
   Crop screening: a photo and/or description in, structured JSON out.
   Anything below 75% confidence, or flagged high risk, is held by the client
   for county extension officer confirmation before advice reaches the farmer.

   Robustness, because a demo must not fail in front of judges:
     - a list of vision models is tried in order, so one retired or
       unavailable model id does not break the feature
     - if a provider rejects response_format (JSON mode), the same model is
       retried without it and the JSON is parsed out of the text
     - every failure is reported back with the real reason
   -------------------------------------------------------------------------- */
const SYSTEM_PROMPT = `I am the crop screening service inside PixieMap Makueni, examining photographs \
and descriptions of Pixie (seedless mandarin) trees in Makueni County, Kenya. \
I identify the most likely pest, disease or physiological disorder, and I am honest about uncertainty: \
an unclear photo or a vague description means a low confidence number. \
I never name a commercial pesticide brand - only product categories and chemical groups, with a reminder to use a \
PCPB-registered product, protective equipment and the label pre-harvest interval. \
I flag as high risk anything notifiable or serious, including suspected citrus greening (HLB), \
false codling moth, and fruit fly outbreaks. \
I reply with JSON only, no prose and no code fences, in this shape: \
{"issue":string,"confidence":0-100,"signs":string,"action":string,"highRisk":boolean}`;

/* Override with DIAGNOSE_MODEL: one model id, or several separated by commas. */
const DEFAULT_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.0-flash-001",
  "openai/gpt-4o-mini",
  "qwen/qwen2.5-vl-72b-instruct"
];

const MAX_IMAGE_BYTES = 3500000; // Netlify caps the request body at about 6 MB

function extractJSON(text){
  if(!text) return null;
  const clean = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch(e){}
  const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
  if(a > -1 && b > a){ try { return JSON.parse(clean.slice(a, b + 1)); } catch(e){} }
  return null;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST." });

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return json(500, { error: "OPENROUTER_API_KEY is not set on this deployment." });
  }

  let description, image, ward;
  try { ({ description, image, ward } = JSON.parse(event.body || "{}")); }
  catch(e){ return json(400, { error: "Body must be JSON." }); }

  if (!description && !image) return json(400, { error: "Send a description, an image, or both." });
  if (image && image.length > MAX_IMAGE_BYTES) {
    return json(413, { error: "Photo is too large. Retake it at a lower resolution." });
  }
  if (image && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
    return json(400, { error: "Photo must be a base64 JPEG, PNG or WebP data URL." });
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    timeout: 22000,
    maxRetries: 0,
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "https://pixiemap-makueni.netlify.app",
      "X-Title": "PixieMap Makueni"
    }
  });

  const text = `Ward: ${ward || "unknown"}. Farmer's description: ${description || "(none given)"}.` +
               (image ? " Examine the attached photograph of the affected plant part."
                      : " No photograph was supplied, so rely on the description and let that show in your confidence.");
  const content = image
    ? [{ type: "text", text }, { type: "image_url", image_url: { url: image } }]
    : text;
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content }];

  const models = (process.env.DIAGNOSE_MODEL || DEFAULT_MODELS.join(","))
    .split(",").map(m => m.trim()).filter(Boolean);

  const tried = [];

  for (const model of models) {
    for (const useJsonMode of [true, false]) {
      try {
        const req = { model, temperature: 0.2, max_tokens: 600, messages };
        if (useJsonMode) req.response_format = { type: "json_object" };

        const completion = await openai.chat.completions.create(req);
        const raw = completion && completion.choices && completion.choices[0] &&
                    completion.choices[0].message && completion.choices[0].message.content;
        const parsed = extractJSON(raw);

        if (!parsed) {
          tried.push(`${model}${useJsonMode ? " (json mode)" : ""}: reply could not be parsed`);
          continue;
        }
        return json(200, { result: JSON.stringify(parsed), model, jsonMode: useJsonMode });

      } catch (e) {
        const msg = (e && (e.message || (e.error && e.error.message))) || String(e);
        tried.push(`${model}${useJsonMode ? " (json mode)" : ""}: ${msg}`);
        console.error("diagnose attempt failed:", model, useJsonMode, msg);

        // key, credit and rate problems are not fixed by trying another model
        if (/401|403|insufficient|credit|quota|rate limit/i.test(msg)) {
          return json(502, { error: msg, tried });
        }
        // a model that cannot read images is no use for this request
        if (image && /image|modality|vision|multimodal/i.test(msg)) break;
      }
    }
  }

  return json(502, {
    error: "No model returned a usable result. Check OPENROUTER_API_KEY, that the account has credit, and that DIAGNOSE_MODEL names a vision-capable model.",
    tried
  });
}
