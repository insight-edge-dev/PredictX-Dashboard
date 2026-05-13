import { useState, useEffect } from 'react';
import { api } from '../api';

interface Match    { id: string; label: string; date: string; }
interface League   { slug: string; name: string; short: string; flag: string; }
interface Prediction {
  id: string; match_id: string | null; match_label: string | null;
  predicted_winner: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  analysis: string; is_published: boolean; created_at: string; updated_at: string;
}

type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
const EMPTY_FORM: { match_id: string; match_label: string; predicted_winner: string; confidence: Confidence; analysis: string; is_published: boolean } =
  { match_id: '', match_label: '', predicted_winner: '', confidence: 'HIGH', analysis: '', is_published: true };

export default function ExpertPredictionsTab() {
  const [predictions,     setPredictions]     = useState<Prediction[]>([]);
  const [leagues,         setLeagues]         = useState<League[]>([]);
  const [matches,         setMatches]         = useState<Match[]>([]);
  const [selectedLeague,  setSelectedLeague]  = useState('');
  const [matchesLoading,  setMatchesLoading]  = useState(false);
  const [form,            setForm]            = useState({ ...EMPTY_FORM });
  const [editId,          setEditId]          = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [msg,             setMsg]             = useState('');
  const [matchType,       setMatchType]       = useState<'match' | 'standalone'>('match');

  const loadPredictions = async () => {
    const res = await api.get<{ predictions: Prediction[] }>('/admin/expert-predictions');
    setPredictions(res.predictions ?? []);
  };

  // Load leagues list once on mount
  useEffect(() => {
    api.get<{ leagues: League[] }>('/admin/matches').then(res => {
      setLeagues(res.leagues ?? []);
    });
    loadPredictions();
  }, []);

  // Fetch matches whenever selected league changes
  useEffect(() => {
    if (!selectedLeague) { setMatches([]); return; }
    setMatchesLoading(true);
    api.get<{ matches: Match[] }>(`/admin/matches?league=${selectedLeague}`)
      .then(res => setMatches(res.matches ?? []))
      .finally(() => setMatchesLoading(false));
  }, [selectedLeague]);

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
        match_id:        matchType === 'match' ? (form.match_id || null) : null,
        match_label:     matchType === 'match' ? (form.match_label || null) : null,
        predicted_winner: form.predicted_winner.trim(),
        confidence:      form.confidence,
        analysis:        form.analysis.trim(),
        is_published:    form.is_published,
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
    // Reset league selection when editing so admin picks league again for match
    setSelectedLeague('');
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

  const confColor = { HIGH: '#16a34a', MEDIUM: '#F59E0B', LOW: '#94A3B8' };
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
        🎯 {editId ? 'Edit Prediction' : 'New Expert Prediction'}
      </h2>

      {/* Form */}
      <form onSubmit={save} style={{ background: '#08111E', border: '1px solid #142234', borderRadius: 12, padding: 24, marginBottom: 32 }}>

        {/* Match type toggle */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>PREDICTION TYPE</label>
          <div style={{ display: 'flex', gap: 0, background: '#0E1C2E', borderRadius: 8, padding: 3, border: '1px solid #142234', width: 'fit-content' }}>
            {(['match', 'standalone'] as const).map(t => (
              <button key={t} type="button" onClick={() => setMatchType(t)} style={{
                padding: '7px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: matchType === t ? 700 : 500,
                background: matchType === t ? '#1E3A5C' : 'transparent', color: matchType === t ? '#FBBF24' : '#7E97B0',
              }}>
                {t === 'match' ? '⚔️ Linked to Match' : '📝 Standalone'}
              </button>
            ))}
          </div>
        </div>

        {/* League + Match picker */}
        {matchType === 'match' && (
          <>
            {/* Step 1: League */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>SELECT LEAGUE</label>
              <select value={selectedLeague} onChange={e => handleLeagueSelect(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— Pick a league —</option>
                {leagues.map(l => (
                  <option key={l.slug} value={l.slug}>{l.flag} {l.name} ({l.short})</option>
                ))}
              </select>
            </div>

            {/* Step 2: Match (only after league selected) */}
            {selectedLeague && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>SELECT MATCH</label>
                <select
                  value={form.match_id}
                  onChange={e => handleMatchSelect(e.target.value)}
                  disabled={matchesLoading}
                  style={{ ...inputStyle, cursor: matchesLoading ? 'wait' : 'pointer', opacity: matchesLoading ? 0.6 : 1 }}
                >
                  <option value="">{matchesLoading ? 'Loading matches…' : matches.length === 0 ? 'No upcoming matches' : '— Pick a match —'}</option>
                  {matches.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        {/* Standalone label */}
        {matchType === 'standalone' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>HEADLINE / LABEL (optional)</label>
            <input value={form.match_label} onChange={e => setForm(f => ({ ...f, match_label: e.target.value }))}
              placeholder="e.g. 'IPL 2026 Final Preview'" style={inputStyle} />
          </div>
        )}

        {/* Predicted winner */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>PREDICTED WINNER</label>
          <input value={form.predicted_winner} onChange={e => setForm(f => ({ ...f, predicted_winner: e.target.value }))}
            placeholder="e.g. Mumbai Indians, RCB, CSK..." style={inputStyle} />
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>CONFIDENCE</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map(c => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: form.confidence === c ? confColor[c] : '#7E97B0', fontSize: 13, fontWeight: form.confidence === c ? 700 : 500 }}>
                <input type="radio" checked={form.confidence === c} onChange={() => setForm(f => ({ ...f, confidence: c }))} style={{ accentColor: confColor[c] }} />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Analysis */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>ANALYSIS</label>
          <textarea value={form.analysis} onChange={e => setForm(f => ({ ...f, analysis: e.target.value }))}
            placeholder="Write your match analysis and reasoning..." rows={5}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }} />
        </div>

        {/* Publish toggle */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} style={{ accentColor: '#FBBF24', width: 16, height: 16 }} />
          <label htmlFor="pub" style={{ color: '#7E97B0', fontSize: 14, cursor: 'pointer' }}>Publish immediately</label>
        </div>

        {msg && <p style={{ color: msg.startsWith('✓') ? '#16a34a' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Saving…' : editId ? 'Update Prediction' : 'Publish Prediction'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); }} style={{ padding: '11px 20px', background: '#0E1C2E', border: '1px solid #142234', borderRadius: 8, color: '#7E97B0', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>All Predictions ({predictions.length})</h3>
      {predictions.length === 0
        ? <p style={{ color: '#4A6580', fontSize: 14 }}>No predictions yet. Create one above.</p>
        : predictions.map(p => (
          <div key={p.id} style={{ background: '#08111E', border: `1px solid ${p.is_published ? '#1E3A5C' : '#142234'}`, borderRadius: 10, padding: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                {p.match_label && <div style={{ color: '#7E97B0', fontSize: 12, marginBottom: 4 }}>⚔️ {p.match_label}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: '#FBBF24', fontSize: 16, fontWeight: 900 }}>🏆 {p.predicted_winner}</span>
                  <span style={{ background: confColor[p.confidence] + '20', color: confColor[p.confidence], fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, border: `1px solid ${confColor[p.confidence]}40` }}>{p.confidence}</span>
                  {!p.is_published && <span style={{ background: '#ef444415', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>DRAFT</span>}
                </div>
                <div style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6, marginBottom: 6 }} title={p.analysis}>
                  {p.analysis.length > 120 ? p.analysis.slice(0, 120) + '…' : p.analysis}
                </div>
                <div style={{ color: '#4A6580', fontSize: 11 }}>Updated {fmt(p.updated_at)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(p)} style={actionBtn('#1E3A5C', '#FBBF24')}>Edit</button>
                <button onClick={() => toggle(p)} style={actionBtn('#0E1C2E', '#7E97B0')}>{p.is_published ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => del(p.id)} style={actionBtn('#ef444415', '#ef4444')}>Delete</button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#7E97B0', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#0E1C2E', border: '1px solid #142234', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' };
const btnStyle = (disabled: boolean): React.CSSProperties => ({ padding: '11px 24px', background: disabled ? '#1A2A3A' : '#FBBF24', border: 'none', borderRadius: 8, color: disabled ? '#4A6580' : '#000', fontWeight: 800, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer' });
const actionBtn = (bg: string, color: string): React.CSSProperties => ({ background: bg, border: `1px solid ${color}30`, color, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 });
