import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { colors, labelStyle, inputStyle, btnStyle, badge } from '../theme';

interface Notification {
  id:           string;
  title:        string;
  body:         string;
  scheduled_at: string;
}

export default function NotificationsPage() {
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

  // Push broadcast state
  const [pushTitle,   setPushTitle]   = useState('');
  const [pushBody,    setPushBody]    = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg,     setPushMsg]     = useState('');

  const load = async () => {
    try {
      const res = await api.get<{ notifications: Notification[] }>('/admin/notifications');
      setNotifications(res.notifications ?? []);
    } catch (e: any) {
      setMsg('Error loading notifications: ' + e.message);
    }
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

  const sendPushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushLoading(true);
    try {
      const res = await api.post<{ queued: number }>('/admin/push-broadcast', {
        title: pushTitle.trim(),
        body:  pushBody.trim(),
      });
      setPushTitle(''); setPushBody('');
      setPushMsg(`✓ Queued for ${res.queued} device(s)`);
    } catch (e: any) {
      setPushMsg('Error: ' + e.message);
    } finally {
      setPushLoading(false);
      setTimeout(() => setPushMsg(''), 4000);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const { sentCount, scheduledCount } = useMemo(() => {
    const now = Date.now();
    let sent = 0, scheduled = 0;
    for (const n of notifications) {
      if (new Date(n.scheduled_at).getTime() > now) scheduled++;
      else sent++;
    }
    return { sentCount: sent, scheduledCount: scheduled };
  }, [notifications]);

  return (
    <div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🔔 Send Notification</h2>

      {/* Compose form */}
      <form onSubmit={send} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Match alert, announcement..." style={inputStyle} maxLength={80} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>MESSAGE</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your notification message..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} maxLength={300} />
          <div style={{ color: colors.textDim, fontSize: 11, marginTop: 4 }}>{body.length}/300</div>
        </div>

        {/* Image URL (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>IMAGE URL <span style={{ color: colors.textDim, fontWeight: 400 }}>(optional)</span></label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>

        {/* Link URL (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>LINK URL <span style={{ color: colors.textDim, fontWeight: 400 }}>(optional)</span></label>
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>

        {/* Link title (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>LINK BUTTON LABEL <span style={{ color: colors.textDim, fontWeight: 400 }}>(optional — defaults to "Open Link")</span></label>
          <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="e.g. Join Telegram, Watch Highlights..." style={inputStyle} maxLength={40} />
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>WHEN TO SEND</label>
          <div style={{ display: 'flex', gap: 12, marginBottom: sendAt === 'schedule' ? 12 : 0 }}>
            {['now', 'schedule'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: sendAt === opt ? colors.accent : colors.textMuted, fontSize: 14 }}>
                <input type="radio" checked={sendAt === opt} onChange={() => setSendAt(opt)} style={{ accentColor: colors.accent }} />
                {opt === 'now' ? 'Send now' : 'Schedule'}
              </label>
            ))}
          </div>
          {sendAt === 'schedule' && (
            <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} style={inputStyle} />
          )}
        </div>

        {msg && <p style={{ color: msg.startsWith('✓') ? colors.success : colors.danger, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
        <button type="submit" disabled={loading || !title.trim() || !body.trim()} style={btnStyle(loading || !title.trim() || !body.trim())}>
          {loading ? 'Sending…' : 'Send Notification'}
        </button>
      </form>

      {/* Push Broadcast */}
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>📱 Push Broadcast</h2>
      <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
        Send a native push notification to all users who have "App Announcements" enabled on their device.
      </p>
      <form onSubmit={sendPushBroadcast} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 40 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>TITLE</label>
          <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Announcement title..." style={inputStyle} maxLength={80} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>MESSAGE</label>
          <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Push notification message..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} maxLength={200} />
          <div style={{ color: colors.textDim, fontSize: 11, marginTop: 4 }}>{pushBody.length}/200</div>
        </div>
        {pushMsg && <p style={{ color: pushMsg.startsWith('✓') ? colors.success : colors.danger, fontSize: 13, marginBottom: 12 }}>{pushMsg}</p>}
        <button type="submit" disabled={pushLoading || !pushTitle.trim() || !pushBody.trim()} style={btnStyle(pushLoading || !pushTitle.trim() || !pushBody.trim())}>
          {pushLoading ? 'Sending…' : 'Send Push Broadcast'}
        </button>
      </form>

      {/* Sent history */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Sent / Scheduled ({notifications.length})</h3>
        <span style={badge(colors.success)}>{sentCount} sent</span>
        <span style={badge(colors.warning)}>{scheduledCount} scheduled</span>
      </div>
      {notifications.length === 0
        ? <p style={{ color: colors.textDim, fontSize: 14 }}>No notifications yet.</p>
        : notifications.map(n => {
          const isScheduled = new Date(n.scheduled_at).getTime() > Date.now();
          return (
            <div key={n.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ color: colors.text, fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                  <span style={badge(isScheduled ? colors.warning : colors.success)}>{isScheduled ? 'SCHEDULED' : 'SENT'}</span>
                </div>
                <div style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ color: colors.textDim, fontSize: 11, marginTop: 6 }}>{fmt(n.scheduled_at)}</div>
              </div>
              <button onClick={() => del(n.id)} style={{ background: colors.danger + '15', border: `1px solid ${colors.danger}30`, color: colors.danger, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                Delete
              </button>
            </div>
          );
        })
      }
    </div>
  );
}
