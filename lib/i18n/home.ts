/* ── ClinLog homepage translations: DA / EN / DE ── */

export type Locale = "da" | "en" | "de";

export interface HomeTranslations {
  logIn: string;
  navIcu: string;
  navAkut: string;
  navCustom: string;
  eyebrow: string;
  heroHeadline1: string;
  heroHeadlineEm: string;
  heroHeadline2: string;
  heroSub: string;
  exploreSuite: string;
  howData: string;
  howItWorks: string;
  narrativeP1: string;
  narrativeP2: string;
  narrativeP3: string;
  narrativeSmall: string;
  theSuite: string;
  suiteHeading: string;
  icuTag: string;
  icuDesc: string;
  icuExplore: string;
  icuDemo: string;
  icuStatus: string;
  akutTag: string;
  akutDesc: string;
  akutExplore: string;
  akutStatus: string;
  customTag: string;
  customDesc: string;
  customExplore: string;
  customStatus: string;
  trustHeading: string;
  gdprLabel: string;
  gdprText: string;
  structLabel: string;
  structText: string;
  anonLabel: string;
  anonText: string;
  controlLabel: string;
  controlText: string;
  ctaHeading: string;
  deptLabel: string;
  deptText: string;
  clinLabel: string;
  clinText: string;
  requestAccess: string;
  footerCopyright: string;
}

