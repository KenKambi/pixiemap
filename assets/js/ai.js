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
    let serverError = null;

    // 1. serverless — the photo is downscaled first, because a raw phone
    //    picture is several megabytes and base64 makes it a third bigger again
    try {
      const image = file ? await shrink(file) : null;
      const res = await fetch(PM.CONFIG.api.diagnose, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ description, image, ward })
      });
      const data = await res.json().catch(() => ({}));
      if(res.ok && data.result) return { ...parseJSON(data.result), via:"serverless", model:data.model };
      serverError = data.error || ("HTTP " + res.status);
      if(data.tried) console.warn("diagnose attempts:", data.tried);
    } catch(e){
      serverError = (e && e.message) || "network error";
    }

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
    return { offline:true, error: serverError };
  }

  /* downscale to at most 1024 px on the long edge, JPEG quality 0.8 */
  function shrink(file, max){
    max = max || 1024;
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL("image/jpeg", 0.8)); }
        catch(e){ toDataURL(file).then(resolve); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); toDataURL(file).then(resolve); };
      img.src = url;
    });
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

  PM.ai = { chat, diagnose, md, shrink };
})();
