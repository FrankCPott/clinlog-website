/* ── Shared homepage component — renders DA / EN / DE ── */
import Image from "next/image";
import Link from "next/link";
import s from "@/app/hub.module.css";
import type { Locale } from "@/lib/i18n/home";
import t_all from "@/lib/i18n/home";

/* ── Icons ── */
const ArrowRight = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8H13M13 8L9 4M13 8L9 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* Boxed ECG logo mark — matches the ICU app icon style */
const LogoMark = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="8" fill="#5B9BC0" />
    <path
      d="M6 20H13L16 9L21 31L25 20H34"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Props ── */
interface Props {
  locale: Locale;
}

export default function HomepageShell({ locale }: Props) {
  const t = t_all[locale];

  /* Build lang-button class string */
  const langCls = (l: Locale) =>
    `${s.langBtn}${locale === l ? ` ${s.langBtnActive}` : ""}`;

  return (
    <div className={s.root}>

      {/* ══ HEADER ══ */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>
            <LogoMark className={s.logoMark} />
            Clin<span className={s.logAccent}>Log</span>
          </Link>

          <nav>
            <ul className={s.mainNav}>
              <li><a href="#icu">{t.navIcu}</a></li>
              <li><a href="#akut">{t.navAkut}</a></li>
              <li><a href="#custom">{t.navCustom}</a></li>
            </ul>
          </nav>

          <div className={s.headerRight}>
            <div className={s.langPicker}>
              <Link href="/"    className={langCls("da")} title="Dansk">🇩🇰</Link>
              <Link href="/en"  className={langCls("en")} title="English">🇬🇧</Link>
              <Link href="/de"  className={langCls("de")} title="Deutsch">🇩🇪</Link>
            </div>
            <Link href="/icu/app" className={s.headerCta}>{t.logIn}</Link>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroEyebrow}>{t.eyebrow}</div>
          <h1 className={s.heroHeadline}>
            {t.heroHeadline1}{" "}
            <em>{t.heroHeadlineEm}</em>{" "}
            {t.heroHeadline2}
          </h1>
          <p className={s.heroSub}>{t.heroSub}</p>
          <div className={s.heroActions}>
            <a href="#products" className={s.btnPrimary}>{t.exploreSuite}</a>
            <a href="#trust"    className={s.btnGhost}>{t.howData}</a>
          </div>
        </div>

        {/* Animated vital trace */}
        <div className={s.vitalTrace} aria-hidden="true">
          <svg viewBox="0 0 1200 140" preserveAspectRatio="none">
            <path
              className={s.traceLine}
              d="M0,90 L140,90 L165,40 L185,120 L205,90 L380,90 L405,60 L425,100 L445,90 L640,90 L665,30 L690,130 L710,90 L920,90 L945,55 L965,100 L985,90 L1200,90"
            />
            <path
              className={s.traceLineSecondary}
              d="M0,105 L200,105 L220,75 L240,115 L260,105 L500,105 L520,80 L540,118 L560,105 L820,105 L840,70 L860,120 L880,105 L1200,105"
            />
          </svg>
        </div>
      </section>

      {/* ══ NARRATIVE ══ */}
      <section className={s.narrative}>
        <div className={s.narrativeLabel}>{t.howItWorks}</div>
        <div className={s.narrativeContent}>
          <p>{t.narrativeP1}</p>
          <p>{t.narrativeP2}</p>
          <p>{t.narrativeP3}</p>
          <p className={s.smallNote}>{t.narrativeSmall}</p>
        </div>
      </section>

      {/* ══ PRODUCTS ══ */}
      <section className={s.products} id="products">
        <div className={s.productsInner}>
          <div className={s.productsHead}>
            <div className={s.narrativeLabel}>{t.theSuite}</div>
            <h2>{t.suiteHeading}</h2>
          </div>

          <div className={s.productGrid}>

            {/* ICU */}
            <div className={s.productCard} id="icu">
              <div className={s.cardShot}>
                <Image
                  src="/icu_shot.jpg"
                  alt="ClinLog ICU dictation screen"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
                <div className={s.cardShotOverlay} />
              </div>
              <div className={s.cardBody}>
                <div className={s.cardTag}>{t.icuTag}</div>
                <h3>ClinLog ICU</h3>
                <p className={s.desc}>{t.icuDesc}</p>
                <Link href="/icu" className={s.cardLink}>
                  {t.icuExplore} <ArrowRight />
                </Link>
                <Link href="/demo" className={s.cardDemoLink}>
                  {t.icuDemo} <ArrowRight />
                </Link>
                <div className={s.cardStatus}>{t.icuStatus}</div>
              </div>
            </div>

            {/* Acute */}
            <div className={s.productCard} id="akut">
              <div className={s.cardShot}>
                <Image
                  src="/ppj_struct1.jpg"
                  alt="ClinLog Acute structured MIST/ABCDE note"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
                <div className={s.cardShotOverlay} />
              </div>
              <div className={s.cardBody}>
                <div className={`${s.cardTag} ${s.cardTagAkut}`}>{t.akutTag}</div>
                <h3>ClinLog Acute</h3>
                <p className={s.desc}>{t.akutDesc}</p>
                <span className={s.cardLink}>
                  {t.akutExplore} <ArrowRight />
                </span>
                <div className={s.cardStatus}>{t.akutStatus}</div>
              </div>
            </div>

            {/* ClinLog Custom — replaces Clinical Diary */}
            <div className={s.productCard} id="custom">
              <div className={s.cardShot}>
                <div className={s.placeholderShot}>ClinLog Custom</div>
              </div>
              <div className={s.cardBody}>
                <div className={s.cardTag}>{t.customTag}</div>
                <h3>ClinLog Custom</h3>
                <p className={s.desc}>{t.customDesc}</p>
                <a href="mailto:pott@clinlog.dk" className={s.cardLink}>
                  {t.customExplore} <ArrowRight />
                </a>
                <div className={s.cardStatus}>{t.customStatus}</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ TRUST ══ */}
      <section className={s.trust} id="trust">
        <div className={s.trustInner}>
          <h2>{t.trustHeading}</h2>
          <div className={s.trustPoints}>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>{t.gdprLabel}</div>
              <p>{t.gdprText}</p>
            </div>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>{t.structLabel}</div>
              <p>{t.structText}</p>
            </div>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>{t.anonLabel}</div>
              <p>{t.anonText}</p>
            </div>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>{t.controlLabel}</div>
              <p>{t.controlText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER CTA ══ */}
      <section className={s.footerCta}>
        <div className={s.footerCtaInner}>
          <h2>{t.ctaHeading}</h2>
          <div className={s.footerCtaTrustPoints}>
            <div className={s.footerCtaTrustPoint}>
              <div className={s.ptLabel}>{t.deptLabel}</div>
              <p>{t.deptText}</p>
            </div>
            <div className={s.footerCtaTrustPoint}>
              <div className={s.ptLabel}>{t.clinLabel}</div>
              <p>{t.clinText}</p>
            </div>
          </div>
          <div className={s.footerCtaActions}>
            <a href="mailto:pott@clinlog.dk" className={s.btnPrimary}>
              {t.requestAccess}
            </a>
            <Link href="/icu/app" className={s.btnGhost}>{t.logIn}</Link>
          </div>
        </div>
      </section>

      {/* ══ SITE FOOTER ══ */}
      <footer className={s.siteFooter}>
        <div className={s.siteFooterInner}>
          <Link href="/" className={s.logo} style={{ fontSize: 16 }}>
            Clin<span className={s.logAccent}>Log</span>
          </Link>
          <div>{t.footerCopyright}</div>
        </div>
      </footer>

    </div>
  );
}
