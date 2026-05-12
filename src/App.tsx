import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('cricvora_admin'));

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { sessionStorage.removeItem('cricvora_admin'); setAuthed(false); }} />;
}
