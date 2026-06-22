import Image from "next/image";
import Link from "next/link";
import s from "./hub.module.css";

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

const PulseIcon = () => (
  <svg className={s.pulseIcon} viewBox="0 0 24 16" fill="none">
    <path
      d="M0 8H6L8 2L12 14L15 8H24"
      stroke="#5B9BC0"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HubPage() {
  return (
    <div className={s.root}>

      {/* ══ HEADER ══ */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>
            <PulseIcon />
            Clin<span className={s.logAccent}>Log</span>
          </Link>
          <nav>
            <ul className={s.mainNav}>
              <li><a href="#icu">ICU</a></li>
              <li><a href="#akut">Acute</a></li>
              <li><a href="#diary">Clinical Diary</a></li>
            </ul>
          </nav>
          <Link href="/icu" className={s.headerCta}>Log in</Link>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroEyebrow}>Built by clinicians, for the ward</div>
          <h1 className={s.heroHeadline}>
            Clinical software for{" "}
            <em>structured notes</em> in your specialty.
          </h1>
          <p className={s.heroSub}>
            Dictate your ward round. ClinLog structures it into your
            department&apos;s note format — ready to copy into the patient record.
          </p>
          <div className={s.heroActions}>
            <a href="#products" className={s.btnPrimary}>Explore the suite</a>
            <a href="#trust" className={s.btnGhost}>How data is handled</a>
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
        <div className={s.narrativeLabel}>How it works</div>
        <div className={s.narrativeContent}>
          <p>
            Before the round, you bring up the patient&apos;s current status
            from Sundhedsplatformen. ClinLog reads it and holds it ready —{" "}
            <strong>vitals, labs, medications</strong> — so it&apos;s there
            the moment you start dictating.
          </p>
          <p>
            You speak the ward round the way you already would: CNS,
            respiratory, circulatory, and on through the rest. ClinLog
            combines what you said with the patient context already on hand,
            and structures both into your department&apos;s note format.
          </p>
          <p>
            The structured note appears ready to review — then copies
            straight back into Sundhedsplatformen.
          </p>
          <p className={s.smallNote}>
            ClinLog is developed independently of any hospital IT department,
            as commercial clinical software intended for evaluation and
            adoption by individual departments.
          </p>
        </div>
      </section>

      {/* ══ PRODUCTS ══ */}
      <section className={s.products} id="products">
        <div className={s.productsInner}>
          <div className={s.productsHead}>
            <div className={s.narrativeLabel}>The suite</div>
            <h2>Three tools, one structuring engine.</h2>
          </div>
          <div className={s.productGrid}>

            {/* ICU */}
            <div className={s.productCard} id="icu">
              <div className={s.cardShot}>
                <Image
                  src="/icu_shot.jpg"
                  alt="ClinLog ICU dictation screen showing ward round note types"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
                <div className={s.cardShotOverlay} />
              </div>
              <div className={s.cardBody}>
                <div className={s.cardTag}>Intensive care</div>
                <h3>ClinLog ICU</h3>
                <p className={s.desc}>
                  Dictate ward rounds directly into a ten-section ICU
                  template — CNS, respiratory, circulatory, and beyond. Copy
                  structured notes into the patient record in minutes.
                </p>
                <Link href="/icu" className={s.cardLink}>
                  Explore ICU <ArrowRight />
                </Link>
                <Link href="/demo" className={s.cardDemoLink}>
                  Try the dictation demo <ArrowRight />
                </Link>
                <div className={s.cardStatus}>Active development</div>
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
                <div className={`${s.cardTag} ${s.cardTagAkut}`}>Prehospital</div>
                <h3>ClinLog Acute</h3>
                <p className={s.desc}>
                  Built for the ambulance and the scene. Dictate en route,
                  structured straight into MIST and ABCDE — then transfer via
                  the built-in QR scanner or Bluetooth.
                </p>
                {/* TODO: peg på /akut når produktsiden findes */}
                <span className={s.cardLink}>
                  Explore Acute <ArrowRight />
                </span>
                <div className={s.cardStatus}>Active development</div>
              </div>
            </div>

            {/* Clinical Diary */}
            <div className={`${s.productCard} ${s.productCardDiary}`} id="diary">
              <div className={s.cardShot}>
                <div className={s.placeholderShot}>Clinical Diary</div>
              </div>
              <div className={s.cardBody}>
                <div className={s.cardTag}>Education &amp; reflection</div>
                <h3>Clinical Diary</h3>
                <p className={s.desc}>
                  A structured, searchable record of clinical experience over
                  time — built for training, supervision, and reflective
                  practice across a career.
                </p>
                {/* TODO: peg på /diary når produktsiden findes */}
                <span className={s.cardLink}>
                  Learn more <ArrowRight />
                </span>
                <div className={s.cardStatus}>Early stage</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ TRUST ══ */}
      <section className={s.trust} id="trust">
        <div className={s.trustInner}>
          <h2>Data handled the way clinical data should be.</h2>
          <div className={s.trustPoints}>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>GDPR by design</div>
              <p>
                All processing runs on EU infrastructure under data processing
                agreements built for healthcare. Notes are never stored longer
                than necessary to reach the patient record.
              </p>
            </div>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>Structuring engine</div>
              <p>
                Speech structuring is powered by Corti, a clinical AI platform
                already in use across Danish hospitals, purpose-built for
                medical documentation.
              </p>
            </div>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>Anonymisation first</div>
              <p>
                Patient-identifying details are stripped before any note is
                processed or stored — anonymisation runs as a fixed first step,
                not an option.
              </p>
            </div>
            <div className={s.trustPoint}>
              <div className={s.ptLabel}>You stay in control</div>
              <p>
                Every structured note is shown for review before it reaches the
                record. ClinLog assists documentation — it doesn&apos;t replace
                clinical judgement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER CTA ══ */}
      <section className={s.footerCta}>
        <div className={s.footerCtaInner}>
          <h2>See it in practice.</h2>
          <div className={s.footerCtaTrustPoints}>
            <div className={s.footerCtaTrustPoint}>
              <div className={s.ptLabel}>For your department</div>
              <p>Live walkthrough on a real ward round, with your own note format.</p>
            </div>
            <div className={s.footerCtaTrustPoint}>
              <div className={s.ptLabel}>For individual clinicians</div>
              <p>Early access to ClinLog ICU, ready to use this week.</p>
            </div>
          </div>
          <div className={s.footerCtaActions}>
            <a href="mailto:pott@clinlog.dk" className={s.btnPrimary}>
              Request access
            </a>
            <Link href="/icu" className={s.btnGhost}>Log in</Link>
          </div>
        </div>
      </section>

      {/* ══ SITE FOOTER ══ */}
      <footer className={s.siteFooter}>
        <div className={s.siteFooterInner}>
          <Link href="/" className={s.logo} style={{ fontSize: 16 }}>
            Clin<span className={s.logAccent}>Log</span>
          </Link>
          <div>ClinLog ApS · Denmark · pott@clinlog.dk</div>
        </div>
      </footer>

    </div>
  );
}
