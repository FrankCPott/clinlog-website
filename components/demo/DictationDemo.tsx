"use client";

/**
 * DictationDemo — offentlig dikterings-demo på clinlog.dk/demo
 *
 * Flow:
 *   1. Disclaimer modal → bruger accepterer
 *   2. Mikrofon-adgang via getUserMedia()
 *   3. Optagelse via MediaRecorder (max 60 s, auto-stop)
 *   4. Web Audio API: decode → resample til 16 kHz mono → WAV
 *   5. POST base64-WAV til demo-transcribe-corti Edge Function
 *   6. POST transskript til demo-structure-corti Edge Function
 *   7. Vis transskript + strukturerede sektioner + CTA
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
  | "recording"
  | "uploading"
  | "structuring"
  | "done"
  | "error"
  | "rate_limited"
  | "mic_denied";

interface DemoResult {
  transcript: string;
  sections:   Record<string, string>;
}

// ── WAV-encoder (browser-side) ────────────────────────────────────────────────
//
// Konverterer Float32 PCM (fra Web Audio API ved 16 kHz mono) til
// en WAV-fil som Uint8Array — samme format som transcribe-corti forventer.

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
  view.setUint32(4,  byteLength - 8,     true);
  setStr(8,  "WAVE");
  setStr(12, "fmt ");
  view.setUint32(16, 16,                 true);  // PCM chunk size
  view.setUint16(20, 1,                  true);  // PCM format
  view.setUint16(22, 1,                  true);  // mono
  view.setUint32(24, sampleRate,         true);
  view.setUint32(28, sampleRate * 2,     true);  // byte rate
  view.setUint16(32, 2,                  true);  // block align
  view.setUint16(34, 16,                 true);  // bits per sample
  setStr(36, "data");
  view.setUint32(40, int16.byteLength,   true);

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
  const [demoState,    setDemoState]    = useState<DemoState>("idle");
  const [showModal,    setShowModal]    = useState(true);
  const [accepted,     setAccepted]     = useState(false);
  const [secondsLeft,  setSecondsLeft]  = useState(60);
  const [result,       setResult]       = useState<DemoResult | null>(null);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [transcript,   setTranscript]   = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  // ── Start optagelse ─────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder   = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current        = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop timer
        if (timerRef.current) clearInterval(timerRef.current);
        stream.getTracks().forEach(t => t.stop());
        setDemoState("uploading");

        try {
          // Decode audio → 16 kHz mono Float32 PCM via Web Audio API
          const mimeType   = recorder.mimeType || "audio/webm";
          const audioBlob  = new Blob(chunksRef.current, { type: mimeType });
          const arrayBuf   = await audioBlob.arrayBuffer();

          // AudioContext med sampleRate=16000 resamplet automatisk
          const audioCtx   = new AudioContext({ sampleRate: 16000 });
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
          await audioCtx.close();

          // Mix til mono (tag kanal 0)
          const pcmFloat32 = audioBuffer.getChannelData(0);
          const wavBytes = encodeWav(pcmFloat32, 16000);
          const base64   = uint8ToBase64(wavBytes);

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

    } catch (err) {
      const msg = String(err);
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setDemoState("mic_denied");
      } else {
        setErrorMsg(msg);
        setDemoState("error");
      }
    }
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

            {/* ⚠️ UDKAST — disclaimer-tekst skal godkendes af Frank Pott inden go-live */}
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

          {/* idle */}
          {demoState === "idle" && (
            <div className={s.stage}>
              <button className={s.micBtn} onClick={startRecording} aria-label="Start optagelse">
                <span className={s.micIcon} aria-hidden="true">🎙️</span>
              </button>
              <p className={s.hint}>Klik for at starte — dikter en kort, opdigtet patientcase</p>
              <p className={s.hintSmall}>Maks 60 sekunder</p>
            </div>
          )}

          {/* recording */}
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

          {/* uploading */}
          {demoState === "uploading" && (
            <div className={s.stage}>
              <div className={s.spinner} aria-hidden="true" />
              <p className={s.stateLabel}>Transskriberer…</p>
              <p className={s.hintSmall}>Sender til Corti — typisk 5–15 sekunder</p>
            </div>
          )}

          {/* structuring */}
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

          {/* done */}
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

          {/* rate_limited */}
          {demoState === "rate_limited" && (
            <div className={s.stage}>
              <p className={s.stateLabel}>Mange prøver demoen lige nu</p>
              <p className={s.hint}>Prøv igen om et par minutter.</p>
              <button className={s.resetBtn} onClick={reset}>Tilbage</button>
            </div>
          )}

          {/* mic_denied */}
          {demoState === "mic_denied" && (
            <div className={s.stage}>
              <p className={s.stateLabel}>Mikrofon-adgang afvist</p>
              <p className={s.hint}>
                Tillad mikrofon-adgang i browseren og prøv igen.
                I Chrome: klik på hængelåsikonet øverst til venstre i adresselinjen.
              </p>
              <button className={s.resetBtn} onClick={reset}>Prøv igen</button>
            </div>
          )}

          {/* error */}
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
