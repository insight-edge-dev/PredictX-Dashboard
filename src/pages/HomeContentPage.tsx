import { useState, useEffect } from 'react';
import { api } from '../api';
import { colors, cardStyle, labelStyle, inputStyle, btnStyle, actionBtn, badge } from '../theme';

// ── Types ───────────────────────────────────────────────────────

interface Fact {
  id:            string;
  sport:         'cricket' | 'football';
  icon:          string;
  text:          string;
  color:         string;
  display_order: number;
  is_active:     boolean;
}

interface LeaguePriority {
  slug:     string;
  name:     string;
  short:    string;
  flag:     string;
  sport:    'cricket' | 'football';
  priority: number;
}

interface HomeSection {
  key:           string;
  label:         string;
  enabled:       boolean;
  display_order: number;
}

interface AccuracyRow {
  slug:               string;
  name:               string;
  computedPercentage: number;
  sampleSize:         number;
  override:           number | null;
}

const emptyFactForm = { sport: 'cricket' as Fact['sport'], icon: '🏏', text: '', color: '#F59E0B', isActive: true };

// ── Facts ───────────────────────────────────────────────────────

function FactsSection() {
  const [facts, setFacts]   = useState<Fact[]>([]);
  const [sportTab, setSportTab] = useState<Fact['sport']>('cricket');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]     = useState(emptyFactForm);
  const [msg, setMsg]       = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get<{ facts: Fact[] }>('/admin/facts')
      .then(res => setFacts(res.facts ?? []))
      .catch((e: any) => setMsg('Error loading facts: ' + e.message));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setEditId(null); setForm(emptyFactForm); };

  const startEdit = (f: Fact) => {
    setEditId(f.id);
    setForm({ sport: f.sport, icon: f.icon, text: f.text, color: f.color, isActive: f.is_active });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.icon.trim() || !form.text.trim()) return;
    setLoading(true);
    try {
      const body = {
        sport: form.sport, icon: form.icon.trim(), text: form.text.trim(),
        color: form.color, is_active: form.isActive,
      };
      if (editId) {
        await api.put(`/admin/facts/${editId}`, body);
        setMsg('✓ Fact updated');
      } else {
        await api.post('/admin/facts', body);
        setMsg('✓ Fact added');
      }
      resetForm();
      load();
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this fact?')) return;
    await api.delete(`/admin/facts/${id}`);
    if (editId === id) resetForm();
    load();
  };

  const toggleActive = async (f: Fact) => {
    await api.put(`/admin/facts/${f.id}`, { is_active: !f.is_active });
    load();
  };

  const visible = facts.filter(f => f.sport === sportTab).sort((a, b) => a.display_order - b.display_order);

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= visible.length) return;
    const reordered = [...visible];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setFacts(prev => {
      const others = prev.filter(f => f.sport !== sportTab);
      return [...others, ...reordered];
    });
    await api.put('/admin/facts/reorder', { order: reordered.map(f => f.id) });
  };

  const submitDisabled = loading || !form.icon.trim() || !form.text.trim();

  return (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        💡 Did You Know? Facts
      </h3>

      <form onSubmit={submit} style={{ ...cardStyle, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>SPORT</label>
            <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value as Fact['sport'] }))} style={inputStyle}>
              <option value="cricket">Cricket</option>
              <option value="football">Football</option>
            </select>
          </div>
          <div style={{ width: 90 }}>
            <label style={labelStyle}>ICON</label>
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={inputStyle} maxLength={4} />
          </div>
          <div style={{ width: 90 }}>
            <label style={labelStyle}>COLOR</label>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              style={{ width: '100%', height: 38, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.surfaceAlt }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>TEXT</label>
          <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} maxLength={220} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.textBody, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ accentColor: colors.accent }} />
            Active
          </label>
        </div>
        {msg && <p style={{ color: msg.startsWith('✓') ? colors.success : colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={submitDisabled} style={btnStyle(submitDisabled)}>
            {loading ? 'Saving…' : editId ? 'Save Changes' : 'Add Fact'}
          </button>
          {editId && <button type="button" onClick={resetForm} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>Cancel</button>}
        </div>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['cricket', 'football'] as const).map(s => (
          <button key={s} onClick={() => setSportTab(s)}
            style={actionBtn(sportTab === s ? colors.accent + '20' : colors.surfaceAlt, sportTab === s ? colors.accent : colors.textMuted)}>
            {s === 'cricket' ? '🏏 Cricket' : '⚽ Football'} ({facts.filter(f => f.sport === s).length})
          </button>
        ))}
      </div>

      {visible.length === 0
        ? <p style={{ color: colors.textDim, fontSize: 14 }}>No facts yet for this sport.</p>
        : visible.map((f, i) => (
          <div key={f.id} style={{ ...cardStyle, padding: 14, marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: f.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {f.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>{f.text}</div>
              <span style={badge(f.is_active ? colors.success : colors.textDim)}>{f.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === visible.length - 1} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>↓</button>
              </div>
              <button onClick={() => startEdit(f)} style={actionBtn(colors.info + '15', colors.info)}>Edit</button>
              <button onClick={() => toggleActive(f)} style={actionBtn(colors.warning + '15', colors.warning)}>
                {f.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => del(f.id)} style={actionBtn(colors.danger + '15', colors.danger)}>Delete</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── League Priority ─────────────────────────────────────────────

function LeaguePrioritySection() {
  const [leagues, setLeagues] = useState<LeaguePriority[]>([]);
  const [edits, setEdits]     = useState<Record<string, string>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get<{ leagues: LeaguePriority[] }>('/admin/league-priority')
      .then(res => setLeagues(res.leagues ?? []))
      .catch((e: any) => setMsg('Error loading leagues: ' + e.message));
  };

  useEffect(() => { load(); }, []);

  const save = async (slug: string) => {
    const raw = edits[slug];
    const priority = Number(raw);
    if (raw === undefined || Number.isNaN(priority)) return;
    setSavingSlug(slug);
    try {
      await api.put(`/admin/league-priority/${slug}`, { priority });
      load();
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setSavingSlug(null);
    }
  };

  const sorted = [...leagues].sort((a, b) => b.priority - a.priority);

  return (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        🌟 Featured League Priority
      </h3>
      <p style={{ color: colors.textDim, fontSize: 13, marginBottom: 16 }}>
        Higher number sorts first in the Matches and PredictX league accordions. 0 = no override (default algorithmic order).
      </p>
      {msg && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['League', 'Sport', 'Priority', ''].map(h => (
                <th key={h} style={{ textAlign: h === 'League' ? 'left' : 'center', padding: '12px 16px', color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(l => (
              <tr key={l.slug} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 16px', color: colors.text, fontSize: 14, fontWeight: 600 }}>{l.flag} {l.name}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: colors.textDim, fontSize: 12 }}>{l.sport}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={edits[l.slug] ?? String(l.priority)}
                    onChange={e => setEdits(prev => ({ ...prev, [l.slug]: e.target.value }))}
                    style={{ ...inputStyle, width: 70, textAlign: 'center', padding: '6px 8px' }}
                  />
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <button onClick={() => save(l.slug)} disabled={savingSlug === l.slug} style={actionBtn(colors.accent + '20', colors.accent)}>
                    {savingSlug === l.slug ? '…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Home Sections ───────────────────────────────────────────────

function HomeSectionsSection() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get<{ sections: HomeSection[] }>('/admin/home-sections')
      .then(res => setSections((res.sections ?? []).sort((a, b) => a.display_order - b.display_order)))
      .catch((e: any) => setMsg('Error loading sections: ' + e.message));
  };

  useEffect(() => { load(); }, []);

  const toggleEnabled = async (s: HomeSection) => {
    await api.put(`/admin/home-sections/${s.key}`, { enabled: !s.enabled });
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSections(reordered);
    await api.put('/admin/home-sections/reorder', { order: reordered.map(s => s.key) });
  };

  return (
    <div>
      <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        🏠 Discovery Section Order
      </h3>
      <p style={{ color: colors.textDim, fontSize: 13, marginBottom: 16 }}>
        Controls order/visibility of Discovery's discretionary sections (Points Table, Rankings, etc).
        Live Now, Today, Coming Up, PredictX Picks, and Banners are always shown and not listed here.
      </p>
      {msg && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
      {sections.length === 0
        ? <p style={{ color: colors.textDim, fontSize: 14 }}>No sections found — has the home_sections table been seeded?</p>
        : sections.map((s, i) => (
          <div key={s.key} style={{ ...cardStyle, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>{s.label}</span>
              <span style={{ ...badge(s.enabled ? colors.success : colors.textDim), marginLeft: 10 }}>
                {s.enabled ? 'VISIBLE' : 'HIDDEN'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>↓</button>
              <button onClick={() => toggleEnabled(s)} style={actionBtn(s.enabled ? colors.warning + '15' : colors.success + '15', s.enabled ? colors.warning : colors.success)}>
                {s.enabled ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Prediction Accuracy ──────────────────────────────────────────

function AccuracySection() {
  const [rows, setRows]   = useState<AccuracyRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get<{ rows: AccuracyRow[] }>('/admin/accuracy')
      .then(res => setRows(res.rows ?? []))
      .catch((e: any) => setMsg('Error loading accuracy: ' + e.message));
  };

  useEffect(() => { load(); }, []);

  const save = async (slug: string) => {
    const raw = edits[slug];
    if (raw === undefined || raw === '') return;
    const override = Number(raw);
    if (Number.isNaN(override)) return;
    setSavingSlug(slug);
    try {
      await api.put(`/admin/accuracy/${slug}`, { override });
      setEdits(prev => { const next = { ...prev }; delete next[slug]; return next; });
      load();
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setSavingSlug(null);
    }
  };

  const clear = async (slug: string) => {
    setSavingSlug(slug);
    try {
      await api.put(`/admin/accuracy/${slug}`, { override: null });
      load();
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setSavingSlug(null);
    }
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        🎯 Prediction Accuracy
      </h3>
      <p style={{ color: colors.textDim, fontSize: 13, marginBottom: 16 }}>
        Real % computed by comparing every completed match's PredictX prediction against the actual
        result. Set an override to show a different number on the app without changing the underlying data.
      </p>
      {msg && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['Scope', 'Computed', 'Sample', 'Override', ''].map(h => (
                <th key={h} style={{ textAlign: h === 'Scope' ? 'left' : 'center', padding: '12px 16px', color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.slug} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 16px', color: colors.text, fontSize: 14, fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: colors.textDim, fontSize: 13 }}>{r.computedPercentage}%</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: colors.textDim, fontSize: 12 }}>{r.sampleSize}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <input
                    type="number"
                    placeholder={r.override !== null ? String(r.override) : '—'}
                    value={edits[r.slug] ?? ''}
                    onChange={e => setEdits(prev => ({ ...prev, [r.slug]: e.target.value }))}
                    style={{ ...inputStyle, width: 70, textAlign: 'center', padding: '6px 8px' }}
                  />
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button onClick={() => save(r.slug)} disabled={savingSlug === r.slug} style={{ ...actionBtn(colors.accent + '20', colors.accent), marginRight: 6 }}>
                    {savingSlug === r.slug ? '…' : 'Save'}
                  </button>
                  {r.override !== null && (
                    <button onClick={() => clear(r.slug)} disabled={savingSlug === r.slug} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>
                      Clear
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────

export default function HomeContentPage() {
  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🏠 Home Content</h2>
      <FactsSection />
      <LeaguePrioritySection />
      <HomeSectionsSection />
      <AccuracySection />
    </div>
  );
}
