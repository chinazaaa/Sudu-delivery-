import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * Something asked again and again, but only while somebody is looking at it.
 *
 * A plain setInterval on a phone does not stop when the app goes away. The
 * timer keeps firing in the background until the system gets around to
 * suspending the whole app, which on a phone left in a pocket can be
 * minutes, and every firing is a question asked of the shop that nobody is
 * there to read the answer to. A group board asked every eight seconds that
 * way is four hundred and fifty questions an hour from a phone face down on
 * a desk.
 *
 * So it asks only while the app is in front, and asks once the moment it
 * comes back, which is when the screen is most out of date and exactly when
 * somebody is about to read it. The website's own order and admin screens
 * have worked this way for a while, by watching the tab instead of the app;
 * this is the same rule said in the phone's words.
 */
export function useWhileWatching(work: () => void, every: number): void {
  useEffect(() => {
    // Straight away, so a screen never opens empty waiting on a timer.
    work();

    const ask = () => {
      if (AppState.currentState === "active") work();
    };
    const timer = setInterval(ask, every);

    // Coming back to the app is the one moment worth an extra question.
    const watch = AppState.addEventListener("change", (now) => {
      if (now === "active") work();
    });

    return () => {
      clearInterval(timer);
      watch.remove();
    };
  }, [work, every]);
}
