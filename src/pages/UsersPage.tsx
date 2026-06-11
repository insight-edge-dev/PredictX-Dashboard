import { useState, useEffect } from 'react';
import { api } from '../api';
import { colors, cardStyle, inputStyle } from '../theme';

interface AppUser {
  id: string;
  phone: string | null;
  display_name: string | null;
  created_at: string;
  predictions_count: number | null;
  matches_tracked: number | null;
  favourite_teams: string[] | null;
}

interface UsersResponse {
  users: AppUser[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    api.get<UsersResponse>(`/admin/users?${params.toString()}`)
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>👥 Users</h2>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or phone…"
        style={{ ...inputStyle, maxWidth: 320, marginBottom: 16 }}
      />

      {loading && <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: colors.danger, fontSize: 14 }}>Error: {error}</p>}

      {data && (
        <>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {['Name', 'Phone', 'Joined', 'Predictions', 'Matches Tracked', 'Favorites'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '12px 16px', color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: colors.textDim, fontSize: 14 }}>No users found.</td></tr>
                ) : data.users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px', color: colors.text, fontSize: 14, fontWeight: 600 }}>{u.display_name || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{u.phone || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 13 }}>{fmt(u.created_at)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{u.predictions_count ?? 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{u.matches_tracked ?? 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.textBody, fontSize: 14 }}>{u.favourite_teams?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textDim, fontSize: 13 }}>
              {data.total} user{data.total === 1 ? '' : 's'} total · page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 8, color: page <= 1 ? colors.textDim : colors.text, padding: '8px 16px', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 8, color: page >= totalPages ? colors.textDim : colors.text, padding: '8px 16px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
