# Capital Allocation — Scores Worker

Minimal Cloudflare Worker that stores global leaderboard entries in Workers KV.

## One-time setup

```bash
# Install wrangler if you don't have it
npm install -g wrangler

# Login to your Cloudflare account
wrangler login

cd worker

# Create the KV namespace — copy the returned ID
wrangler kv namespace create SCORES
# → paste the "id" value into wrangler.toml

# Deploy
wrangler deploy
```

Wrangler prints the public URL on deploy, e.g.
`https://allocator-scores.yourname.workers.dev`

Paste that URL into `index.html` as `SCORES_API`.

## Endpoints

- `GET  /scores` → `[{ name, nw, cagr, bust, year, ts }, ...]` top 100 sorted by `nw` descending
- `POST /score`  → body `{ name, nw, cagr, bust, year }` → `{ rank, inTop100, top10 }`

## Free tier limits (plenty for personal use)

- 100 000 requests/day (Workers free tier)
- 1 000 writes/day · 100 000 reads/day (KV free tier)
- 1 GB storage (KV free tier)
