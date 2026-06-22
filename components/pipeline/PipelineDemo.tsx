'use client';

/**
 * components/pipeline/PipelineDemo.tsx
 *
 * Selvkørende pipeline-animation til clinlog.dk — tilpasset fra
 * /reference/PipelineStatus.web.tsx med følgende ændringer:
 *
 *  - Farver remappet til sitedesign-tokens (--clinical-blue, --paper osv.)
 *    via Tailwind arbitrary-value syntax; emerald-500 (medicinsk grøn) beholdes.
 *  - slim-prop: strippper card-chrome (bg/border/shadow) når komponenten er
 *    monteret inde i et eksisterende produktkort.
 *  - usePrefersReducedMotion: ved reduceret bevægelse vises statisk
 *    "done"-tilstand (alle sektioner udfyldt) — ingen timers starter.
 *  - PipelineDemoCard: eksporteret wrapper med IntersectionObserver (tærskel 30%)
 *    der starter autoPlay først når kortet ruller ind i viewporten.
 *
 * Visual design (dot-størrelser, fase-labels, skeleton-rækker, waveform,
 * timing) er uændret fra reference.
 *
 * Brug i page.tsx (Server Component):
 *   import { PipelineDemoCard } from "@/components/pipeline/PipelineDemo";
 *   <PipelineDemoCard />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── prefers-reduced-motion ────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ── Typer ─────────────────────────────────────────────────────────────────────

export type PipelinePhase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'anonymising'
  | 'structuring'
  | 'done';

const PHASE_LABELS: Record<PipelinePhase, string> = {
  idle:        '',
  recording:   'Optager',
  transcribing:'Transskriberer',
  anonymising: 'Anonymiserer',
  structuring: 'Strukturerer note',
  done:        'Note klar',
};

const PHASE_ORDER: PipelinePhase[] = [
  'recording', 'transcribing', 'anonymising', 'structuring', 'done',
];

const SECTIONS = [
  'CNS', 'RESPIRATORISK', 'CIRKULATORISK', 'GASTROINTESTINALT',
  'RENALT', 'SYSTEMISK', 'KOAGULATION', 'MIKROBIOLOGISK', 'VURDERING', 'PLAN',
];

const ALL_SECTIONS_FILLED = new Set(SECTIONS);

// Fiktivt demo-transskript — ingen rigtig patient.
const DEMO_TRANSCRIPT =
  'Patienten er hæmodynamisk stabil natten over. Ingen pressorbehov. ' +
  'Respiratorisk uændret på trykstøtte, FiO2 0,3. Diurese tilfredsstillende. ' +
  'CRP faldende. Plan: fortsat aftrapning af sedation, mobilisering i dag.';

// ── PipelineDemo ───────────────────────────────────────────────────────────────

interface PipelineDemoProps {
  autoPlay?:     boolean;
  loop?:         boolean;
  /** ms per fase (ekskl. recording som styres af transcript-længden) */
  phaseDuration?: number;
  /**
   * Når true strippes card-chrome (bg/border/rounded/shadow/padding).
   * Brug når komponenten er monteret inde i et eksisterende produktkort.
   */
  slim?:         boolean;
}

