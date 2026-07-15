import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { colors, cardStyle } from '../theme';

interface AdminComment {
  id: string;
  user_id: string;
  display_name: string;
  context_type: 'match' | 'tip';
  context_id: string;
  content: string;
  created_at: string;
}

interface CommentsResponse {
  comments: AdminComment[];
  total: number;
}

const LIMIT = 50; // matches backend page size

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function CommentsPage() {
  const [contextType, setContextType] = useState<'match' | 'tip' | ''>('');
  const [page, setPage]               = useState(1);
  const [data, setData]               = useState<CommentsResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (contextType) params.set('contextType', contextType);
    api.get<CommentsResponse>(`/admin/comments?${params}`)
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [contextType, page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this comment? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/comments/${id}`);
      setData(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.id !== id),
        total:    prev.total - 1,
      } : null);
    } catch (e: any) {
      alert('Failed to delete: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
        💬 Comments
      </h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(['', 'match', 'tip'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setContextType(type); setPage(1); }}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: contextType === type ? colors.accent : colors.surface,
              color:      contextType === type ? '#fff' : colors.textMuted,
            }}
          >
            {type === '' ? 'All' : type === 'match' ? 'Match' : 'Tip'}
          </button>
        ))}
        <button
          onClick={load}
          style={{
            marginLeft: 'auto', padding: '8px 18px', borderRadius: 8,
            border: `1px solid ${colors.border}`, background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: colors.textMuted,
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</p>}
      {error   && <p style={{ color: colors.danger,   fontSize: 14 }}>Error: {error}</p>}

      {data && (
        <>
          <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
            {data.total} comment{data.total !== 1 ? 's' : ''} total
          </p>

          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {['User', 'Context', 'Comment', 'Posted', ''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left', padding: '12px 16px',
                      color: colors.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                      width: h === '' ? 60 : h === 'Comment' ? undefined : 130,
                    }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.comments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px', color: colors.textMuted, fontSize: 14 }}>
                      No comments found
                    </td>
                  </tr>
                ) : data.comments.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: i < data.comments.length - 1 ? `1px solid ${colors.border}` : 'none',
                      background: i % 2 === 1 ? colors.surfaceAlt : 'transparent',
                    }}
                  >
                    {/* User */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>{c.display_name}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{c.user_id.slice(0, 8)}…</div>
                    </td>

                    {/* Context */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                        background: c.context_type === 'match' ? colors.accent + '20' : colors.warning + '20',
                        color:      c.context_type === 'match' ? colors.accent : colors.warning,
                      }}>
                        {c.context_type.toUpperCase()}
                      </span>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        ID: {c.context_id}
                      </div>
                    </td>

                    {/* Comment text */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{
                        fontSize: 13, color: colors.text, lineHeight: 1.5,
                        maxWidth: 360, wordBreak: 'break-word',
                      }}>
                        {c.content}
                      </div>
                    </td>

                    {/* Posted */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                        {timeAgo(c.created_at)}
                      </div>
                    </td>

                    {/* Delete */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: 'none',
                          background: colors.danger + '20', color: colors.danger,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          opacity: deletingId === c.id ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {deletingId === c.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: `1px solid ${colors.border}`,
                  background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? colors.textMuted : colors.text, fontSize: 13,
                }}
              >
                ← Prev
              </button>
              <span style={{ color: colors.textMuted, fontSize: 13 }}>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: `1px solid ${colors.border}`,
                  background: 'transparent', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  color: page >= totalPages ? colors.textMuted : colors.text, fontSize: 13,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
