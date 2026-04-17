# 08 - HSTS er konfigureret svagt

## Sværhedsgrad
Lav

## Problem (normalt sprog)
HSTS (HTTP Strict Transport Security) fortæller browsere at de altid skal bruge HTTPS — men den nuværende konfiguration mangler `includeSubDomains` og `preload`. Det betyder at subdomæner ikke automatisk beskyttes, og at siden ikke kan tilmeldes HSTS preload-listen (der er forudindlæst i alle browsere).

## Analyse af nuværende kode

**`public/_headers` (relevant del):**
```
# HSTS sendes af Netlify automatisk, men ikke eksplicit konfigureret i _headers
# Netlify's default: Strict-Transport-Security: max-age=31536000
# Mangler: includeSubDomains, preload
```

Den stærke HSTS-header bør se således ud:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Trusselsmodel
**Hvem:** Angribere på samme netværk (café, hospital WiFi).
**Hvad de kan opnå:** Downgrade-angreb mod subdomæner der ikke er dækket af HSTS.

Lav risiko i praksis for clinlog.dk, da subdomænet `app.clinlog.dk` nu er fjernet — men god praksis at have på plads.

## Bedste løsning
Tilføj eksplicit HSTS-header i `_headers` med `includeSubDomains` og `preload`.

**Vigtigt:** `preload` kræver at du tilmelder domænet på [hstspreload.org](https://hstspreload.org) — selve header-ændringen er nok til at løse sikkerhedsproblemet.

## Konkret implementering
Se `_headers` — fikset direkte.

## Test / verifikation
```bash
curl -sI https://clinlog.dk | grep -i strict
# Forventet: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Afhængigheder / rækkefølge
- Ingen afhængigheder
- Ingen breaking changes

## Estimeret tid
5 minutter — fikset direkte