const translations: Record<Locale, HomeTranslations> = {
  /* ── DANSK (default) ── */
  da: {
    logIn: "Log ind",
    navIcu: "ICU",
    navAkut: "Akut",
    navCustom: "Custom",

    eyebrow: "Bygget af kliniker, til stuegangsrunden",
    heroHeadline1: "Klinisk software til",
    heroHeadlineEm: "strukturerede notater",
    heroHeadline2: "i din specialitet.",
    heroSub:
      "Dikter din stuegang. ClinLog strukturerer den i dit afdelings noteformat — klar til kopiering til patientjournalen.",
    exploreSuite: "Udforsk produkterne",
    howData: "Datasikkerhed",

    howItWorks: "Sådan virker det",
    narrativeP1:
      "Inden stuegangsrunden trækker du patientens aktuelle status fra Sundhedsplatformen. ClinLog læser den og holder den klar — vitale, laboratoriesvar, medicin — det øjeblik du begynder at diktere.",
    narrativeP2:
      "Du taler stuegangsrunden præcis som du plejer: CNS, respiration, cirkulation og videre. ClinLog kombinerer det du siger med patientkonteksten og strukturerer begge dele i afdelingens noteformat.",
    narrativeP3:
      "Det strukturerede notat vises klar til gennemgang — og kopieres direkte til Sundhedsplatformen.",
    narrativeSmall:
      "ClinLog er udviklet uafhængigt af hospitalsIT, som kommercielt klinisk software beregnet til evaluering og implementering af den enkelte afdeling.",

    theSuite: "Produktsuite",
    suiteHeading: "Tre produkter, én struktureringsmotor.",

    icuTag: "Intensiv medicin",
    icuDesc:
      "Dikter stuegange direkte ind i et ICU-notat med ti sektioner — CNS, respiration, cirkulation og videre. Kopiér strukturerede notater til patientjournalen på minutter.",
    icuExplore: "Udforsk ICU",
    icuDemo: "Prøv dikteringsdemo",
    icuStatus: "Aktiv udvikling",

    akutTag: "Præhospital",
    akutDesc:
      "Bygget til ambulancen og skadestedet. Dikter undervejs, struktureret direkte i MIST og ABCDE — overfør via QR-scanner eller Bluetooth.",
    akutExplore: "Udforsk Acute",
    akutStatus: "Aktiv udvikling",

    customTag: "Øvrige specialer",
    customDesc:
      "Vi udvikler apps til andre specialer med tilpasset strukturering af kliniske notater i dit speciales format og terminologi. Kontakt os for at høre mere.",
    customExplore: "Kontakt os",
    customStatus: "Forespørg",

    trustHeading: "Datasikkerhed som kliniske data fortjener.",
    gdprLabel: "GDPR by design",
    gdprText:
      "Al behandling sker på EU-infrastruktur under databehandleraftaler tilpasset sundhedsvæsenet. Notater gemmes aldrig længere end nødvendigt.",
    structLabel: "Struktureringsmotor",
    structText:
      "Talstruktureringen drives af Corti, en klinisk AI-platform der allerede bruges på danske hospitaler og er bygget til medicinsk dokumentation.",
    anonLabel: "Anonymisering først",
    anonText:
      "Patientidentificerende oplysninger fjernes inden notet behandles eller gemmes — anonymisering er et fast første skridt, ikke en option.",
    controlLabel: "Du beholder kontrollen",
    controlText:
      "Hvert struktureret notat gennemses af dig inden det overføres til journalen. ClinLog assisterer dokumentationen — den kliniske vurdering er din.",

    ctaHeading: "Se det i praksis.",
    deptLabel: "For din afdeling",
    deptText: "Live gennemgang på en reel stuegang, med dit eget noteformat.",
    clinLabel: "For den individuelle kliniker",
    clinText: "Tidlig adgang til ClinLog ICU, klar til brug denne uge.",
    requestAccess: "Anmod om adgang",
    footerCopyright: "Clin-Log ApS · Danmark · pott@clinlog.dk",
  },

  /* ── ENGLISH ── */
  en: {
    logIn: "Log in",
    navIcu: "ICU",
    navAkut: "Acute",
    navCustom: "Custom",

    eyebrow: "Built by clinicians, for the ward",
    heroHeadline1: "Clinical software for",
    heroHeadlineEm: "structured notes",
    heroHeadline2: "in your specialty.",
    heroSub:
      "Dictate your ward round. ClinLog structures it into your department's note format — ready to copy into the patient record.",
    exploreSuite: "Explore the suite",
    howData: "How data is handled",

    howItWorks: "How it works",
    narrativeP1:
      "Before the round, you bring up the patient's current status from the electronic health record. ClinLog reads it and holds it ready — vitals, labs, medications — so it's there the moment you start dictating.",
    narrativeP2:
      "You speak the ward round the way you already would: CNS, respiratory, circulatory, and on through the rest. ClinLog combines what you said with the patient context already on hand, and structures both into your department's note format.",
    narrativeP3:
      "The structured note appears ready to review — then copies straight back into the patient record.",
    narrativeSmall:
      "ClinLog is developed independently of any hospital IT department, as commercial clinical software intended for evaluation and adoption by individual departments.",

    theSuite: "The suite",
    suiteHeading: "Three tools, one structuring engine.",

    icuTag: "Intensive care",
    icuDesc:
      "Dictate ward rounds directly into a ten-section ICU template — CNS, respiratory, circulatory, and beyond. Copy structured notes into the patient record in minutes.",
    icuExplore: "Explore ICU",
    icuDemo: "Try the dictation demo",
    icuStatus: "Active development",

    akutTag: "Prehospital",
    akutDesc:
      "Built for the ambulance and the scene. Dictate en route, structured straight into MIST and ABCDE — then transfer via the built-in QR scanner or Bluetooth.",
    akutExplore: "Explore Acute",
    akutStatus: "Active development",

    customTag: "Other specialties",
    customDesc:
      "We build apps for other medical specialties with customized structuring of clinical notes in your specialty's format and terminology. Contact us to learn more.",
    customExplore: "Contact us",
    customStatus: "Enquire",

    trustHeading: "Data handled the way clinical data should be.",
    gdprLabel: "GDPR by design",
    gdprText:
      "All processing runs on EU infrastructure under data processing agreements built for healthcare. Notes are never stored longer than necessary to reach the patient record.",
    structLabel: "Structuring engine",
    structText:
      "Speech structuring is powered by Corti, a clinical AI platform already in use across Danish hospitals, purpose-built for medical documentation.",
    anonLabel: "Anonymisation first",
    anonText:
      "Patient-identifying details are stripped before any note is processed or stored — anonymisation runs as a fixed first step, not an option.",
    controlLabel: "You stay in control",
    controlText:
      "Every structured note is shown for review before it reaches the record. ClinLog assists documentation — it doesn't replace clinical judgement.",

    ctaHeading: "See it in practice.",
    deptLabel: "For your department",
    deptText: "Live walkthrough on a real ward round, with your own note format.",
    clinLabel: "For individual clinicians",
    clinText: "Early access to ClinLog ICU, ready to use this week.",
    requestAccess: "Request access",
    footerCopyright: "Clin-Log ApS · Denmark · pott@clinlog.dk",
  },

  /* ── DEUTSCH ── */
  de: {
    logIn: "Anmelden",
    navIcu: "ICU",
    navAkut: "Akut",
    navCustom: "Custom",

    eyebrow: "Von Klinikern entwickelt, für die Visite",
    heroHeadline1: "Klinische Software für",
    heroHeadlineEm: "strukturierte Notizen",
    heroHeadline2: "in Ihrer Fachrichtung.",
    heroSub:
      "Diktieren Sie Ihre Visite. ClinLog strukturiert sie in das Notizformat Ihrer Abteilung — bereit zur Übertragung in die Patientenakte.",
    exploreSuite: "Produkte entdecken",
    howData: "Datensicherheit",

    howItWorks: "So funktioniert es",
    narrativeP1:
      "Vor der Visite rufen Sie den aktuellen Status des Patienten aus der Patientenakte ab. ClinLog liest ihn und hält ihn bereit — Vitalwerte, Laborwerte, Medikamente — für den Moment, in dem Sie zu diktieren beginnen.",
    narrativeP2:
      "Sie sprechen die Visite so, wie Sie es immer tun würden: ZNS, Atmung, Kreislauf und weiter. ClinLog kombiniert das Gesagte mit dem vorhandenen Patientenkontext und strukturiert beides in das Format Ihrer Abteilung.",
    narrativeP3:
      "Die strukturierte Notiz erscheint zur Überprüfung bereit — und wird direkt in die Patientenakte übertragen.",
    narrativeSmall:
      "ClinLog wird unabhängig von Krankenhaus-IT-Abteilungen als kommerzielle klinische Software entwickelt, die zur Bewertung und Einführung durch einzelne Abteilungen bestimmt ist.",

    theSuite: "Produktpalette",
    suiteHeading: "Drei Werkzeuge, eine Strukturierungs-Engine.",

    icuTag: "Intensivmedizin",
    icuDesc:
      "Diktieren Sie Visiten direkt in eine zehnabschnittlige ICU-Vorlage — ZNS, Atmung, Kreislauf und mehr. Kopieren Sie strukturierte Notizen in wenigen Minuten in die Patientenakte.",
    icuExplore: "ICU erkunden",
    icuDemo: "Diktierdemo ausprobieren",
    icuStatus: "In aktiver Entwicklung",

    akutTag: "Präklinisch",
    akutDesc:
      "Für den Rettungswagen und den Einsatzort entwickelt. Unterwegs diktieren, direkt strukturiert in MIST und ABCDE — Übertragung per QR-Scanner oder Bluetooth.",
    akutExplore: "Acute erkunden",
    akutStatus: "In aktiver Entwicklung",

    customTag: "Andere Fachrichtungen",
    customDesc:
      "Wir entwickeln Apps für andere medizinische Fachrichtungen mit individuell angepasster Strukturierung klinischer Notizen in Ihrem Fachformat und Ihrer Terminologie.",
    customExplore: "Kontakt aufnehmen",
    customStatus: "Anfragen",

    trustHeading: "Datensicherheit, wie klinische Daten es verdienen.",
    gdprLabel: "DSGVO by Design",
    gdprText:
      "Alle Verarbeitungen laufen auf EU-Infrastruktur unter Datenverarbeitungsverträgen für das Gesundheitswesen. Notizen werden nie länger als nötig gespeichert.",
    structLabel: "Strukturierungs-Engine",
    structText:
      "Die Sprachstrukturierung wird von Corti betrieben, einer klinischen KI-Plattform, die bereits in dänischen Krankenhäusern eingesetzt wird und speziell für die medizinische Dokumentation entwickelt wurde.",
    anonLabel: "Anonymisierung zuerst",
    anonText:
      "Patientenidentifizierende Daten werden entfernt, bevor eine Notiz verarbeitet oder gespeichert wird — Anonymisierung ist ein fester erster Schritt, keine Option.",
    controlLabel: "Sie behalten die Kontrolle",
    controlText:
      "Jede strukturierte Notiz wird vor der Übertragung zur Überprüfung angezeigt. ClinLog unterstützt die Dokumentation — es ersetzt nicht das klinische Urteil.",

    ctaHeading: "In der Praxis erleben.",
    deptLabel: "Für Ihre Abteilung",
    deptText: "Live-Demonstration einer echten Visite mit Ihrem eigenen Notizformat.",
    clinLabel: "Für einzelne Kliniker",
    clinText: "Früher Zugang zu ClinLog ICU, sofort einsatzbereit.",
    requestAccess: "Zugang anfragen",
    footerCopyright: "Clin-Log ApS · Dänemark · pott@clinlog.dk",
  },
};

export default translations;
