import Image from "next/image";
import Link from "next/link";
import s from "./icu.module.css";

export const metadata = {
  title: "ClinLog ICU — Workflow",
  description:
    "Fra .ALLPATIENTDATA i Sundhedsplatformen til struktureret stuegangsnotat på få minutter.",
};

const PulseIcon = () => (
  <svg className={s.logoIcon} viewBox="0 0 24 16" fill="none" aria-hidden="true">
    <path
      d="M0 8H6L8 2L12 14L15 8H24"
      stroke="#5B9BC0"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const organs = [
  { key: "CNS",  label: "Neurologi" },
  { key: "RESP", label: "Respiratorisk" },
  { key: "CIRK", label: "Cirkulatorisk" },
  { key: "GI",   label: "Gastrointestinalt" },
  { key: "NYRE", label: "Nyrefunktion" },
  { key: "MED",  label: "Medicin" },
  { key: "INF",  label: "Infektion" },
  { key: "PLAN", label: "Plan" },
];

export default function IcuWorkflowPage() {
  return (
    <div className={s.root}>

      {/* ── HEADER ── */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>
            <PulseIcon />
            Clin<span className={s.accent}>Log</span>{" "}
            <span className={s.icuBadge}>ICU</span>
          </Link>
          <Link href="/icu/app" className={s.headerCta}>Log ind</Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.eyebrow}>ClinLog ICU · Workflow</div>
          <h1 className={s.heroTitle}>
            Fra SP-data til<br />
            <em>struktureret stuegangsnotat</em>
          </h1>
          <p className={s.heroSub}>
            ClinLog ICU henter patientdata direkte fra Sundhedsplatformens{" "}
            <code>.ALLPATIENTDATA</code>-Smartphrase, parser dem automatisk i
            relevante organsystemer og kombinerer dem med din diktering —
            til et komplet, struktureret notat klar til kopiering.
          </p>
          <Link href="/icu/app" className={s.heroCta}>
            Log ind i appen →
          </Link>
        </div>
      </section>

      {/* ── WORKFLOW STEPS ── */}
      <section className={s.steps}>

        {/* ── Trin 1 ── */}
        <div className={`${s.step} ${s.stepAlt}`}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 01</div>
              <h2>Kopier .ALLPATIENTDATA fra SP</h2>
              <p>
                Brug Sundhedsplatformens <strong>.ALLPATIENTDATA</strong>-Smartphrase
                i patientens journal. Kopier hele blokken og indsæt den i ClinLog ICU.
                Ingen teknisk integration — det tager fem sekunder.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.spMockup}>
                <div className={s.spMockupBar}>
                  <div className={s.spMockupDot} />
                  <div className={s.spMockupDot} />
                  <div className={s.spMockupDot} />
                  <span>Sundhedsplatformen · .ALLPATIENTDATA</span>
                </div>
                <div className={s.spMockupBody}>
                  <div className={s.spLine}>
                    <span className={s.spKey}>CPR:</span> ██████-████
                  </div>
                  <div className={s.spLine}>
                    <span className={s.spKey}>BT:</span> 128/82 mmHg · HF: 94/min
                  </div>
                  <div className={s.spLine}>
                    <span className={s.spKey}>SAT:</span> 96% (O₂ 2 L/min)
                  </div>
                  <div className={s.spLine}>
                    <span className={s.spKey}>Temp:</span> 38.4°C · RR: 22/min
                  </div>
                  <div className={s.spDivider} />
                  <div className={s.spLine}>
                    <span className={s.spKey}>Lkc:</span> 14.2 · CRP: 87 · Krea: 112
                  </div>
                  <div className={s.spLine}>
                    <span className={s.spKey}>Hgb:</span> 6.8 mmol/L · Na: 138
                  </div>
                  <div className={s.spDivider} />
                  <div className={s.spLine}>
                    <span className={s.spKey}>Medicin:</span> Meropenem 2 g × 3 · Furix 40 mg...
                  </div>
                  <div className={s.spLine}>
                    <span className={s.spKey}>Obs:</span> Intuberet, VAP-protokol dag 3
                  </div>
                </div>
                <div className={s.spMockupCopy}>
                  <span>⌘C  Kopier · Indsæt i ClinLog ICU</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trin 2 ── */}
        <div className={s.step}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 02</div>
              <h2>Automatisk parsing i organsystemer</h2>
              <p>
                ClinLog parser dataene automatisk og kategoriserer dem i de klinisk
                relevante organsystemer. Ingen manuel sortering — det sker på sekunder,
                klar som struktureret datagrundlag til stuegangsrunden.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.organGrid}>
                {organs.map(o => (
                  <div key={o.key} className={s.organChip}>
                    <span className={s.organKey}>{o.key}</span>
                    <span className={s.organLabel}>{o.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Trin 3 ── */}
        <div className={`${s.step} ${s.stepAlt}`}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 03</div>
              <h2>Strukturerede SP-data som datagrundlag</h2>
              <p>
                De parsede data vises i appen som et struktureret datagrundlag —
                vitale værdier, laboratorieresultater og aktuelle observationer.
                Lægen har overblikket klar, inden dikteringen starter.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.screenshotFrame}>
                <Image
                  src="/icu_shot.jpg"
                  alt="ClinLog ICU appen med struktureret SP-datagrundlag"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                  sizes="(max-width: 860px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Trin 4 ── */}
        <div className={s.step}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 04</div>
              <h2>Dikter stuegangsnotatet</h2>
              <p>
                Dikter stuegangsnotatet direkte i appen — præcis som du altid ville
                have gjort det. ClinLog transskriberer talen, anonymiserer og
                kombinerer diktaten med de aktuelle SP-data.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.screenshotFrame}>
                <Image
                  src="/screenshots/screen1.png"
                  alt="ClinLog ICU — dikteringsskærm"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                  sizes="(max-width: 860px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Trin 5 ── */}
        <div className={`${s.step} ${s.stepAlt}`}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 05</div>
              <h2>Struktureret notat klar til kopi</h2>
              <p>
                Det færdige notat — SP-data og diktat samlet i afdelingens format —
                kopieres direkte ind i patientjournalen i Sundhedsplatformen.
                Ét tryk. Færdig.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.screenshotFrame}>
                <Image
                  src="/screenshots/screen2.png"
                  alt="Struktureret stuegangsnotat klar til kopiering til SP"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                  sizes="(max-width: 860px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── TRUST ── */}
      <section className={s.trust}>
        <div className={s.trustInner}>
          <div className={s.trustPoint}>
            <div className={s.ptLabel}>GDPR</div>
            <p>
              Al behandling sker på EU-infrastruktur under databehandleraftaler
              tilpasset sundhedsvæsenet.
            </p>
          </div>
          <div className={s.trustPoint}>
            <div className={s.ptLabel}>Anonymisering først</div>
            <p>
              CPR og patientidentificerende oplysninger fjernes som første skridt
              — altid, automatisk, inden noget andet.
            </p>
          </div>
          <div className={s.trustPoint}>
            <div className={s.ptLabel}>Du beholder kontrollen</div>
            <p>
              Hvert notat gennemses og godkendes af dig, inden det kopieres til
              journalen. ClinLog assisterer — den kliniske vurdering er din.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={s.ctaSection}>
        <div className={s.ctaInner}>
          <h2>Klar til at prøve?</h2>
          <p>
            Log ind og dikter dit næste stuegangsnotat med ClinLog ICU.
          </p>
          <div className={s.ctaActions}>
            <Link href="/icu/app" className={s.btnPrimary}>
              Log ind i appen
            </Link>
            <a href="mailto:pott@clinlog.dk" className={s.btnGhost}>
              Kontakt os
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <Link href="/" className={s.footerLogo}>
            Clin<span className={s.accent}>Log</span>
          </Link>
          <div>ClinLog ApS · Denmark · pott@clinlog.dk</div>
        </div>
      </footer>

    </div>
  );
}
