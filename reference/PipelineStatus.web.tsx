/**
 * PipelineStatus.web.tsx
 * clinlog.dk — demo-animation der viser optagelse → transskribering →
 * anonymisering → strukturering, til brug på fx forsiden eller en
 * "se det i aktion"-sektion.
 *
 * Forskel fra app-versionen: her må vi gerne "sælge" lidt mere, så vi
 * tilføjer den levende streaming-tekst-effekt (punkt #2 fra anbefalingen) —
 * den demonstrerer visuelt produktets hastighed for en besøgende der ikke
 * selv dikterer. Pipeline-status og skeleton er ellers identisk i ånd
 * med app-komponenten, så besøgende genkender produktet hvis de ser begge.
 *
 * Ren React/Tailwind, ingen eksterne animations-libs nødvendige
 * (bruger CSS keyframes + simple intervals).
 *
 * Brug:
 *   <PipelineDemo autoPlay loop />
 *
 * Til en RIGTIG (ikke-demo) statusvisning, hvor I binder phase op på jeres
 * faktiske WebSocket/Edge Function-events, brug i stedet <PipelineStatus />
 * eksporteret nedenfor med jeres egne props (samme interface som native-
 * versionen, så logikken er let at genkende på tværs af platforme).
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Typer — bevidst identiske med PipelineStatus.native.tsx, så app og website
// deler mental model selvom implementeringen er platform-specifik.
// ---------------------------------------------------------------------------
export type PipelinePhase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'anonymising'
  | 'structuring'
  | 'done';

const PHASE_LABELS: Record<PipelinePhase, string> = {
  idle: '',
  recording: 'Optager',
  transcribing: 'Transskriberer',
  anonymising: 'Anonymiserer',
  structuring: 'Strukturerer note',
  done: 'Note klar',
};

const PHASE_ORDER: PipelinePhase[] = [
  'recording',
  'transcribing',
  'anonymising',
  'structuring',
  'done',
];

const SECTIONS = [
  'CNS',
  'RESPIRATORISK',
  'CIRKULATORISK',
  'GASTROINTESTINALT',
  'RENALT',
  'SYSTEMISK',
  'KOAGULATION',
  'MIKROBIOLOGISK',
  'VURDERING',
  'PLAN',
];

// Eksempel-transskription til demoen — fiktiv, ikke en rigtig patient.
const DEMO_TRANSCRIPT =
  'Patienten er hæmodynamisk stabil natten over. Ingen pressorbehov. ' +
  'Respiratorisk uændret på trykstøtte, FiO2 0,3. Diurese tilfredsstillende. ' +
  'CRP faldende. Plan: fortsat aftrapning af sedation, mobilisering i dag.';

// =============================================================================
// DEMO-KOMPONENT — selvkørende, til marketing/hjemmeside
// =============================================================================
interface PipelineDemoProps {
  autoPlay?: boolean;
  loop?: boolean;
  /** ms pr. fase (ekskl. recording, som styres af transcript-længden) */
  phaseDuration?: number;
}

