import { colors } from '../theme';
import type { Page } from '../pages/Dashboard';

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'overview',     label: 'Overview',     icon: '📊' },
  { page: 'predictions',  label: 'Predictions',  icon: '🎯' },
  { page: 'notifications',label: 'Notifications',icon: '🔔' },
  { page: 'users',        label: 'Users',        icon: '👥' },
  { page: 'matches',      label: 'Matches',      icon: '🏏' },
];

export default function Sidebar({ page, onNavigate, onLogout }: {
  page: Page;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
}) {
  return (
    <div style={{
      width: 220, flexShrink: 0, minHeight: '100vh',
      background: colors.surface, borderRight: `1px solid ${colors.border}`,
      display: 'flex', flexDirection: 'column', padding: '20px 14px',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -1 }}>
          <span style={{ color: colors.text }}>Predict</span><span style={{ color: colors.accent }}>X</span>
        </div>
        <div style={{
          background: colors.accent + '15', border: `1px solid ${colors.accent}30`,
          borderRadius: 6, padding: '3px 8px',
          color: colors.accent, fontSize: 10, fontWeight: 700, letterSpacing: 1,
        }}>
          ADMIN
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = page === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 8, border: 'none',
                background: active ? colors.surfaceAlt : 'transparent',
                color: active ? colors.accent : colors.textMuted,
                fontSize: 14, fontWeight: active ? 700 : 500,
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={onLogout}
        style={{
          background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8,
          color: colors.textMuted, padding: '10px 14px', cursor: 'pointer', fontSize: 13,
          marginTop: 12,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
