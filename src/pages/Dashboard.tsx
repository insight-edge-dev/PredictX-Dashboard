import { useState } from 'react';
import NotificationsTab from '../components/NotificationsTab';
import ExpertPredictionsTab from '../components/ExpertPredictionsTab';

type Tab = 'notifications' | 'predictions';

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('predictions');

  return (
    <div style={{ minHeight: '100vh', background: '#020810', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: '#08111E', borderBottom: '1px solid #142234',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, flexShrink: 0,
      }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          <span style={{ color: '#fff' }}>Cric</span><span style={{ color: '#FBBF24' }}>vora</span>
          <span style={{ color: '#4A6580', fontSize: 13, fontWeight: 500, marginLeft: 8 }}>Admin</span>
        </div>
        <button
          onClick={onLogout}
          style={{ background: 'transparent', border: '1px solid #142234', borderRadius: 8, color: '#7E97B0', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
        >
          Sign out
        </button>
      </div>

      {/* Tab bar */}
      <div style={{
        background: '#08111E', borderBottom: '1px solid #142234',
        padding: '0 24px', display: 'flex', gap: 0,
      }}>
        {(['predictions', 'notifications'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #FBBF24' : '2px solid transparent',
              color: tab === t ? '#FBBF24' : '#7E97B0',
              padding: '14px 20px', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t ? 700 : 500,
              textTransform: 'capitalize', letterSpacing: 0.3,
            }}
          >
            {t === 'predictions' ? '🎯 Expert Predictions' : '🔔 Notifications'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'predictions'   && <ExpertPredictionsTab />}
      </div>
    </div>
  );
}
