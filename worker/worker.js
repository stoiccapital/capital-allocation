// Capital Allocation leaderboard — Cloudflare Worker
// GET  /scores → top 100
// POST /score  → add a score { name, nw, cagr, bust, year } → returns { rank }

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/scores') {
      const scores = (await env.SCORES.get('top', 'json')) || [];
      return json(scores, cors);
    }

    if (request.method === 'POST' && url.pathname === '/score') {
      let body;
      try { body = await request.json(); } catch { return bad('invalid json', cors); }

      const name = String(body.name || '').trim().slice(0, 24);
      const nw = Number(body.nw);
      if (!name) return bad('name required', cors);
      if (!isFinite(nw)) return bad('nw must be a number', cors);

      const entry = {
        name,
        nw,
        cagr: Number(body.cagr) || 0,
        bust: !!body.bust,
        year: Number(body.year) || 0,
        ts: Date.now(),
      };

      // Names are unique (case-insensitive). Keep best net worth per name.
      const scores = (await env.SCORES.get('top', 'json')) || [];
      const key = entry.name.toLowerCase();
      const existingIdx = scores.findIndex(s => (s.name || '').toLowerCase() === key);
      let kept = true;
      if (existingIdx >= 0) {
        if (entry.nw > scores[existingIdx].nw) {
          scores[existingIdx] = entry;  // better score — replace
        } else {
          kept = false;  // existing is better — ignore new submission
        }
      } else {
        scores.push(entry);
      }
      scores.sort((a, b) => b.nw - a.nw);
      const top = scores.slice(0, 100);
      await env.SCORES.put('top', JSON.stringify(top));

      const rank = top.findIndex(s => (s.name || '').toLowerCase() === key) + 1;
      return json({ rank, inTop100: rank > 0, top10: top.slice(0, 10), kept }, cors);
    }

    return new Response('Capital Allocation Scores API', { headers: cors });
  },
};

function json(data, cors) {
  return new Response(JSON.stringify(data), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
function bad(msg, cors) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
