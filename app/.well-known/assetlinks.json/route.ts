import { NextResponse } from 'next/server';

// Android App Links verification — Android fetches this to confirm
// com.zdechets.app is allowed to intercept https://www.0dechets.com links.
// SHA-256 fingerprints: add both debug (for testing) and release (for Play Store).
// To get release fingerprint:
//   keytool -list -v -keystore zdechets-keystore.jks -alias key0
const assetLinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.zdechets.app',
      sha256_cert_fingerprints: [
        // Debug certificate (for testing APKs built locally)
        'F5:E6:8E:CC:B3:DE:A9:91:53:CF:F6:B2:35:14:A8:06:C9:FE:2C:FC:26:1D:DD:70:E5:45:C2:F6:FB:50:B6:DA',
        // TODO: replace with release certificate fingerprint before Play Store submission
        // Run: keytool -list -v -keystore C:\Users\hp\zdechets-keystore.jks -alias key0
      ],
    },
  },
];

export async function GET() {
  return NextResponse.json(assetLinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
