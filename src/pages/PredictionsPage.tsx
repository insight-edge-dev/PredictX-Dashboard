import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { colors, labelStyle, inputStyle, btnStyle, actionBtn, badge } from '../theme';

interface Match    { id: string; label: string; date: string; }
interface League   { slug: string; name: string; short: string; flag: string; }
interface Prediction {
  id: string; match_id: string | null; match_label: string | null; league_id: string | null;
  predicted_winner: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  analysis: string; is_published: boolean; created_at: string; updated_at: string;
}

type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
const EMPTY_FORM: { match_id: string; match_label: string; predicted_winner: string; confidence: Confidence; analysis: string; is_published: boolean } =
  { match_id: '', match_label: '', predicted_winner: '', confidence: 'HIGH', analysis: '', is_published: true };

const FOOTBALL_SLUGS = new Set(['wc2026']);

// All known leagues hardcoded — league list never depends on backend state.
// The API is only called for match fetching (per-league match picker).
const LEAGUE_GROUPS: { group: string; sport: 'cricket' | 'football' | 'international'; leagues: League[] }[] = [
  {
    group: '🏏 Cricket Leagues',
    sport: 'cricket',
    leagues: [
      { slug: 'ipl',      name: 'Indian Premier League',        short: 'IPL',      flag: '🏏' },
      { slug: 'bbl',      name: 'Big Bash League',              short: 'BBL',      flag: '🦘' },
      { slug: 'psl',      name: 'Pakistan Super League',        short: 'PSL',      flag: '🟢' },
      { slug: 'bpl',      name: 'Bangladesh Premier League',    short: 'BPL',      flag: '🟥' },
      { slug: 't20blast', name: 'T20 Blast',                    short: 'T20 Blast',flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { slug: 't20wc',    name: "ICC Men's T20 World Cup",       short: 'T20 WC',   flag: '🌍' },
      { slug: 'wwct20',   name: "ICC Women's T20 World Cup",     short: 'WWCT20',   flag: '🏆' },
      { slug: 'gsl',      name: 'Global Super League',          short: 'GSL',      flag: '🌐' },
      { slug: 'csa_t20',  name: 'CSA T20 Challenge',            short: 'CSA T20',  flag: '🦁' },
    ],
  },
  {
    group: '⚽ Football',
    sport: 'football',
    leagues: [
      { slug: 'wc2026', name: 'FIFA World Cup 2026', short: 'WC 2026', flag: '🏆' },
    ],
  },
  {
    group: '🌍 International Cricket',
    sport: 'international',
    leagues: [
      { slug: 't20i', name: 'Twenty20 International (Men)',   short: 'T20I',       flag: '🏏' },
    ],
  },
];

// Flat list for lookups
const ALL_KNOWN_LEAGUES: League[] = LEAGUE_GROUPS.flatMap(g => g.leagues);

function getSport(slug: string) {
  for (const g of LEAGUE_GROUPS) {
    if (g.leagues.some(l => l.slug === slug)) return g.sport;
  }
  return 'cricket';
}

function sportLabel(slug: string) {
  const sport = getSport(slug);
  if (sport === 'football')      return '⚽ Football';
  if (sport === 'international') return '🌍 International Cricket';
  return '🏏 Cricket';
}

function sportColor(slug: string) {
  const sport = getSport(slug);
  if (sport === 'football')      return colors.success;
  if (sport === 'international') return colors.info;
  return colors.accent;
}

type StatusFilter = 'all' | 'published' | 'draft';

export default function PredictionsPage() {
  const [predictions,     setPredictions]     = useState<Prediction[]>([]);
  const [matches,         setMatches]         = useState<Match[]>([]);
  const [selectedLeague,  setSelectedLeague]  = useState('');
  const [matchesLoading,  setMatchesLoading]  = useState(false);
  const [form,            setForm]            = useState({ ...EMPTY_FORM });
  const [editId,          setEditId]          = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [msg,             setMsg]             = useState('');
  const [matchType,       setMatchType]       = useState<'match' | 'standalone'>('match');

  // Search / filter (predictions list)
  const [search,       setSearch]       = useState('');
  const [leagueFilter, setLeagueFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadPredictions = async () => {
    try {
      const res = await api.get<{ predictions: Prediction[] }>('/admin/expert-predictions');
      setPredictions(res.predictions ?? []);
    } catch (e: any) {
      setMsg('Error loading predictions: ' + e.message);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  useEffect(() => {
    if (!selectedLeague || matchType !== 'match') { setMatches([]); return; }
    setMatchesLoading(true);
    api.get<{ matches: Match[] }>(`/admin/matches?league=${selectedLeague}`)
      .then(res => {
        const list = res.matches ?? [];
        setMatches(list);
        // No live/upcoming matches → auto-switch to standalone so the form is usable
        if (list.length === 0) setMatchType('standalone');
      })
      .catch((e: any) => setMsg('Error loading matches: ' + e.message))
      .finally(() => setMatchesLoading(false));
  }, [selectedLeague, matchType]);

  const handleLeagueSelect = (slug: string) => {
    setSelectedLeague(slug);
    setForm(f => ({ ...f, match_id: '', match_label: '' }));
  };

  const handleMatchSelect = (matchId: string) => {
    const m = matches.find(x => x.id === matchId);
    setForm(f => ({ ...f, match_id: matchId, match_label: m?.label ?? '' }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.predicted_winner.trim() || !form.analysis.trim()) return;
    setLoading(true);
    try {
      const payload = {
        match_id:         matchType === 'match' ? (form.match_id || null) : null,
        match_label:      matchType === 'match' ? (form.match_label || null) : null,
        league_id:        selectedLeague || null,
        predicted_winner: form.predicted_winner.trim(),
        confidence:       form.confidence,
        analysis:         form.analysis.trim(),
        is_published:     form.is_published,
      };
      if (editId) {
        await api.put(`/admin/expert-predictions/${editId}`, payload);
        setMsg('✓ Prediction updated — app reflects changes instantly');
      } else {
        await api.post('/admin/expert-predictions', payload);
        setMsg('✓ Prediction published');
      }
      setForm({ ...EMPTY_FORM }); setEditId(null);
      loadPredictions();
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const startEdit = (p: Prediction) => {
    setEditId(p.id);
    setMatchType(p.match_id ? 'match' : 'standalone');
    setForm({ match_id: p.match_id ?? '', match_label: p.match_label ?? '', predicted_winner: p.predicted_winner, confidence: p.confidence, analysis: p.analysis, is_published: p.is_published });
    setSelectedLeague(p.league_id ?? '');
    setMatches([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id: string) => {
    if (!confirm('Delete this prediction?')) return;
    await api.delete(`/admin/expert-predictions/${id}`);
    loadPredictions();
  };

  const toggle = async (p: Prediction) => {
    await api.put(`/admin/expert-predictions/${p.id}`, { is_published: !p.is_published });
    loadPredictions();
  };

  const confColor = { HIGH: colors.success, MEDIUM: colors.warning, LOW: colors.textBody };
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const selectedLeagueObj = ALL_KNOWN_LEAGUES.find(l => l.slug === selectedLeague);

  const filteredPredictions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return predictions.filter(p => {
      if (leagueFilter && p.league_id !== leagueFilter) return false;
      if (statusFilter === 'published' && !p.is_published) return false;
      if (statusFilter === 'draft' && p.is_published) return false;
      if (term) {
        const haystack = `${p.predicted_winner} ${p.analysis} ${p.match_label ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [predictions, search, leagueFilter, statusFilter]);

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
        🎯 {editId ? 'Edit Prediction' : 'New Expert Prediction'}
      </h2>

      {/* Form */}
      <form onSubmit={save} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>

        {/* Match type toggle */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>PREDICTION TYPE</label>
          <div style={{ display: 'flex', gap: 0, background: colors.surfaceAlt, borderRadius: 8, padding: 3, border: `1px solid ${colors.border}`, width: 'fit-content' }}>
            {(['match', 'standalone'] as const).map(t => (
              <button key={t} type="button" onClick={() => setMatchType(t)} style={{
                padding: '7px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: matchType === t ? 700 : 500,
                background: matchType === t ? colors.borderActive : 'transparent', color: matchType === t ? colors.accent : colors.textMuted,
              }}>
                {t === 'match' ? '⚔️ Linked to Match' : '📝 Standalone'}
              </button>
            ))}
          </div>
          <p style={{ color: colors.textDim, fontSize: 11, marginTop: 6 }}>
            {matchType === 'match'
              ? 'Attach this prediction to a specific upcoming match.'
              : 'Not tied to a match — good for tournament previews or general picks.'}
          </p>
        </div>

        {/* League */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>LEAGUE / TOURNAMENT</label>
          <select
            value={selectedLeague}
            onChange={e => handleLeagueSelect(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— Select a league or tournament —</option>
            {LEAGUE_GROUPS.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.leagues.map(l => (
                  <option key={l.slug} value={l.slug}>{l.flag} {l.name} ({l.short})</option>
                ))}
              </optgroup>
            ))}
          </select>

          {selectedLeague && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={badge(sportColor(selectedLeague))}>
                {sportLabel(selectedLeague)}
              </span>
              <span style={{ color: colors.textDim, fontSize: 11 }}>
                Visible only in the {selectedLeagueObj?.short ?? selectedLeague} section of the app.
              </span>
            </div>
          )}
        </div>

        {/* Match picker */}
        {matchType === 'match' && selectedLeague && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>SELECT MATCH</label>
            {matchesLoading ? (
              <div style={{ ...inputStyle, color: colors.textDim, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: `2px solid ${colors.accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                Loading matches…
              </div>
            ) : (
              <select
                value={form.match_id}
                onChange={e => handleMatchSelect(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— Pick a match —</option>
                {matches.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Standalone label */}
        {matchType === 'standalone' && (
          <div style={{ marginBottom: 16 }}>
            {selectedLeague && matches.length === 0 && !matchesLoading && (
              <div style={{ background: colors.accent + '10', border: `1px solid ${colors.accent}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 14 }}>ℹ️</span>
                <div>
                  <span style={{ color: colors.accent, fontSize: 12, fontWeight: 700 }}>No live or upcoming matches found</span>
                  <p style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>
                    {selectedLeagueObj?.short ?? selectedLeague} fixtures may not be loaded yet (tournament hasn't started) or the season has ended. You can still post a standalone prediction — it will appear in the {selectedLeagueObj?.short ?? selectedLeague} section of the app.
                  </p>
                </div>
              </div>
            )}
            <label style={labelStyle}>HEADLINE / LABEL (optional)</label>
            <input
              value={form.match_label}
              onChange={e => setForm(f => ({ ...f, match_label: e.target.value }))}
              placeholder={FOOTBALL_SLUGS.has(selectedLeague) ? "e.g. 'Argentina vs Brazil – Group Stage Preview'" : "e.g. 'WWCT20 2026 — Australia to lift the trophy'"}
              style={inputStyle}
            />
          </div>
        )}

        {/* Predicted winner */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>PREDICTED WINNER</label>
          <input
            value={form.predicted_winner}
            onChange={e => setForm(f => ({ ...f, predicted_winner: e.target.value }))}
            placeholder={FOOTBALL_SLUGS.has(selectedLeague) ? 'e.g. Argentina, Brazil, France...' : 'e.g. Mumbai Indians, RCB, CSK...'}
            style={inputStyle}
          />
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>CONFIDENCE</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map(c => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: form.confidence === c ? confColor[c] : colors.textMuted, fontSize: 13, fontWeight: form.confidence === c ? 700 : 500 }}>
                <input type="radio" checked={form.confidence === c} onChange={() => setForm(f => ({ ...f, confidence: c }))} style={{ accentColor: confColor[c] }} />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Analysis */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>ANALYSIS</label>
          <textarea
            value={form.analysis}
            onChange={e => setForm(f => ({ ...f, analysis: e.target.value }))}
            placeholder="Write your match analysis and reasoning..."
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
          />
        </div>

        {/* Publish toggle */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox" id="pub"
            checked={form.is_published}
            onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
            style={{ accentColor: colors.accent, width: 16, height: 16 }}
          />
          <label htmlFor="pub" style={{ color: colors.textMuted, fontSize: 14, cursor: 'pointer' }}>Publish immediately</label>
        </div>

        {msg && <p style={{ color: msg.startsWith('✓') ? colors.success : colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Saving…' : editId ? 'Update Prediction' : 'Publish Prediction'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setSelectedLeague(''); }}
              style={{ padding: '11px 20px', background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Search / filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by winner, analysis, or match…"
          style={{ ...inputStyle, maxWidth: 280 }}
        />
        <select value={leagueFilter} onChange={e => setLeagueFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 220, cursor: 'pointer' }}>
          <option value="">All leagues</option>
          {ALL_KNOWN_LEAGUES.map(l => <option key={l.slug} value={l.slug}>{l.flag} {l.short}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 0, background: colors.surfaceAlt, borderRadius: 8, padding: 3, border: `1px solid ${colors.border}` }}>
          {(['all', 'published', 'draft'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: statusFilter === s ? 700 : 500,
              background: statusFilter === s ? colors.borderActive : 'transparent', color: statusFilter === s ? colors.accent : colors.textMuted,
              textTransform: 'capitalize',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Predictions list */}
      <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        Predictions ({filteredPredictions.length} of {predictions.length})
      </h3>
      {filteredPredictions.length === 0
        ? <p style={{ color: colors.textDim, fontSize: 14 }}>No predictions match your filters.</p>
        : filteredPredictions.map(p => (
          <div
            key={p.id}
            style={{
              background: colors.surface,
              border: `1px solid ${p.is_published ? colors.borderActive : colors.border}`,
              borderLeft: `3px solid ${p.league_id ? sportColor(p.league_id) : colors.borderActive}`,
              borderRadius: 10, padding: 18, marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                {p.match_label && <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>⚔️ {p.match_label}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: colors.accent, fontSize: 16, fontWeight: 900 }}>🏆 {p.predicted_winner}</span>
                  <span style={badge(confColor[p.confidence])}>
                    {p.confidence}
                  </span>
                  {p.league_id && (() => {
                    const lg = ALL_KNOWN_LEAGUES.find(l => l.slug === p.league_id);
                    const c  = sportColor(p.league_id);
                    return (
                      <span style={badge(c)}>
                        {lg ? `${lg.flag} ${lg.short}` : p.league_id.toUpperCase()}
                      </span>
                    );
                  })()}
                  {!p.is_published && (
                    <span style={badge(colors.danger)}>DRAFT</span>
                  )}
                </div>
                <div style={{ color: colors.textBody, fontSize: 13, lineHeight: 1.6, marginBottom: 6 }} title={p.analysis}>
                  {p.analysis.length > 130 ? p.analysis.slice(0, 130) + '…' : p.analysis}
                </div>
                <div style={{ color: colors.textDim, fontSize: 11 }}>Updated {fmt(p.updated_at)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(p)} style={actionBtn(colors.borderActive, colors.accent)}>Edit</button>
                <button onClick={() => toggle(p)} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>{p.is_published ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => del(p.id)} style={actionBtn(colors.danger + '15', colors.danger)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}
