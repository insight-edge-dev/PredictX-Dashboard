import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { colors, cardStyle, labelStyle, inputStyle, badge, actionBtn } from '../theme';
import type { LeagueMonitorEntry } from './MatchesPage';

interface JobStatus {
  name: string;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastError?: string | null;
  lastErrorAt?: string;
}

interface CacheEntry {
  key: string;
  ttlMs: number | null;
}

interface SportmonksStatus {
  limited: boolean;
  until: number | null;
}

interface HealthResponse {
  leagues: LeagueMonitorEntry[];
  jobs: JobStatus[];
  cache: CacheEntry[];
  sportmonks: SportmonksStatus;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function humanizeTtl(ms: number | null): string {
  if (ms === null) return 'no expiry';
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshingSlug, setRefreshingSlug] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [maintenanceAction, setMaintenanceAction] = useState<string | null>(null);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  // Prediction resolver state
  const [resolveRunning, setResolveRunning]     = useState(false);
  const [resolveMsg, setResolveMsg]             = useState('');
  const [resolveMatchId, setResolveMatchId]     = useState('');
  const [resolveWinner, setResolveWinner]       = useState('');
  const [resolveMatchLoading, setResolveMatchLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<HealthResponse>('/admin/health')
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh(slug: string) {
    setRefreshingSlug(slug);
    try {
      await api.post(`/admin/refresh/${slug}`, {});
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshingSlug(null);
    }
  }

  async function handleMaintenance(action: string, label: string, endpoint: string) {
    if (!window.confirm(`${label} — are you sure? This cannot be undone.`)) return;
    setMaintenanceAction(action);
    setMaintenanceMsg('');
    try {
      const res = await api.post(endpoint, {}) as { message?: string };
      setMaintenanceMsg(res.message ?? 'Done');
      load();
    } catch (e: any) {
      setMaintenanceMsg(`Error: ${e.message}`);
    } finally {
      setMaintenanceAction(null);
    }
  }

  const cacheGroups = data
    ? Object.entries(
        data.cache.reduce<Record<string, CacheEntry[]>>((acc, entry) => {
          const prefix = entry.key.split(':')[0];
          (acc[prefix] ??= []).push(entry);
          return acc;
        }, {})
      ).sort((a, b) => b[1].length - a[1].length)
    : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, margin: 0 }}>🩺 System Health</h2>
        <button onClick={load} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>
          {loading ? 'Refreshing…' : '↻ Refresh all'}
        </button>
      </div>

      {loading && !data && <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: colors.danger, fontSize: 14 }}>Error: {error}</p>}

      {data && (
        <>
          {/* Sportsmonks quota */}
          <div style={{ ...cardStyle, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: colors.textMuted, fontSize: 13, fontWeight: 700 }}>Sportsmonks API:</span>
            {data.sportmonks.limited
              ? <span style={badge(colors.warning)}>⏳ Rate-limited until {new Date(data.sportmonks.until!).toLocaleTimeString()}</span>
              : <span style={badge(colors.success)}>✅ OK</span>}
          </div>

          {/* Per-league freshness */}
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Leagues &amp; Buckets</h3>
          <div style={{ ...cardStyle, padding: 0, marginBottom: 32, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {['League', 'Sport', 'Live', 'Upcoming', 'Completed', ''].map(h => (
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
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textDim, fontSize: 12 }}>{l.sport}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: l.live > 0 ? colors.danger : colors.textDim, fontSize: 14, fontWeight: l.live > 0 ? 800 : 500 }}>{l.live}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{l.upcoming}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{l.completed}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRefresh(l.slug)}
                        disabled={refreshingSlug === l.slug}
                        style={actionBtn(colors.surfaceAlt, colors.accent)}
                      >
                        {refreshingSlug === l.slug ? '…' : 'Refresh'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scheduled jobs */}
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Scheduled Jobs</h3>
          <div style={{ ...cardStyle, padding: 0, marginBottom: 32, overflow: 'hidden' }}>
            {data.jobs.length === 0 ? (
              <p style={{ color: colors.textDim, fontSize: 14, padding: 16 }}>No jobs have run yet since the last server restart.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {['Job', 'Last run', 'Last success', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Job' ? 'left' : 'center', padding: '12px 16px', color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map(j => (
                    <tr key={j.name} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '12px 16px', color: colors.text, fontSize: 14, fontWeight: 600 }}>{j.name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 13 }}>{timeAgo(j.lastRunAt)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 13 }}>{timeAgo(j.lastSuccessAt)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {j.lastError
                          ? <span style={badge(colors.danger)} title={j.lastError}>⚠️ {j.lastError.slice(0, 40)}</span>
                          : <span style={badge(colors.success)}>✅ OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Maintenance actions */}
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 32 }}>Maintenance</h3>
          {maintenanceMsg && (
            <p style={{ color: maintenanceMsg.startsWith('Error') ? colors.danger : colors.success, fontSize: 13, marginBottom: 12 }}>
              {maintenanceMsg}
            </p>
          )}
          <div style={{ ...cardStyle, padding: 16, marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {[
              { action: 'flush',        label: 'Flush all caches',    endpoint: '/admin/cache/flush',    danger: false },
              { action: 'reset',        label: 'Reset matches & squads', endpoint: '/admin/reset-matches', danger: true  },
              { action: 'fix-squads',   label: 'Fix empty squads',    endpoint: '/admin/fix-empty-squads', danger: false },
            ].map(({ action, label, endpoint, danger }) => (
              <button
                key={action}
                disabled={maintenanceAction === action}
                onClick={() => handleMaintenance(action, label, endpoint)}
                style={{
                  ...actionBtn(danger ? colors.danger : colors.surfaceAlt, danger ? '#fff' : colors.text),
                  opacity: maintenanceAction && maintenanceAction !== action ? 0.5 : 1,
                }}
              >
                {maintenanceAction === action ? '…' : label}
              </button>
            ))}
          </div>

          {/* Prediction Resolver */}
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 4, marginTop: 32 }}>Prediction Resolver</h3>
          <p style={{ color: colors.textDim, fontSize: 12, marginBottom: 16 }}>
            Runs automatically every 30 min. Use "Run Now" after a big match finishes to resolve user predictions immediately.
          </p>
          {resolveMsg && (
            <p style={{ color: resolveMsg.startsWith('✓') ? colors.success : colors.danger, fontSize: 13, marginBottom: 12 }}>
              {resolveMsg}
            </p>
          )}
          <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: colors.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Auto-scan all pending predictions</div>
                <div style={{ color: colors.textDim, fontSize: 12 }}>Checks every cricket league + international bucket + football matches and resolves any finished ones.</div>
              </div>
              <button
                disabled={resolveRunning}
                onClick={async () => {
                  setResolveRunning(true);
                  setResolveMsg('');
                  try {
                    const res = await api.post('/admin/resolve-scan', {}) as { resolved?: number; message?: string };
                    setResolveMsg(`✓ ${res.message ?? 'Scan complete'}`);
                  } catch (e: any) {
                    setResolveMsg('Error: ' + e.message);
                  } finally {
                    setResolveRunning(false);
                    setTimeout(() => setResolveMsg(''), 8000);
                  }
                }}
                style={{ ...actionBtn(colors.accent + '20', colors.accent), fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                {resolveRunning ? '⏳ Running…' : '▶ Run Now'}
              </button>
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 16, marginBottom: 32 }}>
            <div style={{ color: colors.text, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Manually resolve a specific match</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>MATCH ID</label>
                <input
                  value={resolveMatchId}
                  onChange={e => setResolveMatchId(e.target.value)}
                  placeholder="e.g. 556789 or wc26_001"
                  style={{ ...inputStyle, width: 200 }}
                />
              </div>
              <div>
                <label style={labelStyle}>WINNER (exact team name or "draw" or "void")</label>
                <input
                  value={resolveWinner}
                  onChange={e => setResolveWinner(e.target.value)}
                  placeholder='e.g. Spain, India, draw, void'
                  style={{ ...inputStyle, width: 240 }}
                />
              </div>
              <button
                disabled={resolveMatchLoading || !resolveMatchId.trim() || !resolveWinner.trim()}
                onClick={async () => {
                  setResolveMatchLoading(true);
                  setResolveMsg('');
                  try {
                    const res = await api.post('/admin/resolve-match', { matchId: resolveMatchId.trim(), winner: resolveWinner.trim() }) as { resolved?: number };
                    setResolveMsg(`✓ Match ${resolveMatchId} resolved — ${res.resolved ?? 0} prediction(s) updated`);
                    setResolveMatchId('');
                    setResolveWinner('');
                  } catch (e: any) {
                    setResolveMsg('Error: ' + e.message);
                  } finally {
                    setResolveMatchLoading(false);
                    setTimeout(() => setResolveMsg(''), 6000);
                  }
                }}
                style={{ ...actionBtn(colors.surfaceAlt, colors.text), alignSelf: 'flex-end' }}
              >
                {resolveMatchLoading ? '…' : 'Resolve'}
              </button>
            </div>
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Winner must match exactly what users picked — check Supabase <code>user_match_predictions.predicted_winner</code> for the exact string.
            </p>
          </div>

          {/* Cache entries, grouped by key prefix */}
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Cache ({data.cache.length} keys)
          </h3>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {cacheGroups.map(([prefix, entries], i) => {
              const isExpanded = expandedGroup === prefix;
              return (
                <div key={prefix} style={{ borderBottom: i < cacheGroups.length - 1 || isExpanded ? `1px solid ${colors.border}` : 'none' }}>
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : prefix)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>{isExpanded ? '▾' : '▸'} {prefix}</span>
                    <span style={{ color: colors.textDim, fontSize: 12 }}>{entries.length} key{entries.length === 1 ? '' : 's'}</span>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 16px 12px' }}>
                      {entries.map(e => (
                        <div key={e.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                          <span style={{ color: colors.textBody, fontFamily: 'monospace' }}>{e.key}</span>
                          <span style={{ color: colors.textDim }}>{humanizeTtl(e.ttlMs)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
