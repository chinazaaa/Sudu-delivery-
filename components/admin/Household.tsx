"use client";

import { useState } from "react";
import SaveButton from "@/components/SaveButton";

/**
 * The other half of a household, asked for in the words of whichever half
 * you are looking at.
 *
 * This was one tick and two boxes placeholdered "Their name" and "Their
 * number", under a line explaining that on a student it means their parent
 * and on a parent it means their child. Which is true, and is still two
 * sentences of rules to hold in your head before you can type a name into
 * a box. Nobody should have to work out what a field wants.
 *
 * So the tick comes first and decides everything after it. Tick it and the
 * panel asks for a child; leave it and the panel asks for a parent. The
 * labels, the placeholders and the button all follow, and they follow as
 * you tick rather than after saving, because a form that only explains
 * itself once it has been submitted has explained itself too late.
 */
export default function Household({
  phone,
  isParent,
  name,
  number,
  action,
  messageHref,
}: {
  phone: string;
  isParent: boolean;
  name: string;
  number: string;
  action: (form: FormData) => Promise<void>;
  messageHref: string | null;
}) {
  const [parent, setParent] = useState(isParent);

  // The word for the one being described, which is the opposite of the one
  // whose page this is.
  const them = parent ? "child" : "parent";
  const saved = number !== "";

  return (
    <form action={action} className="mt-1 space-y-2.5">
      <input type="hidden" name="phone" value={phone} />

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="is_parent"
          value="1"
          checked={parent}
          onChange={(event) => setParent(event.target.checked)}
          className="size-4"
        />
        This one is the parent
      </label>
      {/* Said once, here, rather than as a rule to apply to the boxes
          below: by the time you reach them they are already asking for
          the right thing. */}
      <p className="hint">
        {parent
          ? "So the number below is their child's."
          : "So the number below is their parent's. Tick it if this one is the parent instead."}
      </p>

      <div>
        <label className="label" htmlFor="household-name">
          The {them}&apos;s name
        </label>
        <input
          id="household-name"
          name="parent_name"
          defaultValue={name}
          placeholder={parent ? "Akili" : "Austin"}
          className="field w-full py-2 text-sm"
        />
      </div>

      <div>
        <label className="label" htmlFor="household-phone">
          The {them}&apos;s number
        </label>
        <input
          id="household-phone"
          name="parent_phone"
          inputMode="tel"
          defaultValue={number}
          placeholder="0803 000 0000, or +44 7440 419145"
          className="field w-full py-2 text-sm"
        />
        <p className="hint">
          Anywhere in the world. Only if they have said so: the customer
          never sees this.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <SaveButton look="btn-admin btn-admin-sm">
          {saved ? "Save" : `Add a ${them}`}
        </SaveButton>
        {/* Straight through to them, with the first line written. Having
            the number and no way to use it is the same as not having it. */}
        {messageHref !== null && (
          <a
            href={messageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-admin btn-admin-sm"
          >
            Message them
          </a>
        )}
      </div>
    </form>
  );
}
