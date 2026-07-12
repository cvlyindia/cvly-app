import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = 'Cvly — The interview isn\'t the hard part. Getting one is.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const logoData = readFileSync(join(process.cwd(), 'public', 'logo.png'));
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#FFFFFF',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 56 }}>
          <img src={logoBase64} width={56} height={51} alt="" />
          <span style={{ fontSize: 40, fontWeight: 800, color: '#0B0B0C', letterSpacing: '-0.02em' }}>Cvly</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 62,
            fontWeight: 600,
            color: '#0B0B0C',
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            maxWidth: 980,
          }}
        >
          <span>The interview isn&apos;t the hard part.</span>
          <span style={{ color: '#E85D2C' }}>Getting one is.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 26, color: '#68686E' }}>
          Free ATS resume score, rewrite, cover letter &amp; 100 interview questions
        </div>
      </div>
    ),
    { ...size }
  );
}
