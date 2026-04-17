const SUPABASE_URL      = 'https://rcrwqyctpjltnofxssmy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcndxeWN0cGpsdG5vZnhzc215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQzODgsImV4cCI6MjA5MDQ2MDM4OH0.qP_fUOe3ucAojfCoHuis8-Mc91rqG6zPocyEbfLaY54';

const ALLOWED_ORIGINS = [
  'https://clinlog.dk',
  'https://www.clinlog.dk',
  'https://clinlog.netlify.app',
];

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

  // ── 3. Forward request to Anthropic ─────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }

  try {
    const body = JSON.parse(event.body);
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
