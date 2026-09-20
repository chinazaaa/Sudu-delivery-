import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * What Android reads to believe the app owns these links.
 *
 * It checks the signing certificate rather than taking the app's word, so
 * this carries the SHA-256 fingerprint of whatever key signs the build. That
 * is a different key for a Play Store build than for one sideloaded off EAS,
 * and both can be listed: ANDROID_CERT_SHA256 takes a comma separated list.
 *
 *   eas credentials       (look for the SHA-256 fingerprint)
 *   Play Console → Setup → App signing
 *
 * Until it is set this answers 404, because an empty list claims the app is
 * signed by nothing and Android caches the answer.
 */
export function GET(): NextResponse {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((one) => one.trim().toUpperCase())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    return NextResponse.json(
      { error: "ANDROID_CERT_SHA256 is not set, so there is nothing to claim yet." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: process.env.ANDROID_PACKAGE ?? "store.sudu.app",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "content-type": "application/json" } }
  );
}
