"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

/** The whole screen, not a card floating in the shop's chrome. */
export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, { error: null });

  return (
    <div className="fixed inset-0 z-50 grid overflow-y-auto bg-ink lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-brand to-brand-dark p-10 text-white lg:flex">
        <span className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/20 text-xl font-black">
            S
          </span>
          Sudu Delivery
        </span>
        <div>
          <p className="text-3xl font-extrabold leading-tight">
            Runs, orders, customers and menus, in one place.
          </p>
          <p className="mt-3 max-w-sm text-white/80">
            Sangotedo to Pan-Atlantic University. Batched, paid up front, and
            delivered to the hostels.
          </p>
        </div>
        <p className="text-sm text-white/70">Staff only.</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <form
          action={action}
          className="w-full max-w-sm space-y-4 rounded-3xl bg-paper p-6 shadow-lift"
        >
          <div>
            <h1 className="text-2xl font-extrabold">Sign in</h1>
            <p className="text-sm text-muted">The admin password, nothing else.</p>
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="field"
            />
          </div>

          {state.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-3.5" disabled={pending}>
            {pending ? "Checking…" : "Sign in"}
          </button>

          <a href="/" className="block text-center text-sm font-semibold text-muted hover:text-brand">
            Back to the shop
          </a>
        </form>
      </main>
    </div>
  );
}
