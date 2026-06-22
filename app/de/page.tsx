import type { Metadata } from "next";
import HomepageShell from "@/components/HomepageShell";

export const metadata: Metadata = {
  title: "ClinLog — Klinische Software für strukturierte Dokumentation",
  description:
    "Diktieren Sie Ihre Visite. ClinLog strukturiert sie in das Notizformat Ihrer Abteilung — bereit zur Übertragung in die Patientenakte.",
  alternates: {
    languages: {
      da: "https://clinlog.dk/",
      en: "https://clinlog.dk/en",
      de: "https://clinlog.dk/de",
    },
  },
};

export default function Page() {
  return <HomepageShell locale="de" />;
}
