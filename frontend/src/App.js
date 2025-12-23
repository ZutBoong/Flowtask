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

import './App.css';

function AppContent() {
  const location = useLocation();

  const isOAuthRedirect = location.pathname === '/oauth2/redirect';
  const isCalendarPage = location.pathname === '/calendar';
  const isTeamPage = location.pathname.startsWith('/team/');
  const isMyPage = location.pathname === '/mypage';
  const isMyActivity = location.pathname === '/activity';
  const isCreateTeam = location.pathname === '/create-team';
  const hideHeader = ['/', '/login', '/register', '/find-id', '/find-password'].includes(location.pathname);

  // 🔥 반드시 최위에 두어야 한다!
  if (isOAuthRedirect) {
    return <OAuth2Redirect />;
  }

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

  return (
    <div className="App">
      {!hideHeader && (
        <header className="App-header">
          <h1>Flowtask</h1>
        </header>
      )}
      <main className={hideHeader ? 'no-header' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          
          {/* 🔥 여기도 물론 있어야 하지만 */}
          <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />

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
