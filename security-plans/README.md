# ClinLog Security Plans

Sikkerhedsaudit gennemført: 2026-04-16  
Rapport modtaget: 2026-04-17  
Delvise fixes implementeret: 2026-04-17 (issue 01)

---

## Prioriteret oversigt

| # | Titel | Sværhedsgrad | Status | Tid |
|---|-------|-------------|--------|-----|
| [01](01-claude-proxy-abuse.md) | Claude-proxy misbrug | 🔴 Kritisk | ⚠️ Delvist fikset | 45 min |
| [02](02-subdomain-takeover.md) | Subdomain takeover app.clinlog.dk | 🟠 Høj | ❌ Ikke fikset | 5 min |
| [03](03-session-tokens-localstorage.md) | Session-tokens i localStorage | 🟠 Høj | ❌ Ikke fikset | 30 min |
| [04](04-auto-confirmed-emails.md) | Auto-confirmed emails | 🟠 Høj | ❌ Ikke fikset | 30 min |
| [05](05-manglende-security-headers.md) | Manglende security headers | 🟡 Medium | ❌ Ikke fikset | 90 min |
| 06 | *(afventer — rapport afskåret)* | ? | ⏳ Plan mangler | - |
| 07 | *(afventer — rapport afskåret)* | ? | ⏳ Plan mangler | - |
| 08 | *(afventer — rapport afskåret)* | ? | ⏳ Plan mangler | - |
| 09 | *(afventer — rapport afskåret)* | ? | ⏳ Plan mangler | - |

---

## Hvad der allerede er gjort (2026-04-17)

**Issue 01 — delvist:**
- ✅ Origin-whitelist tilføjet (kun clinlog.dk domæner)
- ✅ Supabase Bearer token verificering tilføjet
- ❌ Model-allowlist mangler
- ❌ Server-side max_tokens cap mangler  
- ❌ Per-user daglig token-kvote mangler
- ❌ Anthropic billing cap (skal sættes manuelt på console.anthropic.com)

---

## Anbefalet rækkefølge

1. **Nu (5 min):** Fix 02 — slet app.clinlog.dk DNS-record i Simply.com
2. **I dag (30 min):** Fix 04 — deaktiver autoconfirm, konfigurér Resend SMTP
3. **I dag (30 min):** Fix 03 — skift localStorage til memory storage
4. **I dag (45 min):** Fuldfør Fix 01 — model-allowlist, max_tokens cap, token-kvote
5. **Sæt billing cap hos Anthropic (5 min)** — uafhængig af kode
6. **Denne uge (90 min):** Fix 05 — security headers + flyt script til ekstern fil
7. **Når rapport modtages:** Fix 06-09

---

## Statusforklaring
- ✅ Fikset og deployed
- ⚠️ Delvist fikset
- ❌ Ikke fikset endnu
- ⏳ Afventer information
