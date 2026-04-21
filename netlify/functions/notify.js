/**
 * Clinlog e-mail notifikationer — Netlify Scheduled Function
 * Kører dagligt kl. 07:00 UTC (= 09:00 CEST).
 *
 * Kræver følgende env-vars i Netlify dashboard:
 *   SUPABASE_SERVICE_KEY  — Supabase service role key (Settings → API → service_role)
 *   RESEND_API_KEY        — Resend API key (resend.com → gratis tier: 100 mails/dag)
 *
 * Logik:
 *   - notification_frequency = 'daily'   → send hver dag
 *   - notification_frequency = 'weekly'  → send kun om fredagen (dayOfWeek === 5)
 *   - notification_frequency = 'monthly' → send kun sidst i måneden
 */

const { schedule } = require('@netlify/functions');

const SUPABASE_URL = 'https://rcrwqyctpjltnofxssmy.supabase.co';
const FROM_EMAIL   = 'Clinlog <notifications@clinlog.dk>';
const SITE_URL     = 'https://clinlog.dk';

exports.handler = schedule('0 7 * * *', async () => {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY  = process.env.RESEND_API_KEY;

  if (!SERVICE_KEY || !RESEND_KEY) {
    console.warn('[notify] SUPABASE_SERVICE_KEY eller RESEND_API_KEY mangler — notifikationer deaktiveret.');
    return { statusCode: 200, body: 'skipped: missing env vars' };
  }

  const now            = new Date();
  const dayOfWeek      = now.getDay(); // 0=Søn … 5=Fre
  const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isLastDayOfMonth = now.getDate() === daysInMonth;

  const headers = {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };

  try {
    // 1. Hent alle profiles med notification_frequency != 'none'
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,notification_frequency&notification_frequency=neq.none`,
      { headers }
    );
    const profiles = await profRes.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      console.log('[notify] Ingen profiler med aktive notifikationer.');
      return { statusCode: 200 };
    }

    let sent = 0;
    for (const profile of profiles) {
      const freq = profile.notification_frequency;
      if (freq === 'weekly'  && dayOfWeek !== 5)      continue;
      if (freq === 'monthly' && !isLastDayOfMonth)    continue;

      // 2. Find brugerens abonnerede specialer
      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${profile.id}&select=specialty`,
        { headers }
      );
      const subs = await subRes.json();
      if (!Array.isArray(subs) || subs.length === 0) continue;
      const specialties = subs.map(s => s.specialty).filter(Boolean);

      // 3. Bestem tidsperiode
      const since = new Date(now);
      if (freq === 'daily')        since.setDate(since.getDate() - 1);
      else if (freq === 'weekly')  since.setDate(since.getDate() - 7);
      else                         since.setMonth(since.getMonth() - 1);

      // 4. Hent nye noter i abonnerede specialer
      const catFilter = specialties.map(s => `category.eq.${encodeURIComponent(s)}`).join(',');
      const notesRes  = await fetch(
        `${SUPABASE_URL}/rest/v1/noter?select=id,title,category,created_at&or=(${catFilter})&created_at=gte.${since.toISOString()}&order=created_at.desc&limit=10`,
        { headers }
      );
      const notes = await notesRes.json();
      if (!Array.isArray(notes) || notes.length === 0) continue;

      // 5. Hent brugerens e-mail via auth admin API
      const userRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${profile.id}`, { headers });
      const userData = await userRes.json();
      const email    = userData?.email;
      if (!email) continue;

      // 6. Byg og send e-mail via Resend
      const periodLabel = freq === 'daily' ? 'i dag' : freq === 'weekly' ? 'denne uge' : 'denne måned';
      const noteRows    = notes.map(n =>
        `<tr>
          <td style="padding:.6rem 0;border-bottom:1px solid #1a2740">
            <a href="${SITE_URL}" style="color:#38bdf8;text-decoration:none;font-weight:600">${esc(n.title || 'Uden titel')}</a>
            <span style="color:#8a9ab5;font-size:.85rem;margin-left:.5rem">${esc(n.category || '')}</span>
          </td>
        </tr>`
      ).join('');

      const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#0b1120;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid rgba(14,165,197,0.2)">
    <div style="background:#0ea5c5;height:4px"></div>
    <div style="padding:32px">
      <div style="font-size:1.4rem;font-weight:700;color:#f0f4f8;margin-bottom:.25rem">
        ${notes.length} nye kliniske cases
      </div>
      <div style="color:#8a9ab5;font-size:.875rem;margin-bottom:1.75rem">
        Nye noter ${periodLabel} i dine abonnerede specialer: ${specialties.join(', ')}
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${noteRows}
      </table>
      <div style="margin-top:1.75rem">
        <a href="${SITE_URL}" style="background:#0ea5c5;color:#fff;text-decoration:none;padding:.65rem 1.4rem;border-radius:8px;font-weight:600;font-size:.9rem;display:inline-block">
          Se alle cases på Clinlog →
        </a>
      </div>
    </div>
    <div style="padding:1rem 2rem;background:rgba(0,0,0,0.2);border-top:1px solid rgba(14,165,197,0.1)">
      <p style="margin:0;font-size:.78rem;color:#8a9ab5">
        Du modtager denne mail fordi du abonnerer på specialer på
        <a href="${SITE_URL}" style="color:#38bdf8">${SITE_URL}</a>.
        Administrér dine abonnementer under Indstillinger i portalen.
      </p>
    </div>
  </div>
</body>
</html>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      email,
          subject: `${notes.length} nye kliniske cases ${periodLabel} — Clinlog`,
          html,
        }),
      });
      sent++;
      console.log(`[notify] Sendt til ${email} (${freq}, ${notes.length} noter)`);
    }

    console.log(`[notify] Færdig. ${sent} mails sendt.`);
    return { statusCode: 200, body: `sent:${sent}` };
  } catch (err) {
    console.error('[notify] Fejl:', err);
    return { statusCode: 500, body: err.message };
  }
});

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
