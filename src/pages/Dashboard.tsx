import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import OverviewPage from './OverviewPage';
import PredictionsPage from './PredictionsPage';
import NotificationsPage from './NotificationsPage';
import BannersPage from './BannersPage';
import UsersPage from './UsersPage';
import MatchesPage from './MatchesPage';
import HealthPage from './HealthPage';
import HomeContentPage from './HomeContentPage';
import { colors } from '../theme';

export type Page = 'overview' | 'predictions' | 'notifications' | 'banners' | 'users' | 'matches' | 'health' | 'home-content';

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>('overview');

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex' }}>
      <Sidebar page={page} onNavigate={setPage} onLogout={onLogout} />

      <div style={{ flex: 1, padding: '28px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {page === 'overview'      && <OverviewPage onNavigate={setPage} />}
        {page === 'predictions'   && <PredictionsPage />}
        {page === 'notifications' && <NotificationsPage />}
        {page === 'banners'       && <BannersPage />}
        {page === 'users'         && <UsersPage />}
        {page === 'matches'       && <MatchesPage />}
        {page === 'health'        && <HealthPage />}
        {page === 'home-content'  && <HomeContentPage />}
      </div>
    </div>
  );
}
