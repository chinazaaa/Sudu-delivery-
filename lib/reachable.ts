/**
 * Whether the browser thinks it can reach anything at all.
 *
 * Every page that refreshes itself has to ask. A refresh that cannot reach
 * the server throws, the error boundary catches it, and somebody who did
 * nothing but come back to a tab is shown an error over their own order. A
 * phone that has been asleep in a pocket is the common case, not the rare
 * one.
 *
 * It only ever says no when the browser is certain, because `onLine` is true
 * on a connection that is merely terrible. That is the right way round: this
 * stops the refreshes nobody could have wanted, and the error boundary
 * handles the ones that get through and fail anyway.
 */
export function canReach(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
