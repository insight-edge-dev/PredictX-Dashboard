import { useState, useEffect } from 'react';
import { api, uploadBannerImage } from '../api';
import { colors, labelStyle, inputStyle, btnStyle, actionBtn, badge } from '../theme';

interface LinkMeta {
  league?: string;
  sport?: 'cricket' | 'football';
  label?: string;
}

interface Banner {
  id:              string;
  title:           string;
  image_url:       string;
  image_public_id: string;
  link_type:       'none' | 'external' | 'match' | 'tip' | 'league_home' | 'app_section';
  link_value:      string | null;
  link_meta:       LinkMeta | null;
  placements:      string[];
  display_order:   number;
  is_active:       boolean;
}

interface LeagueOption { slug: string; name: string; short: string; flag: string }
interface MatchOption  { id: string; label: string; date: string }

const FOOTBALL_SLUGS = ['wc2026'];

const LINK_TYPES: { value: Banner['link_type']; label: string }[] = [
  { value: 'none',        label: 'None (decorative)' },
  { value: 'external',    label: 'External URL' },
  { value: 'match',       label: 'Match Details' },
  { value: 'tip',         label: 'Prediction Tip' },
  { value: 'league_home', label: 'League Home' },
  { value: 'app_section', label: 'App Section' },
];

const APP_SECTIONS = [
  { value: '/(tabs)/(matches)',         label: 'Matches' },
  { value: '/(tabs)/(tips)',            label: 'PredictX Tips' },
  { value: '/(international)',          label: 'International Cricket' },
  { value: '/(expert)',                 label: 'Our Experts' },
  { value: '/(settings)/notifications', label: 'Notifications' },
];

