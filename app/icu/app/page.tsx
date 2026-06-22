"use client";

// Siden er fuldt session-afhængig — ingen statisk prerendering
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import LoginForm from "@/components/LoginForm";
import NoteViewer from "@/components/NoteViewer";
import SpPasteView from "@/components/SpPasteView";

type Tab = "notater" | "sp";

export default function IcuApp() {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [tab, setTab]         = useState<Tab>("notater");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={session ? "h-screen flex flex-col" : "min-h-screen"}>

      {/* ── Top bar ── */}
      <header className="bg-[#1e2a3a] px-5 flex items-center justify-between flex-shrink-0">
        {/* Logo + tabs on one row */}
        <div className="flex items-center gap-6">
          <span className="text-white font-semibold text-xl tracking-tight py-3.5">
            Clin<span className="text-blue-400">Log</span>{" "}
            <span className="text-white">ICU</span>
          </span>

          {session && (
            <nav className="flex items-center gap-0.5 h-full">
              {(["notater", "sp"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "px-3 py-3.5 text-sm border-b-2 transition-colors",
                    tab === t
                      ? "border-blue-400 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200",
                  ].join(" ")}
                >
                  {t === "notater" ? "Dikteringsnotater" : "SP-import"}
                </button>
              ))}
            </nav>
          )}
        </div>

        {session && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-400 hover:text-white transition-colors py-3.5"
          >
            Log ud
          </button>
        )}
      </header>

      {/* ── Main ── */}
      {session ? (
        <main className="flex-1 overflow-hidden flex">
          {tab === "notater" && <NoteViewer userId={session.user.id} />}
          {tab === "sp"      && <SpPasteView />}
        </main>
      ) : (
        <main className="max-w-sm mx-auto px-4 py-12">
          <LoginForm />
          <footer className="text-center text-xs text-slate-400 mt-8">
            Notater anonymiseres og gemmes i 24 timer · Verificér output før brug
          </footer>
        </main>
      )}
    </div>
  );
}
