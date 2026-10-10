/**
 * web-push ships no types of its own and there is no @types package for it
 * that is worth a dependency. This declares the three things lib/admin-alerts
 * actually calls, so a typo in one of them is still caught at build time
 * rather than at the moment somebody's phone was supposed to buzz.
 */
declare module "web-push" {
  export type PushSubscription = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  export class WebPushError extends Error {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    endpoint: string;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: { TTL?: number; urgency?: string; topic?: string }
  ): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>;

  const webpush: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
    WebPushError: typeof WebPushError;
  };
  export default webpush;
}
