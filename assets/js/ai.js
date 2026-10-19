/* ==========================================================================
   PixieMap Makueni — AI client
   Order of attempts:
     1. Netlify Function  (/.netlify/functions/pixiebot | /diagnose)
        -> OpenRouter, server side, API key never reaches the browser
     2. Host model bridge (window.claude.use("sample")) when the app is
        running inside a sandboxed preview with no backend
     3. Honest offline notice
   ========================================================================== */
window.PM = window.PM || {};
(function(){
  let bridge = null, bridgeTried = false;

  async function getBridge(){
    if(bridgeTried) return bridge;
    bridgeTried = true;
    try { bridge = (window.claude && claude.use) ? await claude.use("sample") : null; }
    catch(e){ bridge = null; }
    return bridge;
  }

  async function postJSON(url, body){
    const res = await fetch(url, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  /* ---------- chat ---------- */
  async function chat(messages, onText){
    // 1. serverless
    try {
      const data = await postJSON(PM.CONFIG.api.chat, { messages });
      if(data && data.result) return { text: data.result, via: "serverless" };
      if(data && data.error) throw new Error(data.error);
    } catch(e){ /* fall through */ }

    // 2. sandbox bridge
    const b = await getBridge();
    if(b){
      const payload = [
        { role:"user", content: PM.SYSTEM_PROMPT },
        { role:"assistant", content:"Understood. I answer only Pixie and citrus questions." },
        ...messages
      ];
      const r = await b(payload, { modelTier:"quick", onText: onText ? ({text}) => onText(text) : undefined });
      return { text: r.text, via: "bridge" };
    }

    // 3. offline
    return { text: "PixieBot needs its backend to answer. Run `netlify dev` locally, or deploy with an OPENROUTER_API_KEY set, and the same assistant will reply here.", via:"offline" };
  }

  /* ---------- crop diagnosis ---------- */
  async function diagnose({ description, file, ward }){
    // 1. serverless (image sent as base64 data URL)
    try {
      const image = file ? await toDataURL(file) : null;
      const data = await postJSON(PM.CONFIG.api.diagnose, { description, image, ward });
      if(data && data.result) return { ...parseJSON(data.result), via:"serverless" };
      if(data && data.error) throw new Error(data.error);
    } catch(e){ /* fall through */ }

    // 2. sandbox bridge
    const b = await getBridge();
    if(b){
      const prompt = PM.DIAGNOSIS_PROMPT + "\n\n" +
        (file ? "Examine the photograph. " : "Use the description only. ") +
        "Farmer's description: " + (description || "(none given)") + ". Ward: " + (ward || "unknown") + ".";
      const opts = { modelTier:"default" };
      if(file){
        const lim = await b.limits().catch(() => ({}));
        if(lim && lim.images) opts.images = [file];
      }
      const r = await b.json(prompt, opts);
      return { ...r, via:"bridge" };
    }
    return { offline:true };
  }

  const toDataURL = file => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
  function parseJSON(txt){
    try { return JSON.parse(String(txt).replace(/```json|```/g, "").trim()); }
    catch(e){ return { issue:"Could not read the model response", confidence:0, signs:String(txt).slice(0,200), action:"Send the case to an extension officer.", highRisk:true }; }
  }

  /* minimal markdown -> html for chat bubbles (bold, italics, code, lists, links) */
  function md(src){
    const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    return esc(src)
      .replace(/^### (.*)$/gm, "<b>$1</b>")
      .replace(/^## (.*)$/gm, "<b>$1</b>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^[-•] (.*)$/gm, "• $1")
      .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  PM.ai = { chat, diagnose, md };
})();