export function PipelineDemo({
  autoPlay = true,
  loop = true,
  phaseDuration = 1400,
}: PipelineDemoProps) {
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [streamedText, setStreamedText] = useState('');
  const [filledSections, setFilledSections] = useState<Set<string>>(new Set());
  const [audioLevel, setAudioLevel] = useState(0);

  const runDemo = useCallback(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    // --- Fase 1: recording — stream ord for ord + simuleret waveform ---
    setPhase('recording');
    setStreamedText('');
    setFilledSections(new Set());

    const words = DEMO_TRANSCRIPT.split(' ');
    let wordIndex = 0;
    const wordInterval = setInterval(() => {
      if (cancelled) return;
      wordIndex++;
      setStreamedText(words.slice(0, wordIndex).join(' '));
      if (wordIndex >= words.length) {
        clearInterval(wordInterval);
      }
    }, 110);
    intervals.push(wordInterval);

    const audioInterval = setInterval(() => {
      if (cancelled) return;
      setAudioLevel(0.25 + Math.random() * 0.75);
    }, 90);
    intervals.push(audioInterval);

    const recordingDuration = words.length * 110 + 400;

    // --- Fase 2: transcribing ---
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        clearInterval(audioInterval);
        setPhase('transcribing');
      }, recordingDuration)
    );

    // --- Fase 3: anonymising ---
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhase('anonymising');
      }, recordingDuration + phaseDuration)
    );

    // --- Fase 4: structuring — fyld sektioner ud én ad gangen ---
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhase('structuring');
        SECTIONS.forEach((key, i) => {
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setFilledSections((prev) => new Set(prev).add(key));
            }, i * 160)
          );
        });
      }, recordingDuration + phaseDuration * 2)
    );

    // --- Fase 5: done ---
    const doneAt =
      recordingDuration + phaseDuration * 2 + SECTIONS.length * 160 + 300;
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhase('done');
      }, doneAt)
    );

    // --- Loop ---
    if (loop) {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          runDemo();
        }, doneAt + 2200)
      );
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [loop, phaseDuration]);

  useEffect(() => {
    if (!autoPlay) return;
    const cleanup = runDemo();
    return cleanup;
  }, [autoPlay, runDemo]);

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <PhaseHeader phase={phase} />

      {phase === 'recording' && (
        <>
          <Waveform level={audioLevel} />
          <p className="mt-4 min-h-[3.5rem] text-sm leading-relaxed text-slate-600">
            {streamedText}
            <span className="inline-block w-[2px] h-4 ml-0.5 bg-blue-500 animate-pulse align-middle" />
          </p>
        </>
      )}

      {(phase === 'transcribing' || phase === 'anonymising') && (
        <div className="py-4">
          <PulseDots />
          {phase === 'anonymising' && (
            <p className="mt-3 text-center text-xs text-slate-400">
              Fjerner CPR, navne og kontaktoplysninger
            </p>
          )}
        </div>
      )}

      {(phase === 'structuring' || phase === 'done') && (
        <SectionSkeleton filled={filledSections} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fase-header
// ---------------------------------------------------------------------------
function PhaseHeader({ phase }: { phase: PipelinePhase }) {
  if (phase === 'idle') return null;
  const currentIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-semibold text-slate-800">
        {PHASE_LABELS[phase]}
      </span>
      <div className="flex gap-1.5">
        {PHASE_ORDER.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
              i <= currentIndex ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waveform (CSS-baseret, ingen libs)
// ---------------------------------------------------------------------------
function Waveform({ level }: { level: number }) {
  const seedsRef = useRef(
    Array.from({ length: 28 }, () => 0.4 + Math.random() * 0.6)
  );

  return (
    <div className="flex items-end justify-center gap-[3px] h-10 mt-3">
      {seedsRef.current.map((seed, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-blue-500 transition-[height] duration-100 ease-out"
          style={{ height: `${4 + Math.min(1, level * seed) * 28}px` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pulserende prikker (ren ventetid, intet signal at vise)
// ---------------------------------------------------------------------------
function PulseDots() {
  return (
    <div className="flex justify-center items-center gap-2 h-6">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-blue-500"
          style={{
            animation: 'clinlog-pulse 1.1s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes clinlog-pulse {
          0%,
          100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton af organsystem-sektioner
// ---------------------------------------------------------------------------
function SectionSkeleton({ filled }: { filled: Set<string> }) {
  return (
    <div className="mt-3 space-y-2">
      {SECTIONS.map((key) => {
        const isFilled = filled.has(key);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] font-medium text-slate-500">
              {key}
            </span>
            <div
              className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                isFilled ? 'bg-emerald-500' : 'bg-slate-200 animate-pulse'
              }`}
            />
            {isFilled && (
              <span className="text-[11px] font-bold text-emerald-500">✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PipelineDemo;
