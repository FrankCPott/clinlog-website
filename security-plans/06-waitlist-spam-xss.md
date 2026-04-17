# 06 - Ventelisten kan spammes og rummer XSS-payload

## Sværhedsgrad
Medium

## Problem (normalt sprog)
Ventelistetilmeldingen på clinlog.dk accepterer hvad som helst som en gyldig e-mail — inklusiv scripts, 1200-tegn lange strenge og falske adresser. Klienten sender data direkte til Supabase uden nogen server-side validering. Det betyder at en spammer kan fylde din database med skrald, og at en angriber kan forsøge at gemme ondsindet JavaScript i din database.

## Analyse af nuværende kode

**`public/index.html` — waitlist-kald (direkte til Supabase):**
```javascript
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
```

Client-side validering:
```javascript
if (!email || !email.includes('@') || email.indexOf('.') < email.indexOf('@')) {
  // Dette er trivielt at omgå
}
```

Problemer:
1. `<script>alert('xss')</script>@test.com` passerer `includes('@')` check
2. Ingen længdebegrænsning
3. Ingen rate-limit per IP
4. Data sendes direkte til Supabase — ingen server-side filter

## Trusselsmodel
**Hvem:** Bot-netværk, spammere, sikkerhedsforskere.
**Hvad de kan opnå:**
- Fylde waitlist-tabellen med tusindvis af falske entries
- Gemme XSS-payloads i databasen (risiko hvis email nogensinde vises som HTML i et admin-panel)
- Øge din Supabase-database-størrelse unødigt

Angrebsscenarie:
1. Bot sender POST-requests i loop: `{"email": "<script>...</script>@x.com"}`
2. Supabase accepterer dem (ingen RLS-begrænsning på INSERT for anon)
3. Database fyldes med skrald på minutter

## Bedste løsning
Flyt waitlist-kald fra direkte Supabase-kald til en Netlify Function der:
1. Validerer e-mail server-side med streng regex og max 254 tegn (RFC 5321)
2. Implementerer rate-limiting per IP (max 3 forsøg per 10 minutter)
3. Saniterer input inden det gemmes

## Konkret implementering

### Trin 1: Opret `netlify/functions/waitlist.js`
Se implementering — fikset direkte.

### Trin 2: Opdater client-kode til at bruge ny funktion
Se implementering — fikset direkte.

## Test / verifikation
```bash
# Test XSS-payload afvises:
curl -X POST https://clinlog.dk/.netlify/functions/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "<script>alert(1)</script>@test.com"}'
# Forventet: {"error": "Ugyldig e-mailadresse"}

# Test for lang email afvises:
curl -X POST https://clinlog.dk/.netlify/functions/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@test.com"}'
# Forventet: {"error": "Ugyldig e-mailadresse"}

# Test rate-limit (kør 4 gange hurtigt):
for i in 1 2 3 4; do
  curl -X POST https://clinlog.dk/.netlify/functions/waitlist \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"test$i@example.com\"}"
done
# 4. forsøg: {"error": "For mange forsøg. Prøv igen om lidt."}
```

## Afhængigheder / rækkefølge
- Ingen afhængigheder
- Ingen breaking changes for legitime brugere

## Estimeret tid
30 minutter — fikset direkte
