"use client";

/**
 * DictationDemo — offentlig dikterings-demo på clinlog.dk/demo
 *
 * Mikrofon-tilladelsesflow (FASE 2b — 3 states):
 *   A. awaiting-permission  — vist mens browser-dialog afventer svar
 *   B. permission-denied    — afvist; viser browser-specifik vejledning + retry
 *   C. recording/…          — tilladt; fortsætter til eksisterende optagelsesflow
 *
 * Øvrige states: idle → uploading → structuring → done / error / rate_limited
 *
 * ⚠️ DISCLAIMER-TEKST: UDKAST — Frank Pott skal godkende den endelige ordlyd
 *    før funktionen sættes i produktion (jf. FASE 0, punkt 5).
 */

import { useRef, useState, useCallback } from "react";
import s from "./DictationDemo.module.css";

// ── Supabase Edge Function URL ─────────────────────────────────────────────────

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function edgeFn(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

// ── State machine ─────────────────────────────────────────────────────────────

type DemoState =
  | "idle"
  | "awaiting-permission"
  | "permission-denied"
  | "recording"
  | "uploading"
  | "structuring"
  | "done"
  | "error"
  | "rate_limited";

type BrowserType = "chrome" | "edge" | "safari" | "firefox" | "other";
type OSType      = "windows" | "mac" | "other";

interface DemoResult {
  transcript: string;
  sections:   Record<string, string>;
}

// ── Browser- og OS-detektering ────────────────────────────────────────────────

function detectBrowser(): BrowserType {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))                             return "edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua))    return "chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari";
  if (/Firefox\//.test(ua))                         return "firefox";
  return "other";
}

function detectOS(): OSType {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Windows/.test(ua))  return "windows";
  if (/Mac OS X/.test(ua)) return "mac";
  return "other";
}

// ── WAV-encoder (browser-side) ────────────────────────────────────────────────
//
// Konverterer Float32 PCM (fra Web Audio API ved 16 kHz mono) til
// en WAV-fil som Uint8Array — samme format som demo-transcribe-corti forventer.

function encodeWav(pcmFloat32: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = pcmFloat32.length;
  const int16      = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, pcmFloat32[i] * 32768));
  }

  const byteLength = 44 + int16.byteLength;
  const buffer     = new ArrayBuffer(byteLength);
  const view       = new DataView(buffer);

  const setStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  setStr(0,  "RIFF");
  view.setUint32(4,  byteLength - 8,   true);
  setStr(8,  "WAVE");
  setStr(12, "fmt ");
  view.setUint32(16, 16,               true);  // PCM chunk size
  view.setUint16(20, 1,                true);  // PCM format
  view.setUint16(22, 1,                true);  // mono
  view.setUint32(24, sampleRate,       true);
  view.setUint32(28, sampleRate * 2,   true);  // byte rate
  view.setUint16(32, 2,                true);  // block align
  view.setUint16(34, 16,               true);  // bits per sample
  setStr(36, "data");
  view.setUint32(40, int16.byteLength, true);

  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(new Uint8Array(int16.buffer));

  return new Uint8Array(buffer);
}

// ── Uint8Array → base64 ───────────────────────────────────────────────────────
//
// Konverterer direkte uden Blob-intermediær (undgår ArrayBufferLike type-fejl).

function uint8ToBase64(bytes: Uint8Array): string {
  let binary  = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  return btoa(binary);
}

// ── Komponenten ───────────────────────────────────────────────────────────────

