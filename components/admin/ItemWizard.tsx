"use client";

import { useState } from "react";
import OptionBuilder from "./OptionBuilder";
import SaveButton from "@/components/SaveButton";

const STEPS = ["The item", "Choices", "Photo"];

/**
 * Adding a product, one screen at a time: what it is, what can be chosen on
 * it, and what it looks like. It is one form throughout, so nothing is saved
 * half-finished; the steps only decide what is on screen.
 */
export default function ItemWizard({
  restaurantId,
  categories,
  action,
}: {
  restaurantId: string;
  categories: { id: string; name: string }[];
  action: (form: FormData) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const ready = name.trim().length > 0 && price.trim().length > 0;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="restaurant_id" value={restaurantId} />

      <ol className="flex gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                step === index
                  ? "border-ink bg-ink text-white"
                  : "border-black/10 bg-white text-muted"
              }`}
            >
              <span className="block text-xs opacity-70">Step {index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {/* Every step stays mounted, so nothing typed is lost by stepping back. */}
      <section className={`card space-y-3 ${step === 0 ? "" : "hidden"}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="item-name">What is it called?</label>
            <input
              id="item-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Pepperoni pizza"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="item-price">Base price</label>
            <input
              id="item-price"
              name="price_food"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="8600"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              The cheapest version. Sizes and extras add to this.
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="item-category">Category</label>
          <select id="item-category" name="category_id" className="field">
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="item-description">Description</label>
          <input
            id="item-description"
            name="description"
            placeholder="Pepperoni, mozzarella, tomato sauce"
            className="field"
          />
        </div>

        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={!ready}
          className="btn-primary w-full"
        >
          Next: choices
        </button>
      </section>

      <section className={`card space-y-3 ${step === 1 ? "" : "hidden"}`}>
        <div>
          <h2 className="font-bold">Sizes, crusts, flavours, extras</h2>
          <p className="text-sm text-muted">
            Anything the customer picks on the product page. A price change of 0
            means that choice costs the same as the base price.
          </p>
        </div>

        <OptionBuilder />

        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(0)} className="btn-quiet flex-1">
            Back
          </button>
          <button type="button" onClick={() => setStep(2)} className="btn-primary flex-1">
            Next: photo
          </button>
        </div>
      </section>

      <section className={`card space-y-3 ${step === 2 ? "" : "hidden"}`}>
        <div>
          <label className="label" htmlFor="item-photo">Upload a photo</label>
          <input
            id="item-photo"
            name="photo"
            type="file"
            accept="image/*"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="item-image-url">Or paste a link</label>
          <input
            id="item-image-url"
            name="image_url"
            placeholder="https://..."
            className="field"
          />
        </div>
        <p className="text-xs text-muted">
          Skip this and the item shows a tile with its initial until a photo is
          added.
        </p>

        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(1)} className="btn-quiet flex-1">
            Back
          </button>
          <SaveButton>Save item</SaveButton>
        </div>
      </section>

      {!ready && step > 0 && (
        <p className="text-sm text-brand">
          Go back to step one: an item needs a name and a price.
        </p>
      )}
    </form>
  );
}
