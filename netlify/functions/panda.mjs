// Panda: the Landing There trip assistant.
// Netlify Function (v2). Calls the Anthropic Messages API with the web search tool,
// so answers use current information and cite sources. The API key stays on the server.
//
// Required env var:  ANTHROPIC_API_KEY
// Optional env vars: PANDA_MODEL (default below), PANDA_MAX_SEARCHES (default 3)

const MODEL = process.env.PANDA_MODEL || 'claude-haiku-4-5-20251001';
const MAX_SEARCHES = Math.min(parseInt(process.env.PANDA_MAX_SEARCHES || '3', 10) || 3, 5);
const MAX_TOKENS = 900;
const LANGS = { en:'English', fr:'French', es:'Spanish', de:'German', pt:'Portuguese', zh:'Simplified Chinese' };

// Best-effort per-IP throttle (memory resets when the function instance recycles).
const hits = new Map();
function limited(ip){
  const now = Date.now(), windowMs = 10 * 60 * 1000, max = 20;
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '');

export function sanitize(body){
  if (!body || typeof body !== 'object') return null;
  const question = str(body.question, 400);
  if (!question) return null;
  const t = body.trip && typeof body.trip === 'object' ? body.trip : {};
  const trip = {
    destination: str(t.destination, 80), code: str(t.code, 3), region: str(t.region, 30),
    purpose: str(t.purpose, 20), stay: str(t.stay, 40), stayDays: Number.isFinite(t.stayDays) ? Math.round(t.stayDays) : null,
    nationality: str(t.nationality, 60), nationalityCode: str(t.nationalityCode, 3),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(t.startDate || '') ? t.startDate : '',
    cities: Array.isArray(t.cities) ? t.cities.slice(0, 8).map(c => str(c, 60)).filter(Boolean) : [],
    partner: str(t.partner, 60), progress: str(t.progress, 20), notes: str(t.notes, 4000)
  };
  if (!trip.destination) return null;
  const history = [];
  for (const m of (Array.isArray(body.history) ? body.history.slice(-8) : [])){
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = str(m.content, 1500);
    if (!content) continue;
    const last = history[history.length - 1];
    if (last && last.role === m.role) last.content += '\n' + content; else history.push({ role: m.role, content });
  }
  while (history.length && history[0].role !== 'user') history.shift();
  if (history.length && history[history.length - 1].role === 'user') history.pop();
  const lang = LANGS[body.lang] ? body.lang : 'en';
  return { question, trip, history, lang };
}

export function buildSystem({ trip, lang }){
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `You are Panda, the trip assistant inside Landing There, an app that helps people, and the organizations that relocate them, prepare to travel, study, work or move abroad.`,
    `Today's date is ${today}.`,
    ``,
    `How to answer:`,
    `- Answer the person's exact question using their trip details below. Give the direct answer first, then only the steps or caveats that matter. No filler, no restating the question.`,
    `- For anything that depends on current facts (visas, entry rules, fees, processing times, laws, prices, opening hours), use web search and prefer official government, embassy, airline or institutional sources. Never rely on memory for these.`,
    `- If sources conflict, or you could not verify something, say so plainly and point to the official source. Never invent rules, fees, deadlines or URLs.`,
    `- The trip notes below come from the app's own guide. Treat them as a starting point: if a search contradicts them, trust the current official source and say what changed.`,
    `- Ask at most one clarifying question, and only if the answer would materially change.`,
    `- You are not a lawyer or immigration adviser. For visa decisions, end with where to confirm (the official site or the embassy).`,
    `- Keep answers under about 180 words unless the person asks for detail. Short paragraphs or a tight list. Plain text with **bold** for key terms is fine.`,
    `- Reply in ${LANGS[lang]}.`,
    ``,
    `Trip details:`,
    `- Destination: ${trip.destination}${trip.code ? ` (${trip.code})` : ''}${trip.region ? `, ${trip.region}` : ''}`,
    `- Passport / nationality: ${trip.nationality || 'not provided'}`,
    `- Purpose: ${trip.purpose || 'not provided'}; length of stay: ${trip.stay || 'not provided'}${trip.stayDays ? ` (about ${trip.stayDays} days)` : ''}`,
    `- Departure date: ${trip.startDate || 'not set'}`,
    `- Cities: ${trip.cities.length ? trip.cities.join(', ') : 'none chosen'}`,
    `- Checklist progress: ${trip.progress || 'unknown'}`,
    trip.partner ? `- This checklist was prepared for the person by ${trip.partner}.` : '',
    trip.notes ? `\nApp guide notes:\n${trip.notes}` : ''
  ];
  return lines.filter(l => l !== '').join('\n');
}

export function extract(content){
  let answer = '';
  const cited = new Map(), found = new Map();
  for (const b of content || []){
    if (b.type === 'text'){
      answer += b.text || '';
      for (const c of b.citations || []) if (c.url && !cited.has(c.url)) cited.set(c.url, { url: c.url, title: c.title || '' });
    } else if (b.type === 'web_search_tool_result' && Array.isArray(b.content)){
      for (const r of b.content) if (r.type === 'web_search_result' && r.url && !found.has(r.url)) found.set(r.url, { url: r.url, title: r.title || '' });
    }
  }
  const sources = [...(cited.size ? cited.values() : [...found.values()].slice(0, 4))].slice(0, 6);
  return { answer: answer.trim(), sources, searched: found.size > 0 };
}

export default async (req, context) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return json({ ok: true, live: !!key });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!key) return json({ error: 'not_configured' }, 503);

  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);

  let body;
  try { body = await req.json(); } catch (e){ return json({ error: 'bad_request' }, 400); }
  const p = sanitize(body);
  if (!p) return json({ error: 'bad_request' }, 400);

  const messages = [...p.history, { role: 'user', content: p.question }];
  const system = buildSystem(p);
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }];

  try {
    let data = null, merged = [];
    for (let i = 0; i < 3; i++){
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages, tools })
      });
      if (!res.ok){
        const detail = await res.text().catch(() => '');
        console.error('Anthropic error', res.status, detail.slice(0, 300));
        return json({ error: 'upstream', status: res.status }, 502);
      }
      data = await res.json();
      merged = merged.concat(data.content || []);
      if (data.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: data.content });
    }
    const out = extract(merged);
    if (!out.answer) return json({ error: 'empty' }, 502);
    return json(out);
  } catch (e){
    console.error('Panda failure', e && e.message);
    return json({ error: 'failed' }, 502);
  }
};

export const config = { path: '/api/panda' };
