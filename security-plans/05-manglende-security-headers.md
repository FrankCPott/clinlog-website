# 05 - Manglende security headers

## Sværhedsgrad
Medium

## Problem (normalt sprog)
Browsere har en række indbyggede sikkerhedsmekanismer der kan aktiveres via HTTP-headers — men kun hvis serveren sender dem. Uden disse headers kan angribere potentielt indlejre din side i en iframe (clickjacking), tvinge browsers til at gætte filtyper (MIME-sniffing), eller køre uønsket JavaScript fra fremmede domæner. En Content Security Policy (CSP) er den vigtigste: den fortæller browseren præcist hvilke scripts og ressourcer der må indlæses.

## Analyse af nuværende kode

**`public/_headers` (hele filen):**
```
/*
  Cache-Control: no-cache, must-revalidate
```
Kun Cache-Control er sat. Alle sikkerhedsheaders mangler.

**Hvad der burde sendes (mangler):**
- `Content-Security-Policy` — hvilke scripts/styles/sources er tilladt
- `X-Frame-Options` — forhindrer clickjacking via iframe
- `X-Content-Type-Options` — forhindrer MIME-sniffing
- `Referrer-Policy` — begrænser hvilke URL-oplysninger der sendes til tredjeparter
- `Permissions-Policy` — deaktiverer browser-features der ikke bruges

**Udfordring med CSP og inline scripts:**
`public/index.html` indeholder ét stort `<script>`-tag med al JavaScript inline. En strict CSP (`script-src 'self'`) vil blokere dette. Løsningen er at tilføje en `nonce` eller flytte scriptet til en ekstern fil.

## Trusselsmodel
**Hvem:** Angribere der udnytter manglende browser-beskyttelse.
**Hvad de kan opnå:**
- **Clickjacking:** Indlejre clinlog.dk i en usynlig iframe og narre brugere til at klikke på skjulte knapper
- **MIME-sniffing:** Narre browseren til at eksekvere uploadede filer som scripts
- **Data leakage:** Browserens Referrer-header afslører interne URL-parametre til tredjeparter

## Bedste løsning
Opdater `public/_headers` og `netlify.toml` med alle nødvendige headers. Flyt den inline JavaScript til en ekstern fil (`app.js`) så en strict CSP kan håndhæves uden `unsafe-inline`.

## Konkret implementering

### Trin 1: Flyt inline script til ekstern fil
```bash
# Opret public/app.js — flyt alt JavaScript fra <script>...</script> i index.html hertil
```

I `public/index.html`:
```html
<!-- FØR: -->
<script>
  // al kode her (2000+ linjer)
</script>

<!-- EFTER: -->
<script src="/app.js" defer></script>
```

### Trin 2: Opdater `public/_headers`
```
/*
  Cache-Control: no-cache, must-revalidate
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://rcrwqyctpjltnofxssmy.supabase.co https://eutils.ncbi.nlm.nih.gov; img-src 'self' data:; frame-ancestors 'none'

/screenshots/*
  Cache-Control: public, max-age=31536000, immutable
```

**CSP-kilder forklaret:**
- `script-src 'self'` — kun scripts fra clinlog.dk (kræver ekstern app.js)
- `connect-src` — tillader fetch til Supabase og PubMed
- `style-src ... fonts.googleapis.com` — Google Fonts CSS
- `font-src fonts.gstatic.com` — Google Fonts filer
- `frame-ancestors 'none'` — erstatter X-Frame-Options med moderne CSP

**OBS:** Supabase JS loades via `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/...">`.
Tilføj `cdn.jsdelivr.net` til `script-src`:
```
script-src 'self' https://cdn.jsdelivr.net;
```

### Trin 3: Verificer netlify.toml
```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

Headers i `_headers`-filen har prioritet over `netlify.toml` — brug kun ét sted for at undgå konflikter. Anbefaling: brug `_headers` (som allerede eksisterer).

## Test / verifikation
```bash
# Tjek headers med curl:
curl -I https://clinlog.dk | grep -i -E "content-security|x-frame|x-content|referrer|permissions"

# Brug Mozilla Observatory (gratis online scanner):
# https://observatory.mozilla.org/analyze/clinlog.dk
# Mål: score B eller højere

# Test CSP i browser:
# Åbn DevTools → Console
# Hvis der er CSP-fejl vises de her som røde advarsler
# Fix dem ved at tilføje de manglende sources til CSP-headeren
```

## Afhængigheder / rækkefølge
- **Vigtigt:** Flyt JavaScript til ekstern fil FØR du tilføjer strict CSP — ellers bryder siden
- Kan laves uafhængigt af de andre fixes
- Ingen breaking changes for brugere

## Estimeret tid
60-90 minutter (mest pga. flytning af inline script og CSP-tuning)
