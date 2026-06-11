import { useState, useEffect } from 'react';
import { api } from '../api';
import { colors, cardStyle, badge } from '../theme';

export interface LeagueMonitorEntry {
  slug: string; name: string; flag: string; sport: 'cricket' | 'football' | 'international';
  live: number; upcoming: number; completed: number; error?: boolean;
}

export interface LiveMonitorMatch {
  id: string; league: string; leagueName: string; flag: string;
  team1: string; team2: string;
  score1: string | number | null; score2: string | number | null;
  matchDesc: string; venue: string; status: string; hasScoreData: boolean;
}

export interface MonitorResponse {
  leagues: LeagueMonitorEntry[];
  live: LiveMonitorMatch[];
}

export default function MatchesPage() {
  const [data, setData] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<MonitorResponse>('/admin/monitor')
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🏏 Match Monitor</h2>

      {loading && <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: colors.danger, fontSize: 14 }}>Error: {error}</p>}

      {data && (
        <>
          {/* Per-league summary table */}
          <div style={{ ...cardStyle, padding: 0, marginBottom: 32, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {['League', 'Live', 'Upcoming', 'Completed'].map(h => (
                    <th key={h} style={{ textAlign: h === 'League' ? 'left' : 'center', padding: '12px 16px', color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.leagues.map(l => (
                  <tr key={l.slug} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px', color: colors.text, fontSize: 14, fontWeight: 600 }}>
                      {l.flag} {l.name}
                      {l.error && <span style={{ ...badge(colors.danger), marginLeft: 8 }}>ERROR</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: l.live > 0 ? colors.danger : colors.textDim, fontSize: 14, fontWeight: l.live > 0 ? 800 : 500 }}>{l.live}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{l.upcoming}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{l.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live matches */}
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Live Matches ({data.live.length})
          </h3>
          {data.live.length === 0
            ? <p style={{ color: colors.textDim, fontSize: 14 }}>No matches are currently live.</p>
            : data.live.map(m => (
              <div key={`${m.league}-${m.id}`} style={{ ...cardStyle, padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={badge(colors.info)}>{m.flag} {m.leagueName}</span>
                    {m.hasScoreData
                      ? <span style={badge(colors.success)}>✅ Score data OK</span>
                      : <span style={badge(colors.warning)}>⚠️ No score data</span>}
                  </div>
                  <div style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>{m.team1} vs {m.team2}</div>
                  {(m.matchDesc || m.venue) && (
                    <div style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>
                      {[m.matchDesc, m.venue].filter(Boolean).join(' · ')}
                    </div>
                  )}
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
