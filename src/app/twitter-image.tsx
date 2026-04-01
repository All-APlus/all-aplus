import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '올A+ | AI 학습 비서';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 70%, #1e1b4b 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129, 140, 248, 0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
          </svg>
        </div>

        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          올A+
        </div>

        <div
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: 'rgba(199, 210, 254, 0.9)',
            marginBottom: '40px',
            display: 'flex',
          }}
        >
          대학 강의를 위한 AI 학습 비서
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {['RAG 자료 검색', '지속 메모리', '교수 성향 분석', '퀴즈 생성'].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: '8px 20px',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(224, 231, 255, 0.9)',
                  fontSize: '16px',
                  fontWeight: 500,
                  display: 'flex',
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
