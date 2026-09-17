"use client";

import { useState, useTransition } from "react";
import { fillMyDetails } from "@/app/actions";

/**
 * "I have ordered before." The number and PIN bring back the name and block
 * used last time, so a regular fills the form in two taps and can still edit
 * anything before placing the order.
 *
 * The action is called directly rather than through a second form: checkout is
 * already a form, and a form cannot hold another one.
 */
export default function FillDetails({
  phone,
  onFilled,
}: {
  phone: string;
  onFilled: (me: { name: string; hostel: string; phone: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(phone);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const form = new FormData();
      form.set("phone", number || phone);
      form.set("pin", pin);

      const result = await fillMyDetails({ error: null, me: null }, form);
      if (result.me) {
        onFilled({ ...result.me, phone: number || phone });
        setOpen(false);
        setPin("");
        return;
      }
      setError(result.error ?? "That did not work. Fill it in below instead.");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setNumber(phone || number);
        }}
        className="text-sm font-semibold text-brand"
      >
        Ordered before? Fill this in for me
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-2xl border border-black/10 bg-shell p-3">
      <p className="text-sm font-semibold">Your number and PIN</p>

      <div className="flex flex-wrap gap-2">
        <input
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          className="field grow py-2 text-sm"
        />
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN"
          className="field w-24 py-2 text-sm"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submit();
          }}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || number.replace(/\D/g, "").length < 10}
          className="btn-quiet px-4 py-2 text-sm"
        >
          {pending ? "Checking…" : "Fill it in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-sm font-semibold text-muted"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-muted">
        The PIN came with your first order on WhatsApp. It is asked for so that
        nobody else can look up where you live. No PIN? Just fill the form in.
      </p>
    </div>
  );
}
