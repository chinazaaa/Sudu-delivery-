"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { joinParty } from "./GroupLink";

/** Takes the token, then sends them straight to the food. */
export default function JoinParty({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    joinParty(token);
    router.replace("/?joined=1");
  }, [token, router]);

  return (
    <div className="card mx-auto mt-10 max-w-sm space-y-2 text-center">
      <h1 className="text-xl font-bold">You are in</h1>
      <p className="text-sm text-muted">
        Add your food and it rides in the same delivery. Opening the menu…
      </p>
    </div>
  );
}
