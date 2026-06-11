import { colors } from '../theme';

export default function LoadingScreen({ fadingOut = false }: { fadingOut?: boolean }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: colors.bg,
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 300ms ease',
        pointerEvents: fadingOut ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes predictx-spin { to { transform: rotate(360deg); } }
        @keyframes predictx-pop {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ textAlign: 'center', animation: 'predictx-pop 450ms ease-out' }}>
        <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.5 }}>
          <span style={{ color: colors.text }}>Predict</span>
          <span style={{ color: colors.accent }}>X</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: colors.textDim, letterSpacing: 3, fontWeight: 600 }}>
          ADMIN DASHBOARD
        </div>
      </div>

      <div
        style={{
          position: 'absolute', bottom: 90,
          width: 28, height: 28, borderRadius: '50%',
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.accent,
          animation: 'predictx-spin 800ms linear infinite',
        }}
      />
    </div>
  );
}
