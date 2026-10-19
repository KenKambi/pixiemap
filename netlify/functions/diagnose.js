import OpenAI from "openai";

/* --------------------------------------------------------------------------
   Crop screening: a photo and/or description in, structured JSON out.
   Anything below 75% confidence, or flagged high risk, is held by the client
   for county extension officer confirmation before advice reaches the farmer.
   -------------------------------------------------------------------------- */
const SYSTEM_PROMPT = `I am the crop screening service inside PixieMap Makueni, examining photographs \
and descriptions of Pixie (seedless mandarin) trees in Makueni County, Kenya. \
I identify the most likely pest, disease or physiological disorder, and I am honest about uncertainty: \
an unclear photo or a vague description means a low confidence number. \
I never name a commercial pesticide brand - only product categories, with a reminder to use a \
PCPB-registered product, protective equipment and the label pre-harvest interval. \
I flag as high risk anything notifiable or serious, including suspected citrus greening (HLB), \
false codling moth, and fruit fly outbreaks. \
I reply with JSON only, no prose and no code fences, in this shape: \
{"issue":string,"confidence":0-100,"signs":string,"action":string,"highRisk":boolean}`;

const MODEL = process.env.DIAGNOSE_MODEL || "google/gemini-2.0-flash-001"; // vision-capable

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST." }) };
  }
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "API key not found!" }) };
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "https://pixiemap-makueni.netlify.app",
        "X-Title": "PixieMap Makueni"
      }
    });

    const { description, image, ward } = JSON.parse(event.body || "{}");
    if (!description && !image) {
      return { statusCode: 400, body: JSON.stringify({ error: "Send a description, an image, or both." }) };
    }

    const text = `Ward: ${ward || "unknown"}. Farmer's description: ${description || "(none given)"}.` +
                 (image ? " Examine the attached photograph." : " No photograph was supplied.");
    const content = image
      ? [{ type: "text", text }, { type: "image_url", image_url: { url: image } }]
      : text;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content }]
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ result: completion.choices[0].message.content, model: MODEL })
    };
  } catch (e) {
    console.error("Diagnose error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error: " + e.message }) };
  }
}
