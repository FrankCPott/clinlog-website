# 04 - Auto-confirmed emails uden verifikation

## Sværhedsgrad
Høj

## Problem (normalt sprog)
Når nogen opretter en konto på clinlog.dk, bekræftes e-mailadressen automatisk uden at brugeren skal klikke noget bekræftelseslink. Det betyder at hvem som helst kan oprette en konto med en vilkårlig e-mailadresse — også en andens. For en medicinsk læringsapp er det et problem: nogen kan udgive sig for at være en anden person, og der er ingen barriere mod masseregistrering af falske konti.

## Analyse af nuværende kode

**Supabase-indstilling (ikke i kodebasen — er i Supabase-dashboardet):**
```
GET https://rcrwqyctpjltnofxssmy.supabase.co/auth/v1/settings
→ "mailer_autoconfirm": true
```

**`public/index.html` — signup-flow (linje ~2656):**
```javascript
({ error } = await supabase.auth.signUp({ email, password }));
if (!error) {
  loginMsg.textContent = 'Bekræft din e-mail for at aktivere kontoen.';
  loginMsg.className = 'login-msg success';
  // Men koden viser faktisk at brugeren ER aktiveret med det samme
  // pga. mailer_autoconfirm: true — beskeden er misvisende
}
```

Koden viser beskeden "Bekræft din e-mail" men med autoconfirm aktiveret er kontoen allerede aktiv. Brugeren kan logge ind med det samme uden at bekræfte noget.

## Trusselsmodel
**Hvem:** Enhver der kan tilgå signup-formularen.
**Hvad de kan opnå:** Oprette konti med andres e-mailadresser, masseregistrering af falske brugere.

Angrebsscenarie:
1. Angriber registrerer `laege@regionh.dk` som bruger
2. Kontoen aktiveres øjeblikkeligt — den rigtige læge ved intet
3. Angriber logger ind og har adgang til appen under en andens identitet
4. Alternativt: script der registrerer 1000 falske konti for at overbelaste systemet

## Bedste løsning
**Deaktiver `mailer_autoconfirm`** i Supabase Dashboard og konfigurér en e-mailudbyder. Brug Resend (gratis tier, let at sætte op) til at sende bekræftelsesmails med din eget domæne `@clinlog.dk`.

**Tilvalg:** Tilføj Cloudflare Turnstile (gratis CAPTCHA) på signup-formularen for at blokere bots.

## Konkret implementering

### Trin 1: Deaktiver autoconfirm i Supabase
1. Gå til [supabase.com](https://supabase.com) → dit projekt
2. **Authentication → Configuration → Email**
3. Slå **"Enable email confirmations"** TIL (det er det der deaktiverer autoconfirm)
4. Klik Save

### Trin 2: Konfigurér Resend som e-mailudbyder (gratis)
1. Opret konto på [resend.com](https://resend.com)
2. Tilføj domænet `clinlog.dk` og verificer via DNS-records i Simply.com
3. Opret API-nøgle i Resend
4. I Supabase: **Authentication → Configuration → SMTP Settings**:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: din Resend API-nøgle
   - Sender email: `noreply@clinlog.dk`
   - Sender name: `ClinLog`

### Trin 3: Opdater frontend-koden
```javascript
// FØR (i public/index.html):
({ error } = await supabase.auth.signUp({ email, password }));
if (!error) {
  loginMsg.textContent = 'Bekræft din e-mail for at aktivere kontoen.';
  loginMsg.className = 'login-msg success';
  loginSubmitBtn.disabled = false;
  loginSubmitBtn.textContent = 'Opret konto';
  return;
}

// EFTER (ingen kodeændring nødvendig — beskeden er allerede korrekt):
// Supabase sender nu en rigtig bekræftelsesmail
// Brugeren KAN ikke logge ind før de klikker linket
// Den eksisterende besked "Bekræft din e-mail for at aktivere kontoen" er præcis korrekt
```

### Trin 4 (valgfrit): Tilføj Turnstile CAPTCHA mod bots
```html
<!-- I login-modal, efter password-feltet: -->
<div class="cf-turnstile" data-sitekey="DIN_TURNSTILE_SITEKEY" data-theme="dark"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

```javascript
// I signup-kald — verificer token server-side:
// Tilføj Netlify Function: netlify/functions/verify-turnstile.js
// Kald den inden supabase.auth.signUp()
```

### Trin 5: Tilføj confirm-redirect URL i Supabase
I Supabase: **Authentication → URL Configuration**:
- Site URL: `https://clinlog.dk`
- Redirect URLs: `https://clinlog.dk` (til bekræftelseslink-redirect)

## Test / verifikation
```bash
# Test at autoconfirm er deaktiveret:
# 1. Forsøg at oprette konto med din@email.dk på clinlog.dk
# 2. Forsøg at logge ind med det samme
# Forventet: "Email not confirmed" fejl

# Test at bekræftelsesmail ankommer:
# 1. Tjek indbakken for email fra noreply@clinlog.dk
# 2. Klik bekræftelseslink
# 3. Forsøg at logge ind
# Forventet: Login lykkes

# Verificer afsender:
# Fra: noreply@clinlog.dk (ikke Supabase's eget domæne)
```

## Afhængigheder / rækkefølge
- **Vigtigt:** Eksisterende brugere er allerede bekræftet — ingen påvirkning for dem
- Nye brugere skal fremover bekræfte e-mail inden login
- Resend DNS-verificering tager typisk 5-15 minutter
- Kan laves uafhængigt af de andre fixes

## Estimeret tid
30 minutter (Supabase + Resend opsætning)
