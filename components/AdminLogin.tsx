"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, { error: null });

  return (
    <form action={action} className="card mx-auto max-w-sm space-y-3">
      <h1 className="text-lg font-semibold">Admin</h1>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required className="field" />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