export function PipelineDemo({
  autoPlay      = true,
  loop          = true,
  phaseDuration = 1400,
  slim          = false,
}: PipelineDemoProps) {
  const prefersReduced = usePrefersReducedMotion();

  const [phase,          setPhase]          = useState<PipelinePhase>('idle');
  const [streamedText,   setStreamedText]   = useState('');
  const [filledSections, setFilledSections] = useState<Set<string>>(new Set());
  const [audioLevel,     setAudioLevel]     = useState(0);

  const runDemo = useCallback(() => {
    let cancelled = false;
    const timers:    ReturnType<typeof setTimeout>[]  = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    // Fase 1: recording — stream ord + simuleret waveform
    setPhase('recording');
    setStreamedText('');
    setFilledSections(new Set());

    const words = DEMO_TRANSCRIPT.split(' ');
    let wordIndex = 0;
    const wordInterval = setInterval(() => {
      if (cancelled) return;
      wordIndex++;
      setStreamedText(words.slice(0, wordIndex).join(' '));
      if (wordIndex >= words.length) clearInterval(wordInterval);
    }, 110);
    intervals.push(wordInterval);

    const audioInterval = setInterval(() => {
      if (cancelled) return;
      setAudioLevel(0.25 + Math.random() * 0.75);
    }, 90);
    intervals.push(audioInterval);

    const recordingDuration = words.length * 110 + 400;

    // Fase 2: transcribing
    timers.push(setTimeout(() => {
      if (cancelled) return;
      clearInterval(audioInterval);
      setPhase('transcribing');
    }, recordingDuration));

    // Fase 3: anonymising
    timers.push(setTimeout(() => {
      if (cancelled) return;
      setPhase('anonymising');
    }, recordingDuration + phaseDuration));

    // Fase 4: structuring — fyld sektioner ud én ad gangen
    timers.push(setTimeout(() => {
      if (cancelled) return;
      setPhase('structuring');
      SECTIONS.forEach((key, i) => {
        timers.push(setTimeout(() => {
          if (cancelled) return;
          setFilledSections(prev => new Set(prev).add(key));
        }, i * 160));
      });
    }, recordingDuration + phaseDuration * 2));

    // Fase 5: done
    const doneAt = recordingDuration + phaseDuration * 2 + SECTIONS.length * 160 + 300;
    timers.push(setTimeout(() => {
      if (cancelled) return;
      setPhase('done');
    }, doneAt));

    // Loop
    if (loop) {
      timers.push(setTimeout(() => {
        if (cancelled) return;
        runDemo();
      }, doneAt + 2200));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [loop, phaseDuration]);

  useEffect(() => {
    // prefers-reduced-motion: vis statisk done-tilstand, start ingen timers
    if (prefersReduced) {
      setPhase('done');
      setFilledSections(ALL_SECTIONS_FILLED);
      return;
    }
    if (!autoPlay) return;
    return runDemo();
  }, [autoPlay, runDemo, prefersReduced]);

  const inner = (
    <>
      <PhaseHeader phase={phase} />

      {phase === 'recording' && (
        <>
          <Waveform level={audioLevel} />
          <p className="mt-4 min-h-[3.5rem] text-sm leading-relaxed text-[#4A5568]">
            {streamedText}
            <span className="inline-block w-[2px] h-4 ml-0.5 bg-[#5B9BC0] animate-pulse align-middle" />
          </p>
        </>
      )}

      {phase === 'transcribing' && (
        <div className="py-2">
          <TranscribingWaveform />
        </div>
      )}

      {phase === 'anonymising' && (
        <div className="py-4">
          <PulseDots />
          <p className="mt-3 text-center text-xs text-[#8B9A8C]">
            Fjerner CPR, navne og kontaktoplysninger
          </p>
        </div>
      )}

      {(phase === 'structuring' || phase === 'done') && (
        <SectionSkeleton filled={filledSections} />
      )}
    </>
  );

  if (slim) {
    return <div className="w-full">{inner}</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-[rgba(22,36,58,0.12)] bg-[#F7F5F0] p-6 shadow-sm">
      {inner}
    </div>
  );
}

// ── PhaseHeader ───────────────────────────────────────────────────────────────

function PhaseHeader({ phase }: { phase: PipelinePhase }) {
  if (phase === 'idle') return null;
  const currentIndex = PHASE_ORDER.indexOf(phase);
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-semibold text-[#16243A]">
        {PHASE_LABELS[phase]}
      </span>
      <div className="flex gap-1.5">
        {PHASE_ORDER.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
              i <= currentIndex ? 'bg-emerald-500' : 'bg-[#EFEBE2]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Waveform ──────────────────────────────────────────────────────────────────

function Waveform({ level }: { level: number }) {
  const seedsRef = useRef(
    Array.from({ length: 28 }, () => 0.4 + Math.random() * 0.6)
  );
  return (
    <div className="flex items-end justify-center gap-[3px] h-10 mt-3">
      {seedsRef.current.map((seed, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-[#3B7A9E] transition-[height] duration-100 ease-out"
          style={{ height: `${4 + Math.min(1, level * seed) * 28}px` }}
        />
      ))}
    </div>
  );
}

// ── PulseDots ─────────────────────────────────────────────────────────────────
// Keyframe 'clinlog-pulse' er defineret i app/globals.css
// Bruges kun til anonymising-fasen.

function PulseDots() {
  return (
    <div className="flex justify-center items-center gap-2 h-6">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[#3B7A9E]"
          style={{
            animation: 'clinlog-pulse 1.1s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── TranscribingWaveform ──────────────────────────────────────────────────────
// Progresscirkel + lydbølge vist under transskribering.
//
// Cirklen animerer fra 0 → ~85 % over 14 s med aftagende hastighed
// (cubic-bezier), så den aldrig selvstændigt fuldfører — den venter på at
// faseskiftet sker. Søjlerne pulserer organisk i stagger.
// Alt kører i CSS via én inline <style> — ingen JS-timers.

const RING_R    = 24;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 150.8

const TRANSCRIBING_KEYFRAMES = `
  @keyframes clinlog-wavebar {
    0%, 100% { height: 3px;  opacity: 0.45; }
    50%       { height: 24px; opacity: 1;    }
  }
  @keyframes clinlog-ring {
    from { stroke-dashoffset: ${RING_CIRC.toFixed(1)}; }
    to   { stroke-dashoffset: ${(RING_CIRC * 0.05).toFixed(1)}; }
  }
`;

function TranscribingWaveform() {
  const BARS = 20;
  const seeds = useRef(
    Array.from({ length: BARS }, (_, i) => ({
      duration: 0.65 + (i % 7) * 0.11,
      delay:    (i * 0.055).toFixed(2),
    }))
  );

  return (
    <>
      <style>{TRANSCRIBING_KEYFRAMES}</style>

      {/* Fremskridtscirkel */}
      <div className="flex justify-center mt-2 mb-0">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          {/* Spor */}
          <circle cx="32" cy="32" r={RING_R}
            fill="none" stroke="#EFEBE2" strokeWidth="5" />
          {/* Fremskridtsbue */}
          <circle cx="32" cy="32" r={RING_R}
            fill="none" stroke="#3B7A9E" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC.toFixed(1)}
            strokeDashoffset={RING_CIRC.toFixed(1)}
            transform="rotate(-90 32 32)"
            style={{
              animation: `clinlog-ring 25s cubic-bezier(0.35, 0, 0.55, 1) forwards`,
            }}
          />
        </svg>
      </div>

      {/* Lydbølge */}
      <div className="flex items-end justify-center gap-[3px] h-8 mt-1 mb-1">
        {seeds.current.map((s, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-[#3B7A9E]"
            style={{
              animation: `clinlog-wavebar ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
              minHeight: 3,
            }}
          />
        ))}
      </div>
    </>
  );
}

// ── SectionSkeleton ───────────────────────────────────────────────────────────

function SectionSkeleton({
  filled,
  sections = SECTIONS,
}: {
  filled:     Set<string>;
  sections?:  string[];
}) {
  return (
    <div className="mt-3 space-y-2">
      {sections.map((key) => {
        const isFilled = filled.has(key);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] font-medium text-[#8B9A8C]">
              {key}
            </span>
            <div
              className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                isFilled ? 'bg-emerald-500' : 'bg-[#EFEBE2] animate-pulse'
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

// ── PipelineStatus — eksternt styret, til brug i DictationDemo ───────────────
//
// Modtager `phase` og `filledSections` udefra — ingen egne timers.
// Bruges i /demo under transcribing → anonymising → structuring → done.
//
// Brug:
//   <PipelineStatus phase="transcribing" sections={['ANAMNESE', 'OBJEKTIVT', ...]} />
//   <PipelineStatus phase="structuring"  sections={DEMO_SECTIONS} filledSections={filledSections} />

export interface PipelineStatusProps {
  phase:            PipelinePhase;
  /** 0..1 — bruges kun i 'recording'-fasen (waveform) */
  audioLevel?:      number;
  /** Sektioner der er udfyldt (vises grønne). Default: tom Set */
  filledSections?:  Set<string>;
  /** Sektionsliste — default er de 10 ICU-sektioner.
   *  Demo-siden sender ['ANAMNESE', 'OBJEKTIVT', 'VURDERING', 'PLAN']. */
  sections?:        string[];
}

export function PipelineStatus({
  phase,
  audioLevel    = 0,
  filledSections = new Set<string>(),
  sections      = SECTIONS,
}: PipelineStatusProps) {
  return (
    <div className="w-full">
      <PhaseHeader phase={phase} />

      {phase === 'recording' && <Waveform level={audioLevel} />}

      {phase === 'transcribing' && (
        <div className="py-2">
          <TranscribingWaveform />
        </div>
      )}

      {phase === 'anonymising' && (
        <div className="py-4">
          <PulseDots />
          <p className="mt-3 text-center text-xs text-[#8B9A8C]">
            Fjerner CPR, navne og kontaktoplysninger
          </p>
        </div>
      )}

      {(phase === 'structuring' || phase === 'done') && (
        <SectionSkeleton filled={filledSections} sections={sections} />
      )}
    </div>
  );
}

// ── PipelineDemoCard — click-to-play + link til /demo, til brug i page.tsx ────
//
// Viser en "Se det i aktion"-placeholder indtil brugeren klikker.
// Klik starter animationen. Nedenunder er der altid et link til /demo
// så brugeren kan prøve diktering selv.

export function PipelineDemoCard() {
  const [started, setStarted] = useState(false);

  return (
    <div className="border-t border-[rgba(22,36,58,0.10)]">

      {/* Placeholder / animation-område */}
      <div className="px-5 pt-4 pb-1">
        {!started ? (
          /* Idle-tilstand: klik for at starte */
          <button
            onClick={() => setStarted(true)}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-lg
                       bg-[#F0EDE6] hover:bg-[#E8E4DC] transition-colors duration-200
                       text-[#4A5568] cursor-pointer border-0 group"
            aria-label="Se pipeline-animationen"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
              ▶
            </span>
            <span className="text-xs font-medium text-[#8B9A8C]">
              Se diktering → note i aktion
            </span>
          </button>
        ) : (
          <PipelineDemo autoPlay loop slim />
        )}
      </div>

      {/* Link til den interaktive demo — altid synlig */}
      <div className="px-5 pb-4 pt-2">
        <a
          href="/demo"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#3B7A9E]
                     hover:text-[#5B9BC0] transition-colors duration-150"
        >
          Prøv diktering selv
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M3 8H13M13 8L9 4M13 8L9 12"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

    </div>
  );
}

export default PipelineDemo;
