"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6 text-center">
        Log ind
      </h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="din@email.dk"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Adgangskode
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Logger ind…" : "Log ind"}
        </button>
      </form>
    </div>
  );
}
