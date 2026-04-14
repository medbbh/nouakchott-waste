import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = '0Déchets — Signalez les dépôts sauvages en Mauritanie';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: '#fff7ed',
          position: 'relative',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Left orange bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: '14px', height: '630px',
          backgroundColor: '#f97316',
          display: 'flex',
        }} />

        {/* Big decorative circle background right */}
        <div style={{
          position: 'absolute', right: '-80px', top: '50px',
          width: '500px', height: '500px',
          borderRadius: '50%',
          backgroundColor: '#fed7aa',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', right: '80px', top: '165px',
          width: '280px', height: '280px',
          borderRadius: '50%',
          backgroundColor: '#fdba74',
          display: 'flex',
        }} />

        {/* Content left side */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '100px',
          paddingRight: '520px',
          gap: '0px',
          height: '100%',
        }}>
          {/* App name */}
          <div style={{
            fontSize: '30px',
            fontWeight: '700',
            color: '#f97316',
            letterSpacing: '3px',
            marginBottom: '36px',
          }}>
            0DÉCHETS.COM
          </div>

          {/* Headline */}
          <div style={{
            fontSize: '76px',
            fontWeight: '800',
            color: '#1f2937',
            lineHeight: '1.1',
            marginBottom: '52px',
          }}>
            Signalez les dépôts sauvages
          </div>

          {/* CTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f97316',
            color: 'white',
            fontSize: '28px',
            fontWeight: '700',
            borderRadius: '50px',
            paddingTop: '18px',
            paddingBottom: '18px',
            paddingLeft: '40px',
            paddingRight: '40px',
          }}>
            Signaler maintenant →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
