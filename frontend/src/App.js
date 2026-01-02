import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindId from './pages/FindId';
import FindPassword from './pages/FindPassword';
import Calendar from './pages/Calendar';
import TeamView from './pages/TeamView';
import MyPage from './pages/MyPage';
import MyActivity from './pages/MyActivity';
import CreateTeam from './pages/CreateTeam';
import OAuth2Redirect from './pages/OAuth2Redirect';

import NotificationsPage from './pages/NotificationsPage';
import Invite from './pages/Invite';
import GitHubCallback from './pages/GitHubCallback';
import OAuth2Redirect from './pages/OAuth2Redirect';
import SocialSignupComplete from './pages/SocialSignupComplete';
import './App.css';

function AppContent() {
  const location = useLocation();

  const isOAuthRedirect = location.pathname === '/oauth2/redirect';
<<<<<<< HEAD
=======
  const isSocialSignupComplete = location.pathname === '/social-signup-complete';
>>>>>>> 2c90abea6eadde73f49e0142de9f8c58674ed436
  const isCalendarPage = location.pathname === '/calendar';
  const isTeamPage = location.pathname.startsWith('/team/');
  const isMyPage = location.pathname === '/mypage';
  const isMyActivity = location.pathname === '/activity';
  const isCreateTeam = location.pathname === '/create-team';
  const isNotifications = location.pathname === '/notifications';
  const isInvite = location.pathname.startsWith('/invite/');
  const isGitHubCallback = location.pathname === '/github/callback';
  const hideHeader = ['/', '/login', '/register', '/find-id', '/find-password', '/social-signup-complete'].includes(location.pathname);

  // OAuth 리다이렉트 처리
  if (isOAuthRedirect) {
    return <OAuth2Redirect />;
  }

  // 소셜 로그인 추가 정보 입력
  if (isSocialSignupComplete) {
    return <SocialSignupComplete />;
  }

<<<<<<< HEAD
  // 🔥 반드시 최위에 두어야 한다!
  if (isOAuthRedirect) {
    return <OAuth2Redirect />;
  }

=======
>>>>>>> 2c90abea6eadde73f49e0142de9f8c58674ed436
  if (isTeamPage) {
    return (
      <Routes>
        <Route path="/team/:teamId" element={<TeamView />} />
      </Routes>
    );
  }
  if (isCalendarPage) {
    return <Calendar />;
  }
  if (isMyPage) {
    return <MyPage />;
  }
  if (isMyActivity) {
    return <MyActivity />;
  }
  if (isCreateTeam) {
    return <CreateTeam />;
  }
  if (isNotifications) {
    return <NotificationsPage />;
  }
  if (isInvite) {
    return (
      <Routes>
        <Route path="/invite/:teamCode" element={<Invite />} />
      </Routes>
    );
  }
  if (isGitHubCallback) {
    return (
      <Routes>
        <Route path="/github/callback" element={<GitHubCallback />} />
      </Routes>
    );
  }

  return (
    <div className="App">
      {!hideHeader && (
        <header className="App-header">
          <h1>Synodos</h1>
        </header>
      )}
      <main className={hideHeader ? 'no-header' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/activity" element={<MyActivity />} />
        </Routes>
      </main>
    </div>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
