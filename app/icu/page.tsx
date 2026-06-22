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
            ClinLog ICU henter patientdata direkte fra Sundhedsplatformen via en
            tilpasset Smartphrase, parser dem automatisk i relevante organsystemer
            og kombinerer dem med din diktering — til et komplet, struktureret
            notat klar til kopiering.
          </p>
          <Link href="/icu/app" className={s.heroCta}>
            Log ind i appen →
          </Link>
        </div>
      </section>

      {/* ── WORKFLOW STEPS ── */}
      <section className={s.steps}>

        {/* ── Trin 1: SP-data via Smartphrase ── */}
        <div className={`${s.step} ${s.stepAlt}`}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 01</div>
              <h2>SP-data til ClinLog via Smartphrase</h2>
              <p>
                Via en tilpasset Smartphrase kopieres alle relevante aktuelle data
                (uden personhenførbar identifikation) til ClinLog — det tager 5 sekunder.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.spScreenshots}>
                <div className={s.spScreenItem}>
                  <Image
                    src="/screenshots/sp_vitals.png"
                    alt="Sundhedsplatformen — observationer: blodtryk, puls, temperatur, saturation"
                    width={638}
                    height={155}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
                <div className={s.spScreenRow}>
                  <div className={s.spScreenItem}>
                    <Image
                      src="/screenshots/sp_lab.png"
                      alt="Sundhedsplatformen — laboratorieværdier: hæmatologi, elektrolytter, koagulation"
                      width={638}
                      height={490}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                  <div className={s.spScreenItem}>
                    <Image
                      src="/screenshots/sp_results.png"
                      alt="Sundhedsplatformen — resultatgennemgang med parakliniske systemer"
                      width={810}
                      height={630}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trin 2: Parsing + data i appen + diktering ── */}
        <div className={s.step}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 02</div>
              <h2>Strukturerede data og diktering i appen</h2>
              <p>
                ClinLog parser dataene automatisk og kategoriserer dem i de klinisk
                relevante organsystemer — CNS, respiratorisk, cirkulatorisk,
                gastrointestinalt og øvrige. De strukturerede SP-data vises som
                datagrundlag i appen, klar som reference inden og under dikteringen.
                Lægen dikterer stuegangsnotatet direkte — ClinLog transskriberer,
                anonymiserer og kombinerer diktaten med SP-dataene.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.phoneWrap}>
                <div className={s.phoneFrame}>
                  <Image
                    src="/screenshots/app_dictate.jpg"
                    alt="ClinLog ICU appen under diktering — strukturerede SP-data og optagelse"
                    width={1080}
                    height={2340}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trin 3: Færdigt notat ── */}
        <div className={`${s.step} ${s.stepAlt}`}>
          <div className={s.stepInner}>
            <div className={s.stepContent}>
              <div className={s.stepNum}>Trin 03</div>
              <h2>Struktureret notat klar til kopi</h2>
              <p>
                Det færdige notat — SP-data og diktat samlet i afdelingens format —
                kopieres direkte ind i patientjournalen i Sundhedsplatformen.
                2 tastetryk. Færdig.
              </p>
            </div>
            <div className={s.stepVisual}>
              <div className={s.screenshotFrame}>
                <Image
                  src="/icu_shot.jpg"
                  alt="ClinLog ICU — struktureret stuegangsnotat klar til kopiering til SP"
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
