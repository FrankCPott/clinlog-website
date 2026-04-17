const SUPABASE_URL      = 'https://rcrwqyctpjltnofxssmy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcndxeWN0cGpsdG5vZnhzc215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQzODgsImV4cCI6MjA5MDQ2MDM4OH0.qP_fUOe3ucAojfCoHuis8-Mc91rqG6zPocyEbfLaY54';

const ALLOWED_ORIGINS = [
  'https://clinlog.dk',
  'https://www.clinlog.dk',
  'https://clinlog.netlify.app',
];

const ALLOWED_MODELS = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

const MAX_TOKENS_CAP = 3000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── 1. Origin check ──────────────────────────────────────────
  const origin = (event.headers.origin || '').trim();
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn('Blocked request from origin:', origin);
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // ── 2. Require valid Supabase session token ──────────────────
  const authHeader = (event.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: missing token' }) };
  }
  const token = authHeader.slice(7);

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    if (!userRes.ok) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: invalid session' }) };
    }
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: could not verify session' }) };
  }

  // ── 3. Parse og sanitér request body ────────────────────────
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Model allowlist — bloker dyre/uønskede modeller
  if (!ALLOWED_MODELS.includes(body.model)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Model not allowed' }) };
  }

  // Server-side cap på max_tokens — ignorer klientens værdi hvis den er for høj
  body.max_tokens = Math.min(body.max_tokens || 1000, MAX_TOKENS_CAP);

  // ── 4. Forward request til Anthropic ────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }

  try {
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
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
