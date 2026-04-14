import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '0Déchets — Signalez les dépôts sauvages en Mauritanie';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#fff7ed',
          position: 'relative',
          fontFamily: 'system-ui, Arial, sans-serif',
        }}
      >
        {/* Left orange bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 14, height: 630, backgroundColor: '#f97316' }} />

        {/* Decorative circle */}
        <div style={{
          position: 'absolute', right: -60, top: '50%',
          width: 520, height: 520,
          borderRadius: '50%',
          backgroundColor: '#f97316',
          opacity: 0.1,
          transform: 'translateY(-50%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', right: 80, top: '50%',
          width: 320, height: 320,
          borderRadius: '50%',
          backgroundColor: '#f97316',
          opacity: 0.12,
          transform: 'translateY(-50%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 100, paddingRight: 600, gap: 0 }}>
          {/* App name */}
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f97316', letterSpacing: 2, marginBottom: 32 }}>
            0DÉCHETS.COM
          </div>

          {/* Headline */}
          <div style={{ fontSize: 80, fontWeight: 800, color: '#1f2937', lineHeight: 1.1, marginBottom: 48 }}>
            Signalez les dépôts sauvages
          </div>

          {/* CTA button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f97316',
            color: 'white',
            fontSize: 30,
            fontWeight: 700,
            borderRadius: 50,
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 44,
            paddingRight: 44,
            width: 'fit-content',
          }}>
            Signaler maintenant →
          </div>
        </div>

        {/* Leaf icon on the right */}
        <div style={{
          position: 'absolute',
          right: 160,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
        }}>
          <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.25 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" fill="#f97316" fillOpacity="0.3" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
