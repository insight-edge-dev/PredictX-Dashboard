import { useState } from 'react';
import { API_BASE } from '../config';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [user, setUser]       = useState('');
  const [pass, setPass]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user, pass }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Login failed'); return; }
      sessionStorage.setItem('predictx_admin', '1');
      sessionStorage.setItem('predictx_admin_token', json.token);
      onLogin();
    } catch {
      setError('Network error — backend unreachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020810' }}>
      <div style={{ background: '#08111E', border: '1px solid #142234', borderRadius: 16, padding: 40, width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, marginBottom: 4 }}>
            <span style={{ color: '#fff' }}>Predict</span><span style={{ color: '#FBBF24' }}>X</span>
          </div>
          <div style={{ color: '#4A6580', fontSize: 13 }}>Admin Dashboard</div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#7E97B0', fontSize: 12, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
              USERNAME
            </label>
            <input
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="admin"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#7E97B0', fontSize: 12, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#0E1C2E', border: '1px solid #142234', borderRadius: 8,
  color: '#fff', fontSize: 14, outline: 'none',
};

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '12px',
  background: '#FBBF24', border: 'none', borderRadius: 8,
  color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer',
};