export default function DictationDemo() {
  const [demoState,   setDemoState]   = useState<DemoState>("idle");
  const [showModal,   setShowModal]   = useState(true);
  const [accepted,    setAccepted]    = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [result,      setResult]      = useState<DemoResult | null>(null);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [transcript,  setTranscript]  = useState("");
  const [browser,     setBrowser]     = useState<BrowserType>("other");
  const [os,          setOs]          = useState<OSType>("other");
  const [copied,      setCopied]      = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  // ── Kopiér settings-URL til udklipsholder ───────────────────────────────────

  const copySettingsUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API ikke tilgængelig
    }
  }, []);

  // ── Start optagelse (3-state permission flow) ────────────────────────────────

  const startRecording = useCallback(async () => {

    // ── State A: vis interstitial mens browser-dialog afventer ────────────────
    setDemoState("awaiting-permission");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg = String(err);
      if (
        msg.includes("NotAllowed")   ||
        msg.includes("Permission")   ||
        msg.includes("denied")       ||
        msg.includes("NotFound")     ||
        msg.includes("NotReadable")     // Windows OS-niveau blokering: "Could not start audio source"
      ) {
        // ── State B: adgang afvist → vis browser-specifik vejledning ──────────
        setBrowser(detectBrowser());
        setOs(detectOS());
        setDemoState("permission-denied");
      } else {
        setErrorMsg(msg);
        setDemoState("error");
      }
      return;
    }

    // ── State C: adgang givet → start optagelse ────────────────────────────────
    streamRef.current        = stream;
    const recorder           = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current        = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stream.getTracks().forEach(t => t.stop());
      setDemoState("uploading");

      try {
        // Decode audio → 16 kHz mono Float32 PCM via Web Audio API
        const mimeType    = recorder.mimeType || "audio/webm";
        const audioBlob   = new Blob(chunksRef.current, { type: mimeType });
        const arrayBuf    = await audioBlob.arrayBuffer();

        // AudioContext med sampleRate=16000 resampter automatisk
        const audioCtx    = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
        await audioCtx.close();

        // Mix til mono (tag kanal 0)
        const pcmFloat32 = audioBuffer.getChannelData(0);
        const wavBytes   = encodeWav(pcmFloat32, 16000);
        const base64     = uint8ToBase64(wavBytes);

        // POST til demo-transcribe-corti
        const tResp = await fetch(edgeFn("demo-transcribe-corti"), {
          method:  "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({ audioBase64: base64 }),
        });

        if (tResp.status === 429) { setDemoState("rate_limited"); return; }
        if (!tResp.ok) throw new Error(`Transskription fejlede (${tResp.status})`);

        const { text } = await tResp.json() as { text: string };
        setTranscript(text);
        setDemoState("structuring");

        // POST til demo-structure-corti
        const sResp = await fetch(edgeFn("demo-structure-corti"), {
          method:  "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (sResp.status === 429) { setDemoState("rate_limited"); return; }
        if (!sResp.ok) throw new Error(`Strukturering fejlede (${sResp.status})`);

        const { sections } = await sResp.json() as { sections: Record<string, string> };
        setResult({ transcript: text, sections });
        setDemoState("done");

      } catch (err) {
        setErrorMsg(String(err));
        setDemoState("error");
      }
    };

    // Auto-stop ved 60 sekunder
    let secs = 60;
    setSecondsLeft(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setSecondsLeft(secs);
      if (secs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        recorder.stop();
      }
    }, 1000);

    recorder.start(1000); // dataavailable hvert sekund
    setDemoState("recording");
  }, []);

  // ── Stop optagelse manuelt ──────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setDemoState("idle");
    setResult(null);
    setTranscript("");
    setErrorMsg("");
    setSecondsLeft(60);
    setCopied(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={s.demo}>

      {/* ── Disclaimer modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className={s.modalOverlay}>
          <div className={s.modal} role="dialog" aria-modal="true">
            <div className={s.modalIcon} aria-hidden="true">🎙️</div>
            <h2 className={s.modalTitle}>Prøv ClinLog-dikterings&shy;demo</h2>

            {/* ⚠️ UDKAST — tekst skal godkendes af Frank Pott inden go-live */}
            <div className={s.disclaimer}>
              <p><strong>Brug kun en opdigtet, fiktiv patientcase.</strong></p>
              <p>Indsæt ikke rigtige patientnavne, CPR-numre, sygehusnumre eller andre personoplysninger — ikke engang anonymiserede.</p>
              <p>Intet du siger lagres. Lyd og transskript slettes umiddelbart efter denne session, og forlader ikke din browser i genkendelig form.</p>
              <p className={s.disclaimerSmall}>Denne demo er ikke valideret til klinisk brug og må ikke anvendes i patientbehandling.</p>
            </div>

            <div className={s.modalActions}>
              <button
                className={s.btnAccept}
                onClick={() => { setShowModal(false); setAccepted(true); }}
              >
                Jeg forstår — start demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hoved-UI (kun synlig efter accept) ──────────────────────────── */}
      {accepted && (
        <>

          {/* ── idle ── */}
          {demoState === "idle" && (
            <div className={s.stage}>
              <button className={s.micBtn} onClick={startRecording} aria-label="Start optagelse">
                <span className={s.micIcon} aria-hidden="true">🎙️</span>
              </button>
              <p className={s.hint}>Klik for at starte — dikter en kort, opdigtet patientcase</p>
              <p className={s.hintSmall}>Maks 60 sekunder</p>
            </div>
          )}

          {/* ── State A: awaiting-permission ── */}
          {demoState === "awaiting-permission" && (
            <div className={s.stage}>
              <div className={s.permissionWaiting} aria-hidden="true">🎙️</div>
              <p className={s.stateLabel}>Vent et øjeblik…</p>
              <p className={s.hint}>
                Din browser beder nu om adgang til mikrofonen.
              </p>
              <p className={s.hintSmall}>
                Klik <strong>Tillad</strong> i pop-up&apos;en for at starte optagelsen.
              </p>
            </div>
          )}

          {/* ── State B: permission-denied ── */}
          {demoState === "permission-denied" && (
            <div className={s.deniedWrap}>

              <div className={s.deniedHeader}>
                <span className={s.deniedIconLg} aria-hidden="true">🎤</span>
                <div>
                  <p className={s.stateLabel}>Mikrofon-adgang afvist</p>
                  <p className={s.deniedSub}>
                    Tillad mikrofon for denne side og prøv igen.
                  </p>
                </div>
              </div>

              {/* Chrome */}
              {browser === "chrome" && (
                <div className={s.deniedCard}>
                  <p className={s.deniedBrowserPill}>Google Chrome</p>
                  <ol className={s.deniedSteps}>
                    <li>Klik på <strong>🔒</strong> til venstre i adresselinjen</li>
                    <li>Klik på <strong>Mikrofon</strong> → vælg <strong>Tillad</strong></li>
                    <li>Klik <strong>Prøv igen</strong> herunder</li>
                  </ol>
                  <div className={s.settingsBlock}>
                    <span className={s.settingsLabel}>
                      Alternativt — kopiér og indsæt i et nyt Chrome-vindue:
                    </span>
                    <div className={s.settingsUrlRow}>
                      <code className={s.settingsUrl}>chrome://settings/content/microphone</code>
                      <button
                        className={copied ? s.copyBtnDone : s.copyBtn}
                        onClick={() => copySettingsUrl("chrome://settings/content/microphone")}
                        aria-label="Kopiér Chrome-indstillingslink"
                      >
                        {copied ? "✓ Kopieret" : "Kopiér"}
                      </button>
                    </div>
                  </div>
                  {os === "windows" && (
                    <div className={s.windowsNote}>
                      <p className={s.windowsNoteLabel}>
                        Browseren har tilladelse, men Windows blokerer stadig?
                      </p>
                      <ol className={s.deniedSteps}>
                        <li>
                          <kbd>⊞ Win</kbd> → <strong>Indstillinger</strong> →{" "}
                          <strong>Privatliv og sikkerhed</strong> → <strong>Mikrofon</strong>
                        </li>
                        <li>
                          Slå <strong>Giv apps adgang til din mikrofon</strong> <strong>til</strong>
                        </li>
                        <li>
                          Slå <strong>Giv desktopapps adgang til din mikrofon</strong> <strong>til</strong>
                        </li>
                        <li>Prøv igen herunder — eller genstart Chrome hvis fejlen fortsætter</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Edge */}
              {browser === "edge" && (
                <div className={s.deniedCard}>
                  <p className={s.deniedBrowserPill}>Microsoft Edge</p>
                  <ol className={s.deniedSteps}>
                    <li>Klik på <strong>🔒</strong> til venstre i adresselinjen</li>
                    <li>Klik på <strong>Mikrofon</strong> → vælg <strong>Tillad</strong></li>
                    <li>Klik <strong>Prøv igen</strong> herunder</li>
                  </ol>
                  <div className={s.settingsBlock}>
                    <span className={s.settingsLabel}>
                      Alternativt — kopiér og indsæt i et nyt Edge-vindue:
                    </span>
                    <div className={s.settingsUrlRow}>
                      <code className={s.settingsUrl}>edge://settings/content/microphone</code>
                      <button
                        className={copied ? s.copyBtnDone : s.copyBtn}
                        onClick={() => copySettingsUrl("edge://settings/content/microphone")}
                        aria-label="Kopiér Edge-indstillingslink"
                      >
                        {copied ? "✓ Kopieret" : "Kopiér"}
                      </button>
                    </div>
                  </div>
                  {os === "windows" && (
                    <div className={s.windowsNote}>
                      <p className={s.windowsNoteLabel}>
                        Browseren har tilladelse, men Windows blokerer stadig?
                      </p>
                      <ol className={s.deniedSteps}>
                        <li>
                          <kbd>⊞ Win</kbd> → <strong>Indstillinger</strong> →{" "}
                          <strong>Privatliv og sikkerhed</strong> → <strong>Mikrofon</strong>
                        </li>
                        <li>
                          Slå <strong>Giv apps adgang til din mikrofon</strong> <strong>til</strong>
                        </li>
                        <li>
                          Slå <strong>Giv desktopapps adgang til din mikrofon</strong> <strong>til</strong>
                        </li>
                        <li>Prøv igen herunder — eller genstart Edge hvis fejlen fortsætter</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Safari */}
              {browser === "safari" && (
                <div className={s.deniedCard}>
                  <p className={s.deniedBrowserPill}>Safari</p>
                  <ol className={s.deniedSteps}>
                    <li>Gå til <strong>Safari</strong>-menuen → <strong>Indstillinger</strong> <kbd>⌘,</kbd></li>
                    <li>Vælg fanen <strong>Websteder</strong> → <strong>Mikrofon</strong></li>
                    <li>Find <strong>clinlog.dk</strong> i listen → sæt til <strong>Tillad</strong></li>
                    <li>Genindlæs siden og klik &quot;Prøv igen&quot; herunder</li>
                  </ol>
                </div>
              )}

              {/* Firefox */}
              {browser === "firefox" && (
                <div className={s.deniedCard}>
                  <p className={s.deniedBrowserPill}>Firefox</p>
                  <ol className={s.deniedSteps}>
                    <li>Klik på <strong>🔒</strong>-ikonet til venstre i adresselinjen</li>
                    <li>Klik på pilen ved siden af <strong>Tilladelser</strong></li>
                    <li>Under <strong>Brug mikrofon</strong> — fjern &quot;Blokér&quot;</li>
                    <li>Klik &quot;Prøv igen&quot; herunder</li>
                  </ol>
                </div>
              )}

              {/* Other / unknown browser */}
              {browser === "other" && (
                <div className={s.deniedCard}>
                  <ol className={s.deniedSteps}>
                    <li>Åbn browserens indstillinger for webstedstilladelser</li>
                    <li>Find <strong>clinlog.dk</strong> og tillad <strong>Mikrofon</strong></li>
                    <li>Genindlæs siden og prøv igen</li>
                  </ol>
                </div>
              )}

              <div className={s.deniedActions}>
                <button className={s.retryBtn} onClick={startRecording}>
                  Prøv igen
                </button>
                <button className={s.resetBtn} onClick={reset}>
                  Tilbage
                </button>
              </div>

              <p className={s.deniedFallback}>
                Virker det stadig ikke?{" "}
                <a href="mailto:pott@clinlog.dk">Skriv til pott@clinlog.dk</a>
              </p>

            </div>
          )}

          {/* ── recording ── */}
          {demoState === "recording" && (
            <div className={s.stage}>
              <button className={`${s.micBtn} ${s.micBtnActive}`} onClick={stopRecording} aria-label="Stop optagelse">
                <span className={s.micIcon} aria-hidden="true">⏹️</span>
              </button>
              <div className={s.timer} aria-live="polite">
                <span className={s.timerDot} aria-hidden="true" />
                Optager — {secondsLeft} s tilbage
              </div>
              <p className={s.hint}>Klik for at stoppe tidligt</p>
            </div>
          )}

          {/* ── uploading ── */}
          {demoState === "uploading" && (
            <div className={s.stage}>
              <div className={s.spinner} aria-hidden="true" />
              <p className={s.stateLabel}>Transskriberer…</p>
              <p className={s.hintSmall}>Sender til Corti — typisk 5–15 sekunder</p>
            </div>
          )}

          {/* ── structuring ── */}
          {demoState === "structuring" && (
            <div className={s.stage}>
              {transcript && (
                <div className={s.transcriptPreview}>
                  <div className={s.previewLabel}>Transskript</div>
                  <p>{transcript}</p>
                </div>
              )}
              <div className={s.spinner} aria-hidden="true" />
              <p className={s.stateLabel}>Strukturerer…</p>
            </div>
          )}

          {/* ── done ── */}
          {demoState === "done" && result && (
            <div className={s.resultWrap}>
              <div className={s.resultMeta}>
                <div className={s.metaLabel}>Rå transskript (anonymiseret)</div>
                <p className={s.metaText}>{result.transcript || "(tomt)"}</p>
              </div>

              <div className={s.sections}>
                <div className={s.sectionsLabel}>Struktureret note</div>
                {(["ANAMNESE", "OBJEKTIVT", "VURDERING", "PLAN"] as const).map((key) => {
                  const text = result.sections[key];
                  if (!text) return null;
                  return (
                    <div key={key} className={s.section}>
                      <div className={s.sectionHeading}>{key}</div>
                      <p className={s.sectionText}>{text}</p>
                    </div>
                  );
                })}
              </div>

              <div className={s.cta}>
                <p className={s.ctaText}>
                  Se det med din afdelings noteformat og rigtige patientdata fra Sundhedsplatformen.
                </p>
                <a href="mailto:pott@clinlog.dk" className={s.ctaBtn}>
                  Book en demo med din afdeling →
                </a>
              </div>

              <button className={s.resetBtn} onClick={reset}>
                Prøv igen
              </button>
            </div>
          )}

          {/* ── rate_limited ── */}
          {demoState === "rate_limited" && (
            <div className={s.stage}>
              <p className={s.stateLabel}>Mange prøver demoen lige nu</p>
              <p className={s.hint}>Prøv igen om et par minutter.</p>
              <button className={s.resetBtn} onClick={reset}>Tilbage</button>
            </div>
          )}

          {/* ── error ── */}
          {demoState === "error" && (
            <div className={s.stage}>
              <p className={s.stateLabel}>Noget gik galt</p>
              <p className={s.hint}>Prøv igen — og brug en kortere case hvis fejlen gentages.</p>
              {errorMsg && <p className={s.errorDetail}>{errorMsg}</p>}
              <button className={s.resetBtn} onClick={reset}>Prøv igen</button>
            </div>
          )}

        </>
      )}
    </div>
  );
}
