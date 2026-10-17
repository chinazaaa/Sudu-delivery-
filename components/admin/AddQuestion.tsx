"use client";

import { useState } from "react";
import Sheet from "@/components/Sheet";
import SaveButton from "@/components/SaveButton";

/**
 * Add a question to any section, from the top of the page.
 *
 * The add forms used to sit at the bottom of whichever section you were
 * looking at, so putting a question on the parents page meant choosing
 * that tab and then scrolling past its eight questions to reach the box.
 * Six sections, six scrolls, and the only thing all that scrolling
 * communicated was which section the question was going into.
 *
 * So the section is a dropdown and the form is one tap from the top. It
 * opens on whichever tab you are already looking at, because that is
 * nearly always the answer.
 */
export default function AddQuestion({
  sections,
  current,
  action,
}: {
  sections: { value: string; label: string }[];
  current: string;
  action: (form: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(current);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSection(current);
          setOpen(true);
        }}
        className="btn-admin-go btn-admin-sm"
      >
        Add a question
      </button>

      {open && (
        <Sheet title="Add a question" onClose={() => setOpen(false)}>
          <form action={action} className="space-y-3">
            <div>
              <label className="label" htmlFor="add_section">
                Which section
              </label>
              <select
                id="add_section"
                name="section"
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="field w-full"
              >
                {sections.map((one) => (
                  <option key={one.value} value={one.value}>
                    {one.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="add_question">
                The question
              </label>
              <input
                id="add_question"
                name="question"
                required
                className="field w-full"
                placeholder="Can I send something every month?"
              />
            </div>

            <div>
              <label className="label" htmlFor="add_answer">
                The answer, in your words
              </label>
              <textarea
                id="add_answer"
                name="answer"
                required
                rows={4}
                className="field w-full"
              />
            </div>

            {/* Only the chat matches on wording. A question printed down a
                page is read, not searched, so asking for other wordings
                there would be a box that does nothing. */}
            {section === "chat" && (
              <div>
                <label className="label" htmlFor="add_keywords">
                  Other ways people ask it
                </label>
                <input
                  id="add_keywords"
                  name="keywords"
                  className="field w-full"
                  placeholder="delivery fee, how much is delivery, fees"
                />
                <p className="hint mt-1">
                  Comma separated. This is what makes it get found: nobody
                  types the question the way it is written above.
                </p>
              </div>
            )}

            <SaveButton>Add it</SaveButton>
          </form>
        </Sheet>
      )}
    </>
  );
}
