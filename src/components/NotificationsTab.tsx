import { useState, useEffect } from 'react';
import { api } from '../api';

interface Notification {
  id:           string;
  title:        string;
  body:         string;
  scheduled_at: string;
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [imageUrl,   setImageUrl]   = useState('');
  const [linkUrl,    setLinkUrl]    = useState('');
  const [linkTitle,  setLinkTitle]  = useState('');
  const [sendAt,   setSendAt]   = useState('now');
  const [datetime, setDatetime] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState('');

  const load = async () => {
    const res = await api.get<{ notifications: Notification[] }>('/admin/notifications');
    setNotifications(res.notifications ?? []);
  };

  useEffect(() => { load(); }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      await api.post('/admin/notifications', {
        title:        title.trim(),
        body:         body.trim(),
        image_url:    imageUrl.trim()   || undefined,
        link_url:     linkUrl.trim()    || undefined,
        link_title:   linkTitle.trim()  || undefined,
        scheduled_at: sendAt === 'now' ? new Date().toISOString() : new Date(datetime).toISOString(),
      });
      setTitle(''); setBody(''); setImageUrl(''); setLinkUrl(''); setLinkTitle(''); setDatetime(''); setSendAt('now');
      setMsg('✓ Notification created');
      load();
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const del = async (id: string) => {
    await api.delete(`/admin/notifications/${id}`);
    load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🔔 Send Notification</h2>

      {/* Compose form */}
      <form onSubmit={send} style={{ background: '#08111E', border: '1px solid #142234', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Match alert, announcement..." style={inputStyle} maxLength={80} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>MESSAGE</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your notification message..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} maxLength={300} />
          <div style={{ color: '#4A6580', fontSize: 11, marginTop: 4 }}>{body.length}/300</div>
        </div>

        {/* Image URL (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>IMAGE URL <span style={{ color: '#4A6580', fontWeight: 400 }}>(optional)</span></label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>

        {/* Link URL (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>LINK URL <span style={{ color: '#4A6580', fontWeight: 400 }}>(optional)</span></label>
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>

        {/* Link title (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>LINK BUTTON LABEL <span style={{ color: '#4A6580', fontWeight: 400 }}>(optional — defaults to "Open Link")</span></label>
          <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="e.g. Join Telegram, Watch Highlights..." style={inputStyle} maxLength={40} />
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>WHEN TO SEND</label>
          <div style={{ display: 'flex', gap: 12, marginBottom: sendAt === 'schedule' ? 12 : 0 }}>
            {['now', 'schedule'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: sendAt === opt ? '#FBBF24' : '#7E97B0', fontSize: 14 }}>
                <input type="radio" checked={sendAt === opt} onChange={() => setSendAt(opt)} style={{ accentColor: '#FBBF24' }} />
                {opt === 'now' ? 'Send now' : 'Schedule'}
              </label>
            ))}
          </div>
          {sendAt === 'schedule' && (
            <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} style={inputStyle} />
          )}
        </div>

        {msg && <p style={{ color: msg.startsWith('✓') ? '#16a34a' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{msg}</p>}
        <button type="submit" disabled={loading || !title.trim() || !body.trim()} style={btnStyle(loading || !title.trim() || !body.trim())}>
          {loading ? 'Sending…' : 'Send Notification'}
        </button>
      </form>

      {/* Sent history */}
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sent / Scheduled ({notifications.length})</h3>
      {notifications.length === 0
        ? <p style={{ color: '#4A6580', fontSize: 14 }}>No notifications yet.</p>
        : notifications.map(n => (
          <div key={n.id} style={{ background: '#08111E', border: '1px solid #142234', borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
              <div style={{ color: '#7E97B0', fontSize: 13, lineHeight: 1.5 }}>{n.body}</div>
              <div style={{ color: '#4A6580', fontSize: 11, marginTop: 6 }}>{fmt(n.scheduled_at)}</div>
            </div>
            <button onClick={() => del(n.id)} style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
              Delete
            </button>
          </div>
        ))
      }
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#7E97B0', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#0E1C2E', border: '1px solid #142234', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' };
const btnStyle = (disabled: boolean): React.CSSProperties => ({ padding: '11px 24px', background: disabled ? '#1A2A3A' : '#FBBF24', border: 'none', borderRadius: 8, color: disabled ? '#4A6580' : '#000', fontWeight: 800, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer' });
