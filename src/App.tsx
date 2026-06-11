import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LoadingScreen from './components/LoadingScreen';

const BOOT_DELAY_MS = 500;

export default function App() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('predictx_admin'));
  const [booting, setBooting] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), BOOT_DELAY_MS);
    const doneTimer = setTimeout(() => setBooting(false), BOOT_DELAY_MS + 300);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, []);

  const content = !authed
    ? <Login onLogin={() => setAuthed(true)} />
    : <Dashboard onLogout={() => { sessionStorage.removeItem('predictx_admin'); setAuthed(false); }} />;

  if (booting) {
    return (
      <>
        {content}
        <LoadingScreen fadingOut={fadingOut} />
      </>
    );
  }
  return content;
}
