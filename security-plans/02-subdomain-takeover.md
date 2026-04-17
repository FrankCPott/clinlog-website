# 02 - Subdomain takeover på app.clinlog.dk

## Sværhedsgrad
Høj

## Problem (normalt sprog)
DNS-posten for `app.clinlog.dk` peger på Vercel, men der er intet aktivt Vercel-projekt der ejer det domæne. En angriber kan gratis registrere et Vercel-projekt og kræve subdomænet — og dermed drive en falsk ClinLog-side fra `app.clinlog.dk` der ser ægte ud. Brugere der skriver adressen manuelt eller klikker et gammelt link kan blive narret til at afgive deres login.

## Analyse af nuværende kode
Problemet er i DNS-opsætningen, ikke i koden. Verificering:
```
curl -I https://app.clinlog.dk
# Returnerer: X-Vercel-Error: DEPLOYMENT_NOT_FOUND
```
DNS-record i Simply.com (eller hvad domæne-registraren er):
```
app.clinlog.dk  A  76.76.21.164  (Vercel's IP)
```
Ingen fil i repoet er involveret — det er udelukkende et DNS-problem.

## Trusselsmodel
**Hvem:** Enhver der kender til subdomain takeover (teknisk angriber, konkurrent).
**Hvad de kan opnå:** Hoste en phishing-side på `app.clinlog.dk` der ligner ClinLog og stjæler brugernes login.

Angrebsscenarie:
1. Angriber opdager at `app.clinlog.dk` returnerer `DEPLOYMENT_NOT_FOUND`
2. Angriber opretter gratis Vercel-konto og nyt projekt
3. Angriber tilføjer `app.clinlog.dk` som custom domain på sit Vercel-projekt
4. Vercel verificerer ejerskab via DNS — da A-recorden allerede peger på Vercel, accepteres det
5. Angriber deployer en falsk ClinLog login-side
6. Brugere besøger `app.clinlog.dk`, ser en troværdig side og indtaster credentials

## Bedste løsning
**Mulighed A (anbefalet hvis subdomænet ikke bruges): Slet DNS-recorden.**
Gå til DNS-hostingen (sandsynligvis Simply.com) og slet A-recorden for `app.clinlog.dk`.
Risiko nul efter sletning.

**Mulighed B (hvis subdomænet skal bruges fremover): Claim det på Vercel nu.**
Opret et Vercel-projekt og tilknyt `app.clinlog.dk` — så kan ingen andre tage det.

## Konkret implementering

### Mulighed A — Slet DNS-record (anbefalet)

1. Log ind på din DNS-host (Simply.com eller tilsvarende)
2. Gå til DNS-indstillinger for `clinlog.dk`
3. Find recorden: `app  A  76.76.21.164`
4. Slet den
5. Verificer efter 5 minutter:
```bash
nslookup app.clinlog.dk
# Bør returnere: "Non-existent domain" eller ingen svar
```

### Mulighed B — Claim subdomænet på Vercel

1. Log ind på vercel.com med din konto
2. Opret nyt projekt (kan være en simpel redirect-side)
3. Gå til projekt → Settings → Domains → Add `app.clinlog.dk`
4. Vercel verificerer automatisk via den eksisterende DNS-record

En simpel redirect til clinlog.dk kan implementeres via `vercel.json`:
```json
{
  "redirects": [
    { "source": "/(.*)", "destination": "https://clinlog.dk/$1", "permanent": true }
  ]
}
```

## Test / verifikation
```bash
# Efter sletning (Mulighed A):
curl -I https://app.clinlog.dk
# Bør returnere: connection refused eller NXDOMAIN

# Verificer ingen Vercel-fejl:
curl -I https://app.clinlog.dk | grep -i vercel
# Bør returnere: ingen output
```

## Afhængigheder / rækkefølge
- Ingen afhængigheder af andre fixes
- Ingen breaking changes — subdomænet bruges ikke aktivt
- Kan laves uafhængigt og med det samme

## Estimeret tid
5 minutter
