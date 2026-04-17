# 07 - Ingen rate-limit på login/signup

## Sværhedsgrad
Høj

## Problem (normalt sprog)
Der er ingen begrænsning på hvor mange gange nogen kan forsøge at logge ind med forkert password. En angriber kan automatisk afprøve tusindvis af password-kombinationer (brute-force) på en bestemt konto. Supabase har en vis intern beskyttelse, men den er ikke tilstrækkelig alene for en medicinsk app.

## Analyse af nuværende kode

**`public/index.html` — login uden forsøgsbegrænsning:**
```javascript
loginSubmitBtn.addEventListener('click', async function () {
  // Ingen tæller på mislykkede forsøg
  // Ingen timeout efter X fejl
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Fejl vises blot — ingen lockout
});
```

Supabase har en standard rate-limit på auth-endpoints (typisk 30 req/time på free tier), men det er ikke nok mod en dedikeret angriber med roterende IP-adresser.

## Trusselsmodel
**Hvem:** Automatiserede angreb, credential-stuffing bots.
**Hvad de kan opnå:** Overtage konti ved at afprøve kendte password-lister.

Angrebsscenarie:
1. Angriber har en liste over 10.000 almindelige passwords
2. Sender automatiserede login-forsøg mod `frank@clinlog.dk`
3. Uden lockout kan de afprøve hundredvis inden Supabase's rate-limit rammer
4. Hvis brugeren har et svagt password, lykkes angrebet

## Bedste løsning
**Lag 1 (implementeret direkte):** Client-side lockout — efter 5 fejlede forsøg låses login-knappen i 5 minutter i browseren.

**Lag 2 (anbefalet):** Aktivér Supabase's Auth Hook eller brug Cloudflare Turnstile på login-formularen for server-side CAPTCHA.

**Lag 3 (langsigtet):** Netlify Function som proxy for login-kald med server-side tæller per IP i Supabase.

Lag 1 implementeres direkte nu. Det stopper ikke sofistikerede angreb (der bruger mange IP-adresser), men det blokerer simple bots og øger friktionen markant.

## Konkret implementering

### Client-side lockout (implementeret direkte i index.html)
```javascript
// Tilføj til login-logik:
let loginAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutter

// Før login-forsøg:
if (loginAttempts >= MAX_ATTEMPTS) {
  loginMsg.textContent = 'For mange fejlede forsøg. Vent 5 minutter.';
  loginMsg.className = 'login-msg error';
  return;
}

// Ved fejl:
loginAttempts++;
if (loginAttempts >= MAX_ATTEMPTS) {
  loginSubmitBtn.disabled = true;
  setTimeout(() => {
    loginAttempts = 0;
    loginSubmitBtn.disabled = false;
  }, LOCKOUT_MS);
}

// Reset ved succes:
loginAttempts = 0;
```

### Supabase rate-limit check
I Supabase Dashboard → Authentication → Rate Limits:
- Verificer at "Email and Password sign-ins" er sat til max 30/time (default)
- Verificer at "Token refresh" er aktivt

## Test / verifikation
```
1. Gå til clinlog.dk
2. Forsøg login med forkert password 5 gange i træk
3. Forventet: Login-knap deaktiveres, besked "For mange fejlede forsøg"
4. Vent 5 minutter — knap genaktiveres
```

## Afhængigheder / rækkefølge
- Ingen afhængigheder
- Ingen breaking changes

## Estimeret tid
15 minutter — fikset direkte
