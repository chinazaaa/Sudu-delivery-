"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import { feeByStep, serialiseStepFee, type StepFee } from "@/lib/step-fee";

/**
 * Delivery priced by the cool box rather than by the thing.
 *
 * Fantasy ice cream is small and the people who buy it buy a lot: fifteen
 * is one cool box, thirty is two. On the container ladder fifteen prices as
 * fifteen takeaway boxes, which is a number nobody pays; on the value
 * ladder it prices as whatever fifteen small ice creams cost, which has
 * nothing to do with the room they take.
 *
 * And it is not a stop the car makes for its own sake. It is grabbed on the
 * way past, so what this sets is the floor the trip cannot go under rather
 * than something added on top: three pizzas and an ice cream pays for the
 * pizzas.
 *
 * Empty leaves this restaurant on the ordinary ladder.
 */
export default function StepFeeEditor({ initial }: { initial: StepFee | null }) {
  const [steps, setSteps] = useState<{
    first: string;
    firstFee: string;
    step: string;
    stepFee: string;
  } | null>(
    initial === null
      ? null
      : {
          first: String(initial.first),
          firstFee: String(initial.firstFee),
          step: String(initial.step),
          stepFee: String(initial.stepFee),
        }
  );

  const parsed: StepFee | null =
    steps === null
      ? null
      : {
          first: Number(steps.first) || 0,
          firstFee: Number(steps.firstFee) || 0,
          step: Number(steps.step) || 0,
          stepFee: Number(steps.stepFee) || 0,
        };

  const usable = parsed !== null && parsed.first >= 1 && parsed.step >= 1;

  const edit = (patch: Partial<NonNullable<typeof steps>>) =>
    setSteps((now) => (now === null ? now : { ...now, ...patch }));

  const digits = (said: string) => said.replace(/\D/g, "");

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name="step_fee"
        value={usable ? serialiseStepFee(parsed) : ""}
      />

      {steps === null ? (
        <p className="text-sm text-muted">
          On the ordinary ladder, which counts containers.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-shell p-2.5">
            <div className="w-24">
              <label className="label">The first</label>
              <input
                value={steps.first}
                inputMode="numeric"
                onChange={(event) => edit({ first: digits(event.target.value) })}
                className="field py-1.5 text-sm"
                aria-label="How many the first price covers"
              />
            </div>
            <div className="w-32">
              <label className="label">cost</label>
              <input
                value={steps.firstFee}
                inputMode="numeric"
                onChange={(event) => edit({ firstFee: digits(event.target.value) })}
                className="field py-1.5 text-sm"
                aria-label="What the first lot costs to bring"
              />
            </div>
            <div className="w-24">
              <label className="label">then every</label>
              <input
                value={steps.step}
                inputMode="numeric"
                onChange={(event) => edit({ step: digits(event.target.value) })}
                className="field py-1.5 text-sm"
                aria-label="How many each further lot is"
              />
            </div>
            <div className="w-32">
              <label className="label">adds</label>
              <input
                value={steps.stepFee}
                inputMode="numeric"
                onChange={(event) => edit({ stepFee: digits(event.target.value) })}
                className="field py-1.5 text-sm"
                aria-label="What each further lot adds"
              />
            </div>
          </div>

          {/* What it actually charges, worked out rather than described.
              A rule with two numbers in it is a rule somebody should be
              able to read back before they save it. */}
          {usable && parsed !== null && (
            <p className="text-xs text-muted">
              {parsed.first} is {naira(parsed.firstFee)}.{" "}
              {parsed.first + 1} is {naira(feeByStep(parsed.first + 1, parsed))}.{" "}
              {parsed.first + parsed.step} is{" "}
              {naira(feeByStep(parsed.first + parsed.step, parsed))}.{" "}
              {parsed.first + parsed.step * 2} is{" "}
              {naira(feeByStep(parsed.first + parsed.step * 2, parsed))}. Part of
              a lot is a lot, because the box still has to go.
            </p>
          )}
          {!usable && (
            <p className="text-xs font-semibold text-brand-dark">
              The first lot and the step both have to be at least one, or this
              is ignored and the ordinary ladder stands.
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() =>
          setSteps(
            steps === null
              ? { first: "15", firstFee: "4000", step: "15", stepFee: "500" }
              : null
          )
        }
        className="chip border-black/10 bg-white py-1.5 text-xs"
      >
        {steps === null ? "Price it by the box" : "Back to the ordinary ladder"}
      </button>
    </div>
  );
}
