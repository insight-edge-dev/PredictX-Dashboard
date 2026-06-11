import { useState, useEffect } from 'react';
import { api } from '../api';
import { colors, cardStyle, badge } from '../theme';
import StatCard from '../components/StatCard';
import type { Page } from './Dashboard';
import type { LiveMonitorMatch } from './MatchesPage';

interface OverviewStats {
  users:         { total: number; newThisWeek: number };
  predictions:   { total: number; published: number; draft: number };
  notifications: { total: number; sent: number; scheduled: number };
  liveMatchCount: number;
  liveMatches:    LiveMonitorMatch[];
}

export default function OverviewPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<OverviewStats>('/admin/overview')
      .then(setStats)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>📊 Overview</h2>

      {loading && <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: colors.danger, fontSize: 14 }}>Error: {error}</p>}

      {stats && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
            <StatCard icon="👥" label="Total Users" value={stats.users.total} sublabel={`+${stats.users.newThisWeek} this week`} />
            <StatCard icon="🎯" label="Published Predictions" value={stats.predictions.published} accent={colors.success} />
            <StatCard icon="📝" label="Draft Predictions" value={stats.predictions.draft} accent={colors.warning} />
            <StatCard icon="🔔" label="Notifications Sent" value={stats.notifications.sent} />
            <StatCard icon="⏰" label="Notifications Scheduled" value={stats.notifications.scheduled} accent={colors.warning} />
            <StatCard icon="🔴" label="Live Matches Now" value={stats.liveMatchCount} accent={stats.liveMatchCount > 0 ? colors.danger : undefined} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Live Now</h3>
            <button
              onClick={() => onNavigate('matches')}
              style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.accent, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              View match monitor →
            </button>
          </div>

          {stats.liveMatches.length === 0
            ? <p style={{ color: colors.textDim, fontSize: 14 }}>No matches are currently live.</p>
            : stats.liveMatches.map(m => (
              <div key={`${m.league}-${m.id}`} style={{ ...cardStyle, padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={badge(colors.info)}>{m.flag} {m.leagueName}</span>
                    {!m.hasScoreData && <span style={badge(colors.warning)}>⚠️ No score data</span>}
                  </div>
                  <div style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>{m.team1} vs {m.team2}</div>
                </div>
                <div style={{ color: colors.text, fontSize: 16, fontWeight: 800 }}>
                  {m.score1 ?? '—'} : {m.score2 ?? '—'}
                </div>
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}
