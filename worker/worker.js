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

    if (request.method === 'POST' && url.pathname === '/rename') {
      let body;
      try { body = await request.json(); } catch { return bad('invalid json', cors); }
      const ts = Number(body.ts);
      const newName = String(body.newName || '').trim().slice(0, 24);
      if (!ts || !newName) return bad('ts + newName required', cors);

      const scores = (await env.SCORES.get('top', 'json')) || [];
      const idx = scores.findIndex(s => s.ts === ts);
      if (idx < 0) return bad('entry not found', cors);

      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const randSuffix = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const takenByOther = (n) => scores.some((s, i) => i !== idx && (s.name || '').toLowerCase() === n.toLowerCase());
      let finalName = newName;
      let guard = 0;
      while (takenByOther(finalName) && guard++ < 20) finalName = newName + '_' + randSuffix();

      scores[idx].name = finalName;
      await env.SCORES.put('top', JSON.stringify(scores));
      return json({ ok: true, finalName, ts }, cors);
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

      // Every submission is a new entry. If the submitted name is already in use
      // (case-insensitive), append a 4-char random suffix so every entry is unique.
      const scores = (await env.SCORES.get('top', 'json')) || [];
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const randSuffix = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const taken = (n) => scores.some(s => (s.name || '').toLowerCase() === n.toLowerCase());
      let finalName = entry.name;
      let guard = 0;
      while (taken(finalName) && guard++ < 20) finalName = entry.name + '_' + randSuffix();
      entry.name = finalName;
      scores.push(entry);
      scores.sort((a, b) => b.nw - a.nw);
      const top = scores.slice(0, 100);
      await env.SCORES.put('top', JSON.stringify(top));

      const rank = top.findIndex(s => s.ts === entry.ts) + 1;
      return json({ rank, inTop100: rank > 0, top10: top.slice(0, 10), finalName }, cors);
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