const emptyForm = {
  title:        '',
  externalUrl:  '',
  linkLeague:   '',
  linkMatchId:  '',
  linkMatchLabel: '',
  appSection:   APP_SECTIONS[0].value,
  placements:   [] as string[],
  isActive:     true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);

  const [editId, setEditId]   = useState<string | null>(null);
  const [linkType, setLinkType] = useState<Banner['link_type']>('none');
  const [form, setForm] = useState(emptyForm);

  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<{ url: string; publicId: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  const load = async () => {
    try {
      const res = await api.get<{ banners: Banner[] }>('/admin/banners');
      setBanners(res.banners ?? []);
    } catch (e: any) {
      setMsg('Error loading banners: ' + e.message);
    }
  };

  const loadLeagues = async () => {
    try {
      const res = await api.get<{ leagues: LeagueOption[] }>('/admin/matches');
      setLeagues(res.leagues ?? []);
    } catch (e: any) {
      setMsg('Error loading leagues: ' + e.message);
    }
  };

  useEffect(() => { load(); loadLeagues(); }, []);

  // Fetch matches for the selected league when picking a Match/Tip target.
  useEffect(() => {
    if ((linkType !== 'match' && linkType !== 'tip') || !form.linkLeague) {
      setMatches([]);
      return;
    }
    api.get<{ matches: MatchOption[] }>(`/admin/matches?league=${form.linkLeague}`)
      .then(res => setMatches(res.matches ?? []))
      .catch(() => setMatches([]));
  }, [linkType, form.linkLeague]);

  const cricketLeagues  = leagues.filter(l => !FOOTBALL_SLUGS.includes(l.slug));
  const footballLeagues = leagues.filter(l => FOOTBALL_SLUGS.includes(l.slug));

  const resetForm = () => {
    setEditId(null);
    setLinkType('none');
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const togglePlacement = (value: string) => {
    setForm(f => ({
      ...f,
      placements: f.placements.includes(value)
        ? f.placements.filter(p => p !== value)
        : [...f.placements, value],
    }));
  };

  const startEdit = (b: Banner) => {
    setEditId(b.id);
    setLinkType(b.link_type);
    setExistingImage({ url: b.image_url, publicId: b.image_public_id });
    setImageFile(null);
    setImagePreview(null);

    const next = { ...emptyForm, title: b.title, placements: b.placements ?? [], isActive: b.is_active };
    if (b.link_type === 'external') {
      next.externalUrl = b.link_value ?? '';
    } else if (b.link_type === 'match' || b.link_type === 'tip') {
      next.linkLeague     = b.link_meta?.league ?? '';
      next.linkMatchId    = b.link_value ?? '';
      next.linkMatchLabel = b.link_meta?.label ?? '';
    } else if (b.link_type === 'league_home') {
      next.linkLeague = b.link_value ?? '';
    } else if (b.link_type === 'app_section') {
      next.appSection = b.link_value ?? APP_SECTIONS[0].value;
    }
    setForm(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!imageFile && !existingImage) { setMsg('Error: please choose a banner image'); return; }
    if (form.placements.length === 0) { setMsg('Error: select at least one placement'); return; }

    setLoading(true);
    try {
      let image = existingImage;
      if (imageFile) {
        const uploaded = await uploadBannerImage(imageFile);
        image = { url: uploaded.url, publicId: uploaded.publicId };
      }
      if (!image) throw new Error('image is required');

      let link_value: string | null = null;
      let link_meta: LinkMeta | null = null;
      if (linkType === 'external') {
        link_value = form.externalUrl.trim();
      } else if (linkType === 'match' || linkType === 'tip') {
        const league = leagues.find(l => l.slug === form.linkLeague);
        const match  = matches.find(m => m.id === form.linkMatchId);
        link_value = form.linkMatchId;
        link_meta = {
          league: form.linkLeague,
          sport:  FOOTBALL_SLUGS.includes(form.linkLeague) ? 'football' : 'cricket',
          label:  match?.label ?? form.linkMatchLabel ?? league?.name,
        };
      } else if (linkType === 'league_home') {
        link_value = form.linkLeague;
      } else if (linkType === 'app_section') {
        link_value = form.appSection;
      }

      const body = {
        title:           form.title.trim(),
        image_url:       image.url,
        image_public_id: image.publicId,
        link_type:       linkType,
        link_value,
        link_meta,
        placements:      form.placements,
        display_order:   editId ? undefined : banners.length,
        is_active:       form.isActive,
      };

      if (editId) {
        await api.put(`/admin/banners/${editId}`, body);
        setMsg('✓ Banner updated');
      } else {
        await api.post('/admin/banners', body);
        setMsg('✓ Banner created');
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
    if (!confirm('Delete this banner?')) return;
    await api.delete(`/admin/banners/${id}`);
    if (editId === id) resetForm();
    load();
  };

  const toggleActive = async (b: Banner) => {
    await api.put(`/admin/banners/${b.id}`, { is_active: !b.is_active });
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const reordered = [...banners];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBanners(reordered);
    await api.put('/admin/banners/reorder', { order: reordered.map(b => b.id) });
  };

  const leagueName = (slug: string | null) =>
    leagues.find(l => l.slug === slug)?.name ?? slug ?? '';

  const linkSummary = (b: Banner) => {
    switch (b.link_type) {
      case 'external':    return `→ External: ${b.link_value}`;
      case 'match':       return `→ Match: ${b.link_meta?.label ?? b.link_value}`;
      case 'tip':         return `→ Tip: ${b.link_meta?.label ?? b.link_value}`;
      case 'league_home': return `→ League Home: ${leagueName(b.link_value)}`;
      case 'app_section': return `→ ${APP_SECTIONS.find(s => s.value === b.link_value)?.label ?? b.link_value}`;
      default:            return 'No link (decorative)';
    }
  };

  const placementLabel = (p: string) => {
    if (p === 'discovery')   return 'Discovery';
    if (p === 'all_leagues') return 'All Leagues';
    return leagues.find(l => l.slug === p)?.short ?? p;
  };

  const submitDisabled = loading || !form.title.trim() || (!imageFile && !existingImage) || form.placements.length === 0;

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
        🖼️ {editId ? 'Edit Banner' : 'Add Banner'}
      </h2>

      <form onSubmit={submit} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
        {/* Image */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>BANNER IMAGE</label>
          <input type="file" accept="image/*" onChange={onPickImage} style={{ color: colors.textMuted, fontSize: 13 }} />
          {(imagePreview || existingImage) && (
            <img
              src={imagePreview ?? existingImage?.url}
              alt="preview"
              style={{ display: 'block', marginTop: 10, width: 280, height: 130, objectFit: 'cover', borderRadius: 8, border: `1px solid ${colors.border}` }}
            />
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>TITLE <span style={{ color: colors.textDim, fontWeight: 400 }}>(internal label)</span></label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. IPL 2026 Kickoff Promo" style={inputStyle} maxLength={80} />
        </div>

        {/* Link type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>NAVIGATES TO</label>
          <select value={linkType} onChange={e => setLinkType(e.target.value as Banner['link_type'])} style={inputStyle}>
            {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {linkType === 'external' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>EXTERNAL URL</label>
            <input value={form.externalUrl} onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))} placeholder="https://..." style={inputStyle} />
          </div>
        )}

        {(linkType === 'match' || linkType === 'tip') && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>LEAGUE</label>
              <select value={form.linkLeague} onChange={e => setForm(f => ({ ...f, linkLeague: e.target.value, linkMatchId: '' }))} style={inputStyle}>
                <option value="">Select a league…</option>
                {leagues.map(l => <option key={l.slug} value={l.slug}>{l.flag} {l.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>MATCH</label>
              <select value={form.linkMatchId} onChange={e => setForm(f => ({ ...f, linkMatchId: e.target.value }))} style={inputStyle} disabled={!form.linkLeague}>
                <option value="">Select a match…</option>
                {form.linkMatchId && !matches.some(m => m.id === form.linkMatchId) && (
                  <option value={form.linkMatchId}>{form.linkMatchLabel || form.linkMatchId}</option>
                )}
                {matches.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </>
        )}

        {linkType === 'league_home' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>LEAGUE</label>
            <select value={form.linkLeague} onChange={e => setForm(f => ({ ...f, linkLeague: e.target.value }))} style={inputStyle}>
              <option value="">Select a league…</option>
              {leagues.map(l => <option key={l.slug} value={l.slug}>{l.flag} {l.name}</option>)}
            </select>
          </div>
        )}

        {linkType === 'app_section' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>SECTION</label>
            <select value={form.appSection} onChange={e => setForm(f => ({ ...f, appSection: e.target.value }))} style={inputStyle}>
              {APP_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* Placements */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>SHOW ON</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.textBody, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.placements.includes('discovery')} onChange={() => togglePlacement('discovery')} style={{ accentColor: colors.accent }} />
              Discovery (Home)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.textBody, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.placements.includes('all_leagues')} onChange={() => togglePlacement('all_leagues')} style={{ accentColor: colors.accent }} />
              All League Homes
            </label>
          </div>

          {cricketLeagues.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: colors.textDim, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8 }}>CRICKET</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {cricketLeagues.map(l => (
                  <label key={l.slug} style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.textBody, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.placements.includes(l.slug)} onChange={() => togglePlacement(l.slug)} style={{ accentColor: colors.accent }} />
                    {l.flag} {l.short}
                  </label>
                ))}
              </div>
            </div>
          )}

          {footballLeagues.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: colors.textDim, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8 }}>FOOTBALL</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {footballLeagues.map(l => (
                  <label key={l.slug} style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.textBody, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.placements.includes(l.slug)} onChange={() => togglePlacement(l.slug)} style={{ accentColor: colors.accent }} />
                    {l.flag} {l.short}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active toggle */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.textBody, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ accentColor: colors.accent }} />
            Active
          </label>
        </div>

        {msg && <p style={{ color: msg.startsWith('✓') ? colors.success : colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={submitDisabled} style={btnStyle(submitDisabled)}>
            {loading ? 'Saving…' : editId ? 'Save Changes' : 'Add Banner'}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Banners ({banners.length})</h3>
      {banners.length === 0
        ? <p style={{ color: colors.textDim, fontSize: 14 }}>No banners yet.</p>
        : banners.map((b, i) => (
          <div key={b.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
            <img src={b.image_url} alt={b.title} style={{ width: 100, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ color: colors.text, fontWeight: 700, fontSize: 14 }}>{b.title}</span>
                <span style={badge(b.is_active ? colors.success : colors.textDim)}>{b.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>
              <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{linkSummary(b)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {b.placements.map(p => <span key={p} style={badge(colors.info)}>{placementLabel(p)}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} style={actionBtn(colors.surfaceAlt, colors.textMuted)}>↓</button>
              </div>
              <button onClick={() => startEdit(b)} style={actionBtn(colors.info + '15', colors.info)}>Edit</button>
              <button onClick={() => toggleActive(b)} style={actionBtn(colors.warning + '15', colors.warning)}>
                {b.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => del(b.id)} style={actionBtn(colors.danger + '15', colors.danger)}>Delete</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}
