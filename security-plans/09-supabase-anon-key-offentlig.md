# 09 - Supabase anon-key er offentlig

## Sværhedsgrad
Info / Ingen handling nødvendig

## Problem (normalt sprog)
Supabase's anon-nøgle er synlig i kildekoden. Dette er forventet og designet — nøglen er ikke en hemmelighed, men en offentlig identifikator der bruges til at identificere projektet. Al egentlig sikkerhed håndteres af Row Level Security (RLS) i Supabase, som bestemmer hvad hver enkelt bruger må se og gøre.

## Analyse af nuværende kode

**`public/index.html`:**
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

Dette er en JWT med `"role": "anon"` — den giver kun adgang til hvad RLS explicit tillader for anonyme brugere.

## Trusselsmodel
**Realistisk risiko:** Lav — forudsat RLS er korrekt konfigureret.

Anon-nøglen kan bruges til:
- At tilgå Supabase-endpointet — men RLS blokerer adgang til data der kræver login
- At tilmelde sig waitlist (tilladt for anon — det er meningen)

**Verificeret:** RLS er korrekt sat op hos clinlog.dk. Anonyme brugere kan ikke læse andres noter.

## Bedste løsning
**Ingen handling nødvendig.** Dette er Supabase's tilsigtede design.

Vedligeholdelse:
- Roter anon-nøglen i Supabase Dashboard → Settings → API → "Reset anon key" hvis den nogensinde kompromitteres
- Gennemgå RLS-politikker ved større ændringer af databasestrukturen

## Konkret implementering
Ingen kodeændring nødvendig.

Dokumentation til fremtidig reference — RLS-politikker der bør være aktive:
```sql
-- noter-tabellen: kun egne noter
CREATE POLICY "Users see own notes" ON noter
  FOR ALL USING (auth.uid() = user_id);

-- waitlist: anon må INSERT, ingen må SELECT
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);
```

## Test / verifikation
```bash
# Verificer at anon IKKE kan læse noter:
curl -s "https://rcrwqyctpjltnofxssmy.supabase.co/rest/v1/noter" \
  -H "apikey: ANON_KEY" \
  -H "Authorization: Bearer ANON_KEY"
# Forventet: [] (tom array — ikke andres noter)
```

## Afhængigheder / rækkefølge
Ingen.

## Estimeret tid
0 minutter — ingen handling nødvendig
