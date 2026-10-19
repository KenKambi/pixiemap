import OpenAI from "openai";

/* --------------------------------------------------------------------------
   PixieBot — the farmer assistant behind PixieMap Makueni.
   The key stays on the server; the browser only ever sees the answer.
   -------------------------------------------------------------------------- */
const SYSTEM_PROMPT = `I am PixieBot, the farm assistant inside PixieMap Makueni, \
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

const MODEL = process.env.PIXIEBOT_MODEL || "meta-llama/llama-3.1-8b-instruct";

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

    const { messages, question } = JSON.parse(event.body || "{}");
    let turns = Array.isArray(messages) ? messages : null;
    if (!turns && typeof question === "string") turns = [{ role: "user", content: question }];
    if (!turns || !turns.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "Send { messages: [{role, content}] } or { question }." }) };
    }

    // keep the context small for cost and latency on a low-bandwidth deployment
    turns = turns
      .filter(m => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
      .slice(-10);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 600,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...turns]
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ result: completion.choices[0].message.content, model: MODEL })
    };
  } catch (e) {
    console.error("PixieBot error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error: " + e.message }) };
  }
}
