const SUPABASE_URL      = 'https://rcrwqyctpjltnofxssmy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcndxeWN0cGpsdG5vZnhzc215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQzODgsImV4cCI6MjA5MDQ2MDM4OH0.qP_fUOe3ucAojfCoHuis8-Mc91rqG6zPocyEbfLaY54';

// Streng RFC 5321-kompatibel e-mail regex — max 254 tegn, ingen scripts
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Simpel in-memory rate-limit (nulstilles ved Netlify function restart)
const ipAttempts = new Map();
const RATE_LIMIT  = 3;          // max tilmeldinger per IP
const RATE_WINDOW = 10 * 60 * 1000; // 10 minutter

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > RATE_WINDOW) {
    ipAttempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Rate-limit per IP
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'For mange forsøg. Prøv igen om lidt.' })
    };
  }

  // Parse body
  let email;
  try {
    ({ email } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldigt format' }) };
  }

  // Server-side validering
  if (typeof email !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig e-mailadresse' }) };
  }
  email = email.trim().toLowerCase().slice(0, 254);
  if (!EMAIL_REGEX.test(email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ugyldig e-mailadresse' })
    };
  }

  // Gem i Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email, signed_up_at: new Date().toISOString() })
    });

    if (res.ok || res.status === 201) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    }
    if (res.status === 409 || res.status === 422) {
      return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duplicate: true }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Serverfejl' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
