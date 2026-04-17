# 01 - Uautentificeret Claude-proxy

## Sværhedsgrad
Kritisk

## Status
**Delvist fikset 2026-04-17** — origin-check og Supabase session-verificering er tilføjet.
Mangler stadig: model-allowlist, server-side max_tokens cap, per-user daglig kvote.

## Problem (normalt sprog)
Claude-proxyen på `/.netlify/functions/claude` videresender kald til Anthropic API'en med din nøgle. Uden begrænsninger kan enhver person på internettet sende kald med dyre modeller og høje token-grænser i et loop og tømme din Anthropic-konto for penge. En angriber behøver ikke dit brugernavn eller password — de skal bare kende URL'en.

## Analyse af nuværende kode

**`netlify/functions/claude.js` (efter dagens delvise fix):**
```javascript
// ✅ Allerede implementeret:
const ALLOWED_ORIGINS = ['https://clinlog.dk', 'https://www.clinlog.dk', 'https://clinlog.netlify.app'];
// tjekker origin header
// verificerer Supabase Bearer token mod /auth/v1/user

// ❌ Mangler stadig:
const body = JSON.parse(event.body);
// body.model og body.max_tokens bruges direkte fra klientens request
// ingen whitelist på model, ingen cap på max_tokens
```

Klienten sender f.eks.:
```javascript
body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, messages: [...] })
```
Proxyen videresender dette ukritisk — en autentificeret bruger kan sende `model: 'claude-opus-4-6'` og `max_tokens: 100000`.

## Trusselsmodel
**Hvem:** En registreret bruger (eller nogen der har stjålet en session-token).
**Hvad de kan opnå:** Køre tusindvis af dyre API-kald til din regning.

Angrebsscenarie:
1. Angriber opretter konto på clinlog.dk (gratis)
2. Logger ind og kopierer session-token fra localStorage
3. Sender script der kalder `/.netlify/functions/claude` i loop med `claude-opus-4-6` og `max_tokens: 100000`
4. Din Anthropic-faktura eksploderer

## Bedste løsning
Server-side: 
- **Model-allowlist** — tillad kun de modeller appen faktisk bruger
- **max_tokens cap** — ignorer klientens værdi, sæt altid serveren til max 1500
- **Per-user daglig kvote** — tæl tokens i Supabase-tabel, afvis når grænse nås
- **Anthropic hard billing cap** — sæt dette i Anthropic-dashboardet nu (uafhængigt af kode)

## Konkret implementering

### Trin 1: Sæt billing cap hos Anthropic
Gå til console.anthropic.com → Settings → Billing → "Set a monthly spend limit".
Sæt et beløb du er komfortabel med (f.eks. $20/måned).

### Trin 2: Opret kvote-tabel i Supabase
Kør i Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS api_usage (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  tokens_used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Kun ejeren kan se/opdatere sin egen række
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own usage" ON api_usage
  FOR ALL USING (auth.uid() = user_id);
```

### Trin 3: Opdater claude.js
```javascript
const SUPABASE_URL      = 'https://rcrwqyctpjltnofxssmy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '...';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // tilføj i Netlify env vars

const ALLOWED_ORIGINS = [
  'https://clinlog.dk',
  'https://www.clinlog.dk',
  'https://clinlog.netlify.app',
];

// Kun disse modeller må bruges
const ALLOWED_MODELS = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

const MAX_TOKENS_CAP   = 1500;   // server-side maksimum
const DAILY_TOKEN_LIMIT = 50000; // per bruger per dag

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Origin check
  const origin = (event.headers.origin || '').trim();
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Auth check
  const authHeader = (event.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const token = authHeader.slice(7);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
  });
  if (!userRes.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session' }) };
  }
  const userData = await userRes.json();
  const userId = userData.id;

  // Parse body og sanitér
  const body = JSON.parse(event.body);

  // Model allowlist
  if (!ALLOWED_MODELS.includes(body.model)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Model not allowed' }) };
  }

  // Cap max_tokens server-side — ignorer klientens værdi
  body.max_tokens = Math.min(body.max_tokens || 1000, MAX_TOKENS_CAP);

  // Tjek daglig kvote
  const usageRes = await fetch(
    `${SUPABASE_URL}/rest/v1/api_usage?user_id=eq.${userId}&date=eq.${new Date().toISOString().slice(0,10)}&select=tokens_used`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const usageData = await usageRes.json();
  const tokensUsed = usageData[0]?.tokens_used || 0;
  if (tokensUsed >= DAILY_TOKEN_LIMIT) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Daily token limit reached' }) };
  }

  // Kald Anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();

  // Opdater token-forbrug
  const tokensConsumed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  if (tokensConsumed > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/api_usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: userId,
        date: new Date().toISOString().slice(0, 10),
        tokens_used: tokensUsed + tokensConsumed
      })
    });
  }

  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
```

### Trin 4: Tilføj SUPABASE_SERVICE_KEY i Netlify
Netlify Dashboard → Site settings → Environment variables → Add:
- Key: `SUPABASE_SERVICE_KEY`
- Value: Find i Supabase Dashboard → Settings → API → "service_role secret"

**OBS:** Service key må aldrig ligge i klientkoden — kun i Netlify env vars.

## Test / verifikation
```bash
# Test 1: Bør returnere 400 (ikke-tilladt model)
curl -X POST https://clinlog.netlify.app/.netlify/functions/claude \
  -H "Content-Type: application/json" \
  -H "Origin: https://clinlog.dk" \
  -H "Authorization: Bearer DIN_GYLDIG_TOKEN" \
  -d '{"model":"claude-opus-4-6","max_tokens":100000,"messages":[{"role":"user","content":"test"}]}'
# Forventet: {"error":"Model not allowed"}

# Test 2: Bør returnere 401 (ingen token)
curl -X POST https://clinlog.netlify.app/.netlify/functions/claude \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
# Forventet: {"error":"Unauthorized"}
```

## Afhængigheder / rækkefølge
- Kræver Supabase `api_usage`-tabel oprettet først
- Kræver `SUPABASE_SERVICE_KEY` tilføjet i Netlify env vars
- Ingen breaking changes for eksisterende brugere

## Estimeret tid
45 minutter (inkl. Supabase tabel + Netlify env var opsætning)
