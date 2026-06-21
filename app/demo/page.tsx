/**
 * /demo — Soft-launch demo-side
 *
 * Ikke linket fra hoved-nav endnu — Frank deler URL direkte med
 * Gitte og kolleger til test inden nav-link tilføjes.
 */

import type { Metadata } from "next";
import Link from "next/link";
import DictationDemo from "@/components/demo/DictationDemo";
import s from "./demo.module.css";

export const metadata: Metadata = {
  title: "Prøv diktering — ClinLog Demo",
  description:
    "Dikter en kort, opdigtet patientcase og se, hvordan ClinLog strukturerer den til en klinisk note på sekunder.",
  robots: { index: false, follow: false }, // ikke indekseret endnu
};

export default function DemoPage() {
  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <header className={s.header}>
        <Link href="/" className={s.logo}>
          Clin<span className={s.accent}>Log</span>
        </Link>
        <span className={s.badge}>Demo</span>
      </header>

      {/* ── Intro ── */}
      <section className={s.intro}>
        <div className={s.introInner}>
          <div className={s.eyebrow}>Prøv det selv</div>
          <h1 className={s.headline}>
            Fra diktering til<br />struktureret note på sekunder.
          </h1>
          <p className={s.sub}>
            Dikter en kort, <strong>opdigtet</strong> patientcase herunder.
            ClinLog transskriberer, anonymiserer og strukturerer den i realtid.
          </p>
        </div>
      </section>

      {/* ── Demo-komponent ── */}
      <section className={s.demoSection}>
        <DictationDemo />
      </section>

      {/* ── Footer-note ── */}
      <footer className={s.footer}>
        <p>
          <strong>Hvordan håndterer vi demo-data?</strong>{" "}
          Intet du siger gemmes. Lydoptagelsen og transskriptet slettes umiddelbart
          efter struktureringen og sendes ikke videre. Se{" "}
          <Link href="/#trust">vores datasikkerhedsprincip</Link>.
        </p>
        <p>
          <Link href="/">← Tilbage til forsiden</Link>
        </p>
      </footer>

    </div>
  );
}
