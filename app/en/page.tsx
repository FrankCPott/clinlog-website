import type { Metadata } from "next";
import HomepageShell from "@/components/HomepageShell";

export const metadata: Metadata = {
  title: "ClinLog — Clinical software for structured notes",
  description:
    "Dictate your ward round. ClinLog structures it into your department's note format — ready to copy into the patient record.",
  alternates: {
    languages: {
      da: "https://clinlog.dk/",
      en: "https://clinlog.dk/en",
      de: "https://clinlog.dk/de",
    },
  },
};

export default function Page() {
  return <HomepageShell locale="en" />;
}
